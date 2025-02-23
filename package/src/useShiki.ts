// last working
import { 
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';

import parse from 'html-react-parser';

import { 
  createHighlighter,
  createSingletonShorthands
} from 'shiki';

import type { 
  Language, 
  Theme, 
  HighlighterOptions, 
  TimeoutState
} from './types';

import { 
  removeTabIndexFromPre,
  throttleHighlighting
} from './utils';

// We use a singleton for bundled languages, but for custom languages we'll create a fresh instance.
const highlighter = createSingletonShorthands(createHighlighter);

/**
 * A React hook that provides syntax highlighting using Shiki.
 * Supports optional throttled highlights and custom themes.
 *
 * @example
 * const highlightedCode = useShikiHighlighter(code, language, theme, {
 *   transformers: [removeTabIndexFromPre],
 *   delay: 150
 *   customLanguages: ['bosque', 'mcfunction']
 * });
 */
export const useShikiHighlighter = (
  code: string,
  lang: Language,
  theme: Theme,
  options: HighlighterOptions = {}
) => {
  const [highlightedCode, setHighlightedCode] = useState<ReactNode | null>(null);
  const isCustomLang = typeof lang === 'object' && lang !== null;
  // Derive the identifier you want to use – e.g. the first file type or a simpler alias.
  const languageIdentifier = isCustomLang
    ? ((lang as any).fileTypes?.[0] || (lang as any).name)
    : lang;

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  useEffect(() => {
    let isMounted = true;
    const transformers = [removeTabIndexFromPre, ...(options.transformers || [])];

    const highlightCode = async () => {
      let shikiInstance;
      if (isCustomLang) {
        // Create a fresh highlighter instance with a langAlias mapping:
        shikiInstance = await createHighlighter({
          langs: [],
          themes: [theme],
          langAlias: {
            // Map alias to the custom language's name.
            [languageIdentifier]: (lang as any).name,
          },
        });
        try {
          await shikiInstance.loadLanguage(lang); // load the custom language
        } catch (error) {
          console.error('[highlightCode] Error loading custom language:', error);
        }
      } else {
        shikiInstance = await highlighter.getSingletonHighlighter({
          langs: [languageIdentifier],
          themes: [theme],
        });
      }
      
      try {
        const html = shikiInstance.codeToHtml(code, {
          lang: languageIdentifier,
          theme,
          transformers,
        });
        if (isMounted) {
          setHighlightedCode(parse(html));
        }
      } catch (err) {
        console.error('[highlightCode] Error during codeToHtml:', err);
      }
    };

    const { delay } = options;
    if (delay) {
      throttleHighlighting(highlightCode, timeoutControl, delay);
    } else {
      highlightCode().catch(console.error);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutControl.current.timeoutId);
    };
  }, [code, lang]);

  return highlightedCode;
};
