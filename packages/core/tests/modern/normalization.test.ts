import { describe, expect, it } from 'vitest';
import { parseModernMorphemes } from '../../src/modern/pipeline.js';
import type { RawMorpheme } from '../../src/types.js';
import {
  adjective, auxiliary, da, morphemes, naStem, noun, particle, prefix, raw, suffix, symbol, verb,
  type RawSpec,
} from './fixtures.js';

interface Case {
  name: string;
  input: RawSpec[];
  surface: string;
  hinshi: string;
  form?: string;
  type?: string;
  independent?: boolean;
  rawCount?: number;
}

const cases: Case[] = [
  { name: '形容動詞終止形', input: [naStem('静か'), da()], surface: '静かだ', hinshi: '形容動詞', form: '終止形', rawCount: 2 },
  { name: '形容動詞未然形', input: [naStem('静か'), da('だろ', '未然形'), auxiliary('う')], surface: '静かだろ', hinshi: '形容動詞', form: '未然形', rawCount: 2 },
  { name: '形容動詞過去連用形', input: [naStem('静か'), da('だっ', '連用タ接続'), auxiliary('た', '特殊・タ')], surface: '静かだっ', hinshi: '形容動詞', form: '連用形', rawCount: 2 },
  { name: '形容動詞で', input: [naStem('静か'), da('で', '連用形')], surface: '静かで', hinshi: '形容動詞', form: '連用形', rawCount: 2 },
  { name: '形容動詞に', input: [naStem('静か'), particle('に', '副詞化')], surface: '静かに', hinshi: '形容動詞', form: '連用形', rawCount: 2 },
  { name: '形容動詞な', input: [naStem('静か'), da('な', '体言接続'), noun('人')], surface: '静かな', hinshi: '形容動詞', form: '連体形', rawCount: 2 },
  { name: '形容動詞なら', input: [naStem('静か'), da('なら', '仮定形')], surface: '静かなら', hinshi: '形容動詞', form: '仮定形', rawCount: 2 },
  { name: 'いろいろな', input: [naStem('いろいろ'), da('な', '体言接続'), noun('色')], surface: 'いろいろな', hinshi: '形容動詞', form: '連体形', rawCount: 2 },
  { name: 'きれいだ', input: [naStem('きれい'), da()], surface: 'きれいだ', hinshi: '形容動詞', form: '終止形', rawCount: 2 },
  { name: '元気だった', input: [naStem('元気'), da('だっ', '連用タ接続'), auxiliary('た', '特殊・タ')], surface: '元気だっ', hinshi: '形容動詞', form: '連用形', rawCount: 2 },
  { name: '丁寧に', input: [naStem('丁寧'), particle('に', '副詞化')], surface: '丁寧に', hinshi: '形容動詞', form: '連用形', rawCount: 2 },
  { name: '同じだ', input: [raw('同じ', '連体詞'), da()], surface: '同じ', hinshi: '連体詞', independent: true, rawCount: 1 },
  { name: '同じな', input: [raw('同じ', '連体詞'), da('な', '体言接続'), noun('色')], surface: '同じ', hinshi: '連体詞', independent: true, rawCount: 1 },
  { name: '大きな', input: [raw('大きな', '連体詞'), noun('家')], surface: '大きな', hinshi: '連体詞', independent: true },
  { name: '大きい', input: [adjective('大きい', '大きい'), noun('家')], surface: '大きい', hinshi: '形容詞', form: '連体形', type: '形容詞' },
  { name: '小さな', input: [raw('小さな', '連体詞'), noun('家')], surface: '小さな', hinshi: '連体詞' },
  { name: '小さい', input: [adjective('小さい', '小さい'), noun('家')], surface: '小さい', hinshi: '形容詞', form: '連体形' },
  { name: 'お菓子', input: [prefix('お'), noun('菓子')], surface: 'お菓子', hinshi: '名詞', rawCount: 2 },
  { name: 'ご飯', input: [prefix('ご'), noun('飯')], surface: 'ご飯', hinshi: '名詞', rawCount: 2 },
  { name: 'お水', input: [prefix('お'), noun('水')], surface: 'お水', hinshi: '名詞', rawCount: 2 },
  { name: '静かさ', input: [naStem('静か'), suffix('さ', '特殊')], surface: '静かさ', hinshi: '名詞', rawCount: 2 },
  { name: '高さ', input: [adjective('高', '高い', '語幹'), suffix('さ', '特殊')], surface: '高さ', hinshi: '名詞', rawCount: 2 },
  { name: '子どもたち', input: [noun('子ども'), suffix('たち')], surface: '子どもたち', hinshi: '名詞', rawCount: 2 },
  { name: '私たち', input: [noun('私', '代名詞'), suffix('たち')], surface: '私たち', hinshi: '名詞', rawCount: 2 },
  { name: '三冊', input: [raw('三', '数詞'), suffix('冊')], surface: '三冊', hinshi: '名詞', rawCount: 2 },
  { name: '食べている', input: [verb('食べ', '食べる', '一段', '連用形'), particle('て', '接続助詞'), verb('いる', 'いる', '一段', '基本形', '非自立')], surface: 'いる', hinshi: '動詞', independent: true },
  { name: '食べてしまう', input: [verb('食べ', '食べる', '一段', '連用形'), particle('て', '接続助詞'), verb('しまう', 'しまう', '五段・ワ行促音便', '基本形', '非自立')], surface: 'しまう', hinshi: '動詞', independent: true },
  { name: '読んでいる', input: [verb('読ん', '読む', '五段・マ行', '連用タ接続'), particle('で', '接続助詞'), verb('いる', 'いる', '一段', '基本形', '非自立')], surface: 'いる', hinshi: '動詞', independent: true },
  { name: '行ってしまった', input: [verb('行っ', '行く', '五段・カ行促音便', '連用タ接続'), particle('て', '接続助詞'), verb('しまっ', 'しまう', '五段・ワ行促音便', '連用タ接続', '非自立'), auxiliary('た', '特殊・タ')], surface: 'しまっ', hinshi: '動詞', independent: true },
  { name: '見ておく', input: [verb('見', '見る', '一段', '連用形'), particle('て', '接続助詞'), verb('おく', 'おく', '五段・カ行促音便', '基本形', '非自立')], surface: 'おく', hinshi: '動詞', independent: true },
  { name: '書いてみる', input: [verb('書い', '書く', '五段・カ行イ音便', '連用タ接続'), particle('て', '接続助詞'), verb('みる', 'みる', '一段', '基本形', '非自立')], surface: 'みる', hinshi: '動詞', independent: true },
  { name: '行こう', input: [verb('行こ', '行く', '五段・カ行促音便', '未然ウ接続'), auxiliary('う')], surface: '行こ', hinshi: '動詞', form: '未然形', type: '五段' },
  { name: '食べよう', input: [verb('食べ', '食べる', '一段', '未然ウ接続'), auxiliary('よう')], surface: '食べ', hinshi: '動詞', form: '未然形', type: '下一段' },
  { name: '見よう', input: [verb('見', '見る', '一段', '未然ウ接続'), auxiliary('よう')], surface: '見', hinshi: '動詞', form: '未然形', type: '上一段' },
  { name: '来よう', input: [verb('来', '来る', 'カ変', '未然ウ接続'), auxiliary('よう')], surface: '来', hinshi: '動詞', form: '未然形', type: 'カ変' },
  { name: 'しよう', input: [verb('し', 'する', 'サ変', '未然ウ接続'), auxiliary('よう')], surface: 'し', hinshi: '動詞', form: '未然形', type: 'サ変' },
  { name: '書いて', input: [verb('書い', '書く', '五段・カ行イ音便', '連用タ接続'), particle('て', '接続助詞')], surface: '書い', hinshi: '動詞', form: '連用形', type: '五段' },
  { name: '泳いで', input: [verb('泳い', '泳ぐ', '五段・ガ行', '連用タ接続'), particle('で', '接続助詞')], surface: '泳い', hinshi: '動詞', form: '連用形' },
  { name: '読んで', input: [verb('読ん', '読む', '五段・マ行', '連用タ接続'), particle('で', '接続助詞')], surface: '読ん', hinshi: '動詞', form: '連用形' },
  { name: '遊んで', input: [verb('遊ん', '遊ぶ', '五段・バ行', '連用タ接続'), particle('で', '接続助詞')], surface: '遊ん', hinshi: '動詞', form: '連用形' },
  { name: '死んで', input: [verb('死ん', '死ぬ', '五段・ナ行', '連用タ接続'), particle('で', '接続助詞')], surface: '死ん', hinshi: '動詞', form: '連用形' },
  { name: '買って', input: [verb('買っ', '買う', '五段・ワ行促音便', '連用タ接続'), particle('て', '接続助詞')], surface: '買っ', hinshi: '動詞', form: '連用形' },
  { name: '待って', input: [verb('待っ', '待つ', '五段・タ行', '連用タ接続'), particle('て', '接続助詞')], surface: '待っ', hinshi: '動詞', form: '連用形' },
  { name: '帰って', input: [verb('帰っ', '帰る', '五段・ラ行', '連用タ接続'), particle('て', '接続助詞')], surface: '帰っ', hinshi: '動詞', form: '連用形' },
  { name: '行って', input: [verb('行っ', '行く', '五段・カ行促音便', '連用タ接続'), particle('て', '接続助詞')], surface: '行っ', hinshi: '動詞', form: '連用形' },
  { name: '話して', input: [verb('話し', '話す', '五段・サ行', '連用形'), particle('て', '接続助詞')], surface: '話し', hinshi: '動詞', form: '連用形' },
];

