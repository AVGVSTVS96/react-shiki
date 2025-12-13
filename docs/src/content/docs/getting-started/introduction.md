---
title: Introduction
description: Learn about react-shiki and its capabilities for syntax highlighting in React applications.
---

**react-shiki** is a performant client-side syntax highlighting library for React applications, built on top of [Shiki](https://shiki.matsu.io/).

## What is react-shiki?

react-shiki provides both a component and a hook for syntax highlighting in React applications. It leverages Shiki's powerful TextMate grammar-based highlighting engine to produce accurate, beautiful syntax highlighting for over 200 programming languages.

## Key Features

- **Component & Hook API** — Use the `ShikiHighlighter` component for quick setup or the `useShikiHighlighter` hook for more flexibility
- **Flexible Output** — Choose between React elements (safer, no `dangerouslySetInnerHTML`) or HTML strings (15-45% faster)
- **Multiple Bundle Options** — Full bundle with all languages, web-focused bundle, or minimal core for maximum control
- **Custom Themes & Languages** — Full support for custom TextMate themes and language grammars
- **Streaming Support** — Performant highlighting of streamed code with optional throttling
- **Line Numbers** — CSS-based line numbers with customizable styling
- **Transformers** — Support for Shiki transformers to modify highlighting output
- **Minimal Default Styles** — Includes sensible defaults that can be easily customized

## How It Works

react-shiki wraps Shiki's highlighting engine and provides React-friendly APIs. When you render a code block:

1. The highlighter is initialized with your chosen theme(s) and language(s)
2. Shiki parses the code using TextMate grammars
3. The output is converted to React elements or HTML
4. Dynamic imports ensure only used languages and themes are loaded

## When to Use react-shiki

react-shiki is ideal for:

- **Documentation sites** — Highlight code examples with accurate syntax
- **Code editors** — Real-time highlighting with throttling support
- **Markdown renderers** — Integrate with react-markdown for rich content
- **LLM chat interfaces** — Handle streamed code with performant updates
- **Any React app** — Add beautiful code highlighting anywhere

## Demo

Check out the [live demo](https://react-shiki.vercel.app/) to see react-shiki in action with various themes and languages!

## Next Steps

Ready to get started? Head to the [Installation](/getting-started/installation/) guide to add react-shiki to your project.
