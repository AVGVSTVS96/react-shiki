import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useShikiHighlighter } from '../index';
import ShikiHighlighter from '../index';

// Hook-based test component
const TestHookComponent = ({
  //@ts-expect-error
  code,
  //@ts-expect-error
  language,
  theme = 'github-light',
  ...options
}) => {
  const highlighted = useShikiHighlighter(code, language, theme, options);
  return <div data-testid="highlighted">{highlighted}</div>;
};

describe('Shiki Rendering Options', () => {
  const sampleCode = 'const x = 1;\nconst y = 2;';

  test('passes mergeWhitespaces option to Shiki', async () => {
    const { getByTestId } = render(
      <TestHookComponent 
        code={sampleCode} 
        language="javascript" 
        mergeWhitespaces={false}
      />
    );

    await waitFor(() => {
      const container = getByTestId('highlighted');
      expect(container.querySelector('pre')).toBeInTheDocument();
      // We're primarily testing that the option doesn't break rendering
      // The actual whitespace behavior is Shiki's responsibility
    });
  });

  test('passes structure option to Shiki', async () => {
    const { getByTestId } = render(
      <TestHookComponent 
        code={sampleCode} 
        language="javascript" 
        structure="inline"
      />
    );

    await waitFor(() => {
      const container = getByTestId('highlighted');
      // With inline structure, there's no pre element
      const preElement = container.querySelector('pre');
      expect(preElement).not.toBeInTheDocument();
      // Instead, content is rendered with spans and br tags
      const brElement = container.querySelector('br');
      expect(brElement).toBeInTheDocument();
      // No .line spans with inline structure
      expect(container.querySelector('.line')).not.toBeInTheDocument();
    });
  });

  test('passes decorations option to Shiki', async () => {
    const decoration = {
      start: 0,
      end: 5,
      tagName: 'mark',
      properties: { class: 'highlighted' }
    };

    const { getByTestId } = render(
      <TestHookComponent 
        code={sampleCode} 
        language="javascript" 
        decorations={[decoration]}
      />
    );

    await waitFor(() => {
      const container = getByTestId('highlighted');
      const markElement = container.querySelector('mark.highlighted');
      expect(markElement).toBeInTheDocument();
    });
  });

  test('component accepts rendering options', async () => {
    const { container } = render(
      <ShikiHighlighter 
        language="javascript" 
        theme="github-light"
        mergeWhitespaces={false}
        structure="inline"
      >
        {sampleCode}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      // Just verify the component renders without errors when options are passed
      const shikiContainer = container.querySelector('[data-testid="shiki-container"]');
      expect(shikiContainer).toBeInTheDocument();
    });
  });
});
