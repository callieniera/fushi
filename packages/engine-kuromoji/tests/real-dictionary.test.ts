import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { IpadicFeatures } from 'kuromoji';
import { FetchDictionaryLoader } from '../src/dictionary-loader.js';
import { createTokenizer } from '../src/engine.js';
import { ipadicToRawMorphemes } from '../src/ipadic-adapter.js';
import { parseModernMorphemes, type ParseResult } from '@lib/core';
import { KUROMOJI_DICTIONARY_FILES } from '../src/dictionary-loader.js';

const dictionaryRootUrl = new URL('../node_modules/kuromoji/dict/', import.meta.url);
const dictionaryRoot = fileURLToPath(dictionaryRootUrl);

async function withRealTokenizer(run: (tokenizer: import('kuromoji').Tokenizer<IpadicFeatures>) => void): Promise<void> {
  const kuromoji = await import('kuromoji');
  const tokenizer = await new Promise<import('kuromoji').Tokenizer<IpadicFeatures>>((resolve, reject) => {
    kuromoji.builder({ dicPath: dictionaryRoot }).build((error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
  run(tokenizer);
}

function parseReal(tokenizer: import('kuromoji').Tokenizer<IpadicFeatures>, text: string): ParseResult {
  return parseModernMorphemes(ipadicToRawMorphemes(tokenizer.tokenize(text), text));
}

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
    await withRealTokenizer((tokenizer) => {
      const text = '😀寿司を食べる';
      const raw = ipadicToRawMorphemes(tokenizer.tokenize(text), text);
      expect(raw.map(({ surface, start, end }) => ({ surface, start, end }))).toEqual([
        { surface: '😀', start: 0, end: 2 },
        { surface: '寿司', start: 2, end: 4 },
        { surface: 'を', start: 4, end: 5 },
        { surface: '食べる', start: 5, end: 8 },
      ]);
    });
  });

  it('maps real IPAdic 係助詞 to 副助詞 without changing 格助詞', async () => {
    await withRealTokenizer((tokenizer) => {
      for (const [text, surface] of [
        ['私は本を読む', 'は'],
        ['私も行く', 'も'],
        ['君こそ正しい', 'こそ'],
        ['これさえあれば', 'さえ'],
        ['これしかない', 'しか'],
      ] as const) {
        const result = parseReal(tokenizer, text);
        const particle = result.bunsetsu.flatMap((b) => b.tango).find((tango) => tango.surface === surface);
        expect(particle).toMatchObject({ hinshi: '助詞', subHinshi: '副助詞' });
        expect(particle?.rawMorphemes?.[0]?.posDetail1).toBe('係助詞');
      }

      const demo = parseReal(tokenizer, '子供でも分かる');
      expect(demo.bunsetsu[0]?.tango.slice(1).map((tango) => [tango.surface, tango.subHinshi])).toEqual([
        ['で', '格助詞'], ['も', '副助詞'],
      ]);

      for (const [text, surface] of [['彼なぞ来ない', 'なぞ'], ['彼なんて知らない', 'なんて']] as const) {
        const result = parseReal(tokenizer, text);
        const particle = result.bunsetsu.flatMap((b) => b.tango).find((tango) => tango.surface === surface);
        expect(particle).toMatchObject({ hinshi: '助詞', subHinshi: '副助詞' });
      }
    });
  });

  it('maps 連体詞 uses and hesitation uses of あの to school grammar', async () => {
    await withRealTokenizer((tokenizer) => {
      const standalone = parseReal(tokenizer, 'あの');
      expect(standalone.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'あの', hinshi: '感動詞', isIndependent: true });
      expect(standalone.diagnostics).toEqual([]);

      const punctuated = parseReal(tokenizer, 'あの。');
      expect(punctuated.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'あの', hinshi: '感動詞', isIndependent: true });
      expect(punctuated.bunsetsu[1]?.tango[0]).toMatchObject({ surface: '。', hinshi: '記号', isIndependent: true });
      expect(punctuated.bunsetsu[1]?.tango[0]?.subHinshi).toBeUndefined();
      expect(punctuated.diagnostics).toEqual([]);

      for (const text of ['あの、', 'あの？']) {
        const result = parseReal(tokenizer, text);
        expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'あの', hinshi: '感動詞', isIndependent: true });
        expect(result.diagnostics).toEqual([]);
      }

      const attributive = parseReal(tokenizer, 'あの本');
      expect(attributive.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'あの', hinshi: '連体詞', isIndependent: true });
      expect(attributive.diagnostics).toEqual([]);
    });
  });

  it('preserves real-dictionary words and bunsetsu across multi-clause input', async () => {
    await withRealTokenizer((tokenizer) => {
      const text = '雨が降ったので、私は家に帰った';
      const result = parseReal(tokenizer, text);
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
  });

  it('keeps real-dictionary subsidiary verbs as separate ordinary bunsetsu', async () => {
    await withRealTokenizer((tokenizer) => {
      const text = '雨が降っているので傘を持って行きましょう';
      const result = parseReal(tokenizer, text);
      expect(result.bunsetsu.map((item) => item.tango.map((tango) => tango.surface).join('')))
        .toEqual(['雨が', '降って', 'いるので', '傘を', '持って', '行きましょう']);
      expect(result.bunsetsu[2]?.tango[0]).toMatchObject({
        surface: 'いる', hinshi: '動詞', subHinshi: '補助動詞', isIndependent: true,
      });
      expect(result.bunsetsu[5]?.tango[0]).toMatchObject({
        surface: '行き', baseForm: '行く', hinshi: '動詞', subHinshi: '補助動詞', katsuyoukei: '連用形',
      });
      expect(result.diagnostics).toEqual([]);
      const punctuated = parseReal(tokenizer, `${text}。`);
      expect(punctuated.bunsetsu.map((item) => item.tango.map((tango) => tango.surface).join('')))
        .toEqual(['雨が', '降って', 'いるので', '傘を', '持って', '行きましょう', '。']);
      expect(punctuated.diagnostics.map((issue) => issue.code)).toEqual([]);
    });
  });

  it('classifies confirmed one-grade verb traps through real IPAdic', async () => {
    await withRealTokenizer((tokenizer) => {
      for (const text of ['出る', '寝る', 'できる', '見える', '聞こえる', '得る']) {
        const result = parseReal(tokenizer, text);
        expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ hinshi: '動詞', katsuyouType: '下一段' });
        expect(result.diagnostics).toEqual([]);
      }
      for (const text of ['見る', '起きる', '強いる', '滅びる']) {
        const result = parseReal(tokenizer, text);
        expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ hinshi: '動詞', katsuyouType: '上一段' });
        expect(result.diagnostics).toEqual([]);
      }
    });
  });

  it('reconstructs サ変 words while preserving 勉強をする', async () => {
    await withRealTokenizer((tokenizer) => {
      for (const [text, surface, form] of [
        ['勉強する', '勉強する', '終止形'],
        ['勉強します', '勉強し', '連用形'],
        ['勉強した', '勉強し', '連用形'],
        ['勉強しない', '勉強し', '未然形'],
        ['勉強しよう', '勉強しよ', '未然形'],
        ['勉強すれば', '勉強すれ', '仮定形'],
        ['勉強しろ', '勉強しろ', '命令形'],
      ] as const) {
        const result = parseReal(tokenizer, text);
        expect(result.bunsetsu[0]?.tango[0]).toMatchObject({
          surface, baseForm: '勉強する', hinshi: '動詞', katsuyouType: 'サ変', katsuyoukei: form,
        });
        expect(result.bunsetsu[0]?.tango[0]?.rawMorphemes?.map((m) => m.surface).join('')).toBe(surface);
        expect(result.diagnostics).toEqual([]);
      }
      const separated = parseReal(tokenizer, '勉強をする');
      expect(separated.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['勉強を', 'する']);
      expect(separated.bunsetsu[0]?.tango[0]?.hinshi).toBe('名詞');
    });
  });

  it('preserves school-word boundaries in a サ変 passive form', async () => {
    await withRealTokenizer((tokenizer) => {
      const result = parseReal(tokenizer, '逮捕された');
      const tokens = result.bunsetsu.flatMap(({ tango }) => tango);

      expect(tokens.map(({ surface, hinshi }) => [surface, hinshi])).toEqual([
        ['逮捕', '名詞'],
        ['さ', '動詞'],
        ['れ', '助動詞'],
        ['た', '助動詞'],
      ]);
      expect(result.bunsetsu.map(({ tango }) => tango.map(({ surface }) => surface).join('')))
        .toEqual(['逮捕された']);
      expect(tokens[0]).toMatchObject({ baseForm: '逮捕', subHinshi: 'サ変接続' });
      expect(tokens[1]).toMatchObject({
        baseForm: 'する',
        katsuyouType: 'サ変',
        katsuyoukei: '未然形',
      });
      expect(tokens[2]).toMatchObject({
        baseForm: 'れる',
        subHinshi: '受身・自発・可能・尊敬',
        katsuyouType: '下一段',
        katsuyoukei: '連用形',
        isIndependent: false,
      });
      expect(tokens[2]?.rawMorphemes?.map(({ surface }) => surface)).toEqual(['れ']);
      expect(result.diagnostics.map(({ code }) => code)).toEqual(['MODERN_RERU_AMBIGUOUS']);
    });
  });

  it('reconstructs adjectival, そう, よう, and 同じ words through real IPAdic', async () => {
    await withRealTokenizer((tokenizer) => {
      for (const [text, surface, form] of [
        ['科学的だ', '科学的だ', '終止形'],
        ['科学的な方法', '科学的な', '連体形'],
        ['科学的に', '科学的に', '連用形'],
        ['科学的です', '科学的です', '終止形'],
      ] as const) {
        const result = parseReal(tokenizer, text);
        const token = result.bunsetsu.flatMap((b) => b.tango).find((t) => t.surface === surface);
        expect(token).toMatchObject({ baseForm: '科学的だ', hinshi: '形容動詞', katsuyoukei: form });
        expect(token?.rawMorphemes?.map((m) => m.surface).join('')).toBe(surface);
        expect(result.diagnostics).toEqual([]);
      }

      const appearance = parseReal(tokenizer, '雨が降りそうです');
      expect(appearance.bunsetsu[1]?.tango).toHaveLength(2);
      expect(appearance.bunsetsu[1]?.tango[0]).toMatchObject({ surface: '降り', katsuyoukei: '連用形' });
      expect(appearance.bunsetsu[1]?.tango[1]).toMatchObject({
        surface: 'そうです', baseForm: 'そうだ', hinshi: '助動詞', subHinshi: '様態', katsuyoukei: '終止形',
      });
      expect(appearance.diagnostics).toEqual([]);

      for (const text of ['雨が降るそうだ', '雨が降るそうです']) {
        const result = parseReal(tokenizer, text);
        expect(result.bunsetsu[1]?.tango[0]).toMatchObject({ surface: '降る', katsuyoukei: '終止形' });
        expect(result.bunsetsu[1]?.tango[1]).toMatchObject({ hinshi: '助動詞', subHinshi: '伝聞' });
        expect(result.diagnostics).toEqual([]);
      }

      for (const [text, surface, form] of [
        ['読むようだ', 'ようだ', '終止形'],
        ['読むような本', 'ような', '連体形'],
        ['読むように', 'ように', '連用形'],
        ['読むようです', 'ようです', '終止形'],
      ] as const) {
        const result = parseReal(tokenizer, text);
        expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ surface: '読む', katsuyoukei: '連体形' });
        expect(result.bunsetsu[0]?.tango[1]).toMatchObject({
          surface, baseForm: 'ようだ', hinshi: '助動詞', katsuyoukei: form, isIndependent: false,
        });
        expect(result.diagnostics).toEqual([]);
      }

      const onaji = parseReal(tokenizer, '同じだ');
      expect(onaji.bunsetsu).toHaveLength(1);
      expect(onaji.bunsetsu[0]?.tango).toHaveLength(1);
      expect(onaji.bunsetsu[0]?.tango[0]).toMatchObject({
        surface: '同じだ', baseForm: '同じだ', hinshi: '形容動詞', katsuyoukei: '終止形',
      });
      expect(onaji.diagnostics).toEqual([]);
    });
  });

  it('repairs suffix-derived verbs and nouns through real IPAdic', async () => {
    await withRealTokenizer((tokenizer) => {
      const garu = parseReal(tokenizer, '痛がる');
      expect(garu.bunsetsu[0]?.tango).toHaveLength(1);
      expect(garu.bunsetsu[0]?.tango[0]).toMatchObject({
        surface: '痛がる', baseForm: '痛がる', hinshi: '動詞', katsuyouType: '五段', katsuyoukei: '終止形',
      });
      expect(garu.diagnostics).toEqual([]);

      const takasa = parseReal(tokenizer, '高さ');
      expect(takasa.bunsetsu[0]?.tango).toHaveLength(1);
      expect(takasa.bunsetsu[0]?.tango[0]).toMatchObject({
        surface: '高さ', baseForm: '高さ', hinshi: '名詞',
      });
      expect(takasa.bunsetsu[0]?.tango[0]?.katsuyouType).toBeUndefined();
      expect(takasa.bunsetsu[0]?.tango[0]?.katsuyoukei).toBeUndefined();
      expect(takasa.diagnostics).toEqual([]);
    });
  });

  it('repairs local context, nominal の, and compound か through real IPAdic', async () => {
    await withRealTokenizer((tokenizer) => {
      const ordinaryNai = parseReal(tokenizer, 'お金がない');
      expect(ordinaryNai.bunsetsu[1]?.tango[0]).toMatchObject({ hinshi: '形容詞', subHinshi: '自立' });
      const subsidiaryNai = parseReal(tokenizer, '高くない');
      expect(subsidiaryNai.bunsetsu[1]?.tango[0]).toMatchObject({ hinshi: '形容詞', subHinshi: '補助形容詞' });

      expect(parseReal(tokenizer, 'あのもう本を読む').bunsetsu[0]?.tango[0]).toMatchObject({
        surface: 'あの', hinshi: '感動詞',
      });
      expect(parseReal(tokenizer, 'あの白い建物').bunsetsu[0]?.tango[0]).toMatchObject({
        surface: 'あの', hinshi: '連体詞',
      });

      const nominal = parseReal(tokenizer, '赤いのを選ぶ');
      expect(nominal.bunsetsu[0]?.tango.map((t) => [t.surface, t.hinshi, t.subHinshi])).toEqual([
        ['赤い', '形容詞', '自立'], ['の', '助詞', '準体助詞'], ['を', '助詞', '格助詞'],
      ]);
      expect(nominal.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['赤いのを', '選ぶ']);

      expect(parseReal(tokenizer, '誰か来た').bunsetsu[0]?.tango[1]).toMatchObject({ hinshi: '助詞', subHinshi: '副助詞' });
      expect(parseReal(tokenizer, '行くか。').bunsetsu[0]?.tango[1]).toMatchObject({ hinshi: '助詞', subHinshi: '終助詞' });
      expect(parseReal(tokenizer, '行くか帰るか').bunsetsu[0]?.tango[1]).toMatchObject({ hinshi: '助詞', subHinshi: '並立助詞' });
    });
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
