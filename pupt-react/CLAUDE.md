# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

pupt-react is a headless React component library for rendering pupt-lib prompts. It provides React hooks and components that wrap pupt-lib's prompt transformation and rendering capabilities.

## Commands

```bash
npm run build        # Build the library (outputs to dist/)
npm run build:demo   # Build the demo website (outputs to dist-demo/)
npm run dev:demo     # Start demo dev server via servherd
npm run lint         # ESLint + TypeScript type checking
npm run lint:fix     # Auto-fix linting issues
npm run test         # Run all tests
npm run test:watch   # Watch mode
```

## Architecture

### Core Components (`src/`)

- **PuptProvider** - React context provider for shared configuration (search engine, render options, environment)
- **PromptRenderer** - Headless component using render-prop pattern for prompt transformation and rendering
- **usePupt** - Hook to access PuptProvider context
- **usePromptRenderer** - Hook for prompt rendering logic (used by PromptRenderer)

### Demo App (`demo/`)

- Vite-based demo website showcasing pupt-react capabilities
- Monaco editor for prompt input
- Examples demonstrating various pupt-lib features
- Located at `demo/src/`, built to `dist-demo/`

### Key Dependencies

- **pupt-lib** - Core prompt library (JSX-based prompt templating)
- **React 18+** - Peer dependency
- **Mantine** - UI components for demo app

## pupt-lib Integration

This library depends on pupt-lib for prompt transformation and rendering.

**IMPORTANT: Do not attempt to work around bugs in pupt-lib.** Instead:

1. File a GitHub issue at https://github.com/apowers313/pupt-lib/issues
2. Include in the issue:
   - **Defect description**: What is broken or not working as expected
   - **Root cause**: Analysis of why the bug occurs (if known)
   - **Reproduction steps**: Minimal code/steps to reproduce the issue
   - **Suggested fix**: Proposed solution or approach to fix the bug
3. Reference the issue in code comments if needed
4. Wait for the fix to be released in pupt-lib before continuing

This ensures bugs are fixed at the source rather than papered over with workarounds that may break later.

## Browser Compatibility

When using pupt-lib in the browser (demo app), an import map is required for dynamic ES module evaluation:

```html
<script type="importmap">
  {
    "imports": {
      "pupt-lib": "https://unpkg.com/pupt-lib@VERSION/dist/index.js",
      "pupt-lib/jsx-runtime": "https://unpkg.com/pupt-lib@VERSION/dist/jsx-runtime/index.js",
      "zod": "https://unpkg.com/zod@3.24.2/lib/index.mjs",
      "minisearch": "https://unpkg.com/minisearch@7.1.1/dist/es/index.js"
    }
  }
</script>
```

## Testing

Tests use Vitest. The test setup (`test/setup.ts`) includes mocks for pupt-lib functions that use Blob URLs, which don't work in the test environment.

## Code Style

- 2-space indentation
- Double quotes for strings
- Semicolons required
- Trailing commas in multiline
