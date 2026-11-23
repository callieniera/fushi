import { validateClassicalPassage } from './validate.js';
export function buildClassicalPassage(input) {
    const result = validateClassicalPassage(input);
    if (!result.valid || !result.value) {
        throw new ClassicalPassageValidationError(result.diagnostics);
    }
    return result.value;
}
export class ClassicalPassageValidationError extends Error {
    diagnostics;
    constructor(diagnostics) {
        super(`Invalid classical passage: ${diagnostics.map((issue) => issue.code).join(', ')}`);
        this.name = 'ClassicalPassageValidationError';
        this.diagnostics = diagnostics;
    }
}
export function defineClassicalPassage(input) {
    return input;
}
