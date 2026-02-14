# pupt-lib

[![npm version](https://img.shields.io/npm/v/pupt-lib.svg)](https://www.npmjs.com/package/pupt-lib)
[![Coverage Status](https://coveralls.io/repos/github/apowers313/pupt-lib/badge.svg?branch=master)](https://coveralls.io/github/apowers313/pupt-lib?branch=master)
[![CI](https://github.com/apowers313/pupt-lib/actions/workflows/ci.yml/badge.svg)](https://github.com/apowers313/pupt-lib/actions/workflows/ci.yml)

A TypeScript library for creating AI prompts as versionable, composable, shareable files using JSX syntax. Prompts are becoming critical software artifacts, yet most are written inline, copy-pasted between projects, and lost when chat sessions end. pupt-lib treats prompts as first-class code: version controlled in git, composable from reusable components, and shareable via npm. Simple prompts look like HTML and are accessible to non-developers, while complex prompts have full TypeScript power including loops, conditionals, and type safety.

> **[Read the full documentation](https://apowers313.github.io/pupt-lib/)** — guides, component reference, API docs, and more.

## Installation

```bash
npm install pupt-lib
```

For build-time JSX transformation (recommended for production), also install the peer dependencies:

```bash
npm install --save-dev @babel/core @babel/plugin-transform-react-jsx @babel/preset-typescript
```

## Quick Start

The simplest way to write a prompt is a `.prompt` file — no imports or exports needed:

```xml
<!-- greeting.prompt -->
<Prompt name="greeting" description="A friendly greeting prompt">
  <Role>You are a friendly assistant.</Role>
  <Task>
    Greet the user named <Ask.Text name="userName" label="User's name" /> warmly.
  </Task>
  <Constraint type="must">Keep the greeting under 50 words.</Constraint>
</Prompt>
```

Load and render it:

```typescript
import { createPromptFromSource, render } from 'pupt-lib';
import { readFile } from 'fs/promises';

const source = await readFile('./greeting.prompt', 'utf-8');
const element = await createPromptFromSource(source, 'greeting.prompt');
const result = await render(element, {
  inputs: { userName: 'Alice' },
});

console.log(result.text);
```

You can also write prompts as `.tsx` files for full TypeScript type safety — see the [Getting Started guide](https://apowers313.github.io/pupt-lib/guide/getting-started) for details.

## Features

- **JSX Syntax** — Write prompts using familiar JSX/TSX syntax with 50+ built-in components
- **`.prompt` Files** — Simplified format with no imports, no exports — just JSX
- **Composable** — Build complex prompts from reusable, shareable components
- **Provider Targeting** — Adapt output for Claude, GPT, Gemini, and others via environment config
- **Presets** — Role, task, constraint, and steps presets encode prompt engineering best practices
- **Smart Defaults** — Auto-generated role, format, and constraint sections with full opt-out control
- **Version Controlled** — Prompts live in files, tracked in git, reviewed in PRs
- **Shareable** — Publish prompt libraries to npm, consume others' work via npm, URLs, or local files
- **Browser & Node.js** — Works in both environments with runtime JSX transformation

## Documentation

Visit **[apowers313.github.io/pupt-lib](https://apowers313.github.io/pupt-lib/)** for:

- [Getting Started](https://apowers313.github.io/pupt-lib/guide/getting-started) — installation, first prompt, `.prompt` vs `.tsx`
- [Component Reference](https://apowers313.github.io/pupt-lib/components/) — all 50+ built-in components with props and examples
- [Variables & Inputs](https://apowers313.github.io/pupt-lib/guide/variables-and-inputs) — collecting user input with `Ask` components
- [Conditional Logic](https://apowers313.github.io/pupt-lib/guide/conditional-logic) — `If`, `ForEach`, and formula evaluation
- [Environment & Providers](https://apowers313.github.io/pupt-lib/guide/environment) — targeting different LLM providers
- [Custom Components](https://apowers313.github.io/pupt-lib/developers/first-component) — building your own components
- [Modules & Sharing](https://apowers313.github.io/pupt-lib/modules/publishing) — publishing and importing prompt libraries
- [API Reference](https://apowers313.github.io/pupt-lib/developers/api) — functions, types, and utilities

## License

MIT
