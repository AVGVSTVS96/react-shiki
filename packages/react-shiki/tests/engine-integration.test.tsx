import { describe, expect, it, vi } from 'vitest';
import { setTimeout as delay } from 'node:timers/promises';
import { render, waitFor } from '@testing-library/react';
import { useShikiHighlighter, ShikiHighlighter } from '../src/index';

const HookHarness = () => {
  const out = useShikiHighlighter(
    'const a = 1;',
    'javascript',
    'github-dark',
    { engine: 'javascript' }
  );

  return <div data-testid="out">{out}</div>;
};

const settleMs = 300;

describe("engine: 'javascript' (every test uses it: the singleton highlighter keeps the first highlight's engine)", () => {
  it('highlights via the hook', async () => {
    const { getByTestId } = render(<HookHarness />);
    await waitFor(() => {
      expect(getByTestId('out').textContent).toContain('const a = 1;');
      expect(getByTestId('out').querySelector('pre')).not.toBeNull();
    });
  });

  it('is referentially stable when passed inline: renders settle', async () => {
    const rendered = vi.fn<() => void>();

    const Harness = () => {
      rendered();

      const out = useShikiHighlighter(
        'const b = 2;',
        'javascript',
        'github-dark',
        { engine: 'javascript' }
      );

      return <div data-testid="out">{out}</div>;
    };

    const { getByTestId } = render(<Harness />);
    await waitFor(() => {
      expect(getByTestId('out').textContent).toContain('const b = 2;');
    });
    const settled = rendered.mock.calls.length;

    await delay(settleMs);
    expect(rendered).toHaveBeenCalledTimes(settled);
  });

  it('works as a component prop', async () => {
    const { container } = render(
      <ShikiHighlighter
        language="javascript"
        theme="github-dark"
        engine="javascript"
      >
        const c = 3;
      </ShikiHighlighter>
    );

    await waitFor(() => {
      expect(container.textContent).toContain('const c = 3;');
      expect(container.querySelector('pre')).not.toBeNull();
    });
  });
});
