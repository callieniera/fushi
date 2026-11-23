import { describe, expect, it } from 'vitest';
import { DEFAULT_PROGRESS, parseProgress, PROGRESS_KEY, ProgressStore, type StorageLike } from '../src/storage.js';

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

describe('versioned local progress', () => {
  it('persists completion, attempts, and preferences', () => {
    const storage = new MemoryStorage();
    const progress = new ProgressStore(storage);
    progress.completeLesson('bunsetsu-basics');
    progress.recordAttempt('adjective-identification', true, new Date('2026-01-01T00:00:00Z'));
    progress.setPreference('jfl', true);
    progress.setPreference('language', 'ja');
    const restored = new ProgressStore(storage);
    expect(restored.value.completedLessons).toEqual(['bunsetsu-basics']);
    expect(restored.value.attempts[0]).toMatchObject({ correct: true, at: '2026-01-01T00:00:00.000Z' });
    expect(restored.value.preferences.jfl).toBe(true);
    expect(restored.value.preferences.language).toBe('ja');
  });

  it('recovers from corrupt and unsupported storage values', () => {
    expect(parseProgress('{broken')).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress(JSON.stringify({ version: 999, completedLessons: ['fake'] }))).toEqual(DEFAULT_PROGRESS);
    expect(parseProgress(JSON.stringify({ version: 1, completedLessons: [1, 'valid'], attempts: [{ bad: true }] }))).toMatchObject({ completedLessons: ['valid'], attempts: [] });
    expect(parseProgress(JSON.stringify({ version: 1, preferences: { language: 'invalid', classicalDetails: true } })).preferences).toEqual({ language: 'en', jfl: false });
    const denied = new ProgressStore({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } });
    denied.completeLesson('bunsetsu-basics');
    expect(denied.value.completedLessons).toEqual(['bunsetsu-basics']);
  });

  it('resets persisted progress', () => {
    const storage = new MemoryStorage();
    const progress = new ProgressStore(storage);
    progress.completeLesson('bunsetsu-basics');
    progress.setPreference('language', 'ja');
    progress.reset();
    expect(storage.getItem(PROGRESS_KEY)).toBeNull();
    expect(progress.value).toEqual(DEFAULT_PROGRESS);
  });
});
