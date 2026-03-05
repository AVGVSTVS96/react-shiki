import type { CorpusId } from './corpora';
import { getStreamingCorpus } from './corpora';
import type { StreamingEvent } from './events';
import { chunkTextWithSeed, createSeededRandom } from './events';
import type { MessageCorpusId } from './message-corpuses';
import { getAssistantMessageCorpus } from './message-corpuses';

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
  | 'cancel-resume'
  | 'assistant-multi-block-steady'
  | 'assistant-multi-block-bursty'
  | 'assistant-multi-block-firehose';

export type AssistantMessagePresetId =
  | 'assistant-multi-block-steady'
  | 'assistant-multi-block-bursty'
  | 'assistant-multi-block-firehose';

export type SingleCodePresetId = Exclude<
  ScenarioPresetId,
  AssistantMessagePresetId
>;

export type ScenarioFamily = 'single-block' | 'assistant-message';

export type RestartClass =
  | 'append-only'
  | 'intentional-model-edit'
  | 'consumer-induced';

export type ScenarioCorpusTarget =
  | { type: 'single-code'; corpusId: CorpusId }
  | { type: 'assistant-message'; messageCorpusId: MessageCorpusId };

export interface StreamingScenario {
  id: string;
  presetId: ScenarioPresetId;
  seed: number;
  appendOnly: boolean;
  restartClass: RestartClass;
  family: ScenarioFamily;
  corpusTarget: ScenarioCorpusTarget;
  corpusId?: CorpusId;
  messageCorpusId?: MessageCorpusId;
  events: StreamingEvent[];
}

export interface ScenarioPreset {
  id: ScenarioPresetId;
  label: string;
  description: string;
  appendOnly: boolean;
  restartClass: RestartClass;
  family: ScenarioFamily;
}

type SingleCodeScenarioRequest = {
  presetId: SingleCodePresetId;
  corpusId: CorpusId;
  seed: number;
};

type AssistantMessageScenarioRequest = {
  presetId: AssistantMessagePresetId;
  seed: number;
  messageCorpusId?: MessageCorpusId;
  corpusId?: CorpusId;
  messageRepeatCount?: number;
};

export type CreateStreamingScenarioRequest =
  | SingleCodeScenarioRequest
  | AssistantMessageScenarioRequest;

const INTRO_TEXT =
  'Sure - here is a focused implementation. I will walk through the key bits as we stream it.\n\n';
const OUTRO_TEXT =
  '\n\nIf you want, I can also provide tests and a quick perf pass next.';

const ASSISTANT_DEFAULT_MESSAGE_CORPUS: MessageCorpusId =
  'assistant-mixed-stack-6';

const ASSISTANT_PRESET_IDS = new Set<ScenarioPresetId>([
  'assistant-multi-block-steady',
  'assistant-multi-block-bursty',
  'assistant-multi-block-firehose',
]);

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

const toTextEvents = (
  text: string,
  {
    seed,
    minChunk,
    maxChunk,
    pauseEvery,
    pauseMs,
  }: {
    seed: number;
    minChunk: number;
    maxChunk: number;
    pauseEvery?: number;
    pauseMs?: number;
  }
): StreamingEvent[] => {
  if (!text.trim()) return [];

  const chunks = chunkTextWithSeed(text, { seed, minChunk, maxChunk });
  const events: StreamingEvent[] = [];

  chunks.forEach((chunk, index) => {
    events.push({ type: 'text-delta', value: chunk });

    const chunkNumber = index + 1;
    if (pauseEvery && pauseMs && chunkNumber % pauseEvery === 0) {
      events.push({ type: 'pause', durationMs: pauseMs });
    }
  });

  return events;
};

const withSingleCorpus = (
  base: Omit<
    StreamingScenario,
    'family' | 'corpusTarget' | 'corpusId' | 'messageCorpusId'
  >,
  corpusId: CorpusId
): StreamingScenario => ({
  ...base,
  family: 'single-block',
  corpusId,
  corpusTarget: {
    type: 'single-code',
    corpusId,
  },
});

