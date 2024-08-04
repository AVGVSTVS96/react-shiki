import htmlReactParser from 'html-react-parser';
import { type ReactNode, useEffect, useState } from 'react';
import { type BundledLanguage, type BundledTheme, codeToHtml } from 'shiki';
import { removeTabIndexFromPre } from '@/utils';
const parse = htmlReactParser as unknown as (html: string) => ReactNode;

export const useShikiHighlighter = (
  code: string,
  lang: BundledLanguage | undefined,
  theme: BundledTheme
) => {
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
  }, [code]);

  return highlightedCode;
};
