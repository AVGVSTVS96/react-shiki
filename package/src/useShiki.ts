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
  throttleHighlighting,
  resolvedLang
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
  const isCustom = lang && typeof lang === 'object';

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  useEffect(() => {
    let isMounted = true;
    const transformers = [removeTabIndexFromPre, ...(options.transformers || [])];

    const highlightCode = async () => {
      let html: string;

      if (isCustom) {
        // Build an alias mapping from all declared file types to the custom language's original name.
        const aliasMapping = ((lang as any).fileTypes || []).reduce((acc: Record<string, string>, ft: string) => {
          acc[ft] = (lang as any).name;
          return acc;
        }, {} as Record<string, string>);

        // Create a fresh highlighter instance with our alias mapping.
        const shikiInstance = await createHighlighter({
          langs: [],
          themes: [theme],
          langAlias: aliasMapping,
        });
        try {
          await shikiInstance.loadLanguage(lang);
        } catch (err) {
          console.error('[highlightCode] Error loading custom language:', err);
        }
        html = shikiInstance.codeToHtml(code, {
          lang: lang.name,
          theme,
          transformers,
        });
      } else {
        // Bundled languages: use the cached singleton instance (with automatic loading).
        html = await highlighter.codeToHtml(code, {
          lang: resolvedLang(lang),
          theme,
          transformers,
        });
      }

      if (isMounted) {
        setHighlightedCode(parse(html));
      }
    };

    if (options.delay) {
      throttleHighlighting(highlightCode, timeoutControl, options.delay);
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
