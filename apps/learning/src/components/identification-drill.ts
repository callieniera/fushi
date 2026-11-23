import type { IdentificationExercise, SentenceComponentExercise } from '../content/schema.js';
import { element, button } from '../lib/dom.js';
import { localized, text, type Language } from '../i18n.js';

export interface DrillResult {
  correct: boolean;
  exerciseId: string;
}

export function choiceDrill(
  exercise: IdentificationExercise | SentenceComponentExercise,
  onAttempt: (result: DrillResult) => void,
  language: Language = 'en',
): HTMLElement {
  const t = (key: Parameters<typeof text>[1], values: Record<string, string | number> = {}): string => text(language, key, values);
  const container = element('section', { className: 'exercise', attributes: { 'aria-labelledby': `${exercise.id}-title` } });
  container.append(element('h3', { id: `${exercise.id}-title`, text: localized(exercise.title, language) }), element('p', { text: localized(exercise.prompt, language) }));
  const group = element('fieldset');
  group.append(element('legend', { text: t('chooseOne') }));
  const feedback = element('p', { className: 'feedback', attributes: { role: 'status', 'aria-live': 'polite' } });
  const explanation = element('p', { className: 'explanation', attributes: { hidden: '' } });
  const inputs = exercise.choices.map((choice) => {
    const label = element('label', { className: 'choice' });
    const input = element('input', { attributes: { type: 'radio', name: exercise.id, value: choice } });
    label.append(input, document.createTextNode(choice));
    group.append(label);
    return input;
  });
  const check = button(t('checkAnswer'), () => {
    const selected = inputs.find((input) => input.checked);
    if (!selected) {
      feedback.textContent = t('chooseBefore');
      return;
    }
    const correct = selected.value === exercise.answer;
    feedback.textContent = correct ? t('correct') : t('incorrectAnswer', { answer: exercise.answer });
    explanation.textContent = localized(exercise.explanation, language);
    explanation.hidden = false;
    onAttempt({ correct, exerciseId: exercise.id });
  });
  const retry = button(t('retry'), () => {
    for (const input of inputs) input.checked = false;
    feedback.textContent = t('chooseAnother');
    explanation.hidden = true;
    inputs[0]?.focus();
  });
  container.append(group, element('div', { className: 'button-row' }), feedback, explanation);
  container.querySelector('.button-row')?.append(check, retry);
  return container;
}

export function nextExerciseIndex(current: number, total: number, retry: boolean): number {
  if (total <= 0) return 0;
  return retry ? current % total : (current + 1) % total;
}
