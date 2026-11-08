import { expect, describe, it } from 'vitest';
import type { Element, Root } from 'hast';
import {
  isInlineCode,
  rehypeInlineCodeProperty,
} from '../src/lib/plugins';

const codeElement = (text: string): Element => ({
  type: 'element',
  tagName: 'code',
  properties: {},
  children: [{ type: 'text', value: text }],
});

const treeWith = (parentTagName: string, code: Element): Root => ({
  type: 'root',
  children: [
    {
      type: 'element',
      tagName: parentTagName,
      properties: {},
      children: [code],
    },
  ],
});

describe(isInlineCode, () => {
  it('returns true for inline code (no newline in text)', () => {
    const inlineNode = codeElement('console.log("Hello inline world!");');

    expect(isInlineCode(inlineNode)).toBe(true);
  });

  it('returns false for code fences (text contains newline)', () => {
    const blockNode = codeElement(
      'console.log("Line 1");\nconsole.log("Line 2");'
    );

    expect(isInlineCode(blockNode)).toBe(false);
  });
});

describe(rehypeInlineCodeProperty, () => {
  it('adds the inline property to <code> elements that are not inside <pre>', () => {
    const code = codeElement('inline code');

    rehypeInlineCodeProperty()(treeWith('p', code));

    expect(code.properties.inline).toBe(true);
  });

  it('does not add the inline property to <code> elements inside <pre>', () => {
    const code = codeElement('block code');

    rehypeInlineCodeProperty()(treeWith('pre', code));

    expect(code.properties.inline).toBeUndefined();
  });
});
