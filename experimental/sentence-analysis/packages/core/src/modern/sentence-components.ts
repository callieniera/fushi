import { diagnostic } from '../diagnostics.js';
import type {
  Bunsetsu,
  Diagnostic,
  Hinshi,
  ModernClause,
  ModernClauseKind,
  ModernClauseRelationKind,
  ModernRenbunsetsu,
  ModernSentenceType,
  SentenceRelationKind,
  Tango,
} from '../types.js';

export interface SentenceComponentResult {
  bunsetsu: Bunsetsu[];
  diagnostics: Diagnostic[];
  clauses?: ModernClause[];
  renbunsetsu?: ModernRenbunsetsu[];
  sentenceType?: ModernSentenceType;
}

const CONJUGATING_HEADS: readonly Hinshi[] = ['動詞', '形容詞', '形容動詞'];
const ADNOMINAL_CASE_PARTICLES = new Set(['の']);
const PREDICATE_CASE_PARTICLES = new Set(['を', 'に', 'へ', 'で', 'と', 'から', 'まで', 'より']);
const PARALLEL_CONJUNCTIVE_PARTICLES = new Set(['て', 'で', 'が', 'けれど', 'けれども', 'し']);
const CONTRASTIVE_CONJUNCTIVE_PARTICLES = new Set(['が', 'けれど', 'けれども']);
const PURPOSE_MOTION_VERBS = new Set(['行く', '来る', '帰る']);

function headOf(bunsetsu: Bunsetsu): Tango | undefined {
  return bunsetsu.tango[0];
}

function hasParticle(bunsetsu: Bunsetsu, particles: ReadonlySet<string>): boolean {
  return bunsetsu.tango.some(
    (tango) => tango.hinshi === '助詞' && particles.has(tango.surface),
  );
}

function hasSubjectMarker(bunsetsu: Bunsetsu): boolean {
  const head = headOf(bunsetsu);
  return head?.hinshi === '名詞'
    && bunsetsu.tango.some(
      (tango) => tango.hinshi === '助詞' && (tango.surface === 'が' || tango.surface === 'は'),
    );
}

function hasNominalTarget(bunsetsu: Bunsetsu | undefined): boolean {
  return bunsetsu !== undefined && headOf(bunsetsu)?.hinshi === '名詞';
}

function conjunctiveParticleOf(bunsetsu: Bunsetsu): Tango | undefined {
  const last = bunsetsu.tango[bunsetsu.tango.length - 1];
  return last?.hinshi === '助詞' && last.subHinshi === '接続助詞' ? last : undefined;
}

function hasConjunctiveParticle(bunsetsu: Bunsetsu): boolean {
  return conjunctiveParticleOf(bunsetsu) !== undefined;
}

function effectiveConjugationForm(bunsetsu: Bunsetsu): Tango['katsuyoukei'] {
  for (let index = bunsetsu.tango.length - 1; index >= 0; index -= 1) {
    const form = bunsetsu.tango[index]?.katsuyoukei;
    if (form !== undefined) return form;
  }
  return undefined;
}

function hasCopula(bunsetsu: Bunsetsu): boolean {
  return bunsetsu.tango.some(
    (tango) => tango.hinshi === '助動詞'
      && (tango.baseForm === 'だ' || tango.baseForm === 'です'
        || tango.katsuyouType === '特殊・ダ' || tango.katsuyouType === '特殊・デス'),
  );
}

function isPredicateCandidate(bunsetsu: Bunsetsu): boolean {
  const head = headOf(bunsetsu);
  if (!head || hasConjunctiveParticle(bunsetsu)) return false;
  if (!CONJUGATING_HEADS.includes(head.hinshi) && !(head.hinshi === '名詞' && hasCopula(bunsetsu))) {
    return false;
  }
  if ((head.hinshi === '形容詞' || head.hinshi === '形容動詞')
    && effectiveConjugationForm(bunsetsu) === '連用形') return false;
  return effectiveConjugationForm(bunsetsu) !== '連体形';
}

