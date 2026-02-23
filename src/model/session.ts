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

  if (externalDataPath) {
    const externalDataBuffer = await getCachedModel(externalDataPath);
    const fileName = externalDataPath.split("/").pop() || externalDataPath;
    return ort.InferenceSession.create(buffer, {
      externalData: [
        {
          path: fileName,
          data: new Uint8Array(externalDataBuffer),
        },
      ],
    });
  }

  return ort.InferenceSession.create(buffer);
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
