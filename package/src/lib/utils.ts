import { useRef } from 'react';
import { dequal } from 'dequal';

import type { TimeoutState } from './types';

export const useStableOptions = <T>(value: T) => {
  const ref = useRef(value);
  const revision = useRef(0);

  if (typeof value !== 'object' || value === null) {
    if (value !== ref.current) {
      ref.current = value;
      revision.current += 1;
    }
    return [value, revision.current] as const;
  }

  if (value !== ref.current) {
    if (!dequal(value, ref.current)) {
      ref.current = value;
      revision.current += 1;
    }
  }

  return [ref.current, revision.current] as const;
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
