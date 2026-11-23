export const CLASSICAL_HINSHI = [
    '動詞',
    '形容詞',
    '形容動詞',
    '名詞',
    '副詞',
    '連体詞',
    '接続詞',
    '感動詞',
    '助動詞',
    '助詞',
];
export const CLASSICAL_KATSUYOUKEI = [
    '未然形',
    '連用形',
    '終止形',
    '連体形',
    '已然形',
    '命令形',
];
export const CLASSICAL_KATSUYOU_TYPE = [
    '四段',
    '上二段',
    '下二段',
    '上一段',
    '下一段',
    'カ変',
    'サ変',
    'ナ変',
    'ラ変',
    'ク活用',
    'シク活用',
    'ナリ活用',
    'タリ活用',
];
export const KAKARIMUSUBI_PARTICLES = [
    'ぞ',
    'なむ',
    'や',
    'か',
    'こそ',
];
export const VERB_KATSUYOU_TYPES = [
    '四段',
    '上二段',
    '下二段',
    '上一段',
    '下一段',
    'カ変',
    'サ変',
    'ナ変',
    'ラ変',
];
export const ADJECTIVE_KATSUYOU_TYPES = ['ク活用', 'シク活用'];
export const ADJECTIVAL_VERB_KATSUYOU_TYPES = [
    'ナリ活用',
    'タリ活用',
];
export const INDEPENDENT_HINSHI = [
    '動詞',
    '形容詞',
    '形容動詞',
    '名詞',
    '副詞',
    '連体詞',
    '接続詞',
    '感動詞',
];
export function isClassicalKatsuyouTypeCompatible(hinshi, katsuyouType) {
    if (hinshi === '動詞') {
        return VERB_KATSUYOU_TYPES.includes(katsuyouType);
    }
    if (hinshi === '形容詞') {
        return ADJECTIVE_KATSUYOU_TYPES.includes(katsuyouType);
    }
    if (hinshi === '形容動詞') {
        return ADJECTIVAL_VERB_KATSUYOU_TYPES.includes(katsuyouType);
    }
    return hinshi === '助動詞' && CLASSICAL_KATSUYOU_TYPE.includes(katsuyouType);
}
//# sourceMappingURL=schema.js.map