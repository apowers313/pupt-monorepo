# Environment & Context

The environment tells pupt-lib about the world your prompt will run in -- which LLM will receive it, what platform is executing it, and how the output should be formatted. Components use this information to adapt their rendering automatically.

```tsx
import { render, createEnvironment } from 'pupt-lib';

const result = await render(<MyPrompt />, {
  env: createEnvironment({
    llm: { model: 'claude-sonnet-4-5' },
    code: { language: 'typescript' },
  }),
});
```

With this environment, the `<Prompt>` component knows it's targeting an Anthropic model and will use XML delimiters and positive constraint framing. A `<Role>` component will render with the Anthropic-preferred "You are " prefix. And any `<If provider="anthropic">` conditionals will evaluate to `true`.

## Quick Start

The simplest way to use the environment is through `createEnvironment()`, which accepts partial overrides and fills in sensible defaults:

```typescript
import { render, createEnvironment } from 'pupt-lib';

// Minimal -- just specify the model
const env = createEnvironment({
  llm: { model: 'gpt-4o' },
});

// The provider is automatically inferred as 'openai' from the model name
console.log(env.llm.provider); // 'openai'
```

If you don't pass an environment at all, `render()` uses `DEFAULT_ENVIRONMENT` with everything set to `'unspecified'` or sensible defaults. Runtime values (hostname, username, timestamp, etc.) are always auto-detected regardless.

## Environment Sections

The environment is organized into six configuration sections:

| Section | Purpose | Example Fields |
|---------|---------|----------------|
| `llm` | Target LLM model and provider | `model`, `provider`, `temperature` |
| `output` | Output formatting preferences | `format`, `trim`, `indent` |
| `code` | Code generation settings | `language`, `highlight` |
| `user` | Caller/user context | `editor` |
| `runtime` | Auto-detected system values | `hostname`, `username`, `platform`, `locale` |
| `prompt` | Prompt component defaults | `includeRole`, `delimiter`, `defaultRole` |

```typescript
const env = createEnvironment({
  llm: { model: 'claude-sonnet-4-5', temperature: 0.7 },
  output: { format: 'markdown' },
  code: { language: 'python' },
  user: { editor: 'vscode' },
  prompt: { delimiter: 'markdown', includeGuardrails: true },
});
```

---

## LLM Configuration (`env.llm`)

Describes the target LLM that will receive the rendered prompt. Components use this to adapt their output -- for example, Anthropic models get XML-tagged sections while OpenAI models get markdown headers.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `model` | `string` | `'unspecified'` | Model ID (e.g., `'claude-sonnet-4-5'`, `'gpt-4o'`, `'gemini-pro'`) |
| `provider` | `LlmProvider` | `'unspecified'` | Model creator. Auto-inferred from `model` if not set. |
| `maxTokens` | `number` | — | Maximum output tokens (positive integer) |
| `temperature` | `number` | — | Sampling temperature (0 to 2) |

### Supported Providers

Providers represent who created the model, not where it's hosted. AWS Bedrock and Azure are hosting platforms, not providers -- a Claude model on Bedrock is still `'anthropic'`.

| Provider | Model Patterns |
|----------|---------------|
| `anthropic` | `claude-*`, `opus`, `sonnet`, `haiku` |
| `openai` | `gpt-*`, `chatgpt-*`, `o1*`, `o3*`, `o4*` |
| `google` | `gemini*` |
| `meta` | `llama*` |
| `mistral` | `mistral*`, `mixtral*`, `codestral*`, `pixtral*` |
| `deepseek` | `deepseek*` |
| `xai` | `grok*` |
| `cohere` | `command*` |
| `unspecified` | *(default when no model is given or model is not recognized)* |

### Provider Inference

When you specify a `model` but not a `provider`, the provider is inferred automatically:

```typescript
const env = createEnvironment({
  llm: { model: 'claude-sonnet-4-5' },
});
console.log(env.llm.provider); // 'anthropic'

const env2 = createEnvironment({
  llm: { model: 'gpt-4o' },
});
console.log(env2.llm.provider); // 'openai'
```

You can also set the provider explicitly, which is useful for custom or fine-tuned models that don't match the standard naming patterns:

```typescript
const env = createEnvironment({
  llm: { model: 'my-custom-model', provider: 'anthropic' },
});
```

### Provider Adaptations

Each provider has preferred rendering settings that components consult automatically:

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

Components like `<Prompt>`, `<Role>`, `<Format>`, and `<Constraint>` use these adaptations internally. You don't need to think about them unless you're writing custom components.

---

## Output Configuration (`env.output`)

