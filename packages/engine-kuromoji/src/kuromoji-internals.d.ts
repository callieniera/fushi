declare module 'kuromoji/src/Tokenizer.js' {
  import type { IpadicFeatures, Tokenizer as IpadicTokenizer } from 'kuromoji';

  const Tokenizer: new (dictionaries: unknown) => IpadicTokenizer<IpadicFeatures>;
  export default Tokenizer;
}

declare module 'kuromoji/src/dict/DynamicDictionaries.js' {
  export default class DynamicDictionaries {
    loadTrie(base: Int32Array, check: Int32Array): this;
    loadTokenInfoDictionaries(tokenInfo: Uint8Array, pos: Uint8Array, targetMap: Uint8Array): this;
    loadConnectionCosts(connectionCosts: Int16Array): this;
    loadUnknownDictionaries(
      unknown: Uint8Array,
      unknownPos: Uint8Array,
      unknownMap: Uint8Array,
      categoryMap: Uint8Array,
      compatibleCategoryMap: Uint32Array,
      invokeDefinition: Uint8Array,
    ): this;
  }
}
