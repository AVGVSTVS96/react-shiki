import './styles.css';
import { clsx } from 'clsx';
import { resolveLanguage } from './resolvers';

import type {
  HighlighterOptions,
  Language,
  Theme,
  Themes,
} from './types';

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
  useShikiHighlighterImpl: (
    code: string,
    lang: Language,
    themeInput: Theme | Themes,
    options?: HighlighterOptions
  ) => React.ReactNode
) => {
  return ({
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
    ...shikiOptions
  }: ShikiHighlighterProps): React.ReactElement => {
    const options: HighlighterOptions = {
      delay,
      transformers,
      customLanguages,
      defaultColor,
      cssVariablePrefix,
      showLineNumbers,
      startingLineNumber,
      ...shikiOptions,
    };

    // Use resolveLanguage to get displayLanguageId directly
    const { displayLanguageId } = resolveLanguage(
      language,
      customLanguages,
      shikiOptions.langAlias
    );

    const highlightedCode = useShikiHighlighterImpl(
      code,
      language,
      theme,
      options
    );

    return (
      <Element
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
        {highlightedCode}
      </Element>
    );
  };
};