Controls how the rendered prompt text is formatted.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | `'xml' \| 'markdown' \| 'json' \| 'text' \| 'unspecified'` | `'unspecified'` | Output format. Components with delimiters check this to decide between XML tags and markdown headers. |
| `trim` | `boolean` | `true` | Whether to trim whitespace from the rendered output |
| `indent` | `string` | `'  '` (2 spaces) | Indentation string used by components that produce indented output |

When `format` is `'markdown'`, components that support delimiters will switch from XML-style `<section>...</section>` wrapping to markdown-style `## section` headers:

```typescript
// XML delimiters (default)
const env1 = createEnvironment({ output: { format: 'xml' } });

// Markdown delimiters
const env2 = createEnvironment({ output: { format: 'markdown' } });
```

---

## Code Configuration (`env.code`)

Settings for code-related prompts. Components can use this to tailor instructions to the target programming language.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `language` | `string` | `'unspecified'` | Target language (e.g., `'typescript'`, `'python'`, `'rust'`, `'go'`) |
| `highlight` | `boolean` | — | Whether to request syntax highlighting in output |

The provider adaptations module also includes language-specific conventions that components can reference:

| Language | Conventions |
|----------|------------|
| `typescript` | Use explicit type annotations, prefer interfaces over type aliases for objects, use async/await over raw promises |
| `python` | Follow PEP 8 style guide, use type hints, prefer list comprehensions where readable |
| `rust` | Use idiomatic Rust patterns, handle errors with Result type, prefer references over cloning |
| `go` | Follow effective Go guidelines, handle errors explicitly, use short variable names in small scopes |

---

## User Configuration (`env.user`)

Context about the person or system running the prompt.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `editor` | `string` | `'unknown'` | The user's editor (e.g., `'vscode'`, `'cursor'`, `'vim'`). Used by post-execution actions like `<ReviewFile>`. |

---

## Runtime Configuration (`env.runtime`)

Auto-detected values gathered from the system at render time. These are always freshly generated when `render()` is called -- you never need to set them manually, though you can override them if needed.

| Field | Type | Node.js Value | Browser Value |
|-------|------|---------------|---------------|
| `hostname` | `string` | `os.hostname()` | `'browser'` |
| `username` | `string` | `os.userInfo().username` | `'anonymous'` |
| `cwd` | `string` | `process.cwd()` | `'/'` |
| `platform` | `string` | `'node'` | `'browser'` |
| `os` | `string` | `os.platform()` (e.g., `'linux'`, `'darwin'`, `'win32'`) | `'unknown'` |
| `locale` | `string` | From `LANG`/`LC_ALL` env vars or `Intl` API (e.g., `'en-US'`) | `navigator.language` (e.g., `'en-US'`) |
| `timestamp` | `number` | `Date.now()` (Unix ms) | `Date.now()` (Unix ms) |
| `date` | `string` | ISO date `YYYY-MM-DD` | ISO date `YYYY-MM-DD` |
| `time` | `string` | ISO time `HH:MM:SS` | ISO time `HH:MM:SS` |
| `uuid` | `string` | `crypto.randomUUID()` | `crypto.randomUUID()` |

Each call to `render()` produces fresh `timestamp`, `date`, `time`, and `uuid` values. The system values (`hostname`, `username`, `os`) are cached after the first detection in Node.js.

### Built-in Utility Components

Several built-in components render runtime values directly into your prompt:

```tsx
<Prompt name="context-aware">
  <Task>
    Running on <Hostname /> as <Username />.
    Current time: <DateTime />.
    Request ID: <UUID />.
  </Task>
</Prompt>
```

Renders something like:

```
Running on my-server as alice.
Current time: 2025-06-15T14:30:00.
Request ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890.
```

---

## Prompt Configuration (`env.prompt`)

Controls which default sections the `<Prompt>` component auto-generates and how they're formatted.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `includeRole` | `boolean` | `true` | Auto-generate a `<Role>` section if none is provided |
| `includeFormat` | `boolean` | `true` | Auto-generate a `<Format>` section if none is provided |
| `includeConstraints` | `boolean` | `true` | Auto-generate a `<Constraints>` section if none is provided |
| `includeSuccessCriteria` | `boolean` | `false` | Auto-generate a `<SuccessCriteria>` section |
| `includeGuardrails` | `boolean` | `false` | Auto-generate a `<Guardrails>` section |
| `defaultRole` | `string` | `'assistant'` | Role preset to use when auto-generating (e.g., `'assistant'`, `'developer'`) |
| `defaultExpertise` | `string` | `'general'` | Expertise area for the auto-generated role |
| `delimiter` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Default delimiter style for structured sections |

