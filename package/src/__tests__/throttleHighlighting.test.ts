import { vi } from 'vitest';
import { throttleHighlighting } from '../useShiki';

describe('throttleHighlighting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set a known system time for predictability.
    vi.setSystemTime(1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('schedules performHighlight immediately if nextAllowedTime is in the past', async () => {
    // Setup a dummy timeout control object.
    const timeoutControl = {
      current: {
        timeoutId: undefined as ReturnType<typeof setTimeout> | undefined,
        nextAllowedTime: 0,
      },
    };
    const performHighlight = vi.fn().mockResolvedValue(undefined);
    const throttleMs = 500;
    // With nextAllowedTime at 0, delay = max(0, 0 - 1000) = 0.
    throttleHighlighting(performHighlight, timeoutControl, throttleMs);

    // A timeout should be scheduled immediately.
    expect(timeoutControl.current.timeoutId).toBeDefined();

    // Advance time by 0 ms; the callback should fire immediately.
    await vi.advanceTimersByTimeAsync(0);
    // Wait a tick for the promise resolution.
    await Promise.resolve();

    expect(performHighlight).toHaveBeenCalledTimes(1);
    // Since our fake timers don't update Date.now(), we expect:
    // nextAllowedTime = 1000 (initial time) + throttleMs.
    expect(timeoutControl.current.nextAllowedTime).toBe(1000 + throttleMs);
  });

  test('delays performHighlight if nextAllowedTime is in the future', async () => {
    // Set nextAllowedTime 300ms in the future.
    const futureTime = 1000 + 300;
    const timeoutControl = {
      current: {
        timeoutId: undefined as ReturnType<typeof setTimeout> | undefined,
        nextAllowedTime: futureTime,
      },
    };
    const performHighlight = vi.fn().mockResolvedValue(undefined);
    const throttleMs = 500;

    // Expected delay: futureTime - now = 300.
    throttleHighlighting(performHighlight, timeoutControl, throttleMs);

    // Before 300ms, the callback should not fire.
    await vi.advanceTimersByTimeAsync(299);
    expect(performHighlight).not.toHaveBeenCalled();

    // Advance by 1 more ms to reach 300ms total.
    await vi.advanceTimersByTimeAsync(1);
    // Wait for promise resolution.
    await Promise.resolve();

    expect(performHighlight).toHaveBeenCalledTimes(1);
    // Because our fake timers do not update Date.now(), we expect nextAllowedTime to be
    // the initial time (1000) plus throttleMs.
    expect(timeoutControl.current.nextAllowedTime).toBe(1000 + throttleMs);
  });

  test('cancels previous scheduled callback when called again', async () => {
    const timeoutControl = {
      current: {
        timeoutId: undefined as ReturnType<typeof setTimeout> | undefined,
        nextAllowedTime: 0,
      },
    };
    const performHighlight = vi.fn().mockResolvedValue(undefined);
    const throttleMs = 500;

    // First call: should schedule immediately.
    throttleHighlighting(performHighlight, timeoutControl, throttleMs);
    const firstTimeoutId = timeoutControl.current.timeoutId;

    // Second call: should cancel the first timeout and schedule a new one.
    throttleHighlighting(performHighlight, timeoutControl, throttleMs);
    const secondTimeoutId = timeoutControl.current.timeoutId;

    expect(firstTimeoutId).not.toEqual(secondTimeoutId);

    // Advance time by 0ms; only the second scheduled callback should fire.
    await vi.advanceTimersByTimeAsync(0);
    await Promise.resolve();

    expect(performHighlight).toHaveBeenCalledTimes(1);
  });
});