const withMessageCorpus = (
  base: Omit<
    StreamingScenario,
    'family' | 'corpusTarget' | 'corpusId' | 'messageCorpusId'
  >,
  messageCorpusId: MessageCorpusId
): StreamingScenario => ({
  ...base,
  family: 'assistant-message',
  messageCorpusId,
  corpusTarget: {
    type: 'assistant-message',
    messageCorpusId,
  },
});

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

  return withSingleCorpus(
    {
      id: `openai-steady:${corpusId}:${seed}`,
      presetId: 'openai-steady',
      seed,
      appendOnly: true,
      restartClass: 'append-only',
      events,
    },
    corpusId
  );
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

  return withSingleCorpus(
    {
      id: `anthropic-bursty:${corpusId}:${seed}`,
      presetId: 'anthropic-bursty',
      seed,
      appendOnly: true,
      restartClass: 'append-only',
      events,
    },
    corpusId
  );
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

  return withSingleCorpus(
    {
      id: `firehose:${corpusId}:${seed}`,
      presetId: 'firehose',
      seed,
      appendOnly: true,
      restartClass: 'append-only',
      events,
    },
    corpusId
  );
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

  return withSingleCorpus(
    {
      id: `recall-heavy-append:${corpusId}:${seed}`,
      presetId: 'recall-heavy-append',
      seed,
      appendOnly: true,
      restartClass: 'append-only',
      events,
    },
    corpusId
  );
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

  return withSingleCorpus(
    {
      id: `late-fence-language:${corpusId}:${seed}`,
      presetId: 'late-fence-language',
      seed,
      appendOnly: true,
      restartClass: 'intentional-model-edit',
      events,
    },
    corpusId
  );
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

  return withSingleCorpus(
    {
      id: `replace-tail:${corpusId}:${seed}`,
      presetId: 'replace-tail',
      seed,
      appendOnly: false,
      restartClass: 'intentional-model-edit',
      events,
    },
    corpusId
  );
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

  return withSingleCorpus(
    {
      id: `prose-code-prose:${corpusId}:${seed}`,
      presetId: 'prose-code-prose',
      seed,
      appendOnly: true,
      restartClass: 'append-only',
      events,
    },
    corpusId
  );
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

  return withSingleCorpus(
    {
      id: `two-code-blocks:${corpusId}:${seed}`,
      presetId: 'two-code-blocks',
      seed,
      appendOnly: true,
      restartClass: 'append-only',
      events,
    },
    corpusId
  );
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

  return withSingleCorpus(
    {
      id: `cancel-resume:${corpusId}:${seed}`,
      presetId: 'cancel-resume',
      seed,
      appendOnly: true,
      restartClass: 'append-only',
      events,
    },
    corpusId
  );
};

const createAssistantMessageScenario = ({
  presetId,
  seed,
  messageCorpusId,
  messageRepeatCount,
}: {
  presetId: AssistantMessagePresetId;
  seed: number;
  messageCorpusId?: MessageCorpusId;
  messageRepeatCount?: number;
}): StreamingScenario => {
  const corpusId = messageCorpusId ?? ASSISTANT_DEFAULT_MESSAGE_CORPUS;
  const corpus = getAssistantMessageCorpus(corpusId);
  const repeatCount = Math.max(1, Math.min(50, messageRepeatCount ?? 1));

  const profile =
    presetId === 'assistant-multi-block-firehose'
      ? {
          prose: { minChunk: 3, maxChunk: 9 },
          code: { minChunk: 1, maxChunk: 3, pingEvery: 55 },
        }
      : presetId === 'assistant-multi-block-bursty'
        ? {
            prose: { minChunk: 11, maxChunk: 28, pauseEvery: 3, pauseMs: 12 },
            code: {
              minChunk: 6,
              maxChunk: 18,
              pauseEvery: 5,
              pauseMs: 20,
              pingEvery: 4,
            },
          }
        : {
            prose: { minChunk: 8, maxChunk: 20, pauseEvery: 5, pauseMs: 14 },
            code: {
              minChunk: 3,
              maxChunk: 10,
              pauseEvery: 9,
              pauseMs: 24,
              pingEvery: 12,
            },
          };

  const events: StreamingEvent[] = [{ type: 'message-start' }];

  events.push(
    ...toTextEvents(corpus.openingProse + '\n\n', {
      seed: seed + 1,
      ...profile.prose,
    })
  );

  for (let cycle = 0; cycle < repeatCount; cycle += 1) {
    const cycleOffset = cycle * corpus.blocks.length;
    if (cycle > 0) {
      events.push(
        ...toTextEvents(
          `\n\n---\n\nContinuing with batch ${cycle + 1}.\n\n`,
          {
            seed: seed + 700 + cycle,
            ...profile.prose,
          }
        )
      );
    }

    corpus.blocks.forEach((block, index) => {
      const globalIndex = cycleOffset + index;
      if (globalIndex > 0) {
        const bridge = corpus.interBlockProse?.[index - 1];
        const fallbackBridge = `Next block (${globalIndex + 1}/${corpus.blocks.length * repeatCount}):`;
        events.push(
          ...toTextEvents(`\n\n${bridge ?? fallbackBridge}\n\n`, {
            seed: seed + 10 + globalIndex,
            ...profile.prose,
          })
        );
      }

      events.push({ type: 'fence-open', language: block.language });
      events.push(
        ...toCodeEvents(block.source, {
          seed: seed + 100 + globalIndex * 13,
          ...profile.code,
        })
      );
      events.push({ type: 'fence-close' });
    });
  }

  events.push(
    ...toTextEvents(`\n\n${corpus.closingProse}`, {
      seed: seed + 501,
      ...profile.prose,
    })
  );
  events.push({ type: 'message-end' });

  return withMessageCorpus(
    {
      id: `${presetId}:${corpusId}:x${repeatCount}:${seed}`,
      presetId,
      seed,
      appendOnly: true,
      restartClass: 'append-only',
      events,
    },
    corpusId
  );
};

