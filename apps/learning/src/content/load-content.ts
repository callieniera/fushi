import type { Hinshi } from '@callieniera/fushi/core';
import rawCurriculum from './curriculum.json' with { type: 'json' };
import rawModern from './passages/modern.json' with { type: 'json' };
import rawPractice from './passages/practice.json' with { type: 'json' };
import type {
  AnnotatedPassage,
  ContentIssue,
  Curriculum,
  DecisionTree,
  Exercise,
  Lesson,
} from './schema.js';
import type { Bunsetsu, Tango } from '@callieniera/fushi/core';

export const COMPONENT_LABELS = ['主語', '述語', '修飾語', '接続語', '独立語'] as const;
export const HINSHI_LABELS: readonly Hinshi[] = [
  '動詞', '形容詞', '形容動詞', '名詞', '副詞', '連体詞', '接続詞', '感動詞', '助動詞', '助詞',
];

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function string(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function span(value: unknown): value is Record<string, unknown> & { start: number; end: number } {
  return object(value)
    && typeof value.start === 'number' && Number.isSafeInteger(value.start) && value.start >= 0
    && typeof value.end === 'number' && Number.isSafeInteger(value.end) && value.end > value.start;
}

function localized(value: unknown): boolean {
  return string(value) || (object(value) && string(value.en) && string(value.ja));
}

function localizedArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(localized);
}

function unique(ids: string[], path: string, issues: ContentIssue[]): void {
  const seen = new Set<string>();
  ids.forEach((id, index) => {
    if (!id) issues.push({ path: `${path}[${index}]`, message: 'ID must be nonempty.' });
    if (seen.has(id)) issues.push({ path: `${path}[${index}]`, message: `Duplicate ID: ${id}.` });
    seen.add(id);
  });
}

function validatePassage(value: unknown, index: number, issues: ContentIssue[]): value is AnnotatedPassage {
  const path = `passages[${index}]`;
  if (!object(value) || !object(value.result) || !object(value.source)) {
    issues.push({ path, message: 'Passage, result, and source must be objects.' });
    return false;
  }
  if (!string(value.id)) issues.push({ path: `${path}.id`, message: 'Passage ID is required.' });
  for (const field of ['title', 'author', 'source', 'license']) {
    if (!string(value.source[field])) issues.push({ path: `${path}.source.${field}`, message: 'Source provenance is required.' });
  }
  const result = value.result;
  if (result.mode !== 'modern') issues.push({ path: `${path}.result.mode`, message: 'Only modern grammar mode is supported.' });
  if (typeof result.text !== 'string' || !result.text) issues.push({ path: `${path}.result.text`, message: 'Source text must be nonempty.' });
  if (!Array.isArray(result.bunsetsu) || result.bunsetsu.length === 0) {
    issues.push({ path: `${path}.result.bunsetsu`, message: 'At least one bunsetsu is required.' });
    return false;
  }
  if (!Array.isArray(result.diagnostics)) issues.push({ path: `${path}.result.diagnostics`, message: 'Diagnostics must be an array.' });
  if (typeof result.text !== 'string' || !result.text || result.mode !== 'modern') return false;

  const ids: string[] = [];
  let expectedStart = 0;
  for (const [bunsetsuIndex, candidate] of result.bunsetsu.entries()) {
    const bunsetsuPath = `${path}.result.bunsetsu[${bunsetsuIndex}]`;
    if (!object(candidate) || !string(candidate.id) || !span(candidate) || !Array.isArray(candidate.tango) || candidate.tango.length === 0) {
      issues.push({ path: bunsetsuPath, message: 'Bunsetsu requires an ID, valid span, and nonempty tango.' });
      continue;
    }
    ids.push(candidate.id);
    if (candidate.start !== expectedStart || candidate.end > (result.text as string).length) {
      issues.push({ path: bunsetsuPath, message: 'Bunsetsu spans must be contiguous and within source text.' });
    }
    let expectedTangoStart = candidate.start;
    for (const [tangoIndex, token] of candidate.tango.entries()) {
      const tangoPath = `${bunsetsuPath}.tango[${tangoIndex}]`;
      if (!object(token) || !string(token.id) || !span(token)) {
        issues.push({ path: tangoPath, message: 'Tango requires an ID and valid span.' });
        continue;
      }
      ids.push(token.id);
      if (!string(token.surface) || !HINSHI_LABELS.includes(token.hinshi as Hinshi) || typeof token.isIndependent !== 'boolean') {
        issues.push({ path: tangoPath, message: 'Tango surface, supported POS, and independence are required.' });
      }
      if (token.start !== expectedTangoStart || token.start < candidate.start || token.end > candidate.end) {
        issues.push({ path: tangoPath, message: 'Tango spans must be contiguous within their bunsetsu.' });
      }
      if (typeof token.surface === 'string' && (result.text as string).slice(token.start, token.end) !== token.surface) {
        issues.push({ path: tangoPath, message: 'Surface text does not match the source span.' });
      }
      if (token.isIndependent === (token.hinshi === '助詞' || token.hinshi === '助動詞')) {
        issues.push({ path: tangoPath, message: 'Independent/supporting classification is inconsistent.' });
      }
      expectedTangoStart = token.end;
    }
    expectedStart = candidate.end;
  }
  if (expectedStart !== (result.text as string).length) issues.push({ path, message: 'Bunsetsu must cover the entire source text.' });
  unique(ids, `${path}.result.ids`, issues);
  if (value.title !== undefined && !localized(value.title)) issues.push({ path: `${path}.title`, message: 'Passage title must provide English and Japanese.' });
  if (value.splitExplanations !== undefined && (!object(value.splitExplanations) || !localized(value.splitExplanations.bunsetsu) || !localized(value.splitExplanations.tango))) {
    issues.push({ path: `${path}.splitExplanations`, message: 'Both localized split explanations are required.' });
  }
  return true;
}

