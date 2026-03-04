export const STREAMING_BENCHMARK_SAMPLE = `
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

