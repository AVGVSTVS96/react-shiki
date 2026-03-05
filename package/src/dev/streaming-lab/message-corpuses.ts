const countLines = (source: string): number =>
  source.length === 0 ? 0 : source.split('\n').length;

export type MessageCorpusId =
  | 'assistant-mixed-stack-6'
  | 'assistant-runtime-5';

export interface AssistantMessageBlockCorpus {
  blockId: string;
  language: string;
  source: string;
  lineCount: number;
  label?: string;
}

export interface AssistantMessageCorpus {
  messageId: MessageCorpusId;
  title: string;
  openingProse: string;
  blocks: AssistantMessageBlockCorpus[];
  interBlockProse?: string[];
  closingProse: string;
}

const PHP_CACHE_BLOCK = `
<?php
declare(strict_types=1);

function buildUserLookup(array $rows): array {
    $lookup = [];
    foreach ($rows as $row) {
        $id = (string)($row['id'] ?? '');
        if ($id === '') continue;
        $lookup[$id] = [
            'name' => trim((string)($row['name'] ?? '')),
            'active' => (bool)($row['active'] ?? false),
        ];
    }
    return $lookup;
}
`.trim();

const RUBY_RETRY_BLOCK = `
class RetryBudget
  def initialize(limit:, reset_after:)
    @limit = limit
    @reset_after = reset_after
    @events = []
  end

  def allow?(now:)
    @events.reject! { |at| now - at > @reset_after }
    return false if @events.length >= @limit
    @events << now
    true
  end
end
`.trim();

const SWIFT_CLIENT_BLOCK = `
import Foundation

struct Build: Decodable {
    let id: String
    let status: String
}

func fetchBuild(_ id: String) async throws -> Build {
    let url = URL(string: "https://api.example.com/builds/\\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    return try decoder.decode(Build.self, from: data)
}
`.trim();

const GO_DIFF_BLOCK = `
package merge

func MergeFlags(base map[string]bool, updates map[string]bool) map[string]bool {
	out := map[string]bool{}
	for key, value := range base {
		out[key] = value
	}
	for key, value := range updates {
		if value {
			out[key] = true
			continue
		}
		delete(out, key)
	}
	return out
}
`.trim();

const TYPESCRIPT_STREAM_BLOCK = `
type Chunk = { id: string; delta: string; done?: boolean };

export function applyChunks(chunks: Chunk[]): Map<string, string> {
  const state = new Map<string, string>();
  for (const chunk of chunks) {
    const previous = state.get(chunk.id) ?? '';
    state.set(chunk.id, previous + chunk.delta);
    if (chunk.done && state.get(chunk.id)?.endsWith('\\n') === false) {
      state.set(chunk.id, (state.get(chunk.id) ?? '') + '\\n');
    }
  }
  return state;
}
`.trim();

const HTML_CARD_BLOCK = `
<section class="assistant-card">
  <header>
    <h2>Release Summary</h2>
    <p>Updated every 30 seconds</p>
  </header>
  <ul>
    <li data-state="ok">Parser latency under 12ms</li>
    <li data-state="warn">2 retries in last minute</li>
    <li data-state="ok">No transcript divergence</li>
  </ul>
  <button type="button">View diagnostics</button>
</section>
`.trim();

const PYTHON_VALIDATION_BLOCK = `
from dataclasses import dataclass

@dataclass
class Step:
    name: str
    ok: bool

def summarize(steps: list[Step]) -> dict[str, int]:
    result = {"total": len(steps), "failed": 0}
    for step in steps:
        if not step.ok:
            result["failed"] += 1
    return result
`.trim();

const JSON_AUDIT_BLOCK = `
{
  "run_id": "stream_lab_2042",
  "status": "completed",
  "durations_ms": {
    "tokenize": 28.4,
    "render": 44.1,
    "commit": 16.9
  },
  "flags": ["assistant-message", "multi-block", "deterministic"]
}
`.trim();

export const STREAMING_ASSISTANT_MESSAGE_CORPORA: Record<
  MessageCorpusId,
  AssistantMessageCorpus
