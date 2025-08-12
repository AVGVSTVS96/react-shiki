import React, { useRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { ShikiHighlighter } from '../index';
import type { ShikiTransformer } from 'shiki';

// Test fixtures
const codeSample = 'console.log("Hello World");';
const unknownLangCode = 'function test() { return true; }';
const customCode = 'console.log("Custom transformer test");';

// Test utilities
const getContainer = (container: HTMLElement) => 
  container.querySelector('[data-testid="shiki-container"]') as HTMLElement | null;

const getLanguageLabel = (container: HTMLElement | null) => 
  container?.querySelector('#language-label') as HTMLElement | null;

const getPreElement = (container: HTMLElement | null) => 
  container?.querySelector('pre.shiki.github-light') as HTMLPreElement | null;

describe('ShikiHighlighter', () => {
  describe('Rendering', () => {
    describe('Container Element', () => {
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
    });

    describe('Code Highlighting', () => {
      test('renders highlighted code with syntax highlighting', async () => {
      const { container } = render(
        <ShikiHighlighter language="javascript" theme="github-light">
          {codeSample}
        </ShikiHighlighter>
      );

        await waitFor(() => {
          const outerContainer = getContainer(container);
          const preElement = getPreElement(outerContainer);

          expect(preElement).toBeInTheDocument();
          expect(preElement?.textContent).toMatch(/console\.log/);
          
          // Verify syntax highlighting is applied
          const codeElement = preElement?.querySelector('code');
          const spans = codeElement?.querySelectorAll('span');
          expect(spans?.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Language Label', () => {
      test('renders language label by default', async () => {
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
    });
  });

  describe('Error Handling', () => {
    test('falls back to plaintext highlighting for unknown languages', async () => {
      const { container } = render(
        <ShikiHighlighter language="unknownlang" theme="github-light">
          {unknownLangCode}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        expect(outerContainer).toBeInTheDocument();

        const langLabel = getLanguageLabel(outerContainer);
        const preElement = getPreElement(outerContainer);
        const codeElement = preElement?.querySelector('code');

        // Verify language label shows original language
        expect(langLabel).toBeInTheDocument();
        expect(langLabel?.textContent).toBe('unknownlang');

        // Verify pre and code elements exist
        expect(preElement).toBeInTheDocument();
        expect(codeElement).toBeInTheDocument();

        // Ensure the rendered code exactly matches the input
        expect(preElement?.textContent).toBe(unknownLangCode);

        // Verify no syntax highlighting (no styled spans)
        const styledSpans = codeElement?.querySelectorAll('span[style]');
        expect(styledSpans?.length).toBe(0);
      });
    });
  });

  describe('Customization', () => {
    describe('Transformers', () => {
      test('applies custom shiki transformers', async () => {
      const addDataAttributeTransformer: ShikiTransformer = {
        pre(node) {
          node.properties = {
            ...node.properties,
            'data-custom': 'applied',
          };
        },
      };

      const { container } = render(
        <ShikiHighlighter
          language="javascript"
          theme="github-light"
          transformers={[addDataAttributeTransformer]}
        >
          {customCode}
        </ShikiHighlighter>
      );

      await waitFor(() => {
        const outerContainer = getContainer(container);
        const innerPreElement = getPreElement(outerContainer);
        expect(innerPreElement).toHaveAttribute('data-custom', 'applied');
      });
    });
    });

    describe('Styling', () => {
      test('applies custom className to container', async () => {
        const { container } = render(
          <ShikiHighlighter
            language="javascript"
            theme="github-light"
            className="custom-code-block"
          >
            {customCode}
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
            {customCode}
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
          {customCode}
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
    });
  });

  describe('Ref Forwarding', () => {
    const RefTestComponent = ({ 
    onRefSet, 
    as 
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
    
    render(<RefTestComponent onRefSet={(ref) => { refCurrent = ref; }} />);

    await waitFor(() => {
      expect(refCurrent).not.toBeNull();
      expect(refCurrent?.tagName.toLowerCase()).toBe('pre');
      expect(refCurrent?.getAttribute('data-testid')).toBe('shiki-container');
    });
    });

    test('forwards ref to custom element when using "as" prop', async () => {
    let refCurrent: HTMLElement | null = null;
    
    render(
      <RefTestComponent 
        onRefSet={(ref) => { refCurrent = ref; }} 
        as="div" 
      />
    );

    await waitFor(() => {
      expect(refCurrent).not.toBeNull();
      expect(refCurrent?.tagName.toLowerCase()).toBe('div');
      expect(refCurrent?.getAttribute('data-testid')).toBe('shiki-container');
    });
    });

    test('ref provides access to DOM methods', async () => {
    let refCurrent: HTMLElement | null = null;
    
    render(<RefTestComponent onRefSet={(ref) => { refCurrent = ref; }} />);

    await waitFor(() => {
      expect(refCurrent).not.toBeNull();
      expect(typeof refCurrent?.focus).toBe('function');
      expect(typeof refCurrent?.getBoundingClientRect).toBe('function');
      expect(refCurrent?.tagName.toLowerCase()).toBe('pre');
    });
    });
  });
});
