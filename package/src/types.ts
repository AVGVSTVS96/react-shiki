import type { BundledLanguage, BundledTheme, SpecialLanguage, ShikiTransformer, ThemeRegistration } from 'shiki';

/** 
 * Languages for syntax highlighting.
 * @see https://shiki.style/languages
 */
type Language =
  BundledLanguage
  | SpecialLanguage
  | (string & {})
  | undefined;

/**
 * A textmate theme object or a Shiki BundledTheme
 * @see https://shiki.style/themes
 */
type Theme = ThemeRegistration | BundledTheme;

/**
 * Configuration options for the syntax highlighter
 */
type HighlighterOptions = {
  /** 
   * Minimum time (in milliseconds) between highlight operations. 
   * @default undefined (no throttling)
   */
  delay?: number;

  /**
   * Custom Shiki transformers to apply to the highlighted code.
   */
  transformers?: ShikiTransformer[];
};

/**
 * State for the throttling logic
 */
type TimeoutState = {
  /**
   * Id of the timeout that is currently scheduled
   */
  timeoutId: NodeJS.Timeout | undefined;
  /**
   * Next time when the timeout can be scheduled
   */
  nextAllowedTime: number;
};

export type { Language, Theme, HighlighterOptions, TimeoutState };
