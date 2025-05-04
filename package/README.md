# 🎨 [react-shiki](https://npmjs.com/react-shiki)

> [!NOTE]
> This library is still in development. More features will be implemented, and the API may change.
> Contributions are welcome!

A performant client-side syntax highlighting component and hook for React, built with [Shiki](https://shiki.matsu.io/).

[See the demo page with highlighted code blocks showcasing several Shiki themes!](https://react-shiki.vercel.app/)

<!--toc:start-->

- 🎨 [react-shiki](https://npmjs.com/react-shiki)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Common Configuration Options](#common-configuration-options)
    - [Component-specific Props](#component-specific-props)
    - [Integration with react-markdown](#integration-with-react-markdown)
    - [Handling Inline Code](#handling-inline-code)
    - [Multi-theme Support](#multi-theme-support)
    - [Custom Themes](#custom-themes)
    - [Custom Languages](#custom-languages)
      - [Preloading Custom Languages](#preloading-custom-languages)
    - [Custom Transformers](#custom-transformers)
  - [Performance](#performance) 
  - [Throttling Real-time Highlighting](#throttling-real-time-highlighting)
  - [Streaming and LLM Chat UI](#streaming-and-llm-chat-ui)
  <!--toc:end-->

## Features

- 🖼️ Provides both a `ShikiHighlighter` component and a `useShikiHighlighter` hook for more flexibility
- 🔐 Shiki output is processed from HAST directly into React elements, no `dangerouslySetInnerHTML` required
- 📦 Supports all built-in Shiki languages and themes
- 🖌️ Full support for custom TextMate themes and languages
- 🔧 Supports passing custom Shiki transformers to the highlighter, in addition to all other options supported by `codeToHast`
- 🚰 Performant highlighting of streamed code, with optional throttling
- 📚 Includes minimal default styles for code blocks
- 🚀 Shiki dynamically imports only the languages and themes used on a page for optimal performance
- 🖥️ `ShikiHighlighter` component displays a language label for each code block
  when `showLanguage` is set to `true` (default)
- 🎨 Customizable styling of generated code blocks and language labels

## Installation

```bash
npm i react-shiki
```

## Usage

You can use either the `ShikiHighlighter` component or the `useShikiHighlighter` hook to highlight code.

**Using the Component:**

```tsx
import { ShikiHighlighter } from "react-shiki";

function CodeBlock() {
  return (
    <ShikiHighlighter language="jsx" theme="ayu-dark">
      {code.trim()}
    </ShikiHighlighter>
  );
}
```

**Using the Hook:**

```tsx
import { useShikiHighlighter } from "react-shiki";

function CodeBlock({ code, language }) {
  const highlightedCode = useShikiHighlighter(code, language, "github-dark");

  return <div className="code-block">{highlightedCode}</div>;
}
```

### Common Configuration Options

> [!IMPORTANT]
> `react-shiki` now supports all options that [`codeToHast`](https://github.com/shikijs/shiki/blob/main/packages/types/src/options.ts#L121) supports, this table has not yet been updated to reflect this.

| Option              | Type               | Default         | Description                                                               |
| ------------------- | ------------------ | --------------- | ------------------------------------------------------------------------- |
| `code`            | `string`           | -               | Code to highlight                                                          |
| `language`          | `string \| object` | -               | Language to highlight, built-in or custom textmate grammer object                                                         |
| `theme`             | `string \| object` | `'github-dark'` | Single or multi-theme configuration, built-in or custom textmate theme object |
| `delay`             | `number`           | `0`             | Delay between highlights (in milliseconds)                                    |
| `transformers`      | `array`            | `[]`            | Custom Shiki transformers for modifying the highlighting output               |
| `customLanguages`   | `array`            | `[]`            | Array of custom languages to preload                                          |
| `cssVariablePrefix` | `string`           | `'--shiki'`     | Prefix for CSS variables storing theme colors                                 |
| `defaultColor`      | `string \| false`  | `'light'`       | Default theme mode when using multiple themes, can also disable default theme |

### Component-specific Props

The `ShikiHighlighter` component offers minimal built-in styling and customization options out-of-the-box:

| Prop               | Type      | Default | Description                                                |
| ------------------ | --------- | ------- | ---------------------------------------------------------- |
| `showLanguage`     | `boolean` | `true`  | Displays language label in top-right corner                |
| `addDefaultStyles` | `boolean` | `true`  | Adds minimal default styling to the highlighted code block |
| `as`               | `string`  | `'pre'` | Component's Root HTML element                              |
| `className`        | `string`  | -       | Custom class name for the code block                       |
| `langClassName`    | `string`  | -       | Class name for styling the language label                  |
| `style`            | `object`  | -       | Inline style object for the code block                     |
| `langStyle`        | `object`  | -       | Inline style object for the language label                 |

### Integration with react-markdown

Create a component to handle syntax highlighting:

```tsx
import ReactMarkdown from "react-markdown";
import { ShikiHighlighter, isInlineCode } from "react-shiki";

const CodeHighlight = ({ className, children, node, ...props }) => {
  const code = String(children).trim();
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : undefined;
  const isInline = node ? isInlineCode(node) : undefined;

  return !isInline ? (
    <ShikiHighlighter language={language} theme="github-dark" {...props}>
      {code}
    </ShikiHighlighter>
  ) : (
    <code className={className} {...props}>
      {code}
    </code>
  );
};
```

Pass the component to react-markdown as a code component:

```tsx
<ReactMarkdown
  components={{
    code: CodeHighlight,
  }}
>
  {markdown}
</ReactMarkdown>
```

### Handling Inline Code

Prior to `9.0.0`, `react-markdown` exposed the `inline` prop to `code` 
components which helped to determine if code is inline. This functionality was 
removed in `9.0.0`. For your convenience, `react-shiki` provides two 
ways to replicate this functionality and API.

**Method 1: Using the `isInlineCode` helper:**

`react-shiki` exports `isInlineCode` which parses the `node` prop from `react-markdown` and identifies inline code by checking for the absence of newline characters:

```tsx
import { isInlineCode, ShikiHighlighter } from "react-shiki";

const CodeHighlight = ({ className, children, node, ...props }) => {
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : undefined;

  const isInline = node ? isInlineCode(node) : undefined;

  return !isInline ? (
    <ShikiHighlighter language={language} theme="github-dark" {...props}>
      {String(children).trim()}
    </ShikiHighlighter>
  ) : (
    <code className={className} {...props}>
      {children}
    </code>
  );
};
```

**Method 2: Using the `rehypeInlineCodeProperty` plugin:**

`react-shiki` also exports `rehypeInlineCodeProperty`, a rehype plugin that 
provides the same API as `react-markdown` prior to `9.0.0`. It reintroduces the 
`inline` prop which works by checking if `<code>` is nested within a `<pre>` tag, 
if not, it's considered inline code and the `inline` prop is set to `true`.

It's passed as a `rehypePlugin` to `react-markdown`:

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

Now `inline` can be accessed as a prop in the `code` component:

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
    <ShikiHighlighter language={language} theme="github-dark" {...props}>
      {code}
    </ShikiHighlighter>
  ) : (
    <code className={className} {...props}>
      {code}
    </code>
  );
};
```

### Multi-theme Support

To use multiple theme modes, pass an object with your multi-theme configuration to the `theme` prop in the `ShikiHighlighter` component:

```tsx
<ShikiHighlighter
  language="tsx"
  theme={{
    light: "github-light",
    dark: "github-dark",
    dim: "github-dark-dimmed",
  }}
  defaultColor="dark"
>
  {code.trim()}
</ShikiHighlighter>
```

Or, when using the hook, pass it to the `theme` parameter:

```tsx
const highlightedCode = useShikiHighlighter(
  code,
  "tsx",
  {
    light: "github-light",
    dark: "github-dark",
    dim: "github-dark-dimmed",
  },
  {
    defaultColor: "dark",
  }
);
```

See [shiki's documentation](https://shiki.matsu.io/docs/themes) for more information on dual and multi theme support, and for the CSS needed to make the themes reactive to your site's theme.

### Custom Themes

Custom themes can be passed as a TextMate theme in JavaScript object. For example, [it should look like this](https://github.com/antfu/textmate-grammars-themes/blob/main/packages/tm-themes/themes/dark-plus.json).

```tsx
import tokyoNight from "../styles/tokyo-night.json";

// Using the component
<ShikiHighlighter language="tsx" theme={tokyoNight}>
  {code.trim()}
</ShikiHighlighter>

// Using the hook
const highlightedCode = useShikiHighlighter(code, "tsx", tokyoNight);
```

### Custom Languages

Custom languages should be passed as a TextMate grammar in JavaScript object. For example, [it should look like this](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-grammars/grammars/typescript.json)

```tsx
import mcfunction from "../langs/mcfunction.tmLanguage.json";

// Using the component
<ShikiHighlighter language={mcfunction} theme="github-dark">
  {code.trim()}
</ShikiHighlighter>

// Using the hook
const highlightedCode = useShikiHighlighter(code, mcfunction, "github-dark");
```

#### Preloading Custom Languages

For dynamic highlighting scenarios where language selection happens at runtime:

```tsx
import mcfunction from "../langs/mcfunction.tmLanguage.json";
import bosque from "../langs/bosque.tmLanguage.json";

// With the component
<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  customLanguages={[mcfunction, bosque]}
>
  {code.trim()}
</ShikiHighlighter>

// With the hook
const highlightedCode = useShikiHighlighter(code, "typescript", "github-dark", {
  customLanguages: [mcfunction, bosque],
});
```

### Custom Transformers

```tsx
import { customTransformer } from "../utils/shikiTransformers";

// Using the component
<ShikiHighlighter language="tsx" transformers={[customTransformer]}>
  {code.trim()}
</ShikiHighlighter>

// Using the hook
const highlightedCode = useShikiHighlighter(code, "tsx", "github-dark", {
  transformers: [customTransformer],
});
```

## Performance

### Throttling Real-time Highlighting

For improved performance when highlighting frequently changing code:

```tsx
// With the component
<ShikiHighlighter language="tsx" theme="github-dark" delay={150}>
  {code.trim()}
</ShikiHighlighter>

// With the hook
const highlightedCode = useShikiHighlighter(code, "tsx", "github-dark", {
  delay: 150,
});
```

### Streaming and LLM Chat UI

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

  const highlightedCode = useShikiHighlighter(code, language, tokyoNight, {
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
  const code = String(children).trim();

  const isInline: boolean | undefined = node ? isInlineCode(node) : undefined;

  return !isInline ? (
    <ShikiHighlighter
      language={language}
      theme="github-dark"
      delay={150}
      {...props}
    >
      {code}
    </ShikiHighlighter>
  ) : (
    <code className={className}>{code}</code>
  );
};
```

Passed to `react-markdown` as a `code` component in memoized chat messages:

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
