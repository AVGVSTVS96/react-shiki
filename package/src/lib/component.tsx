import './styles.css';
import { clsx } from 'clsx';
import { resolveLanguage } from './language';
import { useDeferredRender } from './utils';

import type {
  HighlighterOptions,
  Language,
  Theme,
  Themes,
  UseShikiHighlighter,
} from './types';
import type { UseDeferredRenderOptions } from './utils';
import type { ReactNode } from 'react';
import { forwardRef, useRef, useImperativeHandle } from 'react';

// 'tokens' not included: returns raw data, use hook directly for custom rendering
type ComponentRenderableFormat = 'react' | 'html';

export interface ShikiHighlighterProps
  extends Omit<HighlighterOptions, 'outputFormat'> {
  /**
   * The programming language for syntax highlighting
   * Supports custom textmate grammar objects in addition to Shiki's bundled languages
   * @see https://shiki.style/languages
   */
  language: Language;

  /**
   * The code to be highlighted
   */
  children: string;

  /**
   * The color theme or themes for syntax highlighting
   * Supports single, dual, or multiple themes
   * Supports custom textmate theme objects in addition to Shiki's bundled themes
   *
   * @example
   * theme='github-dark' // single theme
   * theme={{ light: 'github-light', dark: 'github-dark' }} // multi-theme
   *
   * @see https://shiki.style/themes
   */
  theme: Theme | Themes;

  /**
   * Output format for the highlighted code.
   * - 'react': React nodes (default)
   * - 'html': HTML string (faster, uses dangerouslySetInnerHTML)
   *
   * For 'tokens' output, use useShikiHighlighter hook directly.
   * @default 'react'
   */
  outputFormat?: ComponentRenderableFormat;

  /**
   * Controls the application of default styles to the generated code blocks
   *
   * Default styles include padding, overflow handling, border radius,
   * language label styling, and font settings
   * @default true
   */
  addDefaultStyles?: boolean;

  /**
   * Add custom inline styles to the generated code block
   */
  style?: React.CSSProperties;

  /**
   * Add custom inline styles to the language label
   */
  langStyle?: React.CSSProperties;

  /**
   * Add custom CSS class names to the generated code block
   */
  className?: string;

  /**
   * Add custom CSS class names to the language label
   */
  langClassName?: string;

  /**
   * Whether to show the language label
   * @default true
   */
  showLanguage?: boolean;

  /**
   * Whether to show line numbers
   * @default false
   */
  showLineNumbers?: boolean;

  /**
   * Starting line number (when showLineNumbers is true)
   * @default 1
   */
  startingLineNumber?: number;

  /**
   * The HTML element that wraps the generated code block.
   * @default 'pre'
   */
  as?: React.ElementType;

  /**
   * Defer rendering until element enters viewport.
   * Pass `true` for defaults or an options object.
   * Uses Intersection Observer + requestIdleCallback for optimal performance.
   * @default false
   */
  deferRender?: boolean | UseDeferredRenderOptions;
}

export const createShikiHighlighterComponent = (
  useShikiHighlighterImpl: UseShikiHighlighter
) => {
  return forwardRef<HTMLElement, ShikiHighlighterProps>(
    (
      {
        language,
        theme,
        delay,
        transformers,
        defaultColor,
        cssVariablePrefix,
        addDefaultStyles = true,
        style,
        langStyle,
        className,
        langClassName,
        showLanguage = true,
        showLineNumbers = false,
        startingLineNumber = 1,
        outputFormat,
        children: code,
        as: Element = 'pre',
        customLanguages,
        deferRender = false,
        ...shikiOptions
      },
      ref
    ) => {
      const containerRef = useRef<HTMLElement>(null);
      useImperativeHandle(ref, () => containerRef.current as HTMLElement);

      const deferOptions: UseDeferredRenderOptions =
        deferRender === true
          ? { immediate: false }
          : deferRender === false
            ? { immediate: true }
            : deferRender;

      const shouldRender = useDeferredRender(containerRef, deferOptions);

      const options: HighlighterOptions<ComponentRenderableFormat> = {
        delay,
        transformers,
        customLanguages,
        showLineNumbers,
        defaultColor,
        cssVariablePrefix,
        startingLineNumber,
        outputFormat,
        ...shikiOptions,
      };

      const { displayLanguageId } = resolveLanguage(language, customLanguages);

      const highlightedCode = useShikiHighlighterImpl(
        shouldRender ? code : '',
        language,
        theme,
        options
      ) as ReactNode | string | null;

      const isHtmlOutput = typeof highlightedCode === 'string';

      return (
        <Element
          ref={containerRef}
          data-testid="shiki-container"
          className={clsx(
            'relative',
            'not-prose',
            addDefaultStyles && 'defaultStyles',
            className
          )}
          style={style}
          id="shiki-container"
        >
          {showLanguage && displayLanguageId ? (
            <span
              className={clsx('languageLabel', langClassName)}
              style={langStyle}
              id="language-label"
            >
              {displayLanguageId}
            </span>
          ) : null}
          {shouldRender ? (
            isHtmlOutput ? (
              <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
            ) : (
              highlightedCode
            )
          ) : null}
        </Element>
      );
    }
  );
};
