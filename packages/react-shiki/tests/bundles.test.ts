import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bundledLanguages as fullLanguages } from 'shiki';
import { bundledLanguages as webLanguages } from 'shiki/bundle/web';
import type { LanguageRegistration } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { bundledHighlighterFactory } from '../src/bundles/factory';
import { createFullHighlighter } from '../src/bundles/full';
import { createWebHighlighter } from '../src/bundles/web';
import type { PreloadLanguage } from '../src/lib/types';
import { outOfType } from './fakes';

type GetSingletonHighlighter = Parameters<
  typeof bundledHighlighterFactory
>[0];

const getSingletonHighlighter = vi.fn<GetSingletonHighlighter>();
const engine = createJavaScriptRegexEngine();

const fullFactory = bundledHighlighterFactory(
  getSingletonHighlighter,
  fullLanguages
);

const webFactory = bundledHighlighterFactory(
  getSingletonHighlighter,
  webLanguages
);

beforeEach(() => {
  getSingletonHighlighter.mockReset();
});

describe('full bundle factory', () => {
  it('passes bundled languages through as-is', async () => {
    await fullFactory(['javascript'], ['github-dark'], engine);

    expect(getSingletonHighlighter).toHaveBeenCalledWith({
      langs: ['javascript'],
      themes: ['github-dark'],
      engine,
    });
  });

  it('does not pass unsupported string languages to shiki', async () => {
    await fullFactory(['not-a-language'], ['github-dark'], engine);

    expect(getSingletonHighlighter).toHaveBeenCalledWith({
      langs: [],
      themes: ['github-dark'],
      engine,
    });
  });

  it('passes custom language registrations with required fields', async () => {
    const customLanguage: LanguageRegistration = {
      name: 'my-language',
      scopeName: 'source.my-language',
      patterns: [],
      repository: {},
    };

    await fullFactory([customLanguage], ['github-dark'], engine);

    expect(getSingletonHighlighter).toHaveBeenCalledWith({
      langs: [customLanguage],
      themes: ['github-dark'],
      engine,
    });
  });

  it('does not pass incomplete custom registrations', async () => {
    const invalidCustomLanguage = outOfType<PreloadLanguage>({
      name: 'broken-language',
    });

    await fullFactory([invalidCustomLanguage], ['github-dark'], engine);

    expect(getSingletonHighlighter).toHaveBeenCalledWith({
      langs: [],
      themes: ['github-dark'],
      engine,
    });
  });
});

describe('web bundle factory', () => {
  it('passes bundled languages through as-is', async () => {
    await webFactory(['html'], ['github-dark'], engine);

    expect(getSingletonHighlighter).toHaveBeenCalledWith({
      langs: ['html'],
      themes: ['github-dark'],
      engine,
    });
  });

  it('does not pass unsupported string languages to shiki', async () => {
    await webFactory(['not-a-language'], ['github-dark'], engine);

    expect(getSingletonHighlighter).toHaveBeenCalledWith({
      langs: [],
      themes: ['github-dark'],
      engine,
    });
  });
});

describe('bundle wiring', () => {
  it('each factory loads from its own bundle', async () => {
    const full = await createFullHighlighter(
      ['rust'],
      ['github-dark'],
      engine
    );

    const web = await createWebHighlighter(
      ['rust'],
      ['github-dark'],
      engine
    );

    expect(full.getLoadedLanguages()).toContain('rust');
    expect(web.getLoadedLanguages()).not.toContain('rust');
  });
});
