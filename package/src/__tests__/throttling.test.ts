import { throttleHighlighting } from '../lib/utils';
import { vi } from 'vitest';

// Test the throttling function directly instead of through the React component
describe('throttleHighlighting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('throttles function calls based on timing', () => {
    // Mock date to have a consistent starting point
    const originalDateNow = Date.now;
    const mockTime = 1000;
    Date.now = vi.fn(() => mockTime);

    // Mock the perform highlight function
    const performHighlight = vi.fn().mockResolvedValue(undefined);

    // Setup timeout control like in the hook
    const timeoutControl = {
      current: {
        timeoutId: undefined,
        nextAllowedTime: 0,
      },
    };

    // First call should schedule immediately since nextAllowedTime is in the past
    throttleHighlighting(performHighlight, timeoutControl, 500);
    expect(timeoutControl.current.timeoutId).toBeDefined();

    // Run the timeout
    vi.runAllTimers();
    expect(performHighlight).toHaveBeenCalledTimes(1);
    expect(timeoutControl.current.nextAllowedTime).toBe(1500); // 1000 + 500

    // Reset the mock
    performHighlight.mockClear();

    // Call again - should be delayed by the throttle duration
    throttleHighlighting(performHighlight, timeoutControl, 500);
    expect(performHighlight).not.toHaveBeenCalled(); // Not called yet

    // Advance halfway through the delay - should still not be called
    vi.advanceTimersByTime(250);
    expect(performHighlight).not.toHaveBeenCalled();

    // Advance the full delay
    vi.advanceTimersByTime(250);
    expect(performHighlight).toHaveBeenCalledTimes(1);

    // Restore original Date.now
    Date.now = originalDateNow;
  });
});
