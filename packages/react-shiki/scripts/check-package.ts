import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rolldown } from 'rolldown';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

const fail = (msg: string) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

const entries = new Set(['index.mjs', 'web.mjs', 'core.mjs']);

const distFiles = await readdir(dist);

const modules = await Promise.all(
  distFiles
    .filter((file) => file.endsWith('.mjs'))
    .map(async (file) => ({
      code: await readFile(path.join(dist, file), 'utf-8'),
      file,
    }))
);

for (const { file, code } of modules) {
  if (
    /(?:\bimport|\bfrom)\s*['"][^'"]+\.css(?:\?[^'"]*)?['"]/u.test(code)
  ) {
    fail(`${file} contains a CSS import, which crashes plain Node ESM`);
  }

  if (
    entries.has(file) &&
    !/__PURE__\s*\*\/\s*createShikiHighlighterComponent\(/u.test(code)
  ) {
    fail(
      `${file} factory call lost its PURE annotation, hook-only consumers would bundle the component`
    );
  }
}

const styleCss = await readFile(
  path.join(dist, 'style.css'),
  'utf-8'
).catch(() => {
  fail('dist/style.css missing');

  return '';
});

for (const selector of ['.rs-root', '.rs-highlighted-line']) {
  if (styleCss !== '' && !styleCss.includes(selector)) {
    fail(`dist/style.css missing ${selector} styles`);
  }
}

await Promise.all(
  [...entries].map(async (entry) => {
    try {
      await import(pathToFileURL(path.join(dist, entry)).href);
    } catch (error) {
      fail(
        `plain Node ESM import of dist/${entry} failed: ${String(error)}`
      );
    }
  })
);

const bundleAsConsumer = async (source: string) => {
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

const indexPath = pathToFileURL(path.join(dist, 'index.mjs')).href;

const hookOnly = await bundleAsConsumer(
  `export { useShikiHighlighter } from ${JSON.stringify(indexPath)};`
);

if (hookOnly.includes('rs-root')) {
  fail('hook-only bundle retains the component or its styles');
}

if (!hookOnly.includes('.rs-highlighted-line')) {
  fail('hook-only bundle dropped the gated feature styles');
}

const withComponent = await bundleAsConsumer(
  `export { ShikiHighlighter } from ${JSON.stringify(indexPath)};`
);

if (!withComponent.includes(':where(.rs-root)')) {
  fail('component bundle dropped the component styles');
}

if (process.exitCode !== undefined && process.exitCode !== 0) {
  process.exit(process.exitCode);
}

console.log('✓ package integrity checks passed');
