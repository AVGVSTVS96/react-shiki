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
 * - `code`: A controlled growing string, optimized for append-only updates.
 *   Set `isComplete` when the stream is finished.
 *   Non-append replacements restart the stream session.
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
   * Include unstable "preview" tokens for smoother streaming.
   * When true, tokens may shift as later context changes tokenization.
   * @default true
   */
  allowRecalls?: boolean;

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