> = {
  'assistant-mixed-stack-6': {
    messageId: 'assistant-mixed-stack-6',
    title: 'Assistant multi-block mixed stack (6 blocks)',
    openingProse:
      'I reproduced the slow path with one assistant reply that streams several implementation fragments. I kept each snippet short enough to inspect while still resembling real chat output.',
    blocks: [
      {
        blockId: 'php-cache-lookup',
        language: 'php',
        source: PHP_CACHE_BLOCK,
        lineCount: countLines(PHP_CACHE_BLOCK),
        label: 'PHP cache lookup helper',
      },
      {
        blockId: 'ruby-retry-budget',
        language: 'ruby',
        source: RUBY_RETRY_BLOCK,
        lineCount: countLines(RUBY_RETRY_BLOCK),
        label: 'Ruby retry budget',
      },
      {
        blockId: 'swift-build-client',
        language: 'swift',
        source: SWIFT_CLIENT_BLOCK,
        lineCount: countLines(SWIFT_CLIENT_BLOCK),
        label: 'Swift build fetch client',
      },
      {
        blockId: 'go-merge-flags',
        language: 'go',
        source: GO_DIFF_BLOCK,
        lineCount: countLines(GO_DIFF_BLOCK),
        label: 'Go flag merge function',
      },
      {
        blockId: 'ts-stream-apply',
        language: 'typescript',
        source: TYPESCRIPT_STREAM_BLOCK,
        lineCount: countLines(TYPESCRIPT_STREAM_BLOCK),
        label: 'TypeScript chunk reducer',
      },
      {
        blockId: 'html-release-card',
        language: 'html',
        source: HTML_CARD_BLOCK,
        lineCount: countLines(HTML_CARD_BLOCK),
        label: 'HTML diagnostics card',
      },
    ],
    interBlockProse: [
      'First, here is the cache normalization helper that caused partial updates in prod.',
      'Next is the retry gate used by the worker loop.',
      'Then the mobile client parser path:',
      'Server-side merge behavior looks like this.',
      'Finally, the transcript reducer and view shell:',
    ],
    closingProse:
      'If you want, I can now run the same message through static highlighting as a control and report where the lag actually lands.',
  },
  'assistant-runtime-5': {
    messageId: 'assistant-runtime-5',
    title: 'Assistant runtime diagnostics (5 blocks)',
    openingProse:
      'Here is a second deterministic message corpus that mixes runtime snippets and output payloads to stress language transitions.',
    blocks: [
      {
        blockId: 'python-summary',
        language: 'python',
        source: PYTHON_VALIDATION_BLOCK,
        lineCount: countLines(PYTHON_VALIDATION_BLOCK),
        label: 'Python validation',
      },
      {
        blockId: 'json-audit',
        language: 'json',
        source: JSON_AUDIT_BLOCK,
        lineCount: countLines(JSON_AUDIT_BLOCK),
        label: 'JSON audit payload',
      },
      {
        blockId: 'php-cache-lookup',
        language: 'php',
        source: PHP_CACHE_BLOCK,
        lineCount: countLines(PHP_CACHE_BLOCK),
        label: 'PHP cache lookup helper',
      },
      {
        blockId: 'typescript-stream-apply',
        language: 'typescript',
        source: TYPESCRIPT_STREAM_BLOCK,
        lineCount: countLines(TYPESCRIPT_STREAM_BLOCK),
        label: 'TypeScript chunk reducer',
      },
      {
        blockId: 'html-release-card',
        language: 'html',
        source: HTML_CARD_BLOCK,
        lineCount: countLines(HTML_CARD_BLOCK),
        label: 'HTML diagnostics card',
      },
    ],
    interBlockProse: [
      'Validation summaries are emitted from the worker as follows.',
      'The aggregated audit payload then flows to the UI.',
      'Recovery code in the API tier:',
      'UI reducer and render shell:',
    ],
    closingProse:
      'This variant is useful as a control when we need python/json in the same response.',
  },
};

export const STREAMING_ASSISTANT_MESSAGE_CORPUS_LIST = Object.values(
  STREAMING_ASSISTANT_MESSAGE_CORPORA
);

export const getAssistantMessageCorpus = (
  messageId: MessageCorpusId
): AssistantMessageCorpus =>
  STREAMING_ASSISTANT_MESSAGE_CORPORA[messageId];
