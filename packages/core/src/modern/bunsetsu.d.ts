import type { Bunsetsu, Diagnostic, Tango } from '../types.js';
export interface BunsetsuResult {
    bunsetsu: Bunsetsu[];
    diagnostics: Diagnostic[];
}
/** Group one independent word with all following dependent words. */
export declare function groupModernBunsetsu(tango: readonly Tango[]): BunsetsuResult;
