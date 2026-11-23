import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ParseResult } from '@lib/core';
import type { IpadicFeatures } from 'kuromoji';
import { createKuromojiEngine, type IpadicTokenizer, type KuromojiEngineOptions } from '../src/engine.js';
import { KUROMOJI_DICTIONARY_FILES } from '../src/dictionary-loader.js';

const { parseModernMorphemes } = vi.hoisted(() => ({ parseModernMorphemes: vi.fn() }));
vi.mock('@lib/core', () => ({ parseModernMorphemes }));

const compressed = new Uint8Array([1, 2, 3]).buffer;
const gunzip = async (input: ArrayBuffer): Promise<ArrayBuffer> => input.slice(0);
const parsedResult: ParseResult = {
  mode: 'modern',
  text: '食べる',
  bunsetsu: [],
  diagnostics: [{ code: 'TEST_DIAGNOSTIC', message: 'preserved', severity: 'warning', start: 0, end: 3 }],
};

const ipadicToken: IpadicFeatures = {
  word_id: 1, word_type: 'KNOWN', word_position: 1, surface_form: '食べる',
  pos: '動詞', pos_detail_1: '自立', pos_detail_2: '*', pos_detail_3: '*',
  conjugated_type: '一段', conjugated_form: '基本形', basic_form: '食べる',
  reading: 'タベル', pronunciation: 'タベル',
};

function createTokenizer(tokenize: (text: string) => IpadicFeatures[] = vi.fn(() => [ipadicToken])) {
  return vi.fn((): IpadicTokenizer => ({ tokenize }) as unknown as IpadicTokenizer);
}

function engineOptions(overrides: Partial<KuromojiEngineOptions> = {}): KuromojiEngineOptions {
  return {
    dictUrl: '/dict', cacheName: 'test-v1', cacheStorage: { open: async () => { throw new Error('no cache'); } },
    fetch: async () => new Response(compressed), gunzip, createTokenizer: createTokenizer(), ...overrides,
  };
}

beforeEach(() => {
  parseModernMorphemes.mockReset();
  parseModernMorphemes.mockReturnValue(parsedResult);
});

describe('createKuromojiEngine', () => {
  it('maps tokens and feeds core parsing, preserving core diagnostics', async () => {
    const tokenizer = createTokenizer();
    const engine = await createKuromojiEngine(engineOptions({ createTokenizer: tokenizer }));

    await expect(engine.parseModern('食べる')).resolves.toBe(parsedResult);
    expect(tokenizer).toHaveBeenCalledOnce();
    expect(parseModernMorphemes).toHaveBeenCalledWith([{
      surface: '食べる', reading: 'タベル', baseForm: '食べる', pos: '動詞', posDetail1: '自立',
      posDetail2: '*', posDetail3: '*', conjugationType: '一段', conjugatedForm: '基本形', start: 0, end: 3,
    }]);
  });

  it('coalesces identical concurrent initializations into one download per file', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      await gate;
      return new Response(compressed);
    });
    const tokenizer = createTokenizer();
    const config = engineOptions({ fetch, createTokenizer: tokenizer });

    const first = createKuromojiEngine(config);
    const second = createKuromojiEngine({ ...config, dictUrl: '/dict/' });
    release();
    const [left, right] = await Promise.all([first, second]);

    expect(left).toBe(right);
    expect(fetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
    expect(tokenizer).toHaveBeenCalledOnce();
  });

  it('recovers after a failed initialization without reusing its rejected promise', async () => {
    let fail = true;
    const fetch = vi.fn<typeof globalThis.fetch>(async () => fail
      ? new Response(null, { status: 500 })
      : new Response(compressed));
    const config = engineOptions({ fetch });

    await expect(createKuromojiEngine(config)).rejects.toThrow('HTTP 500');
    fail = false;
    const engine = await createKuromojiEngine(config);

    await expect(engine.parseModern('食べる')).resolves.toBe(parsedResult);
    expect(fetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length * 2);
  });

  it('does not coalesce callers with different injected fetch implementations', async () => {
    const firstFetch = vi.fn<typeof globalThis.fetch>(async () => new Response(compressed));
    const secondFetch = vi.fn<typeof globalThis.fetch>(async () => new Response(compressed));
    const shared = engineOptions();
    await Promise.all([
      createKuromojiEngine({ ...shared, fetch: firstFetch }),
      createKuromojiEngine({ ...shared, fetch: secondFetch }),
    ]);
    expect(firstFetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
    expect(secondFetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
  });

  it('parses repeatedly without reinitializing or mutating source offsets', async () => {
    const tokenizer = createTokenizer(vi.fn((text: string) => [{ ...ipadicToken, surface_form: text }]));
    const factory = vi.fn(() => tokenizer());
    const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(compressed));
    const engine = await createKuromojiEngine(engineOptions({ fetch, createTokenizer: factory }));

    await engine.parseModern('食べる');
    await engine.parseModern('食べる');
    expect(factory).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(KUROMOJI_DICTIONARY_FILES.length);
    expect(parseModernMorphemes).toHaveBeenCalledTimes(2);
    expect(parseModernMorphemes.mock.calls[0]?.[0]).toEqual(parseModernMorphemes.mock.calls[1]?.[0]);
  });

  it('rejects an invalid tokenizer so a subsequent attempt can recover', async () => {
    const invalid = vi.fn(() => ({}) as IpadicTokenizer);
    const config = engineOptions({ createTokenizer: invalid });
    await expect(createKuromojiEngine(config)).rejects.toThrow('valid tokenizer');
    await expect(createKuromojiEngine({ ...config, createTokenizer: createTokenizer() })).resolves.toBeDefined();
  });
});
