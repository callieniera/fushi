import { diagnostic } from '../diagnostics.js';
import type {
  Diagnostic,
  Hinshi,
  ModernKatsuyouType,
  ModernKatsuyoukei,
  Tango,
} from '../types.js';
import { morphemeIdsOf, rawMorphemesOf } from './normalize.js';
import type { NormalizedToken } from './types.js';

export interface RemapResult {
  tango: Tango[];
  diagnostics: Diagnostic[];
}

const KATSUYOU_TYPES: Readonly<Record<string, ModernKatsuyouType>> = {
  五段: '五段',
  一段: '下一段',
  サ変: 'サ変',
  カ変: 'カ変',
  形容詞: '形容詞',
  '特殊・ダ': '特殊・ダ',
  '特殊・デス': '特殊・デス',
  '特殊・マス': '特殊・マス',
  '特殊・タイ': '特殊・タイ',
  '特殊・タ': '特殊・タ',
  '特殊・ナイ': '特殊・ナイ',
  '特殊・ヌ': '特殊・ヌ',
  '特殊・ラシイ': '特殊・ラシイ',
  '文語・ベシ': '文語・ベシ',
  不変化型: 'その他',
};

const UPPER_ICHIDAN_BASES = new Set([
  'いる', '居る', '射る', '鋳る', '着る', '見る', '観る', '診る', '視る', '似る', '煮る',
  '干る', '率いる', '用いる', '顧みる', '省みる', '試みる', '悔いる', '報いる', '落ちる', '生きる',
  '起きる', '過ぎる', '借りる', '足りる', '降りる', '下りる', '伸びる', '信じる',
  '感じる', '論じる', '演じる', '閉じる', '応じる', '禁じる', '命じる', '準じる',
  '強いる', '滅びる',
]);

const KATSUYOUKEI: Readonly<Record<string, ModernKatsuyoukei>> = {
  未然形: '未然形',
  未然ウ接続: '未然形',
  未然形サ: '未然形',
  未然形セ: '未然形',
  未然形シ: '未然形',
  連用形: '連用形',
  連用タ接続: '連用形',
  連用テ接続: '連用形',
  連用ニ接続: '連用形',
  連用ゴザイ接続: '連用形',
  基本形: '終止形',
  体言接続: '連体形',
  体言接続特殊: '連体形',
  体言接続特殊２: '連体形',
  仮定形: '仮定形',
  仮定縮約１: '仮定形',
  仮定縮約２: '仮定形',
  命令形: '命令形',
  命令ｅ: '命令形',
  命令ｉ: '命令形',
  命令ｒｏ: '命令形',
  命令ｙｏ: '命令形',
};

const INDEPENDENT_POS = new Set<Hinshi>([
  '動詞', '形容詞', '形容動詞', '名詞', '副詞', '連体詞', '接続詞', '感動詞', '記号',
]);

function isNaiAfterVerb(tokens: readonly NormalizedToken[], index: number): boolean {
  const previous = tokens[index - 1];
  if (!previous) return false;
  const raw = previous.conjugationSource.raw;
  if (raw.pos === '助詞' && (raw.surface === 'は' || raw.surface === 'も')) {
    const beforeParticle = tokens[index - 2];
    return beforeParticle?.source.raw.pos === '動詞' &&
      beforeParticle.conjugationSource.raw.conjugatedForm?.startsWith('未然') === true;
  }
  return raw.pos === '動詞' && raw.conjugatedForm?.startsWith('未然') === true;
}

function isNaiAdjective(tokens: readonly NormalizedToken[], index: number): boolean {
  const previous = tokens[index - 1];
  if (!previous) return false;
  const raw = previous.conjugationSource.raw;
  if (raw.pos === '助詞' && (raw.surface === 'は' || raw.surface === 'も')) return true;
  if (previous.kind === 'adjectival' && previous.forcedKatsuyoukei === '連用形') return true;
  return raw.pos === '形容詞' && raw.conjugatedForm?.startsWith('連用') === true;
}

function isAppearanceSou(tokens: readonly NormalizedToken[], index: number): boolean {
  const token = tokens[index];
  if (!token) return false;
  const sou = token.rawMorphemes.find(({ raw }) => raw.surface === 'そう' && raw.posDetail2 === '助動詞語幹');
  if (sou?.raw.posDetail1 === '接尾') return true;
  const previous = tokens[index - 1];
  if (!previous) return false;
  const raw = previous.conjugationSource.raw;
  if (raw.pos === '動詞' || raw.pos === '形容詞') return raw.conjugatedForm?.startsWith('連用') === true;
  if (previous.kind === 'adjectival') return previous.forcedKatsuyoukei === '連用形';
  return false;
}

