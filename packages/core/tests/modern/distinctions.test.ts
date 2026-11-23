import { describe, expect, it } from 'vitest';
import { parseModernMorphemes } from '../../src/modern/pipeline.js';
import {
  adjective, auxiliary, da, morphemes, naStem, noun, particle, raw, suffix, symbol, verb,
  type RawSpec,
} from './fixtures.js';

interface DistinctionCase {
  name: string;
  input: RawSpec[];
  surface: string;
  hinshi: string;
  subHinshi?: string;
  form?: string;
  type?: string;
  independent?: boolean;
  diagnostic?: string;
}

const cases: DistinctionCase[] = [
  { name: '動詞未然形＋ない', input: [verb('行か', '行く', '五段・カ行促音便', '未然形'), auxiliary('ない', '特殊・ナイ')], surface: 'ない', hinshi: '助動詞', subHinshi: '打消', independent: false, type: '特殊・ナイ' },
  { name: '一段未然形＋ない', input: [verb('食べ', '食べる', '一段', '未然形'), auxiliary('ない', '特殊・ナイ')], surface: 'ない', hinshi: '助動詞', independent: false },
  { name: 'サ変未然形＋ない', input: [verb('し', 'する', 'サ変', '未然形'), auxiliary('ない', '特殊・ナイ')], surface: 'ない', hinshi: '助動詞', independent: false },
  { name: 'カ変未然形＋ない', input: [verb('来', '来る', 'カ変', '未然形'), auxiliary('ない', '特殊・ナイ')], surface: 'ない', hinshi: '助動詞', independent: false },
  { name: '補助動詞未然形＋ない', input: [verb('食べ', '食べる', '一段', '連用形'), particle('て', '接続助詞'), verb('い', 'いる', '一段', '未然形', '非自立'), auxiliary('ない', '特殊・ナイ')], surface: 'ない', hinshi: '助動詞', independent: false },
  { name: '形容詞連用形＋ない', input: [adjective('美しく', '美しい', '連用テ接続'), auxiliary('ない', '特殊・ナイ')], surface: 'ない', hinshi: '形容詞', subHinshi: '補助形容詞', independent: true, type: '形容詞' },
  { name: '高くない', input: [adjective('高く', '高い', '連用テ接続'), auxiliary('ない', '特殊・ナイ')], surface: 'ない', hinshi: '形容詞', independent: true },
  { name: '形容動詞連用形＋ない', input: [naStem('静か'), da('で', '連用形'), raw('ない', '形容詞', { posDetail1: '自立', baseForm: 'ない', conjugationType: '形容詞・アウオ段', conjugatedForm: '基本形' })], surface: 'ない', hinshi: '形容詞', independent: true },
  { name: '静かではない', input: [naStem('静か'), da('で', '連用形'), particle('は', '係助詞'), raw('ない', '形容詞', { posDetail1: '自立', baseForm: 'ない', conjugationType: '形容詞・アウオ段', conjugatedForm: '基本形' })], surface: 'ない', hinshi: '形容詞', independent: true },
  { name: '行かなくはない', input: [verb('行か', '行く', '五段・カ行促音便', '未然形'), auxiliary('なく', '特殊・ナイ', '連用テ接続', 'ない'), particle('は', '係助詞'), raw('ない', '形容詞', { posDetail1: '自立', baseForm: 'ない', conjugationType: '形容詞・アウオ段', conjugatedForm: '基本形' })], surface: 'ない', hinshi: '形容詞', independent: true },
  { name: 'お金がない', input: [noun('お金'), particle('が', '格助詞'), adjective('ない', 'ない')], surface: 'ない', hinshi: '形容詞', independent: true },
  { name: '雨が降りそう', input: [noun('雨'), particle('が', '格助詞'), verb('降り', '降りる', '一段', '連用形'), raw('そう', '名詞', { posDetail1: '接尾', posDetail2: '助動詞語幹' }), da()], surface: 'そうだ', hinshi: '助動詞', subHinshi: '様態', independent: false },
  { name: 'おいしそう', input: [adjective('おいし', 'おいしい', '連用形'), raw('そう', '名詞', { posDetail1: '接尾', posDetail2: '助動詞語幹' }), da()], surface: 'そうだ', hinshi: '助動詞', subHinshi: '様態' },
  { name: '静かそう', input: [naStem('静か'), raw('そう', '名詞', { posDetail1: '接尾', posDetail2: '助動詞語幹' }), da()], surface: 'そうだ', hinshi: '助動詞', subHinshi: '様態' },
  { name: '雨が降るそう', input: [noun('雨'), particle('が', '格助詞'), verb('降る', '降る', '五段・ラ行', '基本形'), raw('そう', '名詞', { posDetail1: '特殊', posDetail2: '助動詞語幹' }), da()], surface: 'そうだ', hinshi: '助動詞', subHinshi: '伝聞' },
  { name: 'おいしいそう', input: [adjective('おいしい', 'おいしい'), raw('そう', '名詞', { posDetail1: '特殊', posDetail2: '助動詞語幹' }), da()], surface: 'そうだ', hinshi: '助動詞', subHinshi: '伝聞' },
  { name: '静かだそう', input: [naStem('静か'), da(), raw('そう', '名詞', { posDetail1: '特殊', posDetail2: '助動詞語幹' }), da()], surface: 'そうだ', hinshi: '助動詞', subHinshi: '伝聞' },
  { name: 'そう様態連体形', input: [verb('降り', '降りる', '一段', '連用形'), raw('そう', '名詞', { posDetail1: '接尾', posDetail2: '助動詞語幹' }), da('な', '体言接続'), noun('空')], surface: 'そうな', hinshi: '助動詞', subHinshi: '様態', form: '連体形' },
  { name: 'そう伝聞終止形', input: [verb('降る', '降る', '五段・ラ行', '基本形'), raw('そう', '名詞', { posDetail1: '特殊', posDetail2: '助動詞語幹' }), da()], surface: 'そうだ', hinshi: '助動詞', subHinshi: '伝聞', form: '終止形' },
  { name: 'そう不明は診断', input: [raw('そう', '名詞', { posDetail1: '特殊', posDetail2: '助動詞語幹' })], surface: 'そう', hinshi: '助動詞', diagnostic: 'MODERN_SOU_AMBIGUOUS' },
  { name: '私の本', input: [noun('私', '代名詞'), particle('の', '連体化'), noun('本')], surface: 'の', hinshi: '助詞', subHinshi: '格助詞' },
  { name: '東京の空', input: [noun('東京'), particle('の', '連体化'), noun('空')], surface: 'の', hinshi: '助詞', subHinshi: '格助詞' },
  { name: '赤いの', input: [adjective('赤い', '赤い'), particle('の', '名詞化')], surface: 'の', hinshi: '助詞', subHinshi: '準体助詞' },
  { name: '私の', input: [noun('私', '代名詞'), particle('の', '名詞化')], surface: 'の', hinshi: '助詞', subHinshi: '準体助詞' },
  { name: '行くの', input: [verb('行く', '行く', '五段・カ行促音便', '基本形'), particle('の', '終助詞')], surface: 'の', hinshi: '助詞', subHinshi: '終助詞' },
  { name: '行くの？', input: [verb('行く', '行く', '五段・カ行促音便', '基本形'), particle('の', '終助詞'), symbol('？')], surface: 'の', hinshi: '助詞', subHinshi: '終助詞' },
  { name: '学校に', input: [noun('学校'), particle('に', '格助詞'), verb('行く', '行く', '五段・カ行促音便', '基本形')], surface: 'に', hinshi: '助詞', subHinshi: '格助詞' },
  { name: '先生に', input: [noun('先生'), particle('に', '格助詞'), verb('会う', '会う', '五段・ワ行促音便', '基本形')], surface: 'に', hinshi: '助詞', subHinshi: '格助詞' },
  { name: '行くに行った', input: [verb('行く', '行く', '五段・カ行促音便', '基本形'), particle('に', '接続助詞'), verb('行っ', '行く', '五段・カ行促音便', '連用タ接続'), auxiliary('た', '特殊・タ')], surface: 'に', hinshi: '助詞', subHinshi: '接続助詞' },
  { name: '副詞化に', input: [naStem('静か'), particle('に', '副詞化')], surface: '静かに', hinshi: '形容動詞', form: '連用形' },
  { name: '接続助詞に', input: [verb('行く', '行く', '五段・カ行促音便', '基本形'), particle('に', '接続助詞'), verb('来る', '来る', 'カ変', '基本形')], surface: 'に', hinshi: '助詞', subHinshi: '接続助詞' },
  { name: '断定だ', input: [noun('学生'), da()], surface: 'だ', hinshi: '助動詞', subHinshi: '断定', form: '終止形', type: '特殊・ダ' },
  { name: 'だろう', input: [noun('学生'), da('だろ', '未然形'), auxiliary('う')], surface: 'だろ', hinshi: '助動詞', form: '未然形' },
  { name: 'だった', input: [noun('学生'), da('だっ', '連用タ接続'), auxiliary('た', '特殊・タ')], surface: 'だっ', hinshi: '助動詞', form: '連用形' },
  { name: 'なら仮定形', input: [noun('学生'), da('なら', '仮定形')], surface: 'なら', hinshi: '助動詞', form: '仮定形' },
  { name: '受身れる', input: [verb('読ま', '読む', '五段・マ行', '未然形'), auxiliary('れる', '一段', '基本形')], surface: 'れる', hinshi: '助動詞', subHinshi: '受身・自発・可能・尊敬', diagnostic: 'MODERN_RERU_AMBIGUOUS' },
  { name: '可能られる', input: [verb('食べ', '食べる', '一段', '未然形'), auxiliary('られる', '一段', '基本形')], surface: 'られる', hinshi: '助動詞', diagnostic: 'MODERN_RERU_AMBIGUOUS' },
  { name: '尊敬れる', input: [verb('来', '来る', 'カ変', '未然形'), auxiliary('れる', '一段', '基本形')], surface: 'れる', hinshi: '助動詞', diagnostic: 'MODERN_RERU_AMBIGUOUS' },
  { name: '自発られる', input: [verb('思い出さ', '思い出す', '五段・サ行', '未然形'), auxiliary('れる', '一段', '基本形')], surface: 'れる', hinshi: '助動詞', diagnostic: 'MODERN_RERU_AMBIGUOUS' },
  { name: 'れる連体形', input: [verb('読ま', '読む', '五段・マ行', '未然形'), auxiliary('れる', '一段', '基本形'), noun('本')], surface: 'れる', hinshi: '助動詞', form: '連体形', diagnostic: 'MODERN_RERU_AMBIGUOUS' },
  { name: 'れる仮定形', input: [verb('読ま', '読む', '五段・マ行', '未然形'), auxiliary('れれ', '一段', '仮定形', 'れる')], surface: 'れれ', hinshi: '助動詞', form: '仮定形' },
];

describe('identical-surface grammar distinctions', () => {
  it.each(cases)('$name', ({ input, surface, hinshi, subHinshi, form, type, independent, diagnostic }) => {
    const result = parseModernMorphemes(morphemes(input));
    const token = result.bunsetsu.flatMap((b) => b.tango).find((t) => t.surface === surface);
    expect(token, surface).toBeDefined();
    expect(token).toMatchObject({ surface, hinshi });
    if (subHinshi) expect(token?.subHinshi).toBe(subHinshi);
    if (form) expect(token?.katsuyoukei).toBe(form);
    if (type) expect(token?.katsuyouType).toBe(type);
    if (independent !== undefined) expect(token?.isIndependent).toBe(independent);
    if (diagnostic) expect(result.diagnostics.some((d) => d.code === diagnostic)).toBe(true);
  });
});
