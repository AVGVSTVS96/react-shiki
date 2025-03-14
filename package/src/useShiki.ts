import {
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from 'react';

import parse from 'html-react-parser';

import {
  createHighlighter,
  createSingletonShorthands,
  type Highlighter,
} from 'shiki';

import type {
  LanguageRegistration,
  ShikiLanguageRegistration,
} from './customTypes';

import type {
  Language,
  Theme,
  HighlighterOptions,
  TimeoutState,
} from './types';

import {
  removeTabIndexFromPre,
  throttleHighlighting,
  resolveLanguage,
} from './utils';

// Use Shiki managed singleton for bundled languages, create and cache a fresh instance for custom languages
const highlighter = createSingletonShorthands(createHighlighter);
const customHighlighterCache = new Map<string, Promise<Highlighter>>();

const isMultiThemeConfig = (
  value: Theme
): value is Record<string, Theme> =>
  typeof value === 'object' &&
  !('name' in value) &&
  Object.keys(value).length > 0;

const getCachedCustomHighlighter = async (
  cacheKey: string,
  customLang: LanguageRegistration,
  isMultiTheme: boolean,
  themes?: Record<string, Theme>,
  theme?: Theme
): Promise<Highlighter> => {
  let instance = customHighlighterCache.get(cacheKey);
  if (!instance) {
    instance = createHighlighter({
      langs: [customLang as ShikiLanguageRegistration],
      themes:
        isMultiTheme && themes
          ? Object.values(themes)
          : theme
            ? [theme]
            : [],
    });
    customHighlighterCache.set(cacheKey, instance);
  }
  return instance;
};

/**
 * A React hook that provides syntax highlighting using Shiki.
 * Supports single theme and multi-theme highlighting, custom themes
 * and languages, custom transformers, and optional throttling.
 *
 * @example Custom Languages and Transformers
 * const highlightedCode = useShikiHighlighter(code, language, theme, {
 *   transformers: [customTransformer],
 *   delay: 150
 *   customLanguages: ['bosque', 'mcfunction']
 * });
 *
 * @example Single Theme Usage
 * ```tsx
 * const highlightedCode = useShikiHighlighter( code, 'typescript', 'github-dark');
 * ```
 *
 * @example Multi-Theme Usage
 * ```tsx
 * const highlightedCode = useShikiHighlighter(
 *   code,
 *   'typescript',
 *   { light: 'github-light', dark: 'github-dark' },
 *   { defaultColor: 'light' }
 * );
 * ```
 */
export const useShikiHighlighter = (
  code: string,
  lang: Language,
  themeInput: Theme | Record<string, Theme>,
  options: HighlighterOptions = {}
) => {
  const [highlightedCode, setHighlightedCode] =
    useState<ReactNode | null>(null);

  const normalizedCustomLanguages: LanguageRegistration[] =
    options.customLanguages
      ? Array.isArray(options.customLanguages)
        ? options.customLanguages
        : [options.customLanguages]
      : [];

  const isMultiTheme = isMultiThemeConfig(themeInput);
  const theme = isMultiTheme ? undefined : themeInput;
  const themes = isMultiTheme ? themeInput : undefined;

  const { defaultColor, cssVariablePrefix, delay, transformers } =
    options;

  const themeKey =
    isMultiTheme && themes
      ? `multi-${Object.keys(themes).join('-')}`
      : typeof theme === 'string'
        ? theme
        : theme?.name || 'custom';

  const { isCustom, languageId, resolvedLanguage } = resolveLanguage(
    lang,
    normalizedCustomLanguages
  );

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  useEffect(() => {
    let isMounted = true;

    const allTransformers = [
      removeTabIndexFromPre,
      ...(transformers || []),
    ];

    const highlightCode = async () => {
      const codeHighlighter =
        isCustom && resolvedLanguage
          ? await getCachedCustomHighlighter(
              `${resolvedLanguage.name}--${themeKey}`,
              resolvedLanguage,
              isMultiTheme,
              themes,
              theme
            )
          : highlighter;

      if (isMultiTheme && themes) {
        const html = await codeHighlighter.codeToHtml(code, {
          lang: languageId,
          transformers: allTransformers,
          themes,
          defaultColor,
          cssVariablePrefix,
        });

        if (isMounted) {
          setHighlightedCode(parse(html));
        }
      } else if (theme) {
        const html = await codeHighlighter.codeToHtml(code, {
          lang: languageId,
          transformers: allTransformers,
          theme,
        });

        if (isMounted) {
          setHighlightedCode(parse(html));
        }
      }
    };

    if (delay) {
      throttleHighlighting(highlightCode, timeoutControl, delay);
    } else {
      highlightCode().catch(console.error);
    }

    return () => {
      isMounted = false;
      if (timeoutControl.current.timeoutId) {
        clearTimeout(timeoutControl.current.timeoutId);
      }
    };
  }, [code, lang, options, themeInput]);

  return highlightedCode;
};
