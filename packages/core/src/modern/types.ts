import type {
  Diagnostic,
  Hinshi,
  ModernKatsuyouType,
  ModernKatsuyoukei,
  RawMorpheme,
} from '../types.js';

export interface IndexedMorpheme {
  raw: RawMorpheme;
  index: number;
}

export interface InputStageResult {
  morphemes: IndexedMorpheme[];
  text: string;
  diagnostics: Diagnostic[];
}

export type NormalizationKind = 'plain' | 'adjectival' | 'sou' | 'you' | 'prefix' | 'suffix';

export interface NormalizedToken {
  rawMorphemes: IndexedMorpheme[];
  source: IndexedMorpheme;
  conjugationSource: IndexedMorpheme;
  kind: NormalizationKind;
  surface: string;
  baseForm: string | undefined;
  reading: string | undefined;
  start: number;
  end: number;
  forcedHinshi?: Hinshi;
  forcedSubHinshi?: string;
  forcedIndependent?: boolean;
  forcedKatsuyouType?: ModernKatsuyouType;
  forcedKatsuyoukei?: ModernKatsuyoukei;
  meaningTags?: string[];
}

export interface NormalizationResult {
  tokens: NormalizedToken[];
  diagnostics: Diagnostic[];
}
