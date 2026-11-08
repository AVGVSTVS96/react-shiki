import { describe, test, expect } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useShikiHighlighter, ShikiHighlighter } from '../src/index';

// All tests in this file use the JavaScript engine: the underlying
// highlighter is a singleton, so the first highlight decides the engine
// for the whole test environment.

describe("engine: 'javascript'", () => {
  test('highlights via the hook', async () => {
    const Harness = () => {
      const out = useShikiHighlighter(
        'const a = 1;',
        'javascript',
        'github-dark',
        { engine: 'javascript' }
      );
      return <div data-testid="out">{out}</div>;
    };

    const { getByTestId } = render(<Harness />);
    await waitFor(() => {
      expect(getByTestId('out').textContent).toContain('const a = 1;');
      expect(getByTestId('out').querySelector('pre')).not.toBeNull();
    });
  });

  test('is referentially stable when passed inline: renders settle', async () => {
    const renders = { count: 0 };
    const Harness = () => {
      renders.count++;
      const out = useShikiHighlighter(
        'const b = 2;',
        'javascript',
        'github-dark',
        { engine: 'javascript' }
      );
      return <div data-testid="out">{out}</div>;
    };

    const { getByTestId } = render(<Harness />);
    await waitFor(() =>
      expect(getByTestId('out').textContent).toContain('const b = 2;')
    );
    const settled = renders.count;

    await new Promise((r) => setTimeout(r, 300));
    expect(renders.count).toBe(settled);
  });

  test('works as a component prop', async () => {
    const { container } = render(
      <ShikiHighlighter
        language="javascript"
        theme="github-dark"
        engine="javascript"
      >
        {'const c = 3;'}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      expect(container.textContent).toContain('const c = 3;');
      expect(container.querySelector('pre')).not.toBeNull();
    });
  });
});