function isClausePredicate(bunsetsu: Bunsetsu): boolean {
  const head = headOf(bunsetsu);
  if (!head || (!CONJUGATING_HEADS.includes(head.hinshi)
    && !(head.hinshi === '名詞' && hasCopula(bunsetsu)))) return false;
  const particle = conjunctiveParticleOf(bunsetsu);
  // Only verbs (動詞) can form relative clauses via 連体形.
  // I-adjectives (形容詞) and na-adjectives (形容動詞) in 連体形 are simple adnominal modifiers (連体修飾語), not relative clauses.
  const isVerbInAttributive = head.hinshi === '動詞' && effectiveConjugationForm(bunsetsu) === '連体形';
  // For relative clauses (連体修飾節), subsidiary verbs (補助動詞) CAN be predicates
  // (e.g., "走っている" where "いる" is the predicate in 連体形).
  // For adverbial clauses (接続節) and main clauses, subsidiary verbs cannot be predicates.
  // The particle check handles adverbial/main clauses; the attributive check handles relative clauses.
  return particle !== undefined || isVerbInAttributive;
}

function hasPurposeMotionTarget(bunsetsu: Bunsetsu | undefined): boolean {
  if (!bunsetsu) return false;
  const head = headOf(bunsetsu);
  return head?.hinshi === '動詞' && head.baseForm !== undefined
    && PURPOSE_MOTION_VERBS.has(head.baseForm) && isPredicateCandidate(bunsetsu);
}

function isPurposeModifier(bunsetsu: Bunsetsu, following: Bunsetsu | undefined): boolean {
  const head = headOf(bunsetsu);
  return head?.hinshi === '動詞' && head.katsuyoukei === '連用形'
    && bunsetsu.tango.length === 2
    && bunsetsu.tango[1]?.hinshi === '助詞' && bunsetsu.tango[1].surface === 'に'
    && hasPurposeMotionTarget(following);
}

interface ClauseDiscovery {
  start: number;
  end: number;
  predicateIndex: number;
  kind: ModernClauseKind;
  relation?: ModernClauseRelationKind;
  targetIndex?: number;
  outerPrefixStart?: number;
  outerPrefixEnd?: number;
}

interface DiscoveredClause extends ClauseDiscovery {
  id: string;
  bunsetsuIndexes: number[];
}

interface ClauseDiscoveryResult {
  clauses: DiscoveredClause[];
  unresolvedIndex?: number;
}

interface SubsidiaryRelation {
  start: number;
  end: number;
  predicateIndex: number;
}

function discoverSubsidiaryRelations(bunsetsu: readonly Bunsetsu[]): SubsidiaryRelation[] {
  const relations: SubsidiaryRelation[] = [];
  for (let index = 0; index < bunsetsu.length - 1; index += 1) {
    if (relations.some((relation) => index >= relation.start && index <= relation.end)) continue;
    const item = bunsetsu[index]!;
    const next = bunsetsu[index + 1]!;
    if (headOf(item)?.hinshi !== '動詞' || headOf(item)?.subHinshi === '補助動詞'
      || conjunctiveParticleOf(item)?.surface !== 'て' && conjunctiveParticleOf(item)?.surface !== 'で'
      || headOf(next)?.hinshi !== '動詞' || headOf(next)?.subHinshi !== '補助動詞') continue;
    const relation = { start: index, end: index + 1, predicateIndex: index + 1 };
    while (relation.end + 1 < bunsetsu.length) {
      const current = bunsetsu[relation.end]!;
      const following = bunsetsu[relation.end + 1]!;
      const particle = conjunctiveParticleOf(current);
      if ((particle?.surface !== 'て' && particle?.surface !== 'で')
        || headOf(following)?.subHinshi !== '補助動詞') break;
      relation.end += 1;
      relation.predicateIndex = relation.end;
    }
    relations.push(relation);
    index = relation.end;
  }
  return relations;
}

function subsidiaryMembers(
  relations: readonly SubsidiaryRelation[],
  predicateIndex: number,
): number[] | undefined {
  const relation = relations.find((candidate) => candidate.predicateIndex === predicateIndex);
  if (!relation) return undefined;
  return Array.from({ length: relation.end - relation.start + 1 }, (_, index) => relation.start + index);
}

