import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ShikiHighlighter } from '../index';
import type { ShikiTransformer } from 'shiki';

const codeSample = 'console.log("Hello World");';

describe('ShikiHighlighter Component', () => {
  test('renders language label and highlighted code', async () => {
    const { container } = render(
      <ShikiHighlighter language="javascript" theme="github-light">
        {codeSample}
      </ShikiHighlighter>
    );

    // Query the language label using its id.
    await waitFor(() => {
      const langLabel = container.querySelector('#language-label');
      expect(langLabel).toBeInTheDocument();
      expect(langLabel?.textContent).toBe('javascript');
    });

    // Verify that the highlighted code is rendered.
    await waitFor(() => {
      const preElement = container.querySelector(
        'pre.shiki.github-light'
      );
      expect(preElement).toBeInTheDocument();
      expect(preElement?.textContent).toMatch(/console\.log/);
    });
  });

  test('does not render language label when showLanguage is false', async () => {
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
      const langLabel = container.querySelector('#language-label');
      expect(langLabel).toBeNull();
    });
  });

  test('renders with a custom wrapper element when "as" prop is provided', async () => {
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
      const containerElement = container.querySelector(
        '[data-testid="shiki-container"]'
      );
      expect(containerElement).toBeInTheDocument();
      expect(containerElement?.tagName.toLowerCase()).toBe('div');
    });
  });

  test('falls back to plaintext highlighting for unknown languages', async () => {
    const unknownLangCode = 'function test() { return true; }';
    const { container } = render(
      <ShikiHighlighter language="unknownlang" theme="github-light">
        {unknownLangCode}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      const outerContainer = container.querySelector(
        '[data-testid="shiki-container"]'
      );
      expect(outerContainer).toBeInTheDocument();

      const langLabel = outerContainer?.querySelector('#language-label');
      expect(langLabel).toBeInTheDocument();
      expect(langLabel?.textContent).toBe('unknownlang');

      const preElement = outerContainer?.querySelector(
        'pre.shiki.github-light'
      );
      expect(preElement).toBeInTheDocument();

      const codeElement = preElement?.querySelector('code');
      expect(codeElement).toBeInTheDocument();

      // Ensure the rendered code exactly matches the input.
      expect(preElement?.textContent).toBe(unknownLangCode);

      // Verify no inline-styled spans exist.
      const styledSpans = codeElement?.querySelectorAll('span[style]');
      expect(styledSpans?.length).toBe(0);
    });
  });


  test('applies custom transformers and custom styling props', async () => {
    const customCode = 'console.log("Custom transformer test");';
    // Transformer that adds a custom attribute to the <pre> tag.
    const addDataAttributeTransformer: ShikiTransformer = {
      pre(node) {
        node.properties = {
          ...node.properties,
          'data-custom': 'applied',
        };
      },
    };

    const customStyle = { border: '1px solid red' };
    const customLangStyle = { color: 'blue' };

    const { container } = render(
      <ShikiHighlighter
        language="javascript"
        theme="github-light"
        transformers={[addDataAttributeTransformer]}
        className="custom-code-block"
        langClassName="custom-lang-label"
        style={customStyle}
        langStyle={customLangStyle}
      >
        {customCode}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      // Check container custom style and class.
      const outerContainer = container.querySelector(
        '[data-testid="shiki-container"]'
      );
      expect(outerContainer).toHaveStyle('border: 1px solid red');
      expect(outerContainer?.className).toContain('custom-code-block');

      // Check language label custom style and class.
      const langLabel = outerContainer?.querySelector('#language-label');
      // The computed style for blue is rgb(0, 0, 255).
      expect(langLabel).toHaveStyle('color: rgb(0, 0, 255)');
      expect(langLabel?.className).toContain('custom-lang-label');

      // Verify that our custom transformer injected the data attribute on the inner <pre>.
      const innerPreElement = outerContainer?.querySelector(
        'pre.shiki.github-light'
      );
      expect(innerPreElement).toHaveAttribute('data-custom', 'applied');
    });
  });
});