function validateLesson(value: unknown, index: number, issues: ContentIssue[]): value is Lesson {
  const path = `lessons[${index}]`;
  if (!object(value)) {
    issues.push({ path, message: 'Lesson must be an object.' });
    return false;
  }
  if (!string(value.id)) issues.push({ path: `${path}.id`, message: 'Required ID is missing.' });
  if (!localized(value.title)) issues.push({ path: `${path}.title`, message: 'Localized title is missing.' });
  if (value.mode !== 'modern') issues.push({ path: `${path}.mode`, message: 'Only modern lessons are supported.' });
  if (typeof value.order !== 'number' || !Number.isSafeInteger(value.order) || value.order < 1) issues.push({ path: `${path}.order`, message: 'Order must be a positive integer.' });
  for (const field of ['objectives', 'explanation']) {
    if (!localizedArray(value[field])) issues.push({ path: `${path}.${field}`, message: 'Expected localized text for every entry.' });
  }
  for (const field of ['passageIds', 'exerciseIds']) {
    if (!Array.isArray(value[field]) || !(value[field] as unknown[]).every(string)) issues.push({ path: `${path}.${field}`, message: 'Expected an array of nonempty strings.' });
  }
  if (value.jflNotes !== undefined && !localizedArray(value.jflNotes)) issues.push({ path: `${path}.jflNotes`, message: 'JFL notes must be localized.' });
  if (value.reviewExerciseIds !== undefined && (!Array.isArray(value.reviewExerciseIds) || !value.reviewExerciseIds.every(string))) {
    issues.push({ path: `${path}.reviewExerciseIds`, message: 'Review exercises must be an array of IDs.' });
  }
  return true;
}

function findTango(passage: AnnotatedPassage, id: string): Tango | undefined {
  return passage.result.bunsetsu.flatMap((item) => item.tango).find((item) => item.id === id);
}