function buildRenbunsetsu(
  bunsetsu: Bunsetsu[],
  relations: readonly SubsidiaryRelation[],
  roles: ReadonlyMap<number, ModernRenbunsetsu['sentenceComponent']>,
): ModernRenbunsetsu[] {
  const result: ModernRenbunsetsu[] = [];
  for (const relation of relations) {
    const sentenceComponent = roles.get(relation.predicateIndex);
    if (!sentenceComponent) continue;
    const members = bunsetsu.slice(relation.start, relation.end + 1);
    const first = members[0]!;
    const last = members[members.length - 1]!;
    first.sentenceComponent = sentenceComponent;
    result.push({
      id: `modern-renbunsetsu-${result.length}`,
      relation: '補助の関係',
      bunsetsuIds: members.map((member) => member.id),
      sentenceComponent,
      start: first.start,
      end: last.end,
    });
  }
  return result;
}

function hasNominalizingParticle(bunsetsu: Bunsetsu): boolean {
  return bunsetsu.tango.some((tango) => tango.subHinshi === '準体助詞');
}

function isRelativeHeadCandidate(bunsetsu: Bunsetsu): boolean {
  return headOf(bunsetsu)?.hinshi === '名詞' && !hasNominalizingParticle(bunsetsu);
}

function adnominalModifierFloor(bunsetsu: readonly Bunsetsu[], start: number): number {
  let floor = start;
  while (floor > 0 && isAdnominalModifier(bunsetsu[floor - 1]!)
    && hasNominalTarget(bunsetsu[floor])) {
    floor -= 1;
  }
  return floor;
}

/**
 * Discover only clause boundaries licensed by a following particle or nominal head.
 * Embedded relative clauses mean membership is not a simple span partition.
 */
