import { diagnostic } from '../diagnostics.js';
/** Group one independent word with all following dependent words. */
export function groupModernBunsetsu(tango) {
    const diagnostics = [];
    const bunsetsu = [];
    let current = [];
    const flush = () => {
        const first = current[0];
        const last = current[current.length - 1];
        if (!first || !last)
            return;
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
            flush();
            current = [token];
        }
        else {
            if (current.length === 0) {
                diagnostics.push(diagnostic('MODERN_BUNSETSU_LEADING_DEPENDENT', 'A dependent word without a preceding independent word was retained in its own bunsetsu.', 'warning', {
                    start: token.start,
                    end: token.end,
                    tangoIds: [token.id],
                }));
            }
            current.push(token);
        }
    }
    flush();
    return { bunsetsu, diagnostics };
}