function isHearsaySou(tokens: readonly NormalizedToken[], index: number): boolean {
  const token = tokens[index];
  if (!token) return false;
  const sou = token.rawMorphemes.find(({ raw }) => raw.surface === 'そう' && raw.posDetail2 === '助動詞語幹');
  if (sou?.raw.posDetail1 === '特殊' && index > 0) return true;
  const previous = tokens[index - 1];
  if (!previous) return false;
  const raw = previous.conjugationSource.raw;
  return (raw.pos === '動詞' || raw.pos === '形容詞' || raw.pos === '助動詞') &&
    (raw.conjugatedForm === '基本形' || raw.conjugatedForm === '体言接続');
}

function isNiConjunctiveContext(tokens: readonly NormalizedToken[], index: number): boolean {
  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  if (!previous || !next) return false;
  const previousForm = previous.conjugationSource.raw.conjugatedForm;
  const nextForm = next.conjugationSource.raw.conjugatedForm;
  return (previous.source.raw.pos === '動詞' || previous.source.raw.pos === '形容詞' || previous.source.raw.pos === '助動詞')
    && (previousForm === '基本形' || previousForm === '体言接続')
    && next.source.raw.pos === '動詞'
    && nextForm?.startsWith('連用') === true;
}

function noSubHinshi(token: NormalizedToken): string | undefined {
  if (token.forcedSubHinshi) return token.forcedSubHinshi;
  const raw = token.source.raw;
  if (raw.pos === '助詞') {
    if (raw.surface === 'の') {
      if (raw.posDetail1 === '連体化') return '格助詞';
      if (raw.posDetail1 === '終助詞') return '終助詞';
      if (raw.posDetail1 === '副詞化') return '副助詞';
      return '準体助詞';
    }
    if (raw.surface === 'に' && raw.posDetail1 === '副詞化') return '接続助詞';
    return raw.posDetail1;
  }
  if (raw.pos === '動詞' && raw.posDetail1 === '非自立') return '補助動詞';
  if (raw.pos === '形容詞' && raw.posDetail1 === '非自立') return '補助形容詞';
  if (raw.pos === '名詞' && raw.posDetail1 === '非自立') return '形式名詞';
  return raw.posDetail1;
}

function mapHinshi(token: NormalizedToken): Hinshi | undefined {
  if (token.forcedHinshi) return token.forcedHinshi;
  const pos = token.source.raw.pos;
  if (pos === '接頭詞' || pos === '接頭辞') return '接頭詞';
  if (pos === '接尾辞') return '接尾詞';
  if (pos === '名詞' && token.source.raw.posDetail1 === '接尾') return '接尾詞';
  if (pos === '名詞' && token.source.raw.posDetail1 === '形容動詞語幹') return '名詞';
  if (pos === '名詞' && token.source.raw.posDetail2 === '助動詞語幹') return '助動詞';
  if (pos === 'フィラー') return '感動詞';
  if (pos === '記号') return '記号';
  if (pos === '動詞' || pos === '形容詞' || pos === '名詞' || pos === '副詞' || pos === '連体詞' ||
    pos === '接続詞' || pos === '感動詞' || pos === '助動詞' || pos === '助詞') return pos;
  return undefined;
}

function mapKatsuyouType(token: NormalizedToken, hinshi: Hinshi): ModernKatsuyouType | undefined {
  if (token.forcedKatsuyouType) return token.forcedKatsuyouType;
  const raw = token.conjugationSource.raw;
  const type = raw.conjugationType;
  if (!type) return undefined;
  if (type.startsWith('五段')) return '五段';
  if (type.startsWith('一段')) {
    const base = raw.baseForm ?? token.baseForm ?? '';
    if ((base === '経る' && raw.reading === 'フル') || (base === '獲る' && raw.reading === 'ウル')) return '上一段';
    return UPPER_ICHIDAN_BASES.has(base) ? '上一段' : '下一段';
  }
  if (type.startsWith('サ変')) return 'サ変';
  if (type.startsWith('カ変')) return 'カ変';
  if (type.startsWith('形容詞')) return '形容詞';
  return KATSUYOU_TYPES[type];
}

