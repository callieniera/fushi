import { describe, expect, it } from 'vitest';
import { parseRoute } from '../src/router.js';

describe('application routing', () => {
  it('uses the sentence explorer as the root home page', () => {
    expect(parseRoute('')).toEqual({ name: 'sandbox' });
    expect(parseRoute('#')).toEqual({ name: 'sandbox' });
    expect(parseRoute('#/')).toEqual({ name: 'sandbox' });
    expect(parseRoute('#/sandbox')).toEqual({ name: 'sandbox' });
  });

  it('accepts the remaining direct explanation and about routes', () => {
    expect(parseRoute('#/analysis-scope')).toEqual({ name: 'analysis-scope' });
    expect(parseRoute('#analysis-scope')).toEqual({ name: 'analysis-scope' });
    expect(parseRoute('#/about')).toEqual({ name: 'about' });
  });

  it('does not expose lessons or practice routes', () => {
    for (const hash of ['#/lessons', '#/lessons/sentence-components', '#/drills']) {
      expect(parseRoute(hash)).toEqual({ name: 'not-found' });
    }
    expect(parseRoute('#/analysis-scope/extra')).toEqual({ name: 'not-found' });
  });
});
