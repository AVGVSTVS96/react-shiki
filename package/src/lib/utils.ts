import { useRef } from 'react';
import { dequal } from 'dequal';

import type { TimeoutState } from './types';

/**
 * Returns a deep-stable reference and a version counter that only changes when content changes.
 * Includes optimizations for primitive values and reference equality.
 */
export const useStableOptions = <T>(value: T) => {
    const ref = useRef(value);
    const revision = useRef(0);

    // Fast-path for primitive values
    if (typeof value !== 'object' || value === null) {
        if (value !== ref.current) {
            ref.current = value;
            revision.current += 1;
        }
        return [value, revision.current] as const;
    }

    // Reference equality check before expensive deep comparison
    if (value !== ref.current) {
        if (!dequal(value, ref.current)) {
            ref.current = value;
            revision.current += 1;
        }
    }

    return [ref.current, revision.current] as const;
};


/**
 * Optionally throttles rapid sequential highlighting operations
 * Exported for testing in __tests__/throttleHighlighting.test.ts
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
  const now = Date.now();
  clearTimeout(timeoutControl.current.timeoutId);

  const delay = Math.max(0, timeoutControl.current.nextAllowedTime - now);
  timeoutControl.current.timeoutId = setTimeout(() => {
    performHighlight().catch(console.error);
    timeoutControl.current.nextAllowedTime = now + throttleMs;
  }, delay);
};
