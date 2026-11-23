import type { AnnotatedPassage, Curriculum, Lesson, SplitExercise } from '../content/schema.js';
import { annotatedText, tokenDetails } from '../components/annotated-text.js';
import { boundaryExercise } from '../components/boundary-exercise.js';
import { choiceDrill } from '../components/identification-drill.js';
import { conjugationExplorer } from '../components/conjugation-explorer.js';
import { decisionTree } from '../components/decision-tree.js';
import { element, button } from '../lib/dom.js';
import { localized, localizedList, text, type Language } from '../i18n.js';
import type { SentencePool } from '../lib/sentence-pool.js';
import { lessonHref } from '../router.js';
import type { ProgressStore } from '../storage.js';

export type PassageView = AnnotatedPassage;

export function lessonView(content: Curriculum, lesson: Lesson, progress: ProgressStore, language: Language = 'en', pool?: SentencePool<AnnotatedPassage>): HTMLElement {
  const t = (key: Parameters<typeof text>[1], values: Record<string, string | number> = {}): string => text(language, key, values);
  const section = element('article', { attributes: { 'aria-labelledby': 'lesson-title' } });
  const back = element('a', { text: t('allLessons'), attributes: { href: '#/lessons' } });
  const completed = progress.value.completedLessons.includes(lesson.id);
  section.append(back, element('p', { className: 'eyebrow', text: `${t('modernJapanese')}${completed ? ` · ${t('completed')}` : ''}` }), element('h2', { id: 'lesson-title', text: localized(lesson.title, language) }));
  const objectives = element('ul');
  for (const objective of localizedList(lesson.objectives, language)) objectives.append(element('li', { text: objective }));
  section.append(element('h3', { text: t('learningObjectives') }), objectives);
  for (const paragraph of localizedList(lesson.explanation, language)) section.append(element('p', { className: 'lesson-copy', text: paragraph }));

  if (lesson.jflNotes) {
    const toggle = element('button', { attributes: { type: 'button', 'aria-pressed': String(progress.value.preferences.jfl), 'aria-controls': 'jfl-notes' }, text: t('showJfl') });
    const notes = element('div', { id: 'jfl-notes', className: 'notice' });
    const render = (): void => {
      const visible = progress.value.preferences.jfl;
      toggle.setAttribute('aria-pressed', String(visible));
      toggle.textContent = visible ? t('hideJfl') : t('showJfl');
      notes.hidden = !visible;
      if (visible) notes.replaceChildren(...localizedList(lesson.jflNotes, language).map((note) => element('p', { text: note })));
    };
    toggle.addEventListener('click', () => { progress.setPreference('jfl', !progress.value.preferences.jfl); render(); });
    render();
    section.append(toggle, notes);
  }

  const exercises = content.exercises.filter((exercise) => [...lesson.exerciseIds, ...(lesson.reviewExerciseIds ?? [])].includes(exercise.id));
  const split = exercises.find((exercise): exercise is SplitExercise => exercise.kind === 'split');
  const poolPassages = (split?.passageIds ?? []).flatMap((id) => {
    const passage = content.passages.find((item) => item.id === id);
    return passage ? [passage] : [];
  });
  const selectedPassage = pool?.choose(poolPassages);
  const displayedPassages = selectedPassage ? [selectedPassage] : lesson.passageIds.flatMap((id) => {
    const passage = content.passages.find((item) => item.id === id);
    return passage ? [passage] : [];
  });
  for (const passage of displayedPassages) section.append(passageView(passage, language));
  if (exercises.length > 0) {
    section.append(element('h3', { text: t('practice') }));
    const practice = element('div');
    section.append(practice);
    for (const exercise of exercises) {
      const passage = selectedPassage ?? content.passages.find((item) => item.id === exercise.passageId);
      if (!passage) continue;
      if (exercise.kind === 'split') {
        const prerequisite = exercises.find((candidate) => candidate.kind === 'split' && candidate.stage === 'bunsetsu');
        const initiallyEnabled = exercise.stage === 'bunsetsu' || !prerequisite || progress.value.completedExercises.includes(prerequisite.id);
        practice.append(boundaryExercise(exercise, passage, () => {
          progress.completeExercise(exercise.id);
          if (exercise.stage === 'bunsetsu') {
            const next = practice.querySelector<HTMLElement>('#split-tango-title');
            const nextExercise = exercises.find((candidate): candidate is SplitExercise => candidate.id === 'split-tango');
            if (next && nextExercise) {
              const replacement = boundaryExercise(nextExercise, passage, () => progress.completeExercise(nextExercise.id), true, language);
              next.closest('.exercise')?.replaceWith(replacement);
              replacement.querySelector<HTMLButtonElement>('.boundary')?.focus();
            }
          }
        }, initiallyEnabled, language));
      } else if (exercise.kind === 'identification' || exercise.kind === 'components') {
        practice.append(choiceDrill(exercise, (attempt) => {
          progress.recordAttempt(attempt.exerciseId, attempt.correct);
          if (attempt.correct) progress.completeExercise(attempt.exerciseId);
        }, language));
        if (exercise.kind === 'components' && exercise.renbunsetsu) {
          const combined = element('div', { className: 'notice' });
          combined.append(element('h4', { text: `連文節: ${exercise.renbunsetsu.bunsetsuIds.map((id) => passage.result.bunsetsu.find((item) => item.id === id)?.tango.map((token) => token.surface).join('')).join(' + ')}` }), element('p', { text: localized(exercise.renbunsetsu.explanation, language) }));
          practice.append(combined);
        }
      } else if (exercise.kind === 'conjugation') practice.append(conjugationExplorer(exercise, passage, language));
    }
  }
  if (lesson.id === 'parts-of-speech') section.append(decisionTree(content.decisionTree, language));
  const mark = button(completed ? t('lessonCompleted') : t('markLesson'), () => {
    progress.completeLesson(lesson.id);
    mark.textContent = t('lessonCompleted');
    mark.disabled = true;
    const status = document.querySelector('#app-status');
    if (status) status.textContent = t('markedComplete', { title: localized(lesson.title, language) });
  });
  mark.disabled = completed;
  const navigation = element('nav', { className: 'lesson-navigation', attributes: { 'aria-label': t('adjacentLessons') } });
  const current = content.lessons.findIndex((item) => item.id === lesson.id);
  if (current > 0) navigation.append(element('a', { text: t('previousLesson'), attributes: { href: lessonHref(content.lessons[current - 1]!.id) } }));
  navigation.append(mark);
  if (current < content.lessons.length - 1) navigation.append(element('a', { text: t('nextLesson'), attributes: { href: lessonHref(content.lessons[current + 1]!.id) } }));
  section.append(navigation);
  return section;
}

