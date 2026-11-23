export interface DictionaryCacheStorage {
  open(cacheName: string): Promise<Cache>;
}

export interface DictionaryCacheOptions {
  cacheName: string;
  cacheStorage?: DictionaryCacheStorage;
}

/** A Cache API wrapper whose failures never prevent normal network loading. */
export class DictionaryCache {
  private cachePromise?: Promise<Cache | undefined>;

  constructor(private readonly options: DictionaryCacheOptions) {}

  async read(url: string): Promise<Response | undefined> {
    const cache = await this.open();
    if (!cache) return undefined;

    try {
      const response = await cache.match(url);
      return response?.ok ? response : undefined;
    } catch {
      return undefined;
    }
  }

  async write(url: string, response: Response): Promise<void> {
    const cache = await this.open();
    if (!cache) return;

    try {
      await cache.put(url, response);
    } catch {
      // Storage quotas and disabled browser caches must not break parsing.
    }
  }

  private open(): Promise<Cache | undefined> {
    this.cachePromise ??= this.openStorage();
    return this.cachePromise;
  }

  private async openStorage(): Promise<Cache | undefined> {
    const storage = this.options.cacheStorage ?? globalThis.caches;
    if (!storage) return undefined;

    try {
      return await storage.open(this.options.cacheName);
    } catch {
      return undefined;
    }
  }
}
