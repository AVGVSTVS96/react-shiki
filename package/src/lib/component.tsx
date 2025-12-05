import './styles.css';
import { clsx } from 'clsx';
import { resolveLanguage } from './resolvers';

import type {
  HighlighterOptions,
  Language,
  Theme,
  Themes,
  UseShikiHighlighter,
} from './types';
import type { ReactNode } from 'react';
import { forwardRef } from 'react';

/**
 * Output formats supported by the component.
 * Token output is not supported - use the hook directly for that.
 */
type ComponentOutputFormat = 'react' | 'html';

/**
 * Props for the ShikiHighlighter component.
 * Extends HighlighterOptions but restricts outputFormat to component-supported values.
 */
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
   * - 'react': Returns React nodes (default, safer)
   * - 'html': Returns HTML string (~15-45% faster, requires dangerouslySetInnerHTML)
   *
   * Note: 'tokens' output is not supported by the component.
   * Use the useShikiHighlighter hook directly for token access.
   * @default 'react'
   */
  outputFormat?: ComponentOutputFormat;

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
}

/**
 * Base ShikiHighlighter component factory.
 * Creates a component that uses the provided hook implementation.
 */
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
        ...shikiOptions
      },
      ref
    ) => {
      const options: HighlighterOptions<ComponentOutputFormat> = {
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

      const { displayLanguageId } = resolveLanguage(
        language,
        customLanguages
      );

      const highlightedCode = useShikiHighlighterImpl(
        code,
        language,
        theme,
        options
      ) as ReactNode | string | null;

      const isHtmlOutput = typeof highlightedCode === 'string';

      return (
        <Element
          ref={ref}
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
          {isHtmlOutput ? (
            <div dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          ) : (
            highlightedCode
          )}
        </Element>
      );
    }
  );
};
