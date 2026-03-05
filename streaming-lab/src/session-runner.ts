import type { StreamingEvent } from './events';
import { buildScenarioFrames, type ScenarioFrame } from './adapters';

export interface ScenarioPlaybackFrame {
  index: number;
  elapsedMs: number;
  event: StreamingEvent;
  frame: ScenarioFrame;
}

export interface ScenarioPlaybackResult {
  frames: ScenarioPlaybackFrame[];
  totalMs: number;
  cancelled: boolean;
}

export interface ScenarioPlaybackOptions {
  events: StreamingEvent[];
  stepDelayMs?: number;
  speedMultiplier?: number;
  signal?: AbortSignal;
  onFrame?: (
    playbackFrame: ScenarioPlaybackFrame
  ) => Promise<void> | void;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const getDelayForEvent = (
  event: StreamingEvent,
  stepDelayMs: number,
  speedMultiplier: number
): number => {
  if (event.type === 'pause') {
    return Math.max(0, Math.round(event.durationMs / speedMultiplier));
  }

  if (stepDelayMs <= 0) return 0;
  return Math.max(0, Math.round(stepDelayMs / speedMultiplier));
};

export const playScenarioEvents = async ({
  events,
  stepDelayMs = 0,
  speedMultiplier = 1,
  signal,
  onFrame,
}: ScenarioPlaybackOptions): Promise<ScenarioPlaybackResult> => {
  const preparedFrames = buildScenarioFrames(events);
  const playbackFrames: ScenarioPlaybackFrame[] = [];

  const startedAt = performance.now();
  let cancelled = false;

  for (const frame of preparedFrames) {
    if (signal?.aborted) {
      cancelled = true;
      break;
    }

    const elapsedMs = performance.now() - startedAt;
    const playbackFrame: ScenarioPlaybackFrame = {
      index: frame.index,
      elapsedMs,
      event: frame.event,
      frame,
    };

    playbackFrames.push(playbackFrame);
    await onFrame?.(playbackFrame);

    const delay = getDelayForEvent(
      frame.event,
      stepDelayMs,
      speedMultiplier
    );

    if (delay > 0) {
      await wait(delay);
    }
  }

  return {
    frames: playbackFrames,
    totalMs: performance.now() - startedAt,
    cancelled,
  };
};
