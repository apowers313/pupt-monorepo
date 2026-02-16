# Environment Reference

The environment tells pupt-lib about the world your prompt will run in — which LLM will receive it, what platform is executing it, and how the output should be formatted. Components use this information to adapt their rendering automatically.

For user-facing documentation, see the [Environment & Context](/guide/environment) guide.

## Quick Start

```typescript
import { render, createEnvironment } from 'pupt-lib';

const result = await render(element, {
  env: createEnvironment({
    llm: { model: 'claude-sonnet-4-5' },
    code: { language: 'typescript' },
  }),
});
```

With this environment, the `<Prompt>` component uses XML delimiters and positive constraint framing. `<Role>` renders with the Anthropic-preferred "You are " prefix. And `<If provider="anthropic">` conditionals evaluate to `true`.

---

## Environment Sections

The environment groups its configuration into six sections. Each section controls a different aspect of how pupt-lib renders your prompts:

| Section | Purpose | Example Fields |
|---------|---------|----------------|
| [`llm`](#llm-configuration) | Target LLM model and provider | `model`, `provider`, `temperature` |
| [`output`](#output-configuration) | Output formatting preferences | `format`, `trim`, `indent` |
| [`code`](#code-configuration) | Code generation settings | `language`, `highlight` |
| [`user`](#user-configuration) | Caller/user context | `editor` |
| [`runtime`](#runtime-configuration) | Auto-detected system values | `hostname`, `username`, `platform`, `locale` |
| [`prompt`](#prompt-configuration) | Prompt component defaults | `includeRole`, `delimiter`, `defaultRole` |

---

## LLM Configuration

`env.llm` — describes the target LLM.

```typescript
interface LlmConfig {
  model: string;
  provider: LlmProvider;
  maxTokens?: number;
  temperature?: number;
}
```

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `model` | `string` | `'unspecified'` | Any string | Model ID (e.g., `'claude-sonnet-4-5'`, `'gpt-4o'`). |
| `provider` | `LlmProvider` | `'unspecified'` | Must be a valid provider | Model creator. Auto-inferred from `model` if not set. |
| `maxTokens` | `number` | — | Positive integer | Maximum output tokens. |
| `temperature` | `number` | — | 0 to 2 | Sampling temperature. |

### Supported Providers

| Provider | Model Patterns |
|----------|---------------|
| `anthropic` | `claude*`, `opus`, `sonnet`, `haiku` |
| `openai` | `gpt-*`, `chatgpt-*`, `o1`, `o3`, `o4` (followed by `-`, `_`, or end of string) |
| `google` | `gemini*` |
| `meta` | `llama*` |
| `mistral` | `mistral*`, `mixtral*`, `codestral*`, `pixtral*` |
| `deepseek` | `deepseek*` |
| `xai` | `grok*` |
| `cohere` | `command*` |
| `unspecified` | *(default)* |

### Provider Inference

When you specify a `model` but omit `provider`, `createEnvironment` infers the provider automatically by matching the model name against the patterns in the table above. This inference runs as a Zod transform on the `llm` config, so it happens during validation.

```typescript
const env = createEnvironment({ llm: { model: 'claude-sonnet-4-5' } });
console.log(env.llm.provider); // 'anthropic'

const env2 = createEnvironment({ llm: { model: 'gpt-4o' } });
console.log(env2.llm.provider); // 'openai'
```

If your model name doesn't match any known pattern (for example, a fine-tuned or self-hosted model), set the provider explicitly:

```typescript
const env = createEnvironment({
  llm: { model: 'my-custom-model', provider: 'anthropic' },
});
```

### Provider Adaptations

Components consult a provider-specific adaptation table to adjust their rendering. The table below shows the defaults for each provider (defined in `PROVIDER_ADAPTATIONS`):

| Provider | Role Prefix | Constraint Style | Format Preference | Instruction Style |
|----------|-------------|-----------------|-------------------|-------------------|
| `anthropic` | `"You are "` | positive | xml | structured |
| `openai` | `"You are "` | balanced | markdown | direct |
| `google` | `"Your role: "` | positive | markdown | direct |
| `meta` | `"You are "` | balanced | markdown | direct |
| `mistral` | `"You are "` | balanced | markdown | direct |
| `deepseek` | `"You are "` | balanced | markdown | structured |
| `xai` | `"You are "` | balanced | markdown | direct |
| `cohere` | `"You are "` | balanced | markdown | direct |
| `unspecified` | `"You are "` | positive | markdown | structured |

---

## Output Configuration

`env.output` — controls how pupt-lib formats the rendered prompt text.

```typescript
interface OutputConfig {
  format: 'xml' | 'markdown' | 'json' | 'text' | 'unspecified';
  trim: boolean;
  indent: string;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | `'xml' \| 'markdown' \| 'json' \| 'text' \| 'unspecified'` | `'unspecified'` | Sets the output format. When set to `'markdown'`, components use heading-style delimiters (`## tag`) instead of XML-style (`<tag>`). |
| `trim` | `boolean` | `true` | Trim whitespace from output. |
| `indent` | `string` | `'  '` (2 spaces) | Indentation string for indented output. |

---

## Code Configuration

`env.code` — configures language-specific behavior for code-related prompts.

```typescript
interface CodeConfig {
  language: string;
  highlight?: boolean;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | `string` | `'unspecified'` | Target language (e.g., `'typescript'`, `'python'`). |
| `highlight` | `boolean` | — | Request syntax highlighting in output. |

**Language conventions** (available via `LANGUAGE_CONVENTIONS`):

Each entry is an array of convention strings that components can incorporate into rendered output.

| Language | Conventions |
|----------|------------|
| `typescript` | `'Use explicit type annotations'`, `'Prefer interfaces over type aliases for objects'`, `'Use async/await over raw promises'` |
| `python` | `'Follow PEP 8 style guide'`, `'Use type hints'`, `'Prefer list comprehensions where readable'` |
| `rust` | `'Use idiomatic Rust patterns'`, `'Handle errors with Result type'`, `'Prefer references over cloning'` |
| `go` | `'Follow effective Go guidelines'`, `'Handle errors explicitly'`, `'Use short variable names in small scopes'` |
| `unspecified` | `'Follow language best practices'` |

---

## User Configuration

`env.user` — context about the person or system running the prompt.

```typescript
interface UserConfig {
  editor: string;
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `editor` | `string` | `'unknown'` | Editor (e.g., `'vscode'`, `'cursor'`, `'vim'`). Used by `<ReviewFile>`. |

---

## Runtime Configuration

`env.runtime` — values that pupt-lib auto-detects from the host system at render time.

```typescript
interface RuntimeConfig {
  hostname: string;
  username: string;
  cwd: string;
  platform: string;
  os: string;
  locale: string;
  timestamp: number;
  date: string;
  time: string;
  uuid: string;
}
```

| Field | Type | Node.js | Browser |
|-------|------|---------|---------|
| `hostname` | `string` | `os.hostname()` | `'browser'` |
| `username` | `string` | `os.userInfo().username` | `'anonymous'` |
| `cwd` | `string` | `process.cwd()` | `'/'` |
| `platform` | `string` | `'node'` | `'browser'` |
| `os` | `string` | `os.platform()` (e.g., `'linux'`, `'darwin'`) | `'unknown'` |
| `locale` | `string` | From `LANG`/`LC_ALL`/`LC_MESSAGES` env vars or `Intl` API | `navigator.language` |
| `timestamp` | `number` | `Date.now()` | `Date.now()` |
| `date` | `string` | ISO date `YYYY-MM-DD` | ISO date `YYYY-MM-DD` |
| `time` | `string` | ISO time `HH:MM:SS` | ISO time `HH:MM:SS` |
| `uuid` | `string` | `crypto.randomUUID()` | `crypto.randomUUID()` |

Each call to `render()` produces fresh `timestamp`, `date`, `time`, and `uuid` values. In Node.js, pupt-lib caches system values (`hostname`, `username`, `os`) after the first detection and reuses them on subsequent calls.

---

## Prompt Configuration

`env.prompt` — tells `<Prompt>` which default sections to auto-generate and how to delimit them.

```typescript
interface PromptConfig {
  includeRole: boolean;
  includeFormat: boolean;
  includeConstraints: boolean;
  includeSuccessCriteria: boolean;
  includeGuardrails: boolean;
  defaultRole: string;
  defaultExpertise: string;
  delimiter: 'xml' | 'markdown' | 'none';
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `includeRole` | `boolean` | `true` | Auto-generate `<Role>` if none provided |
| `includeFormat` | `boolean` | `true` | Auto-generate `<Format>` if none provided |
| `includeConstraints` | `boolean` | `true` | Auto-generate `<Constraints>` if none provided |
| `includeSuccessCriteria` | `boolean` | `false` | Auto-generate `<SuccessCriteria>` |
| `includeGuardrails` | `boolean` | `false` | Auto-generate `<Guardrails>` |
| `defaultRole` | `string` | `'assistant'` | Role preset key for auto-generated role |
| `defaultExpertise` | `string` | `'general'` | Expertise area for auto-generated role |
| `delimiter` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Default delimiter style |

---

## Functions

### `createEnvironment(overrides?)`

Creates a validated `EnvironmentContext` by merging partial overrides with `DEFAULT_ENVIRONMENT`.

```typescript
function createEnvironment(overrides?: Partial<EnvironmentContext>): EnvironmentContext
```

This function shallow-merges your overrides into each section of the default environment, then validates every field against the Zod schemas. If any value fails validation, it throws a `ZodError`. During validation, pupt-lib also infers the `provider` from the `model` name if you haven't set one explicitly.

```typescript
// Minimal
const env = createEnvironment({ llm: { model: 'claude-sonnet-4-5' } });

// Multiple sections
const env2 = createEnvironment({
  llm: { model: 'gpt-4o', temperature: 0.5 },
  output: { format: 'markdown' },
  prompt: { includeGuardrails: true },
});

// Invalid values throw
createEnvironment({ llm: { temperature: 5 } });
// ZodError: temperature must be <= 2
```

### `inferProviderFromModel(model)`

Infers the LLM provider from a model name string. The matching is case-insensitive, so `'Claude-Sonnet-4-5'` and `'claude-sonnet-4-5'` both return `'anthropic'`.

```typescript
function inferProviderFromModel(model: string): LlmProvider | null
```

```typescript
inferProviderFromModel('claude-sonnet-4-5');   // 'anthropic'
inferProviderFromModel('gpt-4o');              // 'openai'
inferProviderFromModel('gemini-pro');          // 'google'
inferProviderFromModel('my-fine-tuned-model'); // null
```

### `createRuntimeConfig()`

Creates a `RuntimeConfig` with auto-detected system values. The `render()` function calls this internally on every invocation to capture fresh timestamps and system state.

```typescript
function createRuntimeConfig(): RuntimeConfig
```

### `ensureRuntimeCacheReady()`

Waits for the Node.js runtime cache to finish initializing. In browser environments, this resolves immediately. You'll mainly use this in tests to guarantee that system values like `hostname` and `username` are available before assertions run.

```typescript
async function ensureRuntimeCacheReady(): Promise<void>
```

---

## Constants

### `DEFAULT_ENVIRONMENT`

```typescript
{
  llm: { model: 'unspecified', provider: 'unspecified' },
  output: { format: 'unspecified', trim: true, indent: '  ' },
  code: { language: 'unspecified' },
  user: { editor: 'unknown' },
  runtime: {},  // auto-populated at render time
  prompt: {
    includeRole: true,
    includeFormat: true,
    includeConstraints: true,
    includeSuccessCriteria: false,
    includeGuardrails: false,
    defaultRole: 'assistant',
    defaultExpertise: 'general',
    delimiter: 'xml',
  },
}
```

### `LLM_PROVIDERS`

```typescript
const LLM_PROVIDERS = [
  'anthropic', 'openai', 'google', 'meta', 'mistral',
  'deepseek', 'xai', 'cohere', 'unspecified',
] as const;
```

---

## Using the Environment in Components

### Class Components

You access the environment through `context.env` in the render method:

```typescript
class PlatformNote extends Component<{ children: PuptNode }> {
  render(props: { children: PuptNode }, _resolved: void, context: RenderContext): PuptNode {
    const { platform } = context.env.runtime;
    const { provider } = context.env.llm;

    return [
      props.children,
      `\n(Running on ${platform}, targeting ${provider})`,
    ];
  }
}
```

The `Component` base class provides convenience methods:

```typescript
class MyComponent extends Component<{ children: PuptNode }> {
  render(props: { children: PuptNode }, _resolved: void, context: RenderContext): PuptNode {
    const provider = this.getProvider(context);    // e.g., 'anthropic'
    const delimiter = this.getDelimiter(context);  // 'xml' or 'markdown'
    return props.children;
  }
}
```

### Function Components

```typescript
function Greeting(props: { name: string }, context?: RenderContext): string {
  const locale = context?.env.runtime.locale ?? 'en-US';

  if (locale.startsWith('es')) {
    return `Hola, ${props.name}!`;
  }
  return `Hello, ${props.name}!`;
}
```

---

## Related

- [Environment & Context](/guide/environment) — user-facing guide
- [API Reference](/developers/api) — `render()`, `RenderContext`, types
- [Writing Components](/developers/first-component) — using context in components
