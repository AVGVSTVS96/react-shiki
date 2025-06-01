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
  - [Bundle Options](#bundle-options)
  - [Configuration](#configuration)
    - [Common Configuration Options](#common-configuration-options)
    - [Component-specific Props](#component-specific-props)
    - [Multi-theme Support](#multi-theme-support)
    - [Custom Themes](#custom-themes)
    - [Custom Languages](#custom-languages)
      - [Preloading Custom Languages](#preloading-custom-languages)
    - [Custom Transformers](#custom-transformers)
    - [Line Numbers](#line-numbers)
  - [Integration](#integration)
    - [Integration with react-markdown](#integration-with-react-markdown)
    - [Handling Inline Code](#handling-inline-code)
  - [Performance](#performance)
    - [Throttling Real-time Highlighting](#throttling-real-time-highlighting)
    - [Streaming and LLM Chat UI](#streaming-and-llm-chat-ui)
  <!--toc:end-->

## Features

- 🖼️ Provides both a `ShikiHighlighter` component and a `useShikiHighlighter` hook for more flexibility
- 🔐 Shiki output is processed from HAST directly into React elements, no `dangerouslySetInnerHTML` required
- 📦 Multiple bundle options: Full bundle (~1.2MB gz), web bundle (~695KB gz), or minimal core bundle for fine-grained bundle control
- 🖌️ Full support for custom TextMate themes and languages
- 🔧 Supports passing custom Shiki transformers to the highlighter, in addition to all other options supported by `codeToHast`
- 🚰 Performant highlighting of streamed code, with optional throttling
- 📚 Includes minimal default styles for code blocks
- 🚀 Shiki dynamically imports only the languages and themes used on a page for optimal performance
- 🖥️ `ShikiHighlighter` component displays a language label for each code block
  when `showLanguage` is set to `true` (default)
- 🎨 Customizable styling of generated code blocks and language labels
- 📏 Optional line numbers with customizable starting number and styling

## Installation

```bash
npm i react-shiki
```

## Usage

You can use either the `ShikiHighlighter` component or the `useShikiHighlighter` hook to highlight code.

**Using the Component:**

```tsx
import ShikiHighlighter from "react-shiki";

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

## Bundle Options
`react-shiki`, like `shiki`, offers three entry points to balance convenience and bundle optimization:

### `react-shiki` (Full Bundle)
```tsx
import ShikiHighlighter from 'react-shiki';
```
- **Size**: ~6.4MB minified, 1.2MB gzipped
- **Languages**: All Shiki languages and themes
- **Use case**: Unknown language requirements, maximum language support
- **Setup**: Zero configuration required

### `react-shiki/web` (Web Bundle)  
```tsx
import ShikiHighlighter from 'react-shiki/web';
```
- **Size**: ~3.8MB minified, 695KB gzipped
- **Languages**: Web-focused languages (HTML, CSS, JS, TS, JSON, Markdown, Vue, JSX, Svelte)
- **Use case**: Web applications with balanced size/functionality
- **Setup**: Drop-in replacement for main entry point

### `react-shiki/core` (Minimal Bundle)
```tsx
import ShikiHighlighter, { 
  createHighlighterCore,        // re-exported from shiki/core
  createOnigurumaEngine,        // re-exported from shiki/engine/oniguruma
  createJavaScriptRegexEngine,  // re-exported from shiki/engine/javascript
} from 'react-shiki/core';

// Create custom highlighter with dynamic imports to optimize client-side bundle size
const highlighter = await createHighlighterCore({
  themes: [import('@shikijs/themes/nord')],
  langs: [import('@shikijs/langs/typescript')],
  engine: createOnigurumaEngine(import('shiki/wasm')) 
    // or createJavaScriptRegexEngine()
});

<ShikiHighlighter highlighter={highlighter} language="typescript" theme="nord">
  {code}
</ShikiHighlighter>
```
- **Size**: Minimal (only what you import)
- **Languages**: User-defined via custom highlighter  
- **Use case**: Production apps requiring maximum bundle control
- **Setup**: Requires custom highlighter configuration
- **Engine options**: Choose JavaScript engine (smaller bundle, faster startup) or Oniguruma (WASM, maximum language support)

### RegExp Engines

Shiki offers two built-in engines:
- **Oniguruma** - default, uses the compiled Oniguruma WebAssembly, and offer maximum language support
- **JavaScript** - smaller bundle, faster startup, recommended when running highlighting on the client

Unlike the Oniguruma engine, the JavaScript engine is [strict by default](https://shiki.style/guide/regex-engines#use-with-unsupported-languages). It will throw an error if it encounters an invalid Oniguruma pattern or a pattern that it cannot convert. If you want best-effort results for unsupported grammars, you can enable the forgiving option to suppress any conversion errors:

```tsx
createJavaScriptRegexEngine({ forgiving: true });
```

See [Shiki - RegExp Engines](https://shiki.style/guide/regex-engines) for more info.


## Configuration

### Common Configuration Options


| Option              | Type               | Default         | Description                                                                   |
| ------------------- | ------------------ | --------------- | ----------------------------------------------------------------------------- |
| `code`            | `string`           | -               | Code to highlight                                                               |
| `language`          | `string \| object` | -               | Language to highlight, built-in or custom textmate grammer object             |
| `theme`             | `string \| object` | `'github-dark'` | Single or multi-theme configuration, built-in or custom textmate theme object |
| `delay`             | `number`           | `0`             | Delay between highlights (in milliseconds)                                    |
| `customLanguages`   | `array`            | `[]`            | Array of custom languages to preload                                          |
| `showLineNumbers`   | `boolean`          | `false`         | Display line numbers alongside code                                           |
| `startingLineNumber` | `number`           | `1`             | Starting line number when line numbers are enabled                           |
| `transformers`      | `array`            | `[]`            | Custom Shiki transformers for modifying the highlighting output               |
| `cssVariablePrefix` | `string`           | `'--shiki'`     | Prefix for CSS variables storing theme colors                                 |
| `defaultColor`      | `string \| false`  | `'light'`       | Default theme mode when using multiple themes, can also disable default theme |
| `tabindex`          | `number`           | `0`             | Tab index for the code block                                                  |
| `decorations`       | `array`            | `[]`            | Custom decorations to wrap the highlighted tokens with                        |
| `structure`        | `string`           | `classic`  | The structure of the generated HAST and HTML - `classic` or `inline`               |
| [`codeToHastOptions`](https://github.com/shikijs/shiki/blob/main/packages/types/src/options.ts#L121) | -             | -              | All other options supported by Shiki's `codeToHast`      |

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

// Component
<ShikiHighlighter language="tsx" theme={tokyoNight}>
  {code.trim()}
</ShikiHighlighter>

// Hook
const highlightedCode = useShikiHighlighter(code, "tsx", tokyoNight);
```

### Custom Languages

Custom languages should be passed as a TextMate grammar in JavaScript object. For example, [it should look like this](https://github.com/shikijs/textmate-grammars-themes/blob/main/packages/tm-grammars/grammars/typescript.json)

```tsx
import mcfunction from "../langs/mcfunction.tmLanguage.json";

// Component
<ShikiHighlighter language={mcfunction} theme="github-dark">
  {code.trim()}
</ShikiHighlighter>

// Hook
const highlightedCode = useShikiHighlighter(code, mcfunction, "github-dark");
```

#### Preloading Custom Languages

For dynamic highlighting scenarios where language selection happens at runtime:

```tsx
import mcfunction from "../langs/mcfunction.tmLanguage.json";
import bosque from "../langs/bosque.tmLanguage.json";

// Component
<ShikiHighlighter
  language="typescript"
  theme="github-dark"
  customLanguages={[mcfunction, bosque]}
>
  {code.trim()}
</ShikiHighlighter>

// Hook
const highlightedCode = useShikiHighlighter(code, "typescript", "github-dark", {
  customLanguages: [mcfunction, bosque],
});
```

### Custom Transformers

```tsx
import { customTransformer } from "../utils/shikiTransformers";

// Component
<ShikiHighlighter language="tsx" transformers={[customTransformer]}>
  {code.trim()}
</ShikiHighlighter>

// Hook
const highlightedCode = useShikiHighlighter(code, "tsx", "github-dark", {
  transformers: [customTransformer],
});
```

### Line Numbers

Display line numbers alongside your code, these are CSS-based
and can be customized with CSS variables:

```tsx
// Component
<ShikiHighlighter 
  language="javascript"
  theme="github-dark"
  showLineNumbers,
  startingLineNumber={0} // default is 1
>
  {code}
</ShikiHighlighter>

<ShikiHighlighter 
  language="python" 
  theme="github-dark" 
  showLineNumbers 
  startingLineNumber={0}
>
  {code}
</ShikiHighlighter>

// Hook (import 'react-shiki/css' for line numbers to work)
const highlightedCode = useShikiHighlighter(code, "javascript", "github-dark", {
  showLineNumbers: true,
  startingLineNumber: 0, 
});
```

> [!NOTE]
> When using the hook with line numbers, import the CSS file for the line numbers to work:
> ```tsx
> import 'react-shiki/css';
> ```
> Or provide your own CSS counter implementation and styles for `.line-numbers` (line `span`) and `.has-line-numbers` (container `code` element)

Available CSS variables for customization:
```css
--line-numbers-foreground: rgba(107, 114, 128, 0.5);
--line-numbers-width: 2ch;
--line-numbers-padding-left: 0ch;
--line-numbers-padding-right: 2ch;
--line-numbers-font-size: inherit;
--line-numbers-font-weight: inherit;
--line-numbers-opacity: 1;
```

You can customize them in your own CSS or by using the style prop on the component:
```tsx
<ShikiHighlighter 
  language="javascript"
  theme="github-dark"
  showLineNumbers
  style={{
    '--line-numbers-foreground': '#60a5fa',
    '--line-numbers-width': '3ch'
  }}
>
  {code}
</ShikiHighlighter>
```

## Integration

### Integration with react-markdown

Create a component to handle syntax highlighting:

```tsx
import ReactMarkdown from "react-markdown";
import ShikiHighlighter, { isInlineCode } from "react-shiki";

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
import ShikiHighlighter, { isInlineCode } from "react-shiki";

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
