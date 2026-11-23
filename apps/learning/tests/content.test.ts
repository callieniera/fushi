import { describe, expect, it } from 'vitest';
import type { Curriculum, SplitExercise } from '../src/content/schema.js';
import curriculum from '../src/content/curriculum.json' with { type: 'json' };
import modern from '../src/content/passages/modern.json' with { type: 'json' };
import practice from '../src/content/passages/practice.json' with { type: 'json' };
import { loadCurriculum } from '../src/content/load-content.js';
import { boundaryAnswers } from '../src/components/boundary-exercise.js';

function clone<T>(value: T): T { return structuredClone(value); }
const passages = [...modern, ...practice];

describe('curriculum validation', () => {
  it('validates modern lessons and the expanded bilingual sentence pool', () => {
    const content = loadCurriculum();
    expect(content.lessons).toHaveLength(6);
    expect(content.passages).toHaveLength(16);
    expect(content.passages.every((passage) => passage.result.mode === 'modern')).toBe(true);
    expect(content.lessons.every((lesson) => lesson.title.ja && lesson.title.en && lesson.objectives.every((item) => item.ja && item.en))).toBe(true);
    expect(content.decisionTree.nodes.filter((node) => node.answer)).toHaveLength(10);
  });

  it('derives both split-stage answers from every selected passage', () => {
    const content = loadCurriculum();
    const exercises = content.exercises.filter((exercise): exercise is SplitExercise => exercise.kind === 'split');
    for (const exercise of exercises) {
      expect(exercise.passageIds).toHaveLength(13);
      for (const id of exercise.passageIds) {
        const passage = content.passages.find((item) => item.id === id)!;
        const answers = boundaryAnswers(exercise, passage)[0]!;
        expect(answers.at(-1)).toBe(passage.result.text.length);
        expect(answers).toEqual([...answers].sort((a, b) => a - b));
        expect(new Set(answers).size).toBe(answers.length);
        expect(passage.splitExplanations?.[exercise.stage].ja).toContain('｜');
      }
    }
  });

  it('rejects a source offset that does not match the token surface', () => {
    const changed = clone(modern);
    changed[0]!.result.bunsetsu[0]!.tango[0]!.start = 1;
    expect(() => loadCurriculum(curriculum, changed)).toThrow(/Tango spans|Surface text/);
  });

  it('rejects a dangling split-pool passage and missing localized explanation', () => {
    const changed = clone(curriculum);
    const exercise = (changed as unknown as Curriculum).exercises.find((item) => item.id === 'split-tango');
    if (exercise?.kind !== 'split') throw new Error('missing split exercise');
    exercise.passageIds[1] = 'missing';
    expect(() => loadCurriculum(changed, passages)).toThrow(/Unknown split passage: missing/);
    const removed = clone(practice);
    delete (removed[0] as { splitExplanations?: unknown }).splitExplanations;
    expect(() => loadCurriculum(curriculum, [...modern, ...removed])).toThrow(/Missing tango explanation for practice-01/);
  });

  it('rejects a dangling decision-tree target', () => {
    const changed = clone(curriculum);
    changed.decisionTree.nodes[0]!.branches[0]!.targetId = 'missing';
    expect(() => loadCurriculum(changed, passages)).toThrow(/Unknown branch target: missing/);
  });

  it('reports malformed passage shapes instead of throwing an incidental type error', () => {
    const changed = clone(modern);
    (changed[0]!.result as { text: unknown }).text = null;
    expect(() => loadCurriculum(curriculum, changed)).toThrow(/Source text must be nonempty/);
    const tree = clone(curriculum);
    (tree.decisionTree.nodes as unknown[])[0] = null;
    expect(() => loadCurriculum(tree, passages)).toThrow(/Each node requires an ID, question, and branches array/);
  });

  it('rejects non-modern passages and incomplete localization', () => {
    const changed = clone(modern);
    (changed[0]!.result as { mode: string }).mode = 'classical';
    expect(() => loadCurriculum(curriculum, changed)).toThrow(/Only modern grammar mode is supported/);
    const incomplete = clone(curriculum);
    (incomplete.lessons[0]!.title as { ja?: string }).ja = '';
    expect(() => loadCurriculum(incomplete, passages)).toThrow(/Localized title is missing/);
  });
});
