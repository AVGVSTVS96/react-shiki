import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import {
  useShikiHighlighter,
  createJavaScriptRegexEngine,
} from '../src/index';
import type { Language, Theme, Themes } from '../src/lib/types';
import type { ShikiTransformer } from 'shiki';
import { throttleHighlighting } from '../src/lib/utils';

interface TestComponentProps {
  code: string;
  language: Language;
  theme: Theme | Themes;
  transformers?: ShikiTransformer[];
  langAlias?: Record<string, string>;
  showLineNumbers?: boolean;
  startingLineNumber?: number;
  outputFormat?: 'react' | 'html';
  defaultColor?: string;
  cssVariablePrefix?: string;
  mergeWhitespaces?: boolean;
  structure?: 'classic' | 'inline';
  decorations?: any[];
}

const TestComponent = ({
  code,
  language,
  theme,
  ...options
}: TestComponentProps) => {
  const highlighted = useShikiHighlighter(code, language, theme, options);

  // Handle HTML output format
  if (
    options.outputFormat === 'html' &&
    typeof highlighted === 'string'
  ) {
    return (
      <div data-testid="highlighted">
        <div dangerouslySetInnerHTML={{ __html: highlighted }} />
      </div>
    );
  }

  return <div data-testid="highlighted">{highlighted}</div>;
};

