import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  HighlighterOptions,
  UseShikiHighlighter,
} from '../src/lib/types';

const noopHook = (() => null) as UseShikiHighlighter;

// Enough of a highlighter for useHighlight's effect to settle quietly
const fakeHighlighter = {
  codeToHast: () => ({ type: 'root', children: [] }),
  codeToHtml: () => '',
  codeToTokens: () => ({ tokens: [] }),
  getLoadedLanguages: () => ['text'],
  loadLanguage: async () => {},
} as unknown as NonNullable<HighlighterOptions['highlighter']>;

const fakeFactory = async () => fakeHighlighter;

interface FakeSheet {
  cssText: string;
}

let cleanupRtl: (() => void) | undefined;

// Injection state and React must come from one fresh registry per test:
// the dedupe Set is module-level, and mixing React copies breaks hooks
const importFresh = async () => {
  vi.resetModules();
  const [component, hook, rtl, react] = await Promise.all([
    import('../src/lib/component'),
    import('../src/lib/hook'),
    import('@testing-library/react'),
    import('react'),
  ]);
  cleanupRtl = rtl.cleanup;
  return {
    createComponent: component.createShikiHighlighterComponent,
    useHighlight: hook.useHighlight,
    render: rtl.render,
    renderHook: rtl.renderHook,
    /** Settles useHighlight's async effect so assertions see final state. */
    flush: () => rtl.act(async () => {}),
    h: react.createElement,
  };
};

const stubConstructableSheets = () => {
  vi.stubGlobal(
    'CSSStyleSheet',
    class {
      cssText = '';
      replaceSync(css: string) {
        this.cssText = css;
      }
    }
  );
  Object.defineProperty(document, 'adoptedStyleSheets', {
    value: [],
    writable: true,
    configurable: true,
  });
};

const stubFailingSheets = () => {
  vi.stubGlobal(
    'CSSStyleSheet',
    class {
      constructor() {
        throw new TypeError('Illegal constructor');
      }
    }
  );
};

const adoptedSheets = () =>
  document.adoptedStyleSheets as unknown as FakeSheet[];

describe('scoped style injection', () => {
  afterEach(() => {
    cleanupRtl?.();
    vi.unstubAllGlobals();
    for (const el of document.querySelectorAll(
      'style[data-react-shiki]'
    )) {
      el.remove();
    }
    Reflect.deleteProperty(document, 'adoptedStyleSheets');
  });

  it('injects component styles on first mount without an extra render', async () => {
    stubConstructableSheets();
    const { createComponent, render, h } = await importFresh();

    const hook = vi.fn(noopHook);
    const Component = createComponent(hook);
    expect(adoptedSheets()).toHaveLength(0);

    render(h(Component, { language: 'ts', theme: 'github-dark' }, 'x'));

    expect(hook).toHaveBeenCalledTimes(1);
    expect(adoptedSheets()).toHaveLength(1);
    expect(adoptedSheets()[0].cssText).toContain('.rs-root');
    expect(adoptedSheets()[0].cssText).not.toContain(
      '.rs-highlighted-line'
    );
  });

  it('leaves feature style ownership to the highlighting hook', async () => {
    stubConstructableSheets();
    const { createComponent, render, h } = await importFresh();

    render(
      h(
        createComponent(noopHook),
        { language: 'ts', theme: 'github-dark', showLineNumbers: true },
        'x'
      )
    );

    expect(adoptedSheets()).toHaveLength(1);
    expect(adoptedSheets()[0].cssText).toContain('.rs-root');
    expect(adoptedSheets()[0].cssText).not.toContain(
      '.rs-highlighted-line'
    );
  });

  it('hook without line features injects nothing', async () => {
    stubConstructableSheets();
    const { useHighlight, renderHook, flush } = await importFresh();

    renderHook(() =>
      useHighlight(
        'code',
        'text',
        'github-dark',
        { highlighter: fakeHighlighter },
        fakeFactory
      )
    );
    await flush();

    expect(adoptedSheets()).toHaveLength(0);
    expect(document.querySelector('style[data-react-shiki]')).toBeNull();
  });

  it('hook injects feature styles when line features become enabled', async () => {
    stubConstructableSheets();
    const { useHighlight, renderHook, flush } = await importFresh();

    const { rerender } = renderHook(
      ({ showLineNumbers }) =>
        useHighlight(
          'code',
          'text',
          'github-dark',
          { highlighter: fakeHighlighter, showLineNumbers },
          fakeFactory
        ),
      { initialProps: { showLineNumbers: false } }
    );
    await flush();
    expect(adoptedSheets()).toHaveLength(0);

    rerender({ showLineNumbers: true });
    await flush();

    const css = adoptedSheets().map((s) => s.cssText);
    expect(css).toHaveLength(1);
    expect(css[0]).toContain('.rs-highlighted-line');
    expect(css[0]).not.toContain('.rs-root');

    rerender({ showLineNumbers: true });
    expect(adoptedSheets()).toHaveLength(1);
  });

  it('falls back to <style> elements when constructable sheets fail', async () => {
    stubFailingSheets();
    const {
      createComponent,
      useHighlight,
      render,
      renderHook,
      flush,
      h,
    } = await importFresh();

    render(
      h(
        createComponent(noopHook),
        {
          language: 'ts',
          theme: 'github-dark',
          highlightLineNumbers: [1],
        },
        'x'
      )
    );
    renderHook(() =>
      useHighlight(
        'code',
        'text',
        'github-dark',
        { highlighter: fakeHighlighter, highlightLineNumbers: [1] },
        fakeFactory
      )
    );
    await flush();

    const styles = [
      ...document.querySelectorAll('style[data-react-shiki]'),
    ];
    expect(styles).toHaveLength(2);
    expect(styles[0].textContent).toContain('.rs-root');
    expect(styles[1].textContent).toContain('.rs-highlighted-line');
  });

  it('injects each sheet once across renders and instances', async () => {
    stubConstructableSheets();
    const {
      createComponent,
      useHighlight,
      render,
      renderHook,
      flush,
      h,
    } = await importFresh();

    const Component = createComponent(noopHook);
    const props = {
      language: 'ts',
      theme: 'github-dark',
      showLineNumbers: true,
    };
    const { rerender } = render(h(Component, props, 'x'));
    rerender(h(Component, props, 'y'));
    render(h(createComponent(noopHook), props, 'z'));
    renderHook(() =>
      useHighlight(
        'code',
        'text',
        'github-dark',
        { highlighter: fakeHighlighter, showLineNumbers: true },
        fakeFactory
      )
    );
    renderHook(() =>
      useHighlight(
        'more code',
        'text',
        'github-dark',
        { highlighter: fakeHighlighter, showLineNumbers: true },
        fakeFactory
      )
    );
    await flush();

    expect(adoptedSheets()).toHaveLength(2);
  });
});
