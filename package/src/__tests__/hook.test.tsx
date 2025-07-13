import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useShikiHighlighter } from '../index';
import type { Language, Theme } from '../lib/types';
import type { ShikiTransformer } from 'shiki';

interface TestComponentProps {
  code: string;
  language: Language;
  theme: Theme;
  transformers?: ShikiTransformer[];
  tabindex?: string;
  langAlias?: Record<string, string>;
}

const TestComponent = ({
  code,
  language,
  theme,
  transformers,
  langAlias,
}: TestComponentProps) => {
  const highlighted = useShikiHighlighter(code, language, theme, {
    transformers,
    langAlias,
  });
  return <div data-testid="highlighted">{highlighted}</div>;
};

describe('useShikiHighlighter Hook', () => {
  const renderComponent = (props?: Partial<TestComponentProps>) => {
    const defaultProps: TestComponentProps = {
      code: '<div>Hello World</div>',
      language: 'html',
      theme: 'github-light',
      transformers: [],
      ...props,
    };
    return render(<TestComponent {...defaultProps} />);
  };

  test('renders correct DOM structure', async () => {
    const { getByTestId } = renderComponent();
    await waitFor(() => {
      const container = getByTestId('highlighted');
      
      // Check pre element with theme classes
      const preElement = container.querySelector('pre.shiki.github-light');
      expect(preElement).toBeInTheDocument();
      
      // Check code element inside pre
      const codeElement = preElement?.querySelector('code');
      expect(codeElement).toBeInTheDocument();
      
      // Check line spans inside code
      const lineSpan = codeElement?.querySelector('span.line');
      expect(lineSpan).toBeInTheDocument();
    });
  });

  test('falls back to plaintext highlighting when language is unknown', async () => {
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
      // The rendered text should exactly match the input.
      expect(preElement?.textContent).toBe(code);
      // Ensure no inline-styled spans exist.
      expect(lineSpan?.querySelectorAll('span[style]').length).toBe(0);
    });
  });

  test('applies custom transformer in useShiki hook', async () => {
    const customCode = 'console.log("Test");';
    // Transformer that adds a custom attribute to the <pre> tag.
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


  test('applies highlighting on aliased language', async () => {
    const code = 'package main';
    const { getByTestId } = renderComponent({
      code,
      language: 'golang',
      langAlias: {
        golang: 'go',
      },
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
      langAlias: {
        indents: 'python',
      },
    });

    await waitFor(() => {
      const container = getByTestId('highlighted');
      const preElement = container.querySelector('pre');
      const defKeyword = Array.from(preElement?.querySelectorAll('span') || [])
        .find(span => span.textContent === 'def');

      expect(defKeyword).toBeInTheDocument();
      expect(defKeyword).toHaveStyle('color: #D73A49');
    });
  });
});
