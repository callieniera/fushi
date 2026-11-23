import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KUROMOJI_DICTIONARY_FILES } from '../dist/kuromoji/index.js';

const require = createRequire(import.meta.url);
const packageDirectory = dirname(require.resolve('kuromoji/package.json'));
const appDirectory = fileURLToPath(new URL('../apps/learning/', import.meta.url));
const { version } = JSON.parse(readFileSync(join(appDirectory, 'dictionary.json'), 'utf8'));
if (typeof version !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(version)) {
  throw new Error('Dictionary version must contain only letters, digits, dots, underscores, or hyphens.');
}

const output = join(appDirectory, 'public/dictionaries/kuromoji', version);
const sourceNotices = ['NOTICE.md', 'LICENSE-2.0.txt'];
const required = [
  ...KUROMOJI_DICTIONARY_FILES.map((file) => join('dict', file)),
  ...sourceNotices,
];
for (const file of required) {
  if (!existsSync(join(packageDirectory, file))) throw new Error(`Required kuromoji asset is missing: ${file}`);
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of KUROMOJI_DICTIONARY_FILES) {
  copyFileSync(join(packageDirectory, 'dict', file), join(output, file));
}
const notices = join(appDirectory, 'public/dictionaries/notices');
mkdirSync(notices, { recursive: true });
for (const file of sourceNotices) {
  copyFileSync(join(packageDirectory, file), join(notices, file));
}
console.log(`Copied ${KUROMOJI_DICTIONARY_FILES.length} IPAdic files and license notices for ${version}.`);
