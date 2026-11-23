import type { Diagnostic } from './types.js';

export function diagnostic(
  code: string,
  message: string,
  severity: Diagnostic['severity'],
  location: Pick<Diagnostic, 'start' | 'end' | 'morphemeIds' | 'tangoIds'> = {},
): Diagnostic {
  return { code, message, severity, ...location };
}