function discoverClauses(
  bunsetsu: readonly Bunsetsu[],
  subsidiaryRelations: readonly SubsidiaryRelation[],
): ClauseDiscoveryResult {
  const discoveries: ClauseDiscovery[] = [];

  for (const [predicateIndex, item] of bunsetsu.entries()) {
    if (!isClausePredicate(item)) continue;
    const nextIndex = predicateIndex + 1;
    const next = bunsetsu[nextIndex];
    if (!next) continue;
    const particle = conjunctiveParticleOf(item);

    if (particle) {
      if (next.sentenceComponent === '接続語' || next.sentenceComponent === '独立語') continue;
      const sequential = next.tango.some(
        (tango) => tango.hinshi === '動詞' && tango.subHinshi === '補助動詞',
      );
      if (sequential && !CONTRASTIVE_CONJUNCTIVE_PARTICLES.has(particle.surface)) continue;
      const parallel = PARALLEL_CONJUNCTIVE_PARTICLES.has(particle.surface);
      const kind: ModernClauseKind = parallel ? '並立節' : '接続節';
      const relation: ModernClauseRelationKind = parallel ? '並立' : '主節';
      for (let start = 0; start < predicateIndex; start += 1) {
        discoveries.push({ start, end: predicateIndex, predicateIndex, kind, relation });
      }
      continue;
    }

    if (effectiveConjugationForm(item) !== '連体形' || !isRelativeHeadCandidate(next)) continue;
    // Include start = predicateIndex to handle relative clauses at the beginning of the sentence
    for (let start = 0; start <= predicateIndex; start += 1) {
      discoveries.push({
        start,
        end: predicateIndex,
        predicateIndex,
        kind: '連体修飾節',
        relation: '修飾先',
        targetIndex: nextIndex,
      });
    }
  }

  const accepted: ClauseDiscovery[] = [];
  const latestBoundaryByPredicate = new Map<number, ClauseDiscovery>();
  const candidatesByPredicate = new Map<number, ClauseDiscovery[]>();
  for (const discovery of discoveries) {
    const candidates = candidatesByPredicate.get(discovery.predicateIndex) ?? [];
    candidates.push(discovery);
    candidatesByPredicate.set(discovery.predicateIndex, candidates);
  }
  for (const [predicateIndex, candidates] of candidatesByPredicate) {
    const withSubject = candidates.filter((candidate) =>
      bunsetsu.slice(candidate.start, candidate.predicateIndex).some(hasSubjectMarker),
    );
    const pool = withSubject.length > 0 ? withSubject : candidates;
    const selected = pool.sort((a, b) => b.start - a.start)[0]!;
    selected.start = adnominalModifierFloor(bunsetsu, selected.start);
    const outer = candidates.find((candidate) => candidate.start === 0);
    if (selected.start > 0 && outer && hasSubjectMarker(bunsetsu[0]!)
      && bunsetsu.slice(0, predicateIndex + 1).filter(isClausePredicate).length === 1) {
      selected.outerPrefixStart = 0;
      selected.outerPrefixEnd = selected.start;
    }
    accepted.push(selected);
    latestBoundaryByPredicate.set(predicateIndex, selected.outerPrefixStart !== undefined
      ? selected : candidates.sort((a, b) => b.start - a.start)[0]!);
  }

  const finalIndex = [...bunsetsu].reverse().findIndex((item) =>
    isPredicateCandidate(item) && !isPurposeModifier(item, bunsetsu[bunsetsu.indexOf(item) + 1]),
  );
  const finalPredicateIndex = finalIndex < 0 ? -1 : bunsetsu.length - finalIndex - 1;
  if (finalPredicateIndex < 0 || accepted.length === 0) return { clauses: [] };
  const overlappingRelative = accepted.find((item, index) => item.kind === '連体修飾節'
    && accepted.slice(index + 1).some((other) => other.kind === '連体修飾節'
      && item.start < other.start && item.targetIndex! >= other.start));
  if (overlappingRelative) return { clauses: [], unresolvedIndex: overlappingRelative.predicateIndex };

  const finalStart = predicateFloor(bunsetsu, finalPredicateIndex, accepted, latestBoundaryByPredicate);
  const finalDiscovery: ClauseDiscovery = {
    start: finalStart,
    end: bunsetsu.length - 1,
    predicateIndex: finalPredicateIndex,
    kind: accepted.some((item) => item.kind === '並立節') ? '並立節' : '主節',
  };
  const prefix = accepted.find((item) => item.outerPrefixStart !== undefined);
  if (prefix?.outerPrefixStart !== undefined && prefix.outerPrefixEnd !== undefined) {
    finalDiscovery.outerPrefixStart = prefix.outerPrefixStart;
    finalDiscovery.outerPrefixEnd = prefix.outerPrefixEnd;
  }
  accepted.push(finalDiscovery);
  const unownedRelative = accepted.find((item) => item.kind === '連体修飾節'
    && !accepted.some((candidate) => candidate.kind !== '連体修飾節'
      && candidate.start <= item.targetIndex! && candidate.end >= item.targetIndex!));
  if (unownedRelative) return { clauses: [], unresolvedIndex: unownedRelative.predicateIndex };
  const trailingRelative = accepted.find((item) =>
    item.kind === '連体修飾節' && item.targetIndex! > finalPredicateIndex,
  );
  if (trailingRelative) return { clauses: [], unresolvedIndex: trailingRelative.predicateIndex };

  const clauses = accepted.sort((a, b) => a.predicateIndex - b.predicateIndex).map((discovery, index) => {
    const id = `modern-clause-${index}`;
    const bunsetsuIndexes: number[] = [];
    if (discovery.kind === '連体修飾節') {
      for (let member = discovery.start; member <= discovery.end; member += 1) {
        bunsetsuIndexes.push(member);
      }
    } else {
      const prefix = discovery.predicateIndex === accepted[accepted.length - 1]?.predicateIndex
        ? accepted.find((candidate) =>
          candidate.outerPrefixStart !== undefined && candidate.predicateIndex < discovery.predicateIndex,
        ) : undefined;
      for (let member = prefix?.outerPrefixStart ?? discovery.start;
        member < (prefix?.outerPrefixEnd ?? discovery.start); member += 1) {
        bunsetsuIndexes.push(member);
      }
      let member = discovery.start === 0 ? prefix?.outerPrefixEnd ?? discovery.start : discovery.start;
      while (member <= discovery.end) {
        const nested = accepted.find((candidate) =>
          candidate.predicateIndex < discovery.predicateIndex && candidate.start === member,
        );
        if (nested) {
          member = nested.kind === '連体修飾節' ? nested.targetIndex! + 1 : nested.end + 1;
        } else {
          bunsetsuIndexes.push(member);
          member += 1;
        }
      }
    }
    return { ...discovery, id, bunsetsuIndexes: bunsetsuIndexes.sort((a, b) => a - b) };
  });
  return clauseStructureIsComplete(bunsetsu, clauses)
    ? { clauses } : { clauses: [], unresolvedIndex: accepted[0]!.predicateIndex };
}

