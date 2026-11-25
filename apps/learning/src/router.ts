export type Route =
  | { name: 'sandbox' }
  | { name: 'analysis-scope' }
  | { name: 'about' }
  | { name: 'not-found' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'sandbox' };
  if (parts.length === 1 && parts[0] === 'sandbox') return { name: 'sandbox' };
  if (parts.length === 1 && parts[0] === 'analysis-scope') return { name: 'analysis-scope' };
  if (parts.length === 1 && parts[0] === 'about') return { name: 'about' };
  return { name: 'not-found' };
}

export function lessonHref(id: string): string { return `#/lessons/${encodeURIComponent(id)}`; }
