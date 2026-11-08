import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { CodeToHastOptions } from 'shiki';

import type {
  HighlighterFactory,
  HighlighterOptions,
  HighlighterOptionsFor,
  HighlightResult,
  HighlightResultMap,
  Language,
  OutputFormat,
  PreloadLanguage,
  Theme,
  Themes,
  TimeoutState,
} from './types';

import { throttleHighlighting, useStableValue } from './utils';
import { useFeatureStyles } from './styles';
import {
  getEmbeddedLanguages,
  resolveLanguage,
  resolveLoadedLanguage,
} from './language';
import { resolveTheme } from './theme';
import { resolveEngine } from './engine';
import { buildShikiOptions } from './options';

export async function highlight<F extends OutputFormat = 'react'>(
  code: string,
  resolved: {
    languageId: string;
    langsToLoad: PreloadLanguage[];
    themesToLoad: Theme[];
    shikiOptions: CodeToHastOptions;
  },
  opts: Pick<HighlighterOptions, 'highlighter' | 'engine'> & {
    outputFormat?: F;
  },
  factory: HighlighterFactory
): Promise<HighlightResultMap[F]> {
  const { languageId, langsToLoad, themesToLoad, shikiOptions } =
    resolved;

  const format: OutputFormat = opts.outputFormat ?? 'react';

  const highlighter =
    opts.highlighter ??
    (await (async () => {
      const hl = await factory(
        langsToLoad,
        themesToLoad,
        resolveEngine(opts.engine)
      );

      await hl.loadLanguage(
        ...getEmbeddedLanguages(code, languageId, hl)
      );

      return hl;
    })());

  const language = resolveLoadedLanguage(
    languageId,
    highlighter.getLoadedLanguages()
  );

  const options = { ...shikiOptions, lang: language };

  const outputs = {
    react: (): ReactElement =>
      // oxlint-disable-next-line typescript/no-unsafe-return -- toJsxRuntime returns the global JSX.Element, which React 19's types no longer declare
      toJsxRuntime(highlighter.codeToHast(code, options), {
        jsx,
        jsxs,
        Fragment,
      }),
    html: () => highlighter.codeToHtml(code, options),
    tokens: () => highlighter.codeToTokens(code, options),
  } satisfies { [K in OutputFormat]: () => HighlightResultMap[K] };

  // Untyped call sites can pass formats outside OutputFormat; degrade to
  // react rendering like the pre-tokens ternary did instead of throwing.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, anti-slop/require-safety-comment-for-type-assertion -- outputs[format] returns HighlightResultMap[format], and TS can't tie format to the generic F
  return (outputs[format] ?? outputs.react)() as HighlightResultMap[F];
}

export const useHighlight = <F extends OutputFormat = 'react'>(
  code: string,
  lang: Language,
  themeInput: Theme | Themes,
  optionsInput: HighlighterOptionsFor<F> | undefined,
  highlighterFactory: HighlighterFactory
): HighlightResult<F> => {
  const options = optionsInput ?? {};

  const [highlightedCode, setHighlightedCode] =
    useState<HighlightResult<F>>(null);

  // This hook owns the line-number/highlight output, so it also owns the
  // corresponding styles. The primitive boolean limits effect reruns.
  useFeatureStyles(
    Boolean(
      options.showLineNumbers || options.highlightLineNumbers?.length
    )
  );

  const stableLang = useStableValue(lang);
  const stableTheme = useStableValue(themeInput);
  const stableOpts = useStableValue(options);

  const resolved = useMemo(() => {
    const { languageId, langsToLoad } = resolveLanguage(
      stableLang,
      // oxlint-disable-next-line typescript/no-deprecated -- the hook still honors its own deprecated prop
      stableOpts.customLanguages,
      stableOpts.langAlias,
      stableOpts.preloadLanguages
    );

    const theme = resolveTheme(stableTheme);

    const shikiOptions = buildShikiOptions(languageId, theme, stableOpts);

    return {
      languageId,
      langsToLoad,
      themesToLoad: theme.themesToLoad,
      shikiOptions,
    };
  }, [stableLang, stableTheme, stableOpts]);

  const requestIdRef = useRef(0);

  const timeoutControl = useRef<TimeoutState>({
    nextAllowedTime: 0,
    timeoutId: undefined,
  });

  // Factory is invoked imperatively; its identity is not semantic, so it must
  // not invalidate the effect on every render. See issue #161.
  const highlighterFactoryRef = useRef(highlighterFactory);
  highlighterFactoryRef.current = highlighterFactory;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const timeouts = timeoutControl.current;

    const run = async () => {
      try {
        const result = await highlight<F>(
          code,
          resolved,
          stableOpts,
          highlighterFactoryRef.current
        );

        if (requestId === requestIdRef.current) {
          setHighlightedCode(result);
        }
      } catch (error) {
        console.error('[react-shiki] highlight failed', error);
      }
    };

    if (resolved.languageId) {
      if (stableOpts.delay) {
        throttleHighlighting(run, timeoutControl, stableOpts.delay);
      } else {
        void run();
      }
    }

    return () => {
      clearTimeout(timeouts.timeoutId);
    };
  }, [code, resolved, stableOpts]);

  return highlightedCode;
};
