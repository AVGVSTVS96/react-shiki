---
title: react-markdown Integration
description: Integrate react-shiki with react-markdown for syntax highlighting in markdown content.
---

react-shiki integrates seamlessly with react-markdown to provide syntax highlighting for code blocks in markdown content.

## Basic Integration

Create a component to handle syntax highlighting:

```tsx
import ReactMarkdown from "react-markdown";
import ShikiHighlighter, { isInlineCode } from "react-shiki";

const CodeHighlight = ({ className, children, node, ...props }) => {
  const code = String(children).trim();
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : undefined;
  const isInline = node ? isInlineCode(node) : false;

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

Pass the component to react-markdown:

```tsx
<ReactMarkdown
  components={{
    code: CodeHighlight,
  }}
>
  {markdown}
</ReactMarkdown>
```

## Handling Inline Code

Prior to react-markdown 9.0.0, an `inline` prop was provided to code components. This was removed in 9.0.0. react-shiki provides two ways to replicate this functionality.

### Method 1: Using `isInlineCode` Helper

The `isInlineCode` function parses the node prop and identifies inline code by checking for the absence of newline characters:

```tsx
import ShikiHighlighter, { isInlineCode } from "react-shiki";

const CodeHighlight = ({ className, children, node, ...props }) => {
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : undefined;
  const isInline = node ? isInlineCode(node) : false;

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

### Method 2: Using `rehypeInlineCodeProperty` Plugin

The `rehypeInlineCodeProperty` plugin reintroduces the `inline` prop by checking if `<code>` is nested within a `<pre>` tag:

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
</ReactMarkdown>
```

Now `inline` can be accessed as a prop:

```tsx
const CodeHighlight = ({
  inline,
  className,
  children,
  ...props
}) => {
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

## TypeScript Types

For TypeScript projects, define proper types for the code component:

```tsx
import type { ExtraProps } from "react-markdown";
import type { Element } from "hast";

interface CodeHighlightProps extends ExtraProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: Element;
}

const CodeHighlight = ({
  inline,
  className,
  children,
  node,
  ...props
}: CodeHighlightProps) => {
  // ...
};
```

## With Multi-Theme Support

```tsx
const CodeHighlight = ({ className, children, node, ...props }) => {
  const code = String(children).trim();
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : undefined;
  const isInline = node ? isInlineCode(node) : false;

  return !isInline ? (
    <ShikiHighlighter
      language={language}
      theme={{
        light: "github-light",
        dark: "github-dark",
      }}
      defaultColor="light-dark()"
      {...props}
    >
      {code}
    </ShikiHighlighter>
  ) : (
    <code className={className} {...props}>
      {code}
    </code>
  );
};
```

## Using the Hook Instead

For more control, use the hook:

```tsx
import { useShikiHighlighter, isInlineCode } from "react-shiki";

const CodeHighlight = ({ className, children, node }) => {
  const code = String(children).trim();
  const match = className?.match(/language-(\w+)/);
  const language = match ? match[1] : undefined;
  const isInline = node ? isInlineCode(node) : false;

  const highlighted = useShikiHighlighter(
    isInline ? null : code,
    language,
    "github-dark"
  );

  if (isInline) {
    return <code className={className}>{code}</code>;
  }

  return <div className="code-block">{highlighted}</div>;
};
```
