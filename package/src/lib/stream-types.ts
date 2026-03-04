import type {
  Highlighter,
  HighlighterCore,
  Awaitable,
  RegexEngine,
  ThemedToken,
  LanguageRegistration,
} from 'shiki';

import type { Language, Theme, Themes } from './types';

/**
 * Input source for streaming syntax highlighting.
 *
 * - `code`: A controlled growing string, the primary path for chat apps.
 *   Set `isComplete` when the stream is finished.
 * - `stream`: A browser `ReadableStream<string>`.
 * - `chunks`: An async iterable source.
 */
export type ShikiStreamInput =
  | {
      code: string;
      isComplete?: boolean;
    }
  | {
      stream: ReadableStream<string>;
    }
  | {
      chunks: AsyncIterable<string>;
    };

/**
 * Streaming lifecycle status.
 */
export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

/**
 * Batching strategy for state commits.
 *
 * - `'sync'`: commit immediately after each token update
 * - `'raf'`: commit once per animation frame (default)
 * - `number`: commit at most once per N milliseconds
 */
export type BatchStrategy = 'sync' | 'raf' | number;

/**
 * Options for the streaming syntax highlighter hook.
 */
export interface StreamHighlighterOptions {
  /**
   * Custom Shiki highlighter instance.
   * Required when using `react-shiki/core`.
   */
  highlighter?: Highlighter | HighlighterCore;

  /**
   * Custom textmate grammars to preload.
   * @deprecated Use preloadLanguages instead.
   */
  customLanguages?: LanguageRegistration | LanguageRegistration[];

  /**
   * Preload custom grammars or bundled languages.
   */
  preloadLanguages?: Language | Language[];

  /**
   * Language aliases mapping.
   */
  langAlias?: Record<string, string>;

  /**
   * Regex engine for the highlighter.
   */
  engine?: Awaitable<RegexEngine>;

  /**
   * Batching strategy for React state commits.
   * @default 'raf'
   */
  batch?: BatchStrategy;

  /**
   * Include unstable "preview" tokens for smoother streaming.
   * When true, tokens may shift as later context changes tokenization.
   * @default true
   */
  allowRecalls?: boolean;

  /**
   * Whether to show line numbers in the renderer.
   * @default false
   */
  showLineNumbers?: boolean;

  /**
   * Starting line number when showLineNumbers is true.
   * @default 1
   */
  startingLineNumber?: number;

  /**
   * Callback fired when the stream starts producing tokens.
   */
  onStreamStart?: () => void;

  /**
   * Callback fired when the stream finishes.
   */
  onStreamEnd?: () => void;
}

/**
 * Return value from useShikiStreamHighlighter.
 */
export interface StreamHighlighterResult {
  /**
   * Current flat array of themed tokens.
   */
  tokens: ThemedToken[];

  /**
   * Current streaming lifecycle status.
   */
  status: StreamStatus;

  /**
   * Error if status is 'error', null otherwise.
   */
  error: Error | null;

  /**
   * Reset the stream session, clearing all tokens and status.
   */
  reset: () => void;
}

/**
 * Public API signature for the streaming hook.
 */
export type UseShikiStreamHighlighter = (
  input: ShikiStreamInput,
  lang: Language,
  themeInput: Theme | Themes,
  options?: StreamHighlighterOptions
) => StreamHighlighterResult;