function clauseStructureIsComplete(
  bunsetsu: readonly Bunsetsu[],
  clauses: readonly DiscoveredClause[],
): boolean {
  const membership = new Map<string, number>();
  for (const clause of clauses) {
    const ids = new Set(clause.bunsetsuIndexes.map((index) => bunsetsu[index]?.id));
    if (ids.size !== clause.bunsetsuIndexes.length || ids.has(undefined)
      || !clause.bunsetsuIndexes.includes(clause.predicateIndex)) return false;
    for (const id of ids) membership.set(id!, (membership.get(id!) ?? 0) + 1);
  }
  return membership.size === bunsetsu.length
    && [...membership.values()].every((count) => count === 1);
}

function predicateFloor(
  bunsetsu: readonly Bunsetsu[],
  predicateIndex: number,
  accepted: readonly ClauseDiscovery[],
  latestBoundaries: ReadonlyMap<number, ClauseDiscovery>,
): number {
  let floor = accepted.find((item) => item.outerPrefixStart !== undefined)?.outerPrefixStart ?? 0;
  for (const [boundaryPredicate, item] of latestBoundaries) {
    if (boundaryPredicate >= predicateIndex) continue;
    if (item.kind === '連体修飾節' && item.targetIndex !== undefined
      && item.targetIndex > predicateIndex) floor = Math.max(floor, item.targetIndex);
    else floor = Math.max(floor, item.end + 1);
  }
  return floor;
}

function addClauseRelation(
  clause: ModernClause,
  kind: ModernClauseRelationKind,
  targetClauseId: string,
): void {
  const relations = clause.relations ?? [];
  if (!relations.some((relation) =>
    relation.kind === kind && relation.targetClauseId === targetClauseId,
  )) relations.push({ kind, targetClauseId });
  clause.relations = relations;
}

function isAdnominalModifier(bunsetsu: Bunsetsu): boolean {
  const head = headOf(bunsetsu);
  if (!head) return false;
  if (head.hinshi === '連体詞') return true;
  if ((head.hinshi === '形容詞' || head.hinshi === '形容動詞') && head.katsuyoukei === '連体形') {
    return !bunsetsu.tango.some((tango) => tango.subHinshi === '準体助詞');
  }
  return head.hinshi === '名詞'
    && hasParticle(bunsetsu, ADNOMINAL_CASE_PARTICLES)
    && bunsetsu.tango.some(
      (tango) => tango.hinshi === '助詞' && tango.surface === 'の' && tango.subHinshi === '格助詞',
    );
}

function isAdverbialModifier(bunsetsu: Bunsetsu): boolean {
  const head = headOf(bunsetsu);
  if (!head || hasConjunctiveParticle(bunsetsu)) return false;
  if (head.hinshi === '副詞') return true;
  if (head.hinshi === '名詞' && head.subHinshi === '副詞可能' && bunsetsu.tango.length === 1) return true;
  return (head.hinshi === '形容詞' || head.hinshi === '形容動詞') && head.katsuyoukei === '連用形';
}

function isPredicateCaseModifier(bunsetsu: Bunsetsu): boolean {
  const head = headOf(bunsetsu);
  const nominalized = bunsetsu.tango.some((tango) => tango.subHinshi === '準体助詞');
  return (head?.hinshi === '名詞' || nominalized) && hasParticle(bunsetsu, PREDICATE_CASE_PARTICLES);
}

function locationOf(bunsetsu: Bunsetsu): Pick<Diagnostic, 'start' | 'end' | 'tangoIds'> {
  return {
    start: bunsetsu.start,
    end: bunsetsu.end,
    tangoIds: bunsetsu.tango.map((tango) => tango.id),
  };
}

function addRelation(
  bunsetsu: Bunsetsu,
  kind: SentenceRelationKind,
  targetBunsetsuId: string,
): void {
  const relations = bunsetsu.sentenceRelations ?? [];
  if (!relations.some(
    (relation) => relation.kind === kind && relation.targetBunsetsuId === targetBunsetsuId,
  )) {
    relations.push({ kind, targetBunsetsuId });
  }
  bunsetsu.sentenceRelations = relations;
}

/**
 * Add conservative sentence-component labels and basic bunsetsu dependency links.
 * The input is not mutated. Unresolved labels and relations remain absent.
 */
