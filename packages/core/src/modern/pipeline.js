import { groupModernBunsetsu } from './bunsetsu.js';
import { validateModernInput } from './input.js';
import { normalizeModernMorphemes } from './normalize.js';
import { remapModernTokens } from './remap.js';
import { analyzeModernSentenceComponents } from './sentence-components.js';
/** Transform IPAdic-shaped morphemes into best-effort modern school grammar. */
export function parseModernMorphemes(morphemes) {
    const input = validateModernInput(morphemes);
    const normalized = normalizeModernMorphemes(input.morphemes);
    const remapped = remapModernTokens(normalized.tokens);
    const grouped = groupModernBunsetsu(remapped.tango);
    const analyzed = analyzeModernSentenceComponents(grouped.bunsetsu);
    return {
        mode: 'modern',
        text: input.text,
        bunsetsu: analyzed.bunsetsu,
        ...(analyzed.clauses ? { clauses: analyzed.clauses } : {}),
        diagnostics: [
            ...input.diagnostics,
            ...normalized.diagnostics,
            ...remapped.diagnostics,
            ...grouped.diagnostics,
            ...analyzed.diagnostics,
        ],
    };
}
