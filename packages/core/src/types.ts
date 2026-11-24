export type GrammarMode = 'modern' | 'classical';

export type Hinshi =
  | '動詞'
  | '形容詞'
  | '形容動詞'
  | '名詞'
  | '副詞'
  | '連体詞'
  | '接続詞'
  | '感動詞'
  | '助動詞'
  | '助詞';

export type ModernKatsuyoukei = '未然形' | '連用形' | '終止形' | '連体形' | '仮定形' | '命令形';
export type ClassicalKatsuyoukei = '未然形' | '連用形' | '終止形' | '連体形' | '已然形' | '命令形';
export type Katsuyoukei = ModernKatsuyoukei | ClassicalKatsuyoukei;

export type ModernKatsuyouType =
  | '五段'
  | '上一段'
  | '下一段'
  | 'カ変'
  | 'サ変'
  | '形容詞'
  | '特殊・ダ'
  | '特殊・デス'
  | '特殊・マス'
  | '特殊・タイ'
  | '特殊・タ'
  | '特殊・ナイ'
  | '特殊・ヌ'
  | '特殊・ラシイ'
  | '文語・ベシ'
  | 'その他';

export type ClassicalKatsuyouType =
  | '四段'
  | '上二段'
  | '下二段'
  | '上一段'
  | '下一段'
  | 'カ変'
  | 'サ変'
  | 'ナ変'
  | 'ラ変'
  | 'ク活用'
  | 'シク活用'
  | 'ナリ活用'
  | 'タリ活用';

export type KatsuyouType = ModernKatsuyouType | ClassicalKatsuyouType;

export interface RawMorpheme {
  surface: string;
  reading?: string;
  baseForm?: string;
  pos: string;
  posDetail1?: string;
  posDetail2?: string;
  posDetail3?: string;
  conjugationType?: string;
  conjugatedForm?: string;
  start: number;
  end: number;
}

export interface KakarimusubiLink {
  particleTangoId: string;
  predicateTangoId: string;
  particle: 'ぞ' | 'なむ' | 'や' | 'か' | 'こそ';
}

export interface Tango {
  id: string;
  surface: string;
  baseForm?: string;
  reading?: string;
  hinshi: Hinshi;
  subHinshi?: string;
  katsuyouType?: KatsuyouType;
  katsuyoukei?: Katsuyoukei;
  isIndependent: boolean;
  start: number;
  end: number;
  rawMorphemes?: RawMorpheme[];
  historicalKana?: string;
  modernReading?: string;
  kakarimusubi?: KakarimusubiLink[];
  meaningTags?: string[];
}

export interface Bunsetsu {
  id: string;
  tango: Tango[];
  start: number;
  end: number;
}

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export interface Diagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  start?: number;
  end?: number;
  morphemeIds?: number[];
  tangoIds?: string[];
}

export interface ParseResult {
  mode: GrammarMode;
  text: string;
  bunsetsu: Bunsetsu[];
  diagnostics: Diagnostic[];
}

export type ClassicalTangoInput = Omit<Tango, 'rawMorphemes' | 'katsuyoukei' | 'katsuyouType'> & {
  katsuyoukei?: ClassicalKatsuyoukei;
  katsuyouType?: ClassicalKatsuyouType;
};

export interface ClassicalPassageInput {
  text: string;
  bunsetsu: Array<Omit<Bunsetsu, 'tango'> & { tango: ClassicalTangoInput[] }>;
}
