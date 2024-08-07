import parse from 'html-react-parser';
import { type ReactNode, useEffect, useState } from 'react';
import { type BundledLanguage, type BundledTheme, codeToHtml } from 'shiki';
import { removeTabIndexFromPre } from '@/utils';

/**
 * 
 * `useShikiHighlighter` is a custom hook that takes in the code to be highlighted, the language, and the theme, and returns the highlighted code parsed as a ReactNode.
 *
 * @example
 * ```tsx
 * const highlightedCode = useShikiHighlighter(code, language, theme);
 * ```
 * 
 */
export const useShikiHighlighter = (
  code: string,
  lang: BundledLanguage | undefined,
  theme: BundledTheme
): ReactNode | null => {
  const [highlightedCode, setHighlightedCode] = useState<ReactNode | null>(
    null
  );

  useEffect(() => {
    const highlightCode = async () => {
      try {
        const html = await codeToHtml(code, {
          lang: lang as BundledLanguage,
          theme,
          transformers: [removeTabIndexFromPre],
        });
        setHighlightedCode(parse(html));
      } catch (error) {
        const fallbackHtml = await codeToHtml(code, {
          lang: 'plaintext',
          theme,
          transformers: [removeTabIndexFromPre],
        });
        setHighlightedCode(parse(fallbackHtml));
      }
    };

    highlightCode();
  }, [code, theme, lang]);

  return highlightedCode;
};
