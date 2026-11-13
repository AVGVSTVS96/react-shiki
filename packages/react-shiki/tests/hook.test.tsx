import { setTimeout as delay } from 'node:timers/promises';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { vi, afterEach, expect, describe, beforeEach, it } from 'vitest';
import {
  useShikiHighlighter,
  createJavaScriptRegexEngine,
} from '../src/index';
import { useShikiHighlighter as useShikiHighlighterCore } from '../src/core';
import type {
  HighlightCache,
  HighlighterFactory,
  HighlighterOptions,
  HighlightResultMap,
  Language,
  OutputFormat,
  Theme,
  Themes,
} from '../src/lib/types';
import type {
  HighlighterCore,
  LanguageRegistration,
  ShikiTransformer,
} from 'shiki';
import { throttleHighlighting } from '../src/lib/utils';
import { useHighlight as useBaseHook } from '../src/lib/hook';
import { createFakeHighlighter, outOfType } from './fakes';

interface TestComponentProps extends HighlighterOptions {
  code: string;
  language: Language;
  theme: Theme | Themes;
}

const TestComponent = ({
  code,
  language,
  theme,
  ...options
}: TestComponentProps) => {
  const highlighted = useShikiHighlighter(code, language, theme, options);

  return <div data-testid="highlighted">{highlighted}</div>;
};

const renderComponent = (props?: Partial<TestComponentProps>) => {
  const defaultProps: TestComponentProps = {
    code: '<div>Hello World</div>',
    language: 'html',
    theme: 'github-light',
    ...props,
  };

  return render(<TestComponent {...defaultProps} />);
};

const findSpan = (container: Element | null | undefined, text: string) =>
  [...(container?.querySelectorAll('span') ?? [])].find(
    (span) => span.textContent === text
  );

const htmlFragment = (html: string | null) => {
  const template = document.createElement('template');
  template.innerHTML = html ?? '';

  return template.content;
};

const embeddedMarkdown = '```python\nprint("hi")\n```';

interface EmbeddedHarnessProps {
  code?: string;
  highlighter?: HighlighterCore;
  factory: HighlighterFactory;
}

const EmbeddedHarness = ({
  code = embeddedMarkdown,
  highlighter,
  factory,
}: EmbeddedHarnessProps) => {
  const highlighted = useBaseHook(
    code,
    'markdown',
    'github-dark',
    { outputFormat: 'html', highlighter },
    factory
  );

  return <div data-testid="output">{highlighted ?? ''}</div>;
};

const createMarkdownHighlighter = (
  bundled: Record<string, LanguageRegistration> = {}
) => {
  const highlighter = createFakeHighlighter();
  highlighter.getBundledLanguages.mockReturnValue(bundled);
  highlighter.getLoadedLanguages.mockReturnValue(['markdown']);

  return highlighter;
};

const EngineHarness = () => {
  const highlighted = useShikiHighlighter(
    'const add = (a, b) => a + b;',
    'javascript',
    'github-dark',
    {
      engine: createJavaScriptRegexEngine(),
    }
  );

  return <div data-testid="highlighted">{highlighted}</div>;
};

const pythonGrammar: LanguageRegistration = {
  name: 'python',
  scopeName: 'source.python',
  patterns: [],
  repository: {},
};

