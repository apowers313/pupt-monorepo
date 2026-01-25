# API Design

[← Back to Index](00-index.md) | [Previous: User Input](06-user-input.md) | [Next: Module Loading](08-module-loading.md)

---

## API Summary

### Core Functions

| Export | Type | Description |
|--------|------|-------------|
| `render(element, options?)` | Function | Render a PuptElement tree to text. Returns `RenderResult`. |
| `renderAsync(element, options?)` | Function | Async render that resolves Promise children. |
| `createPrompt(filePath, options?)` | Function | Create a prompt from a JSX/TSX file path. |
| `createPromptFromSource(source, options?)` | Function | Create a prompt from JSX/TSX source string. |

### Input Collection

| Export | Type | Description |
|--------|------|-------------|
| `createInputIterator(options?)` | Function | Creates an input iterator for depth-first collection with async validation. |
| `createInputCollector(options?)` | Function | Creates a convenience wrapper with built-in retry loop. |

### Component System

| Export | Type | Description |
|--------|------|-------------|
| `Component<Props>` | Class | Base class for custom components. Extend and implement `render()`. |
| `defineComponent(options)` | Function | Functional API for defining components with Zod schema validation. |
| `createRegistry()` | Function | Creates a new component registry (for testing or isolation). |
| `defaultRegistry` | Const | The default global component registry. |
| `isComponentClass(value)` | Function | Type guard to check if a value is a Component class. |

### Scope System

| Export | Type | Description |
|--------|------|-------------|
| `Scope` | Class | Represents a component namespace. Resolves component names. |
| `createScope(name, parent?)` | Function | Creates a new scope, optionally inheriting from parent. |
| `builtinScope` | Const | The built-in scope with default components. |
| `ScopeLoader` | Class | Loads packages, walks dependencies, builds scope chains. |

### Environment & Configuration

| Export | Type | Description |
|--------|------|-------------|
| `createEnvironment(model, options?)` | Function | Creates an environment for a specific LLM model. |
| `DEFAULT_ENVIRONMENT` | Const | Default environment (Claude, XML format). |
| `createRuntimeConfig()` | Function | Creates runtime config with hostname, username, etc. |

### Search & Discovery

| Export | Type | Description |
|--------|------|-------------|
| `createSearchEngine(config?)` | Function | Creates a fuzzy search engine for prompts. |
| `SearchEngine` | Interface | API: `index()`, `search()`, `getByTag()`, `getAllTags()`. |

### JSX Runtime

| Export | Type | Description |
|--------|------|-------------|
| `jsx(type, props, key)` | Function | JSX runtime for single-child elements. |
| `jsxs(type, props, key)` | Function | JSX runtime for multi-child elements. |
| `Fragment` | Symbol | Fragment component for grouping. |

### Types

| Export | Type | Description |
|--------|------|-------------|
| `PuptElement` | Type | Represents a JSX element. |
| `PuptNode` | Type | Union: `PuptElement \| string \| number \| null \| PuptNode[]`. |
| `RenderContext` | Interface | Context passed to components (scope, inputs, env). |
| `RenderOptions` | Interface | Options for `render()`. |
| `RenderResult` | Interface | Result: `{ text: string, postExecution: PostExecutionAction[] }`. |
| `InputRequirement` | Interface | Describes a user input. |
| `EnvironmentContext` | Interface | Full environment config. |
| `DiscoveredPrompt` | Interface | A prompt ready to render. |
| `PostExecutionAction` | Type | Actions: `reviewFile`, `openUrl`, `runCommand`. |

---

## Pupt Class

The main entry point for applications using pupt-lib:

```typescript
import { Pupt } from 'pupt-lib';

// 1. Create instance with module sources
const pupt = new Pupt({
  modules: [
    '@acme/prompts',                    // npm package
    'github:corp/prompts#v1.0.0',       // git
    'https://example.com/prompts.js',   // CDN/URL
    './local-prompts/',                 // local (CLI only)
  ],
});

// 2. Initialize (loads all modules, resolves dependencies, deduplicates)
await pupt.init();

// 3. List available prompts
const prompts = pupt.getPrompts();
// → [{ name: 'support-ticket', tags: ['support'], ... }, ...]

// 4. Get a specific prompt
const prompt = pupt.getPrompt('support-ticket');

// 5. Collect inputs (if any)
const inputs = await prompt.collectInputs({
  values: { customerId: '12345' },      // Pre-supply known values
  onInput: (req) => askUser(req),       // Handler for interactive collection
});

// 6. Render
const result = await prompt.render({ inputs });
// → { text: "...", postExecution: [...] }
```

