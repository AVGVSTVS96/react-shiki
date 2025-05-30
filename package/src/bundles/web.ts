import { getSingletonHighlighter, type Highlighter } from 'shiki/bundle/web';
import type { ShikiLanguageRegistration } from '../lib/extended-types';
import type { Theme } from '../lib/types';

/**
 * Creates a highlighter using the web Shiki bundle with web-focused languages.
 * Smaller than the full bundle while covering most web development needs.
 * Includes: HTML, CSS, JS, TS, JSON, Markdown, Vue, JSX, Svelte, etc.
 */
export async function createWebHighlighter(
  langsToLoad: ShikiLanguageRegistration,
  themesToLoad: Theme[]
): Promise<Highlighter> {
  return getSingletonHighlighter({
    langs: [langsToLoad],
    themes: themesToLoad,
  });
}