import { useMemo, useRef } from 'react';
import { renderHook, render, waitFor } from '@testing-library/react';
import { vi, describe, expect, it } from 'vitest';
import { throttleHighlighting, useStableValue } from '../src/lib/utils';
import { useHighlight as useBaseHook } from '../src/lib/hook';
import type { HighlighterFactory, TimeoutState } from '../src/lib/types';
import { createFakeHighlighter } from './fakes';

describe(useStableValue, () => {
  it('preserves reference for deep-equal objects across rerenders', () => {
    const { result, rerender } = renderHook(
      ({ val }) => useStableValue(val),
      { initialProps: { val: { theme: 'dark', nested: [1, 2] } } }
    );

    const first = result.current;
    rerender({ val: { theme: 'dark', nested: [1, 2] } });
    rerender({ val: { theme: 'dark', nested: [1, 2] } });
    expect(result.current).toBe(first);
  });

  it('updates reference when content actually changes', () => {
    const { result, rerender } = renderHook(
      ({ val }) => useStableValue(val),
      { initialProps: { val: { theme: 'dark' } } }
    );

    const first = result.current;
    rerender({ val: { theme: 'light' } });
    expect(result.current).not.toBe(first);
    expect(result.current).toEqual({ theme: 'light' });
  });

  it('useMemo depending on stable value skips recomputation', () => {
    const compute = vi.fn<(opts: { theme: string }) => string>(
      (opts) => `styled-${opts.theme}`
    );

    const { result, rerender } = renderHook(
      ({ opts }) => {
        const stable = useStableValue(opts);

        return useMemo(() => compute(stable), [stable]);
      },
      { initialProps: { opts: { theme: 'dark' } } }
    );

    expect(compute).toHaveBeenCalledOnce();
    expect(result.current).toBe('styled-dark');

    rerender({ opts: { theme: 'dark' } });
    expect(compute).toHaveBeenCalledOnce();

    rerender({ opts: { theme: 'light' } });
    expect(compute).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('styled-light');
  });
});

describe('useShikiHighlighter render stability', () => {
  it('does not re-highlight when options object reference changes but content is the same', async () => {
    const highlighter = createFakeHighlighter();
    const factory = vi.fn<HighlighterFactory>();

    const Harness = ({
      opts,
    }: {
      opts: { outputFormat: 'html'; highlighter: typeof highlighter };
    }) => {
      const result = useBaseHook(
        'const x = 1',
        'javascript',
        'github-dark',
        opts,
        factory
      );

      return <div data-testid="out">{result ?? ''}</div>;
    };

    const opts = { outputFormat: 'html' as const, highlighter };
    const { rerender, getByTestId } = render(<Harness opts={opts} />);

    await waitFor(() => {
      expect(highlighter.codeToHtml).toHaveBeenCalledOnce();
    });

    const callCount = highlighter.codeToHtml.mock.calls.length;

    rerender(<Harness opts={{ outputFormat: 'html', highlighter }} />);
    rerender(<Harness opts={{ outputFormat: 'html', highlighter }} />);

    await waitFor(() => {
      expect(getByTestId('out')).toBeInTheDocument();
    });

    expect(highlighter.codeToHtml).toHaveBeenCalledTimes(callCount);
  });
});

describe(throttleHighlighting, () => {
  it('bases next allowed time on execution time, not scheduling time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T00:00:00.000Z'));

    const performHighlight = vi.fn<() => Promise<void>>();

    const { result } = renderHook(() =>
      useRef<TimeoutState>({
        nextAllowedTime: Date.now() + 100,
        timeoutId: undefined,
      })
    );

    throttleHighlighting(performHighlight, result.current, 250);

    vi.setSystemTime(new Date('2026-03-06T00:00:00.100Z'));
    await vi.runOnlyPendingTimersAsync();

    expect(performHighlight).toHaveBeenCalledOnce();
    expect(result.current.current.nextAllowedTime).toBe(Date.now() + 250);

    vi.useRealTimers();
  });
});
