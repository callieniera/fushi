import { describe, expect, it } from 'vitest';
import { compareBoundaries } from '../src/components/boundary-exercise.js';
import { nextExerciseIndex } from '../src/components/identification-drill.js';
import { TreeNavigator } from '../src/components/decision-tree.js';
import curriculum from '../src/content/curriculum.json' with { type: 'json' };
import { splitTextParts } from '../src/lib/text.js';
import { nextSentenceIndex, SentencePool } from '../src/lib/sentence-pool.js';

 describe('exercise logic', () => {
  it('compares missing and extra boundaries and accepts alternatives', () => {
    expect(compareBoundaries([2, 4], [[2, 4]])).toEqual({ correct: true, missing: 0, extra: 0 });
    expect(compareBoundaries([2], [[2, 4]])).toEqual({ correct: false, missing: 1, extra: 0 });
    expect(compareBoundaries([1, 2, 4], [[2, 4]])).toEqual({ correct: false, missing: 0, extra: 1 });
    expect(compareBoundaries([3, 5], [[2, 4], [3, 5]]).correct).toBe(true);
  });

  it('keeps retry selection deterministic', () => {
    expect(nextExerciseIndex(1, 4, true)).toBe(1);
    expect(nextExerciseIndex(1, 4, false)).toBe(2);
    expect(nextExerciseIndex(3, 4, false)).toBe(0);
  });

  it('selects random sentences without immediate repeats and handles small pools', () => {
    expect(nextSentenceIndex(0)).toBe(-1);
    expect(nextSentenceIndex(1, 0, () => 0.9)).toBe(0);
    expect(nextSentenceIndex(3, 1, () => 0)).toBe(0);
    expect(nextSentenceIndex(3, 1, () => 0.999)).toBe(2);
    const pool = new SentencePool(() => 0);
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(pool.choose(items)?.id).toBe('a');
    expect(pool.choose(items)?.id).toBe('b');
    expect(pool.choose(items)?.id).toBe('a');
  });

  it('navigates only valid branches and returns through history', () => {
    const tree = new TreeNavigator(curriculum.decisionTree);
    expect(tree.choose('missing')).toBe(false);
    expect(tree.choose('dependent')).toBe(true);
    expect(tree.choose('particle')).toBe(true);
    expect(curriculum.decisionTree.nodes.find((node) => node.id === tree.currentId)?.answer).toBe('助詞');
    expect(tree.back()).toBe(true);
    expect(tree.currentId).toBe('dependent');
  });

});
