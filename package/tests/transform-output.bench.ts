import { afterAll, beforeAll, bench, describe } from 'vitest';
import {
  getSingletonHighlighter,
  type CodeToHastOptions,
  type Highlighter,
} from 'shiki';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import htmlReactParser from 'html-react-parser';

import { resolveLanguage } from '../src/lib/language';
import { resolveTheme } from '../src/lib/theme';
import type { Language, Theme, Themes } from '../src/lib/types';

const SMALL_JS =
  `
function greet(name) {
  return ` +
  '`' +
  `hi ${name}` +
  '`' +
  `;
}
`.trim();

const LARGE_TSX = `
import React, { useMemo, useState } from 'react';

export function Dashboard({ items }: { items: string[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => items.filter((item) => item.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );

  return (
    <section>
      <input value={query} onChange={(event) => setQuery(event.target.value)} />
      <ul>
        {filtered.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
`.trim();

interface BenchConfig {
  name: string;
  code: string;
  lang: Language;
  theme: Theme | Themes;
}

const CONFIGS: BenchConfig[] = [
  {
    name: 'small-js-single-theme',
    code: SMALL_JS,
    lang: 'javascript',
    theme: 'github-dark',
  },
  {
    name: 'large-tsx-single-theme',
    code: LARGE_TSX,
    lang: 'tsx',
    theme: 'github-dark',
  },
  {
    name: 'large-tsx-multi-theme',
    code: LARGE_TSX,
    lang: 'tsx',
    theme: { light: 'github-light', dark: 'github-dark' },
  },
];

let highlighter: Highlighter;

const toShikiOptions = (
  lang: Language,
  theme: Theme | Themes
): CodeToHastOptions => {
  const { languageId } = resolveLanguage(lang);
  const resolvedTheme = resolveTheme(theme);

  return resolvedTheme.isMultiTheme
    ? {
        lang: languageId,
        themes: resolvedTheme.multiTheme ?? {
          light: 'github-light',
          dark: 'github-dark',
        },
      }
    : {
        lang: languageId,
        theme: resolvedTheme.singleTheme ?? 'github-dark',
      };
};

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: ['javascript', 'tsx'],
    themes: ['github-dark', 'github-light'],
  });
}, 30000);

afterAll(() => {
  highlighter?.dispose();
});

describe('transform output benchmark (non-streaming)', () => {
  for (const config of CONFIGS) {
    const options = toShikiOptions(config.lang, config.theme);

    bench(`${config.name} :: codeToHast -> toJsxRuntime`, () => {
      const hast = highlighter.codeToHast(config.code, options);
      toJsxRuntime(hast, { jsx, jsxs, Fragment });
    });

    bench(`${config.name} :: codeToHtml -> html-react-parser`, () => {
      const html = highlighter.codeToHtml(config.code, options);
      htmlReactParser(html);
    });

    bench(
      `${config.name} :: codeToHtml -> dangerouslySetInnerHTML`,
      () => {
        const html = highlighter.codeToHtml(config.code, options);
        const payload = { __html: html };
        void payload;
      }
    );
  }
});
