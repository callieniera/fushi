import type { IndexedMorpheme, NormalizationResult, NormalizedToken } from './types.js';
/**
 * Ordered reconstruction passes: (1) 形容動詞語幹 + one permitted ending,
 * (2) そう + だ-ending, (3) prefixes, (4) suffixes. A morpheme is consumed by
 * at most one pass, so overlapping rules cannot depend on input array order.
 */
export declare function normalizeModernMorphemes(morphemes: readonly IndexedMorpheme[]): NormalizationResult;
export declare function rawMorphemesOf(token: NormalizedToken): import("../types.js").RawMorpheme[];
export declare function morphemeIdsOf(token: NormalizedToken): number[];
