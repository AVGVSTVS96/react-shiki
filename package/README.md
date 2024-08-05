# 🎨 [react-shiki](https://react-shiki.vercel.app/)

Syntax highlighting component for react using [Shiki](https://shiki.matsu.io/)


See the [demo](https://react-shiki.vercel.app/) page with multiple theme examples and usage instructions!

## Installation
```bash
npm install react-shiki
```
or

```bash
(pnpm|bun|yarn) add react-shiki
```

## Usage

```tsx
function CodeBlock() {
  return (
    <ShikiHighlighter language="jsx" theme="ayu-dark">
      {code.trim()}
    </ShikiHighlighter>
  );
}
```
The ShikiHighlighter is imported in your project and used as a component, with code to be highlighted passed as children.

Shiki handles dynamically imports only the languages and themes used on the page.

The component accepts several props in addition to language and theme:

- `showLanguage: boolean` - Shows the language name in the top right corner of the code block.
- `style: object` - Style object to be passed to the component.
- `as: string` - The component to be rendered. Defaults to 'pre'.
- `className: string` - Class name to be passed to the component.

It can also be used with `react-markdown`
```tsx
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
};
```

Pass CodeHighlight to `react-markdown` as a code component
```tsx
import ReactMarkdown from 'react-markdown';
import { CodeHighlight } from './CodeHighlight';

<ReactMarkdown
  components={{
    code: CodeHighlight,
  }}
>
  {markdown}
</ReactMarkdown>
```

This works great for highlighting in realtime on the client, I use it for an LLM chatbot UI, it renders markdown and highlights code in memoized chat messages:
```tsx
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
};
```