# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PUPT (Powerful Universal Prompt Tool) is a TypeScript ecosystem for creating, managing, and rendering AI prompts. It is built as a monorepo managed by **pnpm** and **Nx**.

## Package Directory

| Package       | Location      | Description                                                     |
| ------------- | ------------- | --------------------------------------------------------------- |
| `@pupt/lib`   | `pupt-lib/`   | Core JSX prompt library - create AI prompts using JSX syntax    |
| `@pupt/cli`   | `pupt/`       | CLI tool (`pt` binary) for managing and running prompts         |
| `@pupt/react` | `pupt-react/` | Headless React component library for rendering pupt-lib prompts |
| `@pupt/sde-prompts`   | `pupt-sde-prompts/`   | Software development prompt collection                          |

### Dependency Graph

```
@pupt/lib (foundation, no pupt dependencies)
  ↑
  ├── @pupt/cli   (production dependency)
  ├── @pupt/react (peer dependency + react)
  └── @pupt/sde-prompts   (peer dependency)
```

Build order: `@pupt/lib` → `@pupt/cli`, `@pupt/react`, `@pupt/sde-prompts` (parallel)

## Monorepo Structure

```
pupt-monorepo/
├── pupt/                    # @pupt/cli package
├── pupt-lib/                # @pupt/lib package
├── pupt-react/              # @pupt/react package
├── pupt-sde-prompts/        # @pupt/sde-prompts package
├── tools/                   # Build scripts
│   ├── merge-coverage.sh    # Coverage report merging
│   └── prepush.sh           # Pre-push validation
├── design/                  # Architecture and design documents
├── .github/workflows/       # CI/CD workflows
├── nx.json                  # Nx configuration
├── pnpm-workspace.yaml      # pnpm workspace config
├── tsconfig.base.json       # Shared TypeScript config
├── vite.shared.config.ts    # Shared Vite config factory
├── vitest.shared.config.ts  # Shared Vitest config factory
└── eslint.config.js         # Shared ESLint config
```

## Development Commands

### From Root (Nx-orchestrated)

```bash
# Build
pnpm run build                    # Build all packages
pnpm exec nx run-many -t build    # Build with Nx caching

# Test
pnpm run test                     # Test all packages
pnpm exec nx run-many -t test     # Test with Nx caching

# Coverage
pnpm run coverage                 # Run all coverage + merge

# Lint
pnpm run lint                     # Lint all packages
pnpm run lint:knip                # Dead code detection

# Format
pnpm run format                   # Format all files with Prettier
pnpm run format:check             # Check formatting
```

### Per-Package Commands

```bash
# Inside any package directory:
npm run build         # Build the package
npm test              # Run tests
npm run test:ci       # Run tests (CI mode, no coverage)
npm run lint          # Lint package
```

### Port Assignments (9000-9099)

| Package    | Dev Server | Coverage Preview |
| ---------- | ---------- | ---------------- |
| pupt-lib   | 9000       | 9051             |
| pupt       | 9010       | 9052             |
| pupt-react | 9020       | 9053             |

## Testing Infrastructure

### Test Projects by Package

**pupt-lib:**

- `node` - Node.js environment tests
- `browser` - Playwright browser tests

**pupt:**

- Single test project (Node.js, forks pool)

**pupt-react:**

- Browser-based tests (Playwright)

**pupt-sde-prompts:**

- Integration tests (.mjs files, forks pool)

### Coverage Thresholds

Default: 80% lines/functions/statements, 75% branches
pupt: 90% lines, 85% functions, 90% statements/branches (higher thresholds)

## CI/CD Pipeline

### Workflows

| Workflow      | Trigger           | Purpose                                      |
| ------------- | ----------------- | -------------------------------------------- |
| `ci.yml`      | Push/PR           | Build, lint, sharded tests (5 parallel jobs) |
| `release.yml` | After CI (master) | Nx Release with OIDC trusted publishing      |

### CI Test Shards

- `pupt` - CLI tests (Node.js)
- `pupt-lib-node` - Library node tests
- `pupt-lib-browser` - Library browser tests (Playwright)
- `pupt-react` - React component tests (Playwright)
- `pupt-sde-prompts` - SDE integration tests

## Shared Configuration

| File                      | Purpose                                                         |
| ------------------------- | --------------------------------------------------------------- |
| `vite.shared.config.ts`   | Shared Vite config factory (port assignments, build formats)    |
| `vitest.shared.config.ts` | Shared Vitest config factory (coverage thresholds)              |
| `tsconfig.base.json`      | Shared TypeScript settings (ES2022, bundler resolution, strict) |
| `eslint.config.js`        | Shared ESLint flat config (typescript-eslint strictTypeChecked) |
| `commitlint.config.js`    | Conventional commit enforcement with package scopes             |
| `knip.config.ts`          | Dead code detection per workspace                               |

## Important Development Notes

### TypeScript

- Strict mode enabled across all packages
- Uses TypeScript project references for cross-package dependencies
- Each package extends `tsconfig.base.json` and sets `composite: true`
- pupt-lib uses custom JSX: `jsxImportSource: "@pupt/lib"`

### Inter-Package Dependencies

- Use `workspace:*` protocol for all inter-package dependencies
- pupt-lib is always built first (foundation package)
- `pnpm` resolves workspace dependencies automatically

### Build System

- Nx caches build outputs in `.nx/cache`
- Affected commands run only changed packages on PRs
- CI builds artifacts once, tests download and reuse them
- Release workflow reuses CI artifacts (no rebuild)
- ES modules are the default format

### Package-Specific Notes

**pupt-lib:** Has multiple entry points (`/jsx-runtime`, `/jsx-dev-runtime`). Uses self-referencing path aliases. Browser tests use Playwright.

**pupt (CLI):** Uses `tsc` for build (not vite). Has a `prompts/` directory published with the package. Binary is `pt`.

**pupt-react:** External deps: react, react-dom, @pupt/lib. Uses Mantine in demo. Browser tests with Playwright.

**pupt-sde-prompts:** No TypeScript, no build step. Tests are `.mjs` files. Only publishes `prompts/` directory.

### Package CLAUDE.md Files

Each package has its own CLAUDE.md with package-specific guidance. Always read the relevant package CLAUDE.md before making changes.
