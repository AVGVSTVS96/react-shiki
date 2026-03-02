import { useMemo } from 'react';
import { renderHook, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useStableValue } from '../src/lib/utils';
import { useShikiHighlighter as useBaseHook } from '../src/lib/hook';
import type { Highlighter, LanguageInput } from 'shiki';

describe('useStableValue', () => {
  test('preserves reference for deep-equal objects across rerenders', () => {
    const { result, rerender } = renderHook(
      ({ val }) => useStableValue(val),
      { initialProps: { val: { theme: 'dark', nested: [1, 2] } } }
    );

    const first = result.current;
    rerender({ val: { theme: 'dark', nested: [1, 2] } });
    rerender({ val: { theme: 'dark', nested: [1, 2] } });
    expect(result.current).toBe(first);
  });

  test('updates reference when content actually changes', () => {
    const { result, rerender } = renderHook(
      ({ val }) => useStableValue(val),
      { initialProps: { val: { theme: 'dark' } } }
    );

    const first = result.current;
    rerender({ val: { theme: 'light' } });
    expect(result.current).not.toBe(first);
    expect(result.current).toEqual({ theme: 'light' });
  });

  test('useMemo depending on stable value skips recomputation', () => {
    const compute = vi.fn((opts: { theme: string }) => `styled-${opts.theme}`);

    const { result, rerender } = renderHook(
      ({ opts }) => {
        const stable = useStableValue(opts);
        return useMemo(() => compute(stable), [stable]);
      },
      { initialProps: { opts: { theme: 'dark' } } }
    );

    expect(compute).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('styled-dark');

    // New reference, same content — memo should not recompute
    rerender({ opts: { theme: 'dark' } });
    expect(compute).toHaveBeenCalledTimes(1);

    // Actually different content — memo should recompute
    rerender({ opts: { theme: 'light' } });
    expect(compute).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('styled-light');
  });
});

describe('useShikiHighlighter render stability', () => {
  const createMockHighlighter = () =>
    ({
      getBundledLanguages: vi.fn(() => ({})),
      loadLanguage: vi.fn(async () => {}),
      getLoadedLanguages: vi.fn(() => ['javascript']),
      codeToHtml: vi.fn(() => '<pre class="shiki"><code>ok</code></pre>'),
      codeToHast: vi.fn(() => ({ type: 'root', children: [] })),
    }) as unknown as Highlighter;

  test('does not re-highlight when options object reference changes but content is the same', async () => {
    const highlighter = createMockHighlighter();
    const factory = vi.fn();

    type HookFactory = Parameters<typeof useBaseHook>[4];

    const Harness = ({ opts }: { opts: { outputFormat: 'html'; highlighter: Highlighter } }) => {
      const result = useBaseHook('const x = 1', 'javascript', 'github-dark', opts, factory as HookFactory);
      return <div data-testid="out">{typeof result === 'string' ? result : ''}</div>;
    };

    const opts = { outputFormat: 'html' as const, highlighter };
    const { rerender, getByTestId } = render(<Harness opts={opts} />);

    await waitFor(() => {
      expect(highlighter.codeToHtml).toHaveBeenCalledTimes(1);
    });

    const callCount = (highlighter.codeToHtml as ReturnType<typeof vi.fn>).mock.calls.length;

    // Rerender with new object reference, identical content
    rerender(<Harness opts={{ outputFormat: 'html', highlighter }} />);
    rerender(<Harness opts={{ outputFormat: 'html', highlighter }} />);

    // Wait a tick to ensure no async effect fires
    await waitFor(() => {
      expect(getByTestId('out')).toBeInTheDocument();
    });

    expect(highlighter.codeToHtml).toHaveBeenCalledTimes(callCount);
  });
});
