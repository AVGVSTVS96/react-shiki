import './styles.css';
// biome-ignore lint/style/useImportType: Package needs React to be imported
import React from 'react';
import type { BundledLanguage, BundledTheme } from 'shiki';
import { useShikiHighlighter } from '@/useShiki';
import { clsx } from 'clsx';

interface ShikiHighlighterProps {
  language: BundledLanguage;
  children: string;
  theme: BundledTheme;
  addDefaultStyles?: boolean;
  style?: React.CSSProperties;
  className?: string;
  showLanguage?: boolean;
  as?: React.ElementType;
}

export const ShikiHighlighter = ({
  language,
  theme,
  addDefaultStyles = true,
  style,
  className,
  showLanguage = true,
  children: code,
  as: Element = 'pre',
}: ShikiHighlighterProps) => {
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
