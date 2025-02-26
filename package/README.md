# 🎨 [react-shiki](https://npmjs.com/react-shiki)

> [!NOTE]
> This library is still in development, more features will 
> continue to be implemented, and API may change. 
> Contributions are welcome!

Performant client side syntax highlighting component + hook
for react built with [Shiki](https://shiki.matsu.io/)

[See the demo page with highlighted code blocks showcasing several Shiki themes!](https://react-shiki.vercel.app/)

<!--toc:start-->

- 🎨 [react-shiki](https://npmjs.com/react-shiki)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
    - [`react-markdown`](#react-markdown)
    - [Check if code is inline](#check-if-code-is-inline)
    - [Custom themes](#custom-themes)
    - [Custom languages](#custom-languages)
      - [Preloading custom languages](#preloading-custom-languages)
    - [Custom transformers](#custom-transformers)
  - [Performance](#performance)
    - [Throttling real-time highlighting](#throttling-real-time-highlighting)
    - [Streaming and LLM chat UI](#streaming-and-llm-chat-ui)
    <!--toc:end-->

## Features

- 🖼️ Provides a `ShikiHighlighter` component for highlighting code as children,
  as well as a `useShikiHighlighter` hook for more flexibility
- 🔐 No `dangerouslySetInnerHTML`, output from Shiki is parsed using `html-react-parser`
- 📦 Supports all built-in Shiki languages and themes
- 🖌️ Full support for custom TextMate themes and languages
- 🔧 Supports passing custom Shiki transformers to the highlighter
- 🚰 Performant highlighting of streamed code, with optional throttling
- 📚 Includes minimal default styles for code blocks
- 🚀 Shiki dynamically imports only the languages and themes used on a page,
  optimizing for performance
- 🖥️ `ShikiHighlighter` component displays a language label for each code block
  when `showLanguage` is set to `true` (default)
- 🎨 Customizable styling of generated code blocks and language labels

## Installation

```bash
pnpm install react-shiki
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
- `customLanguages: LanguageRegistration[]` - Custom languages to be preloaded for highlighting

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

There are two built-in ways to check if a code block is inline, both provide the same result:
`react-shiki` exports `isInlineCode` which parses the `node` 
prop to determine if the code is inline based on the presence of line breaks:

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

`react-shiki` also exports `rehypeInlineCodeProperty`, a rehype plugin that adds
an `inline` property to `react-markdown` to determine if code is inline based on 
the presence of a `<pre>` tag as a parent of `<code>`.
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

Now `inline` can be accessed as a prop in the `CodeHighlight` component:

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
  const code = String(children).trim();


return !inline ? (
  <ShikiHighlighter language={language} theme={"houston"} {...props}>
    {code}
  </ShikiHighlighter>
) : (
  <code className={className} {...props}>
    {children}
  </code>
);
```

### Custom themes

Pass custom TextMate themes as a JSON object:

```tsx
import tokyoNight from '../styles/tokyo-night.json';

// component
<ShikiHighlighter language="tsx" theme={tokyoNight}>
  {String(code).trim()}
</ShikiHighlighter>;

// hook
const highlightedCode = useShikiHighlighter(code, "tsx", tokyoNight);
```

### Custom languages

Pass custom TextMate languages as a JSON object:

```tsx
import mcfunction from "../langs/mcfunction.tmLanguage.json"

// component
<ShikiHighlighter language={mcfunction} theme="github-dark" >
  {String(code).trim()}
</ShikiHighlighter>;

// hook
const highlightedCode = useShikiHighlighter(code, mcfunction, "github-dark");
```
#### Preloading custom languages

For dynamic highlighting scenarios (like LLM chat apps) where language selection happens at runtime, preload custom languages to make them available when needed:

```tsx
import mcfunction from "../langs/mcfunction.tmLanguage.json"
import bosque from "../langs/bosque.tmLanguage.json"

// component
<ShikiHighlighter language={mcfunction} theme="github-dark" customLanguages={[mcfunction, bosque]} >
  {String(code).trim()}
</ShikiHighlighter>;

// hook
const highlightedCode = useShikiHighlighter(code, mcfunction, "github-dark", { customLanguages: [mcfunction, bosque] });
```

### Custom transformers

```tsx
import { customTransformer } from '../utils/shikiTransformers';

// component
<ShikiHighlighter
  language="tsx"
  transformers={[customTransformer]}
>
  {String(code).trim()}
</ShikiHighlighter>;

// hook
const highlightedCode = useShikiHighlighter(code, "tsx", "github-dark", [customTransformer]);
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
