export {
  STREAMING_CORPORA,
  STREAMING_CORPUS_LIST,
  getStreamingCorpus,
  type CorpusId,
  type StreamingCorpus,
} from './corpora';

export {
  STREAMING_ASSISTANT_MESSAGE_CORPORA,
  STREAMING_ASSISTANT_MESSAGE_CORPUS_LIST,
  getAssistantMessageCorpus,
  type AssistantMessageBlockCorpus,
  type AssistantMessageCorpus,
  type MessageCorpusId,
} from './message-corpuses';

export {
  chunkTextWithSeed,
  createSeededRandom,
  isCodeMutationEvent,
  isTranscriptMutationEvent,
  type StreamingEvent,
} from './events';

export {
  STREAMING_SCENARIO_PRESETS,
  createStreamingScenario,
  type AssistantMessagePresetId,
  type CreateStreamingScenarioRequest,
  type RestartClass,
  type ScenarioCorpusTarget,
  type ScenarioFamily,
  type ScenarioPreset,
  type ScenarioPresetId,
  type SingleCodePresetId,
  type StreamingScenario,
} from './scenarios';

export {
  buildScenarioFrames,
  buildMarkdownStates,
  buildControlledCodeStates,
  buildTranscriptPlaybackStates,
  buildCodeChunks,
  createReadableCodeStreamFromScenario,
  createAsyncCodeIterableFromScenario,
  extractFinalCode,
  extractFinalTranscript,
  type ControlledCodeState,
  type ScenarioFrame,
  type ScenarioReplaySnapshot,
  type TranscriptPlaybackMode,
} from './adapters';

export {
  buildSessionMetrics,
  buildHighlightStructure,
  calculateTextDiffCounts,
  compareStructuralHighlight,
  createEmptySessionMetrics,
  getCommitAmplification,
  getWorkAmplification,
  normalizeHtml,
  normalizePlainText,
  percentile,
  type ComputeMetrics,
  type HighlightStructure,
  type IntegrityMetrics,
  type StructuralHighlightComparison,
  type StreamingSessionMetrics,
  type UxMetrics,
} from './metrics';

export {
  playScenarioEvents,
  type ScenarioPlaybackFrame,
  type ScenarioPlaybackOptions,
  type ScenarioPlaybackResult,
} from './session-runner';

export {
  formatScenarioSummaryMarkdown,
  toScenarioSummaryRows,
  type ScenarioSummaryRow,
  type ScenarioVariantReport,
} from './reporters';

export {
  createEmptyAssistantMessageMetrics,
  isSuspiciousAssistantBlock,
  logAssistantMessageRunSummary,
  summarizeAssistantMessageRun,
  type AssistantBlockMetrics,
  type AssistantMessageMetrics,
  type AssistantMessageRunSummary,
} from './assistant-metrics';

export {
  buildAssistantChatTreePlaybackPlan,
  type AssistantChatTreePlaybackPlan,
} from './assistant-chat-tree';

export {
  extractFencedCodeBlocks,
  parseTranscriptNodes,
  type TranscriptCodeBlock,
  type TranscriptNode,
} from './transcript';
