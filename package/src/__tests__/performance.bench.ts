/**
 * Attribution: Benchmark written by AI.
 *
 * This benchmark measures the performance of the two main transformation approaches:
 * - codeToHast -> toJsxRuntime: Used in the useShikiHighlighter hook
 * - codeToHtml -> html-react-parser: An alternative approach
 *
 * Each benchmark is run with different code sizes and configurations to provide
 * a comprehensive view of performance characteristics.
 */
import { describe, bench, beforeAll, afterAll, beforeEach } from 'vitest';

import {
  getSingletonHighlighter,
  type CodeToHastOptions,
  type Highlighter,
} from 'shiki';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import htmlReactParser from 'html-react-parser';

import type { Language, Theme, Themes } from '../lib/types';

import { resolveLanguage, resolveTheme } from '../lib/resolvers';
// --- Test Data ---

// Small code sample (few lines)
const smallCodeJS = `
function hello(name) {
  console.log('Hello, ' + name + '!');
  return name;
}
`.trim();

// Medium code sample (original JS sample)
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

// Large code sample (original TSX sample)
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

// Very large code sample (for stress testing)
const veryLargeCodeJS = Array(10).fill(mediumCodeJS).join('\n\n');

// --- Test Configurations ---

// Base configurations for raw transformation benchmarks
const rawTransformConfigs = [
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

// Base options for Shiki
const shikiOptionsBase = {};

// --- Benchmark Functions ---

// Approach A: codeToHast -> toJsxRuntime
async function runApproachA(
  highlighter: Highlighter,
  code: string,
  lang: Language,
  theme: Theme | Themes
) {
  const { languageId } = resolveLanguage(lang, undefined, undefined);
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
  const { languageId } = resolveLanguage(lang, undefined, undefined);
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

// Initialize highlighter once before all tests
beforeAll(async () => {
  console.log('Initializing Shiki highlighter for benchmarks...');
  try {
    // Use raw transformation configs for all tests
    const allConfigs = rawTransformConfigs;

    const languagesToLoad = new Set(
      allConfigs
        .map((c) => resolveLanguage(c.lang, undefined, undefined).langsToLoad)
        .filter(Boolean)
    );

    const themesToLoad = new Set(
      allConfigs
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
    throw new Error(`Shiki initialization failed in beforeAll: ${error}`);
  }
}, 30000);

// Cleanup
afterAll(() => {
  highlighterInstance?.dispose();
  highlighterInstance = null;
  console.log('Benchmark suite finished.');
});

// Warm-up phase before each benchmark group
beforeEach(() => {
  // Run a few iterations to warm up the JIT
  if (highlighterInstance) {
    for (let i = 0; i < 3; i++) {
      highlighterInstance.codeToHast('console.log("warm-up");', {
        lang: 'javascript',
        theme: 'github-dark',
      });
    }
  }
});

// --- 1. Raw Transformation Benchmarks ---
describe('1. Raw Transformation Performance', () => {
  for (const config of rawTransformConfigs) {
    describe(`Scenario: ${config.name}`, () => {
      // Benchmark Approach A (codeToHast -> toJsxRuntime)
      bench(
        'codeToHast -> toJsxRuntime',
        async () => {
          if (!highlighterInstance)
            throw new Error('Highlighter not initialized');
          await runApproachA(
            highlighterInstance,
            config.code,
            config.lang,
            config.theme
          );
        },
        {
          time: 2000, // 2 seconds per benchmark
          iterations: config.size === 'very-large' ? 5 : 20, // Fewer iterations for large code
          warmupIterations: 3, // Warm up before measuring
        }
      );

      // Benchmark Approach B (codeToHtml -> htmlReactParser)
      bench(
        'codeToHtml -> html-react-parser',
        async () => {
          if (!highlighterInstance)
            throw new Error('Highlighter not initialized');
          await runApproachB(
            highlighterInstance,
            config.code,
            config.lang,
            config.theme
          );
        },
        {
          time: 2000,
          iterations: config.size === 'very-large' ? 5 : 20,
          warmupIterations: 3,
        }
      );
    });
  }
});
