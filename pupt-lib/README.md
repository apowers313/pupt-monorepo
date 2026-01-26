# pupt-lib

[![npm version](https://img.shields.io/npm/v/pupt-lib.svg)](https://www.npmjs.com/package/pupt-lib)
[![Coverage Status](https://coveralls.io/repos/github/apowers313/pupt-lib/badge.svg?branch=master)](https://coveralls.io/github/apowers313/pupt-lib?branch=master)
[![CI](https://github.com/apowers313/pupt-lib/actions/workflows/ci.yml/badge.svg)](https://github.com/apowers313/pupt-lib/actions/workflows/ci.yml)

A TypeScript library for creating AI prompts as versionable, composable, shareable files using JSX syntax. Prompts are becoming critical software artifacts, yet most are written inline, copy-pasted between projects, and lost when chat sessions end. pupt-lib treats prompts as first-class code: version controlled in git, composable from reusable components, and shareable via npm. Simple prompts look like HTML and are accessible to non-developers, while complex prompts have full TypeScript power including loops, conditionals, and type safety.

**Features:**

- **JSX Syntax** - Write prompts using familiar JSX/TSX syntax with built-in components
- **Composable** - Build complex prompts from reusable, shareable components
- **Version Controlled** - Prompts live in files, tracked in git, reviewed in PRs
- **Shareable** - Publish prompt libraries to npm, consume others' work via npm, URLs, or local files
- **UI Agnostic** - Library handles prompt logic; any UI (CLI, web, desktop) can collect inputs
- **LLM Agnostic** - Target Claude, GPT, Gemini, or others with environment-based output optimization
- **Research-Backed** - Built-in components encode prompt engineering best practices
- **Browser & Node.js** - Works in both environments with runtime JSX transformation

## Installation

```bash
npm install pupt-lib
```

For build-time JSX transformation (recommended for production), also install the peer dependencies:

```bash
npm install --save-dev @babel/core @babel/plugin-transform-react-jsx @babel/preset-typescript
```

## Quick Start

Create a prompt file `greeting.tsx`:

```tsx
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

Render the prompt:

```typescript
import { createPrompt, render, createInputIterator } from 'pupt-lib';

// Load the prompt
const element = await createPrompt('./greeting.tsx');

// Collect inputs
const iterator = createInputIterator(element);
iterator.start();
while (!iterator.isDone()) {
  const req = iterator.current();
  const answer = await askUser(req.label); // Your UI logic
  await iterator.submit(answer);
  iterator.advance();
}

// Render to text
const result = render(element, { inputs: iterator.getValues() });
console.log(result.text);
```

Or render directly with pre-supplied values:

```typescript
import { createPrompt, render } from 'pupt-lib';

const element = await createPrompt('./greeting.tsx');
const result = render(element, {
  inputs: { userName: 'Alice' }
});
console.log(result.text);
```

## Components

### Structural Components

| Component | Description |
|-----------|-------------|
| `<Prompt>` | Root container for a complete prompt. Props: `name`, `description`, `tags`, `version` |
| `<Section>` | Creates a labeled section with optional XML delimiters |
| `<Role>` | Defines the AI persona/role. Props: `expertise`, `domain` |
| `<Task>` | Clearly states what the AI should do |
| `<Context>` | Provides background information |
| `<Constraint>` | Adds boundaries/rules. Props: `type` (`must`, `should`, `must-not`) |
| `<Format>` | Specifies output format. Props: `type` (`json`, `markdown`, `code`, `list`), `schema` |
| `<Audience>` | Who the output is for. Props: `expertise`, `domain` |
| `<Tone>` | Emotional quality of output. Props: `type`, `formality` |
| `<SuccessCriteria>` | Container for success criteria |
| `<Criterion>` | Individual success criterion. Props: `priority` |

### Example Components

| Component | Description |
|-----------|-------------|
| `<Examples>` | Container for multiple examples |
| `<Example>` | Single example with input/output |
| `<ExampleInput>` | Input portion of an example |
| `<ExampleOutput>` | Expected output of an example |

### Reasoning Components

| Component | Description |
|-----------|-------------|
| `<Steps>` | Encourages step-by-step thinking |
| `<Step>` | Individual step in a reasoning chain. Props: `number` |

### Data Components

| Component | Description |
|-----------|-------------|
| `<Data>` | Embeds data with optional formatting. Props: `name`, `format` |
| `<Code>` | Embeds code with language hint. Props: `language`, `filename` |
| `<File>` | Embeds file contents. Props: `path` |
| `<Json>` | Embeds JSON data. Props: `name` |
| `<Xml>` | Embeds XML data. Props: `name` |

### Utility Components

| Component | Description |
|-----------|-------------|
| `<UUID>` | Generates a unique identifier |
| `<Timestamp>` | Current Unix timestamp |
| `<DateTime>` | Current date/time. Props: `format` |
| `<Hostname>` | Current machine hostname |
| `<Username>` | Current system username |
| `<Cwd>` | Current working directory |

### Control Flow Components

| Component | Description |
|-----------|-------------|
| `<If>` | Conditional rendering. Props: `when` (Excel formula or JS expression) |
| `<ForEach>` | Loop over items. Props: `items`, `as` |
| `<Scope>` | Resolve components from a specific library. Props: `from` |

### User Input Components (Ask.*)

| Component | Description |
|-----------|-------------|
| `<Ask.Text>` | Single-line text input. Props: `name`, `label`, `required`, `default`, `pattern` |
| `<Ask.Editor>` | Multi-line text editor. Props: `name`, `label`, `language` |
| `<Ask.Select>` | Single choice from options. Props: `name`, `label`, `options` or `<Option>` children |
| `<Ask.MultiSelect>` | Multiple choices. Props: `name`, `label`, `options` or `<Option>` children |
| `<Ask.Confirm>` | Yes/no question. Props: `name`, `label`, `default` |
| `<Ask.Choice>` | Binary choice with custom labels. Props: `name`, `label`, `options` |
| `<Ask.Number>` | Numeric input. Props: `name`, `label`, `min`, `max`, `default` |
| `<Ask.File>` | File path input. Props: `name`, `label`, `mustExist` |
| `<Ask.Path>` | Directory path input. Props: `name`, `label`, `mustBeDirectory` |
| `<Ask.Date>` | Date selection. Props: `name`, `label` |
| `<Ask.Secret>` | Masked input for sensitive values. Props: `name`, `label`, `validator` |
| `<Ask.Rating>` | Numeric scale input. Props: `name`, `label`, `min`, `max`, `labels` or `<Label>` children |
| `<Ask.ReviewFile>` | File input with post-execution review. Props: `name`, `label` |
| `<Option>` | Option for Select/MultiSelect. Props: `value`, `label`, children (render text) |
| `<Label>` | Label for Rating scale. Props: `value`, children (label text) |

### Meta Components

| Component | Description |
|-----------|-------------|
| `<Uses>` | Declares module dependencies. Props: `src`, `optional` |

### Post-Execution Components

| Component | Description |
|-----------|-------------|
| `<PostExecution>` | Container for post-execution actions |
| `<ReviewFile>` | Open a file for review after prompt execution. Props: `file`, `editor` |
| `<OpenUrl>` | Open a URL in browser. Props: `url`, `browser` |
| `<RunCommand>` | Execute a shell command. Props: `command`, `cwd` |

## API Summary

| Export | Type | Description |
|--------|------|-------------|
| `render(element, options?)` | Function | Render a PuptElement tree to text |
| `createPrompt(filePath)` | Function | Create a prompt from a JSX/TSX file |
| `createPromptFromSource(source, filename)` | Function | Create a prompt from source string |
| `createInputIterator(element)` | Function | Create iterator for collecting user inputs |
| `Component<Props>` | Class | Base class for custom components |
| `Pupt` | Class | High-level API for loading and managing prompt libraries |
| `createSearchEngine(config?)` | Function | Create fuzzy search engine for prompts |
| `createRegistry()` | Function | Create a new component registry |
| `defaultRegistry` | Const | The default global component registry |

## Detailed API Usage

### Rendering Prompts

```typescript
import { render, createPromptFromSource } from 'pupt-lib';

// From source string
const element = await createPromptFromSource(`
  <Prompt name="example">
    <Role>You are a helpful assistant.</Role>
    <Task>Help the user with their question.</Task>
  </Prompt>
`, 'example.tsx');

// Render with options
const result = render(element, {
  inputs: new Map([['userName', 'Alice']]),  // or { userName: 'Alice' }
  trim: true,  // Trim whitespace (default: true)
});

console.log(result.text);  // The rendered prompt text
console.log(result.postExecution);  // Array of post-execution actions
```

### Collecting User Inputs

```typescript
import { createPrompt, createInputIterator, render } from 'pupt-lib';

const element = await createPrompt('./my-prompt.tsx');
const iterator = createInputIterator(element);

// Start iteration
iterator.start();

// Iterate through each input requirement
while (!iterator.isDone()) {
  const req = iterator.current();

  console.log(`Name: ${req.name}`);
  console.log(`Type: ${req.type}`);
  console.log(`Label: ${req.label}`);
  console.log(`Required: ${req.required}`);

  // Collect input from user (your UI logic)
  const answer = await promptUser(req);

  // Submit and validate
  const result = await iterator.submit(answer);
  if (!result.valid) {
    console.log(`Validation error: ${result.errors.map(e => e.message).join(', ')}`);
    continue;  // Re-prompt for same input
  }

  iterator.advance();
}

// Render with collected values
const result = render(element, { inputs: iterator.getValues() });
```

### Creating Custom Components

```typescript
import { Component, RenderContext, PuptNode } from 'pupt-lib';

interface WarningProps {
  level: 'info' | 'warning' | 'error';
  children?: PuptNode;
}

class Warning extends Component<WarningProps> {
  render(props: WarningProps, context: RenderContext): PuptNode {
    const prefix = {
      info: 'INFO',
      warning: 'WARNING',
      error: 'ERROR'
    }[props.level];

    return `[${prefix}] ${props.children}`;
  }
}

// Register with the default registry
import { defaultRegistry } from 'pupt-lib';
defaultRegistry.register('Warning', Warning);
```

### Using the Pupt Class

```typescript
import { Pupt } from 'pupt-lib';

// Initialize with module sources
const pupt = new Pupt({
  modules: [
    '@acme/prompts',                    // npm package
    'https://example.com/prompts.js',   // URL
    './local-prompts/',                 // local path
  ],
});

await pupt.init();

// List all prompts
const prompts = pupt.getPrompts();
console.log(prompts.map(p => p.name));

// Filter by tags
const devPrompts = pupt.getPrompts({ tags: ['development'] });

// Search prompts
const results = pupt.searchPrompts('code review');

// Get a specific prompt
const prompt = pupt.getPrompt('security-review');
if (prompt) {
  const result = prompt.render({ inputs: { code: sourceCode } });
  console.log(result.text);
}

// Get all unique tags
const tags = pupt.getTags();
```

### Conditional Rendering

```typescript
// Excel formula syntax (accessible to non-technical users)
<If when='=AND(count>5, userType="admin")'>
  <Ask.Text name="adminCode" label="Admin authorization code" />
</If>

// JavaScript expression (for power users)
<If when={items.filter(i => i.priority > 3).length >= 2}>
  <Task>Handle high-priority items first</Task>
</If>
```

### Post-Execution Actions

```typescript
import { createPrompt, render } from 'pupt-lib';

const element = await createPrompt('./generate-code.tsx');
const result = render(element, { inputs: { ... } });

// Handle post-execution actions
for (const action of result.postExecution) {
  switch (action.type) {
    case 'reviewFile':
      openInEditor(action.file, action.editor);
      break;
    case 'openUrl':
      openBrowser(action.url);
      break;
    case 'runCommand':
      exec(action.command, { cwd: action.cwd });
      break;
  }
}
```

### TypeScript Configuration

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
  presets: [
    'pupt-lib/babel-preset'
  ]
};
```

## License

MIT
