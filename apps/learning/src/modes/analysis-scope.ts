import { text, type Language, type MessageKey } from '../i18n.js';
import { element } from '../lib/dom.js';

const sections: readonly { title: MessageKey; body: MessageKey; items?: readonly MessageKey[] }[] = [
  {
    title: 'analysisScopeProcessTitle',
    body: 'analysisScopeProcessBody',
    items: ['analysisScopeProcessInput', 'analysisScopeProcessWords', 'analysisScopeProcessConjugation', 'analysisScopeProcessBunsetsu'],
  },
  { title: 'analysisScopeBoundariesTitle', body: 'analysisScopeBoundariesBody' },
  {
    title: 'analysisScopeLimitsTitle',
    body: 'analysisScopeLimitsBody',
    items: [
      'analysisScopeLimitSubjects',
      'analysisScopeLimitParticles',
      'analysisScopeLimitModification',
      'analysisScopeLimitClauses',
      'analysisScopeLimitQuotations',
      'analysisScopeLimitContext',
    ],
  },
  { title: 'analysisScopePatchesTitle', body: 'analysisScopePatchesBody' },
  { title: 'analysisScopeFutureTitle', body: 'analysisScopeFutureBody' },
];

export function analysisScopeView(language: Language = 'en'): HTMLElement {
  const t = (key: MessageKey): string => text(language, key);
  const view = element('section', { className: 'analysis-scope-page', attributes: { 'aria-labelledby': 'analysis-scope-title' } });
  view.append(
    element('p', { className: 'eyebrow', text: t('analysisScopeEyebrow') }),
    element('h2', { id: 'analysis-scope-title', text: t('analysisScopeTitle') }),
    element('p', { className: 'lede', text: t('analysisScopeLede') }),
  );
  for (const section of sections) {
    view.append(element('h3', { text: t(section.title) }), element('p', { text: t(section.body) }));
    if (section.items) {
      const list = element('ul');
      list.append(...section.items.map((item) => element('li', { text: t(item) })));
      view.append(list);
    }
  }
  const links = element('p', { className: 'button-row' });
  links.append(element('a', { text: t('analysisScopeExplorerLink'), attributes: { href: '#/sandbox' } }));
  view.append(links);
  return view;
}
