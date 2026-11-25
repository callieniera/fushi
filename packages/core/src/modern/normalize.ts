import { diagnostic } from '../diagnostics.js';
import type { Diagnostic, ModernKatsuyoukei } from '../types.js';
import type { IndexedMorpheme, NormalizationResult, NormalizedToken } from './types.js';

const ADJECTIVAL_FORMS: Readonly<Record<string, ModernKatsuyoukei>> = {
  だ: '終止形',
  だろ: '未然形',
  だっ: '連用形',
  で: '連用形',
  に: '連用形',
  な: '連体形',
  なら: '仮定形',
};

function makeToken(
  rawMorphemes: IndexedMorpheme[],
  kind: NormalizedToken['kind'] = 'plain',
  overrides: Partial<NormalizedToken> = {},
): NormalizedToken {
  const source = rawMorphemes[0];
  if (!source) throw new Error('A normalized token requires at least one source morpheme.');
  const last = rawMorphemes[rawMorphemes.length - 1] ?? source;
  const token: NormalizedToken = {
    rawMorphemes,
    source,
    conjugationSource: source,
    kind,
    surface: rawMorphemes.map(({ raw }) => raw.surface).join(''),
    baseForm: source.raw.baseForm ?? source.raw.surface,
    reading: rawMorphemes.every(({ raw }) => raw.reading !== undefined)
      ? rawMorphemes.map(({ raw }) => raw.reading).join('')
      : undefined,
    start: source.raw.start,
    end: last.raw.end,
  };
  return { ...token, ...overrides };
}

function isAdjectivalStem(item: IndexedMorpheme): boolean {
  return item.raw.pos === '名詞' &&
    (item.raw.posDetail1 === '形容動詞語幹' || item.raw.posDetail2 === '形容動詞語幹');
}

function isAdjectivalEnding(item: IndexedMorpheme): boolean {
  const { raw } = item;
  if (raw.pos === '助詞' && raw.posDetail1 === '副詞化' && raw.surface === 'に') return true;
  return raw.pos === '助動詞' && raw.conjugationType === '特殊・ダ' && raw.surface in ADJECTIVAL_FORMS;
}

function isPoliteDaEnding(item: IndexedMorpheme): boolean {
  return item.raw.pos === '助動詞' && item.raw.conjugationType === '特殊・デス' && item.raw.surface === 'です';
}

function isPrefix(item: IndexedMorpheme): boolean {
  return item.raw.pos === '接頭詞' || item.raw.pos === '接頭辞';
}

function isVerbSuffix(item: IndexedMorpheme): boolean {
  return item.raw.pos === '動詞' && item.raw.posDetail1 === '接尾';
}

function isReruAuxiliarySuffix(item: IndexedMorpheme): boolean {
  return isVerbSuffix(item) &&
    (item.raw.baseForm === 'れる' || item.raw.baseForm === 'られる');
}

function isSuffix(item: IndexedMorpheme): boolean {
  if (isReruAuxiliarySuffix(item)) return false;
  return item.raw.posDetail1 === '接尾' || item.raw.pos === '接尾辞' || isVerbSuffix(item);
}

function isSou(item: IndexedMorpheme): boolean {
  return item.raw.surface === 'そう' && item.raw.posDetail2 === '助動詞語幹';
}

function isIndependentRaw(item: IndexedMorpheme): boolean {
  const { raw } = item;
  if (raw.pos === '助詞' || raw.pos === '助動詞' || isPrefix(item) ||
    isSuffix(item) || isReruAuxiliarySuffix(item)) return false;
  // IPAdic fillers must stay separate until they are remapped to school grammar.
  if (raw.pos === 'フィラー') return false;
  return raw.posDetail1 !== '非自立';
}

function isAdjectivalSuffix(item: IndexedMorpheme): boolean {
  return item.raw.posDetail1 === '接尾' && item.raw.posDetail2 === '形容動詞語幹';
}

function isAnoSaFiller(previous: IndexedMorpheme, suffix: IndexedMorpheme): boolean {
  return previous.raw.pos === 'フィラー' && previous.raw.surface === 'あの' &&
    suffix.raw.surface === 'さ' && suffix.raw.posDetail1 === '接尾' && suffix.raw.posDetail2 === '特殊';
}

function isAuxiliaryStem(item: IndexedMorpheme, surface: string): boolean {
  return item.raw.surface === surface && item.raw.posDetail2 === '助動詞語幹';
}

function isSahenHost(item: IndexedMorpheme): boolean {
  return item.raw.pos === '名詞' && item.raw.posDetail1 === 'サ変接続';
}

function isSuru(item: IndexedMorpheme): boolean {
  return item.raw.pos === '動詞' && item.raw.baseForm === 'する' &&
    item.raw.conjugationType?.startsWith('サ変') === true &&
    item.raw.conjugatedForm !== '未然レル接続';
}

