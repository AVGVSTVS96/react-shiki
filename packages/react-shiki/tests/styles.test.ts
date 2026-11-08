import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UseShikiHighlighter } from '../src/lib/types';
import { createFakeHighlighter } from './fakes';

const noopHook: UseShikiHighlighter = () => null;

const fakeHighlighter = createFakeHighlighter();

const fakeFactory = async () => fakeHighlighter;

class FakeSheet {
  cssText = '';

  replaceSync(css: string) {
    this.cssText = css;
  }
}

function IllegalConstructor(): never {
  throw new TypeError('Illegal constructor');
}

let cleanupRtl: (() => void) | undefined;

const importFreshRegistry = async () => {
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
    settle: async () => {
      await rtl.act(async () => {});
    },
    h: react.createElement,
  };
};

const stubConstructableSheets = () => {
  vi.stubGlobal('CSSStyleSheet', FakeSheet);
  Object.defineProperty(document, 'adoptedStyleSheets', {
    value: [],
    writable: true,
    configurable: true,
  });
};

const stubFailingSheets = () => {
  vi.stubGlobal('CSSStyleSheet', IllegalConstructor);
};

const adoptedCss = () =>
  document.adoptedStyleSheets.map((sheet) =>
    sheet instanceof FakeSheet ? sheet.cssText : null
  );

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
    const { createComponent, render, h } = await importFreshRegistry();

    const hookCalls = vi.fn<() => void>();

    const Component = createComponent(() => {
      hookCalls();

      return null;
    });

    expect(adoptedCss()).toHaveLength(0);

    render(
      h(Component, {
        language: 'ts',
        theme: 'github-dark',
        children: 'x',
      })
    );

    expect(hookCalls).toHaveBeenCalledOnce();
    expect(adoptedCss()).toHaveLength(1);
    expect(adoptedCss()[0]).toContain('.rs-root');
    expect(adoptedCss()[0]).not.toContain('.rs-highlighted-line');
  });

  it('leaves feature style ownership to the highlighting hook', async () => {
    stubConstructableSheets();
    const { createComponent, render, h } = await importFreshRegistry();

    render(
      h(createComponent(noopHook), {
        language: 'ts',
        theme: 'github-dark',
        showLineNumbers: true,
        children: 'x',
      })
    );

    expect(adoptedCss()).toHaveLength(1);
    expect(adoptedCss()[0]).toContain('.rs-root');
    expect(adoptedCss()[0]).not.toContain('.rs-highlighted-line');
  });

  it('hook without line features injects nothing', async () => {
    stubConstructableSheets();

    const { useHighlight, renderHook, settle } =
      await importFreshRegistry();

    renderHook(() =>
      useHighlight(
        'code',
        'text',
        'github-dark',
        { highlighter: fakeHighlighter },
        fakeFactory
      )
    );
    await settle();

    expect(adoptedCss()).toHaveLength(0);
    expect(document.querySelector('style[data-react-shiki]')).toBeNull();
  });

  it('hook injects feature styles when line features become enabled', async () => {
    stubConstructableSheets();

    const { useHighlight, renderHook, settle } =
      await importFreshRegistry();

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

    await settle();
    expect(adoptedCss()).toHaveLength(0);

    rerender({ showLineNumbers: true });
    await settle();

    const css = adoptedCss();
    expect(css).toHaveLength(1);
    expect(css[0]).toContain('.rs-highlighted-line');
    expect(css[0]).not.toContain('.rs-root');

    rerender({ showLineNumbers: true });
    expect(adoptedCss()).toHaveLength(1);
  });

  it('falls back to <style> elements when constructable sheets fail', async () => {
    stubFailingSheets();

    const {
      createComponent,
      useHighlight,
      render,
      renderHook,
      settle,
      h,
    } = await importFreshRegistry();

    render(
      h(createComponent(noopHook), {
        language: 'ts',
        theme: 'github-dark',
        highlightLineNumbers: [1],
        children: 'x',
      })
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
    await settle();

    const styles = [
      ...document.querySelectorAll('style[data-react-shiki]'),
    ];

    expect(styles).toHaveLength(2);
    expect(styles[0]?.textContent).toContain('.rs-root');
    expect(styles[1]?.textContent).toContain('.rs-highlighted-line');
  });

  it('injects each sheet once across renders and instances', async () => {
    stubConstructableSheets();

    const {
      createComponent,
      useHighlight,
      render,
      renderHook,
      settle,
      h,
    } = await importFreshRegistry();

    const Component = createComponent(noopHook);

    const props = {
      language: 'ts',
      theme: 'github-dark',
      showLineNumbers: true,
    };

    const { rerender } = render(
      h(Component, { ...props, children: 'x' })
    );

    rerender(h(Component, { ...props, children: 'y' }));
    render(h(createComponent(noopHook), { ...props, children: 'z' }));
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
    await settle();

    expect(adoptedCss()).toHaveLength(2);
  });
});