function validateExercise(value: unknown, index: number, passages: Map<string, AnnotatedPassage>, lessonIds: Set<string>, issues: ContentIssue[]): value is Exercise {
  const path = `exercises[${index}]`;
  if (!object(value) || !string(value.id) || !string(value.lessonId) || !string(value.passageId) || !localized(value.title) || !localized(value.prompt)) {
    issues.push({ path, message: 'Exercise requires an ID, lesson, passage, and localized title and prompt.' });
    return false;
  }
  if (!lessonIds.has(value.lessonId)) issues.push({ path: `${path}.lessonId`, message: 'Unknown lesson.' });
  const passage = passages.get(value.passageId);
  if (!passage) {
    issues.push({ path: `${path}.passageId`, message: 'Unknown passage.' });
    return false;
  }
  if (value.kind === 'split') {
    if (value.stage !== 'bunsetsu' && value.stage !== 'tango') {
      issues.push({ path: `${path}.stage`, message: 'Invalid split stage.' });
      return true;
    }
    if (!Array.isArray(value.passageIds) || value.passageIds.length === 0 || !value.passageIds.every(string)) {
      issues.push({ path: `${path}.passageIds`, message: 'Split exercises require a nonempty passage pool.' });
      return true;
    }
    for (const id of value.passageIds) {
      const candidate = passages.get(id);
      if (!candidate) issues.push({ path: `${path}.passageIds`, message: `Unknown split passage: ${id}.` });
      else if (!candidate.splitExplanations?.[value.stage]) issues.push({ path: `${path}.passageIds`, message: `Missing ${value.stage} explanation for ${id}.` });
    }
    return true;
  }
  if (value.kind === 'identification') {
    const token = typeof value.targetTangoId === 'string' ? findTango(passage, value.targetTangoId) : undefined;
    if (!token) issues.push({ path: `${path}.targetTangoId`, message: 'Unknown target token.' });
    if (!Array.isArray(value.choices) || !value.choices.every(string) || !HINSHI_LABELS.includes(value.answer as Hinshi) || !value.choices.includes(value.answer as string)) {
      issues.push({ path, message: 'POS choices must include a valid answer.' });
    }
    if (!localized(value.explanation)) issues.push({ path: `${path}.explanation`, message: 'Localized explanation is required.' });
    return true;
  }
  if (value.kind === 'conjugation') {
    const token = typeof value.targetTangoId === 'string' ? findTango(passage, value.targetTangoId) : undefined;
    if (!token) {
      issues.push({ path: `${path}.targetTangoId`, message: 'Unknown target token.' });
    } else if (!span(value.stem) || !span(value.ending) || value.stem.start !== token.start || value.stem.end !== value.ending.start || value.ending.end !== token.end) {
      issues.push({ path, message: 'Stem and ending must be contiguous and cover the target token.' });
    }
    for (const field of ['katsuyouType', 'katsuyoukei']) if (!string(value[field])) issues.push({ path: `${path}.${field}`, message: 'Conjugation details are required.' });
    if (!localized(value.jflNote)) issues.push({ path: `${path}.jflNote`, message: 'Localized JFL note is required.' });
    return true;
  }
  if (value.kind === 'components') {
    const target = passage.result.bunsetsu.find((item) => item.id === value.targetBunsetsuId);
    if (!target) issues.push({ path: `${path}.targetBunsetsuId`, message: 'Unknown target bunsetsu.' });
    if (!Array.isArray(value.choices) || !value.choices.every(string) || !COMPONENT_LABELS.includes(value.answer as typeof COMPONENT_LABELS[number]) || !value.choices.includes(value.answer as string)) {
      issues.push({ path, message: 'Component choices must include a valid answer.' });
    }
    if (object(value.renbunsetsu)) {
      if (!string(value.renbunsetsu.id) || !localized(value.renbunsetsu.explanation) || !Array.isArray(value.renbunsetsu.bunsetsuIds)) {
        issues.push({ path: `${path}.renbunsetsu`, message: 'Invalid 連文節 metadata.' });
      } else for (const id of value.renbunsetsu.bunsetsuIds) {
        if (typeof id !== 'string' || !passage.result.bunsetsu.some((item) => item.id === id)) issues.push({ path: `${path}.renbunsetsu`, message: 'Unknown 連文節 member.' });
      }
    }
    if (!localized(value.explanation)) issues.push({ path: `${path}.explanation`, message: 'Localized explanation is required.' });
    return true;
  }
  issues.push({ path: `${path}.kind`, message: 'Unknown exercise type.' });
  return false;
}