export function analyzeModernSentenceComponents(
  input: readonly Bunsetsu[],
): SentenceComponentResult {
  const bunsetsu = input.map((item) => ({
    ...item,
    ...(item.sentenceRelations ? { sentenceRelations: [...item.sentenceRelations] } : {}),
  }));
  const diagnostics: Diagnostic[] = [];
  const warning = (code: string, message: string, target: Bunsetsu): void => {
    diagnostics.push(diagnostic(code, message, 'warning', locationOf(target)));
  };

  for (const item of bunsetsu) {
    const head = headOf(item);
    if (head?.hinshi === '接続詞') item.sentenceComponent = '接続語';
    else if (head?.hinshi === '感動詞') item.sentenceComponent = '独立語';
  }

  const subsidiaryRelations = discoverSubsidiaryRelations(bunsetsu);
  const discovery = discoverClauses(bunsetsu, subsidiaryRelations);
  if (discovery.clauses.length > 0) {
    return analyzeDiscoveredClauses(bunsetsu, discovery.clauses, subsidiaryRelations, diagnostics, warning);
  }
  if (discovery.unresolvedIndex !== undefined) {
    const target = bunsetsu[discovery.unresolvedIndex]!;
    warning(
      'MODERN_COMPONENT_CLAUSE_UNRESOLVED',
      'The clause structure could not be resolved without overlapping or missing bunsetsu.',
      target,
    );
  }

  const absorbed = new Set(subsidiaryRelations.flatMap((relation) =>
    Array.from({ length: relation.end - relation.start }, (_, index) => relation.start + index),
  ));
  const candidates = bunsetsu.filter((item, index) =>
    !absorbed.has(index) && item.sentenceComponent === undefined && isPredicateCandidate(item)
      && !isPurposeModifier(item, bunsetsu[index + 1]),
  );
  let predicate: Bunsetsu | undefined;
  if (candidates.length === 1) {
    const resolvedPredicate = candidates[0]!;
    predicate = resolvedPredicate;
    resolvedPredicate.sentenceComponent = '述語';
  } else if (candidates.length > 1) {
    for (const item of candidates) {
      warning(
        'MODERN_COMPONENT_PREDICATE_AMBIGUOUS',
        'Multiple predicate candidates prevent a reliable predicate assignment.',
        item,
      );
    }
  }

  const subjects = bunsetsu.filter(
    (item) => item.sentenceComponent === undefined && hasSubjectMarker(item),
  );
  for (const item of subjects) item.sentenceComponent = '主語';

  if (subjects.length === 0 && predicate) {
    warning(
      'MODERN_COMPONENT_SUBJECT_UNRESOLVED',
      'No explicit subject bunsetsu was found; an omitted subject was not inferred.',
      predicate,
    );
  } else if (predicate && subjects.length > 1) {
    for (const item of subjects) {
      warning(
        'MODERN_COMPONENT_SUBJECT_AMBIGUOUS',
        'Multiple subject candidates prevent a reliable subject-predicate link.',
        item,
      );
    }
  } else if (predicate && subjects.length === 1) {
    const subject = subjects[0]!;
    addRelation(subject, '主語', predicate.id);
    addRelation(predicate, '述語', subject.id);
  } else if (!predicate && subjects.length > 0) {
    for (const item of subjects) {
      warning(
        'MODERN_COMPONENT_PREDICATE_UNRESOLVED',
        'No unambiguous predicate was found for the subject.',
        item,
      );
    }
  }

  for (const [index, item] of bunsetsu.entries()) {
    if (item.sentenceComponent !== undefined || !isAdnominalModifier(item)) continue;
    item.sentenceComponent = '修飾語';
    item.modifierKind = '連体修飾語';
    const target = bunsetsu[index + 1];
    if (target && hasNominalTarget(target)) {
      addRelation(item, '修飾先', target.id);
    } else {
      warning(
        'MODERN_COMPONENT_MODIFIER_UNRESOLVED',
        'The adnominal modifier has no clear immediately following nominal target.',
        item,
      );
    }
  }

  for (const [index, item] of bunsetsu.entries()) {
    if (item.sentenceComponent !== undefined) continue;
    const adverbial = isAdverbialModifier(item) || isPurposeModifier(item, bunsetsu[index + 1]);
    const caseMarked = isPredicateCaseModifier(item);
    if (!adverbial && !caseMarked) continue;
    item.sentenceComponent = '修飾語';
    item.modifierKind = '連用修飾語';

    const followingPredicates = candidates.filter(
      (candidate) => candidate.start >= item.end,
    );
    const target = caseMarked
      ? predicate && predicate.start >= item.end ? predicate : undefined
      : followingPredicates.length === 1 && followingPredicates[0] === bunsetsu[index + 1]
        ? followingPredicates[0]
        : undefined;
    const resolvedTarget = target;
    if (!resolvedTarget || resolvedTarget.sentenceComponent !== '述語') {
      warning(
        'MODERN_COMPONENT_MODIFIER_UNRESOLVED',
        'The modifier target is ambiguous or has no resolved predicate.',
        item,
      );
      continue;
    }
    addRelation(item, '修飾先', resolvedTarget.id);
    addRelation(resolvedTarget, '修飾語', item.id);
  }

  const roles = new Map<number, ModernRenbunsetsu['sentenceComponent']>();
  if (predicate) roles.set(bunsetsu.indexOf(predicate), '述語');
  const renbunsetsu = buildRenbunsetsu(bunsetsu, subsidiaryRelations, roles);
  return {
    bunsetsu,
    diagnostics,
    ...(renbunsetsu.length > 0 ? { renbunsetsu } : {}),
    ...(predicate && renbunsetsu.length === subsidiaryRelations.length
      ? { sentenceType: '単文' as const } : {}),
  };
}

