import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { Highlighter } from 'shiki';

import { useShikiStreamHighlighter } from '../src/index';
import type {
  ShikiStreamInput,
  StreamHighlighterResult,
} from '../src/lib/stream-types';
import type { Language, Theme, Themes } from '../src/lib/types';

export interface StreamHarnessHandle {
  setInput: (value: ShikiStreamInput) => void;
  setLanguage: (value: Language) => void;
  setTheme: (value: Theme | Themes) => void;
  getResult: () => StreamHighlighterResult;
  getStatusSequence: () => string[];
  getRenderCommits: () => number;
  getStartCount: () => number;
  getEndCount: () => number;
}

export interface StreamHarnessProps {
  highlighter: Highlighter;
  initialInput: ShikiStreamInput;
  initialLanguage?: Language;
  initialTheme?: Theme | Themes;
  allowRecalls?: boolean;
}

export const StreamHarness = forwardRef<
  StreamHarnessHandle,
  StreamHarnessProps
>(function StreamHarness(
  {
    highlighter,
    initialInput,
    initialLanguage = 'tsx',
    initialTheme = 'github-dark',
    allowRecalls,
  },
  ref
) {
  const [input, setInput] = useState<ShikiStreamInput>(initialInput);
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [theme, setTheme] = useState<Theme | Themes>(initialTheme);

  const statusSequenceRef = useRef<string[]>([]);
  const renderCommitsRef = useRef(0);
  const startCountRef = useRef(0);
  const endCountRef = useRef(0);

  const result = useShikiStreamHighlighter(input, language, theme, {
    highlighter,
    allowRecalls,
    onStreamStart: () => {
      startCountRef.current += 1;
    },
    onStreamEnd: () => {
      endCountRef.current += 1;
    },
  });

  useEffect(() => {
    const statuses = statusSequenceRef.current;
    if (statuses[statuses.length - 1] !== result.status) {
      statuses.push(result.status);
    }
  }, [result.status]);

  useEffect(() => {
    renderCommitsRef.current += 1;
  }, [result.tokens]);

  useImperativeHandle(
    ref,
    () => ({
      setInput,
      setLanguage,
      setTheme,
      getResult: () => result,
      getStatusSequence: () => [...statusSequenceRef.current],
      getRenderCommits: () => renderCommitsRef.current,
      getStartCount: () => startCountRef.current,
      getEndCount: () => endCountRef.current,
    }),
    [result]
  );

  return (
    <div>
      <span data-testid="content">
        {result.tokens.map((t) => t.content).join('')}
      </span>
      <span data-testid="status">{result.status}</span>
    </div>
  );
});

export const flushReact = async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};
