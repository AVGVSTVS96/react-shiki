import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useShikiHighlighter } from '../useShiki';
import type { Language, Theme } from '../types';

interface TestComponentProps {
  code: string;
  language: Language;
  theme: Theme;
}

const TestComponent  = ({ code, language, theme }: TestComponentProps) => {
  const highlighted = useShikiHighlighter(code, language, theme);
  return <div data-testid="highlighted">{highlighted}</div>;
};

describe('useShikiHighlighter Hook', () => {
  const renderComponent = () => {
    return render(
      <TestComponent code={'<div>Hello World</div>'} language="html" theme={"github-light"} />
    );
  };

  test('renders pre element with correct theme classes', async () => {
    const { getByTestId } = renderComponent();

    await waitFor(() => {
      const container = getByTestId('highlighted');
      const preElement = container.querySelector('pre.shiki.github-light');
      expect(preElement).toBeInTheDocument();
    });
  });

  test('sets tabindex=-1 on pre element', async () => {
    const { getByTestId } = renderComponent();

    await waitFor(() => {
      const container = getByTestId('highlighted');
      const preElement = container.querySelector('pre.shiki.github-light');
      expect(preElement).toHaveAttribute('tabindex', '-1');
    });
  });

  test('renders code element inside pre element', async () => {
    const { getByTestId } = renderComponent();

    await waitFor(() => {
      const container = getByTestId('highlighted');
      const preElement = container.querySelector('pre.shiki.github-light');
      const codeElement = preElement?.querySelector('code');
      expect(codeElement).toBeInTheDocument();
    });
  });

  test('renders line spans inside code element', async () => {
    const { getByTestId } = renderComponent();

    await waitFor(() => {
      const container = getByTestId('highlighted');
      const preElement = container.querySelector('pre.shiki.github-light');
      const codeElement = preElement?.querySelector('code');
      const lineSpan = codeElement?.querySelector('span.line');
      expect(lineSpan).toBeInTheDocument();
    });
  });
});

