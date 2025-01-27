# 🎨 [react-shiki](https://npmjs.com/react-shiki)

> [!NOTE]
> This package is still a work in progress, fully functional but not
> extensively tested.

Performant server and client side syntax highlighting component + hook
for react using [Shiki](https://shiki.matsu.io/)

[See the demo page with highlighted code blocks showcasing several Shiki themes!](https://react-shiki.vercel.app/)

<!--toc:start-->

- 🎨 [react-shiki](https://npmjs.com/react-shiki)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
    - [`react-markdown`](#react-markdown)
    - [Custom themes](#custom-themes)
  - [Client-side highlighting](#client-side-highlighting)
    - [Throttling real-time highlighting](#throttling-real-time-highlighting)
    - [Streaming and LLM chat UI](#streaming-and-llm-chat-ui)
    <!--toc:end-->

## Features

- 🖼️ Provides a `ShikiHighlighter` component for highlighting code as children,
  as well as a `useShikiHighlighter` hook for more flexibility
- 🔐 No `dangerouslySetInnerHTML`, output from Shiki is parsed using `html-react-parser`
- 📦 Supports all Shiki languages and themes in addition to
- 🖌️ Full support for custom TextMate themes in a JavaScript object format
- 🚰 Performant highlighting of streamed code on the client, with optional throttling
- 📚 Includes minimal default styles for code blocks
- 🚀 Shiki dynamically imports only the languages and themes used on a page,
  optimizing for performance
- 🖥️ `ShikiHighlighter` component displays a language label for each code block
  when `showLanguage` is set to `true` (default)
- 🎨 Users can customize the styling of the generated code blocks by passing
  a `style` object or a `className`

## Installation

```bash
[pnpm|bun|yarn|npm] install react-shiki
```

## Usage

You can use the `ShikiHighlighter` component, or the `useShikiHighlighter` hook
to highlight code.

`useShikiHighlighter` is a hook that takes in the code to be highlighted, the
language, and the theme, and returns the highlighted code as React elements.
It's useful for users who want full control over the rendering of highlighted
code.

```tsx
const highlightedCode = useShikiHighlighter(code, language, theme, options);
```

The `ShikiHighlighter` component is imported in your project, with the code to
be highlighted passed as it's children.

Shiki automatically handles dynamically importing only the languages and themes
used on the page.

```tsx
function CodeBlock() {
  return (
    <ShikiHighlighter language="jsx" theme="ayu-dark">
      {code.trim()}
    </ShikiHighlighter>
  );
}
```

The component accepts several props in addition to language and theme:

- `showLanguage: boolean` - Shows the language name in the top right corner of
  the code block
- `addDefaultStyles`: boolean - Adds default styles (padding, overflow handling,
  and border-radius) to the code block
- `as: string` - The component to be rendered. Defaults to 'pre'
- `delay: number` - Delay between highlights in milliseconds, useful for throttling
  rapid highlighting on the client
- `className: string` - Class name to be passed to the component
- `style: object` - Style object to be passed to the component

```tsx
function Houston() {
  return (
    <ShikiHighlighter
      language="jsx"
      theme="houston"
      showLanguage={false}
      addDefaultStyles={true}
      as="div"
      style={{
        textAlign: "left",
      }}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
}
```

**react-shiki** exports `isInlineCode` to check if a code block is inline:

```tsx
const isInline: boolean | undefined = node ? isInlineCode(node) : undefined;

return !isInline ? (
  <ShikiHighlighter language={language} theme={"houston"} {...props}>
    {String(children)}
  </ShikiHighlighter>
) : (
  <code className={className} {...props}>
    {children}
  </code>
);
```

### `react-markdown`

```tsx
import type { ReactNode } from "react";
import ShikiHighlighter, { type Element } from "react-shiki";

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
  const language = match ? match[1] : undefined;

  <ShikiHighlighter language={language} theme={"houston"} {...props}>
    {String(children)}
  </ShikiHighlighter>;
};
```

Pass `CodeHighlight` to `react-markdown` as a code component:

```tsx
import ReactMarkdown from "react-markdown";
import { CodeHighlight } from "./CodeHighlight";

<ReactMarkdown
  components={{
    code: CodeHighlight,
  }}
>
  {markdown}
</ReactMarkdown>;
```

### Custom themes

```tsx:title=CodeHighlight.tsx
import tokyoNight from '@styles/tokyo-night.mjs';

<ShikiHighlighter language="tsx" theme={tokyoNight}>
  {String(code)}
</ShikiHighlighter>;
```

## Client-side highlighting

react-shiki supports performance-optimized highlighting on the client.

### Throttling real-time highlighting

Throttling real-time highlighting on the client is possible with the
`delay` option.

```tsx
const highlightedCode = useShikiHighlighter(code, language, theme, {
  delay: 150,
});
```

### Streaming and LLM chat UI

react-shiki can be used to highlight streamed code from LLM responses in real-time.

I use it for an
LLM chatbot UI, it renders markdown and highlights code in memoized chat messages.

Using `useShikiHighlighter` hook:

```tsx title=CodeHighlight.tsx
import type { ReactNode } from "react";
import { isInlineCode, useShikiHighlighter, type Element } from "react-shiki";
import tokyoNight from "@styles/tokyo-night.mjs";

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
}: CodeHighlightProps) => {
  const code = String(children);
  const language = className?.match(/language-(\w+)/)?.[1];

  const isInline = node ? isInlineCode(node) : false;

  const highlightedCode = useShikiHighlighter(language, code, tokyoNight, {
    delay: 150,
  });

  return !isInline ? (
    <div
      className="shiki not-prose relative [&_pre]:overflow-auto 
      [&_pre]:rounded-lg [&_pre]:px-6 [&_pre]:py-5"
    >
      {language ? (
        <span
          className="absolute right-3 top-2 text-xs tracking-tighter
          text-muted-foreground/85"
        >
          {language}
        </span>
      ) : null}
      {highlightedCode}
    </div>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};
```

Or using the `ShikiHighlighter` component:

```tsx title=CodeHighlight.tsx
import type { ReactNode } from "react";
import ShikiHighlighter, { isInlineCode, type Element } from "react-shiki";

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
  const language = match ? match[1] : undefined;

  const isInline: boolean | undefined = node ? isInlineCode(node) : undefined;

  return !isInline ? (
    <ShikiHighlighter
      language={language}
      theme={"houston"}
      delay={150}
      {...props}
    >
      {String(children)}
    </ShikiHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};
```

Passed to `react-markdown` as a `code` component in memo-ized chat messages:

```tsx title=ChatMessages.tsx
const RenderedMessage = React.memo(({ message }: { message: Message }) => (
  <div className={cn(messageStyles[message.role])}>
    <ReactMarkdown components={{ code: CodeHighlight }}>
      {message.content}
    </ReactMarkdown>
  </div>
));

export const ChatMessages = ({ messages }: { messages: Message[] }) => {
  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};
```
