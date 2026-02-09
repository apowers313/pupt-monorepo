# API Reference

Complete API reference for pupt-lib.

---

## Core Functions

### `render(element, options?)`

Render a PuptElement tree to a prompt string. This function is **async**.

```typescript
async function render(element: PuptElement, options?: RenderOptions): Promise<RenderResult>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `element` | `PuptElement` | The root element to render |
| `options?` | `RenderOptions` | Render configuration |

**RenderOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `inputs?` | `Map<string, unknown> \| Record<string, unknown>` | `new Map()` | Input values for Ask components |
| `env?` | `EnvironmentContext` | `DEFAULT_ENVIRONMENT` | Environment configuration |
| `trim?` | `boolean` | `true` | Trim whitespace from output |

**Returns:** `Promise<RenderResult>` — a discriminated union on `ok`:

```typescript
// Success
{ ok: true, text: string, postExecution: PostExecutionAction[], errors?: RenderError[] }

// Failure
{ ok: false, text: string, postExecution: PostExecutionAction[], errors: RenderError[] }
```

When `ok` is `true`, `errors` (if present) contains only non-fatal warnings. When `ok` is `false`, `text` contains best-effort partial output and `errors` contains validation or runtime errors.

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

### `createPrompt(filePath, options?)`

Load a `.tsx` or `.prompt` file and return a PuptElement. **Node.js only** (reads from filesystem).

```typescript
async function createPrompt(filePath: string, options?: CreatePromptOptions): Promise<PuptElement>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `filePath` | `string` | Path to the `.tsx` or `.prompt` file |
| `options?` | `CreatePromptOptions` | Configuration |

**CreatePromptOptions:**

| Field | Type | Description |
|-------|------|-------------|
| `components?` | `Record<string, ComponentType>` | Custom components to make available (primarily for browser environments) |

### `createPromptFromSource(source, filename, options?)`

Transform a JSX source string and return a PuptElement. Works in both Node.js and browser.

```typescript
async function createPromptFromSource(
  source: string,
  filename: string,
  options?: CreatePromptOptions
): Promise<PuptElement>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `source` | `string` | JSX source code |
| `filename` | `string` | Filename for error messages; extension determines preprocessing (`.prompt` files get auto-imports) |
| `options?` | `CreatePromptOptions` | Configuration |

**Example:**

```typescript
import { createPromptFromSource, render } from 'pupt-lib';

const source = `
  <Prompt name="test">
    <Role>Assistant</Role>
    <Task>Help the user.</Task>
  </Prompt>
`;

// .prompt files get auto-imports
const element = await createPromptFromSource(source, 'test.prompt');
const result = await render(element);
```

### `createInputIterator(element, options?)`

Create an iterator for collecting user inputs from Ask components.

```typescript
function createInputIterator(element: PuptElement, options?: InputIteratorOptions): InputIterator
```

**InputIteratorOptions:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `validateOnSubmit?` | `boolean` | `true` | Validate values on submit |
| `environment?` | `'node' \| 'browser'` | auto-detected | Override environment detection |
| `values?` | `Record<string, unknown>` | `{}` | Pre-supply input values (skipped during iteration) |
| `nonInteractive?` | `boolean` | `false` | Auto-fill from defaults |
| `onMissingDefault?` | `'error' \| 'skip'` | `'error'` | Strategy when required input has no default (non-interactive mode) |

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
  // ...plus type-specific fields (language, extensions, multiple, etc.)
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

Abstract base class for creating custom components.

```typescript
abstract class Component<Props = Record<string, unknown>, ResolveType = void> {
  static schema: ZodObject<ZodRawShape>;       // Zod schema for prop validation
  static resolveSchema?: ZodObject<ZodRawShape>; // Optional schema for resolved value
  static hoistName?: boolean;                    // Enable name-hoisting for .prompt files

  resolve?(props: Props, context: RenderContext): ResolveType | Promise<ResolveType>;
  render?(props: Props, resolvedValue: ResolveType, context: RenderContext): PuptNode | Promise<PuptNode>;

