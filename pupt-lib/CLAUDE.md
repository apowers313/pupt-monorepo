# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pupt-lib is a TypeScript library for creating AI prompts using JSX syntax. It provides a component-based approach to prompt engineering where prompts are written as JSX elements that render to plain text.

## Commands

```bash
npm run build        # Build with Vite (outputs to dist/)
npm run lint         # ESLint + TypeScript type checking + Knip (unused code)
npm run lint:fix     # Auto-fix linting issues
npm run test         # Run all tests (node + browser)
npm run test:node    # Run only Node.js tests
npm run test:browser # Run only browser tests (Playwright/Chromium)
npm run test:watch   # Watch mode
npm run test -- test/unit/render.test.ts  # Run single test file
npm run prompt       # Interactive CLI to run prompts from ./tmp directory
```

## Architecture

### JSX Runtime (`src/jsx-runtime/`)
Custom JSX runtime that transforms JSX into `PuptElement` trees. Configure in tsconfig.json with `jsxImportSource: "pupt-lib"`. The runtime exports `jsx`, `jsxs`, and `Fragment`.

### Core Types (`src/types/`)
- `PuptElement<P>` - JSX element with type, props, and children
- `PuptNode` - Any renderable value (string, number, element, array)
- `RenderContext` - Passed to components during render (inputs, env, registry)
- `ComponentType` - Either class component or function component

### Component System (`src/component.ts`)
Class-based components extend `Component<Props>` and implement `render(props, context)`. Components are identified by a symbol marker (`COMPONENT_MARKER`).

### Renderer (`src/render.ts`)
Traverses `PuptElement` tree and converts to string. Handles Fragments, class components (instantiated), function components, and registry lookups.

### Component Registry (`src/services/component-registry.ts`)
Maps string names to component classes. `defaultRegistry` is auto-populated with all built-in components. Used when JSX type is a string (e.g., from transformed code).

### Built-in Components (`src/components/`)
- **Structural**: `Prompt`, `Section`, `Role`, `Task`, `Context`, `Constraint`, `Format`, `Audience`, `Tone`, `SuccessCriteria`, `Criterion`
- **Utility**: `UUID`, `Timestamp`, `DateTime`, `Hostname`, `Username`, `Cwd`
- **Control**: `If`, `ForEach`
- **Data**: `Code`, `Data`, `File`, `Json`, `Xml`
- **Ask** (input collection): `Text`, `Number`, `Select`, `Confirm`, `MultiSelect`, etc.
- **Examples**: `Examples`, `Example`, `ExampleInput`, `ExampleOutput`
- **Reasoning**: `Steps`, `Step`
- **Post-execution**: `PostExecution`, `ReviewFile`, `OpenUrl`, `RunCommand`

### Input System (`src/services/input-iterator.ts`)
`createInputIterator(element)` extracts input requirements from Ask components. Iterator walks the tree, collects inputs, validates, and stores values for render.

### Runtime Transformation (`src/services/transformer.ts`)
Uses `@babel/standalone` to transform TSX at runtime. Works in both Node.js and browser. `createPrompt()` and `createPromptFromSource()` use this to load `.prompt` and `.tsx` files.

### Pupt API (`src/api.ts`)
High-level `Pupt` class for loading prompt libraries, discovering prompts, and searching via MiniSearch.

## Package Exports

```typescript
import { render, Component, Prompt, Role, ... } from 'pupt-lib';
import { jsx, jsxs, Fragment } from 'pupt-lib/jsx-runtime';
```

The Babel preset (`pupt-lib/babel-preset`) configures JSX transformation for build tools.

## Testing

Tests use Vitest with two projects:
- **node**: Standard unit/integration tests (`test/**/*.test.ts`)
- **browser**: Playwright-based tests (`test/**/*.browser.test.ts`)

Coverage thresholds: 80% lines/functions/statements, 75% branches.

## Code Style

- 2-space indentation
- Single quotes
- Semicolons required
- Trailing commas in multiline
- Unused vars prefixed with `_`
