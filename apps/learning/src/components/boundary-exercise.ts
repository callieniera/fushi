import type { SplitExercise } from '../content/schema.js';
import { localized, bunsetsuStage, tangoStage, text, type Language } from '../i18n.js';
import type { PassageView } from '../modes/lesson-view.js';
import { element, button } from '../lib/dom.js';
import { splitTextParts } from '../lib/text.js';

export function compareBoundaries(selected: number[], accepted: number[][]): { correct: boolean; missing: number; extra: number } {
  const actual = new Set(selected);
  let best: { correct: boolean; missing: number; extra: number } = { correct: false, missing: Number.POSITIVE_INFINITY, extra: Number.POSITIVE_INFINITY };
  for (const answer of accepted) {
    const expected = new Set(answer);
    const missing = [...expected].filter((value) => !actual.has(value)).length;
    const extra = [...actual].filter((value) => !expected.has(value)).length;
    if (missing + extra < best.missing + best.extra) best = { correct: missing === 0 && extra === 0, missing, extra };
  }
  return { correct: best.correct, missing: best.missing, extra: best.extra };
}

export function boundaryAnswers(exercise: SplitExercise, passage: PassageView): number[][] {
  return [exercise.stage === 'bunsetsu'
    ? passage.result.bunsetsu.map((item) => item.end)
    : passage.result.bunsetsu.flatMap((item) => item.tango.map((token) => token.end))];
}

export function boundaryExercise(exercise: SplitExercise, passage: PassageView, onCorrect: () => void, initiallyEnabled = true, language: Language = 'en'): HTMLElement {
  const t = (key: Parameters<typeof text>[1], values: Record<string, string | number> = {}): string => text(language, key, values);
  const container = element('section', { className: 'exercise', attributes: { 'aria-labelledby': `${exercise.id}-title` } });
  container.append(element('h3', { text: `${t('step', { number: exercise.stage === 'bunsetsu' ? 1 : 2 })}: ${localized(exercise.title, language)}`, id: `${exercise.id}-title` }), element('p', { text: localized(exercise.prompt, language) }));
  if (!initiallyEnabled) container.append(element('p', { className: 'notice', text: t('completeStepOne') }));
  const source = passage.result.text;
  const parts = splitTextParts(source);
  const selected = new Set<number>();
  const controls = new Map<number, HTMLButtonElement>();
  let enabled = true;
  const stage = localized(exercise.stage === 'bunsetsu' ? bunsetsuStage : tangoStage, language);
  const canvas = element('div', { className: 'split-canvas', attributes: { role: 'group', 'aria-label': t('splitGroup', { stage }) } });
  const feedback = element('p', { className: 'feedback', attributes: { role: 'status', 'aria-live': 'polite' } });
  function paint(): void {
    for (const [offset, control] of controls) {
      control.setAttribute('aria-pressed', String(selected.has(offset)));
      control.classList.toggle('selected', selected.has(offset));
    }
  }
  function toggle(offset: number): void {
    if (!enabled) return;
    if (selected.has(offset)) selected.delete(offset);
    else selected.add(offset);
    paint();
  }
  parts.forEach((part, index) => {
    canvas.append(element('span', { className: 'character', text: part.text }));
    const next = parts[index + 1];
    const offset = part.end;
    if (!next && offset !== source.length) return;
    const boundary = button('⋮', () => toggle(offset));
    boundary.className = 'boundary';
    boundary.setAttribute('aria-pressed', 'false');
    boundary.setAttribute('aria-label', `${t('boundaryAfter', { text: part.text })}${next ? t('boundaryBefore', { text: next.text }) : t('boundaryEnd')}`);
    controls.set(offset, boundary);
    canvas.append(boundary);
  });
  const explanation = element('div', { className: 'explanation', attributes: { hidden: '' } });
  const undo = button(t('undoBoundary'), () => {
    const last = [...selected].at(-1);
    if (last !== undefined) selected.delete(last);
    paint();
  });
  const reset = button(t('reset'), () => {
    selected.clear();
    feedback.textContent = '';
    explanation.hidden = true;
    paint();
  });
  const check = button(t('checkAnswer'), () => {
    const result = compareBoundaries([...selected], boundaryAnswers(exercise, passage));
    if (result.correct) {
      feedback.textContent = t('correctBoundaries');
      explanation.replaceChildren(element('p', { text: localized(passage.splitExplanations?.[exercise.stage], language) }));
      explanation.hidden = false;
      onCorrect();
    } else {
      feedback.textContent = t('incorrectBoundaries', {
        missing: result.missing, extra: result.extra,
        missingLabel: t(result.missing === 1 ? 'boundarySingular' : 'boundaryPlural'),
        extraLabel: t(result.extra === 1 ? 'boundarySingular' : 'boundaryPlural'),
      });
      explanation.hidden = true;
    }
  });
  function setEnabled(value: boolean): void {
    enabled = value;
    canvas.setAttribute('aria-disabled', String(!value));
    for (const control of controls.values()) control.disabled = !value;
    undo.disabled = !value;
    reset.disabled = !value;
    check.disabled = !value;
  }
  setEnabled(initiallyEnabled);
  container.append(canvas, element('div', { className: 'button-row' }), feedback, explanation);
  container.querySelector('.button-row')?.append(undo, reset, check);
  return container;
}
