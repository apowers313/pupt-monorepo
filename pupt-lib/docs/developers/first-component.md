# Writing Components

Custom components let you create reusable building blocks for your prompts. If you've worked with React, the patterns will feel familiar -- you write JSX that renders to text instead of DOM nodes.

## Function Components

The simplest way to create a component is to write a function. It takes props as its first argument and returns the text you want in the prompt:

```typescript
import type { PuptNode } from 'pupt-lib';

export function Callout({ type, children }: { type: string; children?: PuptNode }) {
  const icon = type === 'warning' ? '!!' : '--';
  return `[${icon}] ${children}`;
}
```

Use it in a `.prompt` file:

```xml
<Uses component="Callout" from="./my-components" />

<Prompt name="example">
  <Callout type="warning">Check your inputs before proceeding.</Callout>
</Prompt>
```

Renders:

```
[!!] Check your inputs before proceeding.
```

### Accessing the Render Context

Every component receives the `RenderContext` as an optional second argument. The context gives you access to environment configuration (LLM provider, output format, locale), user inputs, metadata, and error tracking. This is useful when you need your component to adapt its output based on the rendering environment:

```typescript
import type { PuptNode, RenderContext } from 'pupt-lib';

export function Greeting(
  { name }: { name: string },
  context?: RenderContext,
) {
  const locale = context?.env.runtime.locale ?? 'en-US';

  if (locale.startsWith('es')) {
    return `Hola, ${name}!`;
  }
  return `Hello, ${name}!`;
}
```

### Async Function Components

Function components can be async, which means you can fetch data, read files, or perform any other asynchronous work during rendering:

```typescript
export async function GitInfo({ repo }: { repo: string }) {
  const response = await fetch(`https://api.github.com/repos/${repo}`);
  const data = await response.json();
  return `${data.full_name} (${data.stargazers_count} stars)`;
}
```

---

## Class Components

When you need prop validation, the resolve/render lifecycle, or built-in helper methods, extend the `Component` base class. The class takes up to two generic type parameters: `Component<Props, ResolveType>`. `Props` defines the shape of your component's props, and `ResolveType` (defaults to `void`) defines the type returned by the optional `resolve()` method:

```typescript
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';
import { z } from 'zod';

const calloutSchema = z.object({
  type: z.enum(['info', 'warning', 'error']),
});

type CalloutProps = z.infer<typeof calloutSchema> & { children?: PuptNode };

export class Callout extends Component<CalloutProps> {
  static schema = calloutSchema;

  render({ type, children }: CalloutProps, _resolvedValue: void, context: RenderContext): PuptNode {
    const delimiter = this.getDelimiter(context);

    if (delimiter === 'xml') {
      return wrapWithDelimiter(children, type, 'xml');
    }
    const prefix = { info: 'INFO', warning: 'WARNING', error: 'ERROR' }[type];
    return `[${prefix}] ${children}`;
  }
}
```

### The `render()` Method

The `render()` method receives three arguments:

| Argument | Type | Description |
|----------|------|-------------|
| `props` | `Props` | Validated props including `children` |
| `resolvedValue` | `ResolveType` | Value from `resolve()`, or `undefined` if no `resolve()` |
| `context` | `RenderContext` | Environment, inputs, metadata, post-execution actions, errors |

You return a `PuptNode` -- any combination of strings, numbers, elements, arrays of these, or `null`. The render method can be synchronous or async.

### Helper Methods

The `Component` base class provides three protected helpers you can call from `render()`. These let you adapt your output to the current rendering environment without digging into the context object yourself:

| Method | Returns | Description |
|--------|---------|-------------|
| `getProvider(context)` | `LlmProvider` | Current LLM provider (`'anthropic'`, `'openai'`, `'google'`, etc.) |
| `getDelimiter(context)` | `'xml' \| 'markdown' \| 'none'` | Delimiter style based on the output format in the render context |
| `hasContent(children)` | `boolean` | Whether children have meaningful (non-empty) content; returns `false` for `undefined`, `null`, empty strings, and booleans |

### Static Properties

You can set these static properties on your class to control framework behavior:

| Property | Type | Description |
|----------|------|-------------|
| `schema` | `ZodObject` | Zod schema for prop validation. Invalid props produce a `RenderError` in the render result. |
| `resolveSchema` | `ZodObject` | Optional schema for validating the value returned by `resolve()` |
| `hoistName` | `boolean` | When `true`, the `name` prop is hoisted to a variable declaration in `.prompt` files, making the resolved value available to other components via `{varName}` syntax. Used by components like `File` and `ReviewFile`. |

---

## The Resolve/Render Lifecycle

Class components support a two-phase lifecycle that separates data computation from text output. This matters when a component needs to make data available to other parts of the prompt. For example, a component might fetch user data, expose it through variables, and also render a summary in the prompt text.

The two phases are:

1. **`resolve(props, context)`** -- Computes a value. The framework stores this value and makes it accessible to other components through the variable system (e.g., `{varName.property}`).
2. **`render(props, resolvedValue, context)`** -- Produces output text. Receives the resolved value as its second argument so you can use the same data without recomputing it.

You can implement either phase alone, or both together.

### Resolve-Only Components

When your component only needs to produce a value for other components to consume, implement `resolve()` without `render()`. The framework stringifies the resolved value automatically and inserts it where the component appears:

```typescript
class WordCount extends Component<{ text: string }, number> {
  static schema = z.object({ text: z.string() });