describe('normalization and conjugation grammar traps', () => {
  it.each(cases)('$name', ({ input, surface, hinshi, form, type, independent, rawCount }) => {
    const result = parseModernMorphemes(morphemes(input));
    const token = result.bunsetsu.flatMap((b) => b.tango).find((t) => t.surface === surface);
    expect(token, surface).toBeDefined();
    expect(token).toMatchObject({ surface, hinshi });
    if (form) expect(token?.katsuyoukei).toBe(form);
    if (type) expect(token?.katsuyouType).toBe(type);
    if (independent !== undefined) expect(token?.isIndependent).toBe(independent);
    if (rawCount) expect(token?.rawMorphemes).toHaveLength(rawCount);
    expect(result.text).toBe(input.map((item) => item.surface).join(''));
  });
});

describe('normalization boundaries and source preservation', () => {
  it('does not merge a noun with an unrelated に', () => {
    const result = parseModernMorphemes(morphemes([noun('学校'), particle('に', '格助詞'), verb('行く', '行く', '五段・カ行促音便', '基本形')]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['学校に', '行く']);
    expect(result.bunsetsu[0]?.tango[1]).toMatchObject({ surface: 'に', hinshi: '助詞', subHinshi: '格助詞' });
  });

  it('keeps 同じだ as a 連体詞 plus 助動詞', () => {
    const result = parseModernMorphemes(morphemes([raw('同じ', '連体詞'), da()]));
    expect(result.bunsetsu[0]?.tango.map((t) => [t.surface, t.hinshi])).toEqual([['同じ', '連体詞'], ['だ', '助動詞']]);
  });

  it('retains all raw morphemes and offsets through a merge', () => {
    const input = morphemes([naStem('静か'), da('な', '体言接続'), noun('人')]);
    const result = parseModernMorphemes(input);
    const token = result.bunsetsu[0]?.tango[0];
    expect(token).toMatchObject({ start: 0, end: 3, surface: '静かな', baseForm: '静かだ' });
    expect(token?.rawMorphemes).toEqual(input.slice(0, 2));
  });

  it('does not merge a prefix into a dependent particle', () => {
    const result = parseModernMorphemes(morphemes([prefix('お'), particle('は', '係助詞'), noun('水')]));
    expect(result.diagnostics.some((d) => d.code === 'MODERN_NORMALIZE_ORPHAN_PREFIX')).toBe(true);
    expect(result.text).toBe('おは水');
  });

  it('reports an orphan suffix without dropping it', () => {
    const result = parseModernMorphemes(morphemes([particle('は', '係助詞'), suffix('さ')]));
    expect(result.diagnostics.some((d) => d.code === 'MODERN_NORMALIZE_ORPHAN_SUFFIX')).toBe(true);
    expect(result.bunsetsu.flatMap((b) => b.tango).map((t) => t.surface)).toEqual(['は', 'さ']);
  });

  it('keeps sentence-initial dependent words best-effort', () => {
    const result = parseModernMorphemes(morphemes([particle('は', '係助詞'), noun('本')]));
    expect(result.diagnostics.some((d) => d.code === 'MODERN_BUNSETSU_LEADING_DEPENDENT')).toBe(true);
    expect(result.bunsetsu).toHaveLength(2);
  });

  it('reconstructs missing offsets deterministically', () => {
    const input: RawMorpheme[] = [
      { surface: '本', pos: '名詞', start: Number.NaN, end: Number.NaN },
      { surface: 'を', pos: '助詞', posDetail1: '格助詞', start: -1, end: -1 },
    ];
    const result = parseModernMorphemes(input);
    expect(result.text).toBe('本を');
    expect(result.bunsetsu[0]?.tango.map((t) => [t.start, t.end])).toEqual([[0, 1], [1, 2]]);
    expect(result.diagnostics.filter((d) => d.code === 'MODERN_INPUT_OFFSET_RECONSTRUCTED')).toHaveLength(2);
  });

  it('skips malformed and empty morphemes with diagnostics', () => {
    const input = [null, { surface: '', pos: '名詞', start: 0, end: 0 }, ...morphemes([noun('本')])] as unknown as RawMorpheme[];
    const result = parseModernMorphemes(input);
    expect(result.text).toBe('本');
    expect(result.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(['MODERN_INPUT_INVALID_MORPHEME', 'MODERN_INPUT_EMPTY_SURFACE']));
  });

  it('warns about overlapping offsets but preserves order', () => {
    const input = morphemes([noun('本'), particle('を', '格助詞')]);
    input[1]!.start = 0;
    const result = parseModernMorphemes(input);
    expect(result.diagnostics.some((d) => d.code === 'MODERN_INPUT_OFFSET_OVERLAP')).toBe(true);
    expect(result.text).toBe('本を');
  });

  it('returns an empty valid result for empty input', () => {
    expect(parseModernMorphemes([])).toEqual({ mode: 'modern', text: '', bunsetsu: [], diagnostics: [] });
  });

  it('handles non-array input without throwing', () => {
    const result = parseModernMorphemes(null as unknown as RawMorpheme[]);
    expect(result.bunsetsu).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe('MODERN_INPUT_NOT_ARRAY');
  });

  it('keeps punctuation as a best-effort token with a diagnostic', () => {
    const result = parseModernMorphemes(morphemes([noun('本'), symbol('。')]));
    expect(result.text).toBe('本。');
    expect(result.diagnostics.some((d) => d.code === 'MODERN_POS_UNSUPPORTED')).toBe(true);
  });
});
