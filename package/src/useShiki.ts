import { useEffect, useRef, useState, type ReactNode } from 'react';

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
  themeOrThemes: Theme | Record<string, Theme>,
  options: HighlighterOptions = {}
) => {
  const [highlightedCode, setHighlightedCode] =
    useState<ReactNode | null>(null);

  // Check if we're using multi-theme by examining if themeOrThemes is a record object
  const isMultiTheme =
    typeof themeOrThemes === 'object' &&
    !('name' in themeOrThemes) &&
    Object.keys(themeOrThemes).length > 0;

  // Extract values based on mode
  const theme = isMultiTheme ? undefined : (themeOrThemes as Theme);
  const themes = isMultiTheme
    ? (themeOrThemes as Record<string, Theme>)
    : undefined;
  const { defaultColor, cssVariablePrefix } = options;

  // Setup themeKey for highlighter caching
  const themeKey = isMultiTheme
    ? `multi-${Object.keys(themes || {}).join('-')}`
    : typeof theme === 'string'
      ? theme
      : theme?.name || 'custom';

  const normalizedCustomLanguages: LanguageRegistration[] =
    options.customLanguages
      ? Array.isArray(options.customLanguages)
        ? options.customLanguages
        : [options.customLanguages]
      : [];

  const { isCustom, languageId, resolvedLanguage } = resolveLanguage(
    lang,
    normalizedCustomLanguages
  );

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  const getCachedCustomHighlighter = async (
    cacheKey: string,
    customLang: LanguageRegistration
  ): Promise<Highlighter> => {
    let instance = customHighlighterCache.get(cacheKey);
    if (!instance) {
      // For custom languages, we need to preload themes
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

  useEffect(() => {
    let isMounted = true;

    const transformers = [
      removeTabIndexFromPre,
      ...(options.transformers || []),
    ];

    const highlightCode = async () => {
      const codeHighlighter =
        isCustom && resolvedLanguage
          ? await getCachedCustomHighlighter(
              `${resolvedLanguage.name}--${themeKey}`,
              resolvedLanguage
            )
          : highlighter;

      if (isMultiTheme && themes) {
        const html = await codeHighlighter.codeToHtml(code, {
          lang: languageId,
          themes,
          defaultColor,
          cssVariablePrefix,
          transformers,
        });

        if (isMounted) {
          setHighlightedCode(parse(html));
        }
      }
      // Otherwise use single theme
      else if (theme) {
        const html = await codeHighlighter.codeToHtml(code, {
          lang: languageId,
          theme,
          transformers,
        });

        if (isMounted) {
          setHighlightedCode(parse(html));
        }
      }
    };

    if (options.delay) {
      throttleHighlighting(highlightCode, timeoutControl, options.delay);
    } else {
      highlightCode().catch(console.error);
    }

    return () => {
      isMounted = false;
      if (timeoutControl.current.timeoutId) {
        clearTimeout(timeoutControl.current.timeoutId);
      }
    };
  }, [
    code,
    lang,
    isMultiTheme,
    theme,
    themes ? JSON.stringify(themes) : null,
    defaultColor,
    cssVariablePrefix,
    options.delay,
    options.transformers,
  ]);

  return highlightedCode;
};
