export const PROGRESS_VERSION = 1;
export const PROGRESS_KEY = 'fushi-learning-progress-v1';
import type { Language } from './i18n.js';

export interface DrillAttempt {
  exerciseId: string;
  correct: boolean;
  at: string;
}

export interface Progress {
  version: typeof PROGRESS_VERSION;
  completedLessons: string[];
  completedExercises: string[];
  attempts: DrillAttempt[];
  preferences: {
    jfl: boolean;
    language: Language;
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_PROGRESS: Progress = {
  version: PROGRESS_VERSION,
  completedLessons: [],
  completedExercises: [],
  attempts: [],
  preferences: { jfl: false, language: 'en' },
};

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : [];
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return structuredClone(DEFAULT_PROGRESS);
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('not an object');
    const candidate = value as Record<string, unknown>;
    if (candidate.version !== PROGRESS_VERSION) return structuredClone(DEFAULT_PROGRESS);
    const preferences = typeof candidate.preferences === 'object' && candidate.preferences !== null
      ? candidate.preferences as Record<string, unknown>
      : {};
    const attempts = Array.isArray(candidate.attempts) ? candidate.attempts.flatMap((item) => {
      if (typeof item !== 'object' || item === null) return [];
      const attempt = item as Record<string, unknown>;
      return typeof attempt.exerciseId === 'string' && typeof attempt.correct === 'boolean' && typeof attempt.at === 'string' && !Number.isNaN(Date.parse(attempt.at))
        ? [{ exerciseId: attempt.exerciseId, correct: attempt.correct, at: attempt.at }]
        : [];
    }).slice(-500) : [];
    return {
      version: PROGRESS_VERSION,
      completedLessons: stringArray(candidate.completedLessons),
      completedExercises: stringArray(candidate.completedExercises),
      attempts,
      preferences: {
        jfl: preferences.jfl === true,
        language: preferences.language === 'ja' ? 'ja' : 'en',
      },
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export class ProgressStore {
  private state: Progress;
  readonly persistent: boolean;

  constructor(private readonly storage?: StorageLike) {
    this.persistent = storage !== undefined;
    let raw: string | null = null;
    try { raw = storage?.getItem(PROGRESS_KEY) ?? null; } catch { /* In-memory progress remains available. */ }
    this.state = parseProgress(raw);
  }

  get value(): Readonly<Progress> { return this.state; }

  completeLesson(id: string): void {
    this.state.completedLessons = [...new Set([...this.state.completedLessons, id])];
    this.save();
  }

  completeExercise(id: string): void {
    this.state.completedExercises = [...new Set([...this.state.completedExercises, id])];
    this.save();
  }

  recordAttempt(exerciseId: string, correct: boolean, at = new Date()): void {
    this.state.attempts = [...this.state.attempts, { exerciseId, correct, at: at.toISOString() }].slice(-500);
    this.save();
  }

  setPreference<K extends keyof Progress['preferences']>(name: K, value: Progress['preferences'][K]): void {
    this.state.preferences = { ...this.state.preferences, [name]: value };
    this.save();
  }

  reset(): void {
    this.state = structuredClone(DEFAULT_PROGRESS);
    try { this.storage?.removeItem(PROGRESS_KEY); } catch { /* Storage is optional. */ }
  }

  private save(): void {
    try { this.storage?.setItem(PROGRESS_KEY, JSON.stringify(this.state)); } catch { /* Storage is optional. */ }
  }
}

export function browserProgress(): ProgressStore {
  try {
    const storage = globalThis.localStorage;
    return new ProgressStore(storage);
  } catch {
    return new ProgressStore();
  }
}
