import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { IpadicFeatures } from 'kuromoji';
import { FetchDictionaryLoader } from '../src/dictionary-loader.js';
import { createTokenizer } from '../src/engine.js';
import { ipadicToRawMorphemes } from '../src/ipadic-adapter.js';
import { parseModernMorphemes } from '@lib/core';
import { KUROMOJI_DICTIONARY_FILES } from '../src/dictionary-loader.js';

const dictionaryRootUrl = new URL('../node_modules/kuromoji/dict/', import.meta.url);
const dictionaryRoot = fileURLToPath(dictionaryRootUrl);

describe('real kuromoji dictionary integration', () => {
  it('fetches and gunzips all externally served IPAdic files and creates a working tokenizer', async () => {
    const requests: string[] = [];
    const dictionary = await new FetchDictionaryLoader({
      dictUrl: '/ipadic',
      cacheStorage: { open: async () => { throw new Error('Cache disabled in Node smoke test'); } },
      fetch: async (input) => {
        const url = String(input);
        requests.push(url);
        const filename = url.slice(url.lastIndexOf('/') + 1);
        const bytes = await readFile(new URL(filename, dictionaryRootUrl));
        return new Response(bytes);
      },
    }).load();
    const tokenizer = createTokenizer(dictionary);
    const raw = ipadicToRawMorphemes(tokenizer.tokenize('食べている。'), '食べている。');

    expect(raw.map((token) => token.surface)).toEqual(['食べ', 'て', 'いる', '。']);
    expect(raw[0]).toMatchObject({ pos: '動詞', conjugationType: '一段', conjugatedForm: '連用形', start: 0, end: 2 });
    expect(requests.sort()).toEqual(KUROMOJI_DICTIONARY_FILES.map((file) => `/ipadic/${file}`).sort());
  });

  it('maps real token positions after an astral character', async () => {
    const kuromoji = await import('kuromoji');
    const tokenizer = await new Promise<import('kuromoji').Tokenizer<IpadicFeatures>>((resolve, reject) => {
      kuromoji.builder({ dicPath: dictionaryRoot }).build((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    const text = '😀寿司を食べる';
    const raw = ipadicToRawMorphemes(tokenizer.tokenize(text), text);
    expect(raw.map(({ surface, start, end }) => ({ surface, start, end }))).toEqual([
      { surface: '😀', start: 0, end: 2 },
      { surface: '寿司', start: 2, end: 4 },
      { surface: 'を', start: 4, end: 5 },
      { surface: '食べる', start: 5, end: 8 },
    ]);
  });

  it('maps 連体詞 uses and hesitation uses of あの to school grammar', async () => {
    const kuromoji = await import('kuromoji');
    const tokenizer = await new Promise<import('kuromoji').Tokenizer<IpadicFeatures>>((resolve, reject) => {
      kuromoji.builder({ dicPath: dictionaryRoot }).build((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });

    const standalone = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize('あの'), 'あの'));
    expect(standalone.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'あの', hinshi: '感動詞', isIndependent: true });
    expect(standalone.diagnostics).toEqual([]);

    const punctuated = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize('あの。'), 'あの。'));
    expect(punctuated.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'あの', hinshi: '感動詞', isIndependent: true });
    expect(punctuated.diagnostics).toEqual([]);

    for (const text of ['あの、', 'あの？']) {
      const result = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize(text), text));
      expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'あの', hinshi: '感動詞', isIndependent: true });
      expect(result.diagnostics).toEqual([]);
    }

    const attributive = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize('あの本'), 'あの本'));
    expect(attributive.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'あの', hinshi: '連体詞', isIndependent: true });
    expect(attributive.diagnostics).toEqual([]);
  });

  it('preserves real-dictionary words and bunsetsu across multi-clause input', async () => {
    const kuromoji = await import('kuromoji');
    const tokenizer = await new Promise<import('kuromoji').Tokenizer<IpadicFeatures>>((resolve, reject) => {
      kuromoji.builder({ dicPath: dictionaryRoot }).build((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    const text = '雨が降ったので、私は家に帰った';
    const result = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize(text), text));
    expect(result.bunsetsu.map((item) => item.tango.map((tango) => tango.surface).join('')))
      .toEqual(['雨が', '降ったので', '、', '私は', '家に', '帰った']);
    expect(result.bunsetsu[0]?.tango.map((tango) => tango.hinshi)).toEqual(['名詞', '助詞']);
    expect(result.bunsetsu[1]?.tango[0]).toMatchObject({
      surface: '降っ', baseForm: '降る', hinshi: '動詞', katsuyouType: '五段', katsuyoukei: '連用形',
    });
    expect(result.bunsetsu[5]?.tango[0]).toMatchObject({
      surface: '帰っ', baseForm: '帰る', hinshi: '動詞', katsuyouType: '五段', katsuyoukei: '連用形',
    });
    expect(result.bunsetsu.map((item) => [item.start, item.end])).toEqual([
      [0, 2], [2, 7], [7, 8], [8, 10], [10, 12], [12, 15],
    ]);
    expect(result.diagnostics.map((issue) => issue.code)).toEqual([]);
  });

  it('keeps real-dictionary subsidiary verbs as separate ordinary bunsetsu', async () => {
    const kuromoji = await import('kuromoji');
    const tokenizer = await new Promise<import('kuromoji').Tokenizer<IpadicFeatures>>((resolve, reject) => {
      kuromoji.builder({ dicPath: dictionaryRoot }).build((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    const text = '雨が降っているので傘を持って行きましょう';
    const result = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize(text), text));
    expect(result.bunsetsu.map((item) => item.tango.map((tango) => tango.surface).join('')))
      .toEqual(['雨が', '降って', 'いるので', '傘を', '持って', '行きましょう']);
    expect(result.bunsetsu[2]?.tango[0]).toMatchObject({
      surface: 'いる', hinshi: '動詞', subHinshi: '補助動詞', isIndependent: true,
    });
    expect(result.bunsetsu[5]?.tango[0]).toMatchObject({
      surface: '行き', baseForm: '行く', hinshi: '動詞', subHinshi: '補助動詞', katsuyoukei: '連用形',
    });
    expect(result.diagnostics).toEqual([]);
    const punctuated = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize(`${text}。`), `${text}。`));
    expect(punctuated.bunsetsu.map((item) => item.tango.map((tango) => tango.surface).join('')))
      .toEqual(['雨が', '降って', 'いるので', '傘を', '持って', '行きましょう', '。']);
    expect(punctuated.diagnostics.map((issue) => issue.code)).toEqual([]);
  });

  it('ships only JavaScript, declarations, and source maps in dist', async () => {
    const { readdir } = await import('node:fs/promises');
    let entries: string[] = [];
    try {
      entries = await readdir(new URL('../dist/', import.meta.url));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    expect(entries.every((name) => /\.(?:js|d\.ts|map)$/.test(name))).toBe(true);
    expect(entries.some((name) => name.endsWith('.dat.gz'))).toBe(false);
  });
});
