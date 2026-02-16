# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

pupt-lib is a TypeScript library for creating AI prompts using JSX syntax. It provides a component-based approach to prompt engineering where prompts are written as JSX elements that render to plain text.

## Design Principles

- **Stay close to React/JSX** - pupt-lib should behave as similarly to React and JSX as possible. When making design decisions, prefer patterns that React developers would find familiar.
- **Simple for non-technical users** - `.prompt` files should provide a simple experience for non-technical users, hiding unnecessary JavaScript complexity while maintaining compatibility with standard JSX.
- **Identical behavior** - `.prompt` and `.tsx` files MUST behave the same. No special preprocessing or magic for one format that doesn't apply to the other.
- **Component equality** - Built-in components MUST behave exactly the same as third-party components. The code in `src/` must not give built-in components any special treatment. All component code lives in `components/`, and `src/` discovers component information dynamically from exports rather than maintaining hardcoded lists. If a built-in component can do something, a third-party component using the same public API should be able to do it too. Specifically:
  - `src/` must NEVER hardcode built-in component names (use dynamic discovery from exports instead)
  - Component behavior (e.g., name hoisting) must be controlled via `static` properties on the Component class (e.g., `static hoistName = true`), not via hardcoded name lists in `src/`
  - Duck-typing protocols (checking for specific static properties or prop shapes) are acceptable because third-party components can implement the same protocol
  - Framework constructs (`<Uses>`, `<Fragment>`) and auto-imports in `.prompt` files are acceptable standard library behavior, not special treatment

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
npm run test:ci      # CI mode (no coverage, passWithNoTests)
npm run prompt       # Interactive CLI (examples/cli.ts) to run prompts from ./tmp directory
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

### Built-in Components (`components/`)
Built-in components live in the top-level `components/` directory (not `src/`). Component files MUST only import from `pupt-lib` (the public API) or sibling directories within `components/` (e.g., `../presets`), never internal `src/` paths. This ensures built-in components use the exact same API as external/third-party components.

**Import boundary**: Code in `src/` must NEVER import from `components/` except in `src/index.ts` (the barrel file that re-exports components as public API). The `src/services/component-discovery.ts` module dynamically discovers component names from the actual exports rather than hardcoding them.

- **Structural**: `Prompt`, `Section`, `Role`, `Task`, `Context`, `Constraint`, `Format`, `Audience`, `Tone`, `SuccessCriteria`, `Criterion`, `Constraints`, `Contexts`, `Objective`, `Style`, `WhenUncertain`, `Specialization`, `Guardrails`, `EdgeCases`, `When`, `Fallback`, `Fallbacks`, `References`, `Reference`
- **Utility**: `UUID`, `Timestamp`, `DateTime`, `Hostname`, `Username`, `Cwd`
- **Control**: `If`, `ForEach`
- **Data**: `Code`, `Data`, `File`, `Json`, `Xml`
- **Ask** (input collection): `Text`, `Number`, `Select`, `Confirm`, `MultiSelect`, etc.
- **Examples**: `Examples`, `Example`, `ExampleInput`, `ExampleOutput`, `NegativeExample`
- **Reasoning**: `Steps`, `Step`, `ChainOfThought`
- **Post-execution**: `PostExecution`, `ReviewFile`, `OpenUrl`, `RunCommand`
- **Presets** (`components/presets/`): Shared data tables (role presets, constraint presets, etc.) used by components via relative imports

### Input System (`src/services/input-iterator.ts`)
`createInputIterator(element)` extracts input requirements from Ask components. Iterator walks the tree, collects inputs, validates, and stores values for render.

### Runtime Transformation (`src/services/transformer.ts`)
Uses `@babel/standalone` to transform TSX at runtime. Works in both Node.js and browser. `createPrompt()` and `createPromptFromSource()` use this to load `.prompt` and `.tsx` files.

Note: `.prompt` files are JSX with automatic wrapping - they don't require `export default` or explicit imports. The transformer adds this boilerplate automatically. Both `.prompt` and `.tsx` files go through the same transformation pipeline and must behave identically.

### Pupt API (`src/api.ts`)
High-level `Pupt` class for loading prompt libraries, discovering prompts, and searching via MiniSearch.

### Key Dependencies
- **@babel/standalone** - Runtime JSX transformation for browser/Node
- **hyperformula** - Excel-like formula evaluation for `<If when='=...' />`
- **minisearch** - Fuzzy search for prompt discovery
- **zod** - Schema validation for component props

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