```typescript
// A minimal prompt with no auto-generated sections
const env = createEnvironment({
  prompt: {
    includeRole: false,
    includeFormat: false,
    includeConstraints: false,
  },
});

// A verbose prompt with all sections enabled
const env2 = createEnvironment({
  prompt: {
    includeSuccessCriteria: true,
    includeGuardrails: true,
    defaultRole: 'developer',
    delimiter: 'markdown',
  },
});
```

---

## Using the Environment in Components

### Class Components

Class components receive the `RenderContext` as the third argument to `render()`. The environment is available at `context.env`:

```tsx
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

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

The `Component` base class also provides two convenience methods:

```tsx
class MyComponent extends Component<{ children: PuptNode }> {
  render(props: { children: PuptNode }, _resolved: void, context: RenderContext): PuptNode {
    // Get the current LLM provider
    const provider = this.getProvider(context);  // e.g., 'anthropic'

    // Get the appropriate delimiter style based on output format
    const delimiter = this.getDelimiter(context);  // 'xml' or 'markdown'

    // Use them to adapt rendering...
    return props.children;
  }
}
```

### Function Components

Function components receive the `RenderContext` as an optional second argument:

```tsx
function Greeting(props: { name: string }, context?: RenderContext): string {
  const locale = context?.env.runtime.locale ?? 'en-US';

  if (locale.startsWith('es')) {
    return `Hola, ${props.name}!`;
  }
  return `Hello, ${props.name}!`;
}
```

### Conditional Rendering with `<If>`

The `<If>` component can target specific providers using the `provider` and `notProvider` props, which read from `context.env.llm.provider`:

```tsx
<Prompt name="multi-model">
  <Task>Summarize this document.</Task>

  <If provider="anthropic">
    Use XML tags to structure your response:
    <response>
      <summary>...</summary>
      <key_points>...</key_points>
    </response>
  </If>

  <If provider="openai">
    Use markdown headers to structure your response:
    ## Summary
    ## Key Points
  </If>

  <If notProvider={['anthropic', 'openai']}>
    Structure your response with clear sections for Summary and Key Points.
  </If>
</Prompt>
```

---

## Passing Environment to `render()`

### Basic Usage

Pass the environment in the `options` object when calling `render()`:

```typescript
import { render, createEnvironment } from 'pupt-lib';

const result = await render(<MyPrompt />, {
  env: createEnvironment({
    llm: { model: 'claude-sonnet-4-5' },
    output: { format: 'xml' },
  }),
});

console.log(result.text);
```

### The `createEnvironment()` Function

`createEnvironment()` validates your overrides against Zod schemas and merges them with `DEFAULT_ENVIRONMENT`. You only need to specify the fields you care about:

```typescript
// Only override LLM settings -- everything else gets defaults
const env = createEnvironment({
  llm: { model: 'gpt-4o', maxTokens: 4096, temperature: 0.3 },
});
```

The full default environment:

```typescript
const DEFAULT_ENVIRONMENT = {
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
};
```

### Without `createEnvironment()`

You can also pass an environment object directly. Runtime values are always regenerated by `render()`, so you don't need to worry about populating them:

```typescript
const result = await render(<MyPrompt />, {
  env: {
    llm: { model: 'claude-sonnet-4-5', provider: 'anthropic' },
    output: { format: 'xml', trim: true, indent: '  ' },
    code: { language: 'typescript' },
    user: { editor: 'vscode' },
    runtime: {},
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
  },
});
```

---

## Examples

### Provider-Adaptive Prompt

A prompt that produces different instructions depending on the target model:

```tsx
<Prompt name="code-review">
  <Task>Review the following code for bugs and improvements.</Task>

  <If provider="anthropic">
    <Constraint>
      Structure your review using XML tags: artifact, severity, suggestion.
    </Constraint>
  </If>

  <If provider="openai">
    <Constraint>
      Use markdown tables to list issues: | Line | Severity | Issue | Suggestion |
    </Constraint>
  </If>

  <If provider="google">
    <Constraint>
      Number each issue and group by severity (Critical, Warning, Info).
    </Constraint>
  </If>
</Prompt>
```

### Language-Aware Code Generation

```tsx
function CodePrompt(
  props: { task: string },
  context?: RenderContext,
): PuptNode {
  const lang = context?.env.code.language ?? 'unspecified';

  return (
    <Prompt name="code-gen">
      <Task>
        Write {lang !== 'unspecified' ? lang : ''} code that: {props.task}
      </Task>

      <If when={lang === 'typescript'}>
        <Constraint>Use strict TypeScript with explicit type annotations.</Constraint>
      </If>

      <If when={lang === 'python'}>
        <Constraint>Follow PEP 8 and include type hints.</Constraint>
      </If>
    </Prompt>
  );
}
```

Rendered with different environments:

```typescript
// TypeScript environment
await render(<CodePrompt task="sort an array" />, {
  env: createEnvironment({
    llm: { model: 'claude-sonnet-4-5' },
    code: { language: 'typescript' },
  }),
});

