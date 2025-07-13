import { describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ShikiHighlighter } from '../index';

describe('Line Numbers', () => {
  const code = `function test() {
  return 'hello';
}`;

  it('should not show line numbers by default', async () => {
    const { container } = render(
      <ShikiHighlighter language="javascript" theme="github-dark">
        {code}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      const containerElement = container.querySelector('#shiki-container');
      expect(containerElement).not.toHaveClass('has-line-numbers');

      const lineElements = container.querySelectorAll('.line-numbers');
      expect(lineElements).toHaveLength(0);
    });
  });

  it('should show line numbers when enabled', async () => {
    const { container } = render(
      <ShikiHighlighter
        language="javascript"
        theme="github-dark"
        showLineNumbers
      >
        {code}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      const codeElement = container.querySelector('code');
      expect(codeElement).toHaveClass('has-line-numbers');

      const lineElements = container.querySelectorAll('.line-numbers');
      expect(lineElements.length).toBeGreaterThan(0);
    });
  });

  it('should set custom starting line number', async () => {
    const { container } = render(
      <ShikiHighlighter
        language="javascript"
        theme="github-dark"
        showLineNumbers
        startingLineNumber={42}
      >
        {code}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      // Check which elements have the style attribute
      const elementsWithStyle = container.querySelectorAll(
        '[style*="--line-start"]'
      );
      expect(elementsWithStyle.length).toBeGreaterThan(0);
      expect(elementsWithStyle[0]?.getAttribute('style')).toContain(
        '--line-start: 42'
      );
    });
  });

  it('should not set line-start CSS variable when starting from 1', async () => {
    const { container } = render(
      <ShikiHighlighter
        language="javascript"
        theme="github-dark"
        showLineNumbers
        startingLineNumber={1}
      >
        {code}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      const elementsWithStyle = container.querySelectorAll(
        '[style*="--line-start"]'
      );
      expect(elementsWithStyle.length).toBe(0);
    });
  });
});
