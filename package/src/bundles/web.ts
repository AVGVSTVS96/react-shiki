import {
  getSingletonHighlighter,
  bundledLanguages,
  type Highlighter,
  type Awaitable,
  type RegexEngine,
} from 'shiki/bundle/web';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import type { Language, Theme } from '../lib/types';
import { isLoadableLanguage } from '../lib/resolvers';

/**
 * Creates a highlighter using the web Shiki bundle with web-focused languages.
 * Smaller than the full bundle while covering most web development needs.
 * Includes: HTML, CSS, JS, TS, JSON, Markdown, Vue, JSX, Svelte, etc.
 */
export async function createWebHighlighter(
  langsToLoad: Language,
  themesToLoad: Theme[],
  engine?: Awaitable<RegexEngine>
): Promise<Highlighter> {
  const langs = isLoadableLanguage(langsToLoad, bundledLanguages)
    ? [langsToLoad]
    : [];

  return await getSingletonHighlighter({
    langs,
    themes: themesToLoad,
    engine: engine ?? createOnigurumaEngine(import('shiki/wasm')),
  });
}
