import './styles.css';
import React from 'react';
import { clsx } from 'clsx';
import { useShikiHighlighter } from './useShiki';
import type { Language, Theme, HighlighterOptions } from './types';
import type { ShikiTransformer } from 'shiki';
import { resolveLanguage } from './utils';
import type { LanguageRegistration } from './customTypes';

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
   * Pass custom Shiki transformers to the highlighter
   */
  transformers?: ShikiTransformer[];

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
   * The HTML element that wraps the generated code block.
   * @default 'pre'
   */
  as?: React.ElementType;

  /**
   * Custom languages to be preloaded for highlighting.
   */
  customLanguages?: LanguageRegistration[];
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
  transformers,
  addDefaultStyles = true,
  style,
  langStyle,
  className,
  langClassName,
  showLanguage = true,
  children: code,
  as: Element = 'pre',
  customLanguages,
}: ShikiHighlighterProps): React.ReactElement => {
    const options: HighlighterOptions = { 
    delay, 
    transformers,
    customLanguages,
  };
  
  const normalizedCustomLanguages = customLanguages
    ? Array.isArray(customLanguages)
      ? customLanguages
      : [customLanguages]
    : [];
  
  const { languageId, customLanguage, isCustom } = resolveLanguage(language, normalizedCustomLanguages);
  const highlightedCode = useShikiHighlighter(code, language, theme, options);
  
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
      id='shiki-container'
    >
      {showLanguage && language ? (
        <span
          className={clsx('languageLabel', langClassName)}
          style={langStyle}
          id='language-label'
        >
          {isCustom ? `${customLanguage?.scopeName.split('.')[1]}` : languageId}
        </span>
      ) : null}
      {highlightedCode}
    </Element>
  );
};
