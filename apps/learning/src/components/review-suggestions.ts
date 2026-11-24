import type { Diagnostic, ParseResult } from '@callieniera/fushi/core';
import { element } from '../lib/dom.js';
import { text, type Language, type MessageKey } from '../i18n.js';

const diagnosticMessages: Record<string, MessageKey> = {
  MODERN_INPUT_NOT_ARRAY: 'diagnosticInputInvalid',
  MODERN_INPUT_INVALID_MORPHEME: 'diagnosticInputInvalid',
  MODERN_INPUT_EMPTY_SURFACE: 'diagnosticInputInvalid',
  MODERN_INPUT_OFFSET_RECONSTRUCTED: 'diagnosticOffsets',
  MODERN_INPUT_OFFSET_LENGTH_MISMATCH: 'diagnosticOffsets',
  MODERN_INPUT_OFFSET_OVERLAP: 'diagnosticOffsets',
  MODERN_INPUT_MISSING_POS: 'diagnosticMissingPos',
  MODERN_NORMALIZE_ORPHAN_PREFIX: 'diagnosticOrphanAffix',
  MODERN_NORMALIZE_ORPHAN_SUFFIX: 'diagnosticOrphanAffix',
  MODERN_BUNSETSU_LEADING_DEPENDENT: 'diagnosticLeadingDependent',
  MODERN_SOU_AMBIGUOUS: 'diagnosticSouAmbiguous',
  MODERN_RERU_AMBIGUOUS: 'diagnosticReruAmbiguous',
  MODERN_POS_UNSUPPORTED: 'diagnosticPosUnsupported',
  MODERN_KATSUYOU_TYPE_UNSUPPORTED: 'diagnosticConjugationType',
  MODERN_KATSUYOU_FORM_UNSUPPORTED: 'diagnosticConjugationForm',
};

export function reviewSuggestions(
  result: ParseResult,
  language: Language = 'en',
  diagnostics: readonly Diagnostic[] = result.diagnostics,
): HTMLElement | undefined {
  if (diagnostics.length === 0) return undefined;
  const t = (key: MessageKey): string => text(language, key);
  const section = element('section', {
    className: 'review-suggestions',
    attributes: { 'aria-labelledby': 'review-suggestions-title' },
  });
  section.append(
    element('h3', { id: 'review-suggestions-title', text: t('analysisNotes') }),
    element('p', { className: 'review-intro', text: t('reviewSuggestionsIntro') }),
  );
  const list = element('ul', { className: 'review-list' });
  for (const diagnostic of diagnostics) {
    const item = element('li', {
      className: `review-item diagnostic-${diagnostic.severity}`,
      attributes: { 'data-diagnostic-code': diagnostic.code, 'data-severity': diagnostic.severity },
    });
    item.append(element('h4', { text: t(severityLabels[diagnostic.severity]) }));
    item.append(element('p', { text: t(diagnosticMessages[diagnostic.code] ?? 'diagnosticSuggestion') }));
    const context = diagnosticContext(diagnostic, result.text);
    if (context) {
      const source = element('p', { className: 'diagnostic-source' });
      source.append(
        element('span', { text: `${t('diagnosticSource')}: ` }),
        element('span', { text: context, attributes: { lang: 'ja' } }),
      );
      item.append(source);
    }
    list.append(item);
  }
  section.append(list);
  return section;
}

const severityLabels: Record<Diagnostic['severity'], MessageKey> = {
  info: 'diagnosticInfo',
  warning: 'diagnosticWarning',
  error: 'diagnosticError',
};

function diagnosticContext(diagnostic: Diagnostic, source: string): string {
  if (diagnostic.start === undefined || diagnostic.end === undefined) return '';
  return source.slice(diagnostic.start, diagnostic.end);
}