// Python environment
await render(<CodePrompt task="sort an array" />, {
  env: createEnvironment({
    llm: { model: 'gpt-4o' },
    code: { language: 'python' },
  }),
});
```

### Environment-Aware Custom Component

A component that adapts its output format based on the configured delimiter:

```tsx
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

interface MetadataProps {
  children: PuptNode;
}

class Metadata extends Component<MetadataProps> {
  render(props: MetadataProps, _resolved: void, context: RenderContext): PuptNode {
    const delimiter = this.getDelimiter(context);
    const { hostname, username, date } = context.env.runtime;

    const metadata = [
      `Host: ${hostname}`,
      `User: ${username}`,
      `Date: ${date}`,
    ].join('\n');

    return [
      props.children,
      '\n',
      wrapWithDelimiter(metadata, 'metadata', delimiter),
    ];
  }
}
```

### Configuring Prompt Defaults

Use `env.prompt` to control which auto-generated sections `<Prompt>` includes:

```tsx
// Render the same prompt with different configurations
const prompt = (
  <Prompt name="helper">
    <Task>Help the user with their question.</Task>
  </Prompt>
);

// Default: includes auto-generated Role, Format, and Constraints sections
await render(prompt);

// Minimal: no auto-generated sections at all
await render(prompt, {
  env: createEnvironment({
    prompt: {
      includeRole: false,
      includeFormat: false,
      includeConstraints: false,
    },
  }),
});

// Verbose: all sections including guardrails and success criteria
await render(prompt, {
  env: createEnvironment({
    prompt: {
      includeSuccessCriteria: true,
      includeGuardrails: true,
      delimiter: 'markdown',
    },
  }),
});
```

---

## API Reference

### Functions

---

#### `createEnvironment(overrides?)`

Creates a validated `EnvironmentContext` by merging partial overrides with `DEFAULT_ENVIRONMENT`. This is the primary way to configure the environment.

```typescript
function createEnvironment(
  overrides?: Partial<EnvironmentContext>,
): EnvironmentContext
```

- Validates all fields against Zod schemas -- invalid values throw a `ZodError`
- Infers `provider` from `model` if provider is not explicitly set
- Returns a complete `EnvironmentContext` with all fields populated
- Overrides are shallow-merged per section (i.e., `llm`, `output`, etc. are each spread independently)

```typescript
import { createEnvironment } from 'pupt-lib';

// Minimal -- just a model
const env1 = createEnvironment({
  llm: { model: 'claude-sonnet-4-5' },
});

// Multiple sections
const env2 = createEnvironment({
  llm: { model: 'gpt-4o', temperature: 0.5 },
  output: { format: 'markdown' },
  code: { language: 'python' },
  prompt: { includeGuardrails: true },
});

// Invalid values throw
createEnvironment({
  llm: { temperature: 5 },  // ZodError: temperature must be <= 2
});
```

---

#### `createRuntimeConfig()`

Creates a `RuntimeConfig` with auto-detected system values. Called internally by `render()` on every invocation -- you rarely need this directly.

```typescript
function createRuntimeConfig(): RuntimeConfig
```

- Detects browser vs. Node.js automatically using `typeof window`
- Generates fresh `timestamp`, `date`, `time`, and `uuid` on each call
- In Node.js, system values (`hostname`, `username`, `os`) are loaded asynchronously via `import('os')` on first access, then cached for subsequent calls
- In browsers, system values use static fallbacks (`'browser'`, `'anonymous'`, etc.)

```typescript
import { createRuntimeConfig } from 'pupt-lib';

const runtime = createRuntimeConfig();
// {
//   hostname: 'my-laptop',
//   username: 'alice',
//   cwd: '/home/alice/project',
//   platform: 'node',
//   os: 'linux',
//   locale: 'en-US',
//   timestamp: 1718451000000,
//   date: '2025-06-15',
//   time: '14:30:00',
//   uuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
// }
```

---

#### `inferProviderFromModel(model)`

Infers the LLM provider from a model name/ID string. Used internally by `createEnvironment()` when `provider` is not explicitly set.

```typescript
function inferProviderFromModel(model: string): LlmProvider | null
```

- Case-insensitive matching against known model naming patterns
- Returns the matching `LlmProvider` string, or `null` if the model doesn't match any known provider

```typescript
import { inferProviderFromModel } from 'pupt-lib';

