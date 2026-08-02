import componentCss from '../styles/component.css?inline';
import featuresCss from '../styles/features.css?inline';
import * as React from 'react';
// Side-effect import so tsdown emits dist/style.css for the ./css export;
// stripped from the built JS, guarded by check:package
import '../styles/index.css';

const injected = new Set<string>();
const useStyleInsertionEffect =
  React.useInsertionEffect ?? React.useLayoutEffect;

const inject = (css: string, key: string) => {
  if (injected.has(key) || typeof document === 'undefined') return;
  injected.add(key);
  try {
    // Not governed by CSP style-src in current browsers, unlike the <style> fallback
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  } catch {
    const style = document.createElement('style');
    style.dataset.reactShiki = key;
    style.textContent = css;
    document.head.append(style);
  }
};

/** Installs component styles before layout without triggering a render. */
export const useComponentStyles = () => {
  useStyleInsertionEffect(() => {
    inject(componentCss, 'component');
  }, []);
};

/** Installs line-number/highlight styles only when those options are used. */
export const useFeatureStyles = (enabled: boolean) => {
  useStyleInsertionEffect(() => {
    if (enabled) inject(featuresCss, 'features');
  }, [enabled]);
};
