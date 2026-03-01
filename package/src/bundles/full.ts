import {
  getSingletonHighlighter,
  bundledLanguages,
  type Highlighter,
  type Awaitable,
  type RegexEngine,
} from 'shiki';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import type { Language, Theme } from '../lib/types';
import { isLoadableLanguage } from '../lib/resolvers';

/**
 * Creates a highlighter using the full Shiki bundle with all languages and themes.
 * This is the largest bundle but provides maximum compatibility.
 */
export async function createFullHighlighter(
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
