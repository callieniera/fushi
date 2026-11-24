import type { ParseResult, RawMorpheme } from '../types.js';
import { groupModernBunsetsu } from './bunsetsu.js';
import { validateModernInput } from './input.js';
import { normalizeModernMorphemes } from './normalize.js';
import { remapModernTokens } from './remap.js';

/** Transform IPAdic-shaped morphemes into best-effort modern words and bunsetsu. */
export function parseModernMorphemes(morphemes: RawMorpheme[]): ParseResult {
  const input = validateModernInput(morphemes);
  const normalized = normalizeModernMorphemes(input.morphemes);
  const remapped = remapModernTokens(normalized.tokens);
  const grouped = groupModernBunsetsu(remapped.tango);
  return {
    mode: 'modern',
    text: input.text,
    bunsetsu: grouped.bunsetsu,
    diagnostics: [
      ...input.diagnostics,
      ...normalized.diagnostics,
      ...remapped.diagnostics,
      ...grouped.diagnostics,
    ],
  };
}