inferProviderFromModel('claude-sonnet-4-5');   // 'anthropic'
inferProviderFromModel('Claude-3-Opus');       // 'anthropic'  (case-insensitive)
inferProviderFromModel('sonnet');              // 'anthropic'  (short names work)
inferProviderFromModel('gpt-4o');              // 'openai'
inferProviderFromModel('o3-mini');             // 'openai'     (o-series models)
inferProviderFromModel('gemini-pro');          // 'google'
inferProviderFromModel('llama-3.1-70b');       // 'meta'
inferProviderFromModel('mistral-large');       // 'mistral'
inferProviderFromModel('codestral-latest');    // 'mistral'    (Mistral code model)
inferProviderFromModel('deepseek-coder');      // 'deepseek'
inferProviderFromModel('grok-2');              // 'xai'
inferProviderFromModel('command-r-plus');      // 'cohere'
inferProviderFromModel('my-fine-tuned-model'); // null         (unknown)
```

---

#### `ensureRuntimeCacheReady()`

Ensures the Node.js runtime cache is initialized. In browser environments, resolves immediately. Primarily useful in tests to guarantee that `hostname`, `username`, and `os` values are available before assertions.

```typescript
async function ensureRuntimeCacheReady(): Promise<void>
```

```typescript
import { ensureRuntimeCacheReady, createRuntimeConfig } from 'pupt-lib';

// In tests, call this before checking runtime values
await ensureRuntimeCacheReady();
const runtime = createRuntimeConfig();
expect(runtime.hostname).not.toBe('unknown');
```

---

### Types

---

#### `EnvironmentContext`

The full environment configuration object. Composed of six sections, each with its own type. All types are inferred from Zod schemas, so they are validated at runtime when using `createEnvironment()`.

```typescript
type EnvironmentContext = {
  llm: LlmConfig;
  output: OutputConfig;
  code: CodeConfig;
  user: UserConfig;
  runtime: RuntimeConfig;
  prompt: PromptConfig;
}
```

---

#### `LlmConfig`

Configuration for the target LLM. The `provider` field is auto-inferred from `model` when not set explicitly (via the Zod `.transform()` on the schema).

```typescript
type LlmConfig = {
  model: string;
  provider: LlmProvider;
  maxTokens?: number;
  temperature?: number;
}
```

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `model` | `string` | `'unspecified'` | Any string | The model ID passed to the LLM API. Examples: `'claude-sonnet-4-5'`, `'gpt-4o'`, `'gemini-1.5-pro'`, `'llama-3.1-70b'`. The value `'unspecified'` means no model was configured. |
| `provider` | `LlmProvider` | `'unspecified'` | Must be one of the `LLM_PROVIDERS` values | The model creator. When set to `'unspecified'` and `model` is not `'unspecified'`, the provider is automatically inferred from the model name. Set this explicitly for custom/fine-tuned models whose names don't match standard patterns. |
| `maxTokens` | `number \| undefined` | — | Must be a positive integer | Maximum number of tokens the LLM should generate. Components can use this to adjust prompt length or add "be concise" instructions when the budget is small. |
| `temperature` | `number \| undefined` | — | Must be between 0 and 2 (inclusive) | Sampling temperature. `0` produces deterministic output; `2` is maximum randomness. Components could use this to adjust whether they include "be creative" vs. "be precise" instructions. |

```typescript
// Anthropic with explicit settings
{ model: 'claude-sonnet-4-5', provider: 'anthropic', maxTokens: 4096, temperature: 0.7 }

// OpenAI with auto-inferred provider
{ model: 'gpt-4o' }  // provider becomes 'openai' after schema transform

// Custom model with explicit provider
{ model: 'my-org/custom-llama-finetune', provider: 'meta' }
```

---

#### `OutputConfig`

Controls how the rendered prompt text is formatted and how components choose between delimiter styles.

```typescript
type OutputConfig = {
  format: 'xml' | 'markdown' | 'json' | 'text' | 'unspecified';
  trim: boolean;
  indent: string;
}
```

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `format` | `'xml' \| 'markdown' \| 'json' \| 'text' \| 'unspecified'` | `'unspecified'` | Must be one of the listed values | The output format preference. When set to `'markdown'`, the `Component.getDelimiter()` method returns `'markdown'` instead of `'xml'`, causing components to use `## heading` style instead of `<tag>...</tag>` style. The values `'json'` and `'text'` are informational -- components can check them but there is no automatic behavior change for those formats. |
| `trim` | `boolean` | `true` | Must be a boolean | Whether `render()` trims leading/trailing whitespace from the final output. When `true`, the rendered prompt is cleaned up. Set to `false` if whitespace is significant (e.g., code-only prompts). |
| `indent` | `string` | `'  '` (2 spaces) | Any string | The indentation string used by components that produce indented output. Common values: `'  '` (2 spaces), `'    '` (4 spaces), `'\t'` (tab). |

