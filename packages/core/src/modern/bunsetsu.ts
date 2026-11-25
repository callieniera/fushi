import { diagnostic } from '../diagnostics.js';
import type { Bunsetsu, Diagnostic, Tango } from '../types.js';

export interface BunsetsuResult {
  bunsetsu: Bunsetsu[];
  diagnostics: Diagnostic[];
}

function continuesSahenBunsetsu(previous: Tango, next: Tango): boolean {
  const hasSahenNoun = previous.rawMorphemes?.some(
    ({ pos, posDetail1 }) => pos === '名詞' && posDetail1 === 'サ変接続',
  ) === true;
  const hasLinkedSuru = next.rawMorphemes?.some(
    ({ pos, baseForm, conjugatedForm }) =>
      pos === '動詞' && baseForm === 'する' && conjugatedForm === '未然レル接続',
  ) === true;
  return previous.end === next.start && hasSahenNoun && hasLinkedSuru;
}

/** Group one independent word with all following dependent words. */
export function groupModernBunsetsu(tango: readonly Tango[]): BunsetsuResult {
  const diagnostics: Diagnostic[] = [];
  const bunsetsu: Bunsetsu[] = [];
  let current: Tango[] = [];

  const flush = () => {
    const first = current[0];
    const last = current[current.length - 1];
    if (!first || !last) return;
    bunsetsu.push({
      id: `modern-bunsetsu-${bunsetsu.length}`,
      tango: current,
      start: first.start,
      end: last.end,
    });
    current = [];
  };

  for (const token of tango) {
    if (token.isIndependent) {
      const previous = current[current.length - 1];
      if (previous && continuesSahenBunsetsu(previous, token)) {
        current.push(token);
        continue;
      }
      flush();
      current = [token];
    } else {
      if (current.length === 0) {
        diagnostics.push(
          diagnostic(
            'MODERN_BUNSETSU_LEADING_DEPENDENT',
            'A dependent word without a preceding independent word was retained in its own bunsetsu.',
            'warning',
            {
              start: token.start,
              end: token.end,
              tangoIds: [token.id],
            },
          ),
        );
      }
      current.push(token);
    }
  }
  flush();
  return { bunsetsu, diagnostics };
}
