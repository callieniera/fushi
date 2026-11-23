import type { ClassicalPassageInput, ParseResult } from '../types.js';
export declare function buildClassicalPassage(input: unknown): ParseResult;
export declare class ClassicalPassageValidationError extends Error {
    readonly diagnostics: ParseResult['diagnostics'];
    constructor(diagnostics: ParseResult['diagnostics']);
}
export declare function defineClassicalPassage(input: ClassicalPassageInput): ClassicalPassageInput;
//# sourceMappingURL=builder.d.ts.map