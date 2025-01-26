import './styles.css';
import React from 'react';
import { clsx } from 'clsx';
import { useShikiHighlighter } from './useShiki';
import type { Language, Theme, HighlighterOptions } from './types';

/**
 * Props for the ShikiHighlighter component
 */
export interface ShikiHighlighterProps extends HighlighterOptions {
  /** 
   * The programming language for syntax highlighting
   * @see https://shiki.style/languages
   */
  language: Language;

  /** 
   * The code to be highlighted 
   */
  children: string;

  /** 
   * The color theme for syntax highlighting
   * Supports Shiki and custom textmate themes
   * @see https://shiki.style/themes
   */
  theme: Theme;

  /** 
   * The delay in milliseconds between streamed updates
   * Use this when highlighting code being streamed on the client
   * @default undefined (no delay)
   */
  delay?: number;

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
   * Add custom CSS class names to the generated code block 
   */
  className?: string;

  /** 
   * Whether to show the language label
   * @default true
   */
  showLanguage?: boolean;

  /** 
   * The HTML element that wraps the generated code block.
   * @default 'pre'
   */
  as?: React.ElementType;
}

/**
 * ShikiHighlighter is a React component that provides syntax highlighting for code snippets.
 * It uses Shiki to render beautiful, theme-based syntax highlighting with optimized performance.
 *
 * @example
 * ```tsx
 * <ShikiHighlighter 
 *   language="typescript" 
 *   theme="github-dark"
 *   delay={100} // Optional throttling for streamed updates
 * >
 *   {code}
 * </ShikiHighlighter>
 * ```
 */
export const ShikiHighlighter = ({
  language,
  theme,
  delay,
  addDefaultStyles = true,
  style,
  className,
  showLanguage = true,
  children: code,
  as: Element = 'pre',
}: ShikiHighlighterProps): React.ReactElement => {
  const highlightedCode = useShikiHighlighter(code, language, theme, { delay });

  return (
    <Element
      className={clsx(
        'relative',
        addDefaultStyles && 'container',
        className
      )}
      style={style}
    >
      {showLanguage && language ? (
        <span className="languageLabel" style={style}>
          {language}
        </span>
      ) : null}
      {highlightedCode}
    </Element>
  );
};