  resolve({ text }: { text: string }): number {
    return text.split(/\s+/).length;
  }
}
```

Usage:

```xml
<WordCount text="hello world foo" name="count" />
<Task>The text has {count} words.</Task>
```

Renders: `The text has 3 words.`

### Both Resolve and Render

When you want to control the component's text output *and* expose its data to other components, implement both methods. The `resolve()` method runs first and produces the data, then `render()` uses that data to produce the prompt text:

```typescript
interface UserProps { username: string }
interface UserData { displayName: string; stars: number; email: string }

class GitHubUserInfo extends Component<UserProps, UserData> {
  static schema = z.object({ username: z.string() });

  async resolve({ username }: UserProps): Promise<UserData> {
    const res = await fetch(`https://api.github.com/users/${username}`);
    const data = await res.json();
    return { displayName: data.name, stars: data.public_repos, email: data.email };
  }

  render(_props: UserProps, value: UserData): PuptNode {
    return `User: ${value.displayName} (${value.stars} repos)`;
  }
}
```

In this example, `resolve()` fetches and returns the data object. If you give the component a `name` prop (e.g., `<GitHubUserInfo username="octocat" name="gh" />`), other components can reference properties like `{gh.displayName}` or `{gh.stars}`. Meanwhile, `render()` controls the text that appears in the prompt at the component's location.

### Render-Only Components

Components that only implement `render()` produce output text without storing a resolvable value. This is the simplest class component pattern:

```typescript
class Divider extends Component {
  render(): PuptNode {
    return '---';
  }
}
```

---

## Prop Validation with Zod

You validate props by setting a static `schema` property with a Zod object schema. The framework checks props against this schema at render time, before calling `resolve()` or `render()`. Validation failures don't throw -- they produce a `RenderError` in the render result and the component's children are rendered as a fallback:

```typescript
import { z } from 'zod';

const alertSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1),
  dismissible: z.boolean().optional().default(false),
});

type AlertProps = z.infer<typeof alertSchema> & { children?: PuptNode };

class Alert extends Component<AlertProps> {
  static schema = alertSchema;

  render({ severity, title, dismissible, children }: AlertProps): PuptNode {
    const header = `[${severity.toUpperCase()}] ${title}`;
    const dismiss = dismissible ? ' (dismissible)' : '';
    return `${header}${dismiss}\n${children}`;
  }
}
```

If someone passes `severity="banana"`, the `RenderResult` returned by `render()` will have `ok: false` and an entry in its `errors` array describing the validation failure. The component's children are still rendered as best-effort output.

---

## Function vs. Class Components

| Feature | Function | Class |
|---------|----------|-------|
| Simplicity | Minimal boilerplate | More structure |
| Prop validation | No built-in | Zod schema via `static schema` |
| Resolve lifecycle | Not available | `resolve()` method |
| Helper methods | Not available | `getProvider()`, `getDelimiter()`, `hasContent()` |
| Async support | Yes | Yes |
| Context access | Optional second argument | Third argument to `render()` |

Start with function components for straightforward text transformations. Reach for class components when you need prop validation, the resolve/render lifecycle, or the built-in helper methods.

---

## Full Example: A Reusable Component

Here's a complete class component that adapts its output format based on the rendering environment. When the output format is markdown, it renders a blockquote; otherwise, it wraps the content in XML tags:

```typescript
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';
import { z } from 'zod';

const tipSchema = z.object({
  title: z.string().optional(),
});

type TipProps = z.infer<typeof tipSchema> & { children?: PuptNode };

export class Tip extends Component<TipProps> {
  static schema = tipSchema;

  render({ title, children }: TipProps, _resolved: void, context: RenderContext): PuptNode {
    const delimiter = this.getDelimiter(context);
    const heading = title ? `Tip: ${title}` : 'Tip';

    if (delimiter === 'markdown') {
      return `> **${heading}**\n> ${children}`;
    }

    return wrapWithDelimiter(
      `${heading}\n${children}`,
      'tip',
      delimiter,
    );
  }
}
```

Export the component from your module, then reference it in a `.prompt` file with `<Uses>`:

```xml
<Uses component="Tip" from="./my-components" />

<Tip title="Performance">
  Use batch operations when processing more than 100 items.
</Tip>
```

---

## Related

- [Writing Modules](/developers/first-module) -- how to package and share your components
- [API Reference](/developers/api) -- full details on `Component`, `render()`, and all types
- [Variables Reference](/developers/variables) -- how `resolve()` feeds into the variable system
