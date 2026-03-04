import React from 'react';
import { render } from '@testing-library/react';
import { describe, test, expect } from 'vitest';
import type { ThemedToken } from 'shiki';

import { ShikiTokenRenderer } from '../src/lib/stream-renderer';

const makeToken = (content: string, color = '#000'): ThemedToken =>
  ({
    content,
    color,
    offset: 0,
  }) as ThemedToken;

describe('ShikiTokenRenderer', () => {
  test('renders empty tokens without error', () => {
    const { container } = render(<ShikiTokenRenderer tokens={[]} />);
    expect(container.querySelector('code')).toBeTruthy();
  });

  test('renders tokens with exact text content', () => {
    const tokens = [
      makeToken('const ', '#ff0000'),
      makeToken('x', '#00ff00'),
      makeToken(' = 1', '#0000ff'),
    ];
    const { container } = render(<ShikiTokenRenderer tokens={tokens} />);
    expect(container.textContent).toBe('const x = 1');
  });

  test('renders flat code > span structure', () => {
    const tokens = [
      makeToken('a', '#f00'),
      makeToken('\n', '#000'),
      makeToken('b', '#0f0'),
    ];
    const { container } = render(<ShikiTokenRenderer tokens={tokens} />);

    const code = container.querySelector('code');
    expect(code).toBeTruthy();
    expect(code?.querySelector('.line')).toBeNull();

    const directSpans = code?.querySelectorAll(':scope > span') ?? [];
    expect(directSpans).toHaveLength(3);
    expect(container.textContent).toBe('a\nb');
  });

  test('applies className and style to code element', () => {
    const tokens = [makeToken('hello', '#000')];
    const { container } = render(
      <ShikiTokenRenderer
        tokens={tokens}
        className="custom-class"
        style={{ backgroundColor: 'red' }}
      />
    );

    const code = container.querySelector('code');
    expect(code?.classList.contains('custom-class')).toBe(true);
    expect(code?.style.backgroundColor).toBe('red');
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

    const span = container.querySelector(
      'code > span'
    ) as HTMLElement | null;
    expect(span).toBeTruthy();
    expect(span?.style.color).toBe('rgb(255, 0, 0)');
    expect(span?.style.getPropertyValue('--shiki-dark')).toBe('#00ff00');
  });
});
