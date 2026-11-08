import { describe, expectTypeOf, test } from 'vitest';
import type { ReactElement } from 'react';

import {
  ShikiHighlighter,
  useShikiHighlighter,
  type HighlighterOptions,
  type TokensResult,
} from '../src/index';

const code = 'const x = 1;';

/**
 * The tokens format is deliberately excluded from HighlighterOptions and
 * only enters through the hook's generic signature. These tests pin that
 * design: literal outputFormat values narrow the hook's return type, while
 * HighlighterOptions-typed option objects (wrappers forwarding options)
 * keep the pre-tokens return union with no TokensResult in it.
 */
describe('useShikiHighlighter return type', () => {
  test('defaults to ReactElement', () => {
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark')
    ).toEqualTypeOf<ReactElement | null>();
  });

  test("literal 'react' returns ReactElement", () => {
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark', {
        outputFormat: 'react',
      })
    ).toEqualTypeOf<ReactElement | null>();
  });

  test("literal 'html' returns string", () => {
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark', {
        outputFormat: 'html',
      })
    ).toEqualTypeOf<string | null>();
  });

  test("literal 'tokens' returns TokensResult", () => {
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark', {
        outputFormat: 'tokens',
      })
    ).toEqualTypeOf<TokensResult | null>();
  });

  test('HighlighterOptions-typed options keep the pre-tokens union', () => {
    const options: HighlighterOptions = {};
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark', options)
    ).toEqualTypeOf<ReactElement | string | null>();
  });
});

describe('ShikiHighlighter outputFormat prop', () => {
  test("accepts 'react' and 'html', rejects 'tokens'", () => {
    <ShikiHighlighter
      language="ts"
      theme="github-dark"
      outputFormat="react"
    >
      {code}
    </ShikiHighlighter>;

    <ShikiHighlighter
      language="ts"
      theme="github-dark"
      outputFormat="html"
    >
      {code}
    </ShikiHighlighter>;

    <ShikiHighlighter
      language="ts"
      theme="github-dark"
      // @ts-expect-error tokens output is hook-only
      outputFormat="tokens"
    >
      {code}
    </ShikiHighlighter>;
  });
});
