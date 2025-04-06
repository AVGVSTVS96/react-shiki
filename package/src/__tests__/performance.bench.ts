// attribution: ai written test
import { describe, bench, beforeAll, afterAll } from 'vitest';

import {
  getSingletonHighlighter,
  type CodeToHastOptions,
  type Highlighter,
} from 'shiki';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import htmlReactParser from 'html-react-parser';

import type {
  Language,
  Theme,
  Themes,
  HighlighterOptions,
} from '../types';

import {
  removeTabIndexFromPre,
  resolveLanguage,
  resolveTheme,
} from '../utils';

// --- Test Data ---

const sampleCodeJS = `
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

const sampleCodeTSX = `
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

// --- Test Configurations ---

const configs = [
  {
    name: 'JS Single Theme',
    code: sampleCodeJS,
    lang: 'javascript',
    theme: 'github-dark',
  },
  {
    name: 'TSX Single Theme',
    code: sampleCodeTSX,
    lang: 'tsx',
    theme: 'github-dark',
  },
  {
    name: 'JS Multi Theme',
    code: sampleCodeJS,
    lang: 'javascript',
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  {
    name: 'TSX Multi Theme',
    code: sampleCodeTSX,
    lang: 'tsx',
    theme: { light: 'github-light', dark: 'github-dark' },
  },
];

const shikiOptionsBase: Partial<HighlighterOptions> = {
  transformers: [removeTabIndexFromPre],
};

// --- Benchmark Functions ---

// Approach A: codeToHast -> toJsxRuntime
async function runApproachA(
  highlighter: Highlighter,
  code: string,
  lang: Language,
  theme: Theme | Themes
) {
  const { languageId } = resolveLanguage(lang);
  const { isMultiTheme, singleTheme, multiTheme } = resolveTheme(theme);

  const options: CodeToHastOptions = {
    ...shikiOptionsBase,
    lang: languageId,
    ...(isMultiTheme
      ? { themes: multiTheme as Themes }
      : { theme: singleTheme as Theme }),
  };

  const hast = highlighter.codeToHast(code, options);
  const reactNodes = toJsxRuntime(hast, { jsx, jsxs, Fragment });
  return reactNodes;
}

// Approach B: codeToHtml -> htmlReactParser
async function runApproachB(
  highlighter: Highlighter,
  code: string,
  lang: Language,
  theme: Theme | Themes
) {
  const { languageId } = resolveLanguage(lang);
  const { isMultiTheme, singleTheme, multiTheme } = resolveTheme(theme);

  const options: CodeToHastOptions = {
    ...(shikiOptionsBase as CodeToHastOptions),
    lang: languageId,
    ...(isMultiTheme
      ? { themes: multiTheme as Themes }
      : { theme: singleTheme as Theme }),
  };

  const html = highlighter.codeToHtml(code, options);
  const reactNodes = htmlReactParser(html);
  return reactNodes;
}

// --- Vitest Benchmark Suite ---

let highlighterInstance: Highlighter | null = null;

beforeAll(async () => {
  console.log('Initializing Shiki highlighter for benchmarks...');
  try {
    const languagesToLoad = new Set(
      configs
        .map((c) => resolveLanguage(c.lang).langsToLoad)
        .filter(Boolean)
    );
    const themesToLoad = new Set(
      configs
        .flatMap((c) => resolveTheme(c.theme).themesToLoad)
        .filter(Boolean)
    );

    highlighterInstance = await getSingletonHighlighter({
      langs: Array.from(languagesToLoad) as any[],
      themes: Array.from(themesToLoad) as Theme[],
    });
    console.log('Highlighter initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Shiki highlighter:', error);
    // Optionally re-throw or handle the error to prevent tests from running without the instance
    throw new Error(`Shiki initialization failed in beforeAll: ${error}`);
  }
}, 30000);

// Cleanup
afterAll(() => {
  highlighterInstance?.dispose();
  highlighterInstance = null;
  console.log('Benchmark suite finished.');
});

// Loop through configurations and create describe blocks
// biome-ignore lint/complexity/noForEach: <explanation>
configs.forEach((config) => {
  // Use .concurrent here if benchmarks are independent and you want potential speedup
  // Note: Concurrency might slightly affect stability if resource contention is high.
  describe(`Scenario: ${config.name}`, () => {
    // Benchmark Approach A for this config
    bench(
      'codeToHast -> toJsxRuntime',
      async () => {
        if (!highlighterInstance)
          throw new Error('Highlighter not initialized in bench A'); // Add safeguard anyway
        await runApproachA(
          highlighterInstance,
          config.code,
          config.lang,
          config.theme
        );
      },
      { time: 1000, iterations: 10 }
    );

    // Benchmark Approach B for this config
    bench(
      'codeToHtml -> html-react-parser',
      async () => {
        if (!highlighterInstance)
          throw new Error('Highlighter not initialized in bench B'); // Add safeguard anyway
        await runApproachB(
          highlighterInstance,
          config.code,
          config.lang,
          config.theme
        );
      },
      { time: 1000, iterations: 10 }
    );
  });
});
