import { describe, expect, it } from 'vitest';
import { parseModernMorphemes } from '../../src/modern/pipeline.js';
import { adjective, auxiliary, da, morphemes, naStem, noun, particle, prefix, raw, suffix, symbol, verb } from './fixtures.js';

describe('bunsetsu grouping and interacting rules', () => {
  it('groups 食べている in one bunsetsu without merging the words', () => {
    const result = parseModernMorphemes(morphemes([
      verb('食べ', '食べる', '一段', '連用形'),
      particle('て', '接続助詞'),
      verb('いる', 'いる', '一段', '基本形', '非自立'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['食べている']);
    expect(result.bunsetsu[0]?.tango.map((t) => t.hinshi)).toEqual(['動詞', '助詞', '動詞']);
    expect(result.bunsetsu[0]?.tango[2]).toMatchObject({
      hinshi: '動詞', subHinshi: '補助動詞', isIndependent: true,
    });
  });

  it('groups 食べてしまう in one bunsetsu', () => {
    const result = parseModernMorphemes(morphemes([
      verb('食べ', '食べる', '一段', '連用形'),
      particle('て', '接続助詞'),
      verb('しまう', 'しまう', '五段・ワ行促音便', '基本形', '非自立'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['食べてしまう']);
  });

  it('handles a full sentence with prefixes, suffixes, na-adjectives and auxiliaries', () => {
    const result = parseModernMorphemes(morphemes([
      prefix('お'), noun('菓子'), particle('を', '格助詞'),
      verb('食べ', '食べる', '一段', '連用形'), particle('て', '接続助詞'),
      verb('い', 'いる', '一段', '未然形', '非自立'), auxiliary('ない', '特殊・ナイ'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['お菓子を', '食べていない']);
    expect(result.bunsetsu[0]?.tango[0]?.rawMorphemes).toHaveLength(2);
    expect(result.bunsetsu[1]?.tango[3]).toMatchObject({ hinshi: '助動詞', subHinshi: '打消' });
  });

  it('handles 静かではない without merging は into the adjectival verb', () => {
    const result = parseModernMorphemes(morphemes([
      naStem('静か'), da('で', '連用形'), particle('は', '係助詞'),
      adjective('ない', 'ない'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['静かでは', 'ない']);
    expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ surface: '静かで', hinshi: '形容動詞', katsuyoukei: '連用形' });
    expect(result.bunsetsu[1]?.tango[0]).toMatchObject({ hinshi: '形容詞', subHinshi: '補助形容詞' });
  });

  it('handles 静かさを and preserves suffix source offsets', () => {
    const result = parseModernMorphemes(morphemes([
      naStem('静か'), suffix('さ', '特殊'), particle('を', '格助詞'),
      verb('確かめ', '確かめる', '一段', '連用形'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['静かさを', '確かめた']);
    expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ start: 0, end: 3, hinshi: '名詞' });
  });

  it('handles 大きな家と大きい犬', () => {
    const result = parseModernMorphemes(morphemes([
      raw('大きな', '連体詞'), noun('家'), particle('と', '格助詞'),
      adjective('大きい', '大きい'), noun('犬'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['大きな', '家と', '大きい', '犬']);
    expect(result.bunsetsu[0]?.tango[0]?.hinshi).toBe('連体詞');
    expect(result.bunsetsu[2]?.tango[0]).toMatchObject({ hinshi: '形容詞', katsuyoukei: '連体形' });
  });

  it('handles 同じだ and いろいろな in one sentence', () => {
    const result = parseModernMorphemes(morphemes([
      raw('同じ', '連体詞'), da(), particle('が', '接続助詞'),
      naStem('いろいろ'), da('な', '体言接続'), noun('意見'), particle('が', '格助詞'),
      verb('ある', 'ある', '五段・ラ行', '基本形'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['同じだが', 'いろいろな', '意見が', 'ある']);
    expect(result.bunsetsu[0]?.tango.map((t) => t.hinshi)).toEqual(['形容動詞', '助詞']);
    expect(result.bunsetsu[1]?.tango[0]).toMatchObject({ hinshi: '形容動詞', katsuyoukei: '連体形' });
  });

  it('handles 行こうと思う with volitional alignment', () => {
    const result = parseModernMorphemes(morphemes([
      verb('行こ', '行く', '五段・カ行促音便', '未然ウ接続'), auxiliary('う'),
      particle('と', '格助詞'), verb('思う', '思う', '五段・ワ行促音便', '基本形'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['行こうと', '思う']);
    expect(result.bunsetsu[0]?.tango[0]?.katsuyoukei).toBe('未然形');
  });

  it('handles 雨が降りそうだ and keeps そうだ dependent', () => {
    const result = parseModernMorphemes(morphemes([
      noun('雨'), particle('が', '格助詞'), verb('降り', '降りる', '一段', '連用形'),
      raw('そう', '名詞', { posDetail1: '接尾', posDetail2: '助動詞語幹' }), da(),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['雨が', '降りそうだ']);
    expect(result.bunsetsu[1]?.tango[1]).toMatchObject({ surface: 'そうだ', hinshi: '助動詞', subHinshi: '様態', isIndependent: false });
  });

  it('handles 雨が降るそうだ as hearsay', () => {
    const result = parseModernMorphemes(morphemes([
      noun('雨'), particle('が', '格助詞'), verb('降る', '降る', '五段・ラ行', '基本形'),
      raw('そう', '名詞', { posDetail1: '特殊', posDetail2: '助動詞語幹' }), da(),
    ]));
    expect(result.bunsetsu[1]?.tango[1]).toMatchObject({ surface: 'そうだ', subHinshi: '伝聞' });
  });

  it('handles 読んでしまった with phonetic change and supplementary verb', () => {
    const result = parseModernMorphemes(morphemes([
      verb('読ん', '読む', '五段・マ行', '連用タ接続'), particle('で', '接続助詞'),
      verb('しまっ', 'しまう', '五段・ワ行促音便', '連用タ接続', '非自立'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['読んでしまった']);
    expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ katsuyoukei: '連用形', katsuyouType: '五段' });
  });

  it('handles 美しくはない as two bunsetsu', () => {
    const result = parseModernMorphemes(morphemes([
      adjective('美しく', '美しい', '連用テ接続'), particle('は', '係助詞'), adjective('ない', 'ない'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['美しくは', 'ない']);
    expect(result.bunsetsu[1]?.tango[0]?.hinshi).toBe('形容詞');
  });

  it('handles 私の本を読む', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私', '代名詞'), particle('の', '連体化'), noun('本'), particle('を', '格助詞'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['私の', '本を', '読む']);
    expect(result.bunsetsu[0]?.tango[1]?.subHinshi).toBe('格助詞');
  });

  it('handles 赤いのを選ぶ', () => {
    const result = parseModernMorphemes(morphemes([
      adjective('赤い', '赤い'), particle('の', '名詞化'), particle('を', '格助詞'),
      verb('選ぶ', '選ぶ', '五段・バ行', '基本形'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['赤いのを', '選ぶ']);
    expect(result.bunsetsu[0]?.tango[1]?.subHinshi).toBe('準体助詞');
  });

  it('handles 学校に行く', () => {
    const result = parseModernMorphemes(morphemes([
      noun('学校'), particle('に', '格助詞'), verb('行く', '行く', '五段・カ行促音便', '基本形'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['学校に', '行く']);
  });

  it('handles 静かに歩く as one adjectival token', () => {
    const result = parseModernMorphemes(morphemes([
      naStem('静か'), particle('に', '副詞化'), verb('歩く', '歩く', '五段・カ行イ音便', '基本形'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['静かに', '歩く']);
    expect(result.bunsetsu[0]?.tango).toHaveLength(1);
  });

  it('handles 学生だった', () => {
    const result = parseModernMorphemes(morphemes([
      noun('学生'), da('だっ', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.bunsetsu).toHaveLength(1);
    expect(result.bunsetsu[0]?.tango.map((t) => [t.surface, t.katsuyoukei])).toEqual([
      ['学生', undefined], ['だっ', '連用形'], ['た', '終止形'],
    ]);
  });

  it('uses 連体形 before ので and のに', () => {
    for (const particleSurface of ['ので', 'のに']) {
      const result = parseModernMorphemes(morphemes([
        verb('降る', '降る', '五段・ラ行', '基本形'), particle(particleSurface, '接続助詞'),
        verb('帰る', '帰る', '五段・ラ行', '基本形'),
      ]));
      expect(result.bunsetsu[0]?.tango[0]?.katsuyoukei).toBe('連体形');
    }
  });

  it('handles 読めば with a conditional base', () => {
    const result = parseModernMorphemes(morphemes([
      verb('読め', '読む', '五段・マ行', '仮定形'), particle('ば', '接続助詞'),
    ]));
    expect(result.bunsetsu[0]?.tango[0]?.katsuyoukei).toBe('仮定形');
  });

  it('handles 読め with an imperative base', () => {
    const result = parseModernMorphemes(morphemes([verb('読め', '読む', '五段・マ行', '命令形')]));
    expect(result.bunsetsu[0]?.tango[0]?.katsuyoukei).toBe('命令形');
  });

  it('handles 子どもたちがお菓子を食べた', () => {
    const result = parseModernMorphemes(morphemes([
      noun('子ども'), suffix('たち'), particle('が', '格助詞'),
      prefix('お'), noun('菓子'), particle('を', '格助詞'),
      verb('食べ', '食べる', '一段', '連用タ接続'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['子どもたちが', 'お菓子を', '食べた']);
    expect(result.bunsetsu[0]?.tango[0]?.rawMorphemes).toHaveLength(2);
    expect(result.bunsetsu[1]?.tango[0]?.rawMorphemes).toHaveLength(2);
  });

  it('stops at ordinary bunsetsu without sentence-level analysis', () => {
    const result = parseModernMorphemes(morphemes([
      noun('雨'), particle('が', '格助詞'),
      verb('降っ', '降る', '五段・ラ行', '連用タ接続'), particle('て', '接続助詞'),
      verb('いる', 'いる', '一段', '基本形', '非自立'), particle('ので', '接続助詞'),
      noun('傘'), particle('を', '格助詞'),
      verb('持っ', '持つ', '五段・タ行', '連用タ接続'), particle('て', '接続助詞'),
      verb('行き', '行く', '五段・カ行促音便', '連用形', '非自立'),
      auxiliary('ましょ', '特殊・マス', '未然ウ接続', 'ます'), auxiliary('う', '不変化型', '基本形', 'う'),
    ]));
    expect(result.bunsetsu.map((item) => item.tango.map((tango) => tango.surface).join('')))
      .toEqual(['雨が', '降っているので', '傘を', '持って', '行きましょう']);
    expect(result.bunsetsu[1]?.tango[2]?.subHinshi).toBe('補助動詞');
    expect(result.bunsetsu[4]?.tango[0]).toMatchObject({
      surface: '行き', baseForm: '行く', subHinshi: '自立', katsuyoukei: '連用形',
    });
    expect(result).toEqual({
      mode: 'modern',
      text: '雨が降っているので傘を持って行きましょう',
      bunsetsu: result.bunsetsu,
      diagnostics: [],
    });
    expect(result.bunsetsu.every((item) => Object.keys(item).sort().join(',') === 'end,id,start,tango')).toBe(true);
  });
});

describe('main-motion 行く/来る distinctions', () => {
  it.each([
    {
      name: 'kanji after a transport verb',
      input: [verb('持っ', '持つ', '五段・タ行', '連用タ接続'), particle('て', '接続助詞'), verb('行き', '行く', '五段・カ行促音便', '連用形', '非自立'), auxiliary('ます', '特殊・マス')],
      surface: '行き',
      bunsetsu: ['持って', '行きます'],
    },
    {
      name: 'kanji 来る after で and a transport verb',
      input: [verb('運ん', '運ぶ', '五段・バ行', '連用タ接続'), particle('で', '接続助詞'), verb('来る', '来る', 'カ変・来ル', '基本形', '非自立')],
      surface: '来る',
      bunsetsu: ['運んで', '来る'],
    },
  ])('classifies $name as main motion', ({ input, surface, bunsetsu }) => {
    const result = parseModernMorphemes(morphemes(input));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(bunsetsu);
    const token = result.bunsetsu.flatMap((b) => b.tango).find((t) => t.surface === surface);
    expect(token).toMatchObject({ hinshi: '動詞', subHinshi: '自立', isIndependent: true });
    expect(token?.rawMorphemes?.[0]?.posDetail1).toBe('非自立');
    expect(result.bunsetsu.flatMap((b) => b.tango).flatMap((t) => t.rawMorphemes ?? [])).toEqual(morphemes(input));
    expect(result.diagnostics).toEqual([]);
  });

  it.each([
    {
      name: 'gradual decrease',
      input: [noun('人口'), particle('が', '格助詞'), verb('減っ', '減る', '五段・ラ行', '連用タ接続'), particle('て', '接続助詞'), verb('いく', 'いく', '五段・カ行促音便', '基本形', '非自立')],
      surface: 'いく',
      bunsetsu: ['人口が', '減っていく'],
    },
    {
      name: 'becoming accustomed',
      input: [verb('慣れ', '慣れる', '一段', '連用形'), particle('て', '接続助詞'), verb('くる', 'くる', 'カ変・クル', '基本形', '非自立')],
      surface: 'くる',
      bunsetsu: ['慣れてくる'],
    },
    {
      name: 'continuing to read',
      input: [verb('読ん', '読む', '五段・マ行', '連用タ接続'), particle('で', '接続助詞'), verb('いく', 'いく', '五段・カ行促音便', '基本形', '非自立')],
      surface: 'いく',
      bunsetsu: ['読んでいく'],
    },
    {
      name: 'becoming cold',
      input: [adjective('寒く', '寒い', '連用テ接続'), verb('なっ', 'なる', '五段・ラ行', '連用タ接続'), particle('て', '接続助詞'), verb('くる', 'くる', 'カ変・クル', '基本形', '非自立')],
      surface: 'くる',
      bunsetsu: ['寒く', 'なってくる'],
    },
    {
      name: 'kana after a transport verb',
      input: [verb('持っ', '持つ', '五段・タ行', '連用タ接続'), particle('て', '接続助詞'), verb('いき', 'いく', '五段・カ行促音便', '連用形', '非自立'), auxiliary('ます', '特殊・マス')],
      surface: 'いき',
      bunsetsu: ['持っていきます'],
    },
    {
      name: 'kanji after a non-curated host',
      input: [verb('読ん', '読む', '五段・マ行', '連用タ接続'), particle('で', '接続助詞'), verb('来る', '来る', 'カ変・来ル', '基本形', '非自立')],
      surface: '来る',
      bunsetsu: ['読んで来る'],
    },
    {
      name: 'goal particles are not classification signals',
      input: [noun('学校'), particle('へ', '格助詞'), verb('戻っ', '戻る', '五段・ラ行', '連用タ接続'), particle('て', '接続助詞'), verb('行く', '行く', '五段・カ行促音便', '基本形', '非自立')],
      surface: '行く',
      bunsetsu: ['学校へ', '戻って行く'],
    },
  ])('preserves the subsidiary reading for $name', ({ input, surface, bunsetsu }) => {
    const result = parseModernMorphemes(morphemes(input));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(bunsetsu);
    expect(result.bunsetsu.flatMap((b) => b.tango).find((t) => t.surface === surface))
      .toMatchObject({ hinshi: '動詞', subHinshi: '補助動詞', isIndependent: true });
    expect(result.diagnostics).toEqual([]);
  });

  it('does not reuse a goal particle from an earlier clause', () => {
    const result = parseModernMorphemes(morphemes([
      noun('学校'), particle('へ', '格助詞'),
      verb('行っ', '行く', '五段・カ行促音便', '連用タ接続'), auxiliary('た', '特殊・タ'),
      particle('ので', '接続助詞'), symbol('、'),
      verb('読ん', '読む', '五段・マ行', '連用タ接続'), particle('で', '接続助詞'),
      verb('いく', 'いく', '五段・カ行促音便', '基本形', '非自立'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join('')))
      .toEqual(['学校へ', '行ったので', '、', '読んでいく']);
    expect(result.bunsetsu.at(-1)?.tango.at(-1)?.subHinshi).toBe('補助動詞');
  });

  it('leaves an already independent verb after ては unchanged', () => {
    const result = parseModernMorphemes(morphemes([
      verb('持っ', '持つ', '五段・タ行', '連用タ接続'), particle('て', '接続助詞'),
      particle('は', '係助詞'), verb('行き', '行く', '五段・カ行促音便', '連用形'), auxiliary('ます', '特殊・マス'),
    ]));
    expect(result.bunsetsu.map((b) => b.tango.map((t) => t.surface).join(''))).toEqual(['持っては', '行きます']);
    expect(result.bunsetsu[1]?.tango[0]).toMatchObject({ subHinshi: '自立', isIndependent: true });
  });
});

describe('overlapping normalization precedence', () => {
  it('merges a prefix with an already reconstructed adjectival verb', () => {
    const result = parseModernMorphemes(morphemes([prefix('お'), naStem('静か'), da()]));
    expect(result.bunsetsu[0]?.tango[0]).toMatchObject({
      surface: 'お静かだ', hinshi: '形容動詞', katsuyoukei: '終止形', start: 0, end: 4,
    });
    expect(result.bunsetsu[0]?.tango[0]?.rawMorphemes).toHaveLength(3);
  });

  it('does not merge a suffix across an adjectival ending', () => {
    const result = parseModernMorphemes(morphemes([naStem('静か'), da(), suffix('的')]));
    expect(result.bunsetsu.flatMap((b) => b.tango).map((t) => t.surface)).toEqual(['静かだ', '的']);
    expect(result.diagnostics.some((d) => d.code === 'MODERN_NORMALIZE_ORPHAN_SUFFIX')).toBe(true);
  });

  it('classifies inflected ない using its base form', () => {
    const result = parseModernMorphemes(morphemes([
      verb('行か', '行く', '五段・カ行促音便', '未然形'), auxiliary('なかっ', '特殊・ナイ', '連用タ接続', 'ない'), auxiliary('た', '特殊・タ'),
    ]));
    expect(result.bunsetsu[0]?.tango[1]).toMatchObject({ surface: 'なかっ', hinshi: '助動詞', subHinshi: '打消', katsuyoukei: '連用形' });
  });

  it('classifies inflected れる using its base form', () => {
    const result = parseModernMorphemes(morphemes([
      verb('読ま', '読む', '五段・マ行', '未然形'), auxiliary('れれ', '一段', '仮定形', 'れる'), particle('ば', '接続助詞'),
    ]));
    expect(result.bunsetsu[0]?.tango[1]).toMatchObject({ hinshi: '助動詞', subHinshi: '受身・自発・可能・尊敬', katsuyoukei: '仮定形' });
    expect(result.diagnostics.some((d) => d.code === 'MODERN_RERU_AMBIGUOUS')).toBe(true);
  });

  it('recognizes IPAdic 格助詞-連体 の', () => {
    const result = parseModernMorphemes(morphemes([noun('私'), particle('の', '格助詞', '連体'), noun('本')]));
    expect(result.bunsetsu[0]?.tango[1]?.subHinshi).toBe('格助詞');
  });
});

describe('best-effort diagnostics and invariants', () => {
  it('reports unsupported POS while retaining the token', () => {
    const result = parseModernMorphemes(morphemes([raw('Ｘ', '未知語')]));
    expect(result.bunsetsu[0]?.tango[0]).toMatchObject({ surface: 'Ｘ', hinshi: '名詞', subHinshi: '未知語' });
    expect(result.diagnostics[0]).toMatchObject({ code: 'MODERN_POS_UNSUPPORTED', severity: 'warning', start: 0, end: 1, morphemeIds: [0] });
  });

  it('reports unsupported conjugation type', () => {
    const result = parseModernMorphemes(morphemes([verb('読む', '読む', '未知活用', '基本形')]));
    expect(result.bunsetsu[0]?.tango[0]?.katsuyouType).toBe('その他');
    expect(result.diagnostics.some((d) => d.code === 'MODERN_KATSUYOU_TYPE_UNSUPPORTED')).toBe(true);
  });

  it('reports an unsupported auxiliary conjugation type', () => {
    const result = parseModernMorphemes(morphemes([noun('本'), auxiliary('です', '未知活用')]));
    expect(result.bunsetsu[0]?.tango[1]?.katsuyouType).toBe('その他');
    expect(result.diagnostics.some((d) => d.code === 'MODERN_KATSUYOU_TYPE_UNSUPPORTED')).toBe(true);
  });

  it('reports unsupported conjugated form', () => {
    const result = parseModernMorphemes(morphemes([verb('読む', '読む', '五段・マ行', '未知形')]));
    expect(result.bunsetsu[0]?.tango[0]?.katsuyoukei).toBeUndefined();
    expect(result.diagnostics.some((d) => d.code === 'MODERN_KATSUYOU_FORM_UNSUPPORTED')).toBe(true);
  });

  it('reports missing POS', () => {
    const result = parseModernMorphemes(morphemes([raw('本', '')]));
    expect(result.diagnostics.some((d) => d.code === 'MODERN_INPUT_MISSING_POS')).toBe(true);
    expect(result.text).toBe('本');
  });

  it('reports offset length mismatch', () => {
    const input = morphemes([noun('本')]);
    input[0]!.end = 3;
    const result = parseModernMorphemes(input);
    expect(result.diagnostics.some((d) => d.code === 'MODERN_INPUT_OFFSET_LENGTH_MISMATCH')).toBe(true);
  });

  it('preserves every valid raw morpheme exactly once', () => {
    const input = morphemes([
      prefix('お'), noun('菓子'), particle('を', '格助詞'),
      verb('食べ', '食べる', '一段', '連用形'), particle('て', '接続助詞'),
      verb('いる', 'いる', '一段', '基本形', '非自立'),
    ]);
    const result = parseModernMorphemes(input);
    expect(result.bunsetsu.flatMap((b) => b.tango).flatMap((t) => t.rawMorphemes ?? [])).toEqual(input);
  });

  it('produces stable ids and ordered spans', () => {
    const result = parseModernMorphemes(morphemes([
      noun('私'), particle('は', '係助詞'), noun('本'), particle('を', '格助詞'),
      verb('読む', '読む', '五段・マ行', '基本形'),
    ]));
    expect(result.bunsetsu.map((b) => b.id)).toEqual(['modern-bunsetsu-0', 'modern-bunsetsu-1', 'modern-bunsetsu-2']);
    expect(result.bunsetsu.flatMap((b) => b.tango).map((t) => t.id)).toEqual([
      'modern-tango-0', 'modern-tango-1', 'modern-tango-2', 'modern-tango-3', 'modern-tango-4',
    ]);
    expect(result.bunsetsu.map((b) => [b.start, b.end])).toEqual([[0, 2], [2, 4], [4, 6]]);
  });

  it('does not mutate the input array or raw objects', () => {
    const input = morphemes([naStem('静か'), da()]);
    const snapshot = structuredClone(input);
    parseModernMorphemes(input);
    expect(input).toEqual(snapshot);
  });

  it('is deterministic across repeated calls', () => {
    const input = morphemes([naStem('静か'), da('な', '体言接続'), noun('人')]);
    expect(parseModernMorphemes(input)).toEqual(parseModernMorphemes(input));
  });

  it('keeps reading only when all merged readings are available', () => {
    const complete = parseModernMorphemes(morphemes([
      { ...naStem('静か'), reading: 'シズカ' }, { ...da(), reading: 'ダ' },
    ]));
    expect(complete.bunsetsu[0]?.tango[0]?.reading).toBe('シズカダ');
    const incomplete = parseModernMorphemes(morphemes([naStem('静か'), da()]));
    expect(incomplete.bunsetsu[0]?.tango[0]?.reading).toBeUndefined();
  });

  it('retains original base forms in raw morphemes after merging', () => {
    const result = parseModernMorphemes(morphemes([naStem('静か'), da('な', '体言接続'), noun('人')]));
    expect(result.bunsetsu[0]?.tango[0]?.baseForm).toBe('静かだ');
    expect(result.bunsetsu[0]?.tango[0]?.rawMorphemes?.map((m) => m.baseForm)).toEqual(['静か', 'だ']);
  });

  it('returns no bunsetsu when every input morpheme is malformed', () => {
    const result = parseModernMorphemes([null, undefined] as unknown as Parameters<typeof parseModernMorphemes>[0]);
    expect(result.bunsetsu).toEqual([]);
    expect(result.diagnostics).toHaveLength(2);
  });
});
