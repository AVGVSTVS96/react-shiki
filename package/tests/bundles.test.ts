import { beforeEach, describe, expect, test, vi } from 'vitest';

const getSingletonHighlighterMock = vi.fn();

vi.mock('shiki', () => ({
  bundledLanguages: {
    javascript: {},
    typescript: {},
  },
  getSingletonHighlighter: (...args: any[]) =>
    getSingletonHighlighterMock(...args),
}));

vi.mock('shiki/bundle/web', () => ({
  bundledLanguages: {
    javascript: {},
    html: {},
  },
  getSingletonHighlighter: (...args: any[]) =>
    getSingletonHighlighterMock(...args),
}));

import { createFullHighlighter } from '../src/bundles/full';
import { createWebHighlighter } from '../src/bundles/web';

beforeEach(() => {
  getSingletonHighlighterMock.mockReset().mockResolvedValue({});
});

describe('full bundle factory', () => {
  test('passes bundled languages through as-is', async () => {
    await createFullHighlighter(
      'javascript',
      ['github-dark'],
      'engine' as any
    );

    expect(getSingletonHighlighterMock).toHaveBeenCalledWith({
      langs: ['javascript'],
      themes: ['github-dark'],
      engine: 'engine',
    });
  });

  test('does not pass unsupported string languages to shiki', async () => {
    await createFullHighlighter(
      'not-a-language',
      ['github-dark'],
      'engine' as any
    );

    expect(getSingletonHighlighterMock).toHaveBeenCalledWith({
      langs: [],
      themes: ['github-dark'],
      engine: 'engine',
    });
  });

  test('passes custom language registrations with required fields', async () => {
    const customLanguage = {
      name: 'my-language',
      scopeName: 'source.my-language',
    };

    await createFullHighlighter(
      customLanguage as any,
      ['github-dark'],
      'engine' as any
    );

    expect(getSingletonHighlighterMock).toHaveBeenCalledWith({
      langs: [customLanguage],
      themes: ['github-dark'],
      engine: 'engine',
    });
  });

  test('does not pass incomplete custom registrations', async () => {
    const invalidCustomLanguage = {
      name: 'broken-language',
    };

    await createFullHighlighter(
      invalidCustomLanguage as any,
      ['github-dark'],
      'engine' as any
    );

    expect(getSingletonHighlighterMock).toHaveBeenCalledWith({
      langs: [],
      themes: ['github-dark'],
      engine: 'engine',
    });
  });
});

describe('web bundle factory', () => {
  test('passes bundled languages through as-is', async () => {
    await createWebHighlighter('html', ['github-dark'], 'engine' as any);

    expect(getSingletonHighlighterMock).toHaveBeenCalledWith({
      langs: ['html'],
      themes: ['github-dark'],
      engine: 'engine',
    });
  });

  test('does not pass unsupported string languages to shiki', async () => {
    await createWebHighlighter(
      'not-a-language',
      ['github-dark'],
      'engine' as any
    );

    expect(getSingletonHighlighterMock).toHaveBeenCalledWith({
      langs: [],
      themes: ['github-dark'],
      engine: 'engine',
    });
  });
});
