import { useEffect, useMemo, useRef, useState } from 'react';
import { dequal } from 'dequal';

import type { RefObject } from 'react';

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

export type UseDeferredRenderOptions = {
  /**
   * If true, render immediately without waiting for intersection
   * @default false
   */
  immediate?: boolean;
  /**
   * Debounce delay in ms before checking if still in view
   * @default 300
   */
  debounceDelay?: number;
  /**
   * Root margin for Intersection Observer
   * @default '300px'
   */
  rootMargin?: string;
  /**
   * Timeout for requestIdleCallback in ms
   * @default 500
   */
  idleTimeout?: number;
};

/**
 * Defers rendering until element enters viewport.
 * Uses Intersection Observer + debounce + requestIdleCallback.
 */
export const useDeferredRender = <T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseDeferredRenderOptions = {}
): boolean => {
  const {
    immediate = false,
    debounceDelay = 300,
    rootMargin = '300px',
    idleTimeout = 500,
  } = options;

  const [shouldRender, setShouldRender] = useState(immediate);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleCallbackRef = useRef<number | null>(null);

  const requestIdleCallbackWrapper = useMemo(
    () =>
      typeof window !== 'undefined' && window.requestIdleCallback
        ? (cb: IdleRequestCallback, opts?: IdleRequestOptions) =>
            window.requestIdleCallback(cb, opts)
        : (cb: IdleRequestCallback): number => {
            const start = Date.now();
            return window.setTimeout(() => {
              cb({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
              });
            }, 1);
          },
    []
  );

  const cancelIdleCallbackWrapper = useMemo(
    () =>
      typeof window !== 'undefined' && window.cancelIdleCallback
        ? (id: number) => window.cancelIdleCallback(id)
        : (id: number) => clearTimeout(id),
    []
  );

  useEffect(() => {
    if (immediate || shouldRender) return;

    const container = containerRef.current;
    if (!container) return;

    const clearPending = () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
        renderTimeoutRef.current = null;
      }
      if (idleCallbackRef.current) {
        cancelIdleCallbackWrapper(idleCallbackRef.current);
        idleCallbackRef.current = null;
      }
    };

    const scheduleRender = (obs: IntersectionObserver) => {
      idleCallbackRef.current = requestIdleCallbackWrapper(
        (deadline) => {
          if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
            setShouldRender(true);
            obs.disconnect();
          } else {
            idleCallbackRef.current = requestIdleCallbackWrapper(
              () => {
                setShouldRender(true);
                obs.disconnect();
              },
              { timeout: idleTimeout / 2 }
            );
          }
        },
        { timeout: idleTimeout }
      );
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            clearPending();
            renderTimeoutRef.current = setTimeout(() => {
              const records = observer.takeRecords();
              const stillInView =
                records.length === 0 ||
                (records.at(-1)?.isIntersecting ?? false);
              if (stillInView) scheduleRender(observer);
            }, debounceDelay);
          } else {
            clearPending();
          }
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(container);

    return () => {
      clearPending();
      observer.disconnect();
    };
  }, [
    immediate,
    shouldRender,
    containerRef,
    debounceDelay,
    rootMargin,
    idleTimeout,
    cancelIdleCallbackWrapper,
    requestIdleCallbackWrapper,
  ]);

  return shouldRender;
};
