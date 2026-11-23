import { createKuromojiEngine, type ParseResult } from '@callieniera/fushi';

declare global {
  interface Window {
    fushiBrowserTest: {
      parseModern(text: string, cacheName: string): Promise<ParseResult>;
    };
  }
}

window.fushiBrowserTest = {
  async parseModern(text, cacheName) {
    const engine = await createKuromojiEngine({
      dictUrl: '/dictionaries/kuromoji/',
      cacheName,
    });
    return engine.parseModern(text);
  },
};
