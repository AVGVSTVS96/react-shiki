import { createRef } from 'react';
import { vi, describe, expect, it } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import {
  ShikiHighlighter,
  createJavaScriptRegexEngine,
} from '../src/index';
import type {
  LanguageRegistration,
  ShikiHighlighterProps,
} from '../src/index';
import { outOfType } from './fakes';

const codeSample = 'console.log("Hello World");';

const getContainer = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[data-slot="container"]');

const getLanguageLabel = (container: HTMLElement | null) =>
  container?.querySelector<HTMLElement>('[data-slot="language-label"]');

describe('ShikiHighlighter Component', () => {
  describe('Component-specific Props', () => {
    it('renders with default div element', async () => {
      const { container } = render(
        <ShikiHighlighter language="javascript" theme="github-light">
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const containerElement = getContainer(container);
        expect(containerElement).toBeInTheDocument();
        expect(containerElement?.tagName.toLowerCase()).toBe('div');
        expect(containerElement).toHaveClass('rs-root');
        expect(containerElement).toHaveClass('rs-default-styles');
        expect(containerElement).not.toHaveClass('relative');
      });
    });

    it('renders with custom element via "as" prop', async () => {
      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-light"
          as="div"
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const containerElement = getContainer(container);
        expect(containerElement).toBeInTheDocument();
        expect(containerElement?.tagName.toLowerCase()).toBe('div');
      });
    });

    it('shows language label by default, without an id so several code blocks never duplicate one', async () => {
      const { container } = render(
        <ShikiHighlighter language="javascript" theme="github-light">
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        const langLabel = getLanguageLabel(outerContainer);

        expect(langLabel).toBeInTheDocument();
        expect(langLabel?.textContent).toBe('javascript');
        expect(langLabel?.id).toBe('');
      });
    });

    it('hides language label when showLanguage is false', async () => {
      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-light"
          showLanguage={false}
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        const langLabel = getLanguageLabel(outerContainer);
        expect(langLabel).toBeNull();
      });
    });

    it('keeps original alias string in label while highlighting alias target', async () => {
      const { container } = render(
        <ShikiHighlighter
          language="golang"
          theme="github-light"
          langAlias={{ golang: 'go' }}
        >
          package main
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        const langLabel = getLanguageLabel(outerContainer);

        const highlightedKeyword = [
          ...(outerContainer?.querySelectorAll('span') ?? []),
        ].find((span) => span.textContent === 'package');

        expect(langLabel).toBeInTheDocument();
        expect(langLabel?.textContent).toBe('golang');
        expect(highlightedKeyword).toHaveStyle('color: #D73A49');
      });
    });

    it('shows original language in label for unknown languages', async () => {
      const { container } = render(
        <ShikiHighlighter language="unknownlang" theme="github-light">
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        const langLabel = getLanguageLabel(outerContainer);

        expect(langLabel).toBeInTheDocument();
        expect(langLabel?.textContent).toBe('unknownlang');
      });
    });

    it('uses language object name for label rendering', async () => {
      const customLanguage: LanguageRegistration = {
        name: 'my-language',
        scopeName: 'source.my-language',
        patterns: [],
        repository: {},
      };

      const { container } = render(
        <ShikiHighlighter language={customLanguage} theme="github-light">
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        const langLabel = getLanguageLabel(outerContainer);

        expect(langLabel).toBeInTheDocument();
        expect(langLabel?.textContent).toBe('my-language');
      });
    });

    it('applies custom className to container', async () => {
      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-light"
          className="custom-code-block"
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        expect(outerContainer?.className).toContain('custom-code-block');
        expect(outerContainer).toHaveClass('rs-root');
      });
    });

    it('applies custom style to container', async () => {
      const customStyle = { border: '1px solid red' };

      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-light"
          style={customStyle}
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        expect(outerContainer?.style.border).toBe('1px solid red');
      });
    });

    it('applies custom className and style to language label', async () => {
      const customStyle = { border: '1px solid red' };
      const customLangStyle = { color: 'blue' };

      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-light"
          className="custom-code-block"
          langClassName="custom-lang-label"
          style={customStyle}
          langStyle={customLangStyle}
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        const langLabel = getLanguageLabel(outerContainer);

        expect(outerContainer?.style.border).toBe('1px solid red');
        expect(outerContainer?.className).toContain('custom-code-block');

        expect(langLabel).toHaveStyle('color: rgb(0, 0, 255)');
        expect(langLabel?.className).toContain('custom-lang-label');
        expect(langLabel).toHaveClass('rs-language-label');
      });
    });

    it('automatically uses dangerouslySetInnerHTML when outputFormat is html', async () => {
      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-dark"
          outputFormat="html"
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const shikiContainer = getContainer(container);
        expect(shikiContainer).toBeInTheDocument();

        const innerDiv =
          shikiContainer?.querySelector<HTMLElement>(':scope > div');

        expect(innerDiv).toBeInTheDocument();
        expect(innerDiv?.dataset.slot).toBe('content');

        expect(container.querySelector('pre')).toBeInTheDocument();
        expect(container.querySelector('code')).toBeInTheDocument();
      });
    });

    it('warns and falls back to react output when outputFormat is tokens', async () => {
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-dark"
          outputFormat={outOfType<ShikiHighlighterProps['outputFormat']>(
            'tokens'
          )}
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining("outputFormat 'tokens'")
        );

        const shikiContainer = getContainer(container);
        expect(
          shikiContainer?.querySelector('pre.shiki')
        ).toBeInTheDocument();
        expect(shikiContainer?.querySelector('code')).toBeInTheDocument();
      });

      warnSpy.mockRestore();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to the default container element (div)', async () => {
      const ref = createRef<HTMLElement>();

      render(
        <ShikiHighlighter
          ref={ref}
          language="javascript"
          theme="github-light"
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        expect(ref.current).not.toBeNull();
        expect(ref.current?.tagName.toLowerCase()).toBe('div');
        expect(ref.current?.dataset.slot).toBe('container');
      });
    });

    it('forwards ref to custom element when using "as" prop', async () => {
      const ref = createRef<HTMLElement>();

      render(
        <ShikiHighlighter
          ref={ref}
          language="javascript"
          theme="github-light"
          as="div"
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        expect(ref.current).not.toBeNull();
        expect(ref.current?.tagName.toLowerCase()).toBe('div');
        expect(ref.current?.dataset.slot).toBe('container');
      });
    });

    it('ref provides access to DOM methods', async () => {
      const ref = createRef<HTMLElement>();

      render(
        <ShikiHighlighter
          ref={ref}
          language="javascript"
          theme="github-light"
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        expect(ref.current).not.toBeNull();
        expect(ref.current).toBeInstanceOf(HTMLElement);
        expect(() => {
          ref.current?.focus();
        }).not.toThrow();
        expect(ref.current?.getBoundingClientRect()).toBeDefined();
        expect(ref.current?.tagName.toLowerCase()).toBe('div');
      });
    });
  });

  describe('Engine Configuration', () => {
    it('accepts custom engine prop and highlights code', async () => {
      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-dark"
          engine={createJavaScriptRegexEngine()}
        >
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const shikiContainer = getContainer(container);
        expect(shikiContainer).toBeInTheDocument();

        const code = shikiContainer?.querySelector('code');
        const spans = code?.querySelectorAll('span');
        expect(spans?.length).toBeGreaterThan(0);
      });
    });
  });
});