const createSingleCodeScenario = ({
  presetId,
  corpusId,
  seed,
}: SingleCodeScenarioRequest): StreamingScenario => {
  switch (presetId) {
    case 'openai-steady':
      return createOpenAiSteadyScenario(corpusId, seed);
    case 'anthropic-bursty':
      return createAnthropicBurstyScenario(corpusId, seed);
    case 'firehose':
      return createFirehoseScenario(corpusId, seed);
    case 'recall-heavy-append':
      return createRecallHeavyAppendScenario(corpusId, seed);
    case 'late-fence-language':
      return createLateFenceLanguageScenario(corpusId, seed);
    case 'delayed-fence-language':
      return createDelayedFenceLanguageScenario(corpusId, seed);
    case 'replace-tail':
      return createReplaceTailScenario(corpusId, seed);
    case 'prose-code-prose':
      return createProseCodeProseScenario(corpusId, seed);
    case 'two-code-blocks':
      return createTwoCodeBlocksScenario(corpusId, seed);
    case 'cancel-resume':
      return createCancelResumeScenario(corpusId, seed);
  }
};

export const STREAMING_SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'openai-steady',
    label: 'OpenAI steady',
    description: 'Mostly sequential deltas with light pauses.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'single-block',
  },
  {
    id: 'anthropic-bursty',
    label: 'Anthropic bursty',
    description: 'Chunk bursts with regular pings and pauses.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'single-block',
  },
  {
    id: 'firehose',
    label: 'Firehose',
    description: 'Very small chunks and minimal waiting.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'single-block',
  },
  {
    id: 'recall-heavy-append',
    label: 'Recall-heavy append',
    description:
      'Small chunks and punctuation churn to amplify recall behavior.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'single-block',
  },
  {
    id: 'late-fence-language',
    label: 'Late fence language',
    description: 'Fence opens before language token resolves.',
    appendOnly: true,
    restartClass: 'intentional-model-edit',
    family: 'single-block',
  },
  {
    id: 'delayed-fence-language',
    label: 'Delayed fence language',
    description: 'Alias scenario for late fence language arrival.',
    appendOnly: true,
    restartClass: 'intentional-model-edit',
    family: 'single-block',
  },
  {
    id: 'replace-tail',
    label: 'Replace tail',
    description: 'Tail replacement simulating model correction.',
    appendOnly: false,
    restartClass: 'intentional-model-edit',
    family: 'single-block',
  },
  {
    id: 'prose-code-prose',
    label: 'Prose-code-prose',
    description: 'Common chat shape with prose around code.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'single-block',
  },
  {
    id: 'two-code-blocks',
    label: 'Two code blocks',
    description: 'Assistant message with multiple fenced blocks.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'single-block',
  },
  {
    id: 'cancel-resume',
    label: 'Cancel/resume',
    description: 'Stall and resume in the middle of code streaming.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'single-block',
  },
  {
    id: 'assistant-multi-block-steady',
    label: 'Assistant multi-block steady',
    description:
      'Single assistant response with 4+ mixed-language blocks and steady pacing.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'assistant-message',
  },
  {
    id: 'assistant-multi-block-bursty',
    label: 'Assistant multi-block bursty',
    description:
      'Single assistant response with bursty chunk delivery across many blocks.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'assistant-message',
  },
  {
    id: 'assistant-multi-block-firehose',
    label: 'Assistant multi-block firehose',
    description:
      'Single assistant response with tiny chunks and minimal waits across blocks.',
    appendOnly: true,
    restartClass: 'append-only',
    family: 'assistant-message',
  },
];

export const createStreamingScenario = (
  request: CreateStreamingScenarioRequest
): StreamingScenario => {
  const isAssistantRequest = (
    value: CreateStreamingScenarioRequest
  ): value is AssistantMessageScenarioRequest =>
    ASSISTANT_PRESET_IDS.has(value.presetId);

  if (isAssistantRequest(request)) {
    return createAssistantMessageScenario({
      presetId: request.presetId,
      seed: request.seed,
      messageCorpusId: request.messageCorpusId,
      messageRepeatCount: request.messageRepeatCount,
    });
  }

  return createSingleCodeScenario({
    presetId: request.presetId,
    corpusId: request.corpusId,
    seed: request.seed,
  });
};
