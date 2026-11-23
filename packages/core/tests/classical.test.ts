import { describe, expect, it } from 'vitest';
import {
  ClassicalPassageValidationError,
  buildClassicalPassage,
  defineClassicalPassage,
} from '../src/classical/builder.js';
import { validateClassicalPassage } from '../src/classical/validate.js';
import type {
  ClassicalKatsuyouType,
  ClassicalKatsuyoukei,
  ClassicalPassageInput,
  ClassicalTangoInput,
  Hinshi,
  ParseResult,
} from '../src/types.js';

type TokenSpec = Omit<ClassicalTangoInput, 'start' | 'end'>;
type BunsetsuSpec = { id: string; tango: TokenSpec[] };

function passage(text: string, specs: BunsetsuSpec[]): ClassicalPassageInput {
  let cursor = 0;
  return {
    text,
    bunsetsu: specs.map((spec) => {
      const start = cursor;
      const tango = spec.tango.map((token) => {
        const tokenStart = cursor;
        cursor += token.surface.length;
        return { ...token, start: tokenStart, end: cursor };
      });
      return { id: spec.id, tango, start, end: cursor };
    }),
  };
}

const taketoriInspired = passage('月をぞ見る', [
  {
    id: 'taketori-b1',
    tango: [
      { id: 'moon', surface: '月', hinshi: '名詞', isIndependent: true },
      { id: 'object', surface: 'を', hinshi: '助詞', isIndependent: false },
      {
        id: 'zo',
        surface: 'ぞ',
        hinshi: '助詞',
        subHinshi: '係助詞',
        isIndependent: false,
        kakarimusubi: [{ particleTangoId: 'zo', predicateTangoId: 'see', particle: 'ぞ' }],
      },
    ],
  },
  {
    id: 'taketori-b2',
    tango: [
      {
        id: 'see',
        surface: '見る',
        baseForm: '見る',
        hinshi: '動詞',
        katsuyouType: '上一段',
        katsuyoukei: '連体形',
        isIndependent: true,
      },
    ],
  },
]);

const makuraInspired = passage('春はあけぼの', [
  {
    id: 'makura-b1',
    tango: [
      { id: 'spring', surface: '春', hinshi: '名詞', isIndependent: true },
      { id: 'topic', surface: 'は', hinshi: '助詞', isIndependent: false },
    ],
  },
  {
    id: 'makura-b2',
    tango: [
      {
        id: 'dawn',
        surface: 'あけぼの',
        hinshi: '名詞',
        isIndependent: true,
        historicalKana: 'あけぼの',
        modernReading: 'あけぼの',
      },
    ],
  },
]);

const tsurezureInspired = passage('心こそ変はれ', [
  {
    id: 'tsurezure-b1',
    tango: [
      { id: 'heart', surface: '心', hinshi: '名詞', isIndependent: true },
      {
        id: 'koso',
        surface: 'こそ',
        hinshi: '助詞',
        subHinshi: '係助詞',
        isIndependent: false,
        kakarimusubi: [{ particleTangoId: 'koso', predicateTangoId: 'change', particle: 'こそ' }],
      },
    ],
  },
  {
    id: 'tsurezure-b2',
    tango: [
      {
        id: 'change',
        surface: '変はれ',
        baseForm: '変はる',
        hinshi: '動詞',
        katsuyouType: '四段',
        katsuyoukei: '已然形',
        isIndependent: true,
        historicalKana: 'かはれ',
        modernReading: 'かわれ',
      },
    ],
  },
]);

const completionInspired = passage('花は移りぬ', [
  {
    id: 'completion-b1',
    tango: [
      { id: 'flower', surface: '花', hinshi: '名詞', isIndependent: true },
      { id: 'flower-topic', surface: 'は', hinshi: '助詞', isIndependent: false },
    ],
  },
  {
    id: 'completion-b2',
    tango: [
      {
        id: 'move',
        surface: '移り',
        baseForm: '移る',
        hinshi: '動詞',
        katsuyouType: '四段',
        katsuyoukei: '連用形',
        isIndependent: true,
      },
      {
        id: 'nu',
        surface: 'ぬ',
        hinshi: '助動詞',
        katsuyouType: 'ナ変',
        katsuyoukei: '終止形',
        isIndependent: false,
        meaningTags: ['完了'],
      },
    ],
  },
]);

const assertionInspired = passage('声はなり', [
  {
    id: 'assertion-b1',
    tango: [
      { id: 'voice', surface: '声', hinshi: '名詞', isIndependent: true },
      { id: 'voice-topic', surface: 'は', hinshi: '助詞', isIndependent: false },
    ],
  },
  {
    id: 'assertion-b2',
    tango: [
      {
        id: 'nari',
        surface: 'なり',
        hinshi: '助動詞',
        katsuyouType: 'ナリ活用',
        katsuyoukei: '終止形',
        isIndependent: false,
        meaningTags: ['断定', '伝聞・推定'],
      },
    ],
  },
]);