function validateTree(input: unknown, issues: ContentIssue[]): void {
  if (!object(input) || !string(input.startId) || !Array.isArray(input.nodes)) {
    issues.push({ path: 'decisionTree', message: 'Decision tree requires a start node and nodes.' });
    return;
  }
  const tree = input as unknown as DecisionTree;
  for (const [index, candidate] of tree.nodes.entries()) {
    if (!object(candidate) || !string(candidate.id) || !localized(candidate.question) || !Array.isArray(candidate.branches)) {
      issues.push({ path: `decisionTree.nodes[${index}]`, message: 'Each node requires an ID, question, and branches array.' });
    }
  }
  const validNodes = tree.nodes.filter((node) => object(node) && string(node.id) && localized(node.question) && Array.isArray(node.branches));
  unique(validNodes.map((node) => node.id), 'decisionTree.nodes', issues);
  const nodes = new Map(validNodes.map((node) => [node.id, node]));
  if (!nodes.has(tree.startId)) issues.push({ path: 'decisionTree.startId', message: 'Unknown start node.' });
  const reachable = new Set<string>();
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      issues.push({ path: 'decisionTree', message: `Cycle at ${id}.` });
      return;
    }
    visiting.add(id);
    const node = nodes.get(id);
    if (!node) {
      issues.push({ path: 'decisionTree', message: `Unknown branch target: ${id}.` });
      return;
    }
    reachable.add(id);
    if (node.branches.length === 0 && !node.answer) issues.push({ path: `decisionTree.nodes.${id}`, message: 'Terminal node needs an answer.' });
    if (node.branches.length > 0 && node.answer) issues.push({ path: `decisionTree.nodes.${id}`, message: 'Branching node cannot be terminal.' });
    for (const branch of node.branches) {
      if (!localized(branch.label) || !string(branch.targetId)) issues.push({ path: `decisionTree.nodes.${id}`, message: 'Invalid branch.' });
      else visit(branch.targetId);
    }
    visiting.delete(id);
    visited.add(id);
  }
  visit(tree.startId);
  for (const id of nodes.keys()) if (!reachable.has(id)) issues.push({ path: 'decisionTree', message: `Unreachable node: ${id}.` });
}

export function loadCurriculum(curriculumInput: unknown = rawCurriculum, modernInput: unknown = [...rawModern, ...rawPractice]): Curriculum {
  const issues: ContentIssue[] = [];
  if (!Array.isArray(modernInput)) throw new Error('Passage collection must be an array.');
  const candidates = modernInput;
  const passages = candidates.filter((item, index) => validatePassage(item, index, issues));
  unique(passages.map((passage) => passage.id), 'passages', issues);

  if (!object(curriculumInput) || !Array.isArray(curriculumInput.lessons) || !Array.isArray(curriculumInput.exercises) || !object(curriculumInput.decisionTree)) {
    throw new Error('Curriculum requires lessons, exercises, and a decision tree.');
  }
  const lessons = curriculumInput.lessons.filter((item, index) => validateLesson(item, index, issues));
  unique(lessons.map((lesson) => lesson.id), 'lessons', issues);
  const lessonIds = new Set(lessons.map((lesson) => lesson.id));
  const passageMap = new Map(passages.map((passage) => [passage.id, passage]));
  const exercises = curriculumInput.exercises.filter((item, index) => validateExercise(item, index, passageMap, lessonIds, issues));
  unique(exercises.map((exercise) => exercise.id), 'exercises', issues);
  validateTree(curriculumInput.decisionTree, issues);
  for (const lesson of lessons) {
    for (const id of lesson.passageIds) if (!passageMap.has(id)) issues.push({ path: `lessons.${lesson.id}`, message: `Missing passage: ${id}.` });
    for (const id of lesson.exerciseIds) if (!exercises.some((exercise) => exercise.id === id && exercise.lessonId === lesson.id)) issues.push({ path: `lessons.${lesson.id}`, message: `Missing or mismatched exercise: ${id}.` });
    for (const id of lesson.reviewExerciseIds ?? []) if (!exercises.some((exercise) => exercise.id === id && exercise.passageId && lesson.passageIds.includes(exercise.passageId))) issues.push({ path: `lessons.${lesson.id}`, message: `Missing review exercise for a lesson passage: ${id}.` });
    for (const id of lesson.passageIds) {
      const passage = passageMap.get(id);
      if (passage && passage.result.mode !== lesson.mode) issues.push({ path: `lessons.${lesson.id}`, message: 'Lesson and passage modes must match.' });
    }
  }
  const orders = lessons.map((lesson) => lesson.order).sort((a, b) => a - b);
  if (orders.some((order, index) => order !== index + 1)) issues.push({ path: 'lessons', message: 'Lesson order must be a contiguous sequence.' });
  if (issues.length > 0) throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
  return { lessons, passages, exercises, decisionTree: curriculumInput.decisionTree as unknown as DecisionTree };
}

export function passageTokens(passage: AnnotatedPassage): Tango[] {
  return passage.result.bunsetsu.flatMap((bunsetsu) => bunsetsu.tango);
}

export function findBunsetsu(passage: AnnotatedPassage, id: string): Bunsetsu | undefined {
  return passage.result.bunsetsu.find((bunsetsu) => bunsetsu.id === id);
}
