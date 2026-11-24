import type { RawMorpheme } from '../../src/types.js';

export type RawSpec = Omit<RawMorpheme, 'start' | 'end'>;

export function raw(surface: string, pos: string, options: Partial<RawSpec> = {}): RawSpec {
  return { surface, pos, ...options };
}

export function morphemes(specs: readonly RawSpec[]): RawMorpheme[] {
  let offset = 0;
  return specs.map((spec) => {
    const start = offset;
    offset += spec.surface.length;
    return { ...spec, start, end: offset };
  });
}

export const noun = (surface: string, detail = '一般'): RawSpec => raw(surface, '名詞', { posDetail1: detail });
export const particle = (surface: string, detail: string, detail2?: string): RawSpec =>
  raw(surface, '助詞', { posDetail1: detail, ...(detail2 ? { posDetail2: detail2 } : {}) });
export const auxiliary = (
  surface: string,
  type = '不変化型',
  form = '基本形',
  baseForm = surface,
): RawSpec => raw(surface, '助動詞', { conjugationType: type, conjugatedForm: form, baseForm });
export const verb = (
  surface: string,
  baseForm: string,
  type: string,
  form: string,
  detail = '自立',
  reading?: string,
): RawSpec => raw(surface, '動詞', {
  posDetail1: detail, baseForm, conjugationType: type, conjugatedForm: form, ...(reading ? { reading } : {}),
});
export const adjective = (
  surface: string,
  baseForm: string,
  form = '基本形',
  detail = '自立',
): RawSpec => raw(surface, '形容詞', {
  posDetail1: detail,
  baseForm,
  conjugationType: '形容詞・イ段',
  conjugatedForm: form,
});
export const naStem = (surface: string): RawSpec => ({ ...noun(surface, '形容動詞語幹'), baseForm: surface });
export const da = (surface = 'だ', form = '基本形'): RawSpec => auxiliary(surface, '特殊・ダ', form, 'だ');
export const suffix = (surface: string, detail2 = '一般'): RawSpec =>
  raw(surface, '名詞', { posDetail1: '接尾', posDetail2: detail2 });
export const prefix = (surface: string): RawSpec => raw(surface, '接頭詞', { posDetail1: '名詞接続' });
export const symbol = (surface: string): RawSpec => raw(surface, '記号');
