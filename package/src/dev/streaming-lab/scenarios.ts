import type { CorpusId } from './corpora';
import { getStreamingCorpus } from './corpora';
import type { StreamingEvent } from './events';
import { chunkTextWithSeed, createSeededRandom } from './events';

// Internal deterministic scenario catalog for streaming-lab coverage lanes
// (hook perf, chat-tree integration, and playground transcript playback).

export type ScenarioPresetId =
  | 'openai-steady'
  | 'anthropic-bursty'
  | 'firehose'
  | 'recall-heavy-append'
  | 'late-fence-language'
  | 'delayed-fence-language'
  | 'replace-tail'
  | 'prose-code-prose'
  | 'two-code-blocks'
  | 'cancel-resume';

export type RestartClass =
  | 'append-only'
  | 'intentional-model-edit'
  | 'consumer-induced';

export interface StreamingScenario {
  id: string;
  presetId: ScenarioPresetId;
  corpusId: CorpusId;
  seed: number;
  appendOnly: boolean;
  restartClass: RestartClass;
  events: StreamingEvent[];
}

export interface ScenarioPreset {
  id: ScenarioPresetId;
  label: string;
  description: string;
  appendOnly: boolean;
  restartClass: RestartClass;
}

const INTRO_TEXT =
  'Sure - here is a focused implementation. I will walk through the key bits as we stream it.\n\n';
const OUTRO_TEXT =
  '\n\nIf you want, I can also provide tests and a quick perf pass next.';

const toCodeEvents = (
  code: string,
  {
    seed,
    minChunk,
    maxChunk,
    pauseEvery,
    pauseMs,
    pingEvery,
  }: {
    seed: number;
    minChunk: number;
    maxChunk: number;
    pauseEvery?: number;
    pauseMs?: number;
    pingEvery?: number;
  }
): StreamingEvent[] => {
  const chunks = chunkTextWithSeed(code, { seed, minChunk, maxChunk });
  const events: StreamingEvent[] = [];

  chunks.forEach((chunk, index) => {
    events.push({ type: 'code-delta', value: chunk });

    const chunkNumber = index + 1;
    if (pingEvery && chunkNumber % pingEvery === 0) {
      events.push({ type: 'ping', value: `chunk-${chunkNumber}` });
    }
    if (pauseEvery && pauseMs && chunkNumber % pauseEvery === 0) {
      events.push({ type: 'pause', durationMs: pauseMs });
    }
  });

  return events;
};

const createOpenAiSteadyScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);
  const events: StreamingEvent[] = [
    { type: 'message-start' },
    { type: 'text-delta', value: INTRO_TEXT },
    { type: 'fence-open', language: corpus.language },
    ...toCodeEvents(corpus.source, {
      seed,
      minChunk: 2,
      maxChunk: 7,
      pauseEvery: 10,
      pauseMs: 35,
      pingEvery: 15,
    }),
    { type: 'fence-close' },
    { type: 'text-delta', value: OUTRO_TEXT },
    { type: 'message-end' },
  ];

  return {
    id: `openai-steady:${corpusId}:${seed}`,
    presetId: 'openai-steady',
    corpusId,
    seed,
    appendOnly: true,
    restartClass: 'append-only',
    events,
  };
};

const createAnthropicBurstyScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);
  const events: StreamingEvent[] = [
    { type: 'message-start' },
    {
      type: 'text-delta',
      value: 'Got it - streaming the patch now.\n\n',
    },
    { type: 'fence-open', language: corpus.language },
    ...toCodeEvents(corpus.source, {
      seed,
      minChunk: 5,
      maxChunk: 18,
      pauseEvery: 5,
      pauseMs: 22,
      pingEvery: 4,
    }),
    { type: 'fence-close' },
    {
      type: 'text-delta',
      value: '\n\nI can also explain trade-offs if helpful.',
    },
    { type: 'message-end' },
  ];

  return {
    id: `anthropic-bursty:${corpusId}:${seed}`,
    presetId: 'anthropic-bursty',
    corpusId,
    seed,
    appendOnly: true,
    restartClass: 'append-only',
    events,
  };
};

const createFirehoseScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);
  const events: StreamingEvent[] = [
    { type: 'message-start' },
    { type: 'text-delta', value: 'Fast path stream:\n\n' },
    { type: 'fence-open', language: corpus.language },
    ...toCodeEvents(corpus.source, {
      seed,
      minChunk: 1,
      maxChunk: 3,
      pingEvery: 50,
    }),
    { type: 'fence-close' },
    { type: 'message-end' },
  ];

  return {
    id: `firehose:${corpusId}:${seed}`,
    presetId: 'firehose',
    corpusId,
    seed,
    appendOnly: true,
    restartClass: 'append-only',
    events,
  };
};

const createRecallHeavyAppendScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);
  const events: StreamingEvent[] = [
    { type: 'message-start' },
    {
      type: 'text-delta',
      value: 'Streaming with tiny chunks to amplify recall pressure:\n\n',
    },
    { type: 'fence-open', language: corpus.language },
    ...toCodeEvents(corpus.source, {
      seed,
      minChunk: 1,
      maxChunk: 2,
      pauseEvery: 17,
      pauseMs: 14,
      pingEvery: 19,
    }),
    { type: 'fence-close' },
    { type: 'message-end' },
  ];

  return {
    id: `recall-heavy-append:${corpusId}:${seed}`,
    presetId: 'recall-heavy-append',
    corpusId,
    seed,
    appendOnly: true,
    restartClass: 'append-only',
    events,
  };
};

const createLateFenceLanguageScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);
  const events: StreamingEvent[] = [
    { type: 'message-start' },
    {
      type: 'text-delta',
      value: 'Language arrives late in this stream shape:\n\n',
    },
    { type: 'fence-open' },
    {
      type: 'replace-tail',
      target: 'text',
      deleteCount: 1,
      value: `${corpus.language}\n`,
    },
    ...toCodeEvents(corpus.source, {
      seed,
      minChunk: 2,
      maxChunk: 10,
      pauseEvery: 8,
      pauseMs: 28,
    }),
    { type: 'fence-close' },
    { type: 'message-end' },
  ];

  return {
    id: `late-fence-language:${corpusId}:${seed}`,
    presetId: 'late-fence-language',
    corpusId,
    seed,
    appendOnly: true,
    restartClass: 'intentional-model-edit',
    events,
  };
};

const createDelayedFenceLanguageScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const scenario = createLateFenceLanguageScenario(corpusId, seed);
  return {
    ...scenario,
    id: `delayed-fence-language:${corpusId}:${seed}`,
    presetId: 'delayed-fence-language',
  };
};

const createReplaceTailScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);

  const editStart = Math.max(12, Math.floor(corpus.source.length * 0.7));
  const wrongLength = Math.max(
    8,
    Math.min(24, corpus.source.length - editStart)
  );

  const prefix = corpus.source.slice(0, editStart);
  const wrongTail = corpus.source.slice(
    editStart,
    editStart + wrongLength
  );
  const suffix = corpus.source.slice(editStart + wrongLength);

  const correctedTail =
    wrongTail.length > 0
      ? wrongTail.charAt(0).toUpperCase() +
        wrongTail.slice(1).replace(/[a-z]/g, 'x')
      : '';

  const prefixEvents = toCodeEvents(prefix, {
    seed,
    minChunk: 3,
    maxChunk: 9,
    pauseEvery: 9,
    pauseMs: 30,
  });

  const wrongEvents = toCodeEvents(wrongTail, {
    seed: seed + 1,
    minChunk: 2,
    maxChunk: 6,
  });

  const suffixEvents = toCodeEvents(suffix, {
    seed: seed + 2,
    minChunk: 2,
    maxChunk: 8,
  });

  const events: StreamingEvent[] = [
    { type: 'message-start' },
    {
      type: 'text-delta',
      value:
        'Streaming with a tail correction to mimic model self-edit:\n\n',
    },
    { type: 'fence-open', language: corpus.language },
    ...prefixEvents,
    ...wrongEvents,
    {
      type: 'replace-tail',
      target: 'code',
      deleteCount: wrongTail.length,
      value: correctedTail,
    },
    ...suffixEvents,
    { type: 'fence-close' },
    { type: 'message-end' },
  ];

  return {
    id: `replace-tail:${corpusId}:${seed}`,
    presetId: 'replace-tail',
    corpusId,
    seed,
    appendOnly: false,
    restartClass: 'intentional-model-edit',
    events,
  };
};

const createProseCodeProseScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);
  const events: StreamingEvent[] = [
    { type: 'message-start' },
    {
      type: 'text-delta',
      value:
        'Here is the implementation. I am including only the core part below.\n\n',
    },
    { type: 'fence-open', language: corpus.language },
    ...toCodeEvents(corpus.source, {
      seed,
      minChunk: 3,
      maxChunk: 8,
      pauseEvery: 11,
      pauseMs: 40,
    }),
    { type: 'fence-close' },
    {
      type: 'text-delta',
      value:
        '\n\nThis should be enough to wire in the behavior. Let me know if you want tests too.',
    },
    { type: 'message-end' },
  ];

  return {
    id: `prose-code-prose:${corpusId}:${seed}`,
    presetId: 'prose-code-prose',
    corpusId,
    seed,
    appendOnly: true,
    restartClass: 'append-only',
    events,
  };
};

const createTwoCodeBlocksScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);
  const secondary = getStreamingCorpus('json-tool-payload');

  const splitIndex = Math.max(10, Math.floor(corpus.source.length * 0.5));
  const firstBlock = corpus.source.slice(0, splitIndex);
  const secondBlock = secondary.source;

  const events: StreamingEvent[] = [
    { type: 'message-start' },
    {
      type: 'text-delta',
      value:
        'First block is the implementation; second block is payload output.\n\n',
    },
    { type: 'fence-open', language: corpus.language },
    ...toCodeEvents(firstBlock, {
      seed,
      minChunk: 2,
      maxChunk: 8,
      pauseEvery: 7,
      pauseMs: 26,
    }),
    { type: 'fence-close' },
    {
      type: 'text-delta',
      value: '\n\nExample payload:\n\n',
    },
    { type: 'fence-open', language: secondary.language },
    ...toCodeEvents(secondBlock, {
      seed: seed + 3,
      minChunk: 4,
      maxChunk: 12,
      pingEvery: 6,
    }),
    { type: 'fence-close' },
    { type: 'message-end' },
  ];

  return {
    id: `two-code-blocks:${corpusId}:${seed}`,
    presetId: 'two-code-blocks',
    corpusId,
    seed,
    appendOnly: true,
    restartClass: 'append-only',
    events,
  };
};

