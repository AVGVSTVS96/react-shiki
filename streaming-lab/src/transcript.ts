// Internal transcript parsing helpers for streaming-lab integration tests,
// benchmark harnesses, and playground transcript playback.

export interface TranscriptCodeBlock {
  index: number;
  language: string;
  code: string;
  closed: boolean;
}

export type TranscriptNode =
  | { type: 'text'; value: string }
  | { type: 'inline-code'; value: string }
  | { type: 'code-block'; block: TranscriptCodeBlock };

const FENCE = '```';

const normalizeLanguage = (value: string): string =>
  value.trim().toLowerCase();

const findFenceClose = (
  source: string,
  start: number
): { closeStart: number; markerLength: number } | null => {
  const newlineClose = source.indexOf('\n```', start);
  if (newlineClose >= 0) {
    return { closeStart: newlineClose, markerLength: 4 };
  }

  const eofClose = source.endsWith(FENCE) ? source.length - 3 : -1;
  if (eofClose >= start) {
    return { closeStart: eofClose, markerLength: 3 };
  }

  return null;
};

export const extractFencedCodeBlocks = (
  markdown: string
): TranscriptCodeBlock[] => {
  const blocks: TranscriptCodeBlock[] = [];
  let cursor = 0;

  while (cursor < markdown.length) {
    const open = markdown.indexOf(FENCE, cursor);
    if (open < 0) break;

    const languageStart = open + FENCE.length;
    const languageLineEnd = markdown.indexOf('\n', languageStart);

    if (languageLineEnd < 0) {
      blocks.push({
        index: blocks.length,
        language: normalizeLanguage(markdown.slice(languageStart)),
        code: '',
        closed: false,
      });
      break;
    }

    const language = normalizeLanguage(
      markdown.slice(languageStart, languageLineEnd)
    );

    const close = findFenceClose(markdown, languageLineEnd + 1);
    if (!close) {
      blocks.push({
        index: blocks.length,
        language,
        code: markdown.slice(languageLineEnd + 1),
        closed: false,
      });
      break;
    }

    blocks.push({
      index: blocks.length,
      language,
      code: markdown.slice(languageLineEnd + 1, close.closeStart),
      closed: true,
    });

    cursor = close.closeStart + close.markerLength;
  }

  return blocks;
};

const splitInlineCode = (value: string): TranscriptNode[] => {
  if (!value) return [];

  const nodes: TranscriptNode[] = [];
  const inlineCode = /`([^`\n]+)`/g;

  let cursor = 0;
  let match = inlineCode.exec(value);
  while (match) {
    const start = match.index;
    const end = start + match[0].length;

    if (start > cursor) {
      nodes.push({ type: 'text', value: value.slice(cursor, start) });
    }

    nodes.push({ type: 'inline-code', value: match[1] ?? '' });
    cursor = end;
    match = inlineCode.exec(value);
  }

  if (cursor < value.length) {
    nodes.push({ type: 'text', value: value.slice(cursor) });
  }

  return nodes;
};

export const parseTranscriptNodes = (
  markdown: string
): TranscriptNode[] => {
  const nodes: TranscriptNode[] = [];
  let cursor = 0;
  let codeBlockIndex = 0;

  while (cursor < markdown.length) {
    const open = markdown.indexOf(FENCE, cursor);
    if (open < 0) {
      nodes.push(...splitInlineCode(markdown.slice(cursor)));
      break;
    }

    if (open > cursor) {
      nodes.push(...splitInlineCode(markdown.slice(cursor, open)));
    }

    const languageStart = open + FENCE.length;
    const languageLineEnd = markdown.indexOf('\n', languageStart);

    if (languageLineEnd < 0) {
      nodes.push({
        type: 'code-block',
        block: {
          index: codeBlockIndex,
          language: normalizeLanguage(markdown.slice(languageStart)),
          code: '',
          closed: false,
        },
      });
      break;
    }

    const language = normalizeLanguage(
      markdown.slice(languageStart, languageLineEnd)
    );

    const close = findFenceClose(markdown, languageLineEnd + 1);
    if (!close) {
      nodes.push({
        type: 'code-block',
        block: {
          index: codeBlockIndex,
          language,
          code: markdown.slice(languageLineEnd + 1),
          closed: false,
        },
      });
      break;
    }

    nodes.push({
      type: 'code-block',
      block: {
        index: codeBlockIndex,
        language,
        code: markdown.slice(languageLineEnd + 1, close.closeStart),
        closed: true,
      },
    });

    cursor = close.closeStart + close.markerLength;
    codeBlockIndex += 1;
  }

  return nodes;
};
