import type { ParseResult } from '@callieniera/fushi/core';
import type { LocalizedText } from '../i18n.js';

export interface SourceReference {
  title: string;
  author: string;
  source: string;
  license: string;
}

export interface Lesson {
  id: string;
  order: number;
  title: LocalizedText;
  mode: 'modern';
  objectives: LocalizedText[];
  explanation: LocalizedText[];
  passageIds: string[];
  exerciseIds: string[];
  reviewExerciseIds?: string[];
  jflNotes?: LocalizedText[];
}

export interface SplitExplanations {
  bunsetsu: LocalizedText;
  tango: LocalizedText;
}

export interface AnnotatedPassage {
  id: string;
  title?: LocalizedText;
  splitExplanations?: SplitExplanations;
  source: SourceReference;
  result: ParseResult;
}

interface ExerciseBase {
  id: string;
  lessonId: string;
  passageId: string;
  title: LocalizedText;
  prompt: LocalizedText;
}

export interface SplitExercise extends ExerciseBase {
  kind: 'split';
  passageIds: string[];
  stage: 'bunsetsu' | 'tango';
}

export interface IdentificationExercise extends ExerciseBase {
  kind: 'identification';
  targetTangoId: string;
  choices: string[];
  answer: string;
  explanation: LocalizedText;
}

export interface ConjugationExercise extends ExerciseBase {
  kind: 'conjugation';
  targetTangoId: string;
  stem: { start: number; end: number };
  ending: { start: number; end: number };
  katsuyouType: string;
  katsuyoukei: string;
  jflNote: LocalizedText;
}

export interface SentenceComponentExercise extends ExerciseBase {
  kind: 'components';
  targetBunsetsuId: string;
  choices: string[];
  answer: string;
  renbunsetsu?: { id: string; bunsetsuIds: string[]; explanation: LocalizedText };
  explanation: LocalizedText;
}

export type Exercise = SplitExercise | IdentificationExercise | ConjugationExercise | SentenceComponentExercise;

export interface DecisionNode {
  id: string;
  question: LocalizedText;
  branches: Array<{ label: LocalizedText; targetId: string }>;
  answer?: string;
}

export interface DecisionTree {
  startId: string;
  nodes: DecisionNode[];
}

export interface Curriculum {
  lessons: Lesson[];
  passages: AnnotatedPassage[];
  exercises: Exercise[];
  decisionTree: DecisionTree;
}

export interface ContentIssue {
  path: string;
  message: string;
}
