import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';

import type {
  CodeToHastOptions,
  CodeOptionsSingleTheme,
  CodeOptionsMultipleThemes,
  Highlighter,
  HighlighterCore,
  Awaitable,
  RegexEngine,
  BundledTheme,
  CodeToTokensBaseOptions,
  CodeToTokensOptions,
  TokensResult,
  ThemedToken,
} from 'shiki';

import type { ShikiLanguageRegistration } from './extended-types';

import type {
  Language,
  Theme,
  HighlighterOptions,
  TimeoutState,
  Themes,
} from './types';

import { throttleHighlighting, useStableOptions } from './utils';
import { resolveLanguage, resolveTheme } from './resolvers';
import { lineNumbersTransformer } from './transformers';

const DEFAULT_THEMES: Themes = {
  light: 'github-light',
  dark: 'github-dark',
};

/**
 * Base hook for syntax highlighting using Shiki.
 * This is the core implementation used by all entry points.
 *
 * @param code - The code to highlight
 * @param lang - Language for highlighting
 * @param themeInput - Theme or themes to use
 * @param options - Highlighting options
 * @param highlighterFactory - Factory function to create highlighter (internal use)
 */
export const useShikiHighlighter = (
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  options: HighlighterOptions = {},
  highlighterFactory: (
    langsToLoad: ShikiLanguageRegistration,
    themesToLoad: Theme[],
    engine?: Awaitable<RegexEngine>
  ) => Promise<Highlighter | HighlighterCore>
) => {
  const [highlightedCode, setHighlightedCode] = useState<
    ReactNode | string | ThemedToken[][] | null
  >(null);

  // Stabilize options, language and theme inputs to prevent unnecessary
  // re-renders or recalculations when object references change
  const [stableLang, langRev] = useStableOptions(lang);
  const [stableTheme, themeRev] = useStableOptions(themeInput);
  const [stableOpts, optsRev] = useStableOptions(options);

  const { languageId, langsToLoad } = useMemo(
    () =>
      resolveLanguage(
        stableLang,
        stableOpts.customLanguages,
        stableOpts.langAlias
      ),
    [stableLang, stableOpts.customLanguages, stableOpts.langAlias]
  );

  const { isMultiTheme, themeId, multiTheme, singleTheme, themesToLoad } =
    useMemo(() => resolveTheme(stableTheme), [stableTheme]);

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  const shikiOptions = useMemo<CodeToHastOptions>(() => {
    const languageOption = { lang: languageId };
    const {
      defaultColor,
      cssVariablePrefix,
      showLineNumbers,
      startingLineNumber,
      ...restOptions
    } = stableOpts;

    const themeOptions = isMultiTheme
      ? ({
          themes: multiTheme || DEFAULT_THEMES,
          defaultColor,
          cssVariablePrefix,
        } as CodeOptionsMultipleThemes<BundledTheme>)
      : ({
          theme: singleTheme || DEFAULT_THEMES.dark,
        } as CodeOptionsSingleTheme<BundledTheme>);

    const isTokensOutput = stableOpts.outputFormat === 'tokens';
    const transformers = [...(restOptions.transformers || [])];

    if (showLineNumbers && !isTokensOutput) {
      transformers.push(lineNumbersTransformer(startingLineNumber));
    }

    return {
      ...languageOption,
      ...themeOptions,
      ...restOptions,
      transformers,
    };
  }, [languageId, themeId, langRev, themeRev, optsRev]);

  useEffect(() => {
    let isMounted = true;

    const highlightCode = async () => {
      if (!languageId) return;

      const highlighter = stableOpts.highlighter
        ? stableOpts.highlighter
        : await highlighterFactory(
            langsToLoad as ShikiLanguageRegistration,
            themesToLoad,
            stableOpts.engine
          );

      const loadedLanguages = highlighter.getLoadedLanguages();
      const langToUse = loadedLanguages.includes(languageId)
        ? languageId
        : 'plaintext';
      const finalOptions = { ...shikiOptions, lang: langToUse };

      if (isMounted) {
        if (stableOpts.outputFormat === 'tokens') {
          const tokensOutput = isMultiTheme
            ? highlighter.codeToTokens(
                code,
                finalOptions as CodeToTokensOptions
              )
            : highlighter.codeToTokensBase(
                code,
                finalOptions as CodeToTokensBaseOptions
              );

          const tokens = ((tokensOutput as TokensResult).tokens ??
            tokensOutput) as ThemedToken[][];

          setHighlightedCode(tokens);
        } else {
          const output =
            stableOpts.outputFormat === 'html'
              ? highlighter.codeToHtml(code, finalOptions)
              : toJsxRuntime(highlighter.codeToHast(code, finalOptions), {
                  jsx,
                  jsxs,
                  Fragment,
                });
          setHighlightedCode(output);
        }
      }
    };

    const { delay } = stableOpts;

    if (delay) {
      throttleHighlighting(highlightCode, timeoutControl, delay);
    } else {
      highlightCode().catch(console.error);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutControl.current.timeoutId);
    };
  }, [
    code,
    shikiOptions,
    stableOpts.delay,
    stableOpts.highlighter,
    langsToLoad,
    themesToLoad,
  ]);

  return highlightedCode;
};
