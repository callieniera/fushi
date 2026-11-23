import { describe, expect, it } from 'vitest';
import { splitTextParts } from '../src/lib/text.js';

describe('source-offset text segmentation', () => {
  it('retains UTF-16 source offsets for surrogate pairs', () => {
    expect(splitTextParts('𠮷')).toEqual([{ start: 0, end: 2, text: '𠮷' }]);
    expect(splitTextParts('A𠮷').at(-1)).toEqual({ start: 1, end: 3, text: '𠮷' });
  });
});
