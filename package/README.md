# 🎨 [react-shiki](https://npmjs.com/react-shiki)

> [!NOTE]
> This package is still a work in progress, fully functional but not
> extensively tested.

Performant client side syntax highlighting component + hook
for react using [Shiki](https://shiki.matsu.io/)

[See the demo page with highlighted code blocks showcasing several Shiki themes!](https://react-shiki.vercel.app/)

<!--toc:start-->

- 🎨 [react-shiki](https://npmjs.com/react-shiki)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
    - [`react-markdown`](#react-markdown)
    - [Check if code is inline](#check-if-code-is-inline)
    - [Custom themes](#custom-themes)
    - [Custom transformers](#custom-transformers)
  - [Performance](#performance)
    - [Throttling real-time highlighting](#throttling-real-time-highlighting)
    - [Streaming and LLM chat UI](#streaming-and-llm-chat-ui)
    <!--toc:end-->

## Features

- 🖼️ Provides a `ShikiHighlighter` component for highlighting code as children,
  as well as a `useShikiHighlighter` hook for more flexibility
- 🔐 No `dangerouslySetInnerHTML`, output from Shiki is parsed using `html-react-parser`
- 📦 Supports all Shiki languages and themes
- 🖌️ Full support for custom TextMate themes in a JavaScript object format
- 🔧 Supports passing custom Shiki transformers to the highlighter
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

The `ShikiHighlighter` component will follow a similar API to `react-syntax-highlighter`,
but uses Shiki and is optimized for performant sequential highlighting. As of now,
not all of `react-syntax-highlighter` functionality is supported, but the goal of
this component is to eventually act as a drop in replacement for `react-syntax-highlighter`.

The component accepts several props in addition to language and theme:

- `showLanguage: boolean` - Shows the language name in the top right corner of
  the code block
- `addDefaultStyles`: boolean - Adds default styles (padding, overflow handling,
  and border-radius) to the code block
- `as: string` - The component to be rendered. Defaults to 'pre'
- `delay: number` - Delay between highlights in milliseconds, useful for throttling
  rapid highlighting on the client
- `className: string` - Class names to be passed to the component
- `style: object` - Inline style object to be passed to the component
- `langStyle: object` - Inline style object to be passed to the language label
- `langClassName: string` - Class names to be passed to the language label

```tsx
function Houston() {
  return (
    <ShikiHighlighter
      language="jsx"
      className="code-block"
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
    {String(children).trim()}
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

### Check if code is inline

There are two ways to check if a code block is inline:
`react-shiki` exports `isInlineCode`, good but marks multiline inline
code tags as code blocks.

```tsx
const isInline: boolean | undefined = node ? isInlineCode(node) : undefined;

return !isInline ? (
  <ShikiHighlighter language={language} theme={"houston"} {...props}>
    {String(children).trim()}
  </ShikiHighlighter>
) : (
  <code className={className} {...props}>
    {children}
  </code>
);
```

`react-shiki` also exports `rehypeInlineCodeProperty`, a more accurate way
to determine if code is inline.
It's passed as a rehype plugin to `react-markdown`:

```tsx
import ReactMarkdown from "react-markdown";
import { rehypeInlineCodeProperty } from "react-shiki";

<ReactMarkdown
  rehypePlugins={[rehypeInlineCodeProperty]}
  components={{
    code: CodeHighlight,
  }}
>
  {markdown}
</ReactMarkdown>;
```

And can be accessed as a prop:

```tsx
const CodeHighlight = ({
  inline,
  className,
  children,
  node,
  ...props
}: CodeHighlightProps): JSX.Element => {
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : undefined;


return !inline ? (
  <ShikiHighlighter language={language} theme={"houston"} {...props}>
    {String(children).trim()}
  </ShikiHighlighter>
) : (
  <code className={className} {...props}>
    {children}
  </code>
);
```

### Custom themes

```tsx
import tokyoNight from '@styles/tokyo-night.mjs';

<ShikiHighlighter language="tsx" theme={tokyoNight}>
  {String(code)}
</ShikiHighlighter>;
```

### Custom transformers

```tsx
import { customTransformer } from '@utils/customTransformers';

<ShikiHighlighter
  language="tsx"
  transformers={[customTransformer]}>
  {String(code).trim()}
</ShikiHighlighter>;
```

## Performance

`react-shiki` supports performance-optimized highlighting on the client.

### Throttling real-time highlighting

Throttling real-time highlighting on the client is possible with the
`delay` option.

```tsx
const highlightedCode = useShikiHighlighter(code, language, theme, {
  delay: 150,
});
```

### Streaming and LLM chat UI

`react-shiki` can be used to highlight streamed code from LLM responses in real-time.

I use it for an LLM chatbot UI, it renders markdown and highlights
code in memoized chat messages.

Using `useShikiHighlighter` hook:

```tsx
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
  const code = String(children).trim();
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

```tsx
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
      {String(children).trim()}
    </ShikiHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};
```

Passed to `react-markdown` as a `code` component in memo-ized chat messages:

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
    <div className="space-y-4">
      {messages.map((message) => (
        <RenderedMessage key={message.id} message={message} />
      ))}
    </div>
  );
};
```
