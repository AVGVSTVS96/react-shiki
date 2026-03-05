import { beforeAll, describe, expect, test } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';

import {
  buildAssistantChatTreePlaybackPlan,
  createStreamingScenario,
  isSuspiciousAssistantBlock,
  parseTranscriptNodes,
} from 'streaming-lab';
import { runAssistantMessageScenario } from './assistant-message-harness';

let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: [
      'php',
      'ruby',
      'swift',
      'go',
      'typescript',
      'html',
      'css',
      'python',
      'json',
      'plaintext',
    ],
    themes: ['github-dark'],
  });
}, 30000);

describe('assistant-message multi-block playback', () => {
  test('streams 4+ blocks progressively and keeps earlier blocks mounted', async () => {
    const scenario = createStreamingScenario({
      presetId: 'assistant-multi-block-steady',
      seed: 24,
    });

    const playback = buildAssistantChatTreePlaybackPlan(scenario.events);
    const mountedCounts = playback.states.map(
      (state) =>
        parseTranscriptNodes(state).filter((node) => node.type === 'code-block')
          .length
    );

    expect(playback.finalBlocks.length).toBeGreaterThanOrEqual(4);
    expect(playback.maxMountedBlocks).toBe(playback.finalBlocks.length);

    for (let index = 1; index < mountedCounts.length; index += 1) {
      expect(mountedCounts[index]).toBeGreaterThanOrEqual(
        mountedCounts[index - 1] ?? 0
      );
    }

    const incremental = await runAssistantMessageScenario({
      scenario,
      highlighter,
      variant: 'incremental-chat-tree',
    });

    expect(incremental.blockMetrics).toHaveLength(playback.finalBlocks.length);
    expect(incremental.blockMetrics.every((block) => block.mountCount >= 1)).toBe(
      true
    );
    expect(incremental.messageMetrics.maxMountedBlocks).toBe(
      playback.maxMountedBlocks
    );
  }, 25000);

  test('final transcript keeps plain-text parity and highlight presence', async () => {
    const scenario = createStreamingScenario({
      presetId: 'assistant-multi-block-bursty',
      seed: 41,
    });

    const incremental = await runAssistantMessageScenario({
      scenario,
      highlighter,
      variant: 'incremental-chat-tree',
    });

    expect(incremental.plainTextParity).toBe(true);
    expect(incremental.highlightPresencePass).toBe(true);
    expect(incremental.strictStructuralMatch).not.toBeNull();
  }, 25000);

  test('heterogeneous languages produce styled output per block', async () => {
    const scenario = createStreamingScenario({
      presetId: 'assistant-multi-block-firehose',
      seed: 57,
    });

    const incremental = await runAssistantMessageScenario({
      scenario,
      highlighter,
      variant: 'incremental-chat-tree',
    });

    const languages = new Set(incremental.blockMetrics.map((block) => block.language));

    expect(languages.has('php')).toBe(true);
    expect(languages.has('ruby')).toBe(true);
    expect(languages.has('swift')).toBe(true);
    expect(languages.has('go')).toBe(true);
    expect(languages.has('typescript')).toBe(true);
    expect(languages.has('html')).toBe(true);

    for (const block of incremental.blockMetrics) {
      expect(block.finalTokenCount).toBeGreaterThan(0);
      expect(block.firstHighlightMs).toBeGreaterThan(0);
    }
  }, 25000);

  test('earlier closed blocks surface noop rerender amplification metrics', async () => {
    const scenario = createStreamingScenario({
      presetId: 'assistant-multi-block-steady',
      seed: 73,
    });

    const incremental = await runAssistantMessageScenario({
      scenario,
      highlighter,
      variant: 'incremental-chat-tree',
    });

    const earlierBlocks = incremental.blockMetrics.slice(0, -1);
    expect(earlierBlocks.length).toBeGreaterThanOrEqual(3);

    const suspiciousBlocks = earlierBlocks.filter((block) =>
      isSuspiciousAssistantBlock(block)
    );

    expect(earlierBlocks.some((block) => block.noopRenderCount > 0)).toBe(
      true
    );
    expect(suspiciousBlocks.length).toBeGreaterThan(0);
  }, 25000);

  test('incremental, static, and plaintext baselines report measured gap clearly', async () => {
    const scenario = createStreamingScenario({
      presetId: 'assistant-multi-block-bursty',
      seed: 91,
    });

    const incremental = await runAssistantMessageScenario({
      scenario,
      highlighter,
      variant: 'incremental-chat-tree',
    });
    const staticTree = await runAssistantMessageScenario({
      scenario,
      highlighter,
      variant: 'static-chat-tree',
    });
    const plainText = await runAssistantMessageScenario({
      scenario,
      highlighter,
      variant: 'plaintext-chat-tree',
    });

    expect(incremental.plainTextParity).toBe(true);
    expect(staticTree.plainTextParity).toBe(true);
    expect(plainText.plainTextParity).toBe(true);

    expect(incremental.highlightPresencePass).toBe(true);
    expect(staticTree.highlightPresencePass).toBe(true);
    expect(plainText.highlightPresencePass).toBe(false);

    const incrementalMs = incremental.messageMetrics.chatTreeActualDurationMs;
    const staticMs = staticTree.messageMetrics.chatTreeActualDurationMs;
    const gapMs = incrementalMs - staticMs;

    expect(Number.isFinite(gapMs)).toBe(true);
    expect({
      incrementalMs: Number(incrementalMs.toFixed(2)),
      staticMs: Number(staticMs.toFixed(2)),
      gapMs: Number(gapMs.toFixed(2)),
    }).toEqual(
      expect.objectContaining({
        incrementalMs: expect.any(Number),
        staticMs: expect.any(Number),
        gapMs: expect.any(Number),
      })
    );
  }, 30000);
});
