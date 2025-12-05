import { useEffect, useRef, useState } from 'react';
import { dequal } from 'dequal';

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

/**
 * Hybrid throttle+debounce hook for rate-limiting value updates.
 * - If throttle window has passed: updates immediately
 * - Otherwise: debounces to catch final state
 */
export const useThrottledDebounce = <T>(
  value: T,
  throttleMs: number | undefined,
  debounceMs = 50
): T => {
  const [processedValue, setProcessedValue] = useState(value);
  const lastRunTime = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    if (!throttleMs) {
      setProcessedValue(value);
      return;
    }

    const now = Date.now();
    const timeSinceLastRun = now - lastRunTime.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (timeSinceLastRun >= throttleMs) {
      setProcessedValue(value);
      lastRunTime.current = now;
    } else {
      timeoutRef.current = setTimeout(() => {
        setProcessedValue(value);
        lastRunTime.current = Date.now();
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, throttleMs, debounceMs]);

  return processedValue;
};
