import { parseModernMorphemes, type ParseResult } from '@lib/core';
import Tokenizer from 'kuromoji/src/Tokenizer.js';
import DynamicDictionaries from 'kuromoji/src/dict/DynamicDictionaries.js';
import type { IpadicFeatures, Tokenizer as KuromojiTokenizer } from 'kuromoji';
import {
  DEFAULT_DICTIONARY_CACHE_NAME,
  FetchDictionaryLoader,
  type DictionaryData,
  type Gunzip,
} from './dictionary-loader.js';
import type { DictionaryCacheStorage } from './dictionary-cache.js';
import { ipadicToRawMorphemes } from './ipadic-adapter.js';

export type IpadicTokenizer = KuromojiTokenizer<IpadicFeatures>;

export interface KuromojiEngineOptions {
  dictUrl: string;
  /** Include the IPAdic asset version in this name to invalidate old entries. */
  cacheName?: string;
  /** Optional dependency-injection hooks, primarily for non-browser hosts and tests. */
  fetch?: typeof globalThis.fetch;
  cacheStorage?: DictionaryCacheStorage;
  gunzip?: Gunzip;
  createTokenizer?: (dictionary: DictionaryData) => IpadicTokenizer | Promise<IpadicTokenizer>;
}

export interface KuromojiEngine {
  parseModern(text: string): Promise<ParseResult>;
}

interface Initialization {
  promise: Promise<KuromojiEngine>;
  options: KuromojiEngineOptions;
}

const pendingInitializations: Initialization[] = [];

export async function createKuromojiEngine(options: KuromojiEngineOptions): Promise<KuromojiEngine> {
  if (!options.dictUrl.trim()) throw new TypeError('dictUrl must not be empty.');

  const existing = pendingInitializations.find((entry) => sameOptions(entry.options, options));
  if (existing) return existing.promise;

  const initialization: Initialization = {
    options,
    promise: initialize(options),
  };
  pendingInitializations.push(initialization);
  try {
    return await initialization.promise;
  } finally {
    const index = pendingInitializations.indexOf(initialization);
    if (index >= 0) pendingInitializations.splice(index, 1);
  }
}

async function initialize(options: KuromojiEngineOptions): Promise<KuromojiEngine> {
  const dictionary = await new FetchDictionaryLoader(options).load();
  const tokenizer = await (options.createTokenizer ?? createTokenizer)(dictionary);
  if (!tokenizer || typeof tokenizer.tokenize !== 'function') {
    throw new Error('Kuromoji did not produce a valid tokenizer.');
  }

  return {
    async parseModern(text: string): Promise<ParseResult> {
      const morphemes = ipadicToRawMorphemes(tokenizer.tokenize(text), text);
      return parseModernMorphemes(morphemes);
    },
  };
}

export function createTokenizer(dictionary: DictionaryData): IpadicTokenizer {
  const dictionaries = new DynamicDictionaries();
  dictionaries.loadTrie(new Int32Array(dictionary.base), new Int32Array(dictionary.check));
  dictionaries.loadTokenInfoDictionaries(
    new Uint8Array(dictionary.tid),
    new Uint8Array(dictionary.tidPos),
    new Uint8Array(dictionary.tidMap),
  );
  dictionaries.loadConnectionCosts(new Int16Array(dictionary.connectionCosts));
  dictionaries.loadUnknownDictionaries(
    new Uint8Array(dictionary.unknown),
    new Uint8Array(dictionary.unknownPos),
    new Uint8Array(dictionary.unknownMap),
    new Uint8Array(dictionary.unknownChar),
    new Uint32Array(dictionary.unknownCompat),
    new Uint8Array(dictionary.unknownInvoke),
  );
  return new (Tokenizer as unknown as new (data: unknown) => IpadicTokenizer)(dictionaries);
}

function sameOptions(left: KuromojiEngineOptions, right: KuromojiEngineOptions): boolean {
  return left.dictUrl.replace(/\/+$/, '') === right.dictUrl.replace(/\/+$/, '')
    && (left.cacheName ?? DEFAULT_DICTIONARY_CACHE_NAME) === (right.cacheName ?? DEFAULT_DICTIONARY_CACHE_NAME)
    && (left.fetch ?? globalThis.fetch) === (right.fetch ?? globalThis.fetch)
    && (left.cacheStorage ?? globalThis.caches) === (right.cacheStorage ?? globalThis.caches)
    && left.gunzip === right.gunzip
    && (left.createTokenizer ?? createTokenizer) === (right.createTokenizer ?? createTokenizer);
}
