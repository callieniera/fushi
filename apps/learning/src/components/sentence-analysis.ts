import type {
  Bunsetsu,
  ModernClause,
  ModernClauseKind,
  ModernClauseRelationKind,
  ModernSentenceComponent,
  ModernSentenceType,
  ParseResult,
  SentenceRelationKind,
} from '@callieniera/fushi/core';
import { element } from '../lib/dom.js';
import { text, type Language, type MessageKey } from '../i18n.js';

const componentLabels: Record<ModernSentenceComponent, MessageKey> = {
  主語: 'componentSubject',
  述語: 'componentPredicate',
  修飾語: 'componentModifier',
  接続語: 'componentConjunction',
  独立語: 'componentIndependent',
};

const relationLabels: Record<SentenceRelationKind, MessageKey> = {
  主語: 'relationSubject',
  修飾先: 'relationModifies',
  修飾語: 'relationModifiedBy',
  述語: 'relationPredicate',
};

const sentenceTypeLabels: Record<ModernSentenceType, MessageKey> = {
  単文: 'sentenceTypeSimple',
  重文: 'sentenceTypeCompound',
  複文: 'sentenceTypeComplex',
};

const clauseLabels: Record<ModernClauseKind, MessageKey> = {
  主節: 'clauseMain',
  接続節: 'clauseAdverbial',
  連体修飾節: 'clauseRelative',
  並立節: 'clauseCoordinate',
};

const clauseRelationLabels: Record<ModernClauseRelationKind, MessageKey> = {
  主節: 'clauseRelationMain',
  修飾先: 'clauseRelationModifies',
  並立: 'clauseRelationCoordinate',
};

export function sentenceAnalysis(result: ParseResult, language: Language = 'en'): HTMLElement {
  const t = (key: MessageKey): string => text(language, key);
  const section = element('section', {
    className: 'sentence-analysis',
    attributes: { 'aria-labelledby': 'sentence-analysis-title' },
  });
  section.append(element('h3', { id: 'sentence-analysis-title', text: t('sentenceAnalysisTitle') }));

  const components = element('section', { attributes: { 'aria-labelledby': 'sentence-components-title' } });
  components.append(
    element('h4', { id: 'sentence-components-title', text: t('sentenceComponentsTitle') }),
    element('p', { className: 'analysis-help', text: t('sentenceComponentsHelp') }),
  );
  const componentList = element('dl', { className: 'component-list' });
  let unresolved = false;
  const grouped = new Set(result.renbunsetsu?.flatMap((group) => group.bunsetsuIds.slice(1)));
  for (const bunsetsu of result.bunsetsu) {
    if (grouped.has(bunsetsu.id)) continue;
    const group = result.renbunsetsu?.find((candidate) => candidate.bunsetsuIds[0] === bunsetsu.id);
    const row = element('div', {
      className: 'component-row',
      attributes: {
        'data-bunsetsu-id': bunsetsu.id,
        ...(group ? { 'data-renbunsetsu-id': group.id } : {}),
      },
    });
    const component = group?.sentenceComponent ?? bunsetsu.sentenceComponent;
    unresolved ||= component === undefined;
    row.dataset.component = component ?? 'unresolved';
    const textContent = group
      ? group.bunsetsuIds.map((id) => result.bunsetsu.find((item) => item.id === id))
        .filter((item): item is Bunsetsu => item !== undefined)
        .map((item) => phraseText(result, item)).join('')
      : phraseText(result, bunsetsu);
    const modifier = bunsetsu.modifierKind
      ? `（${t(bunsetsu.modifierKind === '連体修飾語' ? 'modifierAdnominal' : 'modifierAdverbial')}）`
      : '';
    row.append(
      element('dt', { text: textContent, attributes: { lang: 'ja' } }),
      element('dd', {
        className: component ? 'component-label' : 'component-label unresolved',
        text: component ? `${t(componentLabels[component])}${modifier}` : t('componentUnresolved'),
      }),
    );
    componentList.append(row);
  }
  components.append(componentList);
  if (unresolved) components.append(element('p', { className: 'analysis-note', text: t('componentUnresolvedNote') }));
  section.append(components);
  if (result.sentenceType) {
    section.append(element('p', {
      className: 'sentence-type',
      text: `${t('sentenceType')}: ${t(sentenceTypeLabels[result.sentenceType])}`,
    }));
  }
  if (result.renbunsetsu && result.renbunsetsu.length > 0) {
    section.append(renbunsetsuAnalysis(result, language));
  }

  const relationships = element('section', { attributes: { 'aria-labelledby': 'sentence-relations-title' } });
  relationships.append(
    element('h4', { id: 'sentence-relations-title', text: t('relationsTitle') }),
    element('p', { className: 'analysis-help', text: t('relationsHelp') }),
  );
  const relationList = element('ul', { className: 'relation-list' });
  for (const bunsetsu of result.bunsetsu) {
    for (const relation of bunsetsu.sentenceRelations ?? []) {
      const target = result.bunsetsu.find((candidate) => candidate.id === relation.targetBunsetsuId);
      if (!target) continue;
      const item = element('li', {
        className: 'relation-row',
        attributes: {
          'data-source-bunsetsu-id': bunsetsu.id,
          'data-target-bunsetsu-id': target.id,
          'data-relation-kind': relation.kind,
        },
      });
      item.append(
        element('span', { className: 'relation-phrase', text: phraseText(result, bunsetsu), attributes: { lang: 'ja' } }),
        element('span', { className: 'relation-arrow', text: '→' }),
        element('span', { className: 'relation-phrase', text: phraseText(result, target), attributes: { lang: 'ja' } }),
        element('span', { className: 'relation-label', text: t(relationLabels[relation.kind]) }),
      );
      relationList.append(item);
    }
  }
  if (relationList.childElementCount > 0) relationships.append(relationList);
  else relationships.append(element('p', { className: 'analysis-note', text: t('noRelations') }));
  section.append(relationships);

  if (result.clauses && result.clauses.length > 0) {
    section.append(clauseAnalysis(result, language));
  }
  return section;
}

