# Configuration

[← Back to Index](00-index.md) | [Previous: Search](11-search.md) | [Next: Implementation](13-implementation.md)

---

## File Structure

```
pupt-lib/
├── src/
│   ├── index.ts                    # Main exports
│   ├── api.ts                      # Primary API: Pupt class
│   ├── render.ts                   # Core rendering logic
│   ├── create-prompt.ts            # Low-level prompt creation
│   │
│   ├── types/
│   │   ├── index.ts                # Type exports
│   │   ├── component.ts            # PuptComponent, PuptElement, PuptNode
│   │   ├── context.ts              # EnvironmentContext, RenderContext
│   │   ├── input.ts                # InputRequirement types
│   │   └── render.ts               # RenderResult, PostExecutionAction
│   │
│   ├── jsx-runtime/
│   │   ├── index.ts                # JSX runtime entry
│   │   ├── jsx-dev-runtime.ts      # Development runtime
│   │   └── types.ts                # JSX types
│   │
│   ├── components/
│   │   ├── index.ts                # Component exports
│   │   ├── structural/             # Role, Task, Context, etc.
│   │   ├── examples/               # Example, Examples
│   │   ├── reasoning/              # Steps, Step
│   │   ├── data/                   # Data, Code, File
│   │   ├── utility/                # UUID, Timestamp, etc.
│   │   ├── control/                # If, ForEach, Scope
│   │   ├── post-execution/         # PostExecution, ReviewFile, etc.
│   │   └── ask/                    # Ask.Text, Ask.Select, etc.
│   │
│   ├── services/
│   │   ├── input-iterator.ts       # Depth-first input iteration
│   │   ├── input-collector.ts      # Input collection wrapper
│   │   ├── scope.ts                # Scope class
│   │   ├── scope-loader.ts         # Package walking, scope building
│   │   ├── library-loader.ts       # Third-party library loading
│   │   ├── transformer.ts          # Babel transformation
│   │   ├── component-registry.ts   # Component registration
│   │   └── search-engine.ts        # Fuzzy prompt search
│   │
│   ├── babel/
│   │   └── preset.ts               # Babel preset config
│   │
│   └── utils/
│       ├── define-component.ts     # Component helper
│       ├── validation.ts           # Validation utilities
│       └── text.ts                 # Text utilities
│
├── test/
│   ├── setup.ts                    # Test setup
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── fixtures/                   # Test fixtures
│
├── .github/workflows/ci.yml        # CI/CD workflow
├── .husky/                         # Git hooks
├── design/                         # Design documentation
├── tmp/                            # Temporary files (gitignored)
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── vitest.config.integration.ts
├── eslint.config.mjs
├── knip.json
├── commitlint.config.js
├── .releaserc
└── .gitignore
```

---

## package.json

```json
{
  "name": "pupt-lib",
  "version": "0.0.0-development",
  "description": "Programmatic, composable, OOP-empowered AI prompt creation using JSX",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./jsx-runtime": {
      "types": "./dist/jsx-runtime/index.d.ts",
      "import": "./dist/jsx-runtime/index.js"
    },
    "./jsx-dev-runtime": {
      "types": "./dist/jsx-runtime/jsx-dev-runtime.d.ts",
      "import": "./dist/jsx-runtime/jsx-dev-runtime.js"
    }
  },
  "files": ["dist"],
  "keywords": ["prompt", "llm", "ai", "jsx", "claude", "gpt", "gemini"],
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly",
    "dev": "vite build --watch",
    "lint": "eslint src/ test/",
    "lint:fix": "eslint src/ test/ --fix",
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.config.integration.ts",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky",
    "knip": "knip",
    "commit": "cz"
  },
  "dependencies": {
    "@babel/core": "^7.26.0",
    "@babel/plugin-transform-react-jsx": "^7.25.0",
    "@babel/preset-typescript": "^7.26.0",
    "minisearch": "^7.1.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@commitlint/cli": "^20.3.0",
    "@commitlint/config-conventional": "^20.3.0",
    "@eslint/js": "^9.39.0",
    "@semantic-release/changelog": "^6.0.0",
    "@semantic-release/git": "^10.0.0",
    "@semantic-release/github": "^11.0.0",
    "@semantic-release/npm": "^13.1.0",
    "@stylistic/eslint-plugin": "^2.12.0",
    "@types/babel__core": "^7.20.0",
    "@types/node": "^22.0.0",
    "@vitest/coverage-v8": "^2.1.0",
    "commitizen": "^4.3.0",
    "cz-conventional-changelog": "^3.3.0",
    "eslint": "^9.17.0",
    "husky": "^9.1.0",
    "knip": "^5.80.0",
    "semantic-release": "^25.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.19.0",
    "vite": "^6.0.0",
    "vite-plugin-dts": "^4.5.0",
    "vitest": "^2.1.0"
  },
  "publishConfig": {
    "access": "public",
    "provenance": true
  },
  "config": {
    "commitizen": {
      "path": "./node_modules/cz-conventional-changelog"
    }
  }
}
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "jsxImportSource": "pupt-lib"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

---

## vite.config.ts

```typescript
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "jsx-runtime/index": resolve(__dirname, "src/jsx-runtime/index.ts"),
        "jsx-runtime/jsx-dev-runtime": resolve(__dirname, "src/jsx-runtime/jsx-dev-runtime.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "@babel/core",
        "@babel/plugin-transform-react-jsx",
        "@babel/preset-typescript",
        "zod",
        /^node:/,
      ],
    },
    target: "node20",
    minify: false,
  },
  plugins: [
    dts({
      include: ["src/**/*"],
      outDir: "dist",
    }),
  ],
});
```

---

## vitest.config.ts

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: [
        "src/index.ts",
        "test/**",
        "**/*.d.ts",
      ],
    },
    globals: true,
  },
});
```

---

## eslint.config.mjs

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/indent": ["error", 2],
      "@stylistic/quotes": ["error", "double"],
      "@stylistic/semi": ["error", "always"],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/array-bracket-spacing": ["error", "never"],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "coverage/", "**/*.js", "**/*.mjs", "tmp/"],
  }
);
```

---

## .releaserc

```json
{
  "branches": ["master", "main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", { "npmPublish": true }],
    ["@semantic-release/git", {
      "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]"
    }],
    "@semantic-release/github"
  ]
}
```

---

## CI/CD Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint

  test:
    needs: lint
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test

  release:
    needs: [lint, test]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## Husky Git Hooks

**.husky/commit-msg:**
```bash
npx --no-install commitlint --edit "$1"
```

**.husky/pre-push:**
```bash
npm run lint
npm run test:coverage
```

---

## Next Steps

- [Implementation](13-implementation.md) - Development priorities
- [Future Work](14-future-work.md) - Planned features
- [Overview](01-overview.md) - Project goals
