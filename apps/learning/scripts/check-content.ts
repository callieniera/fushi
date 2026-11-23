import { loadCurriculum } from '../src/content/load-content.js';

const content = loadCurriculum();
console.log(`Validated ${content.lessons.length} lessons, ${content.passages.length} passages, and ${content.exercises.length} exercises.`);