const createCancelResumeScenario = (
  corpusId: CorpusId,
  seed: number
): StreamingScenario => {
  const corpus = getStreamingCorpus(corpusId);
  const random = createSeededRandom(seed);
  const splitPoint = Math.max(8, Math.floor(corpus.source.length * 0.45));
  const head = corpus.source.slice(0, splitPoint);
  const tail = corpus.source.slice(splitPoint);

  const jitteredPause = 80 + Math.floor(random() * 40);

  const events: StreamingEvent[] = [
    { type: 'message-start' },
    {
      type: 'text-delta',
      value: 'Streaming with cancel/resume-like gap:\n\n',
    },
    { type: 'fence-open', language: corpus.language },
    ...toCodeEvents(head, {
      seed,
      minChunk: 2,
      maxChunk: 7,
      pauseEvery: 9,
      pauseMs: 20,
    }),
    { type: 'ping', value: 'transport-stall' },
    { type: 'pause', durationMs: jitteredPause },
    { type: 'ping', value: 'transport-resume' },
    ...toCodeEvents(tail, {
      seed: seed + 1,
      minChunk: 2,
      maxChunk: 9,
      pauseEvery: 11,
      pauseMs: 18,
    }),
    { type: 'fence-close' },
    { type: 'message-end' },
  ];

  return {
    id: `cancel-resume:${corpusId}:${seed}`,
    presetId: 'cancel-resume',
    corpusId,
    seed,
    appendOnly: true,
    restartClass: 'append-only',
    events,
  };
};

const SCENARIO_BUILDERS: Record<
  ScenarioPresetId,
  (corpusId: CorpusId, seed: number) => StreamingScenario
> = {
  'openai-steady': createOpenAiSteadyScenario,
  'anthropic-bursty': createAnthropicBurstyScenario,
  firehose: createFirehoseScenario,
  'recall-heavy-append': createRecallHeavyAppendScenario,
  'late-fence-language': createLateFenceLanguageScenario,
  'delayed-fence-language': createDelayedFenceLanguageScenario,
  'replace-tail': createReplaceTailScenario,
  'prose-code-prose': createProseCodeProseScenario,
  'two-code-blocks': createTwoCodeBlocksScenario,
  'cancel-resume': createCancelResumeScenario,
};

export const STREAMING_SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'openai-steady',
    label: 'OpenAI steady',
    description: 'Mostly sequential deltas with light pauses.',
    appendOnly: true,
    restartClass: 'append-only',
  },
  {
    id: 'anthropic-bursty',
    label: 'Anthropic bursty',
    description: 'Chunk bursts with regular pings and pauses.',
    appendOnly: true,
    restartClass: 'append-only',
  },
  {
    id: 'firehose',
    label: 'Firehose',
    description: 'Very small chunks and minimal waiting.',
    appendOnly: true,
    restartClass: 'append-only',
  },
  {
    id: 'recall-heavy-append',
    label: 'Recall-heavy append',
    description:
      'Small chunks and punctuation churn to amplify recall behavior.',
    appendOnly: true,
    restartClass: 'append-only',
  },
  {
    id: 'late-fence-language',
    label: 'Late fence language',
    description: 'Fence opens before language token resolves.',
    appendOnly: true,
    restartClass: 'intentional-model-edit',
  },
  {
    id: 'delayed-fence-language',
    label: 'Delayed fence language',
    description: 'Alias scenario for late fence language arrival.',
    appendOnly: true,
    restartClass: 'intentional-model-edit',
  },
  {
    id: 'replace-tail',
    label: 'Replace tail',
    description: 'Tail replacement simulating model correction.',
    appendOnly: false,
    restartClass: 'intentional-model-edit',
  },
  {
    id: 'prose-code-prose',
    label: 'Prose-code-prose',
    description: 'Common chat shape with prose around code.',
    appendOnly: true,
    restartClass: 'append-only',
  },
  {
    id: 'two-code-blocks',
    label: 'Two code blocks',
    description: 'Assistant message with multiple fenced blocks.',
    appendOnly: true,
    restartClass: 'append-only',
  },
  {
    id: 'cancel-resume',
    label: 'Cancel/resume',
    description: 'Stall and resume in the middle of code streaming.',
    appendOnly: true,
    restartClass: 'append-only',
  },
];

export const createStreamingScenario = ({
  presetId,
  corpusId,
  seed,
}: {
  presetId: ScenarioPresetId;
  corpusId: CorpusId;
  seed: number;
}): StreamingScenario => SCENARIO_BUILDERS[presetId](corpusId, seed);
