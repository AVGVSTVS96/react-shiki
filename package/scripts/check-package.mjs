// Packaging regression checks, run against dist after `pnpm build`
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rolldown } from 'rolldown';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

const entries = ['index.mjs', 'web.mjs', 'core.mjs'];

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
}

// Tree-shaking hook-only bundles depends on the factory calls staying
// pure-annotated (injection happens when the component mounts)
for (const entry of entries) {
  const code = await readFile(join(dist, entry), 'utf8');
  if (!/__PURE__\s*\*\/\s*createShikiHighlighterComponent\(/.test(code)) {
    fail(
      `${entry} factory call lost its PURE annotation, hook-only consumers would bundle the component`
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

for (const entry of entries) {
  try {
    await import(pathToFileURL(join(dist, entry)).href);
  } catch (error) {
    fail(
      `plain Node ESM import of dist/${entry} failed: ${error.message}`
    );
  }
}

// Bundle dist as a consumer would and verify what tree-shaking keeps:
// hook-only bundles must drop the component and its styles entirely
const bundleDist = async (source) => {
  const bundle = await rolldown({
    input: 'virtual-entry',
    external: (id) =>
      id !== 'virtual-entry' &&
      !id.startsWith('file:') &&
      !id.startsWith('.') &&
      !id.startsWith('/'),
    logLevel: 'silent',
    plugins: [
      {
        name: 'virtual-entry',
        resolveId: (id) => (id === 'virtual-entry' ? id : null),
        load: (id) => (id === 'virtual-entry' ? source : null),
      },
    ],
  });
  const { output } = await bundle.generate({ format: 'esm' });
  await bundle.close();
  return output[0].code;
};

const indexPath = pathToFileURL(join(dist, 'index.mjs')).href;
const hookOnly = await bundleDist(
  `export { useShikiHighlighter } from ${JSON.stringify(indexPath)};`
);
if (hookOnly.includes('rs-root')) {
  fail('hook-only bundle retains the component or its styles');
}
if (!hookOnly.includes('.rs-highlighted-line')) {
  fail('hook-only bundle dropped the gated feature styles');
}

const withComponent = await bundleDist(
  `export { ShikiHighlighter } from ${JSON.stringify(indexPath)};`
);
if (!withComponent.includes(':where(.rs-root)')) {
  fail('component bundle dropped the component styles');
}

if (process.exitCode) process.exit(process.exitCode);
console.log('✓ package integrity checks passed');
