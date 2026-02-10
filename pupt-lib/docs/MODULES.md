# Creating and Sharing Modules

This guide covers how to create reusable components and prompts that others can import into their own prompts.

## Quick Start

The simplest module is a file that exports a component:

```typescript
// my-components.ts
import { Component } from 'pupt-lib';

export class Greeting extends Component<{ who: string }> {
  render({ who }) {
    return `Hello, ${who}!`;
  }
}
```

Import it in a `.prompt` file with `<Uses>`:

```xml
<Uses component="Greeting" from="./my-components" />

<Prompt name="welcome">
  <Greeting who="Alice" />
</Prompt>
```

Or import it in a `.tsx` file with standard imports:

```tsx
import { Greeting } from './my-components';

export default (
  <Prompt name="welcome">
    <Greeting who="Alice" />
  </Prompt>
);
```

That's it. If you just need to share components between your own files, this is all you need.

---

## Understanding `<Uses>`

`<Uses>` is how `.prompt` files import external components. It gets transformed into a standard JavaScript `import` statement at compile time — it's declarative JSX syntax for imports, so `.prompt` files don't need explicit `import` statements.

### Import Patterns

**Named export** (most common):

```xml
<Uses component="Warning" from="./my-components" />
<!-- becomes: import { Warning } from "./my-components" -->
```

**Multiple named exports:**

```xml
<Uses component="Header, Footer, Sidebar" from="./my-components" />
<!-- becomes: import { Header, Footer, Sidebar } from "./my-components" -->
```

**Default export:**

```xml
<Uses default="Layout" from="./my-components" />
<!-- becomes: import Layout from "./my-components" -->
```

**Aliased import:**

```xml
<Uses component="Card" as="MyCard" from="./my-components" />
<!-- becomes: import { Card as MyCard } from "./my-components" -->
```

### The `from` Attribute

The `from` attribute specifies where to load the module from. pupt-lib supports four source types:

| Source | Example | Notes |
|--------|---------|-------|
| Local file | `from="./my-components"` | Relative or absolute path |
| npm package | `from="@acme/prompt-components"` | Installed via `npm install` |
| Package subpath | `from="@acme/components/alerts"` | Specific export within a package |
| URL | `from="https://cdn.example.com/components.js"` | Direct URL to an ES module |
| GitHub | `from="github:acme/components#v1.0.0"` | Shorthand for GitHub raw content; `#ref` is optional (defaults to `main`) |

**Local files** are the simplest — just point to a `.ts` or `.js` file in your project. **npm packages** are best for sharing across projects. **URLs** and **GitHub** sources are useful for quick sharing without publishing to npm.

### `.prompt` vs `.tsx`

`<Uses>` works in both `.prompt` and `.tsx` files, but `.tsx` files typically use standard `import` statements instead — they're equivalent:

```
.prompt file:  <Uses component="Warning" from="./my-lib" />
.tsx file:     import { Warning } from './my-lib';
```

Both produce identical behavior.

---

## Writing Components

### Function Components

The simplest kind of component — a function that takes props and returns content:

```typescript
import type { PuptNode } from 'pupt-lib';

export function Callout({ type, children }: { type: string; children?: PuptNode }) {
  const icon = type === 'warning' ? '⚠️' : 'ℹ️';
  return `${icon} ${children}`;
}
```

Function components can also receive the render context as an optional second argument:

```typescript
import type { PuptNode, RenderContext } from 'pupt-lib';

export function Callout(
  { type, children }: { type: string; children?: PuptNode },
  context?: RenderContext,
) {
  const provider = context?.env.llm.provider ?? 'unspecified';
  return `[${type.toUpperCase()}] (${provider}) ${children}`;
}
```

### Class Components

Extend `Component` for access to the render context and additional features:

```typescript
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';

export class Callout extends Component<{ type: string; children?: PuptNode }> {
  render({ type, children }, _resolvedValue: void, context: RenderContext): PuptNode {
    const delimiter = this.getDelimiter(context);

    if (delimiter === 'xml') {
      return `<${type}>${children}</${type}>`;
    }
    const icon = type === 'warning' ? '⚠️' : 'ℹ️';
    return `${icon} ${children}`;
  }
}
```

The `Component` base class provides these helpers:

| Method | Returns | Description |
|--------|---------|-------------|
| `getProvider(context)` | `LlmProvider` | Current LLM provider (`'anthropic'`, `'openai'`, etc.) |
| `getDelimiter(context)` | `'xml' \| 'markdown' \| 'none'` | Delimiter style for the current provider |
| `hasContent(children)` | `boolean` | Whether children have meaningful content |

### Adding Prop Validation

Use a Zod schema to validate props at render time:

