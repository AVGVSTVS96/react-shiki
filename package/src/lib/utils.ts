import { useRef } from 'react';
import { dequal } from 'dequal';

import type { TimeoutState } from './types';

/**
 * Returns a referentially stable version of `value` that only updates when content changes.
 * Uses reference equality as a fast path and deep comparison to prevent unnecessary updates.
 */
export const useStableValue = <T>(value: T): T => {
  const ref = useRef(value);

  if (value !== ref.current && !dequal(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};

/**
 * Optionally throttles rapid sequential highlighting operations
 *
 * @example
 * const timeoutControl = useRef<TimeoutState>({
 *   nextAllowedTime: 0,
 *   timeoutId: undefined
 * });
 *
 * throttleHighlighting(highlightCode, timeoutControl, 1000);
 */
export const throttleHighlighting = (
  performHighlight: () => Promise<void>,
  timeoutControl: React.RefObject<TimeoutState>,
  throttleMs: number
) => {
  clearTimeout(timeoutControl.current.timeoutId);

  const delay = Math.max(0, timeoutControl.current.nextAllowedTime - Date.now());
  timeoutControl.current.timeoutId = setTimeout(() => {
    performHighlight().catch(console.error);
    timeoutControl.current.nextAllowedTime = Date.now() + throttleMs;
  }, delay);
};
