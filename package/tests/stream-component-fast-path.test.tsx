import { beforeAll, describe, expect, test } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import { ShikiStreamHighlighter } from '../src/index';

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: ['typescript', 'plaintext'],
    themes: ['github-dark'],
  });
}, 30000);

const getRoots = (container: HTMLElement) => {
  const code = container.querySelector(
    '[data-testid="shiki-stream-container"] code'
  ) as HTMLElement | null;

  return {
    code,
    stable: code?.querySelector(
      '[data-region="stable"]'
    ) as HTMLElement | null,
    tail: code?.querySelector(
      '[data-region="tail"]'
    ) as HTMLElement | null,
  };
};

describe('ShikiStreamHighlighter fast path', () => {
  test('keeps finalized lines stable while tail streams', async () => {
    const { container, rerender } = render(
      <ShikiStreamHighlighter
        input={{ code: '', isComplete: false }}
        language="typescript"
        theme="github-dark"
        highlighter={highlighter}
        allowRecalls={false}
      />
    );

    rerender(
      <ShikiStreamHighlighter
        input={{ code: 'const a = 1;\n', isComplete: false }}
        language="typescript"
        theme="github-dark"
        highlighter={highlighter}
        allowRecalls={false}
      />
    );

    await waitFor(() => {
      const { stable } = getRoots(container);
      expect(stable?.textContent).toBe('const a = 1;\n');
    });

    const stableBefore = getRoots(container).stable?.firstChild;

    rerender(
      <ShikiStreamHighlighter
        input={{ code: 'const a = 1;\nconst b', isComplete: false }}
        language="typescript"
        theme="github-dark"
        highlighter={highlighter}
        allowRecalls={false}
      />
    );

    await waitFor(() => {
      const { tail } = getRoots(container);
      expect(tail?.textContent).toBe('const b');
    });

    const { stable } = getRoots(container);
    expect(stable?.firstChild).toBe(stableBefore);
    expect(stable?.textContent).toBe('const a = 1;\n');
  });

  test('flushes remaining tail to stable region on completion', async () => {
    const { container, rerender } = render(
      <ShikiStreamHighlighter
        input={{ code: 'let value', isComplete: false }}
        language="typescript"
        theme="github-dark"
        highlighter={highlighter}
        allowRecalls={false}
      />
    );

    await waitFor(() => {
      const { tail } = getRoots(container);
      expect(tail?.textContent).toBe('let value');
    });

    rerender(
      <ShikiStreamHighlighter
        input={{ code: 'let value = 1;', isComplete: true }}
        language="typescript"
        theme="github-dark"
        highlighter={highlighter}
        allowRecalls={false}
      />
    );

    await waitFor(() => {
      const { stable, tail } = getRoots(container);
      expect(stable?.textContent).toBe('let value = 1;');
      expect(tail?.textContent).toBe('');
    });
  });
});
