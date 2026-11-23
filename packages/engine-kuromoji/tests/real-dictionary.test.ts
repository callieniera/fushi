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

  it('resolves real-dictionary 複文 and 重文 into clause-scoped components', async () => {
    const kuromoji = await import('kuromoji');
    const tokenizer = await new Promise<import('kuromoji').Tokenizer<IpadicFeatures>>((resolve, reject) => {
      kuromoji.builder({ dicPath: dictionaryRoot }).build((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    for (const text of [
      '雨が降ったので、私は家に帰った',
      '私は雨が降ったので家に帰った',
      '子どもが読んだ本を私は買った',
      '私は本を読んで、弟はテレビを見た',
    ]) {
      const result = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize(text), text));
      expect(result.clauses).toHaveLength(2);
      expect(result.bunsetsu.filter((item) => item.sentenceComponent === '述語')).toHaveLength(2);
      expect(result.diagnostics.map((issue) => issue.code)).not.toContain(
        'MODERN_COMPONENT_PREDICATE_AMBIGUOUS',
      );
      const ids = new Set(result.bunsetsu.map((item) => item.id));
      for (const item of result.bunsetsu) {
        expect(item.sentenceRelations?.every((relation) => ids.has(relation.targetBunsetsuId))).not.toBe(false);
      }
    }
  });

  it('groups real-dictionary subsidiary predicates in a 接続節 and main clause', async () => {
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
    expect(result.clauses?.map((clause) => [clause.kind, clause.predicateBunsetsuIds])).toEqual([
      ['接続節', ['modern-bunsetsu-1', 'modern-bunsetsu-2']],
      ['主節', ['modern-bunsetsu-4', 'modern-bunsetsu-5']],
    ]);
    expect(result.renbunsetsu?.map((group) => [group.relation, group.sentenceComponent])).toEqual([
      ['補助の関係', '接続語'], ['補助の関係', '述語'],
    ]);
    expect(result.sentenceType).toBe('複文');
    expect(result.bunsetsu[3]?.modifierKind).toBe('連用修飾語');
    expect(result.diagnostics.map((issue) => issue.code)).toEqual([
      'MODERN_COMPONENT_SUBJECT_UNRESOLVED',
    ]);
    const punctuated = parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize(`${text}。`), `${text}。`));
    expect(punctuated.clauses?.map((clause) => clause.predicateBunsetsuIds)).toEqual([
      ['modern-bunsetsu-1', 'modern-bunsetsu-2'],
      ['modern-bunsetsu-4', 'modern-bunsetsu-5'],
    ]);
    expect(punctuated.sentenceType).toBe('複文');
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