function mapKatsuyoukei(token: NormalizedToken, hinshi: Hinshi): ModernKatsuyoukei | undefined {
  if (token.forcedKatsuyoukei) return token.forcedKatsuyoukei;
  const raw = token.conjugationSource.raw;
  const form = raw.conjugatedForm;
  if (!form) return undefined;
  const mapped = KATSUYOUKEI[form];
  if (mapped) {
    if (mapped === '終止形' && (hinshi === '動詞' || hinshi === '形容詞' || hinshi === '助動詞')) {
      // IPAdic's 基本形 covers terminal and attributive uses. Contextual
      // remapping below selects the appropriate School Grammar form.
      return '終止形';
    }
    return mapped;
  }
  return undefined;
}

function isAttributiveContext(tokens: readonly NormalizedToken[], index: number): boolean {
  const next = tokens[index + 1];
  if (!next) return false;
  if (next.kind === 'you') return true;
  const raw = next.kind === 'sou'
    ? next.rawMorphemes[0]?.raw ?? next.source.raw
    : next.source.raw;
  if (raw.pos === '名詞' && raw.posDetail1 !== '接尾' && raw.posDetail2 !== '助動詞語幹') return true;
  if (raw.pos === '助詞' && (raw.posDetail1 === '連体化'
    || raw.surface === 'の' || raw.surface === 'ので' || raw.surface === 'のに')) return true;
  return false;
}

function isTerminalContext(tokens: readonly NormalizedToken[], index: number): boolean {
  if (tokens[index]?.kind === 'you' && tokens[index]?.forcedKatsuyoukei === '連体形') return false;
  const next = tokens[index + 1];
  if (!next) return true;
  const raw = next.source.raw;
  return raw.pos === '記号' || raw.pos === '助詞' && raw.posDetail1 === '終助詞';
}

function isNominalToken(token: NormalizedToken | undefined): boolean {
  if (!token) return false;
  if (token.forcedHinshi !== undefined) return token.forcedHinshi === '名詞';
  if (token.source.raw.surface === 'の' && token.source.raw.posDetail1 === '非自立') return false;
  return token.source.raw.pos === '名詞' && token.source.raw.posDetail1 !== '接尾' &&
    token.source.raw.posDetail2 !== '助動詞語幹';
}

function isAttributiveModifier(tokens: readonly NormalizedToken[], index: number): boolean {
  const token = tokens[index];
  if (!token) return false;
  const raw = token.conjugationSource.raw;
  if (token.kind === 'adjectival') return token.forcedKatsuyoukei === '連体形';
  if (token.source.raw.pos === '連体詞') return true;
  if (token.source.raw.pos === '接頭詞' || token.source.raw.pos === '接頭辞') return true;
  if (raw.conjugatedForm === '連体形' || raw.conjugatedForm === '体言接続' || raw.conjugatedForm === '体言接続特殊' ||
    raw.conjugatedForm === '体言接続特殊２') return true;
  if (raw.conjugatedForm === '基本形') {
    const following = tokens[index + 1];
    return isNominalToken(following) || following?.source.raw.pos === '助詞' && following.source.raw.surface === 'の';
  }
  return false;
}

function anoModifiesNominal(tokens: readonly NormalizedToken[], index: number): boolean {
  let cursor = index + 1;
  while (cursor < tokens.length) {
    const token = tokens[cursor];
    if (!token) return false;
    if (isNominalToken(token)) return true;
    if (!isAttributiveModifier(tokens, cursor)) return false;
    cursor += 1;
  }
  return false;
}

function compoundKaSubHinshi(tokens: readonly NormalizedToken[], index: number): string {
  const previous = tokens[index - 1];
  const next = tokens[index + 1];
  if (next && (next.source.raw.pos === '動詞' || next.source.raw.pos === '形容詞' ||
    next.source.raw.pos === '名詞' || next.source.raw.pos === '連体詞')) {
    const following = tokens[index + 2];
    if (following?.source.raw.surface === 'か') return '並立助詞';
  }
  if (previous && isNominalToken(previous) && next && next.source.raw.pos !== '記号' &&
    !(next.source.raw.pos === '助詞' && next.source.raw.posDetail1 === '終助詞')) return '副助詞';
  if (next?.source.raw.pos === '名詞' && next.source.raw.posDetail2 === '助動詞語幹') return '副助詞';
  if ((!next || next.source.raw.pos === '記号') &&
    previous && (previous.source.raw.pos === '動詞' || previous.source.raw.pos === '形容詞' ||
      previous.source.raw.pos === '助動詞')) return '終助詞';
  return '副助詞';
}

