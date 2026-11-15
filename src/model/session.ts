import * as ort from "onnxruntime-web";
import { MODEL_CACHE_NAME } from "../constants/index.js";

export async function loadSession(
  modelPath: string,
  wasmPaths?: ort.Env.WasmPrefixOrFilePaths,
  externalDataPath?: string,
): Promise<ort.InferenceSession> {
  if (wasmPaths) {
    ort.env.wasm.wasmPaths = wasmPaths;
  }

  const buffer = await fetchModel(modelPath);
  const externalData = externalDataPath
    ? await resolveExternalData(externalDataPath)
    : undefined;

  const sessionOptions = (
    providers: ort.InferenceSession.ExecutionProviderConfig[],
  ): ort.InferenceSession.SessionOptions => ({
    executionProviders: providers,
    ...(externalData && { externalData }),
  });

  // Attempt 1: GPU-only (WebGPU).
  //
  // Critically, we do NOT include WASM in this first attempt.
  // onnxruntime-web's initWasm() is a one-shot singleton: if WASM is
  // touched during a failing attempt (OOM or otherwise), all subsequent
  // WASM-backed backends fail with "previous call to initWasm() failed".
  //
  // By trying only WebGPU here we keep the WASM runtime in a clean state
  // regardless of whether GPU succeeds or fails.
  try {
    return await ort.InferenceSession.create(
      buffer,
      sessionOptions(["webgpu"]),
    );
  } catch {
    // Attempt 2: WASM, single-threaded.
    //
    // Multi-threaded WASM requires SharedArrayBuffer and allocates additional
    // locked memory regions; setting numThreads = 1 can halve peak heap
    // usage and is often enough to avoid the RangeError: Out of memory that
    // users see when the model weights don't fit in the default heap.
    ort.env.wasm.numThreads = 1;
    return await ort.InferenceSession.create(buffer, sessionOptions(["wasm"]));
  }
}

async function resolveExternalData(
  externalDataPath: string,
): Promise<ort.InferenceSession.SessionOptions["externalData"]> {
  const dataBuffer = await fetchModel(externalDataPath);
  const fileName = externalDataPath.split("/").pop() || externalDataPath;
  return [{ path: fileName, data: new Uint8Array(dataBuffer) }];
}

/**
 * Downloads a model file through the Cache API so later visits skip the download.
 * Falls back to an uncached fetch when the Cache API is unavailable (insecure
 * context, some private modes) or full.
 */
export async function fetchModel(url: string): Promise<ArrayBuffer> {
  let cache: Cache | undefined;
  try {
    cache = await caches.open(MODEL_CACHE_NAME);
  } catch {
    // No Cache API here: load uncached.
  }

  const cached = await cache?.match(url);
  if (cached) return cached.arrayBuffer();

  const response = await fetchOk(url);
  if (!cache) return response.arrayBuffer();
  try {
    // Stream into the cache and read it back once. Using response.clone()
    // instead would buffer a second full copy of the model in memory.
    await cache.put(url, response);
    const stored = await cache.match(url);
    if (stored) return stored.arrayBuffer();
  } catch {
    // Quota exceeded: the body is spent, so download again uncached.
  }
  return (await fetchOk(url)).arrayBuffer();
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch model: ${url} (HTTP ${response.status})`);
  }
  return response;
}
