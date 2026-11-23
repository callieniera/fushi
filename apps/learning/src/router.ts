export type Route =
  | { name: 'lessons' }
  | { name: 'lesson'; id: string }
  | { name: 'drills' }
  | { name: 'sandbox' }
  | { name: 'about' }
  | { name: 'not-found' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0 || (parts[0] === 'lessons' && parts.length === 1)) return { name: 'lessons' };
  if (parts[0] === 'lessons' && parts.length === 2 && parts[1]) return { name: 'lesson', id: decodeURIComponent(parts[1]) };
  if (parts.length === 1 && parts[0] === 'drills') return { name: 'drills' };
  if (parts.length === 1 && parts[0] === 'sandbox') return { name: 'sandbox' };
  if (parts.length === 1 && parts[0] === 'about') return { name: 'about' };
  return { name: 'not-found' };
}

export function lessonHref(id: string): string { return `#/lessons/${encodeURIComponent(id)}`; }
