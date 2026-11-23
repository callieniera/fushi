import dictionary from '../dictionary.json' with { type: 'json' };

export const DICTIONARY_VERSION = dictionary.version;
export const DICTIONARY_PATH = `dictionaries/kuromoji/${DICTIONARY_VERSION}/`;
export const DICTIONARY_CACHE_NAME = `fushi-ipadic-${DICTIONARY_VERSION}`;

export function dictionaryUrl(baseUrl = import.meta.env.BASE_URL): string {
  return `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}${DICTIONARY_PATH}`;
}
