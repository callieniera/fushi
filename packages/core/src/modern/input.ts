import { diagnostic } from '../diagnostics.js';
import type { Diagnostic, RawMorpheme } from '../types.js';
import type { IndexedMorpheme, InputStageResult } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '*' ? value : undefined;
}

function validOffset(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

/**
 * IPAdic/kuromoji fields map directly to RawMorpheme: surface_form -> surface,
 * reading -> reading, basic_form -> baseForm, pos/pos_detail_[1-3] -> the
 * corresponding fields, conjugated_type/conjugated_form -> conjugationType/
 * conjugatedForm. The engine converts kuromoji's one-based code-point position
 * to a zero-based UTF-16 start offset; end is start + surface.length. This
 * stage accepts explicitly supplied offsets or reconstructs contiguous offsets.
 */
export function validateModernInput(input: readonly RawMorpheme[]): InputStageResult {
  const diagnostics: Diagnostic[] = [];
  const morphemes: IndexedMorpheme[] = [];
  let reconstructedOffset = 0;
  let previousEnd = 0;

  if (!Array.isArray(input)) {
    return {
      morphemes,
      text: '',
      diagnostics: [
        diagnostic('MODERN_INPUT_NOT_ARRAY', 'Modern input must be an array of raw morphemes.', 'error'),
      ],
    };
  }

  input.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      diagnostics.push(
        diagnostic('MODERN_INPUT_INVALID_MORPHEME', 'A malformed morpheme was skipped.', 'error', {
          morphemeIds: [index],
        }),
      );
      return;
    }

    const surface = typeof candidate.surface === 'string' ? candidate.surface : '';
    const suppliedStart = candidate.start;
    const suppliedEnd = candidate.end;
    const hasValidOffsets =
      validOffset(suppliedStart) && validOffset(suppliedEnd) && suppliedEnd >= suppliedStart;
    const start = hasValidOffsets ? suppliedStart : reconstructedOffset;
    const end = hasValidOffsets ? suppliedEnd : start + surface.length;

    if (!surface) {
      diagnostics.push(
        diagnostic('MODERN_INPUT_EMPTY_SURFACE', 'A morpheme without surface text was skipped.', 'error', {
          ...(hasValidOffsets ? { start, end } : {}),
          morphemeIds: [index],
        }),
      );
      return;
    }

    if (!hasValidOffsets) {
      diagnostics.push(
        diagnostic(
          'MODERN_INPUT_OFFSET_RECONSTRUCTED',
          'Missing or invalid source offsets were reconstructed deterministically.',
          'warning',
          { start, end, morphemeIds: [index] },
        ),
      );
    } else if (end !== start + surface.length) {
      diagnostics.push(
        diagnostic(
          'MODERN_INPUT_OFFSET_LENGTH_MISMATCH',
          'The source span length differs from the morpheme surface length.',
          'warning',
          { start, end, morphemeIds: [index] },
        ),
      );
    }

    if (morphemes.length > 0 && start < previousEnd) {
      diagnostics.push(
        diagnostic(
          'MODERN_INPUT_OFFSET_OVERLAP',
          'Overlapping source offsets were retained in input order.',
          'warning',
          { start, end, morphemeIds: [index] },
        ),
      );
    }

    const raw: RawMorpheme = {
      surface,
      pos: typeof candidate.pos === 'string' && candidate.pos !== '' ? candidate.pos : '未知',
      start,
      end,
    };
    const reading = optionalString(candidate.reading);
    const baseForm = optionalString(candidate.baseForm);
    const posDetail1 = optionalString(candidate.posDetail1);
    const posDetail2 = optionalString(candidate.posDetail2);
    const posDetail3 = optionalString(candidate.posDetail3);
    const conjugationType = optionalString(candidate.conjugationType);
    const conjugatedForm = optionalString(candidate.conjugatedForm);
    if (reading !== undefined) raw.reading = reading;
    if (baseForm !== undefined) raw.baseForm = baseForm;
    if (posDetail1 !== undefined) raw.posDetail1 = posDetail1;
    if (posDetail2 !== undefined) raw.posDetail2 = posDetail2;
    if (posDetail3 !== undefined) raw.posDetail3 = posDetail3;
    if (conjugationType !== undefined) raw.conjugationType = conjugationType;
    if (conjugatedForm !== undefined) raw.conjugatedForm = conjugatedForm;
    if (raw.pos === '未知') {
      diagnostics.push(
        diagnostic('MODERN_INPUT_MISSING_POS', 'A missing part of speech was treated as unknown.', 'warning', {
          start,
          end,
          morphemeIds: [index],
        }),
      );
    }

    morphemes.push({ raw, index });
    reconstructedOffset = end;
    previousEnd = end;
  });

  return { morphemes, text: morphemes.map(({ raw }) => raw.surface).join(''), diagnostics };
}
