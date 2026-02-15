# API Reference

This page covers every public export from pupt-lib. If you are building integrations, custom components, or tooling on top of the library, this is the definitive reference.

## Core Functions

These are the primary functions you use to load prompt files, build element trees, and produce final prompt text.

### `render(element, options?)`

Call `render()` to turn a PuptElement tree into a finished prompt string. Because components can perform async work (API calls, file reads, formula evaluation), `render()` is always async.

```typescript
async function render(element: PuptElement, options?: RenderOptions): Promise<RenderResult>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `element` | `PuptElement` | The root element to render |
| `options` | `RenderOptions` | Render configuration |

**RenderOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `inputs` | `Map<string, unknown> \| Record<string, unknown>` | `new Map()` | Input values for Ask components |
| `env` | `EnvironmentContext` | `DEFAULT_ENVIRONMENT` | Environment configuration |
| `trim` | `boolean` | `true` | Trim whitespace from output |
| `throwOnWarnings` | `boolean` | `false` | Promote warnings to hard errors (`ok: false`) |
| `ignoreWarnings` | `string[]` | `[]` | Warning codes to suppress entirely |

**Returns:** `Promise<RenderResult>` — a discriminated union on `ok`:

```typescript
// Success
{ ok: true, text: string, postExecution: PostExecutionAction[], errors?: RenderError[] }

// Failure
{ ok: false, text: string, postExecution: PostExecutionAction[], errors: RenderError[] }
```

When `ok` is `true`, `errors` (if present) contains only non-fatal warnings. When `ok` is `false`, `text` contains best-effort partial output.

**Example:**

```typescript
import { render, createPromptFromSource } from 'pupt-lib';

const element = await createPromptFromSource(source, 'test.prompt');
const result = await render(element, {
  inputs: { userName: 'Alice' },
});

if (result.ok) {
  console.log(result.text);
}
```

**Warnings:**

Warning codes use the `warn_` prefix convention. When `ok` is `true`, any warnings appear in the `errors` array. You can control warning behavior with two options:

- **Suppress specific warnings** with `ignoreWarnings` — the warning is dropped entirely:
  ```typescript
  const result = await render(element, { ignoreWarnings: ['warn_missing_task'] });
  ```
- **Promote warnings to errors** with `throwOnWarnings` — all warnings cause `ok: false`:
  ```typescript
  const result = await render(element, { throwOnWarnings: true });
  ```

Current warning codes:

| Code | Component | Condition |
|------|-----------|-----------|
| `warn_missing_task` | Prompt | No `<Task>` child found |
| `warn_conflicting_instructions` | Prompt | `<Format strict>` and `<ChainOfThought showReasoning>` used together |

Use `isWarningCode(code)` to check whether a `RenderError` code is a warning.

---

### `createPrompt(filePath, options?)`

Load a `.tsx` or `.prompt` file from disk and return a PuptElement. Use this when you have prompt files on the filesystem and want to render them programmatically. **Node.js only.**

```typescript
async function createPrompt(filePath: string, options?: CreatePromptOptions): Promise<PuptElement>
```

| Name | Type | Description |
|------|------|-------------|
| `filePath` | `string` | Path to the `.tsx` or `.prompt` file |
| `options` | `CreatePromptOptions` | Configuration |

**CreatePromptOptions:**

| Field | Type | Description |
|-------|------|-------------|
| `components` | `Record<string, ComponentType>` | Custom components to make available |

---

### `createPromptFromSource(source, filename, options?)`

Transform a JSX source string and return a PuptElement. Use this when you have prompt source code as a string -- for example, from an editor, a database, or an API response. Works in both Node.js and browser.

```typescript
async function createPromptFromSource(
  source: string,
  filename: string,
  options?: CreatePromptOptions
): Promise<PuptElement>
```

| Name | Type | Description |
|------|------|-------------|
| `source` | `string` | JSX source code |
| `filename` | `string` | Filename for error messages; extension determines preprocessing (`.prompt` files get auto-imports) |
| `options` | `CreatePromptOptions` | Configuration |

**Example:**

```typescript
import { createPromptFromSource, render } from 'pupt-lib';

