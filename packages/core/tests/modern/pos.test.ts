import { describe, expect, it } from 'vitest';
import { parseModernMorphemes } from '../../src/modern/pipeline.js';
import { adjective, auxiliary, morphemes, noun, particle, raw, verb, type RawSpec } from './fixtures.js';

interface PosCase {
  name: string;
  input: RawSpec[];
  hinshi: string;
  independent: boolean;
  form?: string;
  type?: string;
}

const cases: PosCase[] = [
  { name: '五段終止形', input: [verb('読む', '読む', '五段・マ行', '基本形')], hinshi: '動詞', independent: true, form: '終止形', type: '五段' },
  { name: '五段連体形', input: [verb('読む', '読む', '五段・マ行', '基本形'), noun('人')], hinshi: '動詞', independent: true, form: '連体形', type: '五段' },
  { name: '五段未然形', input: [verb('読ま', '読む', '五段・マ行', '未然形'), auxiliary('ない', '特殊・ナイ')], hinshi: '動詞', independent: true, form: '未然形', type: '五段' },
  { name: '五段連用形', input: [verb('読み', '読む', '五段・マ行', '連用形'), auxiliary('ます', '特殊・マス')], hinshi: '動詞', independent: true, form: '連用形', type: '五段' },
  { name: '五段仮定形', input: [verb('読め', '読む', '五段・マ行', '仮定形'), particle('ば', '接続助詞')], hinshi: '動詞', independent: true, form: '仮定形', type: '五段' },
  { name: '五段命令形', input: [verb('読め', '読む', '五段・マ行', '命令形')], hinshi: '動詞', independent: true, form: '命令形', type: '五段' },
  { name: '下一段終止形', input: [verb('食べる', '食べる', '一段', '基本形')], hinshi: '動詞', independent: true, form: '終止形', type: '下一段' },
  { name: '下一段連用形', input: [verb('食べ', '食べる', '一段', '連用形'), auxiliary('ます', '特殊・マス')], hinshi: '動詞', independent: true, form: '連用形', type: '下一段' },
  { name: '下一段仮定形', input: [verb('食べれ', '食べる', '一段', '仮定形'), particle('ば', '接続助詞')], hinshi: '動詞', independent: true, form: '仮定形', type: '下一段' },
  { name: '下一段命令形', input: [verb('食べろ', '食べる', '一段', '命令ｒｏ')], hinshi: '動詞', independent: true, form: '命令形', type: '下一段' },
  { name: '上一段見る', input: [verb('見る', '見る', '一段', '基本形')], hinshi: '動詞', independent: true, form: '終止形', type: '上一段' },
  { name: '上一段起きる', input: [verb('起きる', '起きる', '一段', '基本形')], hinshi: '動詞', independent: true, form: '終止形', type: '上一段' },
  { name: '上一段命令形', input: [verb('見ろ', '見る', '一段', '命令ｒｏ')], hinshi: '動詞', independent: true, form: '命令形', type: '上一段' },
  { name: 'サ変する', input: [verb('する', 'する', 'サ変', '基本形')], hinshi: '動詞', independent: true, form: '終止形', type: 'サ変' },
  { name: 'サ変未然形', input: [verb('し', 'する', 'サ変', '未然形'), auxiliary('ない', '特殊・ナイ')], hinshi: '動詞', independent: true, form: '未然形', type: 'サ変' },
  { name: 'サ変仮定形', input: [verb('すれ', 'する', 'サ変', '仮定形'), particle('ば', '接続助詞')], hinshi: '動詞', independent: true, form: '仮定形', type: 'サ変' },
  { name: 'サ変命令形', input: [verb('しろ', 'する', 'サ変', '命令ｒｏ')], hinshi: '動詞', independent: true, form: '命令形', type: 'サ変' },
  { name: 'カ変来る', input: [verb('来る', '来る', 'カ変', '基本形')], hinshi: '動詞', independent: true, form: '終止形', type: 'カ変' },
  { name: 'カ変連用形', input: [verb('来', '来る', 'カ変', '連用形'), auxiliary('ます', '特殊・マス')], hinshi: '動詞', independent: true, form: '連用形', type: 'カ変' },
  { name: 'カ変仮定形', input: [verb('来れ', '来る', 'カ変', '仮定形'), particle('ば', '接続助詞')], hinshi: '動詞', independent: true, form: '仮定形', type: 'カ変' },
  { name: 'カ変命令形', input: [verb('来い', '来る', 'カ変', '命令ｉ')], hinshi: '動詞', independent: true, form: '命令形', type: 'カ変' },
  { name: '形容詞終止形', input: [adjective('高い', '高い')], hinshi: '形容詞', independent: true, form: '終止形', type: '形容詞' },
  { name: '形容詞連体形', input: [adjective('高い', '高い'), noun('山')], hinshi: '形容詞', independent: true, form: '連体形', type: '形容詞' },
  { name: '形容詞連用形', input: [adjective('高く', '高い', '連用テ接続'), auxiliary('ない', '特殊・ナイ')], hinshi: '形容詞', independent: true, form: '連用形', type: '形容詞' },
  { name: '形容詞未然形', input: [adjective('高かろ', '高い', '未然形'), auxiliary('う')], hinshi: '形容詞', independent: true, form: '未然形', type: '形容詞' },
  { name: '形容詞仮定形', input: [adjective('高けれ', '高い', '仮定形'), particle('ば', '接続助詞')], hinshi: '形容詞', independent: true, form: '仮定形', type: '形容詞' },
  { name: '名詞', input: [noun('本')], hinshi: '名詞', independent: true },
  { name: '代名詞', input: [noun('私', '代名詞')], hinshi: '名詞', independent: true },
  { name: '形式名詞', input: [verb('読む', '読む', '五段・マ行', '基本形'), noun('こと', '非自立')], hinshi: '名詞', independent: true },
  { name: '副詞', input: [raw('ゆっくり', '副詞', { posDetail1: '一般' })], hinshi: '副詞', independent: true },
  { name: '連体詞', input: [raw('この', '連体詞'), noun('本')], hinshi: '連体詞', independent: true },
  { name: 'フィラーとしてのあの', input: [raw('あの', 'フィラー')], hinshi: '感動詞', independent: true },
  { name: '名詞を修飾するフィラーあの', input: [raw('あの', 'フィラー'), noun('本')], hinshi: '連体詞', independent: true },
  { name: '記号の前にあるあの', input: [raw('あの', 'フィラー'), raw('。', '記号')], hinshi: '感動詞', independent: true },
  { name: '連体詞タグでも記号の前にあるあの', input: [raw('あの', '連体詞'), raw('、', '記号')], hinshi: '感動詞', independent: true },
  { name: '数詞を修飾するあの', input: [raw('あの', 'フィラー'), raw('三', '名詞', { posDetail1: '数' }), noun('人')], hinshi: '連体詞', independent: true },
  { name: '接頭詞を修飾するあの', input: [raw('あの', 'フィラー'), raw('大', '接頭詞', { posDetail1: '名詞接続' }), noun('人')], hinshi: '連体詞', independent: true },
  { name: '形容詞を修飾するあの', input: [raw('あの', 'フィラー'), adjective('白い', '白い', '連体形'), noun('建物')], hinshi: '連体詞', independent: true },
  { name: '動詞連体形を修飾するあの', input: [raw('あの', 'フィラー'), verb('読む', '読む', '五段・マ行', '連体形'), noun('本')], hinshi: '連体詞', independent: true },
  { name: '助動詞連体形を修飾するあの', input: [raw('あの', 'フィラー'), auxiliary('たい', '特殊・タイ', '連体形'), noun('本')], hinshi: '連体詞', independent: true },
  { name: '文法的に不自然なあの（体言なし）', input: [raw('あの', 'フィラー'), raw('しかし', '接続詞')], hinshi: '感動詞', independent: true },
  { name: 'あのさ（フィラー＋終助詞）', input: [raw('あの', 'フィラー'), raw('さ', '助詞', { posDetail1: '終助詞' })], hinshi: '感動詞', independent: true },
  { name: 'あのさ！（フィラー＋終助詞＋記号）', input: [raw('あの', 'フィラー'), raw('さ', '名詞', { posDetail1: '接尾', posDetail2: '特殊' }), raw('！', '記号')], hinshi: '感動詞', independent: true },
  { name: '接続詞', input: [raw('しかし', '接続詞')], hinshi: '接続詞', independent: true },
  { name: '感動詞', input: [raw('こんにちは', '感動詞')], hinshi: '感動詞', independent: true },
  { name: '格助詞', input: [noun('本'), particle('を', '格助詞')], hinshi: '助詞', independent: false },
  { name: '係助詞', input: [noun('私'), particle('は', '係助詞')], hinshi: '助詞', independent: false },
  { name: '副助詞', input: [noun('私'), particle('だけ', '副助詞')], hinshi: '助詞', independent: false },
  { name: '接続助詞', input: [verb('読み', '読む', '五段・マ行', '連用形'), particle('ながら', '接続助詞')], hinshi: '助詞', independent: false },
  { name: '終助詞', input: [verb('読む', '読む', '五段・マ行', '基本形'), particle('よ', '終助詞')], hinshi: '助詞', independent: false },
  { name: '助動詞ます', input: [verb('読み', '読む', '五段・マ行', '連用形'), auxiliary('ます', '特殊・マス')], hinshi: '助動詞', independent: false, form: '終止形', type: '特殊・マス' },
  { name: '助動詞ました', input: [verb('読み', '読む', '五段・マ行', '連用形'), auxiliary('まし', '特殊・マス', '連用タ接続', 'ます'), auxiliary('た', '特殊・タ')], hinshi: '助動詞', independent: false, form: '終止形', type: '特殊・タ' },
  { name: '助動詞た', input: [verb('読ん', '読む', '五段・マ行', '連用タ接続'), auxiliary('た', '特殊・タ')], hinshi: '助動詞', independent: false, form: '終止形', type: '特殊・タ' },
  { name: '助動詞たい', input: [verb('読み', '読む', '五段・マ行', '連用形'), auxiliary('たい', '特殊・タイ')], hinshi: '助動詞', independent: false, form: '終止形', type: '特殊・タイ' },
  { name: '助動詞です', input: [noun('本'), auxiliary('です', '特殊・デス')], hinshi: '助動詞', independent: false, form: '終止形', type: '特殊・デス' },
  { name: '助動詞らしい', input: [noun('子ども'), auxiliary('らしい', '特殊・ラシイ')], hinshi: '助動詞', independent: false, form: '終止形', type: '特殊・ラシイ' },
  { name: '助動詞ぬ', input: [verb('読ま', '読む', '五段・マ行', '未然形'), auxiliary('ぬ', '特殊・ヌ')], hinshi: '助動詞', independent: false, form: '終止形', type: '特殊・ヌ' },
  { name: '助動詞べし', input: [verb('読む', '読む', '五段・マ行', '基本形'), auxiliary('べし', '文語・ベシ')], hinshi: '助動詞', independent: false, form: '終止形', type: '文語・ベシ' },
];

describe('ten school-grammar parts of speech and six conjugation bases', () => {
  it.each(cases)('$name', ({ input, hinshi, independent, form, type }) => {
    const result = parseModernMorphemes(morphemes(input));
    const tokens = result.bunsetsu.flatMap((b) => b.tango);
    const target = independent ? tokens.find((token) => token.hinshi === hinshi) : tokens.at(-1);
    expect(target).toMatchObject({ hinshi, isIndependent: independent });
    if (form) expect(target?.katsuyoukei).toBe(form);
    if (type) expect(target?.katsuyouType).toBe(type);
    if (input.some((item) => item.pos === 'フィラー')) {
      expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'MODERN_POS_UNSUPPORTED')).toBe(false);
    }
  });
});