### Pupt Configuration

```typescript
export interface PuptConfig {
  /** Module sources to load (npm, URL, git, local path) */
  modules?: string[];

  /** Prompt file sources (glob patterns for .prompt files) */
  prompts?: string[];

  /** Environment configuration */
  env?: Partial<EnvironmentContext>;
}
```

### Pupt Methods

```typescript
export class Pupt {
  constructor(config?: PuptConfig);

  /** Initialize: load all modules, resolve dependencies */
  init(): Promise<void>;

  /** Get all discovered prompts */
  getPrompts(filter?: { tags?: string[] }): DiscoveredPrompt[];

  /** Get a specific prompt by name */
  getPrompt(name: string): DiscoveredPrompt | undefined;

  /** Fuzzy search prompts by name, description, tags, or content */
  searchPrompts(query: string, options?: SearchOptions): SearchResult[];

  /** Get all unique tags across all loaded prompts */
  getTags(): string[];

  /** Get all prompts with a specific tag */
  getPromptsByTag(tag: string): DiscoveredPrompt[];

  /** Load additional modules after init */
  loadModule(source: string): Promise<PuptLibrary>;

  /** Check if a component is available */
  hasComponent(name: string): boolean;

  /** Get component registry (for advanced use) */
  getRegistry(): ComponentRegistry;
}
```

---

## DiscoveredPrompt Interface

```typescript
export interface DiscoveredPrompt {
  /** Prompt name from <Prompt name="..."> */
  name: string;
  /** Description from <Prompt description="..."> */
  description?: string;
  /** Tags for filtering */
  tags: string[];
  /** The JSX element */
  element: PromptElement;
  /** Library this came from */
  library: string;
  /** Original source (URL, package name, or path) */
  source: string;

  /**
   * Render this prompt with its correct scope.
   */
  render(options?: {
    inputs?: Record<string, unknown>;
    env?: Partial<EnvironmentContext>;
  }): RenderResult;

  /**
   * Get an input iterator for collecting user inputs depth-first.
   */
  getInputIterator(): InputIterator;
}
```

---

## Core Functions

### render()

```typescript
export interface RenderOptions {
  /** Pre-supplied input values */
  inputs?: Map<string, unknown> | Record<string, unknown>;
  /** Indentation string (default: 2 spaces) */
  indent?: string;
  /** Whether to trim whitespace (default: true) */
  trim?: boolean;
  /** Custom component registry */
  registry?: ComponentRegistry;
  /** Environment configuration for LLM/output targeting */
  env?: Partial<EnvironmentContext>;
}

export interface RenderResult {
  /** The rendered prompt text */
  text: string;
  /** Actions to perform after prompt execution */
  postExecution: PostExecutionAction[];
}

export type PostExecutionAction =
  | { type: "reviewFile"; file: string }
  | { type: "openUrl"; url: string }
  | { type: "runCommand"; command: string };

/**
 * Render a PuptElement tree to a RenderResult
 */
export function render(element: PuptElement, options?: RenderOptions): RenderResult;

/**
 * Async render that resolves any Promise children
 */
export async function renderAsync(
  element: PuptElement,
  options?: RenderOptions
): Promise<RenderResult>;
```

### createPrompt()