function renbunsetsuAnalysis(result: ParseResult, language: Language): HTMLElement {
  const section = element('section');
  section.append(element('h4', { text: text(language, 'renbunsetsuTitle') }));
  const list = element('ul', { className: 'renbunsetsu-list' });
  for (const group of result.renbunsetsu ?? []) {
    const members = group.bunsetsuIds.flatMap((id) => {
      const bunsetsu = result.bunsetsu.find((candidate) => candidate.id === id);
      return bunsetsu ? [phraseText(result, bunsetsu)] : [];
    });
    const item = element('li', { attributes: { 'data-renbunsetsu-id': group.id } });
    item.append(
      element('span', { text: members.join('＋'), attributes: { lang: 'ja' } }),
      element('span', { text: ` — ${text(language, 'renbunsetsuSubsidiary')}` }),
    );
    list.append(item);
  }
  section.append(list);
  return section;
}

function clauseAnalysis(result: ParseResult, language: Language): HTMLElement {
  const t = (key: MessageKey): string => text(language, key);
  const section = element('section', {
    className: 'clause-analysis',
    attributes: { 'aria-labelledby': 'sentence-clauses-title' },
  });
  section.append(
    element('h4', { id: 'sentence-clauses-title', text: t('clausesTitle') }),
    element('p', { className: 'analysis-help', text: t('clausesHelp') }),
  );
  const list = element('ol', { className: 'clause-list' });
  for (const clause of result.clauses ?? []) {
    const members = clause.bunsetsuIds.flatMap((id) => {
      const bunsetsu = result.bunsetsu.find((candidate) => candidate.id === id);
      return bunsetsu ? [bunsetsu] : [];
    });
    const predicates = (clause.predicateBunsetsuIds ?? [clause.predicateBunsetsuId]).flatMap((id) => {
      const bunsetsu = result.bunsetsu.find((candidate) => candidate.id === id);
      return bunsetsu ? [bunsetsu] : [];
    });
    const item = element('li', {
      className: 'clause-item',
      attributes: { 'data-clause-id': clause.id, 'data-clause-kind': clause.kind },
    });
    item.append(
      element('h5', { text: t(clauseLabels[clause.kind]) }),
      element('p', {
        className: 'clause-text',
        text: members.map((member) => phraseText(result, member)).join('｜'),
        attributes: { lang: 'ja' },
      }),
    );
    if (predicates.length > 0) {
      const predicateLine = element('p', { className: 'clause-predicate' });
      predicateLine.append(
        element('span', { text: `${t('clausePredicate')}: ` }),
        element('span', { text: predicates.map((predicate) => phraseText(result, predicate)).join(''), attributes: { lang: 'ja' } }),
      );
      item.append(predicateLine);
    }
    const relations = clauseRelations(result, clause, language);
    if (relations) item.append(relations);
    list.append(item);
  }
  section.append(list);
  return section;
}

function clauseRelations(result: ParseResult, clause: ModernClause, language: Language): HTMLElement | undefined {
  if (!clause.relations || clause.relations.length === 0) return undefined;
  const list = element('ul', { className: 'clause-relations' });
  for (const relation of clause.relations) {
    const target = result.clauses?.find((candidate) => candidate.id === relation.targetClauseId);
    if (!target) continue;
    const targetText = target.bunsetsuIds.flatMap((id) => {
      const bunsetsu = result.bunsetsu.find((candidate) => candidate.id === id);
      return bunsetsu ? [phraseText(result, bunsetsu)] : [];
    }).join('｜');
    const item = element('li', {
      attributes: {
        'data-source-clause-id': clause.id,
        'data-target-clause-id': target.id,
        'data-clause-relation-kind': relation.kind,
      },
    });
    item.append(
      element('span', { text: `${text(language, clauseRelationLabels[relation.kind])}: ` }),
      element('span', { text: targetText, attributes: { lang: 'ja' } }),
    );
    list.append(item);
  }
  return list.childElementCount > 0 ? list : undefined;
}

function phraseText(result: ParseResult, bunsetsu: Bunsetsu): string {
  return result.text.slice(bunsetsu.start, bunsetsu.end);
}
