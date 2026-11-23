import type { Diagnostic, Tango } from '../types.js';
import type { NormalizedToken } from './types.js';
export interface RemapResult {
    tango: Tango[];
    diagnostics: Diagnostic[];
}
export declare function remapModernTokens(tokens: readonly NormalizedToken[]): RemapResult;
