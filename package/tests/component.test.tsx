import React, { useRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import {
  ShikiHighlighter,
  createJavaScriptRegexEngine,
} from '../src/index';

// Test fixtures
const codeSample = 'console.log("Hello World");';

// Test utilities
const getContainer = (container: HTMLElement) =>
  container.querySelector(
    '[data-testid="shiki-container"]'
  ) as HTMLElement | null;

const getLanguageLabel = (container: HTMLElement | null) =>
  container?.querySelector('#language-label') as HTMLElement | null;

describe('ShikiHighlighter Component', () => {
  describe('Component-specific Props', () => {
    test('renders with default pre element', async () => {
      const { container } = render(
        <ShikiHighlighter language="javascript" theme="github-light">
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const containerElement = getContainer(container);
        expect(containerElement).toBeInTheDocument();
        expect(containerElement?.tagName.toLowerCase()).toBe('pre');
      });
    });

    test('renders with custom element via "as" prop', async () => {
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

    test('shows language label by default', async () => {
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
        expect(langLabel?.id).toBe('language-label');
      });
    });

    test('hides language label when showLanguage is false', async () => {
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

    test('shows original language in label for unknown languages', async () => {
      const { container } = render(
        <ShikiHighlighter language="unknownlang" theme="github-light">
          {codeSample}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        const langLabel = getLanguageLabel(outerContainer);

        // Verify language label shows original language
        expect(langLabel).toBeInTheDocument();
        expect(langLabel?.textContent).toBe('unknownlang');
      });
    });

    test('applies custom className to container', async () => {
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
      });
    });

    test('applies custom style to container', async () => {
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
        expect(outerContainer).toHaveStyle('border: 1px solid red');
      });
    });

    test('applies custom className and style to language label', async () => {
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

        // Verify container styling
        expect(outerContainer).toHaveStyle('border: 1px solid red');
        expect(outerContainer?.className).toContain('custom-code-block');

        expect(langLabel).toHaveStyle('color: rgb(0, 0, 255)');
        expect(langLabel?.className).toContain('custom-lang-label');
      });
    });

    test('automatically uses dangerouslySetInnerHTML when outputFormat is html', async () => {
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
        const shikiContainer =
          container.querySelector('#shiki-container');
        expect(shikiContainer).toBeInTheDocument();

        // Should have a div with dangerouslySetInnerHTML
        const innerDiv = shikiContainer?.querySelector(':scope > div');
        expect(innerDiv).toBeInTheDocument();

        // Should still render highlighted code
        expect(container.querySelector('pre')).toBeInTheDocument();
        expect(container.querySelector('code')).toBeInTheDocument();
      });
    });
  });

  describe('Ref Forwarding', () => {
    const RefTestComponent = ({
      onRefSet,
      as,
    }: {
      onRefSet: (ref: HTMLElement | null) => void;
      as?: 'div' | 'pre';
    }) => {
      const ref = useRef<HTMLElement>(null);

      React.useEffect(() => {
        onRefSet(ref.current);
      }, [onRefSet]);

      return (
        <ShikiHighlighter
          ref={ref as any}
          language="javascript"
          theme="github-light"
          as={as}
        >
          {codeSample}
        </ShikiHighlighter>
      );
    };

    test('forwards ref to the default container element (pre)', async () => {
      let refCurrent: HTMLElement | null = null;

      render(
        <RefTestComponent
          onRefSet={(ref) => {
            refCurrent = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(refCurrent).not.toBeNull();
        expect(refCurrent?.tagName.toLowerCase()).toBe('pre');
        expect(refCurrent?.getAttribute('data-testid')).toBe(
          'shiki-container'
        );
      });
    });

    test('forwards ref to custom element when using "as" prop', async () => {
      let refCurrent: HTMLElement | null = null;

      render(
        <RefTestComponent
          onRefSet={(ref) => {
            refCurrent = ref;
          }}
          as="div"
        />
      );

      await waitFor(() => {
        expect(refCurrent).not.toBeNull();
        expect(refCurrent?.tagName.toLowerCase()).toBe('div');
        expect(refCurrent?.getAttribute('data-testid')).toBe(
          'shiki-container'
        );
      });
    });

    test('ref provides access to DOM methods', async () => {
      let refCurrent: HTMLElement | null = null;

      render(
        <RefTestComponent
          onRefSet={(ref) => {
            refCurrent = ref;
          }}
        />
      );

      await waitFor(() => {
        expect(refCurrent).not.toBeNull();
        expect(typeof refCurrent?.focus).toBe('function');
        expect(typeof refCurrent?.getBoundingClientRect).toBe('function');
        expect(refCurrent?.tagName.toLowerCase()).toBe('pre');
      });
    });
  });

  describe('Engine Configuration', () => {
    test('accepts custom engine prop and highlights code', async () => {
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
