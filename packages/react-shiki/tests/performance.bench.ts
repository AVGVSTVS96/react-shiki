import { describe, test, beforeAll, afterAll, beforeEach } from 'vitest';

import { getSingletonHighlighter } from 'shiki';
import type {
  BundledLanguage,
  BundledTheme,
  CodeToHastOptions,
  Highlighter,
} from 'shiki';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import htmlReactParser from 'html-react-parser';

import type { Language, Theme, Themes } from '../src/lib/types';

import { resolveLanguage } from '../src/lib/language';
import { resolveTheme } from '../src/lib/theme';

const smallCodeJS = `
function hello(name) {
  console.log('Hello, ' + name + '!');
  return name;
}
`.trim();

const mediumCodeJS = `
function hello(name) {
  console.log('Hello, ' + name + '!');
  const arr = [1, 2, 3, 4, 5];
  const sum = arr.reduce((acc, val) => acc + val, 0);
  // This is a simple comment
  return { message: \`The sum is \${sum}\`, timestamp: new Date() };
}
const result = hello('Developer');
console.log(result);
`.trim();

const largeCodeTSX = `
import React, { useState, useEffect } from 'react';

interface MyComponentProps {
  initialTitle: string;
  items: string[];
}

export const MyComponent: React.FC<MyComponentProps> = ({ initialTitle, items }) => {
  const [title, setTitle] = useState<string>(initialTitle);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    document.title = \`\${title} - Count: \${count}\`;
  }, [title, count]);

  const handleIncrement = () => {
    setCount(prev => prev + 1);
  };

  return (
    <div className="my-tsx-component" data-testid="component-root">
      <h1>{title}</h1>
      <p>Current Count: <strong>{count}</strong></p>
      <button type="button" onClick={handleIncrement}>Increment</button>
      <ul>
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
      {/* Example comment */}
      <style jsx>{\`
        .my-tsx-component {
          font-family: sans-serif;
          border: 2px solid teal;
          padding: 15px;
          margin-bottom: 10px;
        }
        h1 {
          color: purple;
        }
        button {
          margin-top: 10px;
          cursor: pointer;
        }
      \`}</style>
    </div>
  );
};
`.trim();

const veryLargeCodeJS = Array.from(
  { length: 10 },
  () => mediumCodeJS
).join('\n\n');

interface BenchConfig {
  name: string;
  code: string;
  lang: BundledLanguage;
  theme: BundledTheme | Record<'light' | 'dark', BundledTheme>;
  size: 'small' | 'medium' | 'large' | 'very-large';
}

const rawTransformConfigs: BenchConfig[] = [
  {
    name: 'Small JS - Single Theme',
    code: smallCodeJS,
    lang: 'javascript',
    theme: 'github-dark',
    size: 'small',
  },
  {
    name: 'Medium JS - Single Theme',
    code: mediumCodeJS,
    lang: 'javascript',
    theme: 'github-dark',
    size: 'medium',
  },
  {
    name: 'Large TSX - Single Theme',
    code: largeCodeTSX,
    lang: 'tsx',
    theme: 'github-dark',
    size: 'large',
  },
  {
    name: 'Very Large JS - Single Theme',
    code: veryLargeCodeJS,
    lang: 'javascript',
    theme: 'github-dark',
    size: 'very-large',
  },
  {
    name: 'Medium JS - Multi Theme',
    code: mediumCodeJS,
    lang: 'javascript',
    theme: { light: 'github-light', dark: 'github-dark' },
    size: 'medium',
  },
  {
    name: 'Large TSX - Multi Theme',
    code: largeCodeTSX,
    lang: 'tsx',
    theme: { light: 'github-light', dark: 'github-dark' },
    size: 'large',
  },
];

const shikiOptions = (
  lang: Language,
  theme: Theme | Themes
): CodeToHastOptions => {
  const { languageId } = resolveLanguage(lang);
  const resolved = resolveTheme(theme);

  return {
    lang: languageId,
    ...(resolved.isMulti
      ? { themes: resolved.themes }
      : { theme: resolved.theme }),
  };
};

async function hastToJsxRuntime(
  highlighter: Highlighter,
  code: string,
  lang: Language,
  theme: Theme | Themes
) {
  const hast = highlighter.codeToHast(code, shikiOptions(lang, theme));

  // oxlint-disable-next-line typescript/no-unsafe-return -- toJsxRuntime returns the global JSX.Element, which React 19's types no longer declare
  return toJsxRuntime(hast, { jsx, jsxs, Fragment });
}

async function htmlToReactParser(
  highlighter: Highlighter,
  code: string,
  lang: Language,
  theme: Theme | Themes
) {
  const html = highlighter.codeToHtml(code, shikiOptions(lang, theme));

  return htmlReactParser(html);
}

async function htmlForInnerHtml(
  highlighter: Highlighter,
  code: string,
  lang: Language,
  theme: Theme | Themes
) {
  return {
    __html: highlighter.codeToHtml(code, shikiOptions(lang, theme)),
  };
}

let highlighterInstance: Highlighter | null = null;

beforeAll(async () => {
  console.log('Initializing Shiki highlighter for benchmarks...');

  try {
    highlighterInstance = await getSingletonHighlighter({
      langs: [...new Set(rawTransformConfigs.map((c) => c.lang))],
      themes: [
        ...new Set(
          rawTransformConfigs.flatMap(
            (c) => resolveTheme(c.theme).themesToLoad
          )
        ),
      ],
    });

    console.log('Highlighter initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Shiki highlighter:', error);
    throw new Error('Shiki initialization failed in beforeAll', {
      cause: error,
    });
  }
}, 30_000);

afterAll(() => {
  highlighterInstance?.dispose();
  highlighterInstance = null;
  console.log('Benchmark suite finished.');
});

beforeEach(() => {
  if (highlighterInstance) {
    for (let i = 0; i < 3; i++) {
      highlighterInstance.codeToHast('console.log("warm-up");', {
        lang: 'javascript',
        theme: 'github-dark',
      });
    }
  }
});

describe('Raw Transformation Performance', () => {
  // oxlint-disable-next-line vitest/expect-expect -- a benchmark measures, it has nothing to assert
  test.for(rawTransformConfigs)(
    'Scenario: $name',
    { timeout: 20_000 },
    async (config, { bench }) => {
      if (!highlighterInstance) {
        throw new Error('Highlighter not initialized');
      }

      const highlighter = highlighterInstance;
      const { code, lang, theme } = config;

      await bench.compare(
        bench('codeToHast -> toJsxRuntime', async () =>
          await hastToJsxRuntime(highlighter, code, lang, theme)),
        bench('codeToHtml -> html-react-parser', async () =>
          await htmlToReactParser(highlighter, code, lang, theme)),
        bench('codeToHtml -> dangerouslySetInnerHTML', async () =>
          await htmlForInnerHtml(highlighter, code, lang, theme)),
        {
          time: 2000,
          iterations: config.size === 'very-large' ? 5 : 20,
          warmupIterations: 3,
        }
      );
    }
  );
});
