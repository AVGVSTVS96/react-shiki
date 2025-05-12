export { useShikiHighlighter } from "./hook";
export { isInlineCode, rehypeInlineCodeProperty } from "./utils";
export { createFineGrainedBundle } from "./bundle";

export {
  ShikiHighlighter as default,
  type ShikiHighlighterProps,
} from "./component";

export type {
  Language,
  Theme,
  Themes,
  Element,
  HighlighterOptions,
  FineGrainedBundleOptions,
} from "./types";
