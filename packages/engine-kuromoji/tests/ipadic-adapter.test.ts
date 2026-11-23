import { describe, expect, it } from 'vitest';
import type { IpadicFeatures } from 'kuromoji';
import { ipadicToRawMorphemes } from '../src/ipadic-adapter.js';

function token(overrides: Partial<IpadicFeatures> = {}): IpadicFeatures {
  return {
    word_id: 1,
    word_type: 'KNOWN',
    word_position: 1,
    surface_form: '食べ',
    pos: '動詞',
    pos_detail_1: '自立',
    pos_detail_2: '*',
    pos_detail_3: '*',
    conjugated_type: '一段',
    conjugated_form: '連用形',
    basic_form: '食べる',
    reading: 'タベ',
    pronunciation: 'タベ',
    ...overrides,
  };
}

describe('ipadicToRawMorphemes', () => {
  it('maps every RawMorpheme field without changing IPAdic values', () => {
    expect(ipadicToRawMorphemes([token()], '食べ')).toEqual([{
      surface: '食べ',
      reading: 'タベ',
      baseForm: '食べる',
      pos: '動詞',
      posDetail1: '自立',
      posDetail2: '*',
      posDetail3: '*',
      conjugationType: '一段',
      conjugatedForm: '連用形',
      start: 0,
      end: 2,
    }]);
  });

  it('omits optional unknown-token fields but preserves their other POS fields', () => {
    expect(ipadicToRawMorphemes([token({
      word_type: 'UNKNOWN', surface_form: '😀', pos: '記号', pos_detail_1: '一般',
      basic_form: '*', reading: undefined, pronunciation: undefined,
      conjugated_type: '*', conjugated_form: '*',
    })], '😀')).toEqual([{
      surface: '😀', baseForm: '*', pos: '記号', posDetail1: '一般', posDetail2: '*',
      posDetail3: '*', conjugationType: '*', conjugatedForm: '*', start: 0, end: 2,
    }]);
  });

  it('translates one-based code-point positions to UTF-16 offsets', () => {
    const text = '😀寿司を食べる';
    const tokens = [
      token({ surface_form: '😀', word_position: 1 }),
      token({ surface_form: '寿司', word_position: 2 }),
      token({ surface_form: 'を', word_position: 4 }),
      token({ surface_form: '食べる', word_position: 5 }),
    ];
    expect(ipadicToRawMorphemes(tokens, text).map(({ start, end }) => ({ start, end }))).toEqual([
      { start: 0, end: 2 }, { start: 2, end: 4 }, { start: 4, end: 5 }, { start: 5, end: 8 },
    ]);
  });

  it('preserves spaces and reconstructs offsets when word_position is unavailable', () => {
    const text = ' A 食べる';
    const tokens = [
      token({ surface_form: ' ', word_position: 1 }),
      token({ surface_form: 'A', word_position: 2 }),
      token({ surface_form: ' ', word_position: 3 }),
      token({ surface_form: '食べる', word_position: Number.NaN }),
    ];
    expect(ipadicToRawMorphemes(tokens, text).map((m) => [m.surface, m.start, m.end])).toEqual([
      [' ', 0, 1], ['A', 1, 2], [' ', 2, 3], ['食べる', 3, 6],
    ]);
  });

  it('rejects malformed token surfaces instead of producing unsafe offsets', () => {
    expect(() => ipadicToRawMorphemes([token({ surface_form: '' })], '食べ')).toThrow('has no surface form');
    expect(() => ipadicToRawMorphemes([token({ surface_form: '違う' })], '食べ')).toThrow('cannot be located');
  });
});
