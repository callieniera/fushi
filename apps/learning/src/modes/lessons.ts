import type { Curriculum } from '../content/schema.js';
import { element } from '../lib/dom.js';
import { lessonHref } from '../router.js';
import { decisionTree } from '../components/decision-tree.js';
import type { ProgressStore } from '../storage.js';
import { localized, localizedList, text, type Language } from '../i18n.js';

export function lessonsView(content: Curriculum, progress: ProgressStore, language: Language = 'en'): HTMLElement {
  const t = (key: Parameters<typeof text>[1], values: Record<string, string | number> = {}): string => text(language, key, values);
  const section = element('section', { attributes: { 'aria-labelledby': 'lessons-title' } });
  section.append(element('p', { className: 'eyebrow', text: t('lessonsEyebrow') }), element('h2', { id: 'lessons-title', text: t('lessonsTitle') }), element('p', { className: 'lede', text: t('lessonsLede') }));
  const completed = progress.value.completedLessons.filter((id) => content.lessons.some((lesson) => lesson.id === id)).length;
  const summary = element('p', { className: 'notice', text: t('lessonProgress', { done: completed, total: content.lessons.length }) });
  const list = element('ol', { className: 'lesson-list' });
  for (const lesson of [...content.lessons].sort((a, b) => a.order - b.order)) {
    const item = element('li', { className: 'lesson-card' });
    const link = element('a', { text: localized(lesson.title, language), attributes: { href: lessonHref(lesson.id) } });
    item.append(element('h3'), element('p', { text: localizedList(lesson.objectives, language).join(' ') }), element('span', { className: 'status-label', text: progress.value.completedLessons.includes(lesson.id) ? t('completed') : t('modernJapanese') }));
    item.querySelector('h3')?.append(link);
    list.append(item);
  }
  section.append(summary, list, decisionTree(content.decisionTree, language));
  return section;
}
