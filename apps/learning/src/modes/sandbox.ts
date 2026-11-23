import type { ParseResult, Tango } from '@callieniera/fushi/core';
import { annotatedText, tokenDetails } from '../components/annotated-text.js';
import { reviewSuggestions } from '../components/review-suggestions.js';
import { sentenceAnalysis } from '../components/sentence-analysis.js';
import { button, element } from '../lib/dom.js';
import { ModernSandbox } from '../lib/fushi-client.js';
import type { AnnotatedPassage, Curriculum } from '../content/schema.js';
import type { SentencePool } from '../lib/sentence-pool.js';
import { text, type Language } from '../i18n.js';

export function sandboxView(sandbox = new ModernSandbox(), language: Language = 'en', content?: Curriculum, pool?: SentencePool<AnnotatedPassage>): HTMLElement {
  const t = (key: Parameters<typeof text>[1], values: Record<string, string | number> = {}): string => text(language, key, values);
  const section = element('section', { attributes: { 'aria-labelledby': 'sandbox-title' } });
  section.append(element('p', { className: 'eyebrow', text: t('sandboxEyebrow') }), element('h2', { id: 'sandbox-title', text: t('sandboxTitle') }));
  const notice = element('div', { className: 'notice warning' });
  notice.append(element('h3', { text: t('sandboxWarningTitle') }), element('p', { text: t('sandboxWarning') }));
  section.append(notice);
  const form = element('form', { className: 'sandbox-form' });
  const label = element('label', { text: t('sandboxInput'), attributes: { for: 'sandbox-input' } });
  const input = element('textarea', { id: 'sandbox-input', attributes: { maxlength: '1000', rows: '4', required: '', lang: 'ja', placeholder: '例：私は本を読む' } });
  const samples = content?.passages.filter((passage) => passage.result.mode === 'modern') ?? [];
  const sample = button(t('useSample'), () => {
    const passage = pool?.choose(samples) ?? samples[0];
    input.value = passage?.result.text ?? '私は本を読む';
    input.focus();
  });
  const parse = element('button', { text: t('analyze'), attributes: { type: 'submit' } });
  const clear = button(t('clear'), () => {
    input.value = '';
    output.replaceChildren();
    status.textContent = '';
    input.focus();
  });
  const status = element('p', { className: 'feedback', attributes: { role: 'status', 'aria-live': 'polite' } });
  const retry = button(t('retryInitialization'), () => { void analyze(); });
  retry.hidden = true;
  const output = element('div', { className: 'sandbox-result' });
  form.append(label, input, element('div', { className: 'button-row' }), status, retry);
  form.querySelector('.button-row')?.append(sample, parse, clear);
  section.append(form, output);

  async function analyze(): Promise<void> {
    if (!input.value.trim()) {
      status.textContent = t('enterSentence');
      input.focus();
      return;
    }
    if (sandbox.parsing || sandbox.status === 'loading') return;
    parse.disabled = true;
    input.readOnly = true;
    retry.hidden = true;
    status.textContent = sandbox.status === 'ready' ? t('analyzing') : t('loadingAnalyzer');
    try {
      const result = await sandbox.parse(input.value);
      status.textContent = t('analysisComplete', { count: result.bunsetsu.length });
      renderResult(result);
    } catch {
      status.textContent = t('analysisError');
      retry.hidden = false;
    } finally {
      parse.disabled = false;
      input.readOnly = false;
    }
  }

  function renderResult(result: ParseResult): void {
    const details = element('div', { className: 'selected-token' });
    const select = (token: Tango): void => {
      details.replaceChildren(element('h3', { text: t('selected', { word: token.surface }) }), tokenDetails(token, language));
      output.querySelectorAll('.tango').forEach((node) => {
        const selected = (node as HTMLElement).dataset.tangoId === token.id;
        node.classList.toggle('selected', selected);
        if (node instanceof HTMLButtonElement) node.setAttribute('aria-pressed', String(selected));
      });
    };
    output.replaceChildren(
      element('h3', { text: t('annotatedResult') }),
      element('p', { className: 'analysis-help', text: t('wordBunsetsuHelp') }),
      annotatedText(result, { onSelect: select, language }),
      element('p', { text: t('inspectWord') }),
      details,
    );
    const sentenceDiagnostics = result.diagnostics.filter((issue) => issue.code.startsWith('MODERN_COMPONENT_'));
    const primaryReview = reviewSuggestions(result, language,
      result.diagnostics.filter((issue) => !issue.code.startsWith('MODERN_COMPONENT_')));
    if (primaryReview) output.append(primaryReview);
    const experimental = element('details', { className: 'experimental-analysis' });
    experimental.append(
      element('summary', { text: t('experimentalAnalysisTitle') }),
      element('p', { className: 'analysis-help', text: t('experimentalAnalysisHelp') }),
      sentenceAnalysis(result, language),
    );
    const experimentalReview = reviewSuggestions(result, language, sentenceDiagnostics);
    if (experimentalReview) experimental.append(experimentalReview);
    output.append(experimental);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void analyze();
  });
  return section;
}
