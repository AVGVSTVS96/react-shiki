import { useRef } from 'react';
import { dequal } from 'dequal';

import type { TimeoutState } from './types';

/**
 * Returns a stable reference that only changes when content changes (deep equality).
 * Prevents unnecessary re-renders when objects are recreated with identical content.
 */
export const useStableOptions = <T>(value: T): T => {
  const ref = useRef(value);

  if (typeof value !== 'object' || value === null) {
    if (value !== ref.current) {
      ref.current = value;
    }
    return value;
  }

  if (value !== ref.current && !dequal(value, ref.current)) {
    ref.current = value;
  }

  return ref.current;
};

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