function addWarning(
  diagnostics: Diagnostic[],
  token: NormalizedToken,
  code: string,
  message: string,
): void {
  diagnostics.push(
    diagnostic(code, message, 'warning', {
      start: token.start,
      end: token.end,
      morphemeIds: morphemeIdsOf(token),
    }),
  );
}

export function remapModernTokens(tokens: readonly NormalizedToken[]): RemapResult {
  const diagnostics: Diagnostic[] = [];
  const tango: Tango[] = [];

  tokens.forEach((token, index) => {
    const raw = token.source.raw;
    let hinshi = mapHinshi(token);
    let subHinshi = noSubHinshi(token);
    let independent = token.forcedIndependent ??
      (hinshi !== undefined && hinshi !== '接頭詞' && hinshi !== '接尾詞' && INDEPENDENT_POS.has(hinshi));
    let katsuyouType = mapKatsuyouType(token, hinshi ?? '名詞');
    let katsuyoukei = mapKatsuyoukei(token, hinshi ?? '名詞');
    let meaningTags = token.meaningTags ? [...token.meaningTags] : undefined;

    if (raw.surface === 'ない' || raw.baseForm === 'ない') {
      if (isNaiAfterVerb(tokens, index)) {
        hinshi = '助動詞';
        subHinshi = '打消';
        independent = false;
        katsuyouType = '特殊・ナイ';
      } else if (isNaiAdjective(tokens, index) || raw.pos === '形容詞') {
        hinshi = '形容詞';
        subHinshi = isNaiAdjective(tokens, index) || raw.posDetail1 === '非自立' ? '補助形容詞' : raw.posDetail1;
        independent = true;
        katsuyouType = '形容詞';
      }
    }

    if (raw.surface === 'そう' && (token.kind === 'sou' || raw.posDetail2 === '助動詞語幹')) {
      hinshi = '助動詞';
      independent = false;
      katsuyouType = token.forcedKatsuyouType ?? 'その他';
      if (isAppearanceSou(tokens, index)) {
        subHinshi = '様態';
        meaningTags = ['様態'];
      } else if (isHearsaySou(tokens, index)) {
        subHinshi = '伝聞';
        meaningTags = ['伝聞'];
      } else {
        subHinshi = '様態・伝聞不明';
        addWarning(diagnostics, token, 'MODERN_SOU_AMBIGUOUS', 'そう could not be classified as appearance or hearsay.');
      }
    }

    if (raw.pos === '助動詞' && (raw.baseForm === 'れる' || raw.baseForm === 'られる' ||
      raw.surface === 'れる' || raw.surface === 'られる')) {
      hinshi = '助動詞';
      independent = false;
      subHinshi = '受身・自発・可能・尊敬';
      addWarning(
        diagnostics,
        token,
        'MODERN_RERU_AMBIGUOUS',
        'The school-grammar meaning of れる/られる cannot be established from IPAdic alone.',
      );
    }

    if (raw.pos === '助動詞' && raw.conjugationType === '特殊・ダ' && token.kind !== 'adjectival' &&
      token.kind !== 'sou' && token.kind !== 'you') {
      hinshi = '助動詞';
      independent = false;
      subHinshi = '断定';
    }

    if (raw.surface === 'に' && raw.pos === '助詞' &&
      (raw.posDetail1 === '副詞化' || isNiConjunctiveContext(tokens, index))) {
      subHinshi = '接続助詞';
    }

    if (raw.surface === 'の' && raw.pos === '助詞') {
      if (raw.posDetail1 === '連体化') subHinshi = '格助詞';
      else if (raw.posDetail1 === '終助詞') subHinshi = '終助詞';
      else if (raw.posDetail1 === '副詞化') subHinshi = '副助詞';
      else if (raw.posDetail1 === '格助詞' && raw.posDetail2 === '連体') subHinshi = '格助詞';
      else subHinshi = '準体助詞';
    }

    if (raw.surface === 'の' && raw.baseForm === 'の' && raw.pos === '名詞' && raw.posDetail1 === '非自立') {
      hinshi = '助詞';
      subHinshi = '準体助詞';
      independent = false;
      katsuyouType = undefined;
      katsuyoukei = undefined;
    }

    if (raw.pos === '助詞' && raw.posDetail1 === '副助詞／並立助詞／終助詞') {
      subHinshi = compoundKaSubHinshi(tokens, index);
    }

    if (raw.surface === 'あの' && (raw.pos === 'フィラー' || raw.pos === '連体詞')) {
      const next = tokens[index + 1]?.source.raw;
      // Special case: あのさ (filler + 終助詞) -> 感動詞 + 終助詞
      // kuromoji may tokenize さ as either 助詞/終助詞 or 名詞/接尾/特殊 depending on following punctuation
      const isSaParticle = next?.surface === 'さ' &&
        ((next?.pos === '助詞' && next?.posDetail1 === '終助詞') ||
          (next?.pos === '名詞' && next?.posDetail1 === '接尾' && next?.posDetail2 === '特殊'));
      if (isSaParticle) {
        hinshi = '感動詞';
        subHinshi = undefined;
        independent = true;
      }
      // First priority: next is 記号 or end of sentence -> 感動詞
      else if (!next || next.pos === '記号') {
        hinshi = '感動詞';
        subHinshi = undefined;
        independent = true;
      } else {
        hinshi = anoModifiesNominal(tokens, index) ? '連体詞' : '感動詞';
        subHinshi = undefined;
        independent = true;
      }
    }

    // Special case: さ after あの (あのさ filler expression)
    // kuromoji may tokenize さ as 名詞/接尾/特殊 when followed by punctuation like ！
    if (raw.surface === 'さ' && raw.pos === '名詞' && raw.posDetail1 === '接尾' && raw.posDetail2 === '特殊') {
      const prev = tokens[index - 1]?.source.raw;
      if (prev?.surface === 'あの' && prev?.pos === 'フィラー') {
        hinshi = '助詞';
        subHinshi = '終助詞';
        independent = false;
      }
    }

    if (katsuyoukei === '終止形' && isAttributiveContext(tokens, index) &&
      (hinshi === '動詞' || hinshi === '形容詞' || hinshi === '助動詞')) {
      katsuyoukei = '連体形';
    } else if (katsuyoukei === '連体形' && isTerminalContext(tokens, index) &&
      (hinshi === '動詞' || hinshi === '形容詞' || hinshi === '助動詞')) {
      katsuyoukei = '終止形';
    }

    if (raw.pos === '記号') {
      hinshi = '記号';
      subHinshi = undefined;
      independent = true;
    } else if (!hinshi) {
      hinshi = '名詞';
      subHinshi = raw.pos || '未知';
      independent = true;
      addWarning(diagnostics, token, 'MODERN_POS_UNSUPPORTED', `Unsupported part of speech '${raw.pos}' was retained as a noun-like token.`);
    }

    if (raw.conjugationType && !katsuyouType && (hinshi === '動詞' || hinshi === '形容詞' || hinshi === '助動詞')) {
      katsuyouType = 'その他';
      addWarning(diagnostics, token, 'MODERN_KATSUYOU_TYPE_UNSUPPORTED', 'An unsupported conjugation type was mapped to その他.');
    }
    if (raw.conjugatedForm && !katsuyoukei && (hinshi === '動詞' || hinshi === '形容詞' || hinshi === '助動詞')) {
      addWarning(diagnostics, token, 'MODERN_KATSUYOU_FORM_UNSUPPORTED', 'An unsupported conjugated form was left unspecified.');
    }

    const result: Tango = {
      id: `modern-tango-${tango.length}`,
      surface: token.surface,
      hinshi,
      isIndependent: independent,
      start: token.start,
      end: token.end,
      rawMorphemes: rawMorphemesOf(token),
    };
    if (token.baseForm !== undefined) result.baseForm = token.baseForm;
    if (token.reading !== undefined) result.reading = token.reading;
    if (subHinshi !== undefined && subHinshi !== '*') result.subHinshi = subHinshi;
    if (katsuyouType !== undefined) result.katsuyouType = katsuyouType;
    if (katsuyoukei !== undefined) result.katsuyoukei = katsuyoukei;
    if (meaningTags !== undefined) result.meaningTags = meaningTags;
    tango.push(result);
  });

  return { tango, diagnostics };
}
