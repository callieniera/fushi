import type { AnnotatedPassage, Curriculum } from './content/schema.js';
import { text } from './i18n.js';
import { button, element } from './lib/dom.js';
import { ModernSandbox } from './lib/fushi-client.js';
import { SentencePool } from './lib/sentence-pool.js';
import { aboutView } from './modes/about.js';
import { analysisScopeView } from './modes/analysis-scope.js';
import { sandboxView } from './modes/sandbox.js';
import { parseRoute, type Route } from './router.js';
import type { ProgressStore } from './storage.js';

export function appView(content: Curriculum, progress: ProgressStore, sandbox = new ModernSandbox(), pool = new SentencePool<AnnotatedPassage>()): HTMLElement {
  const shell = element('div');
  const header = element('header', { className: 'site-header' });
  const brand = element('a', { className: 'brand', text: 'Fushi', attributes: { href: '#/' } });
  const nav = element('nav');
  const routes = [
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
  header.append(brand, nav, language);
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
    footerText.textContent = t('footer');
    licenses.textContent = t('licenses');
    const route = parseRoute(globalThis.location.hash);
    for (const { link } of links) {
      const href = link.getAttribute('href');
      const current = href === `#/${route.name}`;
      if (current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    main.replaceChildren(viewForRoute(route));
    document.title = `${routeTitle(route, lang)} — Fushi`;
    main.focus({ preventScroll: true });
  }

  function viewForRoute(route: Route): HTMLElement {
    const lang = progress.value.preferences.language;
    if (route.name === 'sandbox') return sandboxView(sandbox, lang, content, pool);
    if (route.name === 'analysis-scope') return analysisScopeView(lang);
    if (route.name === 'about') return aboutView(lang);
    return notFound(lang);
  }

  globalThis.addEventListener('hashchange', render);
  render();
  return shell;
}

function notFound(lang: 'en' | 'ja'): HTMLElement {
  const section = element('section');
  section.append(element('h2', { text: text(lang, 'notFoundTitle') }), element('p', { text: text(lang, 'notFoundBody') }), element('a', { text: text(lang, 'returnExplorer'), attributes: { href: '#/' } }));
  return section;
}

function routeTitle(route: Route, lang: 'en' | 'ja'): string {
  if (route.name === 'sandbox') return text(lang, 'sandbox');
  if (route.name === 'analysis-scope') return text(lang, 'analysisScopeTitle');
  if (route.name === 'about') return text(lang, 'about');
  return text(lang, 'notFound');
}
