import ShikiHighlighter from 'react-shiki';
import React from 'react';
import './App.css';

export const HighlightCodeBlocks = React.memo(() => {
  function AyuDark() {
    const code = `
function AyuDark() {
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

  function CatppuccinMocha() {
    const code = `
function CatpuccinMocha() {
  return (
    <ShikiHighlighter language="jsx" theme="catppuccin-mocha">
      {code.trim()}
    </ShikiHighlighter>
  );
}
  `;
    return (
      <ShikiHighlighter
        language="jsx"
        theme="catppuccin-mocha"
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

  return (
    <div style={{ textAlign: 'left', maxWidth: '65ch' }}>
      <h3>Usage</h3>
      <AyuDark />
      <p style={{ marginTop: '1.5rem' }}>
        The ShikiHighlighter is imported in your project and used as a
        component, with code to be highlighted passed as children.
      </p>
      <p style={{ marginBottom: '1.5rem' }}>
        Shiki handles dynamically imports only the languages and themes
        used on the page.
      </p>
      <CatppuccinMocha />
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
          <code>style: object</code> - Style object to be passed to the
          component.
        </li>
        <li>
          <code>as: string</code> - The component to be rendered. Defaults
          to 'pre'.
        </li>
        <li>
          <code>className: string</code> - Class name to be passed to the
          component.
        </li>
      </ul>
      <Houston />
      <p>
        It can also be used with <code>react-markdown</code>
      </p>
      <ShikiHighlighter language="jsx" theme="vitesse-black">
        {`import type { ReactNode } from 'react';
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
  const match = className?.match(/language-(\w+)/);
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
};`}
      </ShikiHighlighter>
      <p>
        Pass CodeHighlight to <code>react-markdown</code> as a code
        component
      </p>
      <ShikiHighlighter language="jsx" theme="rose-pine-moon">
        {`import ReactMarkdown from 'react-markdown';
import { CodeHighlight } from './CodeHighlight';

<ReactMarkdown components={{ code: CodeHighlight }}>
  {markdown}
</ReactMarkdown>`}
      </ShikiHighlighter>
      <p>
        This works great for highlighting in realtime on the client, I use
        it for an LLM chatbot UI, it renders markdown and highlights code
        in memoized chat messages:
      </p>
      <ShikiHighlighter language="jsx" theme="material-theme-ocean">
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
};`}
      </ShikiHighlighter>
    </div>
  );
});
