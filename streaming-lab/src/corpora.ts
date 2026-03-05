export type CorpusId =
  | 'tsx-chat-ui'
  | 'python-snippet'
  | 'json-tool-payload'
  | 'markdown-fenced-mixed';

export interface StreamingCorpus {
  id: CorpusId;
  label: string;
  description: string;
  language: string;
  source: string;
}

const TSX_CHAT_UI = `
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

const PYTHON_SNIPPET = `
from dataclasses import dataclass
from typing import Iterable

@dataclass
class Entry:
    key: str
    value: int

def build_index(items: Iterable[Entry]) -> dict[str, int]:
    index: dict[str, int] = {}
    for item in items:
        index[item.key] = index.get(item.key, 0) + item.value
    return index

print(build_index([Entry("a", 1), Entry("a", 3), Entry("b", 2)]))
`.trim();

const JSON_TOOL_PAYLOAD = `
{
  "tool": "create_calendar_event",
  "request_id": "req_7f2c1",
  "arguments": {
    "title": "Engineering sync",
    "start": "2026-03-04T15:00:00Z",
    "duration_minutes": 45,
    "attendees": [
      "alex@example.com",
      "sam@example.com",
      "lee@example.com"
    ],
    "metadata": {
      "priority": "normal",
      "channel": "chat"
    }
  }
}
`.trim();

const MARKDOWN_FENCED_MIXED = `
export async function run() {
  const response = await fetch('/api/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ includeTrends: true }),
  });

  if (!response.ok) {
    throw new Error('Failed to load report');
  }

  return response.json();
}
`.trim();

export const STREAMING_CORPORA: Record<CorpusId, StreamingCorpus> = {
  'tsx-chat-ui': {
    id: 'tsx-chat-ui',
    label: 'TSX chat UI',
    description: 'Long realistic TSX response in AI chat style.',
    language: 'tsx',
    source: TSX_CHAT_UI,
  },
  'python-snippet': {
    id: 'python-snippet',
    label: 'Python snippet',
    description: 'Decorator + indentation heavy sample for small blocks.',
    language: 'python',
    source: PYTHON_SNIPPET,
  },
  'json-tool-payload': {
    id: 'json-tool-payload',
    label: 'JSON payload',
    description: 'Tool-call shaped JSON for common chat output.',
    language: 'json',
    source: JSON_TOOL_PAYLOAD,
  },
  'markdown-fenced-mixed': {
    id: 'markdown-fenced-mixed',
    label: 'Markdown fenced mixed',
    description: 'Prose + fenced code + prose style assistant response.',
    language: 'typescript',
    source: MARKDOWN_FENCED_MIXED,
  },
};

export const STREAMING_CORPUS_LIST = Object.values(STREAMING_CORPORA);

export const getStreamingCorpus = (corpusId: CorpusId): StreamingCorpus =>
  STREAMING_CORPORA[corpusId];
