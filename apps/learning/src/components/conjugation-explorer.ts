import type { ConjugationExercise } from '../content/schema.js';
import type { PassageView } from '../modes/lesson-view.js';
import { element } from '../lib/dom.js';
import { passageTokens } from '../content/load-content.js';
import { localized, text, type Language } from '../i18n.js';

export function conjugationExplorer(exercise: ConjugationExercise, passage: PassageView, language: Language = 'en'): HTMLElement {
  const t = (key: Parameters<typeof text>[1]): string => text(language, key);
  const container = element('section', { className: 'exercise conjugation' });
  container.append(element('h3', { text: localized(exercise.title, language) }), element('p', { text: localized(exercise.prompt, language) }));
  const token = passageTokens(passage).find((item) => item.id === exercise.targetTangoId);
  if (!token) return container;
  const visual = element('p', { className: 'conjugation-word', attributes: { 'aria-label': t('stemAndEnding'), lang: 'ja' } });
  visual.append(
    element('span', { className: 'stem', text: passage.result.text.slice(exercise.stem.start, exercise.stem.end) }),
    element('span', { className: 'ending', text: passage.result.text.slice(exercise.ending.start, exercise.ending.end) }),
  );
  const table = element('dl', { className: 'token-details' });
  const entries: [string, string][] = [
    [t('stem'), visual.firstChild?.textContent ?? ''],
    [t('ending'), visual.lastChild?.textContent ?? ''],
    [t('conjugationType'), exercise.katsuyouType],
    [t('formInPassage'), exercise.katsuyoukei],
    [t('jflBridge'), localized(exercise.jflNote, language)],
    [t('sixModernForms'), t('modernForms')],
  ];
  for (const [term, value] of entries) table.append(element('dt', { text: term }), element('dd', { text: value }));
  container.append(visual, table);
  return container;
}
