import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UseShikiHighlighter } from '../src/lib/types';

const noopHook = (() => null) as UseShikiHighlighter;

// Injection runs once per module, so each test imports a fresh copy
const importFreshFactory = async () => {
  vi.resetModules();
  const { createShikiHighlighterComponent } = await import(
    '../src/lib/component'
  );
  return createShikiHighlighterComponent;
};

describe('style injection', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    for (const el of document.querySelectorAll(
      'style[data-react-shiki]'
    )) {
      el.remove();
    }
    Reflect.deleteProperty(document, 'adoptedStyleSheets');
  });

  it('adopts a constructable stylesheet when supported', async () => {
    const replaceSync = vi.fn();
    vi.stubGlobal(
      'CSSStyleSheet',
      class {
        replaceSync = replaceSync;
      }
    );
    Object.defineProperty(document, 'adoptedStyleSheets', {
      value: [],
      writable: true,
      configurable: true,
    });

    const createComponent = await importFreshFactory();
    createComponent(noopHook);

    expect(document.adoptedStyleSheets).toHaveLength(1);
    expect(replaceSync).toHaveBeenCalledWith(
      expect.stringContaining('.rs-root')
    );
    expect(document.querySelector('style[data-react-shiki]')).toBeNull();
  });

  it('falls back to a <style> element when constructable sheets fail', async () => {
    vi.stubGlobal(
      'CSSStyleSheet',
      class {
        constructor() {
          throw new TypeError('Illegal constructor');
        }
      }
    );

    const createComponent = await importFreshFactory();
    createComponent(noopHook);

    const style = document.querySelector('style[data-react-shiki]');
    expect(style?.textContent).toContain('.rs-root');
    expect(style?.textContent).toContain('.rs-highlighted-line');
  });

  it('injects only once across multiple factory calls', async () => {
    vi.stubGlobal(
      'CSSStyleSheet',
      class {
        constructor() {
          throw new TypeError('Illegal constructor');
        }
      }
    );

    const createComponent = await importFreshFactory();
    createComponent(noopHook);
    createComponent(noopHook);

    expect(
      document.querySelectorAll('style[data-react-shiki]')
    ).toHaveLength(1);
  });
});
