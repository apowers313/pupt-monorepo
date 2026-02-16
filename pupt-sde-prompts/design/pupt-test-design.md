# pupt-test Design

## Problem Statement

Prompt package authors need to test that their `.prompt` files compile, render, and produce expected output. Today this requires writing boilerplate: reading files, calling `createPromptFromSource`, calling `render`, and manually structuring assertions. The pattern is the same for every prompt package — pupt-sde already proved it out — but each author would have to rediscover it.

`pupt-test` extracts this into a standalone package with two entry points:

1. **`pupt-test`** — utility functions (thin wrappers around pupt-lib's compile/render pipeline). No test framework dependency.
2. **`pupt-test/suite`** — opinionated test suites that generate vitest `describe` blocks. Re-exports all utilities for convenience.

This split lets consumers who only need the utilities avoid installing vitest entirely — useful for non-test contexts like build scripts, CI validation, or documentation generation that compile/render prompts without running a test framework.

## Package Configuration

```json
{
  "name": "pupt-test",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./suite": {
      "types": "./dist/suite.d.ts",
      "import": "./dist/suite.js"
    }
  },
  "peerDependencies": {
    "pupt-lib": "^1.3.5",
    "vitest": "^3.0.0"
  },
  "peerDependenciesMeta": {
    "vitest": {
      "optional": true
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

`pupt-lib` is a peer dependency because `pupt-test` uses the same compile/render pipeline the consumer's prompts target — there must be exactly one copy. `vitest` is an **optional** peer dependency — required only by `pupt-test/suite`, not by `pupt-test`. Consumers who only import from `pupt-test` won't see warnings about missing vitest.

### Module Structure

```
src/
├── index.ts          # utilities only — no vitest import
├── suite.ts          # imports vitest statically, re-exports utilities
└── types.ts          # shared types (TestPromptOptions, etc.)
```

`suite.ts` statically imports `describe`, `it`, `expect`, `vi`, `beforeEach`, and `afterEach` from vitest. This is safe because `suite.ts` is only loaded in test files where vitest is the runner. `index.ts` never imports vitest — it only depends on `pupt-lib` and Node built-ins (`fs`, `path`).

## `pupt-test` — Utility Functions

Imported from `"pupt-test"` (also re-exported from `"pupt-test/suite"`).

These are low-level building blocks for authors who want full control over their tests. Each function is a thin wrapper around pupt-lib, handling file I/O so test code stays focused on assertions. They have no vitest dependency and can be used outside of test files.

### `loadPromptSource`

Reads a `.prompt` file and returns its raw source text.

```typescript
async function loadPromptSource(promptPath: string): Promise<string>;
```

- `promptPath` — absolute or relative path to a `.prompt` file

```typescript
import { loadPromptSource } from "pupt-test";

const source = await loadPromptSource("prompts/code-review.prompt");
// source is the raw file content as a string
```

### `compilePrompt`

Reads a `.prompt` file and compiles it through pupt-lib's pipeline (preprocessor → babel → evaluator), returning the `PuptElement` without rendering it. Useful for inspecting metadata (name, description, tags) without providing inputs.

```typescript
async function compilePrompt(promptPath: string): Promise<PuptElement>;
```

```typescript
import { compilePrompt } from "pupt-test";

const element = await compilePrompt("prompts/code-review.prompt");
console.log(element.props.name);        // "code-review"
console.log(element.props.description); // "Systematic code review..."
console.log(element.props.tags);        // ["review", "security", ...]
```

### `renderPrompt`

Reads, compiles, and renders a `.prompt` file with the given inputs. Returns the same `RenderResult` that `pupt-lib`'s `render()` produces.

```typescript
async function renderPrompt(
  promptPath: string,
  inputs?: Record<string, unknown>,
): Promise<RenderResult>;
```

- `promptPath` — absolute or relative path to a `.prompt` file
- `inputs` — key-value pairs passed to the prompt's input expressions

```typescript
import { renderPrompt } from "pupt-test";

const result = await renderPrompt("prompts/code-review.prompt", {
  codeToReview: "function add(a, b) { return a + b; }",
});
expect(result.ok).toBe(true);
expect(result.text).toContain("<role>");
```

### `renderPromptSource`

Compiles and renders a prompt from a source string rather than a file path. Useful for testing dynamically generated prompts or prompt fragments without writing them to disk.

```typescript
async function renderPromptSource(
  source: string,
  inputs?: Record<string, unknown>,
  filename?: string,
): Promise<RenderResult>;
```

- `source` — raw `.prompt` file content as a string
- `inputs` — key-value pairs passed to the prompt's input expressions
- `filename` — optional filename for error messages (defaults to `"<inline>"`)

```typescript
import { renderPromptSource } from "pupt-test";

const result = await renderPromptSource(
  `<Prompt name="test">Hello {inputs.name}</Prompt>`,
  { name: "world" },
);
expect(result.text).toContain("Hello world");
```

## `pupt-test/suite` — Opinionated Test Suites

Imported from `"pupt-test/suite"`. This entry point statically imports vitest (which must be installed) and re-exports all utility functions from `"pupt-test"` for convenience.

These generate entire `describe` blocks with standardized assertions. They encode the test pattern proven in pupt-sde so that prompt authors get comprehensive coverage with minimal code.

### `testPrompt`

Generates a test suite for a single `.prompt` file.

```typescript
function testPrompt(
  promptPath: string,
  options: TestPromptOptions,
): void;

interface TestPromptOptions {
  /** Inputs to pass when rendering the prompt. */
  inputs: Record<string, unknown>;

  /**
   * Strings expected to appear in the rendered output.
   * Typically structural section tags like "<role>", "<task>".
   * Default: ["<role>", "<task>"]
   */
  expectedSections?: string[];

  /**
   * Whether to run snapshot comparison.
   * Default: true
   */
  snapshot?: boolean;

  /**
   * Whether to check that string input values appear in rendered output.
   * Default: true
   */
  interpolation?: boolean;

  /**
   * Pin the date for deterministic output.
   * Default: "2025-01-15T12:00:00Z"
   */
  fakeTime?: string | false;
}
```

`testPrompt` calls vitest's `describe`, `it`, `expect`, `beforeEach`, and `afterEach` internally. The consumer just calls it at the top level of a test file.

#### Generated Assertions

1. **Renders successfully** — renders the prompt with the provided inputs, asserts `result.ok === true`. Catches compilation errors, missing required inputs, and runtime exceptions.

2. **Contains expected sections** — asserts each string in `expectedSections` appears in `result.text`. Validates the prompt's structural skeleton.

3. **Interpolates inputs** — for each value in `inputs` that is a string, asserts it appears in `result.text`. Confirms that `{inputs.xxx}` expressions are evaluated. Skipped if `interpolation: false`.

4. **Matches snapshot** — runs `expect(result.text).toMatchSnapshot()`. Catches unintentional changes to rendered output. Skipped if `snapshot: false`.

#### Usage

```typescript
// test/code-review.test.mjs
import { testPrompt } from "pupt-test/suite";

testPrompt("prompts/code-review.prompt", {
  inputs: { codeToReview: "function add(a, b) { return a + b; }" },
  expectedSections: ["<role>", "<objective>", "<task>", "<contexts>"],
});
```

That single call produces the same 4-test suite that pupt-sde writes manually in ~40 lines.

#### With Custom Tests

`testPrompt` generates a `describe` block. Authors can add additional tests alongside it:

```typescript
import { testPrompt, renderPrompt } from "pupt-test/suite";

testPrompt("prompts/code-review.prompt", {
  inputs: { codeToReview: "function add(a, b) { return a + b; }" },
});

// Additional custom test
describe("code-review.prompt edge cases", () => {
  it("handles empty input gracefully", async () => {
    const result = await renderPrompt("prompts/code-review.prompt", {
      codeToReview: "",
    });
    expect(result.ok).toBe(true);
  });
});
```

### `testAllPrompts`

Discovers all `.prompt` files in a directory and generates a test suite for each. This is the zero-config option for prompt packages that follow the `prompts/` directory convention.

```typescript
function testAllPrompts(
  promptsDir: string,
  options: TestAllPromptsOptions,
): void;

interface TestAllPromptsOptions {
  /**
   * Map of filename to inputs. Each .prompt file that needs
   * non-empty inputs must have an entry here.
   * Files not listed receive empty inputs ({}).
   */
  inputs?: Record<string, Record<string, unknown>>;

  /**
   * Strings expected in all prompts. Individual prompts can
   * override via inputMap.
   * Default: ["<role>", "<task>"]
   */
  expectedSections?: string[];

  /** Default snapshot behavior for all prompts. Default: true */
  snapshot?: boolean;

  /** Default interpolation behavior for all prompts. Default: true */
  interpolation?: boolean;

  /** Pin the date for deterministic output. Default: "2025-01-15T12:00:00Z" */
  fakeTime?: string | false;

  /**
   * Whether to run the import detection regression guard.
   * Default: true
   */
  importDetection?: boolean;
}
```

#### Usage

A prompt package can test its entire `prompts/` directory in a single file:

```typescript
// test/all-prompts.test.mjs
import { testAllPrompts } from "pupt-test/suite";

testAllPrompts("prompts", {
  inputs: {
    "code-review.prompt": { codeToReview: "const x = 1;" },
    "pr-description.prompt": { gitDiff: "diff --git a/f.js b/f.js\n+x" },
    "debug-root-cause.prompt": { bugDescription: "TypeError on line 42" },
  },
});
```

This discovers every `.prompt` file in `prompts/`, generates the 4-assertion suite for each, and adds the import detection guard across all files.

Files not listed in `inputs` are rendered with `{}` — this still validates that the prompt compiles and renders without crashing, even if interpolation tests won't be meaningful for those files.

### Import Detection Guard

The import detection test is a cross-cutting concern: it verifies that no `.prompt` file contains bare `import` statements that would cause pupt-lib's preprocessor to skip auto-import injection. This is a subtle failure mode — the prompt compiles fine but silently loses access to built-in components.

`testAllPrompts` includes this automatically (disable with `importDetection: false`). It can also be used standalone:

```typescript
import { testImportDetection } from "pupt-test/suite";

// Generates a describe block that scans all .prompt files
testImportDetection("prompts");
```

## pupt-sde Migration

After `pupt-test` is published, pupt-sde's test suite simplifies from 12 test files (~500 lines) to one:

```typescript
// test/prompts.test.mjs
import { testAllPrompts } from "pupt-test/suite";

testAllPrompts("prompts", {
  inputs: {
    "code-review.prompt": {
      codeToReview: "function add(a, b) { return a + b; }",
    },
    "debug-root-cause.prompt": {
      bugDescription: "TypeError when calling undefined function",
    },
    "design-architecture.prompt": {
      requirements: "Build a REST API for user management",
    },
    "documentation.prompt": {
      codeToDocument: "export function parse(input: string): AST { ... }",
    },
    "implementation-plan.prompt": {
      requirements: "Add OAuth2 login flow",
    },
    "performance-analysis.prompt": {
      codeToAnalyze: "function sort(arr) { return arr.sort(); }",
    },
    "pr-description.prompt": {
      gitDiff: "diff --git a/index.js b/index.js\n+const x = 1;",
    },
    "refactor.prompt": {
      codeToRefactor: "function f(x) { if(x) { return 1; } else { return 2; } }",
    },
    "requirements-clarification.prompt": {
      rawRequirements: "Make the app faster",
    },
    "security-audit.prompt": {
      codeToAudit: "app.get('/user', (req, res) => res.send(db.query(req.query.id)));",
    },
    "test-generation.prompt": {
      codeToTest: "export function add(a: number, b: number): number { return a + b; }",
    },
  },
  expectedSections: ["<role>", "<objective>", "<task>"],
});
```

The existing per-prompt test files and `test/helpers/prompt-test-utils.mjs` can be removed. Custom edge-case tests can be added alongside `testAllPrompts` using the utility functions.

## Implementation Notes

### Entry Point Separation

The two entry points (`pupt-test` and `pupt-test/suite`) must maintain a strict dependency boundary:

- **`index.ts`** imports only from `pupt-lib` and Node built-ins (`fs/promises`, `path`). It must never import `vitest`, directly or transitively. This ensures consumers who only use utilities don't need vitest installed.
- **`suite.ts`** statically imports from `vitest` at the top of the file and re-exports everything from `index.ts`. The static import is required because `describe` and `it` register tests synchronously during module evaluation — a dynamic `await import("vitest")` would break test discovery.

If a consumer imports from `"pupt-test/suite"` without vitest installed, they get a clear Node module resolution error at import time rather than a confusing runtime failure.

### vitest Integration

`testPrompt` and `testAllPrompts` (in `suite.ts`) use vitest's `describe`, `it`, `expect`, `vi`, `beforeEach`, and `afterEach`. Since `vitest` is a peer dependency, these imports resolve to the consumer's installed version. The suite functions must be called at the top level of a test file (or inside a `describe`) — they are synchronous and register tests immediately, matching how vitest discovers tests.

### Path Resolution

All path arguments (`promptPath`, `promptsDir`) are resolved relative to the test file's working directory (i.e., the project root where vitest runs). This matches the intuitive behavior of `"prompts/code-review.prompt"` pointing to the project's `prompts/` directory.

### Fake Timers

The `fakeTime` option defaults to a fixed date to ensure snapshot stability. Many prompts include dates in their rendered output — without pinned time, snapshots would break every day. Authors can set `fakeTime: false` if their prompts don't include dates, or provide their own timestamp.

### Error Reporting

When a prompt fails to compile or render, the error message includes:
- The prompt filename
- The phase that failed (compilation vs. rendering)
- The underlying error from pupt-lib

This makes failures easy to diagnose without needing to dig through stack traces.