```typescript
// Markdown format with 4-space indent
{ format: 'markdown', trim: true, indent: '    ' }

// Preserve whitespace, XML delimiters
{ format: 'xml', trim: false, indent: '  ' }
```

---

#### `CodeConfig`

Settings for code-related prompts. Components and custom prompts can read these to tailor code generation instructions.

```typescript
type CodeConfig = {
  language: string;
  highlight?: boolean;
}
```

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `language` | `string` | `'unspecified'` | Any string | The target programming language. Use lowercase names like `'typescript'`, `'python'`, `'rust'`, `'go'`, `'java'`, `'cpp'`. The value `'unspecified'` means no language was configured. Components can use this to add language-specific coding conventions to the prompt (e.g., "Follow PEP 8" for Python, "Use explicit type annotations" for TypeScript). Custom components can read `context.env.code.language` to conditionally include language-specific instructions. |
| `highlight` | `boolean \| undefined` | — | Must be a boolean if provided | Whether to request syntax highlighting in code output. This is an informational hint -- components like `<Code>` can use it to decide whether to wrap output in fenced code blocks with language tags. |

```typescript
// TypeScript with highlighting
{ language: 'typescript', highlight: true }

// Python, no highlighting preference
{ language: 'python' }

// No language configured
{ language: 'unspecified' }
```

---

#### `UserConfig`

Context about the person or system running the prompt.

```typescript
type UserConfig = {
  editor: string;
}
```

| Field | Type | Default | Validation | Description |
|-------|------|---------|------------|-------------|
| `editor` | `string` | `'unknown'` | Any string | The user's code editor or IDE. Examples: `'vscode'`, `'cursor'`, `'vim'`, `'emacs'`, `'intellij'`. Used primarily by post-execution actions -- the `<ReviewFile>` component and `Ask.ReviewFile` use this to determine which editor command to invoke when opening files for review. The `<Cwd>` utility component also uses the user context. The value `'unknown'` means no editor was configured. |

```typescript
// VS Code user
{ editor: 'vscode' }

// Cursor user
{ editor: 'cursor' }
```

---

#### `RuntimeConfig`

Auto-detected values gathered from the system at render time. All fields are populated by `createRuntimeConfig()`, which `render()` calls internally. You never need to set these manually, but you can override individual fields if needed (e.g., in tests).

