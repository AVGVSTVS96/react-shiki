// Packaging regression checks, run against dist after `pnpm build`
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

for (const file of await readdir(dist)) {
  if (!file.endsWith('.mjs')) continue;
  const code = await readFile(join(dist, file), 'utf8');
  // CSS imports in published JS crash plain Node ESM
  // (\s* and `from` catch minified and binding forms)
  if (
    /(?:\bimport|\bfrom)\s*['"][^'"]+\.css(?:\?[^'"]*)?['"]/.test(code)
  ) {
    fail(`${file} contains a CSS import`);
  }
  // Style injection survives tree-shaking only because bundlers must
  // retain a factory call that isn't annotated pure
  if (/__PURE__\s*\*\/\s*createShikiHighlighterComponent\(/.test(code)) {
    fail(
      `${file} has a PURE-annotated factory call, bundlers would strip style injection`
    );
  }
}

const styleCss = await readFile(join(dist, 'style.css'), 'utf8').catch(
  () => fail('dist/style.css missing')
);
for (const selector of ['.rs-root', '.rs-highlighted-line']) {
  if (styleCss && !styleCss.includes(selector)) {
    fail(`dist/style.css missing ${selector} styles`);
  }
}

for (const entry of ['index.mjs', 'web.mjs', 'core.mjs']) {
  try {
    await import(pathToFileURL(join(dist, entry)).href);
  } catch (error) {
    fail(
      `plain Node ESM import of dist/${entry} failed: ${error.message}`
    );
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log('✓ package integrity checks passed');
