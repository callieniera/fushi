import { loadCurriculum } from './load-content.js';

let cached: ReturnType<typeof loadCurriculum> | undefined;

export function curriculum(): ReturnType<typeof loadCurriculum> {
  cached ??= loadCurriculum();
  return cached;
}
