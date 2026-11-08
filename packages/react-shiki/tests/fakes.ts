import { createHighlighterCoreSync } from 'shiki/core';
import type { HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { vi } from 'vitest';

export const createFakeHighlighter = (
  html = '<pre class="shiki"><code>ok</code></pre>'
) => ({
  ...createHighlighterCoreSync({ engine: createJavaScriptRegexEngine() }),
  getBundledLanguages: vi.fn<HighlighterCore['getBundledLanguages']>(
    () => ({})
  ),
  getLoadedLanguages: vi.fn<HighlighterCore['getLoadedLanguages']>(() => [
    'javascript',
  ]),
  loadLanguage: vi.fn<HighlighterCore['loadLanguage']>(),
  codeToHtml: vi.fn<HighlighterCore['codeToHtml']>(() => html),
  codeToHast: vi.fn<HighlighterCore['codeToHast']>(() => ({
    type: 'root',
    children: [],
  })),
});

export const outOfType = <T>(
  value: T | string | Record<string, string | number>
): T =>
  // SAFETY: tests feed runtime guards values the types forbid, as plain-JS callers can
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the value is out of type on purpose
  value as T;
