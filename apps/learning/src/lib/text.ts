export interface TextPart {
  start: number;
  end: number;
  text: string;
}

export function splitTextParts(text: string): TextPart[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(text), (part) => ({
      start: part.index,
      end: part.index + part.segment.length,
      text: part.segment,
    }));
  }
  return Array.from(text).reduce<TextPart[]>((parts, character) => {
    const start = parts.at(-1)?.end ?? 0;
    parts.push({ start, end: start + character.length, text: character });
    return parts;
  }, []);
}
