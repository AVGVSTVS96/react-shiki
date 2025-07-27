// Test the exact scenario from the GitHub issue
import React, { useRef } from 'react';
import { render, waitFor } from '@testing-library/react';
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

  test('ref enables DOM access for programmatic control', async () => {
    let refElement: HTMLElement | null = null;
    
    const ProgrammaticControlTest = () => {
      const ref = useRef<HTMLPreElement>(null);
      
      React.useEffect(() => {
        refElement = ref.current;
      }, []);

      return (
        <ShikiHighlighter
          ref={ref}
          language="javascript"
          theme="vesper"
          showLineNumbers={true}
          showLanguage={false}
          addDefaultStyles={true}
          className="code-block"
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

    render(<ProgrammaticControlTest />);
    
    await waitFor(() => {
      // Verify the ref provides access to DOM element for programmatic control
      expect(refElement).not.toBeNull();
      expect(refElement?.tagName.toLowerCase()).toBe('pre');
      expect(typeof refElement?.focus).toBe('function');
    });
  });
});