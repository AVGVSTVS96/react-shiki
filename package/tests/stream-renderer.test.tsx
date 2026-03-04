import React from 'react';
import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import type { ThemedToken } from 'shiki';

import { ShikiTokenRenderer } from '../src/lib/stream-renderer';

const makeToken = (
  content: string,
  color = '#000'
): ThemedToken =>
  ({
    content,
    color,
    offset: 0,
  }) as ThemedToken;

describe('ShikiTokenRenderer', () => {
  test('renders empty tokens without error', () => {
    const { container } = render(<ShikiTokenRenderer tokens={[]} />);
    const code = container.querySelector('code');
    expect(code).toBeTruthy();
  });

  test('renders tokens with correct content', () => {
    const tokens = [
      makeToken('const ', '#ff0000'),
      makeToken('x', '#00ff00'),
      makeToken(' = 1', '#0000ff'),
    ];
    const { container } = render(<ShikiTokenRenderer tokens={tokens} />);
    expect(container.textContent).toContain('const x = 1');
  });

  test('renders code > span.line > span[style] structure', () => {
    const tokens = [makeToken('hello', '#ff0000')];
    const { container } = render(<ShikiTokenRenderer tokens={tokens} />);

    const code = container.querySelector('code');
    expect(code).toBeTruthy();

    const lines = code!.querySelectorAll('span.line');
    expect(lines.length).toBe(1);

    const tokenSpans = lines[0].querySelectorAll('span');
    expect(tokenSpans.length).toBe(1);
    expect(tokenSpans[0].textContent).toBe('hello');
    expect(tokenSpans[0].style.color).toBe('rgb(255, 0, 0)');
  });

  test('splits multi-line tokens into separate lines', () => {
    const tokens = [
      makeToken('line1\nline2\nline3', '#000'),
    ];
    const { container } = render(<ShikiTokenRenderer tokens={tokens} />);

    const lines = container.querySelectorAll('span.line');
    expect(lines.length).toBe(3);
    expect(lines[0].textContent).toContain('line1');
    expect(lines[1].textContent).toContain('line2');
    expect(lines[2].textContent).toContain('line3');
  });

  test('handles tokens with newline boundaries', () => {
    const tokens = [
      makeToken('a', '#f00'),
      makeToken('\n', '#000'),
      makeToken('b', '#0f0'),
    ];
    const { container } = render(<ShikiTokenRenderer tokens={tokens} />);

    const lines = container.querySelectorAll('span.line');
    expect(lines.length).toBe(2);
  });

  test('adds has-line-numbers class when showLineNumbers is true', () => {
    const tokens = [makeToken('hello', '#000')];
    const { container } = render(
      <ShikiTokenRenderer tokens={tokens} showLineNumbers />
    );

    const code = container.querySelector('code');
    expect(code!.classList.contains('has-line-numbers')).toBe(true);
  });

  test('adds line-numbers class to each line span when showLineNumbers is true', () => {
    const tokens = [makeToken('a\nb', '#000')];
    const { container } = render(
      <ShikiTokenRenderer tokens={tokens} showLineNumbers />
    );

    const lines = container.querySelectorAll('span.line');
    for (const line of lines) {
      expect(line.classList.contains('line-numbers')).toBe(true);
    }
  });

  test('sets --line-start CSS variable for custom startingLineNumber', () => {
    const tokens = [makeToken('hello', '#000')];
    const { container } = render(
      <ShikiTokenRenderer
        tokens={tokens}
        showLineNumbers
        startingLineNumber={5}
      />
    );

    const code = container.querySelector('code');
    expect(code!.style.getPropertyValue('--line-start')).toBe('5');
  });

  test('does not set --line-start when startingLineNumber is 1', () => {
    const tokens = [makeToken('hello', '#000')];
    const { container } = render(
      <ShikiTokenRenderer
        tokens={tokens}
        showLineNumbers
        startingLineNumber={1}
      />
    );

    const code = container.querySelector('code');
    expect(code!.style.getPropertyValue('--line-start')).toBe('');
  });

  test('applies className to code element', () => {
    const tokens = [makeToken('hello', '#000')];
    const { container } = render(
      <ShikiTokenRenderer tokens={tokens} className="custom-class" />
    );

    const code = container.querySelector('code');
    expect(code!.classList.contains('custom-class')).toBe(true);
  });

  test('applies style to code element', () => {
    const tokens = [makeToken('hello', '#000')];
    const { container } = render(
      <ShikiTokenRenderer
        tokens={tokens}
        style={{ backgroundColor: 'red' }}
      />
    );

    const code = container.querySelector('code');
    expect(code!.style.backgroundColor).toBe('red');
  });

  test('handles htmlStyle (multi-theme) tokens', () => {
    const tokens = [
      {
        content: 'hello',
        offset: 0,
        htmlStyle: { color: '#ff0000', '--shiki-dark': '#00ff00' },
      } as ThemedToken,
    ];
    const { container } = render(<ShikiTokenRenderer tokens={tokens} />);

    const span = container.querySelector('span.line span');
    expect(span).toBeTruthy();
    expect(span!.style.color).toBe('rgb(255, 0, 0)');
    expect(span!.style.getPropertyValue('--shiki-dark')).toBe('#00ff00');
  });
});
