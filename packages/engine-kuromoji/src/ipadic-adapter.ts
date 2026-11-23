import type { RawMorpheme } from '@lib/core';
import type { IpadicFeatures } from 'kuromoji';

/**
 * kuromoji word_position is one-based and counts Unicode code points, whereas
 * RawMorpheme offsets are zero-based JavaScript UTF-16 string offsets.
 */
export function ipadicToRawMorphemes(tokens: readonly IpadicFeatures[], text: string): RawMorpheme[] {
  const morphemes: RawMorpheme[] = [];
  let previousEnd = 0;

  for (const [index, token] of tokens.entries()) {
    const surface = token.surface_form;
    if (typeof surface !== 'string' || !surface) {
      throw new Error(`Kuromoji token ${index} has no surface form.`);
    }

    let start = wordPositionToOffset(token.word_position, text);
    if (start === undefined || text.slice(start, start + surface.length) !== surface || start < previousEnd) {
      start = text.indexOf(surface, previousEnd);
    }
    if (start < 0) {
      throw new Error(`Kuromoji token ${index} (${JSON.stringify(surface)}) cannot be located in the source text.`);
    }

    const end = start + surface.length;
    const morpheme: RawMorpheme = {
      surface,
      pos: requiredString(token.pos, index, 'pos'),
      start,
      end,
    };
    setOptional(morpheme, 'reading', token.reading);
    setOptional(morpheme, 'baseForm', token.basic_form);
    setOptional(morpheme, 'posDetail1', token.pos_detail_1);
    setOptional(morpheme, 'posDetail2', token.pos_detail_2);
    setOptional(morpheme, 'posDetail3', token.pos_detail_3);
    setOptional(morpheme, 'conjugationType', token.conjugated_type);
    setOptional(morpheme, 'conjugatedForm', token.conjugated_form);
    morphemes.push(morpheme);
    previousEnd = end;
  }

  return morphemes;
}

function wordPositionToOffset(position: number, text: string): number | undefined {
  if (!Number.isInteger(position) || position < 1) return undefined;

  let codePointPosition = 1;
  let offset = 0;
  while (offset < text.length && codePointPosition < position) {
    offset += String.fromCodePoint(text.codePointAt(offset)!).length;
    codePointPosition += 1;
  }
  return codePointPosition === position ? offset : undefined;
}

function requiredString(value: string | undefined, tokenIndex: number, field: string): string {
  if (typeof value !== 'string' || !value) {
    throw new Error(`Kuromoji token ${tokenIndex} has no ${field}.`);
  }
  return value;
}

type OptionalField = 'reading' | 'baseForm' | 'posDetail1' | 'posDetail2' | 'posDetail3' | 'conjugationType' | 'conjugatedForm';

function setOptional(morpheme: RawMorpheme, field: OptionalField, value: string | undefined): void {
  if (value !== undefined && value !== '') morpheme[field] = value;
}
