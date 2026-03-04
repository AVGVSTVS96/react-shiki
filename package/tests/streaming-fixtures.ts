import type { Highlighter } from 'shiki';

export type StreamMode = 'sequential' | 'firehose';

export interface StreamScenario {
  name: string;
  mode: StreamMode;
  tokenCount: number;
}

export interface HighlightStats {
  hastCalls: number;
  htmlCalls: number;
  hastChars: number;
  htmlChars: number;
  hastDurationsMs: number[];
  htmlDurationsMs: number[];
}

export interface SessionSummary {
  scenario: string;
  variant: string;
  totalCalls: number;
  totalCharsProcessed: number;
  workAmplification: number;
  totalTimeMs: number;
  avgPerTokenMs: number;
  p95PerTokenMs: number;
}

export const STREAMING_CODE_SAMPLE = `
import React, { useMemo, useState } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
};

type StreamEvent =
  | { type: 'token'; value: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

const buildPrompt = (messages: Message[]): string =>
  messages.map((m) => \`\${m.role}: \${m.content}\`).join('\\n');

export function ChatComposer({
  initialMessages,
  onSubmit,
}: {
  initialMessages: Message[];
  onSubmit: (prompt: string) => Promise<AsyncIterable<StreamEvent>>;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);

  const prompt = useMemo(() => buildPrompt(messages), [messages]);

  const appendAssistantToken = (token: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        const next = { ...last, content: last.content + token };
        return [...prev.slice(0, -1), next];
      }
      return [
        ...prev,
        {
          id: String(Date.now()),
          role: 'assistant',
          content: token,
          createdAt: Date.now(),
        },
      ];
    });
  };

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        role: 'user',
        content: input,
        createdAt: Date.now(),
      },
    ]);
    setInput('');

    const stream = await onSubmit(prompt + '\\nuser: ' + input);
    for await (const event of stream) {
      if (event.type === 'token') appendAssistantToken(event.value);
      if (event.type === 'error') {
        appendAssistantToken('\\n[error] ' + event.message);
        break;
      }
      if (event.type === 'done') break;
    }
    setStreaming(false);
  };

  return (
    <div className="chat">
      <button disabled={streaming} onClick={handleSend}>
        {streaming ? 'Streaming...' : 'Send'}
      </button>
      <pre>{JSON.stringify(messages, null, 2)}</pre>
    </div>
  );
}
`.trim();

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[index];
};

export const createTokenChunks = (
  source: string,
  tokenCount: number,
  seed = 1337
): string[] => {
  if (source.length === 0) return [''];
  if (tokenCount <= 1) return [source];

  const safeTokenCount = Math.min(tokenCount, source.length);
  let cursor = 0;
  let state = seed;
  const chunks: string[] = [];

  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  for (let i = 0; i < safeTokenCount; i += 1) {
    const remainingTokens = safeTokenCount - i;
    const remainingChars = source.length - cursor;
    const minSize = 1;
    const maxSize = remainingChars - (remainingTokens - 1);
    const size =
      remainingTokens === 1
        ? remainingChars
        : minSize + Math.floor(rand() * maxSize);
    const next = source.slice(cursor, cursor + size);
    chunks.push(next);
    cursor += size;
  }

  return chunks;
};

export const buildProgressiveStates = (chunks: string[]): string[] => {
  const states: string[] = [];
  let current = '';
  for (const chunk of chunks) {
    current += chunk;
    states.push(current);
  }
  return states;
};

export const createProgressiveStates = (
  source: string,
  tokenCount: number,
  seed = 1337
): string[] =>
  buildProgressiveStates(createTokenChunks(source, tokenCount, seed));

export const runSequential = async (
  states: string[],
  worker: (state: string, index: number) => Promise<void> | void
) => {
  for (let i = 0; i < states.length; i += 1) {
    await worker(states[i], i);
  }
};

export const runFirehose = async (
  states: string[],
  worker: (state: string, index: number) => Promise<void> | void,
  batchSize = 25
) => {
  for (let i = 0; i < states.length; i += batchSize) {
    const batch = states.slice(i, i + batchSize);
    await Promise.all(
      batch.map((state, offset) => worker(state, i + offset))
    );
  }
};

export const createInstrumentedHighlighter = (
  highlighter: Highlighter
): {
  highlighter: Highlighter;
  stats: HighlightStats;
  reset: () => void;
  restore: () => void;
} => {
  const stats: HighlightStats = {
    hastCalls: 0,
    htmlCalls: 0,
    hastChars: 0,
    htmlChars: 0,
    hastDurationsMs: [],
    htmlDurationsMs: [],
  };

  const originalCodeToHast = highlighter.codeToHast.bind(highlighter);
  const originalCodeToHtml = highlighter.codeToHtml.bind(highlighter);

  (highlighter as Highlighter & { codeToHast: Highlighter['codeToHast'] })
    .codeToHast = ((code: string, options: Parameters<Highlighter['codeToHast']>[1]) => {
    const start = performance.now();
    const result = originalCodeToHast(code, options);
    const end = performance.now();
    stats.hastCalls += 1;
    stats.hastChars += code.length;
    stats.hastDurationsMs.push(end - start);
    return result;
  }) as Highlighter['codeToHast'];

  (highlighter as Highlighter & { codeToHtml: Highlighter['codeToHtml'] })
    .codeToHtml = ((code: string, options: Parameters<Highlighter['codeToHtml']>[1]) => {
    const start = performance.now();
    const result = originalCodeToHtml(code, options);
    const end = performance.now();
    stats.htmlCalls += 1;
    stats.htmlChars += code.length;
    stats.htmlDurationsMs.push(end - start);
    return result;
  }) as Highlighter['codeToHtml'];

  const reset = () => {
    stats.hastCalls = 0;
    stats.htmlCalls = 0;
    stats.hastChars = 0;
    stats.htmlChars = 0;
    stats.hastDurationsMs = [];
    stats.htmlDurationsMs = [];
  };

  const restore = () => {
    (highlighter as Highlighter & { codeToHast: Highlighter['codeToHast'] })
      .codeToHast = originalCodeToHast;
    (highlighter as Highlighter & { codeToHtml: Highlighter['codeToHtml'] })
      .codeToHtml = originalCodeToHtml;
  };

  return {
    highlighter,
    stats,
    reset,
    restore,
  };
};

export const summarizeSession = ({
  scenario,
  variant,
  totalCalls,
  totalCharsProcessed,
  durationsMs,
  finalCodeLength,
}: {
  scenario: string;
  variant: string;
  totalCalls: number;
  totalCharsProcessed: number;
  durationsMs: number[];
  finalCodeLength: number;
}): SessionSummary => {
  const totalTimeMs = durationsMs.reduce((sum, ms) => sum + ms, 0);
  return {
    scenario,
    variant,
    totalCalls,
    totalCharsProcessed,
    workAmplification:
      finalCodeLength === 0 ? 0 : totalCharsProcessed / finalCodeLength,
    totalTimeMs,
    avgPerTokenMs: totalCalls === 0 ? 0 : totalTimeMs / totalCalls,
    p95PerTokenMs: percentile(durationsMs, 95),
  };
};
