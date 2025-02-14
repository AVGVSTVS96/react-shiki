import { isInlineCode, rehypeInlineCodeProperty } from '../utils';

describe('isInlineCode', () => {
  it('returns true for inline code (no newline in text)', () => {
    // Mock a node representing inline code.
    const inlineNode = {
      children: [
        { type: 'text', value: 'console.log("Hello inline world!");' },
      ],
    };
    expect(isInlineCode(inlineNode as any)).toBe(true);
  });

  it('returns false for code fences (text contains newline)', () => {
    // Mock a node representing block (fenced) code.
    const blockNode = {
      children: [
        {
          type: 'text',
          value: 'console.log("Line 1");\nconsole.log("Line 2");',
        },
      ],
    };
    expect(isInlineCode(blockNode as any)).toBe(false);
  });
});

describe('rehypeInlineCodeProperty', () => {
  it('adds the inline property to <code> elements that are not inside <pre>', () => {
    // Mock a tree where a <code> element is inside a <p>.
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {},
              children: [
                { type: 'text', value: 'inline code' },
              ],
            },
          ],
        },
      ],
    };

    // Run the plugin.
    const plugin = rehypeInlineCodeProperty();
    plugin(tree as any);

    // Locate the <code> element.
    const codeElement = tree?.children[0]?.children[0];
    expect(codeElement?.tagName).toBe('code');
    // @ts-expect-error
    expect(codeElement?.properties.inline).toBe(true);
  });

  it('does not add the inline property to <code> elements inside <pre>', () => {
    // Simulate a tree where a <code> element is inside a <pre> element.
    const tree = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {},
              children: [
                { type: 'text', value: 'block code' },
              ],
            },
          ],
        },
      ],
    };

    // Run the plugin.
    const plugin = rehypeInlineCodeProperty();
    plugin(tree as any);

    // Locate the <code> element inside <pre>.
    const preElement = tree.children[0];
    const codeElement = preElement?.children[0];
    expect(codeElement?.tagName).toBe('code');
    // Since the code element is inside a <pre>, it should not have an inline property.
    // @ts-expect-error
    expect(codeElement?.properties.inline).toBeUndefined();
  });
});
