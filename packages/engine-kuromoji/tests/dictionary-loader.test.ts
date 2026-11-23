import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_DICTIONARY_CACHE_NAME,
  FetchDictionaryLoader,
  KUROMOJI_DICTIONARY_FILES,
} from '../src/dictionary-loader.js';
import type { DictionaryCacheStorage } from '../src/dictionary-cache.js';

type CacheEntry = { request: RequestInfo | URL; response: Response };

class MemoryCache implements Cache {
  readonly entries: CacheEntry[] = [];
  readonly match = vi.fn(async (request: RequestInfo | URL): Promise<Response | undefined> => {
    const entry = this.entries.find((candidate) => requestKey(candidate.request) === requestKey(request));
    return entry?.response.clone();
  });
  readonly put = vi.fn(async (request: RequestInfo | URL, response: Response): Promise<void> => {
    this.entries.push({ request, response: response.clone() });
  });

  seed(request: RequestInfo | URL, response: Response): void {
    this.entries.push({ request, response: response.clone() });
  }

  readonly add = vi.fn(async (): Promise<void> => { throw new Error('Not implemented'); });
  readonly addAll = vi.fn(async (): Promise<void> => { throw new Error('Not implemented'); });
  readonly delete = vi.fn(async (): Promise<boolean> => false);
  readonly keys = vi.fn(async (): Promise<readonly Request[]> => []);
  readonly matchAll = vi.fn(async (): Promise<readonly Response[]> => []);
}

class MemoryCacheStorage implements DictionaryCacheStorage {
  readonly caches = new Map<string, MemoryCache>();
  readonly open = vi.fn(async (name: string): Promise<Cache> => {
    let cache = this.caches.get(name);
    if (!cache) {
      cache = new MemoryCache();
      this.caches.set(name, cache);
    }
    return cache;
  });
}

const compressed = new TextEncoder().encode('valid compressed bytes').buffer;
const decompressed = new Uint32Array([1, 2, 3]).buffer;
const gunzip = vi.fn(async (input: ArrayBuffer): Promise<ArrayBuffer> => {
  expect(input.byteLength).toBeGreaterThan(0);
  return decompressed.slice(0);
});

function response(bytes: ArrayBuffer = compressed, init: ResponseInit = {}): Response {
  return new Response(bytes, { status: 200, ...init });
}

function options(storage: DictionaryCacheStorage, fetch: typeof globalThis.fetch) {
  return { dictUrl: '/dictionaries/kuromoji/', cacheName: 'ipadic-test-v2', cacheStorage: storage, fetch, gunzip };
}

describe('FetchDictionaryLoader', () => {
  it('loads every kuromoji file on a cache miss and caches successful responses', async () => {
    const storage = new MemoryCacheStorage();
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response());

    const data = await new FetchDictionaryLoader(options(storage, fetch)).load();

    expect(Object.keys(data)).toHaveLength(KUROMOJI_DICTIONARY_FILES.length);
    expect(data.base).toEqual(decompressed);
    expect(fetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
    const expectedUrls = KUROMOJI_DICTIONARY_FILES.map((file) => `/dictionaries/kuromoji/${file}`);
    expect(fetch.mock.calls.map(([url]) => url).sort()).toEqual(expectedUrls.sort());
    const cache = storage.caches.get('ipadic-test-v2')!;
    expect(cache.put).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
    expect(cache.entries.map((entry) => requestKey(entry.request)).sort()).toEqual(expectedUrls.sort());
    expect(storage.open).toHaveBeenCalledWith('ipadic-test-v2');
  });

  it('uses the default versioned cache name', async () => {
    const storage = new MemoryCacheStorage();
    const loader = new FetchDictionaryLoader({
      dictUrl: '/dict', cacheStorage: storage,
      fetch: async () => response(), gunzip,
    });
    await loader.load();
    expect(storage.open).toHaveBeenCalledWith(DEFAULT_DICTIONARY_CACHE_NAME);
  });

  it('loads a later initialization entirely from cache without network requests', async () => {
    const storage = new MemoryCacheStorage();
    const firstFetch = vi.fn<typeof globalThis.fetch>(async () => response());
    const config = options(storage, firstFetch);
    await new FetchDictionaryLoader(config).load();
    const secondFetch = vi.fn<typeof globalThis.fetch>(async () => response());

    await new FetchDictionaryLoader({ ...config, fetch: secondFetch }).load();

    expect(secondFetch).not.toHaveBeenCalled();
    expect(firstFetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
  });

  it.each([
    ['unavailable', undefined],
    ['open failure', { open: async () => { throw new Error('denied'); } }],
  ])('falls back to the network when Cache API is %s', async (_name, cacheStorage) => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response());
    await new FetchDictionaryLoader({ dictUrl: '/dict', fetch, gunzip, ...(cacheStorage ? { cacheStorage } : {}) }).load();
    expect(fetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
  });

  it('falls back to network and still succeeds when cache reads and writes fail', async () => {
    const cache = new MemoryCache();
    cache.match.mockRejectedValue(new Error('read failed'));
    cache.put.mockRejectedValue(new Error('quota exceeded'));
    const storage = { open: async () => cache };
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response());

    await expect(new FetchDictionaryLoader({ dictUrl: '/dict', fetch, gunzip, cacheStorage: storage }).load()).resolves.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
  });

  it('rejects an HTTP failure with its URL and never caches that response', async () => {
    const storage = new MemoryCacheStorage();
    const fetch = vi.fn<typeof globalThis.fetch>(async (url) => String(url).endsWith('/cc.dat.gz')
      ? response(new ArrayBuffer(0), { status: 503, statusText: 'Unavailable' })
      : response());

    await expect(new FetchDictionaryLoader(options(storage, fetch)).load()).rejects.toThrow('/dictionaries/kuromoji/cc.dat.gz: HTTP 503 Unavailable');
    const cache = storage.caches.get('ipadic-test-v2')!;
    expect(cache.entries.some((entry) => requestKey(entry.request).endsWith('/cc.dat.gz'))).toBe(false);
  });

  it('rejects malformed gzip and does not cache the invalid response', async () => {
    const storage = new MemoryCacheStorage();
    const invalidGunzip = vi.fn(async () => { throw new Error('invalid header'); });
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response());

    await expect(new FetchDictionaryLoader({ ...options(storage, fetch), gunzip: invalidGunzip }).load())
      .rejects.toThrow(/Failed to decompress kuromoji dictionary .*invalid header/);
    const cache = storage.caches.get('ipadic-test-v2');
    expect(cache?.entries ?? []).toHaveLength(0);
  });
});

function requestKey(request: RequestInfo | URL): string {
  return request instanceof Request ? request.url : String(request);
}