export function passageView(passage: PassageView, language: Language = 'en'): HTMLElement {
  const t = (key: Parameters<typeof text>[1], values: Record<string, string | number> = {}): string => text(language, key, values);
  const title = localized(passage.title, language) || passage.source.title;
  const container = element('section', { className: 'passage', attributes: { 'aria-label': t('annotatedPassage', { title }), 'data-passage-id': passage.id } });
  const selected = element('div', { className: 'selected-token', attributes: { 'aria-live': 'polite' } });
  let selectedToken: Parameters<typeof tokenDetails>[0] | undefined;
  function renderSelected(): void {
    if (!selectedToken) return;
    selected.replaceChildren(element('h4', { text: t('selected', { word: selectedToken.surface }) }), tokenDetails(selectedToken, language));
  }
  const annotated = annotatedText(passage.result, {
    language,
    ...(selectedToken ? { selectedTangoId: selectedToken.id } : {}),
    onSelect: (token) => { selectedToken = token; renderSelected(); },
  });
  container.append(element('h3', { text: title }), annotated, element('p', { text: t('selectWord') }), selected);
  const source = element('details', { className: 'source' });
  source.append(element('summary', { text: t('sourceLicense') }), element('p', { text: `${passage.source.author}. ${passage.source.source}. ${passage.source.license}` }));
  container.append(source);
  return container;
}
