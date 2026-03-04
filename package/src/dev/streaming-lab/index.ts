export {
  STREAMING_CORPORA,
  STREAMING_CORPUS_LIST,
  getStreamingCorpus,
  type CorpusId,
  type StreamingCorpus,
} from './corpora';

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
  type ScenarioPreset,
  type ScenarioPresetId,
  type StreamingScenario,
} from './scenarios';

export {
  buildScenarioFrames,
  buildMarkdownStates,
  buildControlledCodeStates,
  buildCodeChunks,
  createReadableCodeStreamFromScenario,
  createAsyncCodeIterableFromScenario,
  extractFinalCode,
  extractFinalTranscript,
  type ControlledCodeState,
  type ScenarioFrame,
  type ScenarioReplaySnapshot,
} from './adapters';

export {
  buildSessionMetrics,
  calculateTextDiffCounts,
  createEmptySessionMetrics,
  getWorkAmplification,
  normalizeHtml,
  percentile,
  type ComputeMetrics,
  type IntegrityMetrics,
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
