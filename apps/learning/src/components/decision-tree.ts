import type { DecisionTree } from '../content/schema.js';
import { element, button } from '../lib/dom.js';
import { localized, text, type Language } from '../i18n.js';

export class TreeNavigator {
  private readonly trail: string[] = [];

  constructor(private readonly tree: DecisionTree) {
    this.trail.push(tree.startId);
  }

  get currentId(): string { return this.trail.at(-1) ?? this.tree.startId; }
  get history(): readonly string[] { return this.trail; }

  choose(targetId: string): boolean {
    const current = this.tree.nodes.find((node) => node.id === this.currentId);
    if (!current?.branches.some((branch) => branch.targetId === targetId)) return false;
    this.trail.push(targetId);
    return true;
  }

  back(): boolean {
    if (this.trail.length <= 1) return false;
    this.trail.pop();
    return true;
  }
}

export function decisionTree(tree: DecisionTree, language: Language = 'en'): HTMLElement {
  const t = (key: Parameters<typeof text>[1], values: Record<string, string | number> = {}): string => text(language, key, values);
  const container = element('section', { className: 'decision-tree', attributes: { 'aria-labelledby': 'tree-title' } });
  container.append(element('h3', { id: 'tree-title', text: t('treeTitle') }));
  const navigator = new TreeNavigator(tree);
  const content = element('div');
  container.append(content);
  function render(): void {
    const node = tree.nodes.find((candidate) => candidate.id === navigator.currentId);
    if (!node) return;
    const trail = element('nav', { className: 'breadcrumbs', attributes: { 'aria-label': t('decisionHistory') } });
    trail.append(element('p', { text: navigator.history.map((id) => localized(tree.nodes.find((candidate) => candidate.id === id)?.question, language) || id).join(' → ') }));
    const controls = element('div', { className: 'tree-options' });
    for (const branch of node.branches) controls.append(button(localized(branch.label, language), () => {
      if (navigator.choose(branch.targetId)) render();
    }));
    content.replaceChildren(trail, element('h4', { text: localized(node.question, language) }));
    if (node.answer) content.append(element('p', { className: 'tree-answer', text: t('treeAnswer', { answer: node.answer }) }));
    content.append(controls);
    if (navigator.history.length > 1) content.append(button(t('treeBack'), () => {
      navigator.back();
      render();
    }));
    content.querySelector('button')?.focus();
  }
  render();
  return container;
}
