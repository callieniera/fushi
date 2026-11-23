import type { Diagnostic, ParseResult, Tango } from '@callieniera/fushi/core';
import { element } from '../lib/dom.js';
import { text, type Language } from '../i18n.js';

export interface AnnotationOptions {
  showBunsetsu?: boolean;
  showWords?: boolean;
  showDiagnostics?: boolean;
  selectedTangoId?: string;
  onSelect?: (tango: Tango) => void;
  language?: Language;
}

export function tangoLabel(tango: Tango): string {
  return [
    tango.hinshi,
    tango.subHinshi,
    tango.katsuyouType,
    tango.katsuyoukei,
  ].filter(Boolean).join(' · ');
}

export function annotatedText(result: ParseResult, options: AnnotationOptions = {}): HTMLElement {
  const language = options.language ?? 'en';
  const t = (key: Parameters<typeof text>[1]): string => text(language, key);
  const container = element('div', { className: 'annotated-text', attributes: { lang: 'ja' } });
  for (const bunsetsu of result.bunsetsu) {
    const phrase = element('span', {
      className: `bunsetsu${options.showBunsetsu === false ? ' no-boundary' : ''}`,
      attributes: { 'data-bunsetsu-id': bunsetsu.id },
    });
    if (bunsetsu.sentenceComponent) phrase.dataset.component = bunsetsu.sentenceComponent;
    for (const tango of bunsetsu.tango) {
      const content = options.onSelect
        ? element('button', { text: tango.surface, attributes: { type: 'button', 'aria-pressed': String(options.selectedTangoId === tango.id) } })
        : element('span', { text: tango.surface });
      content.classList.add('tango');
      if (options.showWords === false) content.classList.add('no-boundary');
      if (options.selectedTangoId === tango.id) content.classList.add('selected');
      content.dataset.tangoId = tango.id;
      content.title = tangoLabel(tango);
      if (options.onSelect) content.addEventListener('click', () => options.onSelect?.(tango));
      phrase.append(content);
    }
    container.append(phrase);
  }
  if (options.showDiagnostics && result.diagnostics.length > 0) {
    const diagnostics = element('section', { className: 'diagnostics', attributes: { 'aria-label': t('parserNotes'), lang: language } });
    diagnostics.append(element('h4', { text: t('analysisNotes') }));
    const list = element('ul');
    list.append(...result.diagnostics.map((diagnostic) => diagnosticItem(diagnostic, result.text, language)));
    diagnostics.append(list);
    container.append(diagnostics);
  }
  return container;
}

function diagnosticItem(diagnostic: Diagnostic, source: string, language: Language): HTMLLIElement {
  const context = diagnostic.start !== undefined && diagnostic.end !== undefined
    ? text(language, 'diagnosticContext', { text: source.slice(diagnostic.start, diagnostic.end) })
    : '';
  return element('li', { className: `diagnostic-${diagnostic.severity}`, text: `${text(language, 'diagnosticSuggestion')}${context}` });
}

export function tokenDetails(tango: Tango, language: Language = 'en'): HTMLElement {
  const t = (key: Parameters<typeof text>[1]): string => text(language, key);
  const details = element('dl', { className: 'token-details' });
  const entries: [string, string | undefined][] = [
    [t('word'), tango.surface],
    [t('partOfSpeech'), tango.hinshi],
    [t('subtype'), tango.subHinshi],
    [t('conjugationType'), tango.katsuyouType],
    [t('form'), tango.katsuyoukei],
    [t('baseForm'), tango.baseForm],
    [t('reading'), tango.reading],
  ];
  for (const [label, value] of entries) {
    if (value === undefined) continue;
    details.append(element('dt', { text: label }), element('dd', { text: value }));
  }
  return details;
}
