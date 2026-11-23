import type { Curriculum } from '../content/schema.js';
import { choiceDrill, nextExerciseIndex } from '../components/identification-drill.js';
import { element, button } from '../lib/dom.js';
import type { ProgressStore } from '../storage.js';
import { text, type Language } from '../i18n.js';

export function drillsView(content: Curriculum, progress: ProgressStore, language: Language = 'en'): HTMLElement {
  const t = (key: Parameters<typeof text>[1]): string => text(language, key);
  const section = element('section', { attributes: { 'aria-labelledby': 'drills-title' } });
  section.append(element('h2', { id: 'drills-title', text: t('drillsTitle') }), element('p', { text: t('drillsLede') }));
  const exercises = content.exercises.filter((exercise) => exercise.kind === 'identification' || exercise.kind === 'components');
  let index = 0;
  let retry = false;
  const body = element('div');
  function render(): void {
    const exercise = exercises[index];
    if (!exercise) return;
    const passage = content.passages.find((item) => item.id === exercise.passageId);
    const sentence = element('p', { className: 'drill-context', attributes: { lang: 'ja' }, text: passage?.result.text ?? '' });
    const drill = choiceDrill(exercise, (attempt) => {
      retry = !attempt.correct;
      progress.recordAttempt(attempt.exerciseId, attempt.correct);
      if (attempt.correct) progress.completeExercise(attempt.exerciseId);
    }, language);
    const next = button(retry ? t('keepReview') : t('nextQuestion'), () => {
      index = nextExerciseIndex(index, exercises.length, retry);
      retry = false;
      render();
    });
    body.replaceChildren(sentence, drill, next);
  }
  render();
  section.append(body);
  return section;
}
