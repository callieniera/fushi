import type { AnnotatedPassage, Curriculum } from './content/schema.js';
import { text } from './i18n.js';
import { button, element } from './lib/dom.js';
import { ModernSandbox } from './lib/fushi-client.js';
import { SentencePool } from './lib/sentence-pool.js';
import { aboutView } from './modes/about.js';
import { drillsView } from './modes/drills.js';
import { lessonsView } from './modes/lessons.js';
import { lessonView } from './modes/lesson-view.js';
import { sandboxView } from './modes/sandbox.js';
import { parseRoute, type Route } from './router.js';
import type { ProgressStore } from './storage.js';

export function appView(content: Curriculum, progress: ProgressStore, sandbox = new ModernSandbox(), pool = new SentencePool<AnnotatedPassage>()): HTMLElement {
  const shell = element('div');
  const header = element('header', { className: 'site-header' });
  const brand = element('a', { className: 'brand', text: 'Fushi', attributes: { href: '#/lessons' } });
  const nav = element('nav');
  const routes = [
    { route: '#/lessons', key: 'lessons' },
    { route: '#/drills', key: 'drills' },
    { route: '#/sandbox', key: 'sandbox' },
    { route: '#/about', key: 'about' },
  ] as const;
  const links = routes.map(({ route, key }) => ({ link: element('a', { attributes: { href: route } }), key }));
  for (const { link } of links) nav.append(link);
  const language = button('', () => {
    progress.setPreference('language', progress.value.preferences.language === 'en' ? 'ja' : 'en');
    render();
  });
  language.className = 'language-toggle';
  const reset = button('', () => {
    if (globalThis.confirm(text(progress.value.preferences.language, 'resetConfirm'))) {
      progress.reset();
      render();
    }
  });
  reset.className = 'reset-progress';
  header.append(brand, nav, language, reset);
  const status = element('p', { id: 'app-status', className: 'sr-only', attributes: { role: 'status', 'aria-live': 'polite' } });
  const main = element('main', { id: 'main', attributes: { tabindex: '-1' } });
  const footer = element('footer');
  const footerText = element('p');
  footer.append(footerText);
  const licenses = element('a', { attributes: { href: '#/about' } });
  footer.append(licenses);
  shell.append(header, status, main, footer);

  function render(): void {
    const lang = progress.value.preferences.language;
    const t = (key: Parameters<typeof text>[1]): string => text(lang, key);
    document.documentElement.lang = lang;
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('description'));
    const skip = document.querySelector('.skip-link');
    if (skip) skip.textContent = t('skip');
    brand.setAttribute('aria-label', t('homeLabel'));
    nav.setAttribute('aria-label', t('navigationLabel'));
    for (const item of links) item.link.textContent = t(item.key);
    language.textContent = t('language');
    language.setAttribute('aria-label', t('languageLabel'));
    language.setAttribute('aria-pressed', String(lang === 'ja'));
    language.lang = lang === 'en' ? 'ja' : 'en';
    reset.textContent = t('resetProgress');
    footerText.textContent = t('footer');
    licenses.textContent = t('licenses');
    const route = parseRoute(globalThis.location.hash);
    for (const { link } of links) {
      const href = link.getAttribute('href');
      const current = href === '#/lessons' ? route.name === 'lessons' || route.name === 'lesson' : href === `#/${route.name}`;
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    main.replaceChildren(viewForRoute(route));
    document.title = `${routeTitle(route, lang)} — Fushi`;
    main.focus({ preventScroll: true });
  }

  function viewForRoute(route: Route): HTMLElement {
    const lang = progress.value.preferences.language;
    if (route.name === 'lessons') return lessonsView(content, progress, lang);
    if (route.name === 'lesson') {
      const lesson = content.lessons.find((item) => item.id === route.id);
      return lesson ? lessonView(content, lesson, progress, lang, pool) : notFound(lang);
    }
    if (route.name === 'drills') return drillsView(content, progress, lang);
    if (route.name === 'sandbox') return sandboxView(sandbox, lang, content, pool);
    if (route.name === 'about') return aboutView(lang);
    return notFound(lang);
  }

  globalThis.addEventListener('hashchange', render);
  render();
  return shell;
}

function notFound(lang: 'en' | 'ja'): HTMLElement {
  const section = element('section');
  section.append(element('h2', { text: text(lang, 'notFoundTitle') }), element('p', { text: text(lang, 'notFoundBody') }), element('a', { text: text(lang, 'returnLessons'), attributes: { href: '#/lessons' } }));
  return section;
}

function routeTitle(route: Route, lang: 'en' | 'ja'): string {
  if (route.name === 'lesson') return text(lang, 'lessons');
  if (route.name === 'lessons') return text(lang, 'lessons');
  if (route.name === 'drills') return text(lang, 'drills');
  if (route.name === 'sandbox') return text(lang, 'sandbox');
  if (route.name === 'about') return text(lang, 'about');
  return text(lang, 'notFound');
}