const source = `
  <Prompt name="test">
    <Role>Assistant</Role>
    <Task>Help the user.</Task>
  </Prompt>
`;

const element = await createPromptFromSource(source, 'test.prompt');
const result = await render(element);
```

---

### `createInputIterator(element, options?)`

Create an iterator that walks the element tree, discovers Ask components, and collects user inputs one at a time. Use this to build interactive prompts where you need to gather values before rendering -- for example, a CLI wizard or a browser form.

```typescript
function createInputIterator(element: PuptElement, options?: InputIteratorOptions): InputIterator
```

**InputIteratorOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `validateOnSubmit` | `boolean` | `true` | Validate values on submit |
| `environment` | `'node' \| 'browser'` | auto-detected | Override environment detection |
| `values` | `Record<string, unknown>` | `{}` | Pre-supply input values (skipped during iteration) |
| `nonInteractive` | `boolean` | `false` | Auto-fill from defaults |
| `onMissingDefault` | `'error' \| 'skip'` | `'error'` | Strategy when required input has no default (non-interactive mode) |

**InputIterator interface:**

| Method | Returns | Description |
|--------|---------|-------------|
| `start()` | `Promise<void>` | Start collecting requirements |
| `current()` | `InputRequirement \| null` | Get current input requirement |
| `submit(value)` | `Promise<ValidationResult>` | Submit and validate a value |
| `advance()` | `Promise<void>` | Move to the next unfilled requirement |
| `isDone()` | `boolean` | Check if all inputs are collected |
| `getValues()` | `Map<string, unknown>` | Get all collected values |
| `runNonInteractive()` | `Promise<Map<string, unknown>>` | Auto-fill all inputs from defaults |

**InputRequirement:**

```typescript
interface InputRequirement {
  name: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' |
        'date' | 'secret' | 'file' | 'path' | 'rating' | 'object' | 'array';
  required: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  options?: Array<{ value: string; label: string; text?: string }>;
}
```

**ValidationResult:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string; code: string }>;
  warnings: Array<{ field: string; message: string }>;
}
```

---

## Component Base Class

### `Component<Props, ResolveType>`

Extend this abstract class to create custom class-based components. Class components give you access to the render context, prop validation via Zod schemas, and a two-phase lifecycle (resolve then render). If you just need to transform props into text, a function component is simpler -- but class components are the right choice when you need validation, resolved values, or context access.

```typescript
abstract class Component<Props = Record<string, unknown>, ResolveType = void> {
  static schema: ZodObject<ZodRawShape>;
  static resolveSchema?: ZodObject<ZodRawShape>;
  static hoistName?: boolean;

  resolve?(props: Props, context: RenderContext): ResolveType | Promise<ResolveType>;
  render?(props: Props, resolvedValue: ResolveType, context: RenderContext): PuptNode | Promise<PuptNode>;

  protected getProvider(context: RenderContext): LlmProvider;
  protected getDelimiter(context: RenderContext): 'xml' | 'markdown' | 'none';
  protected hasContent(children: PuptNode): boolean;
}
```

**Lifecycle:**

Components follow a two-phase lifecycle. Both methods are optional -- implement one or both depending on your needs.

1. **`resolve(props, context)`** -- Compute a value. The renderer stores this value so other components that reference this one can access it.
2. **`render(props, resolvedValue, context)`** -- Produce output. Receives the resolved value as the second argument.

If you implement only `resolve()`, the renderer stringifies the resolved value as the component's output. If you implement only `render()`, the `resolvedValue` argument is `undefined`. Both methods can be synchronous or asynchronous.

**Static properties:**

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `ZodObject` | Zod schema for prop validation |
| `resolveSchema` | `ZodObject` | Zod schema for resolved value validation |
| `hoistName` | `boolean` | When `true`, the `name` prop is hoisted to a variable in `.prompt` files |

