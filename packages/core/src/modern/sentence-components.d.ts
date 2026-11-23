import type { Bunsetsu, Diagnostic, ModernClause } from '../types.js';
export interface SentenceComponentResult {
    bunsetsu: Bunsetsu[];
    diagnostics: Diagnostic[];
    clauses?: ModernClause[];
}
/**
 * Add conservative sentence-component labels and basic bunsetsu dependency links.
 * The input is not mutated. Unresolved labels and relations remain absent.
 */
export declare function analyzeModernSentenceComponents(input: readonly Bunsetsu[]): SentenceComponentResult;
