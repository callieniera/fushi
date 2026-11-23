import { describe, expect, it, vi } from 'vitest';
import type { KuromojiEngine, KuromojiEngineOptions } from '@callieniera/fushi/kuromoji';
import type { ParseResult } from '@callieniera/fushi/core';
import { ModernSandbox } from '../src/lib/fushi-client.js';
import { DICTIONARY_CACHE_NAME, DICTIONARY_PATH } from '../src/dictionary-config.js';

function engine(): KuromojiEngine {
  return { parseModern: vi.fn(async (text: string): Promise<ParseResult> => ({ mode: 'modern', text, bunsetsu: [], diagnostics: [] })) };
}

describe('sandbox engine lifecycle', () => {
  it('reuses a resolved engine and a shared versioned dictionary configuration', async () => {
    const instance = engine();
    const factory = vi.fn(async (_options: KuromojiEngineOptions) => instance);
    const sandbox = new ModernSandbox(factory);
    await sandbox.parse('私は本を読む');
    await sandbox.parse('静かです');
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory.mock.calls[0]?.[0]).toMatchObject({ cacheName: DICTIONARY_CACHE_NAME });
    expect(factory.mock.calls[0]?.[0].dictUrl.endsWith(DICTIONARY_PATH)).toBe(true);
    expect(instance.parseModern).toHaveBeenCalledTimes(2);
    expect(sandbox.status).toBe('ready');
  });

  it('coalesces concurrent initialization and parses sequentially', async () => {
    let resolve: ((value: KuromojiEngine) => void) | undefined;
    const instance = engine();
    const factory = vi.fn((_options: KuromojiEngineOptions) => new Promise<KuromojiEngine>((done) => { resolve = done; }));
    const sandbox = new ModernSandbox(factory);
    const first = sandbox.initialize();
    const second = sandbox.initialize();
    expect(sandbox.status).toBe('loading');
    resolve?.(instance);
    expect(await first).toBe(instance);
    expect(await second).toBe(instance);
    expect(factory).toHaveBeenCalledTimes(1);
    const parsing = sandbox.parse('私は本を読む');
    await expect(sandbox.parse('本を読む')).rejects.toThrow('already in progress');
    await parsing;
  });

  it('clears rejected initialization so retry creates a fresh engine', async () => {
    const instance = engine();
    const factory = vi.fn(async (_options: KuromojiEngineOptions) => {
      if (factory.mock.calls.length === 1) throw new Error('dictionary unavailable');
      return instance;
    });
    const sandbox = new ModernSandbox(factory);
    await expect(sandbox.initialize()).rejects.toThrow('dictionary unavailable');
    expect(sandbox.status).toBe('error');
    expect(await sandbox.initialize()).toBe(instance);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('enforces the input limit', async () => {
    await expect(new ModernSandbox(async () => engine()).parse('あ'.repeat(1001))).rejects.toThrow('1,000');
  });
});
