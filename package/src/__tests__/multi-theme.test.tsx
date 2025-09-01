import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useShikiHighlighter, ShikiHighlighter } from '../index';

// Test component with configurable options
const TestComponent = ({
  defaultColor,
  cssVariablePrefix,
}: {
  defaultColor?: string;
  cssVariablePrefix?: string;
}) => {
  const code = 'console.log("test");';
  const language = 'javascript';
  const themes = { light: 'github-light', dark: 'github-dark' };
  const options = {
    ...(defaultColor ? { defaultColor } : {}),
    ...(cssVariablePrefix ? { cssVariablePrefix } : {}),
  };

  const highlighted = useShikiHighlighter(
    code,
    language,
    themes,
    options
  );
  return <div data-testid="output">{highlighted}</div>;
};

describe('Multi-theme support', () => {
  test('when no defaultColor is passed, --shiki-dark should be present', async () => {
    const { getByTestId } = render(<TestComponent />);

    await waitFor(() => {
      const output = getByTestId('output');
      const pre = output.querySelector('pre');

      // Verify we have a shiki pre element
      expect(pre).toBeInTheDocument();
      expect(pre).toHaveClass('shiki');

      // Find spans with CSS variables
      const spans = output.querySelectorAll('span[style*="--shiki-"]');
      expect(spans.length).toBeGreaterThan(0);

      // Check that a span has --shiki-dark variable
      const span = spans[0];
      const style = span?.getAttribute('style');
      expect(style).toContain('--shiki-dark');
    });
  });

  test('when defaultColor is light, --shiki-dark should be present', async () => {
    const { getByTestId } = render(
      <TestComponent defaultColor="light" />
    );

    await waitFor(() => {
      const output = getByTestId('output');

      // Find spans with CSS variables
      const spans = output.querySelectorAll('span[style*="--shiki-"]');
      expect(spans.length).toBeGreaterThan(0);

      // Check that a span has --shiki-dark variable
      const span = spans[0];
      const style = span?.getAttribute('style');
      expect(style).toContain('--shiki-dark');
    });
  });

  test('when defaultColor is dark, --shiki-light should be present', async () => {
    const { getByTestId } = render(<TestComponent defaultColor="dark" />);

    await waitFor(() => {
      const output = getByTestId('output');

      // Find spans with CSS variables
      const spans = output.querySelectorAll('span[style*="--shiki-"]');
      expect(spans.length).toBeGreaterThan(0);

      // Check that a span has --shiki-light variable
      const span = spans[0];
      const style = span?.getAttribute('style');
      expect(style).toContain('--shiki-light');
    });
  });

  test('custom cssVariablePrefix should override default --shiki- prefix', async () => {
    const { getByTestId } = render(
      <TestComponent defaultColor="light" cssVariablePrefix="--custom-" />
    );

    await waitFor(() => {
      const output = getByTestId('output');

      // Find spans with custom CSS variables
      const spans = output.querySelectorAll('span[style*="--custom-"]');
      expect(spans.length).toBeGreaterThan(0);

      // Check that a span has --custom-dark variable and NOT --shiki-dark
      const span = spans[0];
      const style = span?.getAttribute('style');
      expect(style).toContain('--custom-dark');
      expect(style).not.toContain('--shiki-dark');
    });
  });
});

describe('ShikiHighlighter Component Multi-theme support', () => {
  const code = 'console.log("test");';
  const language = 'javascript';
  const themes = { light: 'github-light', dark: 'github-dark' };

  test('component with multi-themes should render CSS variables for non-default theme', async () => {
    const { container } = render(
      <ShikiHighlighter language={language} theme={themes}>
        {code}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      const shikiContainer = container.querySelector('[data-testid="shiki-container"]');
      expect(shikiContainer).toBeInTheDocument();

      const pre = shikiContainer?.querySelector('pre');
      expect(pre).toBeInTheDocument();
      expect(pre).toHaveClass('shiki');

      // Find spans with CSS variables
      const spans = container.querySelectorAll('span[style*="--shiki-"]');
      expect(spans.length).toBeGreaterThan(0);

      // When no defaultColor is specified, light is default, so we should have --shiki-dark
      const span = spans[0];
      const style = span?.getAttribute('style');
      expect(style).toContain('--shiki-dark');
      expect(style).not.toContain('--shiki-light'); // light is the default, so no CSS variable
    });
  });

  test('component with multi-themes and defaultColor=dark should show light variables', async () => {
    const { container } = render(
      <ShikiHighlighter
        language={language}
        theme={themes}
        defaultColor="dark"
      >
        {code}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      const spans = container.querySelectorAll('span[style*="--shiki-"]');
      expect(spans.length).toBeGreaterThan(0);

      // When defaultColor=dark, dark is default, so we should have --shiki-light
      const span = spans[0];
      const style = span?.getAttribute('style');
      expect(style).toContain('--shiki-light');
      expect(style).not.toContain('--shiki-dark'); // dark is the default, so no CSS variable
    });
  });

  test('component with multi-themes and custom cssVariablePrefix should work', async () => {
    const { container } = render(
      <ShikiHighlighter
        language={language}
        theme={themes}
        cssVariablePrefix="--custom-"
        defaultColor="light"
      >
        {code}
      </ShikiHighlighter>
    );

    await waitFor(() => {
      const spans = container.querySelectorAll('span[style*="--custom-"]');
      expect(spans.length).toBeGreaterThan(0);

      // When defaultColor=light, light is default, so we should have --custom-dark
      const span = spans[0];
      const style = span?.getAttribute('style');
      expect(style).toContain('--custom-dark');
      expect(style).not.toContain('--custom-light'); // light is the default, so no CSS variable
      expect(style).not.toContain('--shiki-');
    });
  });
});
