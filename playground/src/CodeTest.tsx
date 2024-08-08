import ShikiHighlighter from 'react-shiki';
import React from 'react';
import './App.css';

function MoreExamples() {
  return (
    <>
      {' '}
      <h2>More Examples</h2>
      <ShikiHighlighter language="tsx" theme="catppuccin-mocha">
        {`
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
      <ShikiHighlighter language="tsx" theme="poimandres">
        {`
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
      <ShikiHighlighter language="tsx" theme="snazzy-light">
        {`
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
      <ShikiHighlighter language="tsx" theme="vesper">
        {`
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
      <ShikiHighlighter language="tsx" theme="vitesse-light">
        {`
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
      <ShikiHighlighter language="tsx" theme="synthwave-84">
        {`
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
      <ShikiHighlighter language="tsx" theme="catppuccin-latte">
        {`
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
      <ShikiHighlighter language="tsx" theme="night-owl">
        {`
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
    </>
  );
}

function AyuDark() {
  const code = `
function CodeBlock() {
  return (
    <ShikiHighlighter language="jsx" theme="ayu-dark">
      {code.trim()}
    </ShikiHighlighter>
  );
}
    `;
  return (
    <ShikiHighlighter
      language="jsx"
      theme="ayu-dark"
      as="div"
      style={{
        textAlign: 'left',
      }}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
}

function Houston() {
  const code = `
function Houston() {
  return (
    <ShikiHighlighter
      language="jsx"
      theme="houston"
      showLanguage={false}
      addDefaultStyles={true}
      as="div"
      style={{
        textAlign: 'left',
      }}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
}
    `;
  return (
    <ShikiHighlighter
      language="jsx"
      theme="houston"
      showLanguage={false}
      style={{
        textAlign: 'left',
      }}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
}

export const HighlightCodeBlocks = React.memo(() => {
  return (
    <div style={{ textAlign: 'left', maxWidth: '65ch' }}>
      <div
        style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeeba',
          color: '#856404',
          padding: '15px',
          borderRadius: '5px',
          marginBottom: '20px',
        }}
      >
        <strong>WARNING:</strong> This package is still a work in
        progress, it is not yet recommended for production use.
        Contributions are welcome! My goal is to eventually build this out
        as a near-drop-in replacement for{' '}
        <code>react-syntax-highlighter</code>
      </div>

      <p>
        See the{'  '}
        <a href="https://github.com/avgvstvs96/react-shiki">
          GitHub repository
        </a>{' '}
        for source code and more information!
      </p>

      <h2>Features</h2>
      <ul>
        <li>
          🖼️ Provides a <code>ShikiHighlighter</code> component for
          highlighting code as children, as well as a{' '}
          <code>useShikiHighlighter</code> hook for more flexibility
        </li>
        <li>
          🔐 No <code>dangerouslySetInnerHTML</code>, output from Shiki is
          parsed using <code>html-react-parser</code>
        </li>
        <li>📦 Supports all Shiki languages and themes</li>
        <li>📚 Includes minimal default styles for code blocks</li>
        <li>
          🚀 Shiki dynamically imports only the languages and themes used
          on a page, optimizing for performance
        </li>
        <li>
          🖥️ <code>ShikiHighlighter</code> component displays a language
          label for each code block when <code>showLanguage</code> is set
          to <code>true</code> (default)
        </li>
        <li>
          🎨 Users can customize the styling of the generated code blocks
          by passing a <code>style</code> object or a{' '}
          <code>className</code>
        </li>
      </ul>

      <h2>Installation</h2>
      <ShikiHighlighter language="bash" theme="tokyo-night">
        {'[pnpm|bun|yarn|npm] [add|install] react-shiki'}
      </ShikiHighlighter>

      <h2>Usage</h2>
      <p>
        You can use the <code>ShikiHighlighter</code> component, or the{' '}
        <code>useShikiHighlighter</code> hook to highlight code.
      </p>

      <p>
        <code>useShikiHighlighter</code> is a hook that takes in the code
        to be highlighted, the language, and the theme, and returns the
        highlighted code as React elements. It's useful for users who want
        full control over the rendering of highlighted code.
      </p>
      <ShikiHighlighter language="tsx" theme="andromeeda">
        {
          'const highlightedCode = useShikiHighlighter(code, language, theme);'
        }
      </ShikiHighlighter>

      <p>
        The <code>ShikiHighlighter</code> component is imported in your
        project, with the code to be highlighted passed as its children.
      </p>

      <p>
        Shiki automatically handles dynamically importing only the
        languages and themes used on the page.
      </p>

      <AyuDark />

      <p style={{ marginTop: '1.5rem', marginBottom: '-0.5rem' }}>
        The component accepts several props in addition to language and
        theme:
      </p>
      <ul style={{ marginBottom: '1.5rem' }}>
        <li>
          <code>showLanguage: boolean</code> - Shows the language name in
          the top right corner of the code block.
        </li>
        <li>
          <code>addDefaultStyles: boolean</code> - Adds default styles to
          the top right corner of the code block.
        </li>
        <li>
          <code>as: string</code> - The component to be rendered. Defaults
          to 'pre'.
        </li>
        <li>
          <code>className: string</code> - Class name to be passed to the
          component.
        </li>
        <li>
          <code>style: object</code> - Style object to be passed to the
          component.
        </li>
      </ul>
      <Houston />
      <p>
        It can also be used with <code>react-markdown</code>:
      </p>
      <ShikiHighlighter language="tsx" theme="vitesse-black">
        {`
import type { ReactNode } from 'react';
import type { BundledLanguage } from 'shiki';
import ShikiHighlighter, { isInlineCode, type Element } from 'react-shiki';

interface CodeHighlightProps {
  className?: string | undefined;
  children?: ReactNode | undefined;
  node?: Element | undefined;
}

export const CodeHighlight = ({
  className,
  children,
  node,
  ...props
}: CodeHighlightProps): JSX.Element => {
  const match = className?.match(/language-(\\w+)/);
  // TODO: remove need for consumer use of BundledLanguage from shiki
  const language = match ? (match[1] as BundledLanguage) : undefined;

  const isInline: boolean | undefined = node ? isInlineCode(node) : undefined;

  return !isInline ? (
    <ShikiHighlighter
      language={language as BundledLanguage}
      theme={'houston'}
      {...props}>
      {String(children)}
    </ShikiHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};`.trim()}
      </ShikiHighlighter>
      <p>
        Pass CodeHighlight to <code>react-markdown</code> as a code
        component:
      </p>
      <ShikiHighlighter language="tsx" theme="rose-pine-moon">
        {`
import ReactMarkdown from 'react-markdown';
import { CodeHighlight } from './CodeHighlight';

<ReactMarkdown
  components={{
    code: CodeHighlight,
  }}
>
  {markdown}
</ReactMarkdown>`.trim()}
      </ShikiHighlighter>
      <p>
        This works great for highlighting in realtime on the client, I use
        it for an LLM chatbot UI, it renders markdown and highlights code
        in memoized chat messages:
      </p>
      <ShikiHighlighter language="tsx" theme="material-theme-ocean">
        {`const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className='space-y-4'>
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};`.trim()}
      </ShikiHighlighter>
      <MoreExamples />
    </div>
  );
});
