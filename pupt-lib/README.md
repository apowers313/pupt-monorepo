# pupt-lib

[![npm version](https://img.shields.io/npm/v/pupt-lib.svg)](https://www.npmjs.com/package/pupt-lib)
[![Coverage Status](https://coveralls.io/repos/github/apowers313/pupt-lib/badge.svg?branch=master)](https://coveralls.io/github/apowers313/pupt-lib?branch=master)
[![CI](https://github.com/apowers313/pupt-lib/actions/workflows/ci.yml/badge.svg)](https://github.com/apowers313/pupt-lib/actions/workflows/ci.yml)

A TypeScript library for creating AI prompts as versionable, composable, shareable files using JSX syntax. Prompts are becoming critical software artifacts, yet most are written inline, copy-pasted between projects, and lost when chat sessions end. pupt-lib treats prompts as first-class code: version controlled in git, composable from reusable components, and shareable via npm. Simple prompts look like HTML and are accessible to non-developers, while complex prompts have full TypeScript power including loops, conditionals, and type safety.

**Features:**

- **JSX Syntax** — Write prompts using familiar JSX/TSX syntax with 50+ built-in components
- **`.prompt` Files** — Simplified format with no imports, no exports — just JSX
- **Composable** — Build complex prompts from reusable, shareable components
- **Provider Targeting** — Adapt output for Claude, GPT, Gemini, and others via environment config
- **Presets** — Role, task, constraint, and steps presets encode prompt engineering best practices
- **Smart Defaults** — Auto-generated role, format, and constraint sections with full opt-out control
- **Version Controlled** — Prompts live in files, tracked in git, reviewed in PRs
- **Shareable** — Publish prompt libraries to npm, consume others' work via npm, URLs, or local files
- **Browser & Node.js** — Works in both environments with runtime JSX transformation

## Installation

```bash
npm install pupt-lib
```

For build-time JSX transformation (recommended for production), also install the peer dependencies:

```bash
npm install --save-dev @babel/core @babel/plugin-transform-react-jsx @babel/preset-typescript
```

## Quick Start with `.prompt`

The simplest way to write a prompt — no imports or exports needed:

```xml
<!-- greeting.prompt -->
<Prompt name="greeting" description="A friendly greeting prompt">
  <Role>You are a friendly assistant.</Role>
  <Task>
    Greet the user named <Ask.Text name="userName" label="User's name" /> warmly.
  </Task>
  <Constraint type="must">Keep the greeting under 50 words.</Constraint>
</Prompt>
```

Load and render it:

```typescript
import { createPromptFromSource, render } from 'pupt-lib';
import { readFile } from 'fs/promises';

const source = await readFile('./greeting.prompt', 'utf-8');
const element = await createPromptFromSource(source, 'greeting.prompt');
const result = await render(element, {
  inputs: { userName: 'Alice' },
});

console.log(result.text);
```

## Quick Start with `.tsx`

The same prompt as a TypeScript JSX file — explicit imports, full type safety:

```tsx
// greeting.tsx
import { Prompt, Role, Task, Constraint, Ask } from 'pupt-lib';

export default (
  <Prompt name="greeting" description="A friendly greeting prompt">
    <Role>You are a friendly assistant.</Role>
    <Task>
      Greet the user named <Ask.Text name="userName" label="User's name" /> warmly.
    </Task>
    <Constraint type="must">Keep the greeting under 50 words.</Constraint>
  </Prompt>
);
```

Load with `createPrompt` (reads the file for you):

```typescript
import { createPrompt, render } from 'pupt-lib';

const element = await createPrompt('./greeting.tsx');
const result = await render(element, {
  inputs: { userName: 'Alice' },
});

console.log(result.text);
```

## Collecting User Inputs

When prompts contain `<Ask.*>` components, use `createInputIterator` to collect values interactively:

```typescript
import { createPrompt, createInputIterator, render } from 'pupt-lib';

const element = await createPrompt('./my-prompt.tsx');
const iterator = createInputIterator(element);

// Start iteration
await iterator.start();

// Loop through each input requirement
while (!iterator.isDone()) {
  const req = iterator.current();
  console.log(`${req.label} (${req.type}, required: ${req.required})`);

  const answer = await askUser(req); // your UI logic
  const validation = await iterator.submit(answer);

  if (!validation.valid) {
    console.log('Errors:', validation.errors.map(e => e.message));
    continue; // re-prompt for same input
  }

  await iterator.advance();
}

// Render with collected values
const result = await render(element, { inputs: iterator.getValues() });
```

Or use non-interactive mode to auto-fill defaults:

```typescript
const iterator = createInputIterator(element, { nonInteractive: true });
const values = await iterator.runNonInteractive();
const result = await render(element, { inputs: values });
```

## Working with Results

`render()` returns a `RenderResult` discriminated union:

```typescript
const result = await render(element, { inputs: { userName: 'Alice' } });

if (result.ok) {
  console.log(result.text);              // The rendered prompt string
  console.log(result.postExecution);     // Post-execution actions (if any)
  if (result.errors) {
    console.log('Warnings:', result.errors); // Non-fatal validation warnings
  }
} else {
  console.log('Errors:', result.errors);   // Validation/runtime errors
  console.log(result.text);               // Best-effort partial output
}
```

## `.prompt` vs `.tsx`

| Feature | `.prompt` | `.tsx` |
|---------|-----------|--------|
| Imports | Auto-injected for all built-in components | Explicit `import` statements |
| Exports | Auto-wrapped with `export default` | Explicit `export default` |
| Custom components | Via `<Uses>` declarations | Standard `import` |
| Component definitions | Not supported | Define components in same file |
| Target audience | Non-technical users, simple prompts | Developers, complex prompts |
| Behavior | Identical after preprocessing | Identical after preprocessing |

Both formats go through the same transformation pipeline and produce identical output.

## Component Overview

pupt-lib includes 50+ built-in components organized by category:

| Category | Count | Key Components |
|----------|-------|----------------|
| **Structural** | 24 | `Prompt`, `Role`, `Task`, `Context`, `Constraint`, `Format`, `Audience`, `Tone` |
| **Ask (User Input)** | 15 | `Ask.Text`, `Ask.Number`, `Ask.Select`, `Ask.Confirm`, `Ask.MultiSelect` |
| **Data** | 5 | `Code`, `Data`, `File`, `Json`, `Xml` |
| **Examples** | 5 | `Examples`, `Example`, `ExampleInput`, `ExampleOutput`, `NegativeExample` |
| **Reasoning** | 3 | `Steps`, `Step`, `ChainOfThought` |
| **Control Flow** | 2 | `If`, `ForEach` |
| **Post-Execution** | 4 | `PostExecution`, `ReviewFile`, `OpenUrl`, `RunCommand` |
| **Utility** | 6 | `UUID`, `Timestamp`, `DateTime`, `Hostname`, `Username`, `Cwd` |
| **Meta** | 1 | `Uses` |

See [docs/COMPONENTS.md](docs/COMPONENTS.md) for the full reference with all props.

## Environment & Providers

Components adapt their output based on the target LLM provider. Set the provider via the `env` option:

```typescript
import { render, createEnvironment } from 'pupt-lib';

// Target Anthropic Claude
const result = await render(element, {
  inputs: { ... },
  env: createEnvironment({
    llm: { provider: 'anthropic' },
  }),
});

// Target OpenAI GPT (uses markdown delimiters instead of XML)
const result2 = await render(element, {
  inputs: { ... },
  env: createEnvironment({
    llm: { provider: 'openai' },
  }),
});
```

Supported providers: `anthropic`, `openai`, `google`, `meta`, `mistral`, `deepseek`, `xai`, `cohere`. Provider can also be auto-inferred from model name:

```typescript
env: createEnvironment({
  llm: { model: 'claude-sonnet-4-5-20250929' }, // auto-infers provider: 'anthropic'
})
```

Each provider has adaptations for role prefix style, constraint framing, format preference, and instruction style.

## Presets

Many components accept a `preset` prop that loads pre-configured settings:

```tsx
<Role preset="engineer" />
// Renders: "You are a senior Software Engineer with expertise in software development, programming, system design."

<Steps preset="debugging" />
// Renders step-by-step phases: Reproduce → Isolate → Fix → Verify

<Constraint preset="cite-sources" />
// Renders: "Cite sources for factual claims" with type "must"
```

Available preset categories:

| Preset | Keys | Used by |
|--------|------|---------|
| **Role** | `assistant`, `engineer`, `writer`, `analyst`, `teacher`, +25 more | `<Role>` |
| **Task** | `summarize`, `code-review`, `translate`, `explain`, `generate-code`, +5 more | `<Task>` |
| **Constraint** | `be-concise`, `cite-sources`, `no-opinions`, `no-hallucination`, +4 more | `<Constraint>` |
| **Steps** | `analysis`, `problem-solving`, `code-generation`, `debugging`, `research` | `<Steps>` |
| **Guardrails** | `standard`, `strict`, `minimal` | `<Guardrails>` |

See [docs/COMPONENTS.md](docs/COMPONENTS.md) for the full list of preset keys.

## Prompt Defaults

`<Prompt>` auto-generates Role, Format, and Constraint sections when you don't provide them. This means a minimal prompt:

```xml
<Prompt name="helper">
  <Task>Help the user with their question.</Task>
</Prompt>
```

...automatically includes a default role ("You are a helpful Assistant"), format guidance, and basic constraints.

**Controlling defaults:**

```tsx
// Disable all defaults
<Prompt name="bare-prompt" bare>
  <Task>Just the task, nothing else.</Task>
</Prompt>

// Disable specific defaults
<Prompt name="custom" noRole noFormat>
  <Task>Only constraints are auto-generated.</Task>
</Prompt>

// Fine-grained control
<Prompt name="custom" defaults={{ role: true, format: false, constraints: true }}>
  <Task>Role and constraints, but no format section.</Task>
</Prompt>

// Shorthand: customize the default role
<Prompt name="expert" role="engineer" expertise="TypeScript">
  <Task>Review this code.</Task>
</Prompt>
```

**Slots** let you replace default sections with custom components:

```tsx
<Prompt name="custom" slots={{ role: MyCustomRole }}>
  <Task>Uses MyCustomRole instead of the default role.</Task>
</Prompt>
```

## Creating Custom Components

Extend `Component` and implement `render(props, resolvedValue, context)`:

```typescript
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';
import { z } from 'zod';

const warningSchema = z.object({
  level: z.enum(['info', 'warning', 'error']),
});

type WarningProps = z.infer<typeof warningSchema> & { children?: PuptNode };

class Warning extends Component<WarningProps> {
  static schema = warningSchema;

  render(props: WarningProps, _resolvedValue: void, context: RenderContext): PuptNode {
    const prefix = {
      info: 'INFO',
      warning: 'WARNING',
      error: 'ERROR',
    }[props.level];

    return `[${prefix}] ${props.children}`;
  }
}
```

Use in `.prompt` files with `<Uses>`:

```xml
<Uses component="Warning" from="./my-components" />

<Prompt name="example">
  <Warning level="info">This is a custom component.</Warning>
</Prompt>
```

The `Component` base class provides helpers:
- `getProvider(context)` — Get the current LLM provider
- `getDelimiter(context)` — Get the delimiter style (`xml`, `markdown`, or `none`)
- `hasContent(children)` — Check if children have meaningful content

## Advanced Features

**Conditional rendering** with `<If>`:

```tsx
// Boolean condition
<If when={isAdmin}>
  <Task>Perform admin operations.</Task>
</If>

// Excel-style formula (evaluated against input values)
<If when='=AND(count>5, userType="admin")'>
  <Ask.Text name="adminCode" label="Admin authorization code" />
</If>

// Provider-specific content
<If provider="anthropic">
  <Context>Use XML tags for structured output.</Context>
</If>
<If notProvider="anthropic">
  <Context>Use markdown headers for structured output.</Context>
</If>
```

**Iteration** with `<ForEach>`:

```tsx
<ForEach items={['bug fix', 'feature', 'refactor']} as="type">
  <Step>Handle the {type} case.</Step>
</ForEach>
```

**Container composition** with `<Constraints>` and `<Contexts>`:

```tsx
// Extend default constraints with additional ones
<Constraints extend>
  <Constraint type="must">Always include code examples.</Constraint>
</Constraints>

// Replace defaults entirely
<Constraints>
  <Constraint type="must">Only respond in JSON.</Constraint>
</Constraints>
```

**Post-execution actions** — actions to perform after the LLM responds:

```tsx
<PostExecution>
  <ReviewFile file="output.ts" />
  <OpenUrl url="https://docs.example.com" />
  <RunCommand command="npm test" />
</PostExecution>
```

## TypeScript Configuration

For build-time JSX transformation, configure `tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "pupt-lib"
  }
}
```

Or use the Babel preset for runtime transformation:

```javascript
// babel.config.js
module.exports = {
  presets: ['pupt-lib/babel-preset'],
};
```

## Reference Documentation

- **[docs/COMPONENTS.md](docs/COMPONENTS.md)** — Full component reference (all 50+ components with all props)
- **[docs/API.md](docs/API.md)** — Full API reference (functions, types, base class, utilities)

## License

MIT