describe('useShikiHighlighter Hook', () => {
  const renderComponent = (props?: Partial<TestComponentProps>) => {
    const defaultProps: TestComponentProps = {
      code: '<div>Hello World</div>',
      language: 'html',
      theme: 'github-light',
      ...props,
    };
    return render(<TestComponent {...defaultProps} />);
  };

  describe('Basic Rendering', () => {
    test('renders correct DOM structure', async () => {
      const { getByTestId } = renderComponent();
      await waitFor(() => {
        const container = getByTestId('highlighted');

        // Check pre element with theme classes
        const preElement = container.querySelector(
          'pre.shiki.github-light'
        );
        expect(preElement).toBeInTheDocument();

        // Check code element inside pre
        const codeElement = preElement?.querySelector('code');
        expect(codeElement).toBeInTheDocument();

        // Check line spans inside code
        const lineSpan = codeElement?.querySelector('span.line');
        expect(lineSpan).toBeInTheDocument();
      });
    });

    test('falls back to plaintext for unknown languages', async () => {
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
        // The rendered text should exactly match the input
        expect(preElement?.textContent).toBe(code);
        // Ensure no inline-styled spans exist
        expect(lineSpan?.querySelectorAll('span[style]').length).toBe(0);
      });
    });
  });

  describe('Language Aliases', () => {
    test('applies highlighting on aliased language', async () => {
      const code = 'package main';
      const { getByTestId } = renderComponent({
        code,
        language: 'golang',
        langAlias: { golang: 'go' },
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const preElement = container.querySelector('pre');
        const spanElement = preElement?.querySelector(
          'code>span>span'
        ) as HTMLSpanElement | null;

        expect(spanElement).toBeInTheDocument();
        expect(spanElement).toHaveStyle('color: #D73A49');
      });
    });

    test('handles multiple language aliases', async () => {
      const code = 'def hello():\n    print("world")';
      const { getByTestId } = renderComponent({
        code,
        language: 'indents',
        langAlias: { indents: 'python' },
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const preElement = container.querySelector('pre');
        const defKeyword = Array.from(
          preElement?.querySelectorAll('span') || []
        ).find((span) => span.textContent === 'def');

        expect(defKeyword).toBeInTheDocument();
        expect(defKeyword).toHaveStyle('color: #D73A49');
      });
    });
  });

  describe('Transformers', () => {
    test('applies custom transformers', async () => {
      const customCode = 'console.log("Test");';
      // Transformer that adds a custom attribute to the <pre> tag
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

  describe('Line Numbers', () => {
    const code = `function test() {
  return 'hello';
}`;

    test('does not show line numbers by default', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const codeElement = container.querySelector('code');
        expect(codeElement).not.toHaveClass('has-line-numbers');

        const lineElements = container.querySelectorAll('.line-numbers');
        expect(lineElements).toHaveLength(0);
      });
    });

    test('shows line numbers when enabled', async () => {
      const { getByTestId } = renderComponent({
        code,
        language: 'javascript',
        showLineNumbers: true,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        const codeElement = container.querySelector('code');
        expect(codeElement).toHaveClass('has-line-numbers');

        const lineElements = container.querySelectorAll('.line-numbers');
        expect(lineElements.length).toBeGreaterThan(0);
      });
    });

    test('sets custom starting line number', async () => {
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

    test('does not set line-start CSS variable when starting from 1', async () => {
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
        expect(elementsWithStyle.length).toBe(0);
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

    test('renders with light as default and CSS variables for other themes', async () => {
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

        // Light is default, so we should have --shiki-dark CSS variable
        const span = spans[0];
        const style = span?.getAttribute('style');
        expect(style).toContain('--shiki-dark');
      });
    });

    test('uses dark as default when defaultColor is dark', async () => {
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

        const span = spans[0];
        const style = span?.getAttribute('style');
        expect(style).toContain('--shiki-light');
      });
    });

    test('uses custom CSS variable prefix', async () => {
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

        const span = spans[0];
        const style = span?.getAttribute('style');
        expect(style).toContain('--custom-dark');
        expect(style).not.toContain('--shiki-dark');
      });
    });

    test.each([
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

    test('passes mergeWhitespaces option to Shiki', async () => {
      const { getByTestId } = renderComponent({
        code: sampleCode,
        language: 'javascript',
        mergeWhitespaces: false,
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        expect(container.querySelector('pre')).toBeInTheDocument();
        // We're primarily testing that the option doesn't break rendering
        // The actual whitespace behavior is Shiki's responsibility
      });
    });

    test('passes structure option to Shiki', async () => {
      const { getByTestId } = renderComponent({
        code: sampleCode,
        language: 'javascript',
        structure: 'inline',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        // With inline structure, there's no pre element
        const preElement = container.querySelector('pre');
        expect(preElement).not.toBeInTheDocument();
        // Instead, content is rendered with spans and br tags
        const brElement = container.querySelector('br');
        expect(brElement).toBeInTheDocument();
        // No .line spans with inline structure
        expect(container.querySelector('.line')).not.toBeInTheDocument();
      });
    });

    test('passes decorations option to Shiki', async () => {
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

    test('returns React nodes by default', async () => {
      const { getByTestId } = renderComponent({
        code: sampleCode,
        language: 'javascript',
      });

      await waitFor(() => {
        const container = getByTestId('highlighted');
        // Should have rendered React elements
        expect(container.querySelector('pre')).toBeInTheDocument();
        expect(container.querySelector('code')).toBeInTheDocument();
      });
    });

    test('returns HTML string when outputFormat is html', async () => {
      let capturedOutput: any = null;

      const TestCapture = () => {
        const highlighted = useShikiHighlighter(
          sampleCode,
          'javascript',
          'github-dark',
          { outputFormat: 'html' }
        );
        capturedOutput = highlighted;

        if (typeof highlighted === 'string' && highlighted) {
          return (
            <div
              data-testid="output"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          );
        }
        return <div data-testid="output">Loading...</div>;
      };

      const { getByTestId } = render(<TestCapture />);

      await waitFor(() => {
        // Should return an HTML string
        expect(typeof capturedOutput).toBe('string');
        expect(capturedOutput).toContain('<pre');

        const container = getByTestId('output');
        expect(container.querySelector('pre')).toBeInTheDocument();
      });
    });

    test('HTML output contains syntax highlighting', async () => {
      let capturedOutput: any = null;

      const TestCapture = () => {
        const highlighted = useShikiHighlighter(
          'const x = 1;',
          'javascript',
          'github-dark',
          { outputFormat: 'html' }
        );
        capturedOutput = highlighted;

        if (typeof highlighted === 'string' && highlighted) {
          return (
            <div
              data-testid="output"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          );
        }
        return <div data-testid="output">Loading...</div>;
      };

      const { getByTestId } = render(<TestCapture />);

      await waitFor(() => {
        // Verify HTML string contains syntax highlighting elements
        expect(capturedOutput).toContain('style=');
        expect(capturedOutput).toContain('color:');

        // Verify rendered DOM has highlighted spans
        const container = getByTestId('output');
        const spans = container.querySelectorAll('span[style*="color"]');
        expect(spans.length).toBeGreaterThan(0);

        // Verify the code content is preserved
        expect(container.textContent).toContain('const x = 1;');
      });
    });
  });

  describe('Engine Configuration', () => {
    test('accepts custom engine option and highlights code', async () => {
      const TestComponent = () => {
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

      const { getByTestId } = render(<TestComponent />);

      await waitFor(() => {
        const container = getByTestId('highlighted');
        expect(container).toBeInTheDocument();

        // Verify syntax highlighting occurred
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

    test('throttles highlighting function calls based on timing', () => {
      // Mock date to have a consistent starting point
      const originalDateNow = Date.now;
      const mockTime = 1000;
      Date.now = vi.fn(() => mockTime);

      // Mock the perform highlight function
      const performHighlight = vi.fn().mockResolvedValue(undefined);

      // Setup timeout control like in the hook
      const timeoutControl = {
        current: {
          timeoutId: undefined,
          nextAllowedTime: 0,
        },
      };

      // First call should schedule immediately since nextAllowedTime is in the past
      throttleHighlighting(performHighlight, timeoutControl, 500);
      expect(timeoutControl.current.timeoutId).toBeDefined();

      // Run the timeout
      vi.runAllTimers();
      expect(performHighlight).toHaveBeenCalledTimes(1);
      expect(timeoutControl.current.nextAllowedTime).toBe(1500); // 1000 + 500

      // Reset the mock
      performHighlight.mockClear();

      // Call again - should be delayed by the throttle duration
      throttleHighlighting(performHighlight, timeoutControl, 500);
      expect(performHighlight).not.toHaveBeenCalled(); // Not called yet

      // Advance halfway through the delay - should still not be called
      vi.advanceTimersByTime(250);
      expect(performHighlight).not.toHaveBeenCalled();

      // Advance the full delay
      vi.advanceTimersByTime(250);
      expect(performHighlight).toHaveBeenCalledTimes(1);

      // Restore original Date.now
      Date.now = originalDateNow;
    });
  });
});