```typescript
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';
import { z } from 'zod';

const calloutSchema = z.object({
  type: z.enum(['info', 'warning', 'error']),
});

type CalloutProps = z.infer<typeof calloutSchema> & { children?: PuptNode };

export class Callout extends Component<CalloutProps> {
  static schema = calloutSchema;

  render({ type, children }: CalloutProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const prefix = { info: 'INFO', warning: 'WARNING', error: 'ERROR' }[type];
    return `[${prefix}] ${children}`;
  }
}
```

### Async Components

Both `resolve()` and `render()` can be async:

```typescript
export class GitInfo extends Component<{ repo: string }> {
  async render({ repo }: { repo: string }) {
    const response = await fetch(`https://api.github.com/repos/${repo}`);
    const data = await response.json();
    return `Repository: ${data.full_name}\nStars: ${data.stargazers_count}`;
  }
}
```

### Resolve + Render Pattern

Use `resolve()` to compute a value and `render()` to format it. This separates data fetching from presentation:

```typescript
interface FetchProps { url: string }
interface FetchResult { status: number; body: string }

export class FetchData extends Component<FetchProps, FetchResult> {
  async resolve({ url }: FetchProps): Promise<FetchResult> {
    const res = await fetch(url);
    return { status: res.status, body: await res.text() };
  }

  render({ url }: FetchProps, { status, body }: FetchResult): PuptNode {
    return `Source: ${url} (${status})\n${body}`;
  }
}
```

---

## Publishing an npm Package

When you want to share components beyond your own project, publish them as an npm package.

### Project Structure

```
my-prompt-components/
├── package.json
├── src/
│   ├── index.ts          # Re-exports all components
│   ├── Callout.tsx
│   └── Summary.tsx
└── dist/
    └── index.js          # Built output
```

### package.json

```json
{
  "name": "@acme/prompt-components",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  }
}
```

Key points:
- **`peerDependencies`** — Always list `pupt-lib` as a peer dependency, never a direct dependency. This ensures a single copy of pupt-lib is used at runtime.
- **`type: "module"`** — Use ES modules.
- **`types`** — Include TypeScript declarations so consumers get type checking.

### Entry Point

Re-export all components from `index.ts`:

```typescript
// src/index.ts
export { Callout } from './Callout';
export { Summary } from './Summary';
```

### Declaring Capabilities

If your components need specific runtime capabilities, you can document them in `package.json` so consumers know what's required:

```json
{
  "pupt": {
    "capabilities": ["network"]
  }
}
```

| Capability | Description | Node.js | Browser |
|------------|-------------|---------|---------|
| `filesystem` | Read/write files | Yes | No |
| `network` | Make HTTP requests | Yes | Yes (CORS) |
| `process` | Access process info | Yes | No |

This is a convention for communicating requirements to consumers — for example, a component that reads files won't work in a browser environment.

### Build and Publish

```bash
npm run build
npm publish --access public
```

Consumers then use your package:

```xml
<!-- In a .prompt file -->
<Uses component="Callout, Summary" from="@acme/prompt-components" />
```

```tsx
// In a .tsx file
import { Callout, Summary } from '@acme/prompt-components';
```

---

## Publishing Prompts

You can also share complete prompts (not just components).

### Single Prompt File

Share a `.prompt` file directly — via a URL, gist, or as part of a package.

### Prompt Package

```
my-prompts/
├── package.json
├── prompts/
│   ├── code-review.prompt
│   ├── bug-report.prompt
│   └── feature-request.prompt
└── README.md
```

```json
{
  "name": "@acme/prompts",
  "version": "1.0.0",
  "type": "module",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  }
}
```

### TypeScript Prompt Package

For prompts that need complex logic, export JSX elements:

```typescript
// src/index.ts
export { codeReview } from './prompts/code-review';
export { bugReport } from './prompts/bug-report';
```

```tsx
// src/prompts/code-review.tsx
import { Prompt, Role, Task, Steps, Step } from 'pupt-lib';

export const codeReview = (
  <Prompt name="code-review" description="Structured code review" tags={['code', 'review']}>
    <Role preset="engineer" />
    <Task>Review the provided code for correctness, style, and performance.</Task>
    <Steps>
      <Step>Check for bugs and logic errors</Step>
      <Step>Evaluate code style and readability</Step>
      <Step>Identify performance concerns</Step>
    </Steps>
  </Prompt>
);
```

---

## Publishing Checklist

### Component Libraries

- [ ] All components extend `Component` or are exported functions
- [ ] All components are re-exported from `index.ts`
- [ ] `pupt-lib` is in `peerDependencies` (not `dependencies`)
- [ ] `pupt.capabilities` documented if using filesystem or network
- [ ] TypeScript types are exported
- [ ] Unit tests pass

### Prompt Packages

- [ ] All prompts have unique `name` values
- [ ] `description` and `tags` are set on each prompt
- [ ] Required inputs have clear labels
- [ ] Prompts render correctly with `render()`
