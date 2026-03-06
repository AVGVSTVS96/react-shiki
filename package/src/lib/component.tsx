import '../styles/component.css';
import '../styles/features.css';
import { clsx } from 'clsx';

import type {
  HighlighterOptions,
  HighlightedCode,
  Language,
  Theme,
  Themes,
  UseShikiHighlighter,
} from './types';
import { forwardRef } from 'react';

/**
 * Props for the ShikiHighlighter component
 */
export interface ShikiHighlighterProps extends HighlighterOptions {
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
   * Controls the application of default styles to the generated code blocks
   *
   * Default styles include padding, overflow handling, border radius, language label styling, and font settings
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
 * This creates a component that uses the provided hook implementation.
 */
export const createShikiHighlighterComponent = (
  useShikiHighlighterImpl: UseShikiHighlighter
) => {
  const renderHighlightedContent = (highlightedCode: HighlightedCode) => {
    if (typeof highlightedCode === 'string') {
      return (
        <div
          data-slot="content"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      );
    }

    return highlightedCode;
  };

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
        children: code,
        as: Element = 'pre',
        customLanguages,
        preloadLanguages,
        ...shikiOptions
      },
      ref
    ) => {
      // Destructure some options for use in hook
      const options: HighlighterOptions = {
        delay,
        transformers,
        customLanguages,
        preloadLanguages,
        showLineNumbers,
        defaultColor,
        cssVariablePrefix,
        startingLineNumber,
        ...shikiOptions,
      };

      const displayLanguageId =
        typeof language === 'object'
          ? language.name || null
          : language?.trim() || null;

      const highlightedCode = useShikiHighlighterImpl(
        code,
        language,
        theme,
        options
      );

      return (
        <Element
          ref={ref}
          data-testid="shiki-container"
          data-slot="container"
          className={clsx(
            'rs-root',
            'not-prose',
            addDefaultStyles && 'rs-default-styles',
            className
          )}
          style={style}
        >
          {showLanguage && displayLanguageId ? (
            <span
              data-slot="language-label"
              className={clsx(
                'rs-language-label',
                langClassName
              )}
              style={langStyle}
              id="language-label"
            >
              {displayLanguageId}
            </span>
          ) : null}
          {renderHighlightedContent(highlightedCode)}
        </Element>
      );
    }
  );
};
