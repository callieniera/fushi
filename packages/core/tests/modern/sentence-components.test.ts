import { describe, expect, it } from 'vitest';
import { parseModernMorphemes } from '../../src/modern/pipeline.js';
import { analyzeModernSentenceComponents } from '../../src/modern/sentence-components.js';
import {
  adjective,
  auxiliary,
  da,
  morphemes,
  naStem,
  noun,
  particle,
  raw,
  verb,
} from './fixtures.js';

describe('modern 複文 and 重文 clause analysis', () => {
  it('treats an adjectival continuative form as a modifier of the main predicate', () => {
    const result = parseModernMorphemes(morphemes([
      noun('春'), particle('に', '格助詞'),
      verb('なる', 'なる', '五段・ラ行', '基本形'), particle('と', '接続助詞'),
      noun('桜'), particle('の', '連体化'),
      noun('花'), particle('が', '格助詞'),
      adjective('美しく', '美しい', '連用テ接続'),
      verb('咲き', '咲く', '五段・カ行促音便', '連用形'), auxiliary('ます', '特殊・マス'),
    ]));
    const [, subordinatePredicate, , , modifier, mainPredicate] = result.bunsetsu;

    expect(modifier).toMatchObject({
      sentenceComponent: '修飾語',
      sentenceRelations: [{ kind: '修飾先', targetBunsetsuId: mainPredicate!.id }],
    });
    expect(result.clauses?.map((clause) => clause.predicateBunsetsuId)).toEqual([
      subordinatePredicate!.id,
      mainPredicate!.id,
    ]);
    expect(result.diagnostics.filter(
      (issue) => issue.code === 'MODERN_COMPONENT_PREDICATE_AMBIGUOUS',
    )).toEqual([]);
  });

  it('resolves a causal subordinate clause and its main clause independently', () => {
    const result = parseModernMorphemes(morphemes([
      noun('雨'), particle('が', '格助詞'),
      verb('降っ', '降る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      particle('ので', '接続助詞'),
      raw('、', '記号'),
      noun('私', '代名詞'), particle('は', '係助詞'),
      noun('家'), particle('に', '格助詞'),
      verb('帰っ', '帰る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    const [subordinateSubject, subordinatePredicate, , mainSubject, location, mainPredicate] = result.bunsetsu;
    expect(subordinateSubject).toMatchObject({
      clauseId: 'modern-clause-0', sentenceComponent: '主語',
      sentenceRelations: [{ kind: '述語の対象', targetBunsetsuId: subordinatePredicate!.id }],
    });
    expect(mainSubject).toMatchObject({
      clauseId: 'modern-clause-1', sentenceComponent: '主語',
      sentenceRelations: [{ kind: '述語の対象', targetBunsetsuId: mainPredicate!.id }],
    });
    expect(location?.sentenceRelations).toEqual([{ kind: '修飾先', targetBunsetsuId: mainPredicate!.id }]);
    expect(result.clauses).toEqual([
      expect.objectContaining({
        id: 'modern-clause-0', kind: '副詞節', predicateBunsetsuId: subordinatePredicate!.id,
        bunsetsuIds: [subordinateSubject!.id, subordinatePredicate!.id],
        relations: [{ kind: '主節', targetClauseId: 'modern-clause-1' }],
      }),
      expect.objectContaining({
        id: 'modern-clause-1', kind: '主節', predicateBunsetsuId: mainPredicate!.id,
        bunsetsuIds: [result.bunsetsu[2]!.id, mainSubject!.id, location!.id, mainPredicate!.id],
      }),
    ]);
    expect(result.diagnostics.map((issue) => issue.code)).toEqual(['MODERN_POS_UNSUPPORTED']);
  });

  it('keeps a leading main-clause topic outside its embedded causal clause', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私', '代名詞'), particle('は', '係助詞'),
      noun('雨'), particle('が', '格助詞'),
      verb('降っ', '降る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      particle('ので', '接続助詞'),
      noun('家'), particle('に', '格助詞'),
      verb('帰っ', '帰る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.clauses?.map((clause) => clause.bunsetsuIds)).toEqual([
      ['modern-bunsetsu-1', 'modern-bunsetsu-2'],
      ['modern-bunsetsu-0', 'modern-bunsetsu-3', 'modern-bunsetsu-4'],
    ]);
    expect(result.bunsetsu[0]?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: 'modern-bunsetsu-4' },
    ]);
    expect(result.bunsetsu[1]?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: 'modern-bunsetsu-2' },
    ]);
  });

  it('links a relative predicate to its head and the head to the main predicate', () => {
    const result = parseModernMorphemes(morphemes([
      noun('子ども'), particle('が', '格助詞'),
      verb('読ん', '読む', '五段・マ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      noun('本'), particle('を', '格助詞'),
      noun('私', '代名詞'), particle('は', '係助詞'),
      verb('買っ', '買う', '五段・ワ行促音便', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    const [relativeSubject, relativePredicate, object, mainSubject, mainPredicate] = result.bunsetsu;
    expect(relativeSubject?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: relativePredicate!.id },
    ]);
    expect(relativePredicate).toMatchObject({
      clauseId: 'modern-clause-0', sentenceComponent: '述語',
      sentenceRelations: [
        { kind: '主語', targetBunsetsuId: relativeSubject!.id },
        { kind: '修飾先', targetBunsetsuId: object!.id },
      ],
    });
    expect(object).toMatchObject({
      clauseId: 'modern-clause-1', sentenceComponent: '修飾語',
      sentenceRelations: [{ kind: '修飾先', targetBunsetsuId: mainPredicate!.id }],
    });
    expect(mainSubject?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: mainPredicate!.id },
    ]);
    expect(result.clauses).toEqual([
      expect.objectContaining({
        kind: '連体修飾節', bunsetsuIds: [relativeSubject!.id, relativePredicate!.id],
        start: 0, end: relativePredicate!.end,
        relations: [{ kind: '修飾先', targetClauseId: 'modern-clause-1' }],
      }),
      expect.objectContaining({
        kind: '主節', bunsetsuIds: [object!.id, mainSubject!.id, mainPredicate!.id],
        start: object!.start, end: mainPredicate!.end,
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('resolves parallel predicates without making either one subordinate', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私', '代名詞'), particle('は', '係助詞'),
      noun('本'), particle('を', '格助詞'),
      verb('読ん', '読む', '五段・マ行', '連用タ接続'), particle('で', '接続助詞'),
      raw('、', '記号'),
      noun('弟'), particle('は', '係助詞'),
      noun('テレビ'), particle('を', '格助詞'),
      verb('見', '見る', '一段', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.clauses?.map((clause) => [clause.kind, clause.bunsetsuIds, clause.relations])).toEqual([
      ['並立節', ['modern-bunsetsu-0', 'modern-bunsetsu-1', 'modern-bunsetsu-2'], [
        { kind: '並立', targetClauseId: 'modern-clause-1' },
      ]],
      ['並立節', ['modern-bunsetsu-3', 'modern-bunsetsu-4', 'modern-bunsetsu-5', 'modern-bunsetsu-6'], undefined],
    ]);
    expect(result.bunsetsu[0]?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: 'modern-bunsetsu-2' },
    ]);
    expect(result.bunsetsu[4]?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: 'modern-bunsetsu-6' },
    ]);
    expect(result.diagnostics.map((issue) => issue.code)).toEqual(['MODERN_POS_UNSUPPORTED']);
  });

  it('keeps chained subordinate and parallel clauses disjoint', () => {
    const result = parseModernMorphemes(morphemes([
      noun('雨'), particle('が', '格助詞'),
      verb('降っ', '降る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      particle('ので', '接続助詞'),
      noun('傘'), particle('を', '格助詞'),
      verb('持っ', '持つ', '五段・タ行', '連用テ接続'), particle('て', '接続助詞'),
      verb('出かけ', '出かける', '一段', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.clauses?.map((clause) => [clause.kind, clause.bunsetsuIds, clause.relations])).toEqual([
      ['副詞節', ['modern-bunsetsu-0', 'modern-bunsetsu-1'], [
        { kind: '主節', targetClauseId: 'modern-clause-2' },
      ]],
      ['並立節', ['modern-bunsetsu-2', 'modern-bunsetsu-3'], [
        { kind: '並立', targetClauseId: 'modern-clause-2' },
      ]],
      ['並立節', ['modern-bunsetsu-4'], undefined],
    ]);
    const membership = result.bunsetsu.flatMap((item) => item.clauseId ? [item.clauseId] : []);
    expect(membership).toHaveLength(result.bunsetsu.length);
    expect(result.clauses?.flatMap((clause) => clause.bunsetsuIds)).toHaveLength(result.bunsetsu.length);
    expect(new Set(result.clauses?.flatMap((clause) => clause.bunsetsuIds)).size).toBe(result.bunsetsu.length);
  });

  it('assigns a shared main topic only to the final containing predicate', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私', '代名詞'), particle('は', '係助詞'),
      noun('雨'), particle('が', '格助詞'),
      verb('降っ', '降る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      particle('ので', '接続助詞'),
      noun('傘'), particle('を', '格助詞'),
      verb('持っ', '持つ', '五段・タ行', '連用テ接続'), particle('て', '接続助詞'),
      verb('出かけ', '出かける', '一段', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.bunsetsu[0]).toMatchObject({
      clauseId: 'modern-clause-2', sentenceComponent: '主語',
      sentenceRelations: [{ kind: '述語の対象', targetBunsetsuId: 'modern-bunsetsu-5' }],
    });
    expect(result.clauses?.flatMap((clause) => clause.bunsetsuIds)).toHaveLength(result.bunsetsu.length);
    expect(result.clauses?.map((clause) => clause.bunsetsuIds)).toEqual([
      ['modern-bunsetsu-1', 'modern-bunsetsu-2'],
      ['modern-bunsetsu-3', 'modern-bunsetsu-4'],
      ['modern-bunsetsu-0', 'modern-bunsetsu-5'],
    ]);
  });

  it('keeps consecutive subordinate clauses and their final clause disjoint', () => {
    const result = parseModernMorphemes(morphemes([
      noun('雨'), particle('が', '格助詞'),
      verb('降っ', '降る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      particle('ので', '接続助詞'),
      noun('道'), particle('が', '格助詞'),
      adjective('危なかっ', '危ない', '連用タ接続'), auxiliary('た', '特殊・タ'),
      particle('から', '接続助詞'),
      verb('歩か', '歩く', '五段・カ行促音便', '未然形'), auxiliary('ない', '特殊・ナイ'),
    ]));
    expect(result.clauses).toBeDefined();
    expect(result.clauses?.flatMap((clause) => clause.bunsetsuIds)).toHaveLength(result.bunsetsu.length);
    expect(new Set(result.clauses?.flatMap((clause) => clause.bunsetsuIds)).size).toBe(result.bunsetsu.length);
  });

  it('leaves an unsupported nested relative structure unresolved', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私', '代名詞'), particle('は', '係助詞'),
      noun('弟'), particle('が', '格助詞'),
      verb('読ん', '読む', '五段・マ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      noun('本'), particle('を', '格助詞'),
      noun('妹'), particle('が', '格助詞'),
      verb('買っ', '買う', '五段・ワ行促音便', '連用タ接続'), auxiliary('た', '特殊・タ'),
      noun('店'), particle('に', '格助詞'),
      verb('行っ', '行く', '五段・カ行促音便', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.clauses).toBeUndefined();
    expect(result.bunsetsu.every((item) => item.clauseId === undefined)).toBe(true);
    expect(result.diagnostics.some(
      (issue) => issue.code === 'MODERN_COMPONENT_SUBJECT_AMBIGUOUS',
    )).toBe(true);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'MODERN_COMPONENT_CLAUSE_UNRESOLVED', severity: 'warning',
    }));
  });

  it('does not split a supplementary predicate into a parallel clause', () => {
    const result = parseModernMorphemes(morphemes([
      verb('読ん', '読む', '五段・マ行', '連用タ接続'), particle('で', '接続助詞'),
      verb('いる', 'いる', '一段', '基本形', '非自立'),
    ]));
    expect(result.clauses).toBeUndefined();
    expect(result.bunsetsu.map((item) => item.sentenceComponent)).toEqual([undefined, '述語']);
  });

  it('keeps a main topic outside a relative clause and resolves the head locally', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私', '代名詞'), particle('は', '係助詞'),
      noun('子ども'), particle('が', '格助詞'),
      verb('読ん', '読む', '五段・マ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      noun('本'), particle('を', '格助詞'),
      verb('買っ', '買う', '五段・ワ行促音便', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.clauses?.map((clause) => clause.bunsetsuIds)).toEqual([
      ['modern-bunsetsu-1', 'modern-bunsetsu-2'],
      ['modern-bunsetsu-0', 'modern-bunsetsu-3', 'modern-bunsetsu-4'],
    ]);
    expect(result.bunsetsu[0]?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: 'modern-bunsetsu-4' },
    ]);
    expect(result.bunsetsu[1]?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: 'modern-bunsetsu-2' },
    ]);
  });

  it('preserves clause metadata and input immutability for direct analyzer callers', () => {
    const input = parseModernMorphemes(morphemes([
      noun('雨'), particle('が', '格助詞'),
      verb('降っ', '降る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      particle('ので', '接続助詞'),
      verb('帰っ', '帰る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    const snapshot = structuredClone(input.bunsetsu);
    const result = analyzeModernSentenceComponents(input.bunsetsu);
    expect(input.bunsetsu).toEqual(snapshot);
    expect(result.clauses).toEqual(input.clauses);
    expect(result.bunsetsu).toEqual(input.bunsetsu);
    const ids = new Set(result.clauses?.map((clause) => clause.id));
    expect(result.clauses?.every((clause) =>
      clause.relations?.every((relation) => ids.has(relation.targetClauseId)) ?? true,
    )).toBe(true);
    for (const clause of result.clauses ?? []) {
      const members = clause.bunsetsuIds.map((id) => result.bunsetsu.find((item) => item.id === id));
      expect(members.every((item) => item?.clauseId === clause.id)).toBe(true);
      expect(clause.bunsetsuIds).toContain(clause.predicateBunsetsuId);
      expect(clause.start).toBe(members[0]?.start);
      expect(clause.end).toBe(result.bunsetsu.find(
        (item) => item.id === clause.predicateBunsetsuId,
      )?.end);
      expect(clause.bunsetsuIds).toEqual(
        [...clause.bunsetsuIds].sort((a, b) =>
          result.bunsetsu.find((item) => item.id === a)!.start
          - result.bunsetsu.find((item) => item.id === b)!.start,
        ),
      );
    }
    expect(result.diagnostics.filter(
      (issue) => issue.code === 'MODERN_COMPONENT_SUBJECT_UNRESOLVED',
    )).toHaveLength(2);
  });
});

describe('modern sentence components and basic 係り受け', () => {
  it('links the explicit subject and object modifier to the predicate', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私', '代名詞'), particle('は', '係助詞'),
      noun('本'), particle('を', '格助詞'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    const [subject, object, predicate] = result.bunsetsu;

    expect(subject).toMatchObject({
      sentenceComponent: '主語',
      sentenceRelations: [{ kind: '述語の対象', targetBunsetsuId: predicate!.id }],
    });
    expect(object).toMatchObject({
      sentenceComponent: '修飾語',
      sentenceRelations: [{ kind: '修飾先', targetBunsetsuId: predicate!.id }],
    });
    expect(predicate).toMatchObject({
      sentenceComponent: '述語',
      sentenceRelations: [
        { kind: '主語', targetBunsetsuId: subject!.id },
        { kind: '述語の修飾語', targetBunsetsuId: object!.id },
      ],
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('identifies a が subject without labeling other case-marked bunsetsu as subjects', () => {
    const result = parseModernMorphemes(morphemes([
      noun('子ども'), particle('が', '格助詞'),
      noun('菓子'), particle('を', '格助詞'),
      verb('食べ', '食べる', '一段', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.bunsetsu.map((item) => item.sentenceComponent)).toEqual(['主語', '修飾語', '述語']);
    expect(result.bunsetsu[0]?.sentenceRelations).toEqual([
      { kind: '述語の対象', targetBunsetsuId: 'modern-bunsetsu-2' },
    ]);
  });

  it('links a nominal の modifier to the following nominal bunsetsu', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私', '代名詞'), particle('の', '連体化'),
      noun('本'), particle('を', '格助詞'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    const [modifier, object, predicate] = result.bunsetsu;

    expect(modifier).toMatchObject({
      sentenceComponent: '修飾語',
      sentenceRelations: [{ kind: '修飾先', targetBunsetsuId: object!.id }],
    });
    expect(object?.sentenceComponent).toBe('修飾語');
    expect(predicate?.sentenceComponent).toBe('述語');
    expect(result.diagnostics.some(
      (issue) => issue.code === 'MODERN_COMPONENT_MODIFIER_UNRESOLVED' && issue.start === modifier!.start,
    )).toBe(false);
  });

  it('handles adnominal and predicate modifiers in one sentence', () => {
    const result = parseModernMorphemes(morphemes([
      naStem('静か'), da('な', '体言接続'),
      noun('公園'), particle('で', '格助詞'),
      noun('友達'), particle('と', '格助詞'),
      verb('話し', '話す', '五段・サ行', '連用形'), auxiliary('まし', '特殊・マス', '連用タ接続'),
      auxiliary('た', '特殊・タ'),
    ]));
    const [adnominal, location, companion, predicate] = result.bunsetsu;

    expect(adnominal).toMatchObject({
      sentenceComponent: '修飾語',
      sentenceRelations: [{ kind: '修飾先', targetBunsetsuId: location!.id }],
    });
    expect(location?.sentenceRelations).toEqual([{ kind: '修飾先', targetBunsetsuId: predicate!.id }]);
    expect(companion?.sentenceRelations).toEqual([{ kind: '修飾先', targetBunsetsuId: predicate!.id }]);
    expect(predicate?.sentenceComponent).toBe('述語');
    expect(result.diagnostics.some((issue) => issue.code === 'MODERN_COMPONENT_MODIFIER_UNRESOLVED')).toBe(false);
  });

  it('links an adverb to a single immediately following predicate', () => {
    const result = parseModernMorphemes(morphemes([
      raw('とても', '副詞', { posDetail1: '一般' }),
      adjective('面白かっ', '面白い', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    const [adverb, predicate] = result.bunsetsu;
    expect(adverb).toMatchObject({
      sentenceComponent: '修飾語',
      sentenceRelations: [{ kind: '修飾先', targetBunsetsuId: predicate!.id }],
    });
    expect(predicate?.sentenceRelations).toEqual([
      { kind: '述語の修飾語', targetBunsetsuId: adverb!.id },
    ]);
    expect(result.diagnostics.some((issue) => issue.code === 'MODERN_COMPONENT_SUBJECT_UNRESOLVED')).toBe(true);
  });

  it('does not invent a nominal target for a準体助詞 construction', () => {
    const result = parseModernMorphemes(morphemes([
      adjective('赤い', '赤い'), particle('の', '名詞化'), particle('を', '格助詞'),
      verb('選ぶ', '選ぶ', '五段・バ行', '基本形'),
    ]));
    const [object, predicate] = result.bunsetsu;
    expect(object).toMatchObject({
      sentenceComponent: '修飾語',
      sentenceRelations: [{ kind: '修飾先', targetBunsetsuId: predicate!.id }],
    });
    expect(result.diagnostics.some((issue) => issue.code === 'MODERN_COMPONENT_MODIFIER_UNRESOLVED')).toBe(false);
  });

  it('recognizes 接続語 and 独立語', () => {
    const result = parseModernMorphemes(morphemes([
      raw('はい', '感動詞'),
      raw('そして', '接続詞'),
      noun('本'), particle('を', '格助詞'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    expect(result.bunsetsu.map((item) => item.sentenceComponent)).toEqual([
      '独立語', '接続語', '修飾語', '述語',
    ]);
  });

  it('reports an omitted subject instead of inventing one', () => {
    const result = parseModernMorphemes(morphemes([
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    expect(result.bunsetsu[0]).toMatchObject({ sentenceComponent: '述語' });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'MODERN_COMPONENT_SUBJECT_UNRESOLVED',
      severity: 'warning',
      start: 0,
      end: 2,
      tangoIds: ['modern-tango-0'],
    }));
  });

  it('leaves multiple predicate candidates and subject links unresolved', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私'), particle('は', '係助詞'),
      verb('走っ', '走る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    expect(result.bunsetsu[0]?.sentenceComponent).toBe('主語');
    expect(result.bunsetsu.slice(1).every((item) => item.sentenceComponent === undefined)).toBe(true);
    expect(result.bunsetsu.every((item) => item.sentenceRelations === undefined)).toBe(true);
    expect(result.diagnostics.filter(
      (issue) => issue.code === 'MODERN_COMPONENT_PREDICATE_AMBIGUOUS',
    )).toHaveLength(2);
    expect(result.diagnostics.some((issue) => issue.code === 'MODERN_COMPONENT_PREDICATE_UNRESOLVED')).toBe(true);
  });

  it('does not guess a modifier target when multiple predicates follow', () => {
    const result = parseModernMorphemes(morphemes([
      raw('速く', '副詞', { posDetail1: '一般' }),
      verb('走っ', '走る', '五段・ラ行', '連用タ接続'), auxiliary('た', '特殊・タ'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    expect(result.bunsetsu[0]?.sentenceComponent).toBeUndefined();
    expect(result.bunsetsu.every((item) => item.sentenceRelations === undefined)).toBe(true);
    expect(result.diagnostics.some((issue) => issue.code === 'MODERN_COMPONENT_MODIFIER_UNRESOLVED')).toBe(true);
  });

  it('leaves an adnominal modifier unresolved when no nominal target follows', () => {
    const result = parseModernMorphemes(morphemes([
      raw('この', '連体詞'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    expect(result.bunsetsu[0]?.sentenceComponent).toBeUndefined();
    expect(result.bunsetsu[0]?.sentenceRelations).toBeUndefined();
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      code: 'MODERN_COMPONENT_MODIFIER_UNRESOLVED',
      start: 0,
      end: 2,
    }));
  });

  it('does not mutate input, preserves spans and emits valid deterministic targets', () => {
    const input = morphemes([
      noun('私'), particle('は', '係助詞'), noun('本'), particle('を', '格助詞'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]);
    const snapshot = structuredClone(input);
    const first = parseModernMorphemes(input);
    const second = parseModernMorphemes(input);
    expect(input).toEqual(snapshot);
    expect(second).toEqual(first);
    expect(first.bunsetsu.map((item) => [item.id, item.start, item.end])).toEqual([
      ['modern-bunsetsu-0', 0, 2],
      ['modern-bunsetsu-1', 2, 4],
      ['modern-bunsetsu-2', 4, 6],
    ]);

    const ids = new Set(first.bunsetsu.map((item) => item.id));
    for (const item of first.bunsetsu) {
      for (const relation of item.sentenceRelations ?? []) {
        expect(ids.has(relation.targetBunsetsuId)).toBe(true);
      }
    }

    const originalBunsetsu = structuredClone(first.bunsetsu);
    const direct = analyzeModernSentenceComponents(originalBunsetsu);
    expect(originalBunsetsu).toEqual(first.bunsetsu);
    expect(direct.bunsetsu).toEqual(first.bunsetsu);
  });
});
