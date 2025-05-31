import { getSingletonHighlighter, type Highlighter } from 'shiki';
import type { ShikiLanguageRegistration } from '../lib/extended-types';
import type { Theme } from '../lib/types';

/**
 * Creates a highlighter using the full Shiki bundle with all languages and themes.
 * This is the largest bundle but provides maximum compatibility.
 */
export async function createFullHighlighter(
  langsToLoad: ShikiLanguageRegistration,
  themesToLoad: Theme[]
): Promise<Highlighter> {
  try {
    return await getSingletonHighlighter({
      langs: [langsToLoad],
      themes: themesToLoad,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Language')) {
      return await getSingletonHighlighter({
        langs: ['plaintext'],
        themes: themesToLoad,
      });
    }
    throw error;
  }
}
