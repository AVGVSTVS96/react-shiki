import { describe, expectTypeOf, it } from 'vitest';
import type { ComponentProps, ReactElement } from 'react';

import { useShikiHighlighter } from '../src/index';
import type {
  HighlighterOptions,
  ShikiHighlighter,
  TokensResult,
} from '../src/index';

const code = 'const x = 1;';

describe('useShikiHighlighter return type (tokens enters only through the hook generic, never HighlighterOptions)', () => {
  it('defaults to ReactElement', () => {
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark')
    ).toEqualTypeOf<ReactElement | null>();
  });

  it("literal 'react' returns ReactElement", () => {
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark', {
        outputFormat: 'react',
      })
    ).toEqualTypeOf<ReactElement | null>();
  });

  it("literal 'html' returns string", () => {
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark', {
        outputFormat: 'html',
      })
    ).toEqualTypeOf<string | null>();
  });

  it("literal 'tokens' returns TokensResult", () => {
    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark', {
        outputFormat: 'tokens',
      })
    ).toEqualTypeOf<TokensResult | null>();
  });

  it('HighlighterOptions-typed options keep the pre-tokens union', () => {
    const options: HighlighterOptions = {};

    expectTypeOf(
      useShikiHighlighter(code, 'ts', 'github-dark', options)
    ).toEqualTypeOf<ReactElement | string | null>();
  });
});

describe('ShikiHighlighter outputFormat prop', () => {
  it("accepts 'react' and 'html', rejects 'tokens' (hook-only)", () => {
    expectTypeOf<
      ComponentProps<typeof ShikiHighlighter>['outputFormat']
    >().toEqualTypeOf<'react' | 'html' | undefined>();
  });
});
