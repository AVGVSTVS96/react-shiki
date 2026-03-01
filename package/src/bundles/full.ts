import {
  getSingletonHighlighter,
  bundledLanguages,
  type Highlighter,
  type Awaitable,
  type RegexEngine,
} from 'shiki';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import type { ShikiLanguageRegistration } from '../lib/extended-types';
import type { Theme } from '../lib/types';
/**
 * Creates a highlighter using the full Shiki bundle with all languages and themes.
 * This is the largest bundle but provides maximum compatibility.
 */
export async function createFullHighlighter(
  langsToLoad: ShikiLanguageRegistration,
  themesToLoad: Theme[],
  engine?: Awaitable<RegexEngine>
): Promise<Highlighter> {
  const langs =
    langsToLoad != null &&
    (typeof langsToLoad !== 'string' || langsToLoad in bundledLanguages)
      ? [langsToLoad]
      : [];

  return await getSingletonHighlighter({
    langs,
    themes: themesToLoad,
    engine: engine ?? createOnigurumaEngine(import('shiki/wasm')),
  });
}
