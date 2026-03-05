import { describe, expect, test } from 'vitest';

import {
  buildMarkdownStates,
  buildTranscriptPlaybackStates,
  buildCodeChunks,
  buildScenarioFrames,
  buildControlledCodeStates,
  createAsyncCodeIterableFromScenario,
  createReadableCodeStreamFromScenario,
  createStreamingScenario,
  extractFencedCodeBlocks,
  extractFinalCode,
  extractFinalTranscript,
  getAssistantMessageCorpus,
} from '../src/dev/streaming-lab';

const readStreamText = async (stream: ReadableStream<string>) => {
  const reader = stream.getReader();
  let output = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    output += value;
  }
  return output;
};

const readAsyncIterableText = async (iterable: AsyncIterable<string>) => {
  let output = '';
  for await (const chunk of iterable) {
    output += chunk;
  }
  return output;
};

describe('streaming lab scenarios', () => {
  test('same seed yields deterministic event sequence', () => {
    const a = createStreamingScenario({
      presetId: 'openai-steady',
      corpusId: 'tsx-chat-ui',
      seed: 42,
    });

    const b = createStreamingScenario({
      presetId: 'openai-steady',
      corpusId: 'tsx-chat-ui',
      seed: 42,
    });

    expect(a.events).toEqual(b.events);
  });

  test('delayed-fence-language alias maps to intentional model edit behavior', () => {
    const late = createStreamingScenario({
      presetId: 'late-fence-language',
      corpusId: 'tsx-chat-ui',
      seed: 12,
    });

    const delayed = createStreamingScenario({
      presetId: 'delayed-fence-language',
      corpusId: 'tsx-chat-ui',
      seed: 12,
    });

    expect(delayed.restartClass).toBe('intentional-model-edit');
    expect(delayed.events).toEqual(late.events);
  });

  test('replace-tail keeps prefix and converges to expected final code', () => {
    const scenario = createStreamingScenario({
      presetId: 'replace-tail',
      corpusId: 'python-snippet',
      seed: 77,
    });

    const frames = buildScenarioFrames(scenario.events);
    const replaceIndex = frames.findIndex(
      (frame) =>
        frame.event.type === 'replace-tail' &&
        frame.event.target === 'code'
    );

    expect(replaceIndex).toBeGreaterThan(0);

    const before = frames[replaceIndex - 1]?.snapshot.codeBlocks[0] ?? '';
    const after = frames[replaceIndex]?.snapshot.codeBlocks[0] ?? '';
    const finalCode = extractFinalCode(scenario.events);

    expect(after).not.toBe(before);
    expect(finalCode).toBe(
      frames[frames.length - 1]?.snapshot.codeBlocks[0] ?? ''
    );

    const prefixLength = (() => {
      const max = Math.min(before.length, after.length);
      let cursor = 0;
      while (cursor < max && before[cursor] === after[cursor]) {
        cursor += 1;
      }
      return cursor;
    })();

    expect(prefixLength).toBeGreaterThan(0);
  });

  test('pause and ping events do not mutate transcript content', () => {
    const scenario = createStreamingScenario({
      presetId: 'cancel-resume',
      corpusId: 'json-tool-payload',
      seed: 12,
    });

    const frames = buildScenarioFrames(scenario.events);

    for (let index = 1; index < frames.length; index += 1) {
      const current = frames[index]!;
      const previous = frames[index - 1]!;
      if (
        current.event.type === 'pause' ||
        current.event.type === 'ping'
      ) {
        expect(current.snapshot.transcript).toBe(
          previous.snapshot.transcript
        );
      }
    }
  });

  test('code, stream, and chunks adapters converge on append-only scenarios', async () => {
    const scenario = createStreamingScenario({
      presetId: 'anthropic-bursty',
      corpusId: 'tsx-chat-ui',
      seed: 9,
    });

    const codeStates = buildControlledCodeStates(scenario.events);
    const expectedCode = codeStates[codeStates.length - 1]?.code ?? '';

    const chunkData = buildCodeChunks(scenario.events);
    const chunkText = chunkData.chunks.join('');
    const streamText = await readStreamText(
      createReadableCodeStreamFromScenario(scenario.events)
    );
    const iterableText = await readAsyncIterableText(
      createAsyncCodeIterableFromScenario(scenario.events)
    );

    expect(chunkData.appendOnly).toBe(true);
    expect(chunkText).toBe(expectedCode);
    expect(streamText).toBe(expectedCode);
    expect(iterableText).toBe(expectedCode);
  });

  test('assistant multi-block scenarios are deterministic and message-corpus driven', () => {
    const steady = createStreamingScenario({
      presetId: 'assistant-multi-block-steady',
      messageCorpusId: 'assistant-mixed-stack-6',
      seed: 91,
    });
    const repeat = createStreamingScenario({
      presetId: 'assistant-multi-block-steady',
      messageCorpusId: 'assistant-mixed-stack-6',
      seed: 91,
    });
    const corpus = getAssistantMessageCorpus('assistant-mixed-stack-6');
    const transcript = extractFinalTranscript(steady.events);
    const blocks = extractFencedCodeBlocks(transcript);

    expect(steady.events).toEqual(repeat.events);
    expect(steady.corpusTarget.type).toBe('assistant-message');
    expect(steady.messageCorpusId).toBe('assistant-mixed-stack-6');
    expect(steady.corpusId).toBeUndefined();
    expect(blocks).toHaveLength(corpus.blocks.length);
    expect(blocks.map((block) => block.language)).toEqual(
      corpus.blocks.map((block) => block.language)
    );
  });

  test('assistant playback path supports streaming and final-only controls', () => {
    const scenario = createStreamingScenario({
      presetId: 'assistant-multi-block-bursty',
      seed: 13,
    });

    const streaming = buildTranscriptPlaybackStates(scenario.events, {
      mode: 'streaming',
    });
    const finalOnly = buildTranscriptPlaybackStates(scenario.events, {
      mode: 'final-only',
    });

    expect(streaming.length).toBeGreaterThan(2);
    expect(finalOnly).toHaveLength(2);
    expect(finalOnly[1]).toBe(extractFinalTranscript(scenario.events));
    expect(buildMarkdownStates(scenario.events)).toEqual(streaming);
  });
});