```typescript
export interface CreatePromptOptions {
  /** Search paths for third-party libraries */
  libraryPaths?: string[];
  /** Whether to include node_modules in search */
  includeNodeModules?: boolean;
  /** Custom Babel plugins */
  babelPlugins?: string[];
}

/**
 * Create a prompt from a JSX/TSX file path
 */
export async function createPrompt(
  filePath: string,
  options?: CreatePromptOptions
): Promise<{
  prompt: string;
  inputs: InputRequirement[];
  renderWith: (values: Record<string, unknown>) => string;
}>;

/**
 * Create a prompt from JSX/TSX source string
 */
export async function createPromptFromSource(
  source: string,
  options?: CreatePromptOptions & { filename?: string }
): Promise<{
  prompt: string;
  inputs: InputRequirement[];
  renderWith: (values: Record<string, unknown>) => string;
}>;
```

---

## Component Definition Helper

```typescript
import { z } from "zod";

/**
 * Helper to define a custom component with validation
 */
export function defineComponent<P extends z.ZodType>(options: {
  name: string;
  props: P;
  render: (props: z.infer<P>, context: RenderContext) => string;
}): ComponentDefinition;

// Usage example:
const MyComponent = defineComponent({
  name: "MyComponent",
  props: z.object({
    title: z.string(),
    items: z.array(z.string()).optional(),
  }),
  render: ({ title, items }, context) => {
    let output = `## ${title}\n`;
    if (items) {
      output += items.map(item => `- ${item}`).join("\n");
    }
    return output;
  },
});
```

---

## Main Exports

```typescript
// src/index.ts

// Core rendering
export { render, renderAsync } from "./render";
export { createPrompt } from "./create-prompt";

// JSX Runtime (auto-imported by Babel)
export { jsx, jsxs, Fragment } from "./jsx-runtime";

// Types
export type {
  PuptElement,
  PuptNode,
  ComponentProps,
  RenderContext,
  ComponentDefinition,
  InputRequirement,
  EnvironmentContext,
  LlmConfig,
  CodeConfig,
  OutputConfig,
  SearchablePrompt,
  SearchResult,
  SearchOptions,
} from "./types";

// Environment helpers
export { DEFAULT_ENVIRONMENT, createEnvironment } from "./types/context";

// Primary API
export { Pupt, type DiscoveredPrompt } from "./api";

// Services
export { createInputIterator, type InputIterator } from "./services/input-iterator";
export { createInputCollector, type InputCollector } from "./services/input-collector";
export { ScopeLoader } from "./services/scope-loader";
export { Scope, createScope } from "./services/scope";
export { Transformer } from "./services/transformer";
export { createRegistry, defaultRegistry, type ComponentRegistry } from "./services/component-registry";
export { createSearchEngine, type SearchEngine } from "./services/search-engine";

// Default Components
export * from "./components";

// Utilities
export { defineComponent } from "./utils/define-component";
export { createValidator } from "./utils/validation";
```

---

## Usage Examples

### Basic Usage

```typescript
import { createPrompt, createInputCollector, createEnvironment, render } from "pupt-lib";

// Load a prompt template
const element = await createPrompt("./prompts/code-review.tsx");

// Collect inputs using depth-first iteration
const collector = createInputCollector();
const values = await collector.collectAll(element, async (req) => {
  return await askUser(req);
});

// Render with Claude-optimized environment
const env = createEnvironment("claude", {
  code: { language: "typescript" },
});

const result = render(element, { inputs: values, env });
console.log(result.text);
```

### Pre-Supplied Values (Skip User Input)

```typescript
import { render, createEnvironment } from "pupt-lib";

// If you already have all values, skip the iterator
const result = render(element, {
  inputs: {
    projectType: "React",
    code: "function fetchData() { ... }",
  },
  env: createEnvironment("claude"),
});
```

### Using the Pupt Class

```typescript
import { Pupt } from 'pupt-lib';

const pupt = new Pupt({
  modules: ['@acme/prompts', './my-prompts/'],
});

await pupt.init();

// Search for prompts
const results = pupt.searchPrompts('code review');

// Get by tag
const devPrompts = pupt.getPromptsByTag('development');

// Render a specific prompt
const prompt = pupt.getPrompt('security-review');
const result = prompt.render({ inputs: { code: sourceCode } });
```

---

## Next Steps

- [Module Loading](08-module-loading.md) - Loading third-party libraries
- [Workflows](10-workflows.md) - Author and publish prompts
- [Configuration](12-configuration.md) - Project configuration