  protected getProvider(context: RenderContext): LlmProvider;
  protected getDelimiter(context: RenderContext): 'xml' | 'markdown' | 'none';
  protected hasContent(children: PuptNode): boolean;
}
```

**Lifecycle:**

1. **`resolve(props, context)`** (optional) — Compute a value. Stored and passed to other components that reference this one.
2. **`render(props, resolvedValue, context)`** (optional) — Produce output. Receives the resolved value as the second argument.

If only `resolve()` is implemented, the resolved value is stringified. If only `render()` is implemented, `resolvedValue` is `undefined`.

**Static properties:**

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `ZodObject` | Zod schema for prop validation |
| `resolveSchema?` | `ZodObject` | Zod schema for resolved value validation |
| `hoistName?` | `boolean` | When `true`, the `name` prop is hoisted to a variable in `.prompt` files (used by File, ReviewFile) |

**Protected helpers:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getProvider(context)` | `LlmProvider` | Get the current LLM provider from context |
| `getDelimiter(context)` | `'xml' \| 'markdown' \| 'none'` | Get delimiter style based on output format |
| `hasContent(children)` | `boolean` | Check if children have meaningful content |

**Example — resolve-only component:**

```typescript
class UserInfo extends Component<{ userId: string }, { name: string; role: string }> {
  static schema = z.object({ userId: z.string() });

  async resolve(props: { userId: string }) {
    const user = await fetchUser(props.userId);
    return { name: user.name, role: user.role };
  }
  // No render() — resolved value is stringified
}
```

**Example — both resolve and render:**

```typescript
class DataFetcher extends Component<{ id: number }, { data: string }> {
  resolve(props: { id: number }) {
    return { data: `Data for ${props.id}` };
  }
  render(props: { id: number }, value: { data: string }, context: RenderContext) {
    return `Fetched: ${value.data}`;
  }
}
```

### `isComponentClass(value)`

Type guard to check if a value is a Component class.

```typescript
function isComponentClass(value: unknown): value is typeof Component
```

### `COMPONENT_MARKER`

Symbol used to identify Component classes: `Symbol.for('pupt-lib:component:v1')`.

---

## Types

### RenderResult

Discriminated union on `ok`.

```typescript
type RenderResult = RenderSuccess | RenderFailure;

interface RenderSuccess {
  ok: true;
  text: string;
  errors?: RenderError[];       // Non-fatal warnings only
  postExecution: PostExecutionAction[];
}

interface RenderFailure {
  ok: false;
  text: string;                 // Best-effort output
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
  code: string;                 // Zod issue code, 'runtime_error', 'validation_warning', etc.
  path: (string | number)[];
  received?: unknown;
  expected?: string;
}
```

### RenderContext

Passed to components during rendering.

```typescript
interface RenderContext {
  inputs: Map<string, unknown>;
  env: EnvironmentContext;
  postExecution: PostExecutionAction[];
  errors: RenderError[];
  metadata: Map<string, unknown>;
}
```

### EnvironmentContext

Full environment configuration.

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

### LlmConfig

```typescript
interface LlmConfig {
  model: string;              // default: 'unspecified'
  provider: LlmProvider;      // default: 'unspecified', auto-inferred from model
  maxTokens?: number;
  temperature?: number;       // 0-2
}
```

### LlmProvider

```typescript
type LlmProvider = 'anthropic' | 'openai' | 'google' | 'meta' | 'mistral' |
                   'deepseek' | 'xai' | 'cohere' | 'unspecified';
```

### OutputConfig

```typescript
interface OutputConfig {
  format: 'xml' | 'markdown' | 'json' | 'text' | 'unspecified';  // default: 'unspecified'
  trim: boolean;              // default: true
  indent: string;             // default: '  '
}
```

### PromptConfig

Controls `<Prompt>` default section behavior.

```typescript
interface PromptConfig {
  includeRole: boolean;           // default: true
  includeFormat: boolean;         // default: true
  includeConstraints: boolean;    // default: true
  includeSuccessCriteria: boolean; // default: false
  includeGuardrails: boolean;     // default: false
  defaultRole: string;            // default: 'assistant'
  defaultExpertise: string;       // default: 'general'
  delimiter: 'xml' | 'markdown' | 'none';  // default: 'xml'
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

// PuptElement has: [TYPE], [PROPS], [CHILDREN]
// Use isPuptElement(value) to check
```

### ComponentType

```typescript
type ComponentType = typeof Component | ((props: any) => PuptNode);
```

---

## Environment Helpers

### `createEnvironment(overrides?)`

Create an EnvironmentContext with optional overrides. Validates against the schema.

```typescript
function createEnvironment(overrides?: Partial<EnvironmentContext>): EnvironmentContext
```

### `inferProviderFromModel(model)`

Infer the LLM provider from a model name.

```typescript
function inferProviderFromModel(model: string): LlmProvider | null
```

Matches: `claude*` → anthropic, `gpt-*` → openai, `gemini*` → google, `llama*` → meta, `mistral*`/`mixtral*` → mistral, `deepseek*` → deepseek, `grok*` → xai, `command*` → cohere.

