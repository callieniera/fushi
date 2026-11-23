import type { KuromojiEngine } from '@callieniera/fushi/kuromoji';
import type { ParseResult } from '@callieniera/fushi/core';
import { DICTIONARY_CACHE_NAME, dictionaryUrl } from '../dictionary-config.js';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';
export type EngineFactory = typeof import('@callieniera/fushi/kuromoji').createKuromojiEngine;

async function defaultFactory(options: Parameters<EngineFactory>[0]): ReturnType<EngineFactory> {
  const { createKuromojiEngine } = await import('@callieniera/fushi/kuromoji');
  return createKuromojiEngine(options);
}

export class ModernSandbox {
  private engine?: KuromojiEngine;
  private pending: Promise<KuromojiEngine> | undefined;
  status: EngineStatus = 'idle';
  parsing = false;

  constructor(private readonly factory: EngineFactory = defaultFactory) {}

  async initialize(): Promise<KuromojiEngine> {
    if (this.engine) return this.engine;
    if (!this.pending) {
      this.status = 'loading';
      this.pending = this.factory({ dictUrl: dictionaryUrl(), cacheName: DICTIONARY_CACHE_NAME });
    }
    try {
      const engine = await this.pending;
      this.engine = engine;
      this.status = 'ready';
      return engine;
    } catch (error) {
      this.status = 'error';
      this.pending = undefined;
      throw error;
    }
  }

  async parse(text: string): Promise<ParseResult> {
    if (this.parsing) throw new Error('A parse is already in progress.');
    if (text.length > 1000) throw new Error('Enter at most 1,000 characters.');
    this.parsing = true;
    try {
      const engine = await this.initialize();
      return await engine.parseModern(text);
    } catch (error) {
      if (this.status !== 'error') this.status = 'error';
      throw error;
    } finally { this.parsing = false; }
  }
}

