// Test the exact scenario from the GitHub issue
import React, { useRef } from 'react';
import { render } from '@testing-library/react';
import { ShikiHighlighter } from '../index';

// This exact code caused the TypeScript error in the issue
const TestOriginalIssue = () => {
  const ref = useRef<HTMLPreElement>(null);

  return (
    <ShikiHighlighter
      ref={ref} // This was causing: Property 'ref' does not exist on type 'IntrinsicAttributes & ShikiHighlighterProps'
      language="javascript"
      theme="vesper"
      showLineNumbers={true}
      showLanguage={false}
      addDefaultStyles={true}
      tabIndex={0} // Needed for keyboard navigation
      className="code-block"
    >
      console.log("Hello World");
    </ShikiHighlighter>
  );
};

describe('Original Issue Reproduction', () => {
  test('should support ref prop without TypeScript errors', () => {
    // This test verifies that the exact use case from the issue now works
    expect(() => {
      render(<TestOriginalIssue />);
    }).not.toThrow();
  });

  test('ref enables keyboard navigation use case', async () => {
    let refElement: HTMLElement | null = null;
    
    const KeyboardNavigationTest = () => {
      const ref = useRef<HTMLPreElement>(null);
      
      React.useEffect(() => {
        refElement = ref.current;
      }, []);

      // Simulate keyboard navigation handler
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (ref.current) {
          switch (e.key) {
            case 'ArrowLeft':
              ref.current.scrollLeft -= 20;
              break;
            case 'ArrowRight':
              ref.current.scrollLeft += 20;
              break;
            case 'ArrowUp':
              ref.current.scrollTop -= 20;
              break;
            case 'ArrowDown':
              ref.current.scrollTop += 20;
              break;
          }
        }
      };

      return (
        <ShikiHighlighter
          ref={ref}
          language="javascript"
          theme="vesper"
          showLineNumbers={true}
          showLanguage={false}
          addDefaultStyles={true}
          tabIndex={0}
          className="code-block"
          onKeyDown={handleKeyDown}
        >
          {`// Long code that requires scrolling
const veryLongVariableNameThatExtendsOffScreen = "This line is very long and will require horizontal scrolling";
console.log(veryLongVariableNameThatExtendsOffScreen);

// Multiple lines for vertical scrolling
console.log("Line 1");
console.log("Line 2");
console.log("Line 3");
console.log("Line 4");
console.log("Line 5");`}
        </ShikiHighlighter>
      );
    };

    render(<KeyboardNavigationTest />);
    
    // Verify the ref provides access to DOM element for keyboard navigation
    expect(refElement).not.toBeNull();
    expect(refElement?.tagName.toLowerCase()).toBe('pre');
    expect(refElement?.getAttribute('tabindex')).toBe('0');
    expect(typeof refElement?.focus).toBe('function');
  });
});