import * as ort from "onnxruntime-web";
import { MODEL_CACHE_NAME, TENSOR_SHAPE } from "../constants";

export async function loadSession(
  modelPath: string,
  wasmPaths?: ort.Env.WasmPrefixOrFilePaths,
  externalDataPath?: string,
): Promise<ort.InferenceSession> {
  if (wasmPaths) {
    ort.env.wasm.wasmPaths = wasmPaths;
  }

  const buffer = await getCachedModel(modelPath);

  // Prefer GPU-accelerated backends to avoid the WASM heap size limit.
  // On devices that support WebGPU or WebNN the model weights are loaded into
  // GPU/NPU memory rather than the WebAssembly heap, which prevents the
  // "RangeError: Out of memory" crash seen on mobile with the 89 MB weight file.
  // Falls back to wasm on unsupported devices.
  const executionProviders: ort.InferenceSession.ExecutionProviderConfig[] = [
    "webgpu",
    "webnn",
    "wasm",
  ];

  if (externalDataPath) {
    const externalDataBuffer = await getCachedModel(externalDataPath);
    const fileName = externalDataPath.split("/").pop() || externalDataPath;
    return ort.InferenceSession.create(buffer, {
      executionProviders,
      externalData: [
        {
          path: fileName,
          data: new Uint8Array(externalDataBuffer),
        },
      ],
    });
  }

  return ort.InferenceSession.create(buffer, { executionProviders });
}

async function getCachedModel(url: string): Promise<ArrayBuffer> {
  const cache = await caches.open(MODEL_CACHE_NAME);
  const response = await cache.match(url);
  if (response) {
    return response.arrayBuffer();
  }
  const fetchResponse = await fetch(url);
  if (!fetchResponse.ok) {
    throw new Error("Failed to fetch model");
  }
  await cache.put(url, fetchResponse.clone());
  return fetchResponse.arrayBuffer();
}

export { TENSOR_SHAPE };