describe('useShikiHighlighter Hook', () => {
  describe('Basic Rendering', () => {
    it('renders a pre with theme classes, a code element, and line spans', async () => {
      const { getByTestId } = renderComponent();
      await waitFor(
        () => {
          const container = getByTestId('highlighted');

          const preElement = container.querySelector(
            'pre.shiki.github-light'
          );

          expect(preElement).toBeInTheDocument();

          const codeElement = preElement?.querySelector('code');
          expect(codeElement).toBeInTheDocument();

          const lineSpan = codeElement?.querySelector('span.line');
          expect(lineSpan).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('falls back to plaintext for unknown languages: text matches the input exactly, no inline-styled spans', async () => {
      const code = 'function test() { return true; }';

      const { getByTestId } = renderComponent({
        code,
        language: 'unknownlang',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');

        const preElement = container.querySelector(
          'pre.shiki.github-light'
        );

        const codeElement = preElement?.querySelector('code');
        const lineSpan = codeElement?.querySelector('span.line');

        expect(preElement).toBeInTheDocument();
        expect(codeElement).toBeInTheDocument();
        expect(lineSpan).toBeInTheDocument();
        expect(preElement?.textContent).toBe(code);
        expect(lineSpan?.querySelectorAll('span[style]')).toHaveLength(0);
      });
    });

    it('falls back to plaintext for malformed custom language objects', async () => {
      const code = 'function test() { return true; }';

      const malformedLanguage = outOfType<Language>({
        name: 'broken-lang',
      });

      const { getByTestId } = renderComponent({
        code,
        language: malformedLanguage,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');

        const preElement = container.querySelector(
          'pre.shiki.github-light'
        );

        const codeElement = preElement?.querySelector('code');
        const lineSpan = codeElement?.querySelector('span.line');

        expect(preElement).toBeInTheDocument();
        expect(codeElement).toBeInTheDocument();
        expect(lineSpan).toBeInTheDocument();
        expect(preElement?.textContent).toBe(code);
        expect(lineSpan?.querySelectorAll('span[style]')).toHaveLength(0);
      });
    });
  });

  describe('Dynamic Language Imports', () => {
    const pointGrammar: LanguageRegistration = {
      name: 'point',
      scopeName: 'source.point',
      patterns: [{ match: '\\b(move|draw)\\b', name: 'keyword.control' }],
      repository: {},
    };

    it('highlights with a grammar preloaded via getter', async () => {
      const { getByTestId } = renderComponent({
        code: 'move 10 20',
        language: 'point',
        preloadLanguages: [async () => pointGrammar],
      });

      await waitFor(() => {
        const keyword = findSpan(
          getByTestId('highlighted').querySelector('pre'),
          'move'
        );

        expect(keyword).toBeInTheDocument();
        expect(keyword).toHaveStyle('color: #D73A49');
      });
    });

    it('highlights with a grammar preloaded via module promise', async () => {
      const { getByTestId } = renderComponent({
        code: 'move 10 20',
        language: 'point',
        preloadLanguages: [Promise.resolve({ default: pointGrammar })],
      });

      await waitFor(() => {
        const keyword = findSpan(
          getByTestId('highlighted').querySelector('pre'),
          'move'
        );

        expect(keyword).toBeInTheDocument();
        expect(keyword).toHaveStyle('color: #D73A49');
      });
    });
  });

  describe('Language Aliases', () => {
    it('applies highlighting on aliased language', async () => {
      const code = 'package main';

      const { getByTestId } = renderComponent({
        code,
        language: 'golang',
        langAlias: { golang: 'go' },
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const preElement = container.querySelector('pre');

        const spanElement =
          preElement?.querySelector<HTMLSpanElement>('code>span>span');

        expect(spanElement).toBeInTheDocument();
        expect(spanElement).toHaveStyle('color: #D73A49');
      });
    });

    it('handles multiple language aliases', async () => {
      const code = 'def hello():\n    print("world")';

      const { getByTestId } = renderComponent({
        code,
        language: 'indents',
        langAlias: { indents: 'python' },
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');

        const defKeyword = findSpan(
          container.querySelector('pre'),
          'def'
        );

        expect(defKeyword).toBeInTheDocument();
        expect(defKeyword).toHaveStyle('color: #D73A49');
      });
    });
  });

  describe('Transformers', () => {
    it('applies a custom transformer that adds an attribute to the <pre> tag', async () => {
      const customCode = 'console.log("Test");';

      const addDataAttributeTransformer: ShikiTransformer = {
        pre(node) {
          node.properties = {
            ...node.properties,
            'data-custom-transformer': 'applied',
          };
        },
      };

      const { getByTestId } = renderComponent({
        code: customCode,
        language: 'javascript',
        transformers: [addDataAttributeTransformer],
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const preElement = container.querySelector('pre');
        expect(preElement).toHaveAttribute(
          'data-custom-transformer',
          'applied'
        );
      });
    });
  });

  describe('Async robustness', () => {
    it('ignores stale highlight results from earlier requests', async () => {
      const pending: ((highlighter: HighlighterCore) => void)[] = [];

      const createDeferredFactory = vi.fn<HighlighterFactory>(
        async () =>
          // oxlint-disable-next-line promise/avoid-new -- the test resolves the two requests by hand, newest first
          await new Promise((resolve) => {
            pending.push(resolve);
          })
      );

      const oldHighlighter = createFakeHighlighter(
        '<pre class="shiki"><code>old result</code></pre>'
      );

      const newHighlighter = createFakeHighlighter(
        '<pre class="shiki"><code>new result</code></pre>'
      );

      const Harness = ({ code }: { code: string }) => {
        const highlighted = useBaseHook(
          code,
          'javascript',
          'github-dark',
          { outputFormat: 'html' },
          createDeferredFactory
        );

        return <div data-testid="output">{highlighted ?? ''}</div>;
      };

      const { rerender, getByTestId } = render(
        <Harness code="const oldValue = 1;" />
      );

      rerender(<Harness code="const newValue = 2;" />);

      expect(pending).toHaveLength(2);

      const [resolveOld, resolveNew] = pending;

      await act(async () => {
        resolveNew?.(newHighlighter);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(getByTestId('output').innerHTML).toContain('new result');
      });

      await act(async () => {
        resolveOld?.(oldHighlighter);
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(getByTestId('output').innerHTML).toContain('new result');
        expect(getByTestId('output').innerHTML).not.toContain(
          'old result'
        );
      });
    });

    it('preserves the last resolved highlight when language becomes invalid', async () => {
      const highlighter = createFakeHighlighter(
        '<pre class="shiki"><code>stable result</code></pre>'
      );

      const factory = vi.fn<HighlighterFactory>(async () => highlighter);

      const Harness = ({ language }: { language: Language }) => {
        const highlighted = useBaseHook(
          'const value = 1;',
          language,
          'github-dark',
          { outputFormat: 'html' },
          factory
        );

        return <div data-testid="output">{highlighted ?? ''}</div>;
      };

      const { getByTestId, rerender } = render(
        <Harness language="javascript" />
      );

      await waitFor(() => {
        expect(getByTestId('output').innerHTML).toContain(
          'stable result'
        );
      });

      rerender(
        <Harness
          language={outOfType<Language>({ scopeName: 'source.invalid' })}
        />
      );

      await waitFor(() => {
        expect(getByTestId('output').innerHTML).toContain(
          'stable result'
        );
      });

      expect(factory).toHaveBeenCalledOnce();
    });
  });

  describe('Render stability', () => {
    // https://github.com/AVGVSTVS96/react-shiki/issues/161: identical re-renders must be no-ops, so heavy work runs once per real input change

    it('tolerates a fresh factory arrow on every render', async () => {
      const highlighter = createMarkdownHighlighter();

      const UnstableFactoryHarness = ({ tick }: { tick: number }) => {
        void tick;

        const freshFactoryLikeCoreEntry = async () => highlighter;

        const highlighted = useBaseHook(
          'SELECT 1',
          'sql',
          'github-dark',
          { outputFormat: 'html', highlighter },
          freshFactoryLikeCoreEntry
        );

        return <div data-testid="out">{highlighted ?? ''}</div>;
      };

      const { rerender } = render(<UnstableFactoryHarness tick={0} />);

      await waitFor(() => {
        expect(highlighter.codeToHtml).toHaveBeenCalledWith(
          'SELECT 1',
          expect.objectContaining({ theme: 'github-dark' })
        );
      });

      rerender(<UnstableFactoryHarness tick={1} />);
      rerender(<UnstableFactoryHarness tick={2} />);
      rerender(<UnstableFactoryHarness tick={3} />);

      await act(async () => {
        await delay(50);
      });

      expect(highlighter.codeToHtml).toHaveBeenCalledOnce();
    });

    it('useShikiHighlighter (core entry) keeps its factory stable: tokenizes once per mount', async () => {
      const highlighter = createMarkdownHighlighter();

      const CoreHarness = () => {
        const highlighted = useShikiHighlighterCore(
          'SELECT 1',
          'sql',
          'github-dark',
          { highlighter, outputFormat: 'html' }
        );

        return <div data-testid="out">{highlighted ?? ''}</div>;
      };

      render(<CoreHarness />);

      await waitFor(() => {
        expect(highlighter.codeToHtml).toHaveBeenCalledWith(
          'SELECT 1',
          expect.objectContaining({ theme: 'github-dark' })
        );
      });

      await act(async () => {
        await delay(50);
      });

      expect(highlighter.codeToHtml).toHaveBeenCalledOnce();
    });
  });

  describe('Cache', () => {
    interface CacheHarnessProps {
      code: string;
      theme?: Theme;
      cache: HighlightCache;
    }

    const setup = () => {
      const highlighter = createFakeHighlighter();
      highlighter.codeToHtml.mockImplementation(
        (code: string) => `<pre>${code}</pre>`
      );

      const Harness = ({
        code,
        theme = 'github-dark',
        cache,
      }: CacheHarnessProps) => {
        const highlighted = useBaseHook(
          code,
          'sql',
          theme,
          { cache, highlighter, outputFormat: 'html' },
          async () => highlighter
        );

        return <div data-testid="out">{highlighted ?? 'pending'}</div>;
      };

      return { Harness, codeToHtml: highlighter.codeToHtml };
    };

    it('paints cached output on the first render of a remount without highlighting', async () => {
      const { Harness, codeToHtml } = setup();
      const cache: HighlightCache = new Map();

      const first = render(<Harness code="SELECT 1" cache={cache} />);
      await waitFor(() => {
        expect(first.getByTestId('out').textContent).toBe(
          '<pre>SELECT 1</pre>'
        );
      });
      first.unmount();

      const second = render(<Harness code="SELECT 1" cache={cache} />);

      expect(second.getByTestId('out').textContent).toBe(
        '<pre>SELECT 1</pre>'
      );

      await act(async () => {
        await delay(20);
      });

      expect(codeToHtml).toHaveBeenCalledOnce();
    });

    it('stores only what was shown at unmount, not streaming partials', async () => {
      const { Harness } = setup();
      const cache = new Map<string, HighlightResultMap[OutputFormat]>();

      const view = render(<Harness code="SEL" cache={cache} />);
      await waitFor(() => {
        expect(view.getByTestId('out').textContent).toBe(
          '<pre>SEL</pre>'
        );
      });
      view.rerender(<Harness code="SELECT 1" cache={cache} />);
      await waitFor(() => {
        expect(view.getByTestId('out').textContent).toBe(
          '<pre>SELECT 1</pre>'
        );
      });

      expect(cache.size).toBe(0);

      view.unmount();

      expect([...cache.values()]).toStrictEqual(['<pre>SELECT 1</pre>']);
    });

    it('misses the cache for a different theme', async () => {
      const { Harness, codeToHtml } = setup();
      const cache: HighlightCache = new Map();

      const first = render(<Harness code="SELECT 1" cache={cache} />);
      await waitFor(() => {
        expect(codeToHtml).toHaveBeenCalledOnce();
      });
      first.unmount();

      const second = render(
        <Harness code="SELECT 1" theme="nord" cache={cache} />
      );

      expect(second.getByTestId('out').textContent).toBe('pending');

      await waitFor(() => {
        expect(codeToHtml).toHaveBeenCalledTimes(2);
      });
    });

    it('reuses cached code when switching back to it while mounted', async () => {
      const { Harness, codeToHtml } = setup();
      const cache: HighlightCache = new Map();

      const first = render(<Harness code="SELECT 1" cache={cache} />);
      await waitFor(() => {
        expect(codeToHtml).toHaveBeenCalledOnce();
      });
      first.unmount();

      const view = render(<Harness code="SELECT 2" cache={cache} />);
      await waitFor(() => {
        expect(codeToHtml).toHaveBeenCalledTimes(2);
      });
      view.rerender(<Harness code="SELECT 1" cache={cache} />);
      await waitFor(() => {
        expect(view.getByTestId('out').textContent).toBe(
          '<pre>SELECT 1</pre>'
        );
      });

      expect(codeToHtml).toHaveBeenCalledTimes(2);
    });
  });

  describe('Line Numbers', () => {
    const code = `function test() {
  return 'hello';
}`;

    it('does not show line numbers by default', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const codeElement = container.querySelector('code');
        expect(codeElement).not.toHaveClass('rs-has-line-numbers');

        const rsLineElements =
          container.querySelectorAll('.rs-line-number');

        expect(rsLineElements).toHaveLength(0);
      });
    });

    it('shows line numbers when enabled', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
        showLineNumbers: true,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const codeElement = container.querySelector('code');
        expect(codeElement).toHaveClass('rs-has-line-numbers');

        const rsLineElements =
          container.querySelectorAll('.rs-line-number');

        expect(rsLineElements.length).toBeGreaterThan(0);
      });
    });

    it('sets custom starting line number', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
        showLineNumbers: true,
        startingLineNumber: 42,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');

        const elementsWithStyle = container.querySelectorAll(
          '[style*="--line-start"]'
        );

        expect(elementsWithStyle.length).toBeGreaterThan(0);
        expect(elementsWithStyle[0]?.getAttribute('style')).toContain(
          '--line-start: 42'
        );
      });
    });

    it('does not set line-start CSS variable when starting from 1', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
        showLineNumbers: true,
        startingLineNumber: 1,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');

        const elementsWithStyle = container.querySelectorAll(
          '[style*="--line-start"]'
        );

        expect(elementsWithStyle).toHaveLength(0);
      });
    });

    it('highlights displayed line numbers', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
        startingLineNumber: 41,
        highlightLineNumbers: [42],
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');

        const highlightedLines = container.querySelectorAll(
          '.rs-highlighted-line'
        );

        expect(highlightedLines).toHaveLength(1);
        expect(highlightedLines[0]?.textContent).toContain(
          "return 'hello';"
        );
        expect(
          container.querySelector('code.rs-has-highlighted-lines')
        ).not.toBeNull();
      });
    });
  });

  describe('Multi-theme Support', () => {
    const code = 'console.log("test");';
    const themes = { light: 'github-light', dark: 'github-dark' };

    const customLightTheme = {
      name: 'custom-light',
      tokenColors: [
        { scope: 'keyword', settings: { foreground: '#ff0000' } },
      ],
    };

    const customDarkTheme = {
      name: 'custom-dark',
      tokenColors: [
        { scope: 'keyword', settings: { foreground: '#00ff00' } },
      ],
    };

    const customDimTheme = {
      name: 'custom-dim',
      tokenColors: [
        { scope: 'keyword', settings: { foreground: '#888888' } },
      ],
    };

    it('renders with light as default and a --shiki-dark CSS variable for the other theme', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
        theme: themes,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const pre = container.querySelector('pre');

        expect(pre).toBeInTheDocument();
        expect(pre).toHaveClass('shiki');

        const spans = container.querySelectorAll(
          'span[style*="--shiki-"]'
        );

        expect(spans.length).toBeGreaterThan(0);

        const [span] = spans;
        const style = span?.getAttribute('style');
        expect(style).toContain('--shiki-dark');
      });
    });

    it('uses dark as default when defaultColor is dark', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
        theme: themes,
        defaultColor: 'dark',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');

        const spans = container.querySelectorAll(
          'span[style*="--shiki-"]'
        );

        expect(spans.length).toBeGreaterThan(0);

        const [span] = spans;
        const style = span?.getAttribute('style');
        expect(style).toContain('--shiki-light');
      });
    });

    it('uses custom CSS variable prefix', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
        theme: themes,
        defaultColor: 'light',
        cssVariablePrefix: '--custom-',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');

        const spans = container.querySelectorAll(
          'span[style*="--custom-"]'
        );

        expect(spans.length).toBeGreaterThan(0);

        const [span] = spans;
        const style = span?.getAttribute('style');
        expect(style).toContain('--custom-dark');
        expect(style).not.toContain('--shiki-dark');
      });
    });

    it.each<{ name: string; theme: Themes }>([
      {
        name: 'two bundled string themes',
        theme: { light: 'github-light', dark: 'github-dark' },
      },
      {
        name: 'two custom TextMate objects',
        theme: { light: customLightTheme, dark: customDarkTheme },
      },
      {
        name: 'mixed: bundled string + custom object',
        theme: { light: 'github-light', dark: customDarkTheme },
      },
      {
        name: 'mixed: custom object + bundled string',
        theme: { light: customLightTheme, dark: 'github-dark' },
      },
      {
        name: 'three themes with custom dim',
        theme: {
          light: 'github-light',
          dark: 'github-dark',
          dim: customDimTheme,
        },
      },
      {
        name: 'three custom TextMate objects',
        theme: {
          light: customLightTheme,
          dark: customDarkTheme,
          dim: customDimTheme,
        },
      },
    ])('works with $name', async ({ theme }) => {
      const { getByTestId } = renderComponent({
        code: 'const x = 1;',
        language: 'javascript',
        theme,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const pre = container.querySelector('pre');
        expect(pre).toBeInTheDocument();
        expect(pre).toHaveClass('shiki');

        const spans = container.querySelectorAll(
          'span[style*="--shiki-"]'
        );

        expect(spans.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Rendering Options', () => {
    const sampleCode = 'const x = 1;\nconst y = 2;';

    it('passes mergeWhitespaces option to Shiki without breaking rendering (whitespace itself is Shiki’s job)', async () => {
      const { getByTestId } = renderComponent({
        code: sampleCode,
        language: 'javascript',
        mergeWhitespaces: false,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        expect(container.querySelector('pre')).toBeInTheDocument();
      });
    });

    it('passes structure option to Shiki: inline renders spans and <br> with no pre or .line spans', async () => {
      const { getByTestId } = renderComponent({
        code: sampleCode,
        language: 'javascript',
        structure: 'inline',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const preElement = container.querySelector('pre');
        expect(preElement).not.toBeInTheDocument();
        const brElement = container.querySelector('br');
        expect(brElement).toBeInTheDocument();
        expect(container.querySelector('.line')).not.toBeInTheDocument();
      });
    });

    it('passes decorations option to Shiki', async () => {
      const decoration = {
        start: 0,
        end: 5,
        tagName: 'mark',
        properties: { class: 'highlighted' },
      };

      const { getByTestId } = renderComponent({
        code: sampleCode,
        language: 'javascript',
        decorations: [decoration],
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const markElement = container.querySelector('mark.highlighted');
        expect(markElement).toBeInTheDocument();
      });
    });
  });

  describe('Output Format', () => {
    const sampleCode = 'const x = 1;\nconst y = 2;';

    it('returns React nodes by default', async () => {
      const { getByTestId } = renderComponent({
        code: sampleCode,
        language: 'javascript',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        expect(container.querySelector('pre')).toBeInTheDocument();
        expect(container.querySelector('code')).toBeInTheDocument();
      });
    });

    it('returns HTML string when outputFormat is html', async () => {
      const { result } = renderHook(() =>
        useShikiHighlighter(sampleCode, 'javascript', 'github-dark', {
          outputFormat: 'html',
        })
      );

      await waitFor(() => {
        expect(result.current).toBeTypeOf('string');
        expect(result.current).toContain('<pre');

        const output = htmlFragment(result.current);
        expect(output.querySelector('pre')).not.toBeNull();
      });
    });

    it('HTML output contains syntax highlighting and preserves the code', async () => {
      const { result } = renderHook(() =>
        useShikiHighlighter('const x = 1;', 'javascript', 'github-dark', {
          outputFormat: 'html',
        })
      );

      await waitFor(() => {
        expect(result.current).toContain('style=');
        expect(result.current).toContain('color:');

        const output = htmlFragment(result.current);
        const spans = output.querySelectorAll('span[style*="color"]');
        expect(spans.length).toBeGreaterThan(0);

        expect(output.textContent).toContain('const x = 1;');
      });
    });

    it('returns Shiki tokens when outputFormat is tokens', async () => {
      const { result } = renderHook(() =>
        useShikiHighlighter('const x = 1;', 'javascript', 'github-dark', {
          outputFormat: 'tokens',
        })
      );

      await waitFor(() => {
        expect(result.current).toMatchObject({
          tokens: [
            expect.arrayContaining([
              expect.objectContaining({
                content: 'const',
                offset: 0,
              }),
            ]),
          ],
        });
        expect(result.current?.tokens[0]?.length).toBeGreaterThan(1);
      });
    });

    it('falls back to react rendering for unrecognized outputFormat', async () => {
      const { getByTestId } = renderComponent({
        code: 'const x = 1;',
        language: 'javascript',
        outputFormat:
          outOfType<HighlighterOptions['outputFormat']>('token'),
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        expect(
          container.querySelector('pre.shiki code span.line')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Engine Configuration', () => {
    it('accepts custom engine option and highlights code', async () => {
      const { getByTestId } = render(<EngineHarness />);

      await waitFor(() => {
        const container = getByTestId('highlighted');
        expect(container).toBeInTheDocument();

        const spans = container.querySelectorAll('span[style*="color"]');
        expect(spans.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Throttling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('throttles highlighting function calls based on timing', () => {
      const mockTime = 1000;
      const throttleMs = 500;
      const now = vi.spyOn(Date, 'now').mockReturnValue(mockTime);
      const performHighlight = vi.fn<() => Promise<void>>();

      const timeoutControl = {
        current: {
          timeoutId: undefined,
          nextAllowedTime: 0,
        },
      };

      throttleHighlighting(performHighlight, timeoutControl, throttleMs);
      expect(timeoutControl.current.timeoutId).toBeDefined();

      vi.runAllTimers();
      expect(performHighlight).toHaveBeenCalledOnce();
      expect(timeoutControl.current.nextAllowedTime).toBe(
        mockTime + throttleMs
      );

      performHighlight.mockClear();

      throttleHighlighting(performHighlight, timeoutControl, throttleMs);
      expect(performHighlight).not.toHaveBeenCalled();

      vi.advanceTimersByTime(throttleMs / 2);
      expect(performHighlight).not.toHaveBeenCalled();

      vi.advanceTimersByTime(throttleMs / 2);
      expect(performHighlight).toHaveBeenCalledOnce();

      now.mockRestore();
    });
  });

  describe('Embedded Language Loading', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('loads only guessed embedded languages that exist in bundled languages', async () => {
      const markdown = [
        '# Example',
        '',
        '```python',
        'print("hi")',
        '```',
        '',
        '```not-bundled',
        'noop',
        '```',
      ].join('\n');

      const highlighter = createMarkdownHighlighter({
        python: pythonGrammar,
      });

      const factory = vi.fn<HighlighterFactory>(async () => highlighter);

      render(<EmbeddedHarness code={markdown} factory={factory} />);

      await waitFor(() => {
        expect(highlighter.loadLanguage).toHaveBeenCalledOnce();
        expect(highlighter.loadLanguage).toHaveBeenCalledWith(
          pythonGrammar
        );
      });
    });

    it('detects embedded language from a real markdown document and loads only bundled matches', async () => {
      const markdown = [
        '# Example',
        '',
        'Intro text.',
        '',
        '```python',
        'print("hi")',
        '```',
        '',
        '```not-bundled',
        'noop',
        '```',
      ].join('\n');

      const highlighter = createMarkdownHighlighter({
        python: pythonGrammar,
      });

      const factory = vi.fn<HighlighterFactory>(async () => highlighter);

      render(<EmbeddedHarness code={markdown} factory={factory} />);

      await waitFor(() => {
        expect(highlighter.loadLanguage).toHaveBeenCalledWith(
          pythonGrammar
        );
      });
    });

    it('does not auto-load embedded languages when a custom highlighter is provided', async () => {
      const customHighlighter = createMarkdownHighlighter({
        python: pythonGrammar,
      });

      const factory = vi.fn<HighlighterFactory>();

      render(
        <EmbeddedHarness
          highlighter={customHighlighter}
          factory={factory}
        />
      );

      await waitFor(() => {
        expect(customHighlighter.codeToHtml).toHaveBeenCalledWith(
          embeddedMarkdown,
          expect.objectContaining({ theme: 'github-dark' })
        );
        expect(customHighlighter.loadLanguage).not.toHaveBeenCalled();
        expect(factory).not.toHaveBeenCalled();
      });
    });
  });
});
