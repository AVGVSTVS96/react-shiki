import { useShikiHighlighter } from '@/useShiki';
import type React from 'react';
import type { BundledLanguage, BundledTheme } from 'shiki';

interface ShikiHighlighterProps {
  language: BundledLanguage;
  children: string;
  theme: BundledTheme;
  as?: React.ElementType;
}

export const ShikiHighlighter = ({
  language,
  theme,
  children: code,
  as: Element = 'pre',
}: ShikiHighlighterProps) => {
  const highlightedCode = useShikiHighlighter(code, language, theme);

  return (
    <Element className="shiki not-prose relative [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:px-6 [&_pre]:py-5">
      {language ? (
        <span className="absolute right-3 top-2 text-xs tracking-tighter text-muted-foreground/85">
          {language}
        </span>
      ) : null}
      {highlightedCode}
    </Element>
  );
};
