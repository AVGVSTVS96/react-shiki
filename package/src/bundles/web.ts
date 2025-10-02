import {
  getSingletonHighlighter,
  type Highlighter,
  type Awaitable,
  type RegexEngine,
} from 'shiki/bundle/web';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import type { ShikiLanguageRegistration } from '../lib/extended-types';
import type { Theme } from '../lib/types';

/**
 * Creates a highlighter using the web Shiki bundle with web-focused languages.
 * Smaller than the full bundle while covering most web development needs.
 * Includes: HTML, CSS, JS, TS, JSON, Markdown, Vue, JSX, Svelte, etc.
 */
export async function createWebHighlighter(
  langsToLoad: ShikiLanguageRegistration,
  themesToLoad: Theme[],
  engine?: Awaitable<RegexEngine>
): Promise<Highlighter> {
  try {
    return await getSingletonHighlighter({
      langs: [langsToLoad],
      themes: themesToLoad,
      engine: engine ?? createOnigurumaEngine(import('shiki/wasm')),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Language')) {
      return await getSingletonHighlighter({
        langs: ['plaintext'],
        themes: themesToLoad,
        engine: engine ?? createOnigurumaEngine(import('shiki/wasm')),
      });
    }
    throw error;
  }
}