const samples = [taketoriInspired, makuraInspired, tsurezureInspired, completionInspired, assertionInspired];

function kakariPassage(particle: 'ぞ' | 'なむ' | 'や' | 'か' | 'こそ', katsuyoukei: ClassicalKatsuyoukei) {
  const predicateSurface = particle === 'こそ' ? '見れ' : '見る';
  return passage(`月${particle}${predicateSurface}`, [
    {
      id: 'k-b1',
      tango: [
        { id: 'k-moon', surface: '月', hinshi: '名詞', isIndependent: true },
        {
          id: 'k-particle',
          surface: particle,
          hinshi: '助詞',
          subHinshi: '係助詞',
          isIndependent: false,
          kakarimusubi: [{ particleTangoId: 'k-particle', predicateTangoId: 'k-predicate', particle }],
        },
      ],
    },
    {
      id: 'k-b2',
      tango: [
        {
          id: 'k-predicate',
          surface: predicateSurface,
          hinshi: '動詞',
          katsuyouType: '上一段',
          katsuyoukei,
          isIndependent: true,
        },
      ],
    },
  ]);
}

describe('classical passage fixtures', () => {
  it.each(samples.map((input, index) => [index + 1, input] as const))(
    'accepts independently annotated public-domain-inspired passage %i',
    (_number, input) => {
      const result = validateClassicalPassage(input);
      expect(result.valid).toBe(true);
      expect(result.diagnostics).toEqual([]);
      expect(result.value).toMatchObject({ mode: 'classical', text: input.text, diagnostics: [] });
      expect(result.value?.bunsetsu.flatMap((item) => item.tango).map((token) => token.surface).join('')).toBe(
        input.text,
      );
    },
  );

  it('preserves classical metadata and the shared ParseResult contract', () => {
    const result: ParseResult = buildClassicalPassage(tsurezureInspired);
    expect(result.mode).toBe('classical');
    expect(result.bunsetsu[1]?.tango[0]).toMatchObject({
      katsuyoukei: '已然形',
      historicalKana: 'かはれ',
      modernReading: 'かわれ',
    });
    expect(buildClassicalPassage(completionInspired).bunsetsu[1]?.tango[1]?.meaningTags).toEqual(['完了']);
    expect(buildClassicalPassage(assertionInspired).bunsetsu[1]?.tango[0]?.meaningTags).toEqual([
      '断定',
      '伝聞・推定',
    ]);
  });

  it('supports every classical conjugation type and base', () => {
    const types: Array<[ClassicalKatsuyouType, Hinshi]> = [
      ['四段', '動詞'],
      ['上二段', '動詞'],
      ['下二段', '動詞'],
      ['上一段', '動詞'],
      ['下一段', '動詞'],
      ['カ変', '動詞'],
      ['サ変', '動詞'],
      ['ナ変', '動詞'],
      ['ラ変', '動詞'],
      ['ク活用', '形容詞'],
      ['シク活用', '形容詞'],
      ['ナリ活用', '形容動詞'],
      ['タリ活用', '形容動詞'],
    ];
    const bases: ClassicalKatsuyoukei[] = ['未然形', '連用形', '終止形', '連体形', '已然形', '命令形'];
    for (const [katsuyouType, hinshi] of types) {
      for (const katsuyoukei of bases) {
        const input = passage('x', [
          {
            id: 'b',
            tango: [{ id: 't', surface: 'x', hinshi, katsuyouType, katsuyoukei, isIndependent: hinshi !== '助動詞' }],
          },
        ]);
        expect(validateClassicalPassage(input).valid, `${katsuyouType}/${katsuyoukei}`).toBe(true);
      }
    }
  });

  it.each([
    ['ぞ', '連体形'],
    ['なむ', '連体形'],
    ['や', '連体形'],
    ['か', '連体形'],
    ['こそ', '已然形'],
  ] as const)('enforces %s → %s', (particle, expected) => {
    expect(validateClassicalPassage(kakariPassage(particle, expected)).valid).toBe(true);
    const wrong = particle === 'こそ' ? '連体形' : '已然形';
    const result = validateClassicalPassage(kakariPassage(particle, wrong));
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((issue) => issue.code === 'classical.kakarimusubi-form')).toBe(true);
  });
});

