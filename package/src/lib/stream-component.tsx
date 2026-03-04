import './styles.css';
import { clsx } from 'clsx';
import { forwardRef } from 'react';

import type {
  UseShikiStreamHighlighter,
  ShikiStreamInput,
  StreamHighlighterOptions,
} from './stream-types';
import type { Language, Theme, Themes } from './types';
import { ShikiTokenRenderer } from './stream-renderer';

/**
 * Props for the ShikiStreamHighlighter component.
 */
export interface ShikiStreamHighlighterProps
  extends StreamHighlighterOptions {
  /**
   * Input source for streaming.
   */
  input: ShikiStreamInput;

  /**
   * The programming language for syntax highlighting.
   */
  language: Language;

  /**
   * The color theme or themes for syntax highlighting.
   */
  theme: Theme | Themes;

  /**
   * Whether to show the language label.
   * @default true
   */
  showLanguage?: boolean;

  /**
   * Controls the application of default styles.
   * @default true
   */
  addDefaultStyles?: boolean;

  /**
   * Custom inline styles for the container.
   */
  style?: React.CSSProperties;

  /**
   * Custom CSS class names for the container.
   */
  className?: string;

  /**
   * Custom inline styles for the language label.
   */
  langStyle?: React.CSSProperties;

  /**
   * Custom CSS class names for the language label.
   */
  langClassName?: string;

  /**
   * The HTML element that wraps the code block.
   * @default 'pre'
   */
  as?: React.ElementType;
}

/**
 * Creates a ShikiStreamHighlighter component that composes
 * the stream hook with the token renderer.
 *
 * Follows the same factory pattern as createShikiHighlighterComponent.
 */
export const createShikiStreamComponent = (
  useShikiStreamHighlighterImpl: UseShikiStreamHighlighter
) => {
  return forwardRef<HTMLElement, ShikiStreamHighlighterProps>(
    (
      {
        input,
        language,
        theme,
        showLanguage = true,
        addDefaultStyles = true,
        style,
        className,
        langStyle,
        langClassName,
        as: Element = 'pre',
        // Stream options
        highlighter,
        customLanguages,
        preloadLanguages,
        langAlias,
        engine,
        allowRecalls,
        onStreamStart,
        onStreamEnd,
      },
      ref
    ) => {
      const options: StreamHighlighterOptions = {
        highlighter,
        customLanguages,
        preloadLanguages,
        langAlias,
        engine,
        allowRecalls,
        onStreamStart,
        onStreamEnd,
      };

      const { tokens } = useShikiStreamHighlighterImpl(
        input,
        language,
        theme,
        options
      );

      const displayLanguageId =
        typeof language === 'object'
          ? language.name || null
          : language?.trim() || null;

      return (
        <Element
          ref={ref}
          data-testid="shiki-stream-container"
          className={clsx(
            'relative',
            'not-prose',
            addDefaultStyles && 'defaultStyles',
            className
          )}
          style={style}
        >
          {showLanguage && displayLanguageId ? (
            <span
              className={clsx('languageLabel', langClassName)}
              style={langStyle}
            >
              {displayLanguageId}
            </span>
          ) : null}
          <ShikiTokenRenderer tokens={tokens} />
        </Element>
      );
    }
  );
};
