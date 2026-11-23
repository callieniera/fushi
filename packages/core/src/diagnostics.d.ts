import type { Diagnostic } from './types.js';
export declare function diagnostic(code: string, message: string, severity: Diagnostic['severity'], location?: Pick<Diagnostic, 'start' | 'end' | 'morphemeIds' | 'tangoIds'>): Diagnostic;
