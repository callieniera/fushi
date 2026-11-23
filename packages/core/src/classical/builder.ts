import type { ClassicalPassageInput, ParseResult } from '../types.js';
import { validateClassicalPassage } from './validate.js';

export function buildClassicalPassage(input: unknown): ParseResult {
  const result = validateClassicalPassage(input);
  if (!result.valid || !result.value) {
    throw new ClassicalPassageValidationError(result.diagnostics);
  }
  return result.value;
}

export class ClassicalPassageValidationError extends Error {
  readonly diagnostics: ParseResult['diagnostics'];

  constructor(diagnostics: ParseResult['diagnostics']) {
    super(`Invalid classical passage: ${diagnostics.map((issue) => issue.code).join(', ')}`);
    this.name = 'ClassicalPassageValidationError';
    this.diagnostics = diagnostics;
  }
}

export function defineClassicalPassage(input: ClassicalPassageInput): ClassicalPassageInput {
  return input;
}
