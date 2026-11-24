import apacheLicense from '../../public/dictionaries/notices/LICENSE-2.0.txt?raw';
import ipadicNotice from '../../public/dictionaries/notices/NOTICE.md?raw';
import { text, type Language } from '../i18n.js';
import { element } from '../lib/dom.js';

export function aboutView(language: Language = 'en'): HTMLElement {
  const t = (key: Parameters<typeof text>[1]): string => text(language, key);
  const section = element('section', { className: 'about-page', attributes: { 'aria-labelledby': 'about-title' } });
  const scopeLink = element('p');
  scopeLink.append(element('a', { text: t('analysisScopeLink'), attributes: { href: '#/analysis-scope' } }));
  section.append(
    element('p', { className: 'eyebrow', text: t('aboutEyebrow') }),
    element('h2', { id: 'about-title', text: t('aboutTitle') }),
    element('p', { className: 'lede', text: t('aboutLede') }),
    element('h3', { text: t('aboutFeaturesTitle') }),
    element('p', { text: t('aboutFeaturesBody') }),
    scopeLink,
    element('h3', { text: t('aboutProjectTitle') }),
    element('p', { text: t('aboutProjectBody') }),
    element('p'),
  );
  section.lastElementChild?.append(element('a', {
    text: t('aboutProjectLink'),
    attributes: { href: 'https://github.com/callieniera/fushi', target: '_blank', rel: 'noreferrer' },
  }));
  const examplesLink = element('p');
  examplesLink.append(element('a', {
    text: t('aboutExamplesLink'),
    attributes: { href: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode', target: '_blank', rel: 'noreferrer' },
  }));
  section.append(
    element('h3', { text: t('aboutLicensesTitle') }),
    element('h4', { text: t('aboutExamplesTitle') }),
    element('p', { text: t('aboutExamplesBody') }),
    examplesLink,
    element('p', { text: t('aboutDictionaryBody') }),
    legalNotice(t('apacheLicenseTitle'), apacheLicense, t('legalTextLabel')),
    legalNotice(t('ipadicNoticeTitle'), ipadicNotice, t('legalTextLabel')),
  );
  return section;
}

function legalNotice(title: string, contents: string, languageLabel: string): HTMLElement {
  const disclosure = element('details', { className: 'legal-notice' });
  disclosure.append(
    element('summary', { text: title }),
    element('pre', { text: contents.trim(), attributes: { 'aria-label': `${title}: ${languageLabel}`, lang: 'en' } }),
  );
  return disclosure;
}