**Protected helpers:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getProvider(context)` | `LlmProvider` | Get the current LLM provider from context |
| `getDelimiter(context)` | `'xml' \| 'markdown' \| 'none'` | Get delimiter style based on output format |
| `hasContent(children)` | `boolean` | Check if children have meaningful content |

### `isComponentClass(value)`

Type guard to check if a value is a Component class.

```typescript
function isComponentClass(value: unknown): value is typeof Component
```

### `COMPONENT_MARKER`

Symbol used to identify Component classes: `Symbol.for('pupt-lib:component:v1')`.

---

## Types

These are the core TypeScript types you encounter when working with pupt-lib. All are exported from the main `pupt-lib` entry point.

### RenderResult

The return type of `render()`. It is a discriminated union on `ok` -- check `result.ok` to determine whether rendering succeeded or failed.

```typescript
type RenderResult = RenderSuccess | RenderFailure;

interface RenderSuccess {
  ok: true;
  text: string;
  errors?: RenderError[];
  postExecution: PostExecutionAction[];
}

interface RenderFailure {
  ok: false;
  text: string;
  errors: RenderError[];
  postExecution: PostExecutionAction[];
}
```

### RenderError

```typescript
interface RenderError {
  component: string;
  prop: string | null;
  message: string;
  code: string;
  path: (string | number)[];
  received?: unknown;
  expected?: string;
}
```

### RenderContext

Every component receives a `RenderContext` during rendering. It carries user inputs, environment configuration, accumulated errors, and a shared metadata store for cross-component communication.

```typescript
interface RenderContext {
  inputs: Map<string, unknown>;
  env: EnvironmentContext;
  postExecution: PostExecutionAction[];
  errors: RenderError[];
  metadata: Map<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `inputs` | `Map<string, unknown>` | User input values collected by Ask components |
| `env` | `EnvironmentContext` | Full [environment configuration](/developers/environment) |
| `postExecution` | `PostExecutionAction[]` | Post-execution actions that components register (e.g., open a file, run a command) |
| `errors` | `RenderError[]` | Validation and runtime errors accumulated during rendering |
| `metadata` | `Map<string, unknown>` | Shared key-value store for cross-component communication |

### EnvironmentContext

The full environment configuration that controls how components render. You typically create one with `createEnvironment()` and pass it via `RenderOptions.env`. See the [Environment Reference](/developers/environment) for detailed field documentation.

```typescript
interface EnvironmentContext {
  llm: LlmConfig;
  output: OutputConfig;
  code: CodeConfig;
  user: UserConfig;
  runtime: RuntimeConfig;
  prompt: PromptConfig;
}
```

### PostExecutionAction

```typescript
type PostExecutionAction = ReviewFileAction | OpenUrlAction | RunCommandAction;

interface ReviewFileAction { type: 'reviewFile'; file: string; editor?: string; }
interface OpenUrlAction { type: 'openUrl'; url: string; browser?: string; }
interface RunCommandAction { type: 'runCommand'; command: string; cwd?: string; env?: Record<string, string>; }
```

### PuptElement / PuptNode

```typescript
type PuptNode = string | number | boolean | null | undefined | PuptElement | PuptNode[];
```

Use `isPuptElement(value)` to check if a value is a PuptElement.

### ComponentType

```typescript
type ComponentType = typeof Component | ((props: any) => PuptNode);
```

### LlmProvider

```typescript
type LlmProvider = 'anthropic' | 'openai' | 'google' | 'meta' | 'mistral' |
                   'deepseek' | 'xai' | 'cohere' | 'unspecified';
```

---

## Environment Helpers

These functions help you build and inspect the environment configuration that drives rendering behavior -- things like which LLM provider to optimize for, what output format to use, and what delimiter style to apply.

### `createEnvironment(overrides?)`

Create an EnvironmentContext by merging your overrides with the defaults. The result is validated against Zod schemas, so you get an error immediately if you pass an invalid value.

```typescript
function createEnvironment(overrides?: Partial<EnvironmentContext>): EnvironmentContext
```

See the [Environment Reference](/developers/environment) for full details.

### `inferProviderFromModel(model)`

Infer the LLM provider from a model name.

```typescript
function inferProviderFromModel(model: string): LlmProvider | null
```

Matches: `claude*`/`opus`/`sonnet`/`haiku` -> anthropic, `gpt-*`/`chatgpt-*`/`o1*`/`o3*`/`o4*` -> openai, `gemini*` -> google, `llama*` -> meta, `mistral*`/`mixtral*`/`codestral*`/`pixtral*` -> mistral, `deepseek*` -> deepseek, `grok*` -> xai, `command*` -> cohere.

### `DEFAULT_ENVIRONMENT`

The default EnvironmentContext with `provider: 'unspecified'`, `format: 'unspecified'`, etc.

### `LLM_PROVIDERS`

Readonly array of all provider strings: `['anthropic', 'openai', 'google', 'meta', 'mistral', 'deepseek', 'xai', 'cohere', 'unspecified']`.

---

## Pupt Class

The `Pupt` class is the high-level API for loading prompt libraries from multiple sources (npm packages, local paths, URLs, GitHub repos), discovering the prompts they contain, and searching across them. Use it when you are building a tool that needs to work with collections of prompts rather than individual files.

```typescript
class Pupt {
  constructor(config: PuptInitConfig);
  async init(): Promise<void>;
  getPrompts(filter?: { tags?: string[] }): DiscoveredPromptWithMethods[];
  getPrompt(name: string): DiscoveredPromptWithMethods | undefined;
  searchPrompts(query: string, options?: Partial<SearchOptions>): SearchResult[];
  getTags(): string[];
  getPromptsByTag(tag: string): DiscoveredPromptWithMethods[];
}
```

**PuptInitConfig:**

```typescript
interface PuptInitConfig {
  modules?: ModuleEntry[];
  searchConfig?: SearchEngineConfig;
}
```

The `modules` array accepts three entry shapes:

| Entry Shape | Description | Example |
|---|---|---|
| `ResolvedModuleEntry` | Explicit type + source (primary format) | `{ name: 'lib', type: 'git', source: '...' }` |
| `PromptSource` | Custom source instance (programmatic use) | `new S3PromptSource({ bucket: '...' })` |
| `{ source, config }` | Dynamic package loader (config-file-driven) | `{ source: 'pupt-source-s3', config: { ... } }` |

**ResolvedModuleEntry** is the primary format. The `type` field determines where pupt-lib looks for prompts. This is also the format that tools like `pupt` produce after installing and tracking libraries:

```typescript
interface ResolvedModuleEntry {
  name: string;                              // display name
  type: 'git' | 'npm' | 'local' | 'url';    // explicit source type
  source: string;                            // source identifier
  promptDirs?: string[];                     // override default 'prompts/' convention
  version?: string;                          // semver, commit hash, etc.
}
```

See [Custom Sources](/developers/custom-sources) for `PromptSource` and `{ source, config }` details. See [Prompt Sources](/modules/prompt-sources) for how entries are routed.

**DiscoveredPromptWithMethods:**

```typescript
interface DiscoveredPromptWithMethods {
  name: string;
  description: string;
  tags: string[];
  library: string;
  element: PuptElement;
  render(options?: Partial<RenderOptions>): Promise<RenderResult>;
  getInputIterator(): InputIterator;
}
```

**Example:**

```typescript
import { Pupt } from 'pupt-lib';

const pupt = new Pupt({
  modules: [
    { name: 'acme-prompts', type: 'npm', source: '@acme/prompts' },
    { name: 'local-prompts', type: 'local', source: './local-prompts/' },
  ],
});

await pupt.init();

const prompts = pupt.getPrompts({ tags: ['development'] });
const results = pupt.searchPrompts('code review');

const prompt = pupt.getPrompt('security-review');
if (prompt) {
  const result = await prompt.render({ inputs: { code: sourceCode } });
  console.log(result.text);
}
```

---

## Search

The search system lets you index a collection of prompts and query them with fuzzy matching, tag filtering, and prefix support. The `Pupt` class uses this internally, but you can also create a standalone search engine for custom use cases.

### `createSearchEngine(config?)`

Create a fuzzy search engine backed by MiniSearch. You index prompts into it, then query by text with optional tag filters and result limits.

```typescript
function createSearchEngine(config?: SearchEngineConfig): SearchEngine
```

**SearchEngineConfig:**

```typescript
interface SearchEngineConfig {
  threshold?: number;           // Minimum score (default: 0.3)
  weights?: { name?: number; description?: number; tags?: number; content?: number };
                                // Default: { name: 3, description: 1.5, tags: 2, content: 1 }
  fuzzy?: boolean;              // Enable fuzzy matching (default: true)
  fuzziness?: number;           // Typo tolerance 0-1 (default: 0.2)
  prefix?: boolean;             // Enable prefix matching (default: true)
  combineWith?: 'AND' | 'OR';  // How to combine terms (default: 'AND')
}
```

**SearchEngine interface:**

| Method | Returns | Description |
|--------|---------|-------------|
| `index(prompts)` | `void` | Add prompts to the index |
| `search(query, options?)` | `SearchResult[]` | Search with optional tag filter and limit |
| `getByTag(tag)` | `SearchablePrompt[]` | Get prompts by tag |
| `getAllTags()` | `string[]` | Get all unique tags |
| `clear()` | `void` | Clear the index |

### `FileSearchEngine`

File search engine with fuzzy matching and directory caching. Use it to build file pickers and path autocompletion. **Node.js only.**

The preferred way to create an instance is the async `FileSearchEngine.create()` factory, which loads Node.js modules before construction. If you have already called `loadNodeModules()`, you can use the constructor directly.

```typescript
class FileSearchEngine {
  static async create(config?: FileSearchEngineConfig): Promise<FileSearchEngine>;
  constructor(config?: FileSearchEngineConfig);
  async search(query: string, signal?: AbortSignal): Promise<FileInfo[]>;
  async listDirectory(dirPath: string): Promise<FileInfo[]>;
  parseSearchQuery(query: string): { searchPath: string; searchTerm: string };
  formatFileInfo(fileInfo: FileInfo): FileSearchResult;
  clearCache(): void;
  getBasePath(): string;
  setBasePath(basePath: string): void;
}
```

---

## Utilities

Helper functions for common tasks inside component `render()` methods. You rarely need these outside of custom component code.

### `wrapWithDelimiter(content, tag, delimiter)`

Wrap content with XML tags, markdown headers, or nothing. Most built-in components use this to respect the user's chosen delimiter style.

```typescript
function wrapWithDelimiter(
  content: PuptNode,
  tag: string,
  delimiter: 'xml' | 'markdown' | 'none'
): PuptNode
```

- `'xml'` produces `<tag>\n{content}\n</tag>\n`
- `'markdown'` produces `## tag\n\n{content}`
- `'none'` produces `{content}`

### `findChildrenOfType(children, type)`

Find all children matching a component type. Searches through Fragments automatically.

```typescript
function findChildrenOfType(children: PuptNode, type: ComponentType | string): PuptElement[]
```

### `partitionChildren(children, type)`

Split children into matching and non-matching groups.

```typescript
function partitionChildren(children: PuptNode[], type: ComponentType | string): [PuptElement[], PuptNode[]]
```

### `isElementOfType(element, type)`

Check if an element matches a component type (by reference or name).

```typescript
function isElementOfType(element: PuptElement, type: ComponentType | string): boolean
```

---

## Preprocessor

The preprocessor handles the transformation that makes `.prompt` files work. It injects built-in component imports and wraps the JSX in an `export default` statement. You typically do not call these directly -- `createPrompt()` and `createPromptFromSource()` handle preprocessing automatically. These exports exist for tooling authors who need lower-level control.

### `preprocessSource(source, options?)`

Preprocess source code. For `.prompt` files, this injects imports for all built-in components and wraps the JSX in an `export default`. For `.tsx` files, the source is returned unchanged.

```typescript
function preprocessSource(source: string, options?: PreprocessOptions): string
```

### `isPromptFile(filename)`

Check if a filename has a `.prompt` extension.

```typescript
function isPromptFile(filename: string): boolean
```

---

## Transformer

### `Transformer`

Babel-based JSX transformer that compiles TSX source into executable JavaScript with `jsx()` calls. Works in both Node.js and browser. Like the preprocessor, you rarely need this directly -- it is used internally by `createPromptFromSource()`.

```typescript
class Transformer {
  async transformSourceAsync(source: string, filename: string): Promise<string>;
}
```

---

## Module Loader

### `ModuleLoader`

Loads prompt libraries from npm packages, URLs, local paths, or Git repositories. The `Pupt` class uses this internally; you only need it directly if you are building custom library-loading logic.

```typescript
class ModuleLoader {
  async loadEntry(entry: ModuleEntry): Promise<LoadedLibrary>;
  async loadResolvedEntry(entry: ResolvedModuleEntry): Promise<LoadedLibrary>;
  async loadPromptSource(source: PromptSource, name?: string): Promise<LoadedLibrary>;
  clear(): void;
}
```

---

## Ask Utilities

These exports let you build custom Ask-style components that participate in the input collection system. If you are creating a new input type (e.g., a color picker or a date range selector), use these to register your component's requirements with the iterator.

### `askBaseSchema`

Zod schema with the common fields every Ask component shares: `name`, `label`, `description?`, `required?`, `silent?`. Extend this schema in your custom Ask component to get built-in validation for free.

### `attachRequirement(context, requirement)`

Register an input requirement with the render context. Call this from your component's `render()` method to tell the input iterator about a value your component needs.

```typescript
function attachRequirement(context: RenderContext, requirement: InputRequirement): void
```

---

## Presets & Constants

pupt-lib ships with curated preset data that built-in components use. All preset data is exported so you can use the same data in your own components or inspect what the built-in components produce.

| Export | Type | Description |
|--------|------|-------------|
| `ROLE_PRESETS` | `Record<string, RolePresetConfig>` | 30+ role presets |
| `TASK_PRESETS` | `Record<string, TaskPresetConfig>` | 10 task presets |
| `CONSTRAINT_PRESETS` | `Record<string, ConstraintPresetConfig>` | 8 constraint presets |
| `STEPS_PRESETS` | `Record<string, StepsPresetConfig>` | 5 steps presets |
| `DEFAULT_CONSTRAINTS` | `string[]` | 3 default constraint texts |
| `STANDARD_GUARDRAILS` | `Record<string, string[]>` | 3 guardrail presets |
| `EDGE_CASE_PRESETS` | `Record<string, Array<{ condition: string; action: string }>>` | 2 edge case presets |
| `FALLBACK_PRESETS` | `Record<string, Array<{ when: string; then: string }>>` | 1 fallback preset |
| `PROVIDER_ADAPTATIONS` | `Record<LlmProvider, ProviderAdaptations>` | Provider-specific rendering settings |
| `LANGUAGE_CONVENTIONS` | `Record<string, string[]>` | Language-specific coding conventions |

### ProviderAdaptations

```typescript
interface ProviderAdaptations {
  rolePrefix: string;
  constraintStyle: 'positive' | 'negative' | 'balanced';
  formatPreference: 'xml' | 'markdown' | 'json';
  instructionStyle: 'direct' | 'elaborate' | 'structured';
}
```

---

## Related

- [Writing Components](/developers/first-component) — building custom components
- [Environment Reference](/developers/environment) — full environment configuration
- [Variables Reference](/developers/variables) — variable system internals
- [Conditionals Reference](/developers/conditionals) — formula functions
- [Browser Support](/developers/browser) — CDN and import map utilities
