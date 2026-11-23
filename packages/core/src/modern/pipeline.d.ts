import type { ParseResult, RawMorpheme } from '../types.js';
/** Transform IPAdic-shaped morphemes into best-effort modern school grammar. */
export declare function parseModernMorphemes(morphemes: RawMorpheme[]): ParseResult;
