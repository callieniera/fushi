import { diagnostic } from '../diagnostics.js';
const ADJECTIVAL_FORMS = {
    だ: '終止形',
    だろ: '未然形',
    だっ: '連用形',
    で: '連用形',
    に: '連用形',
    な: '連体形',
    なら: '仮定形',
};
function makeToken(rawMorphemes, kind = 'plain', overrides = {}) {
    const source = rawMorphemes[0];
    if (!source)
        throw new Error('A normalized token requires at least one source morpheme.');
    const last = rawMorphemes[rawMorphemes.length - 1] ?? source;
    const token = {
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
function isAdjectivalStem(item) {
    return item.raw.pos === '名詞' && item.raw.posDetail1 === '形容動詞語幹';
}
function isAdjectivalEnding(item) {
    const { raw } = item;
    if (!(raw.surface in ADJECTIVAL_FORMS))
        return false;
    if (raw.pos === '助動詞' && raw.conjugationType === '特殊・ダ')
        return true;
    return raw.pos === '助詞' && raw.posDetail1 === '副詞化' && raw.surface === 'に';
}
function isPrefix(item) {
    return item.raw.pos === '接頭詞' || item.raw.pos === '接頭辞';
}
function isSuffix(item) {
    return item.raw.posDetail1 === '接尾' || item.raw.pos === '接尾辞';
}
function isSou(item) {
    return item.raw.surface === 'そう' && item.raw.posDetail2 === '助動詞語幹';
}
function isIndependentRaw(item) {
    const { raw } = item;
    if (raw.pos === '助詞' || raw.pos === '助動詞' || isPrefix(item) || isSuffix(item))
        return false;
    return raw.posDetail1 !== '非自立';
}
function isAdjectivalSuffix(item) {
    return item.raw.posDetail1 === '接尾' && item.raw.posDetail2 === '形容動詞語幹';
}
function isAdjectivalEndingAfterSou(item) {
    return item.raw.pos === '助動詞' && item.raw.conjugationType === '特殊・ダ' && item.raw.surface in ADJECTIVAL_FORMS;
}
function ids(items) {
    return items.map(({ index }) => index);
}
/**
 * Ordered reconstruction passes: (1) 形容動詞語幹 + one permitted ending,
 * (2) そう + だ-ending, (3) prefixes, (4) suffixes. A morpheme is consumed by
 * at most one pass, so overlapping rules cannot depend on input array order.
 */
export function normalizeModernMorphemes(morphemes) {
    const diagnostics = [];
    const consumed = new Set();
    const replacements = new Map();
    for (let i = 0; i < morphemes.length - 1; i += 1) {
        const stem = morphemes[i];
        const ending = morphemes[i + 1];
        if (!stem || !ending || consumed.has(i) || consumed.has(i + 1))
            continue;
        if (!isAdjectivalStem(stem) || !isAdjectivalEnding(ending))
            continue;
        const katsuyoukei = ADJECTIVAL_FORMS[ending.raw.surface];
        if (!katsuyoukei)
            continue;
        consumed.add(i);
        consumed.add(i + 1);
        replacements.set(i, makeToken([stem, ending], 'adjectival', {
            conjugationSource: ending,
            baseForm: `${stem.raw.baseForm ?? stem.raw.surface}だ`,
            forcedHinshi: '形容動詞',
            forcedIndependent: true,
            forcedKatsuyouType: 'その他',
            forcedKatsuyoukei: katsuyoukei,
        }));
    }
    for (let i = 0; i < morphemes.length - 1; i += 1) {
        const sou = morphemes[i];
        const ending = morphemes[i + 1];
        if (!sou || !ending || consumed.has(i) || consumed.has(i + 1))
            continue;
        if (!isSou(sou) || !isAdjectivalEndingAfterSou(ending))
            continue;
        const katsuyoukei = ADJECTIVAL_FORMS[ending.raw.surface];
        if (!katsuyoukei)
            continue;
        consumed.add(i);
        consumed.add(i + 1);
        replacements.set(i, makeToken([sou, ending], 'sou', {
            conjugationSource: ending,
            baseForm: 'そうだ',
            forcedHinshi: '助動詞',
            forcedIndependent: false,
            forcedKatsuyouType: 'その他',
            forcedKatsuyoukei: katsuyoukei,
        }));
    }
    for (let i = 0; i < morphemes.length - 1; i += 1) {
        const prefix = morphemes[i];
        const next = morphemes[i + 1];
        if (!prefix || !next || consumed.has(i))
            continue;
        if (!isPrefix(prefix))
            continue;
        const nextReplacement = replacements.get(i + 1);
        if (nextReplacement) {
            consumed.add(i);
            replacements.set(i, makeToken([prefix, ...nextReplacement.rawMorphemes], 'prefix', {
                ...nextReplacement,
                rawMorphemes: [prefix, ...nextReplacement.rawMorphemes],
                kind: 'prefix',
                surface: `${prefix.raw.surface}${nextReplacement.surface}`,
                baseForm: `${prefix.raw.surface}${nextReplacement.baseForm ?? ''}`,
                reading: prefix.raw.reading !== undefined && nextReplacement.reading !== undefined
                    ? `${prefix.raw.reading}${nextReplacement.reading}`
                    : undefined,
                start: prefix.raw.start,
            }));
            replacements.delete(i + 1);
            continue;
        }
        if (consumed.has(i + 1) || !isIndependentRaw(next))
            continue;
        consumed.add(i);
        consumed.add(i + 1);
        replacements.set(i, makeToken([prefix, next], 'prefix', {
            source: next,
            conjugationSource: next,
            baseForm: `${prefix.raw.surface}${next.raw.baseForm ?? next.raw.surface}`,
        }));
    }
    for (let i = 1; i < morphemes.length; i += 1) {
        const previous = morphemes[i - 1];
        const suffix = morphemes[i];
        if (!previous || !suffix || consumed.has(i))
            continue;
        if (!isSuffix(suffix))
            continue;
        const previousReplacement = replacements.get(i - 1);
        if (previousReplacement && previousReplacement.kind !== 'adjectival' && previousReplacement.kind !== 'sou') {
            consumed.add(i);
            replacements.set(i - 1, makeToken([...previousReplacement.rawMorphemes, suffix], 'suffix', {
                ...previousReplacement,
                rawMorphemes: [...previousReplacement.rawMorphemes, suffix],
                kind: 'suffix',
                surface: `${previousReplacement.surface}${suffix.raw.surface}`,
                baseForm: `${previousReplacement.baseForm ?? ''}${suffix.raw.surface}`,
                reading: previousReplacement.reading !== undefined && suffix.raw.reading !== undefined
                    ? `${previousReplacement.reading}${suffix.raw.reading}`
                    : undefined,
                end: suffix.raw.end,
                forcedHinshi: '名詞',
                forcedIndependent: true,
                forcedKatsuyouType: 'その他',
                ...(previousReplacement.forcedKatsuyoukei
                    ? { forcedKatsuyoukei: previousReplacement.forcedKatsuyoukei }
                    : {}),
            }));
            continue;
        }
        if (consumed.has(i - 1) || !isIndependentRaw(previous))
            continue;
        consumed.add(i - 1);
        consumed.add(i);
        const adjectival = isAdjectivalSuffix(suffix);
        replacements.set(i - 1, makeToken([previous, suffix], 'suffix', {
            baseForm: `${previous.raw.baseForm ?? previous.raw.surface}${suffix.raw.surface}`,
            forcedHinshi: '名詞',
            forcedIndependent: true,
            ...(adjectival
                ? {
                    forcedHinshi: '形容動詞',
                    forcedIndependent: true,
                    forcedKatsuyouType: 'その他',
                }
                : {}),
        }));
    }
    const tokens = [];
    for (let i = 0; i < morphemes.length; i += 1) {
        if (consumed.has(i)) {
            const replacement = replacements.get(i);
            if (replacement)
                tokens.push(replacement);
            continue;
        }
        const item = morphemes[i];
        if (!item)
            continue;
        if (isPrefix(item)) {
            diagnostics.push(diagnostic('MODERN_NORMALIZE_ORPHAN_PREFIX', 'A prefix without a mergeable host was retained.', 'warning', {
                start: item.raw.start,
                end: item.raw.end,
                morphemeIds: [item.index],
            }));
        }
        else if (isSuffix(item)) {
            diagnostics.push(diagnostic('MODERN_NORMALIZE_ORPHAN_SUFFIX', 'A suffix without a mergeable host was retained.', 'warning', {
                start: item.raw.start,
                end: item.raw.end,
                morphemeIds: [item.index],
            }));
        }
        tokens.push(makeToken([item]));
    }
    return { tokens, diagnostics };
}
export function rawMorphemesOf(token) {
    return token.rawMorphemes.map(({ raw }) => raw);
}
export function morphemeIdsOf(token) {
    return ids(token.rawMorphemes);
}
