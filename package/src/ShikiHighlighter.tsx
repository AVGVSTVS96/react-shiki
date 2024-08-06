import './styles.css';
// biome-ignore lint/style/useImportType: Package needs React to be imported
import React from 'react';
import type { BundledLanguage, BundledTheme } from 'shiki';
import { useShikiHighlighter } from '@/useShiki';
import { clsx } from 'clsx';

export interface ShikiHighlighterProps {
  /** 
   * The programming language for syntax highlighting
   * @see https://shiki.style/languages
   */
  language: BundledLanguage;

  /** 
   * The code to be highlighted 
   */
  children: string;

  /** 
   * The color theme for syntax highlighting, only Shiki themes are supported at this time
   * @see https://shiki.style/themes
   */
  theme: BundledTheme;

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
 *
 * It uses the Shiki library to render beautiful, theme-based syntax highlighting.
 *
 * @example
 * ```tsx
 * <ShikiHighlighter language="tsx" theme="vitesse-black">
 *   {code.trim()}
 * </ShikiHighlighter>
 * ```
 */
export const ShikiHighlighter = ({
  language,
  theme,
  addDefaultStyles = true,
  style,
  className,
  showLanguage = true,
  children: code,
  as: Element = 'pre',
}: ShikiHighlighterProps): React.ReactElement => {
  const highlightedCode = useShikiHighlighter(code, language, theme);

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
