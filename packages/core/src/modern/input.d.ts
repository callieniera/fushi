import type { RawMorpheme } from '../types.js';
import type { InputStageResult } from './types.js';
/**
 * IPAdic/kuromoji fields map directly to RawMorpheme: surface_form -> surface,
 * reading -> reading, basic_form -> baseForm, pos/pos_detail_[1-3] -> the
 * corresponding fields, conjugated_type/conjugated_form -> conjugationType/
 * conjugatedForm. The engine converts kuromoji's one-based code-point position
 * to a zero-based UTF-16 start offset; end is start + surface.length. This
 * stage accepts explicitly supplied offsets or reconstructs contiguous offsets.
 */
export declare function validateModernInput(input: readonly RawMorpheme[]): InputStageResult;
