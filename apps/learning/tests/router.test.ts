import { describe, expect, it } from 'vitest';
import { parseRoute } from '../src/router.js';

describe('analysis-scope routing', () => {
  it('accepts only the direct explanation-page route', () => {
    expect(parseRoute('#/analysis-scope')).toEqual({ name: 'analysis-scope' });
    expect(parseRoute('#analysis-scope')).toEqual({ name: 'analysis-scope' });
    expect(parseRoute('#/analysis-scope/extra')).toEqual({ name: 'not-found' });
  });
});
