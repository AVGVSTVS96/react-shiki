---
title: Introduction
description: Learn about react-shiki and its capabilities for syntax highlighting in React applications.
---

**react-shiki** is a performant client-side syntax highlighting library for React applications, built on top of [Shiki](https://shiki.matsu.io/).

## What is react-shiki?

react-shiki provides both a component and a hook for syntax highlighting in React applications. It leverages Shiki's powerful TextMate grammar-based highlighting engine to produce accurate, beautiful syntax highlighting.

## Key Features

- **Component & Hook API** — Use the `ShikiHighlighter` component for quick setup or the `useShikiHighlighter` hook for more flexibility
- **Flexible Output** — Choose between React elements (safer, no `dangerouslySetInnerHTML`) or HTML strings for better performance
- **Multiple Bundle Options** — Full bundle with all languages, web-focused bundle, or minimal core for maximum control
- **Custom Themes & Languages** — Full support for custom TextMate themes and language grammars
- **Streaming Support** — Performant highlighting of streamed code with optional throttling
- **Line Numbers** — CSS-based line numbers with customizable styling
- **Transformers** — Support for Shiki transformers to modify highlighting output
- **Minimal Default Styles** — Includes sensible defaults that can be easily customized

## Demo

Check out the [live demo](https://react-shiki.vercel.app/) to see react-shiki in action with various themes and languages!

## Next Steps

Ready to get started? Head to the [Installation](/getting-started/installation/) guide to add react-shiki to your project.
