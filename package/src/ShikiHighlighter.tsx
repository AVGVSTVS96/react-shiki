import { useShikiHighlighter } from '@/useShiki';
// biome-ignore lint/style/useImportType: Package needs React to be imported
import React from 'react';
import type { BundledLanguage, BundledTheme } from 'shiki';
import './styles.css';

interface ShikiHighlighterProps {
  language: BundledLanguage;
  children: string;
  theme: BundledTheme;
  style?: React.CSSProperties;
  className?: string;
  showLanguage?: boolean;
  as?: React.ElementType;
}

export const ShikiHighlighter = ({
  language,
  theme,
  style,
  className,
  showLanguage = true,
  children: code,
  as: Element = 'pre',
}: ShikiHighlighterProps) => {
  const highlightedCode = useShikiHighlighter(code, language, theme);

  return (
    <Element className={`shiki container ${className}`} style={style}>
      {showLanguage && language ? (
        <span className='languageTag' style={style}>{language}</span>
      ) : null}
      {highlightedCode}
    </Element>
  );
};
