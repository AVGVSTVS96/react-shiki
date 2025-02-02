import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useShikiHighlighter } from '../useShiki';
import type { Language, Theme } from '../types';

interface TestComponentProps {
  code: string;
  language: Language;
  theme: Theme;
}

const TestComponent: React.FC<TestComponentProps> = ({ code, language, theme }) => {
  const highlighted = useShikiHighlighter(code, language, theme);
  return <div data-testid="highlighted">{highlighted}</div>;
};

describe('useShikiHighlighter Hook', () => {
  test('returns highlighted code output with proper structure', async () => {
    const { getByTestId } = render(
      <TestComponent code={'<div>Hello World</div>'} language="html" theme={"github-light"} />
    );

    await waitFor(() => {
      const container = getByTestId('highlighted');

      // Ensure the highlighted code is rendered as a <pre> element with classes "shiki github-light"
      const preElement = container.querySelector('pre.shiki.github-light');
      expect(preElement).toBeInTheDocument();

      // Inside the <pre>, a <code> element should be present.
      const codeElement = preElement?.querySelector('code');
      expect(codeElement).toBeInTheDocument();

      // And inside the <code>, at least one <span> with class "line" should be present.
      const lineSpan = codeElement?.querySelector('span.line');
      expect(lineSpan).toBeInTheDocument();
    });
  });
});

