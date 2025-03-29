import './styles.css';
// biome-ignore lint/style/useImportType: React import is needed
import React from 'react';
import { clsx } from 'clsx';
import { useShikiHighlighter } from './hook';
import type { ShikiHighlighterProps, HighlighterOptions } from './types';
import { resolveLanguage } from './utils';

/**
 * ShikiHighlighter is a React component that provides syntax highlighting for code snippets.
 * It uses Shiki to render beautiful, theme-based syntax highlighting with optimized performance.
 *
 * @example
 * ```tsx
 * <ShikiHighlighter
 *   language="typescript"
 *   theme="github-dark"
 *   delay={100}
 *   transformers={[customTransformer]}
 *   addDefaultStyles={false}
 *   className="code-block"
 *   langClassName="lang-label"
 *   langStyle={{ color: 'blue' }},
 *   style={{ fontSize: '1.2rem' }}
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
  defaultColor,
  cssVariablePrefix,
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
    defaultColor,
    cssVariablePrefix,
  };

  const normalizedCustomLanguages = customLanguages
    ? Array.isArray(customLanguages)
      ? customLanguages
      : [customLanguages]
    : [];

  const { isCustom, languageId, displayLanguageId, resolvedLanguage } =
    resolveLanguage(language, normalizedCustomLanguages);

  const highlightedCode = useShikiHighlighter(
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
      {showLanguage && language ? (
        <span
          className={clsx('languageLabel', langClassName)}
          style={langStyle}
          id="language-label"
        >
          {isCustom
            ? `${resolvedLanguage?.scopeName.split('.')[1]}`
            : displayLanguageId || languageId}
        </span>
      ) : null}
      {highlightedCode}
    </Element>
  );
};