function analyzeDiscoveredClauses(
  bunsetsu: Bunsetsu[],
  discovered: readonly DiscoveredClause[],
  subsidiaryRelations: readonly SubsidiaryRelation[],
  diagnostics: Diagnostic[],
  warning: (code: string, message: string, target: Bunsetsu) => void,
): SentenceComponentResult {
  const clauses: ModernClause[] = [];
  const clauseById = new Map<string, ModernClause>();

  for (const item of discovered) {
    const predicate = bunsetsu[item.predicateIndex]!;
    const first = bunsetsu[item.bunsetsuIndexes[0] ?? item.predicateIndex]!;
    const predicateIndexes = subsidiaryMembers(subsidiaryRelations, item.predicateIndex)
      ?? [item.predicateIndex];
    const clause: ModernClause = {
      id: item.id,
      kind: item.kind,
      bunsetsuIds: item.bunsetsuIndexes.map((index) => bunsetsu[index]!.id),
      predicateBunsetsuId: predicate.id,
      ...(predicateIndexes.length > 1
        ? { predicateBunsetsuIds: predicateIndexes.map((index) => bunsetsu[index]!.id) } : {}),
      start: first.start,
      end: predicate.end,
    };
    clauses.push(clause);
    clauseById.set(clause.id, clause);
    for (const index of item.bunsetsuIndexes) bunsetsu[index]!.clauseId = clause.id;
    predicate.sentenceComponent = '述語';

    const members = item.bunsetsuIndexes.map((index) => bunsetsu[index]!);
    const candidates = members.filter((candidate) =>
      !predicateIndexes.includes(bunsetsu.indexOf(candidate))
      && candidate.sentenceComponent === undefined && isPredicateCandidate(candidate)
        && !isPurposeModifier(candidate, bunsetsu[bunsetsu.indexOf(candidate) + 1]),
    );
    for (const candidate of candidates) {
      warning(
        'MODERN_COMPONENT_PREDICATE_AMBIGUOUS',
        'Another predicate candidate in this clause could not be resolved reliably.',
        candidate,
      );
    }

    const subjects = members.filter(
      (candidate) => candidate.sentenceComponent === undefined && hasSubjectMarker(candidate),
    );
    for (const subject of subjects) subject.sentenceComponent = '主語';
    if (subjects.length === 0) {
      warning(
        'MODERN_COMPONENT_SUBJECT_UNRESOLVED',
        'No explicit subject bunsetsu was found in this clause; an omitted subject was not inferred.',
        predicate,
      );
    } else if (subjects.length === 1) {
      addRelation(subjects[0]!, '主語', predicate.id);
      addRelation(predicate, '述語', subjects[0]!.id);
    } else {
      for (const subject of subjects) {
        warning(
          'MODERN_COMPONENT_SUBJECT_AMBIGUOUS',
          'Multiple subject candidates prevent a reliable subject-predicate link in this clause.',
          subject,
        );
      }
    }

    for (const [index, candidate] of bunsetsu.entries()) {
      if (candidate.sentenceComponent !== undefined || !isAdnominalModifier(candidate)) continue;
      candidate.sentenceComponent = '修飾語';
      candidate.modifierKind = '連体修飾語';
      const target = bunsetsu[index + 1];
      if (target && target.clauseId === candidate.clauseId && hasNominalTarget(target)) {
        addRelation(candidate, '修飾先', target.id);
      } else {
        warning(
          'MODERN_COMPONENT_MODIFIER_UNRESOLVED',
          'The adnominal modifier has no clear immediately following nominal target in its clause.',
          candidate,
        );
      }
    }

    for (const candidate of members) {
      if (candidate.sentenceComponent !== undefined) continue;
      const adverbial = isAdverbialModifier(candidate)
        || isPurposeModifier(candidate, bunsetsu[bunsetsu.indexOf(candidate) + 1]);
      const caseMarked = isPredicateCaseModifier(candidate);
      if (!adverbial && !caseMarked) continue;
      candidate.sentenceComponent = '修飾語';
      candidate.modifierKind = '連用修飾語';
      const target = caseMarked
        ? candidate.end <= predicate.start ? predicate : undefined
        : bunsetsu[bunsetsu.indexOf(candidate) + 1] === predicate ? predicate : undefined;
      if (!target) {
        warning(
          'MODERN_COMPONENT_MODIFIER_UNRESOLVED',
          'The modifier target is ambiguous or has no resolved predicate in its clause.',
          candidate,
        );
        continue;
      }
      addRelation(candidate, '修飾先', target.id);
      addRelation(target, '修飾語', candidate.id);
    }
  }

  for (const item of discovered) {
    if (!item.relation) continue;
    const clause = clauseById.get(item.id)!;
    const target = item.kind === '連体修飾節'
      ? discovered.find((candidate) =>
        candidate.kind !== '連体修飾節'
        && candidate.bunsetsuIndexes.includes(item.targetIndex!),
      )
      : discovered.find((candidate) => candidate.kind === '主節')
        ?? discovered[discovered.length - 1];
    if (!target) continue;
    addClauseRelation(clause, item.relation, target.id);
    if (item.kind === '連体修飾節') {
      const predicate = bunsetsu[item.predicateIndex]!;
      addRelation(predicate, '修飾先', bunsetsu[item.targetIndex!]!.id);
    }
  }

  const clauseIds = new Set(clauses.map((clause) => clause.id));
  if (clauses.some((clause) =>
    clause.relations?.some((relation) => !clauseIds.has(relation.targetClauseId)),
  )) throw new Error('Internal error: unresolved modern clause relation target.');

  const roles = new Map<number, ModernRenbunsetsu['sentenceComponent']>();
  for (const item of discovered) {
    if (!subsidiaryMembers(subsidiaryRelations, item.predicateIndex)) continue;
    if (item.kind === '接続節') {
      roles.set(item.predicateIndex, '接続語');
      for (const member of item.bunsetsuIndexes) {
        if (bunsetsu[member]!.sentenceComponent === undefined) {
          bunsetsu[member]!.sentenceComponent = '接続語';
        }
      }
    } else {
      roles.set(item.predicateIndex, '述語');
      // For relative clauses (連体修飾節) with subsidiary relations,
      // assign the non-predicate members as modifiers within the clause
      if (item.kind === '連体修飾節') {
        const predicateIndexes = subsidiaryMembers(subsidiaryRelations, item.predicateIndex) ?? [item.predicateIndex];
        for (const member of item.bunsetsuIndexes) {
          if (!predicateIndexes.includes(member) && bunsetsu[member]!.sentenceComponent === undefined) {
            bunsetsu[member]!.sentenceComponent = '修飾語';
            bunsetsu[member]!.modifierKind = '連体修飾語';
          }
        }
        // For the renbunsetsu, the role should be '修飾語' for the whole group
        // since the relative clause as a whole modifies the target
        roles.set(item.predicateIndex, '修飾語');
      }
    }
  }
  const renbunsetsu = buildRenbunsetsu(bunsetsu, subsidiaryRelations, roles);
  const sentenceType: ModernSentenceType | undefined = discovered.some((item) => item.kind === '並立節')
    ? '重文' : '複文';
  return {
    bunsetsu,
    diagnostics,
    clauses,
    ...(renbunsetsu.length > 0 ? { renbunsetsu } : {}),
    sentenceType,
  };
}
