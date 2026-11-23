import { DictionaryCache, type DictionaryCacheStorage } from './dictionary-cache.js';

export const KUROMOJI_DICTIONARY_FILES = [
  'base.dat.gz',
  'check.dat.gz',
  'tid.dat.gz',
  'tid_pos.dat.gz',
  'tid_map.dat.gz',
  'cc.dat.gz',
  'unk.dat.gz',
  'unk_pos.dat.gz',
  'unk_map.dat.gz',
  'unk_char.dat.gz',
  'unk_compat.dat.gz',
  'unk_invoke.dat.gz',
] as const;

export const DEFAULT_DICTIONARY_CACHE_NAME = 'fushi-ipadic-v1';

export type Gunzip = (compressed: ArrayBuffer) => ArrayBuffer | Promise<ArrayBuffer>;

export interface BrowserDictionaryLoaderOptions {
  dictUrl: string;
  cacheName?: string;
  fetch?: typeof globalThis.fetch;
  cacheStorage?: DictionaryCacheStorage;
  gunzip?: Gunzip;
}

export interface DictionaryData {
  base: ArrayBuffer;
  check: ArrayBuffer;
  tid: ArrayBuffer;
  tidPos: ArrayBuffer;
  tidMap: ArrayBuffer;
  connectionCosts: ArrayBuffer;
  unknown: ArrayBuffer;
  unknownPos: ArrayBuffer;
  unknownMap: ArrayBuffer;
  unknownChar: ArrayBuffer;
  unknownCompat: ArrayBuffer;
  unknownInvoke: ArrayBuffer;
}

/**
 * Fetches all IPAdic assets without kuromoji's Node/XHR transport.
 * Responses remain gzipped in the Cache API and are decompressed per load.
 */
export class FetchDictionaryLoader {
  private readonly dictUrl: string;
  private readonly fetch: typeof globalThis.fetch;
  private readonly cache: DictionaryCache;
  private readonly gunzip: Gunzip;

  constructor(options: BrowserDictionaryLoaderOptions) {
    if (!options.dictUrl.trim()) throw new TypeError('dictUrl must not be empty.');

    this.fetch = options.fetch ?? globalThis.fetch?.bind(globalThis);
    if (!this.fetch) {
      throw new Error('fetch is unavailable; provide a fetch implementation.');
    }

    this.cache = new DictionaryCache({
      cacheName: options.cacheName ?? DEFAULT_DICTIONARY_CACHE_NAME,
      ...(options.cacheStorage ? { cacheStorage: options.cacheStorage } : {}),
    });
    this.gunzip = options.gunzip ?? gunzip;
    this.dictUrl = options.dictUrl.replace(/\/+$/, '');
  }

  async load(): Promise<DictionaryData> {
    const buffers = await Promise.all(
      KUROMOJI_DICTIONARY_FILES.map((filename) => this.loadArrayBuffer(`${this.dictUrl}/${filename}`)),
    );
    const [base, check, tid, tidPos, tidMap, connectionCosts, unknown, unknownPos, unknownMap, unknownChar, unknownCompat, unknownInvoke] = buffers;
    if (!base || !check || !tid || !tidPos || !tidMap || !connectionCosts || !unknown || !unknownPos || !unknownMap || !unknownChar || !unknownCompat || !unknownInvoke) {
      throw new Error('Kuromoji dictionary loading did not return every required file.');
    }
    return { base, check, tid, tidPos, tidMap, connectionCosts, unknown, unknownPos, unknownMap, unknownChar, unknownCompat, unknownInvoke };
  }

  private async loadArrayBuffer(url: string): Promise<ArrayBuffer> {
    let response: Response | undefined;
    let fromNetwork = false;

    try {
      response = await this.cache.read(url);
    } catch {
      // A nonstandard/injected Cache API must not disable network loading.
    }

    if (!response) {
      response = await this.fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load kuromoji dictionary ${url}: HTTP ${response.status} ${response.statusText}`.trim());
      }
      fromNetwork = true;
    }

    let compressed: ArrayBuffer;
    try {
      compressed = await response.arrayBuffer();
    } catch (error) {
      throw new Error(`Failed to read kuromoji dictionary ${url}: ${errorMessage(error)}`, { cause: error });
    }

    if (compressed.byteLength === 0) {
      throw new Error(`Kuromoji dictionary ${url} is empty.`);
    }

    let decompressed: ArrayBuffer;
    try {
      decompressed = await this.gunzip(compressed);
      if (decompressed.byteLength === 0) throw new Error('decompressed data is empty');
    } catch (error) {
      throw new Error(`Failed to decompress kuromoji dictionary ${url}: ${errorMessage(error)}`, { cause: error });
    }

    if (fromNetwork) {
      try {
        await this.cache.write(url, new Response(compressed.slice(0), {
          status: 200,
          headers: response.headers,
        }));
      } catch {
        // Cache writes are best-effort; network bytes remain usable.
      }
    }
    return decompressed;
  }
}

async function gunzip(compressed: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error("DecompressionStream('gzip') is unavailable; provide a gunzip implementation.");
  }

  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