```typescript
type RuntimeConfig = {
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

| Field | Type | Node.js Value | Browser Value | Description |
|-------|------|---------------|---------------|-------------|
| `hostname` | `string` | `os.hostname()` (e.g., `'my-laptop'`, `'prod-server-01'`) | `'browser'` | The system hostname. In Node.js, read from the `os` module. In browsers, always `'browser'`. Accessible via the `<Hostname />` utility component. |
| `username` | `string` | `os.userInfo().username` (e.g., `'alice'`, `'deploy-bot'`) | `'anonymous'` | The OS username of the process owner. In Node.js, read from `os.userInfo()`. In browsers, always `'anonymous'`. Accessible via the `<Username />` utility component. |
| `cwd` | `string` | `process.cwd()` (e.g., `'/home/alice/project'`) | `'/'` | The current working directory. In Node.js, read from `process.cwd()`. In browsers, always `'/'`. Accessible via the `<Cwd />` utility component. |
| `platform` | `string` | `'node'` | `'browser'` | The runtime platform. Always `'node'` in Node.js environments and `'browser'` in browser environments. Useful for components that need to behave differently based on where they're running. |
| `os` | `string` | `os.platform()` (e.g., `'linux'`, `'darwin'`, `'win32'`) | `'unknown'` | The operating system identifier. In Node.js, read from `os.platform()`. Common values: `'linux'` (Linux), `'darwin'` (macOS), `'win32'` (Windows). In browsers, always `'unknown'`. |
| `locale` | `string` | From `LANG`/`LC_ALL`/`LC_MESSAGES` env vars, parsed to BCP 47 format (e.g., `'en-US'`, `'ja'`, `'de-DE'`). Falls back to `Intl.DateTimeFormat().resolvedOptions().locale`. | `navigator.language` (e.g., `'en-US'`, `'fr-FR'`). Falls back to `Intl` API. | The system locale as a BCP 47 language tag. Components can use this for locale-aware rendering (e.g., date formatting, greeting language). Falls back to `'unknown'` if detection fails. |
| `timestamp` | `number` | `Date.now()` (e.g., `1718451000000`) | `Date.now()` | Unix timestamp in milliseconds at render time. Fresh on every `render()` call. Accessible via the `<Timestamp />` utility component. |
| `date` | `string` | ISO date `YYYY-MM-DD` (e.g., `'2025-06-15'`) | ISO date `YYYY-MM-DD` | The current date in ISO 8601 format, derived from `new Date().toISOString()`. Fresh on every `render()` call. Accessible via the `<DateTime />` utility component. |
| `time` | `string` | ISO time `HH:MM:SS` (e.g., `'14:30:00'`) | ISO time `HH:MM:SS` | The current time in ISO 8601 format (hours, minutes, seconds, no milliseconds). Fresh on every `render()` call. Accessible via the `<DateTime />` utility component. |
| `uuid` | `string` | `crypto.randomUUID()` (e.g., `'a1b2c3d4-e5f6-7890-abcd-ef1234567890'`) | `crypto.randomUUID()` | A v4 UUID generated fresh on every `render()` call. Useful for request tracking or unique identifiers in prompts. Accessible via the `<UUID />` utility component. |

```typescript
// Override runtime values for testing
const env = createEnvironment({
  runtime: {
    hostname: 'test-host',
    username: 'test-user',
    cwd: '/tmp/test',
    platform: 'node',
    os: 'linux',
    locale: 'en-US',
    timestamp: 1718451000000,
    date: '2025-06-15',
    time: '14:30:00',
    uuid: 'test-uuid-1234',
  },
});
```

---

#### `PromptConfig`

Controls which default sections the `<Prompt>` component auto-generates and how they're formatted. These settings act as defaults -- individual `<Prompt>` instances can override them via the `defaults`, `bare`, `noRole`, `noFormat`, and `noConstraints` props.

```typescript
type PromptConfig = {
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
| `includeRole` | `boolean` | `true` | When `true`, `<Prompt>` auto-generates a `<Role>` section if the prompt doesn't already contain one. The generated role uses `defaultRole` and `defaultExpertise`. Set to `false` to suppress the auto-generated role across all prompts. |
| `includeFormat` | `boolean` | `true` | When `true`, `<Prompt>` auto-generates a `<Format>` section if none is provided. The format is based on the provider's `formatPreference` (e.g., "Output format: xml" for Anthropic, "Output format: markdown" for OpenAI). |
| `includeConstraints` | `boolean` | `true` | When `true`, `<Prompt>` auto-generates a `<Constraints>` section with default constraints (e.g., "Be concise", "Be accurate") if the prompt doesn't already include `<Constraint>` or `<Constraints>` children. |
| `includeSuccessCriteria` | `boolean` | `false` | When `true`, `<Prompt>` auto-generates a `<SuccessCriteria>` section with default criteria (e.g., "Response addresses the task completely", "Output is clear and well-structured"). Off by default because not all prompts benefit from explicit success criteria. |
| `includeGuardrails` | `boolean` | `false` | When `true`, `<Prompt>` auto-generates a `<Guardrails>` section with standard safety and compliance requirements. Off by default because guardrails add significant text and are not always needed. |
| `defaultRole` | `string` | `'assistant'` | The role preset key used when auto-generating the role section. Maps to entries in the role presets table. Examples: `'assistant'`, `'developer'`, `'analyst'`, `'writer'`. The auto-generated text follows the pattern: "{rolePrefix}a helpful {title}. You have expertise in {expertise}." |
| `defaultExpertise` | `string` | `'general'` | The expertise area used in the auto-generated role section. Appears in the phrase "You have expertise in {expertise}." Only used when no role preset defines its own expertise list. Examples: `'general'`, `'web development'`, `'data analysis'`. |
| `delimiter` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | The default delimiter style for structured sections. `'xml'` wraps sections in XML tags (e.g., `<role>...</role>`). `'markdown'` uses markdown headers (e.g., `## role`). `'none'` produces plain text with no wrapping. This sets the default; individual components can override via their own `delimiter` prop. |

```typescript
// Minimal prompt config -- no auto-generated sections
{
  includeRole: false,
  includeFormat: false,
  includeConstraints: false,
  includeSuccessCriteria: false,
  includeGuardrails: false,
  defaultRole: 'assistant',
  defaultExpertise: 'general',
  delimiter: 'xml',
}

// Verbose prompt config -- all sections, markdown style
{
  includeRole: true,
  includeFormat: true,
  includeConstraints: true,
  includeSuccessCriteria: true,
  includeGuardrails: true,
  defaultRole: 'developer',
  defaultExpertise: 'full-stack web development',
  delimiter: 'markdown',
}
```

---

#### `RenderContext`

The full context object passed to components during rendering. Contains the environment plus input values, error tracking, post-execution actions, and shared metadata.

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
| `inputs` | `Map<string, unknown>` | User input values collected by Ask components. Keys are the `name` prop from each Ask component. Values are the user's responses (strings, numbers, booleans, arrays depending on the Ask type). Components can read from this map to access user-provided values. The `<If when="=formula">` syntax evaluates formulas against this map. |
| `env` | `EnvironmentContext` | The environment configuration documented on this page. Access fields like `context.env.llm.provider`, `context.env.runtime.hostname`, `context.env.code.language`, etc. |
| `postExecution` | `PostExecutionAction[]` | Actions to execute after the LLM responds. Components like `<ReviewFile>`, `<OpenUrl>`, and `<RunCommand>` push entries here during rendering. The consuming application reads this array after `render()` completes and executes the actions (e.g., opening a file in an editor). |
| `errors` | `RenderError[]` | Validation and runtime errors accumulated during rendering. Components push errors here when prop validation fails or when runtime issues occur (e.g., `<Prompt>` pushes a warning when no `<Task>` child is present). After rendering, check `result.ok` and `result.errors` to see if any errors occurred. |
| `metadata` | `Map<string, unknown>` | A shared key-value store that components can use to communicate across the render tree. One component can write a value (e.g., `context.metadata.set('theme', 'dark')`) and another component later in the tree can read it (e.g., `context.metadata.get('theme')`). This enables cross-component coordination without prop drilling. |

```typescript
// Accessing context in a class component
class MyComponent extends Component<{ children: PuptNode }> {
  render(props: { children: PuptNode }, _resolved: void, context: RenderContext): PuptNode {
    // Read environment
    const provider = context.env.llm.provider;
    const hostname = context.env.runtime.hostname;

    // Read user inputs
    const userName = context.inputs.get('userName') as string;

    // Share data with other components
    context.metadata.set('processedBy', 'MyComponent');

    // Report a warning
    if (!userName) {
      context.errors.push({
        component: 'MyComponent',
        prop: null,
        message: 'No userName input provided',
        code: 'validation_warning',
        path: [],
      });
    }

    return props.children;
  }
}
```

---

#### `LlmProvider`

Union type of all supported provider strings. Exported as both a type and as the `LLM_PROVIDERS` const array.

```typescript
type LlmProvider =
  | 'anthropic'    // Anthropic (Claude models)
  | 'openai'       // OpenAI (GPT, o-series models)
  | 'google'       // Google (Gemini models)
  | 'meta'         // Meta (Llama models)
  | 'mistral'      // Mistral AI (Mistral, Mixtral, Codestral, Pixtral)
  | 'deepseek'     // DeepSeek (DeepSeek-Coder, DeepSeek-V2, etc.)
  | 'xai'          // xAI (Grok models)
  | 'cohere'       // Cohere (Command models)
  | 'unspecified';  // No provider configured or model not recognized
```

The `LLM_PROVIDERS` array is also exported for iteration or validation:

```typescript
import { LLM_PROVIDERS } from 'pupt-lib';

console.log(LLM_PROVIDERS);
// ['anthropic', 'openai', 'google', 'meta', 'mistral', 'deepseek', 'xai', 'cohere', 'unspecified']
```

---

#### `DEFAULT_ENVIRONMENT`

The default environment used when no `env` option is passed to `render()`. Exported as a constant for reference or as a base for manual overrides.

```typescript
import { DEFAULT_ENVIRONMENT } from 'pupt-lib';

// DEFAULT_ENVIRONMENT is:
// {
//   llm: { model: 'unspecified', provider: 'unspecified' },
//   output: { format: 'unspecified', trim: true, indent: '  ' },
//   code: { language: 'unspecified' },
//   user: { editor: 'unknown' },
//   runtime: {},
//   prompt: {
//     includeRole: true,
//     includeFormat: true,
//     includeConstraints: true,
//     includeSuccessCriteria: false,
//     includeGuardrails: false,
//     defaultRole: 'assistant',
//     defaultExpertise: 'general',
//     delimiter: 'xml',
//   },
// }
```

Note that `runtime` is empty in the default -- it gets populated by `createRuntimeConfig()` inside `render()` on every call.