function isOnaji(item: IndexedMorpheme): boolean {
  return item.raw.surface === '同じ' && item.raw.pos === '連体詞';
}

function ids(items: IndexedMorpheme[]): number[] {
  return items.map(({ index }) => index);
}

/**
 * Reconstruct inflecting words before joining prefixes and suffixes. Each
 * morpheme is consumed at most once, so overlapping rules cannot depend on
 * input array order.
 */
export function normalizeModernMorphemes(morphemes: readonly IndexedMorpheme[]): NormalizationResult {
  const diagnostics: Diagnostic[] = [];
  const consumed = new Set<number>();
  const replacements = new Map<number, NormalizedToken>();

  for (let i = 0; i < morphemes.length - 1; i += 1) {
    const stem = morphemes[i];
    const ending = morphemes[i + 1];
    if (!stem || !ending || consumed.has(i) || consumed.has(i + 1)) continue;
    if (!isAdjectivalStem(stem) || (!isAdjectivalEnding(ending) &&
      !(isAdjectivalSuffix(stem) && isPoliteDaEnding(ending)))) continue;
    const polite = isPoliteDaEnding(ending);
    const katsuyoukei = polite ? '終止形' : ADJECTIVAL_FORMS[ending.raw.surface];
    if (!katsuyoukei) continue;
    const suffix = morphemes[i - 1];
    const stemStart = suffix && isAdjectivalSuffix(stem) && isIndependentRaw(suffix) && !consumed.has(i - 1) ? i - 1 : i;
    const rawMorphemes = morphemes.slice(stemStart, i + 2);
    const mergedStem = rawMorphemes.slice(0, -1).map(({ raw }) => raw.surface).join('');
    consumed.add(stemStart);
    consumed.add(i);
    consumed.add(i + 1);
    replacements.set(
      stemStart,
      makeToken(rawMorphemes, 'adjectival', {
        conjugationSource: ending,
        baseForm: `${mergedStem}だ`,
        forcedHinshi: '形容動詞',
        forcedIndependent: true,
        forcedKatsuyouType: 'その他',
        forcedKatsuyoukei: katsuyoukei,
      }),
    );
  }

  for (let i = 0; i < morphemes.length - 1; i += 1) {
    const stem = morphemes[i];
    const ending = morphemes[i + 1];
    if (!stem || !ending || consumed.has(i) || consumed.has(i + 1)) continue;
    const isSouStem = isSou(stem);
    const isYouStem = isAuxiliaryStem(stem, 'よう');
    const onaji = isOnaji(stem);
    if ((!isSouStem && !isYouStem && !onaji) ||
      (!isAdjectivalEnding(ending) && !isPoliteDaEnding(ending))) continue;
    if (onaji && (ending.raw.surface === 'に' || ending.raw.surface === 'な' || isPoliteDaEnding(ending))) continue;
    const polite = isPoliteDaEnding(ending);
    const katsuyoukei = polite ? '終止形' : ADJECTIVAL_FORMS[ending.raw.surface];
    if (!katsuyoukei) continue;
    consumed.add(i);
    consumed.add(i + 1);
    const baseForm = onaji ? '同じだ' : `${stem.raw.surface}だ`;
    replacements.set(
      i,
      makeToken([stem, ending], isYouStem ? 'you' : onaji ? 'adjectival' : 'sou', {
        conjugationSource: ending,
        baseForm,
        forcedHinshi: onaji ? '形容動詞' : '助動詞',
        forcedIndependent: onaji,
        forcedKatsuyouType: 'その他',
        forcedKatsuyoukei: katsuyoukei,
      }),
    );
  }

  for (let i = 0; i < morphemes.length - 1; i += 1) {
    const host = morphemes[i];
    const suru = morphemes[i + 1];
    if (!host || !suru || consumed.has(i) || consumed.has(i + 1)) continue;
    if (!isSahenHost(host) || !isSuru(suru)) continue;
    consumed.add(i);
    consumed.add(i + 1);
    replacements.set(
      i,
      makeToken([host, suru], 'sahen', {
        source: host,
        conjugationSource: suru,
        baseForm: `${host.raw.baseForm ?? host.raw.surface}する`,
        forcedHinshi: '動詞',
        forcedIndependent: true,
      }),
    );
  }

  for (let i = 0; i < morphemes.length - 1; i += 1) {
    const prefix = morphemes[i];
    const next = morphemes[i + 1];
    if (!prefix || !next || consumed.has(i)) continue;
    if (!isPrefix(prefix)) continue;
    const nextReplacement = replacements.get(i + 1);
    if (nextReplacement) {
      consumed.add(i);
      replacements.set(
        i,
        makeToken([prefix, ...nextReplacement.rawMorphemes], 'prefix', {
          ...nextReplacement,
          rawMorphemes: [prefix, ...nextReplacement.rawMorphemes],
          kind: 'prefix',
          surface: `${prefix.raw.surface}${nextReplacement.surface}`,
          baseForm: `${prefix.raw.surface}${nextReplacement.baseForm ?? ''}`,
          reading: prefix.raw.reading !== undefined && nextReplacement.reading !== undefined
            ? `${prefix.raw.reading}${nextReplacement.reading}`
            : undefined,
          start: prefix.raw.start,
        }),
      );
      replacements.delete(i + 1);
      continue;
    }
    if (consumed.has(i + 1) || !isIndependentRaw(next)) continue;
    consumed.add(i);
    consumed.add(i + 1);
    replacements.set(
      i,
      makeToken([prefix, next], 'prefix', {
        source: next,
        conjugationSource: next,
        baseForm: `${prefix.raw.surface}${next.raw.baseForm ?? next.raw.surface}`,
      }),
    );
  }

  for (let i = 1; i < morphemes.length; i += 1) {
    const previous = morphemes[i - 1];
    const suffix = morphemes[i];
    if (!previous || !suffix || consumed.has(i)) continue;
    if (!isSuffix(suffix)) continue;
    // Skip suffix merging for あのさ (filler + special suffix)
    if (isAnoSaFiller(previous, suffix)) continue;
    const previousReplacement = replacements.get(i - 1);
    const host = previousReplacement ?? makeToken([previous]);
    if (consumed.has(i - 1) && !previousReplacement) continue;
    if (!previousReplacement && !isIndependentRaw(previous)) continue;
    if (previousReplacement && (previousReplacement.kind === 'adjectival' ||
      previousReplacement.kind === 'sou' || previousReplacement.kind === 'you')) continue;
    consumed.add(i - 1);
    consumed.add(i);
    const verbSuffix = isVerbSuffix(suffix);
    const adjectival = !verbSuffix && (isAdjectivalSuffix(suffix) || host.forcedHinshi === '形容動詞');
    const stemSurface = host.rawMorphemes.at(-1)?.raw.surface ?? host.surface;
    const baseForm = verbSuffix
      ? `${stemSurface}${suffix.raw.baseForm ?? suffix.raw.surface}`
      : previousReplacement && previousReplacement.kind !== 'plain'
        ? `${previousReplacement.baseForm ?? previousReplacement.surface}${suffix.raw.surface}`
        : `${stemSurface}${suffix.raw.surface}`;
    const forcedSubHinshi = verbSuffix ? '接尾' : adjectival ? '形容動詞語幹' : undefined;
    replacements.set(
      i - 1,
      makeToken([...host.rawMorphemes, suffix], 'suffix', {
        ...host,
        rawMorphemes: [...host.rawMorphemes, suffix],
        kind: 'suffix',
        surface: `${host.surface}${suffix.raw.surface}`,
        baseForm,
        reading: host.reading !== undefined && suffix.raw.reading !== undefined
          ? `${host.reading}${suffix.raw.reading}`
          : undefined,
        conjugationSource: suffix,
        end: suffix.raw.end,
        forcedHinshi: verbSuffix ? '動詞' : adjectival ? '形容動詞' : '名詞',
        ...(forcedSubHinshi ? { forcedSubHinshi } : {}),
        forcedIndependent: true,
        ...(adjectival ? { forcedKatsuyouType: 'その他' as const } : {}),
      }),
    );
  }

  const tokens: NormalizedToken[] = [];
  for (let i = 0; i < morphemes.length; i += 1) {
    if (consumed.has(i)) {
      const replacement = replacements.get(i);
      if (replacement) tokens.push(replacement);
      continue;
    }
    const item = morphemes[i];
    if (!item) continue;
    // Skip orphan suffix diagnostic for あのさ pattern (handled specially in remap)
    const isAnoSaSuffix = isSuffix(item) &&
      item.raw.surface === 'さ' && item.raw.posDetail1 === '接尾' && item.raw.posDetail2 === '特殊' &&
      i > 0 && morphemes[i - 1]?.raw.pos === 'フィラー' && morphemes[i - 1]?.raw.surface === 'あの';
    if (isPrefix(item)) {
      diagnostics.push(
        diagnostic('MODERN_NORMALIZE_ORPHAN_PREFIX', 'A prefix without a mergeable host was retained.', 'warning', {
          start: item.raw.start,
          end: item.raw.end,
          morphemeIds: [item.index],
        }),
      );
    } else if (isSuffix(item) && !isAnoSaSuffix) {
      diagnostics.push(
        diagnostic('MODERN_NORMALIZE_ORPHAN_SUFFIX', 'A suffix without a mergeable host was retained.', 'warning', {
          start: item.raw.start,
          end: item.raw.end,
          morphemeIds: [item.index],
        }),
      );
    }
    tokens.push(makeToken([item]));
  }

  return { tokens, diagnostics };
}

export function rawMorphemesOf(token: NormalizedToken) {
  return token.rawMorphemes.map(({ raw }) => raw);
}

export function morphemeIdsOf(token: NormalizedToken): number[] {
  return ids(token.rawMorphemes);
}
