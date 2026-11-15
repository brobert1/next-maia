import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchModel } from "../src/model/session";

const URL = "https://example.com/model.onnx";
const BYTES = [1, 2, 3];

function stubFetch() {
  const fetchMock = vi.fn(async () => new Response(new Uint8Array(BYTES)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function stubCaches(put?: () => Promise<void>) {
  const store = new Map<string, ArrayBuffer>();
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (url: string) =>
        store.has(url) ? new Response(store.get(url)) : undefined,
      put:
        put ??
        (async (url: string, res: Response) => {
          store.set(url, await res.arrayBuffer());
        }),
    }),
  });
}

const bytes = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchModel", () => {
  it("downloads uncached when the Cache API is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    const fetchMock = stubFetch();
    expect(bytes(await fetchModel(URL))).toEqual(BYTES);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches the first download and serves later loads from the cache", async () => {
    stubCaches();
    const fetchMock = stubFetch();
    expect(bytes(await fetchModel(URL))).toEqual(BYTES);
    expect(bytes(await fetchModel(URL))).toEqual(BYTES);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still loads the model when the cache is full", async () => {
    stubCaches(() => Promise.reject(new DOMException("full", "QuotaExceededError")));
    stubFetch();
    expect(bytes(await fetchModel(URL))).toEqual(BYTES);
  });

  it("rejects with the HTTP status on a failed download", async () => {
    vi.stubGlobal("caches", undefined);
    vi.stubGlobal("fetch", async () => new Response(null, { status: 404 }));
    await expect(fetchModel(URL)).rejects.toThrow("HTTP 404");
  });
});