describe('defensive classical validation', () => {
  it.each([null, undefined, [], 'text', 42])('does not throw for invalid root %s', (input) => {
    expect(() => validateClassicalPassage(input)).not.toThrow();
    const result = validateClassicalPassage(input);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics.every((issue) => issue.severity === 'error')).toBe(true);
  });

  it('accumulates structural, grammatical, and metadata issues', () => {
    const input: ClassicalPassageInput = {
      text: 'xy',
      bunsetsu: [
        {
          id: 'b',
          start: 0,
          end: 2,
          tango: [
            {
              id: 't',
              surface: 'wrong',
              start: 0,
              end: 1,
              hinshi: '動詞',
              katsuyouType: 'ク活用',
              katsuyoukei: '仮定形' as ClassicalKatsuyoukei,
              isIndependent: false,
              historicalKana: '',
              meaningTags: ['ok', ''],
            },
            { id: 't2', surface: 'y', start: 1, end: 2, hinshi: '名詞', isIndependent: true },
          ],
        },
      ],
    };
    const result = validateClassicalPassage(input);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThanOrEqual(6);
    expect(result.diagnostics.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'classical.surface-mismatch',
        'classical.incompatible-katsuyou',
        'classical.unknown-katsuyoukei',
        'classical.independence-mismatch',
        'classical.invalid-metadata',
        'classical.invalid-meaning-tags',
      ]),
    );
  });

  it('rejects empty, noncontiguous, out-of-bounds, and duplicate structures', () => {
    const empty = validateClassicalPassage({ text: '', bunsetsu: [] });
    expect(empty.valid).toBe(false);
    expect(empty.diagnostics.map((issue) => issue.code)).toContain('classical.empty-bunsetsu');

    const input = passage('ab', [
      { id: 'same', tango: [{ id: 'same', surface: 'a', hinshi: '名詞', isIndependent: true }] },
      { id: 'b2', tango: [{ id: 't2', surface: 'b', hinshi: '名詞', isIndependent: true }] },
    ]);
    input.bunsetsu[1]!.start = 0;
    input.bunsetsu[1]!.end = 99;
    input.bunsetsu[1]!.tango[0]!.start = 0;
    input.bunsetsu[1]!.tango[0]!.end = 99;
    const result = validateClassicalPassage(input);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'classical.duplicate-id',
        'classical.noncontiguous-bunsetsu',
        'classical.bunsetsu-out-of-bounds',
        'classical.tango-out-of-bounds',
      ]),
    );
  });

  it('rejects unknown POS, modern conjugation, and incompatible nonconjugating metadata', () => {
    const input = passage('x', [
      {
        id: 'b',
        tango: [
          {
            id: 't',
            surface: 'x',
            hinshi: '名詞',
            katsuyouType: '五段' as ClassicalKatsuyouType,
            katsuyoukei: '仮定形' as ClassicalKatsuyoukei,
            isIndependent: true,
          },
        ],
      },
    ]);
    const result = validateClassicalPassage(input);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'classical.unknown-katsuyou-type',
        'classical.unknown-katsuyoukei',
        'classical.unexpected-katsuyou',
      ]),
    );
  });

  it('reports malformed and unresolved kakarimusubi links without throwing', () => {
    const input = kakariPassage('ぞ', '連体形');
    input.bunsetsu[0]!.tango[1]!.kakarimusubi = [
      { particleTangoId: 'missing', predicateTangoId: 'also-missing', particle: 'ぞ' },
    ];
    const result = validateClassicalPassage(input);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'classical.unknown-kakarimusubi-particle-target',
        'classical.unknown-kakarimusubi-predicate-target',
      ]),
    );

    const malformed = kakariPassage('ぞ', '連体形') as unknown as {
      bunsetsu: Array<{ tango: Array<{ kakarimusubi: unknown }> }>;
    };
    malformed.bunsetsu[0]!.tango[1]!.kakarimusubi = [null, { particle: 'invalid' }];
    expect(() => validateClassicalPassage(malformed)).not.toThrow();
    expect(validateClassicalPassage(malformed).diagnostics.length).toBeGreaterThanOrEqual(3);
  });

  it('rejects invalid optional metadata and raw morphemes', () => {
    const input = passage('x', [
      {
        id: 'b',
        tango: [{ id: 't', surface: 'x', hinshi: '名詞', isIndependent: true, modernReading: 4 as unknown as string }],
      },
    ]) as unknown as { bunsetsu: Array<{ tango: Array<Record<string, unknown>> }> };
    input.bunsetsu[0]!.tango[0]!.rawMorphemes = [];
    const result = validateClassicalPassage(input);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['classical.invalid-metadata', 'classical.unexpected-raw-morphemes']),
    );
  });
});

describe('classical builder', () => {
  it('returns a valid ParseResult and throws a structured error for invalid data', () => {
    const valid = buildClassicalPassage(defineClassicalPassage(makuraInspired));
    expect(valid.mode).toBe('classical');
    expect(valid.diagnostics).toEqual([]);

    expect(() => buildClassicalPassage(null)).toThrow(ClassicalPassageValidationError);
    try {
      buildClassicalPassage({ text: 1, bunsetsu: null });
    } catch (error) {
      expect(error).toBeInstanceOf(ClassicalPassageValidationError);
      expect((error as ClassicalPassageValidationError).diagnostics.map((issue) => issue.code)).toEqual([
        'classical.invalid-text',
        'classical.invalid-bunsetsu',
      ]);
    }
  });
});
