# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

pupt-test is a testing utility package for pupt prompt packages. It provides two entry points:

- `@pupt/test` -- utility functions for loading, compiling, and rendering prompts (no vitest dependency)
- `@pupt/test/suite` -- opinionated test suite generators that create vitest describe blocks

## Commands

```bash
# From monorepo root (preferred):
pnpm exec nx run @pupt/test:build     # Build this package
pnpm exec nx run @pupt/test:test      # Run tests
pnpm exec nx run @pupt/test:lint      # Lint

# From this directory:
npm run build        # Build with Vite (outputs to dist/)
npm run lint         # ESLint + TypeScript type checking
npm run test         # Run all tests
npm run test:ci      # CI mode (no coverage, passWithNoTests)
```

## Architecture

### Entry Points

- **`src/index.ts`** -- Utility functions only. Imports from `@pupt/lib` and Node built-ins. Never imports vitest.
- **`src/suite.ts`** -- Test suite generators. Statically imports vitest globals. Re-exports everything from index.ts.
- **`src/types.ts`** -- Shared TypeScript interfaces for options.

### Key Design Constraints

- `index.ts` must NEVER import from vitest (ensures consumers without vitest can use utilities)
- `suite.ts` statically imports vitest (required for synchronous test registration)
- All path arguments resolve relative to `process.cwd()` (where vitest runs = project root)

## Code Style

- 2-space indentation
- Double quotes for strings
- Semicolons required
- Trailing commas in multiline
