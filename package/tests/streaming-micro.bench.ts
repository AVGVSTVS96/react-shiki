import { beforeAll, bench, describe } from 'vitest';
import { getSingletonHighlighter, type Highlighter } from 'shiki';
import { ShikiStreamTokenizer } from 'shiki-stream';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';

import {
  chunkTextWithSeed,
  getStreamingCorpus,
} from 'streaming-lab';

let highlighter: Highlighter;
const corpus = getStreamingCorpus('tsx-chat-ui');
const chunks = chunkTextWithSeed(corpus.source, {
  seed: 123,
  minChunk: 4,
  maxChunk: 12,
});

beforeAll(async () => {
  highlighter = await getSingletonHighlighter({
    langs: ['tsx'],
    themes: ['github-dark'],
  });
}, 30000);

describe('streaming micro benchmark', () => {
  bench('codeToHast -> toJsxRuntime single pass', () => {
    const hast = highlighter.codeToHast(corpus.source, {
      lang: corpus.language,
      theme: 'github-dark',
    });
    toJsxRuntime(hast, { jsx, jsxs, Fragment });
  });

  bench('codeToHtml single pass', () => {
    highlighter.codeToHtml(corpus.source, {
      lang: corpus.language,
      theme: 'github-dark',
    });
  });

  bench(
    'tokenizer enqueue all chunks',
    async () => {
      const tokenizer = new ShikiStreamTokenizer({
        highlighter,
        lang: corpus.language,
        theme: 'github-dark',
      });

      for (const chunk of chunks) {
        await tokenizer.enqueue(chunk);
      }
    },
    { iterations: 1 }
  );

  bench(
    'tokenizer close flush cost',
    async () => {
      const tokenizer = new ShikiStreamTokenizer({
        highlighter,
        lang: corpus.language,
        theme: 'github-dark',
      });

      for (const chunk of chunks) {
        await tokenizer.enqueue(chunk);
      }

      tokenizer.close();
    },
    { iterations: 1 }
  );
});
