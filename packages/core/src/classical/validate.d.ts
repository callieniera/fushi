import type { Diagnostic, ParseResult } from '../types.js';
export interface ClassicalValidationResult {
    valid: boolean;
    diagnostics: Diagnostic[];
    value?: ParseResult;
}
export declare function validateClassicalPassage(input: unknown): ClassicalValidationResult;
