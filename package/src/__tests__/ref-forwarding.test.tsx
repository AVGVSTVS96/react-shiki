import React, { useRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { ShikiHighlighter } from '../index';

const codeSample = 'console.log("Hello World");';

describe('ShikiHighlighter Ref Forwarding', () => {
  test('forwards ref to the container element', async () => {
    let refCurrent: HTMLElement | null = null;
    
    const TestComponent = () => {
      const ref = useRef<HTMLPreElement>(null);
      
      React.useEffect(() => {
        refCurrent = ref.current;
      }, []);
      
      return (
        <ShikiHighlighter 
          ref={ref}
          language="javascript" 
          theme="github-light"
        >
          {codeSample}
        </ShikiHighlighter>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(refCurrent).not.toBeNull();
      expect(refCurrent?.tagName.toLowerCase()).toBe('pre');
      expect(refCurrent?.getAttribute('data-testid')).toBe('shiki-container');
    });
  });

  test('forwards ref to custom element when using "as" prop', async () => {
    let refCurrent: HTMLElement | null = null;
    
    const TestComponent = () => {
      const ref = useRef<HTMLDivElement>(null);
      
      React.useEffect(() => {
        refCurrent = ref.current;
      }, []);
      
      return (
        <ShikiHighlighter 
          ref={ref}
          language="javascript" 
          theme="github-light"
          as="div"
        >
          {codeSample}
        </ShikiHighlighter>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(refCurrent).not.toBeNull();
      expect(refCurrent?.tagName.toLowerCase()).toBe('div');
      expect(refCurrent?.getAttribute('data-testid')).toBe('shiki-container');
    });
  });

  test('ref provides access to DOM methods', async () => {
    let refCurrent: HTMLElement | null = null;
    
    const TestComponent = () => {
      const ref = useRef<HTMLPreElement>(null);
      
      React.useEffect(() => {
        refCurrent = ref.current;
      }, []);
      
      return (
        <ShikiHighlighter 
          ref={ref}
          language="javascript" 
          theme="github-light"
        >
          {codeSample}
        </ShikiHighlighter>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(refCurrent).not.toBeNull();
      expect(typeof refCurrent?.focus).toBe('function');
      expect(refCurrent?.tagName.toLowerCase()).toBe('pre');
    });
  });
});