import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { useShikiHighlighter } from '../useShiki';
import type { Theme } from '../types';

// Test component with configurable options
const TestComponent = ({ defaultColor }: {defaultColor?: string}) => {
  const code = 'console.log("test");';
  const language = 'javascript';
  const themes = { light: 'github-light', dark: 'github-dark' };
  const options = defaultColor ? { defaultColor } : {};
  
  const highlighted = useShikiHighlighter(code, language, themes as Theme, options);
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
    const { getByTestId } = render(<TestComponent defaultColor="light" />);
    
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
});
