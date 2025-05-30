/**
 * Testing bundle optimization
 */
import { getSingletonHighlighter } from 'shiki';
import type { Highlighter } from 'shiki';
import type { ShikiLanguageRegistration } from './extended-types';
import type { Theme } from './types';

export async function createInternalHighlighter(
  langsToLoad: ShikiLanguageRegistration,
  themesToLoad: Theme[]
): Promise<Highlighter> {
  return getSingletonHighlighter({
    langs: [langsToLoad],
    themes: themesToLoad,
  });
}
