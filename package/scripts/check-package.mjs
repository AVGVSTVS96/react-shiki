// Packaging regression checks, run against dist after `pnpm build`
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
};

// CSS imports in published JS crash plain Node ESM
for (const file of await readdir(dist)) {
  if (!file.endsWith('.mjs')) continue;
  const code = await readFile(join(dist, file), 'utf8');
  if (/import\s+['"][^'"]+\.css['"]/.test(code)) {
    fail(`${file} contains a CSS import`);
  }
}

const styleCss = await readFile(join(dist, 'style.css'), 'utf8').catch(
  () => fail('dist/style.css missing')
);
if (styleCss && !styleCss.includes('.rs-root')) {
  fail('dist/style.css missing component styles');
}

for (const entry of ['index.mjs', 'web.mjs', 'core.mjs']) {
  try {
    await import(join(dist, entry));
  } catch (error) {
    fail(
      `plain Node ESM import of dist/${entry} failed: ${error.message}`
    );
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log('✓ package integrity checks passed');
