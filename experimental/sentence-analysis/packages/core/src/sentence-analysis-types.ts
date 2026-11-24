import type { Bunsetsu, Diagnostic } from './types.js';

export type ModernSentenceComponent = '主語' | '述語' | '修飾語' | '接続語' | '独立語';
export type ModernModifierKind = '連体修飾語' | '連用修飾語';
export type ModernSentenceType = '単文' | '重文' | '複文';

export type SentenceRelationKind = '主語' | '述語' | '修飾先' | '修飾語';

export interface SentenceRelation {
  kind: SentenceRelationKind;
  targetBunsetsuId: string;
}

export type ModernClauseKind = '主節' | '接続節' | '連体修飾節' | '並立節';
export type ModernClauseRelationKind = '主節' | '修飾先' | '並立';

export interface ModernClauseRelation {
  kind: ModernClauseRelationKind;
  targetClauseId: string;
}

export interface ModernClause {
  id: string;
  kind: ModernClauseKind;
  bunsetsuIds: string[];
  predicateBunsetsuId: string;
  predicateBunsetsuIds?: string[];
  start: number;
  end: number;
  relations?: ModernClauseRelation[];
}

export interface ModernRenbunsetsu {
  id: string;
  relation: '補助の関係';
  bunsetsuIds: string[];
  sentenceComponent: ModernSentenceComponent;
  start: number;
  end: number;
}

export interface SentenceAnalysisBunsetsu extends Bunsetsu {
  sentenceComponent?: ModernSentenceComponent;
  modifierKind?: ModernModifierKind;
  sentenceRelations?: SentenceRelation[];
  clauseId?: string;
}

export interface SentenceAnalysisResult {
  bunsetsu: SentenceAnalysisBunsetsu[];
  diagnostics: Diagnostic[];
  clauses?: ModernClause[];
  renbunsetsu?: ModernRenbunsetsu[];
  sentenceType?: ModernSentenceType;
}
