import './styles.css';
import { clsx } from 'clsx';
import { forwardRef, memo } from 'react';

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
  const StreamComponent = forwardRef<
    HTMLElement,
    ShikiStreamHighlighterProps
  >(
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
        onSessionSummary,
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
        onSessionSummary,
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

  const areInputsEqual = (
    prevInput: ShikiStreamInput,
    nextInput: ShikiStreamInput
  ): boolean => {
    if ('code' in prevInput && 'code' in nextInput) {
      return (
        prevInput.code === nextInput.code &&
        !!prevInput.isComplete === !!nextInput.isComplete
      );
    }

    if ('stream' in prevInput && 'stream' in nextInput) {
      return prevInput.stream === nextInput.stream;
    }

    if ('chunks' in prevInput && 'chunks' in nextInput) {
      return prevInput.chunks === nextInput.chunks;
    }

    return false;
  };

  const areStreamHighlighterPropsEqual = (
    prev: Readonly<ShikiStreamHighlighterProps>,
    next: Readonly<ShikiStreamHighlighterProps>
  ): boolean =>
    areInputsEqual(prev.input, next.input) &&
    prev.language === next.language &&
    prev.theme === next.theme &&
    prev.showLanguage === next.showLanguage &&
    prev.addDefaultStyles === next.addDefaultStyles &&
    prev.style === next.style &&
    prev.className === next.className &&
    prev.langStyle === next.langStyle &&
    prev.langClassName === next.langClassName &&
    prev.as === next.as &&
    prev.highlighter === next.highlighter &&
    prev.customLanguages === next.customLanguages &&
    prev.preloadLanguages === next.preloadLanguages &&
    prev.langAlias === next.langAlias &&
    prev.engine === next.engine &&
    prev.allowRecalls === next.allowRecalls &&
    prev.onStreamStart === next.onStreamStart &&
    prev.onStreamEnd === next.onStreamEnd &&
    prev.onSessionSummary === next.onSessionSummary;

  return memo(StreamComponent, areStreamHighlighterPropsEqual);
};
