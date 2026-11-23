import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outputRoot = 'dist';
const modules = [
  ['packages/core/dist', 'core'],
  ['packages/engine-kuromoji/dist', 'kuromoji'],
];

rmSync(outputRoot, { recursive: true, force: true });
for (const [source, destination] of modules) {
  cpSync(source, join(outputRoot, destination), {
    recursive: true,
    filter: (path) => !path.endsWith('.tsbuildinfo'),
  });
}

function rewriteCoreImports(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      rewriteCoreImports(path);
    } else if (/\.(?:js|d\.ts)$/.test(path)) {
      const source = readFileSync(path, 'utf8');
      writeFileSync(path, source.replaceAll("'@lib/core'", "'../core/index.js'"));
    }
  }
}

rewriteCoreImports(join(outputRoot, 'kuromoji'));
const entryPoint = "export * from './core/index.js';\nexport * from './kuromoji/index.js';\n";
writeFileSync(join(outputRoot, 'index.js'), entryPoint);
writeFileSync(join(outputRoot, 'index.d.ts'), entryPoint);
