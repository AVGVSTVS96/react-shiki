import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ShikiHighlighter } from '../ShikiHighlighter';

const codeSample = 'console.log("Hello World");';

describe('ShikiHighlighter Component', () => {
  test('renders language label and highlighted code', async () => {
    render(
      <ShikiHighlighter language="javascript" theme={"github-light"}>
        {codeSample}
      </ShikiHighlighter>
    );

    // Verify that the language label element (with id "language-label") is present and has the correct text.
    await waitFor(() => {
      const langLabel = document.getElementById('language-label');
      expect(langLabel).toBeInTheDocument();
      expect(langLabel?.textContent).toBe('javascript');
    });

    // Wait for the asynchronous highlighted code to be rendered.
    await waitFor(() => {
      const highlightedContainer = document.querySelector('.shiki');
      expect(highlightedContainer).toBeInTheDocument();
      expect(highlightedContainer?.textContent).toMatch(/console\.log/);
    });
  });

  test('does not render language label when showLanguage is false', async () => {
    render(
      <ShikiHighlighter language="javascript" theme={"github-light"} showLanguage={false}>
        {codeSample}
      </ShikiHighlighter>
    );

    // Confirm that the language label is not rendered.
    await waitFor(() => {
      const langLabel = document.getElementById('language-label');
      expect(langLabel).toBeNull();
    });
  });

  test('renders with a custom wrapper element when "as" prop is provided', async () => {
    render(
      <ShikiHighlighter language="javascript" theme={"github-light"} as="div">
        {codeSample}
      </ShikiHighlighter>
    );

    // Wait until the container element with id "shiki-container" is available.
    await waitFor(() => {
      const containerElement = document.getElementById('shiki-container');
      expect(containerElement).toBeInTheDocument();
      expect(containerElement?.tagName.toLowerCase()).toBe('div');
    });
  });

  test('gracefully fallback to plaintext for unknown languages', async () => {
    const unknownLangCode = 'function test() { return true; }';
    
    render(
      <ShikiHighlighter language="unknownlang" theme={"github-light"}>
        {unknownLangCode}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      const highlightedContainer = document.querySelector('.shiki');
      expect(highlightedContainer).toBeInTheDocument();
      expect(highlightedContainer?.textContent).toBe(unknownLangCode);
    });

    // Verify language label still shows the unknown language
    const langLabel = document.getElementById('language-label');
    expect(langLabel?.textContent).toBe('unknownlang');
  });
});