### `DEFAULT_ENVIRONMENT`

The default EnvironmentContext with `provider: 'unspecified'`, `format: 'unspecified'`, etc.

### `LLM_PROVIDERS`

Readonly array of all provider strings: `['anthropic', 'openai', 'google', 'meta', 'mistral', 'deepseek', 'xai', 'cohere', 'unspecified']`.

---

## Pupt Class

High-level API for loading prompt libraries, discovering prompts, and searching.

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
  modules?: string[];           // npm packages, URLs, or local paths
  searchConfig?: SearchEngineConfig;
}
```

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
  modules: ['@acme/prompts', './local-prompts/'],
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

### `createSearchEngine(config?)`

Create a fuzzy search engine for prompts.

```typescript
function createSearchEngine(config?: SearchEngineConfig): SearchEngine
```

**SearchEngineConfig:**

```typescript
interface SearchEngineConfig {
  threshold?: number;           // Minimum score (default: 0.3)
  weights?: { name: number; description: number; tags: number; content: number };
  fuzzy?: boolean;              // Enable fuzzy matching (default: true)
  fuzziness?: number;           // Typo tolerance (default: 0.2)
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

File search engine with fuzzy matching and caching. **Node.js only.**

```typescript
class FileSearchEngine {
  constructor(config?: FileSearchEngineConfig);
  async search(query: string, signal?: AbortSignal): Promise<FileInfo[]>;
  async listDirectory(dirPath: string): Promise<FileInfo[]>;
  formatFileInfo(fileInfo: FileInfo): FileSearchResult;
  clearCache(): void;
  getBasePath(): string;
  setBasePath(basePath: string): void;
}
```

---

## Utilities

### `wrapWithDelimiter(content, tag, delimiter)`

Wrap content with XML tags, markdown headers, or nothing.

```typescript
function wrapWithDelimiter(
  content: PuptNode,
  tag: string,
  delimiter: 'xml' | 'markdown' | 'none'
): PuptNode
```

- `'xml'` → `<tag>\n{content}\n</tag>\n`
- `'markdown'` → `## tag\n\n{content}`
- `'none'` → `{content}`

### `findChildrenOfType(children, type)`

Find all children matching a component type. Searches through Fragments.

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

### `preprocessSource(source, options?)`

Preprocess source code: inject imports for `.prompt` files, add `export default` wrapper.

```typescript
function preprocessSource(source: string, options?: PreprocessOptions): string
```

### `isPromptFile(filename)`

Check if a filename has a `.prompt` extension.

```typescript
function isPromptFile(filename: string): boolean
```

### `needsPreprocessing(source)`

Check if source code needs import injection (no existing imports).

```typescript
function needsPreprocessing(source: string): boolean
```

---

## Transformer

### `Transformer`

Babel-based JSX transformer. Works in both Node.js and browser.

```typescript
class Transformer {
  async transformSourceAsync(source: string, filename: string): Promise<string>;
}
```

---

## Module Loader

### `ModuleLoader`

Loads prompt libraries from npm packages, URLs, or local paths.

```typescript
class ModuleLoader {
  async load(source: string): Promise<LibraryLoadResult>;
}
```

---

## Browser Support

### `generatePuptLibImportMap(options?)`

Generate an import map for using pupt-lib in the browser.

```typescript
function generatePuptLibImportMap(options?: PuptLibImportMapOptions): ImportMap
```

### `generatePuptLibImportMapScript(options?)`

Generate a `<script type="importmap">` tag for browser usage.

```typescript
function generatePuptLibImportMapScript(options?: PuptLibImportMapOptions): string
```

---

## Presets & Constants

All preset data is exported for direct access:

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

See [COMPONENTS.md](COMPONENTS.md) for the full list of preset keys and values.

### ProviderAdaptations

```typescript
interface ProviderAdaptations {
  rolePrefix: string;                           // e.g., "You are " vs "Your role: "
  constraintStyle: 'positive' | 'negative' | 'balanced';
  formatPreference: 'xml' | 'markdown' | 'json';
  instructionStyle: 'direct' | 'elaborate' | 'structured';
}
```

---

## Ask Utilities

Exported for use by external Ask-style components:

### `askBaseSchema`

Zod schema with common Ask component fields: `name`, `label`, `description?`, `required?`, `silent?`.

### `attachRequirement(context, requirement)`

Register an input requirement with the render context (used internally by Ask components).

```typescript
function attachRequirement(context: RenderContext, requirement: InputRequirement): void
```
