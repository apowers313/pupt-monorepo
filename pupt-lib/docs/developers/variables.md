# Variables Reference

This page covers how the variable system works under the hood -- how components declare variables, how property access is resolved, and the compile-time and runtime mechanisms that make it happen.

For user-facing documentation on using variables, see [Variables & Inputs](/guide/variables-and-inputs).

## Overview

Variables let components share data with each other. You declare a variable by adding `name="myVar"` to a component, and then any subsequent component can reference that variable with `{myVar}`. Under the hood, three cooperating mechanisms -- a Babel plugin, a JavaScript Proxy wrapper, and the renderer's resolution pipeline -- turn this simple syntax into working cross-component communication.

```tsx
<Ask.Text name="username" label="Your name" default="World" />
<Task>Write a greeting for {username}.</Task>
```

Renders: `Write a greeting for World.`

---

## Declaring Variables

You create a variable by adding `name="..."` to a component:

```tsx
<Ask.Text name="color" label="Favorite color" default="blue" />
```

This triggers two things. At compile time, the name-hoisting Babel plugin rewrites the JSX so that a real JavaScript `const color = ...` declaration wraps the element. At render time, the renderer calls the component's `resolve()` method (if one exists), stores the result, and makes it available whenever another component references `{color}`.

### Which Components Create Variables?

Not every component treats `name` as a variable declaration. The name-hoisting Babel plugin decides whether to hoist based on the component type:

| Component type | `name` creates a variable? | Example |
|---|---|---|
| **Ask components** (`Ask.Text`, `Ask.Number`, etc.) | Yes | `<Ask.Text name="x" />` |
| **File** | Yes | `<File name="src" path="./app.ts" />` |
| **ReviewFile** | Yes | `<ReviewFile name="doc" path="./README.md" />` |
| **Custom components** (PascalCase) | Yes | `<MyComponent name="data" />` |
| **Structural components** (`Prompt`, `Section`, `Task`, etc.) | No -- `name` is a label | `<Section name="intro">` |

Structural components use `name` to control their section heading, not to create a variable. The plugin identifies structural components dynamically from the actual exports (via `getStructuralComponents()` in `component-discovery.ts`) rather than maintaining a hardcoded list. Any PascalCase component that is not in the structural set gets hoisted automatically. Built-in components that need hoisting but would otherwise be classified as structural (like `File` and `ReviewFile`) opt in by setting `static hoistName = true` on the class.

---

## Property Access

When a component resolves to an object or array, you can drill into its properties using standard JavaScript dot notation. The Proxy wrapper on each element intercepts these property accesses and builds a deferred reference path that the renderer resolves later.

### Object Properties

```tsx
<GitHubUserInfo username="octocat" name="github" />

<Context>
  Name: {github.displayName}
  Stars: {github.stars}
</Context>
```

### Nested Properties

Property access chains to any depth. Each `.` creates a new `DeferredRef` with a longer path array, so `github.address.city` produces a reference with path `['address', 'city']`:

```tsx
{github.address.city}
{github.metadata.created.year}
```

### Array Access

```tsx
<SearchResults query="react" name="results" />

<Task>
  Found {results.length} results.
  Top result: {results[0].title}
</Task>
```

### String Properties

Even simple string values support property access, because the renderer calls `followPath()` on whatever the resolved value turns out to be -- and JavaScript strings have properties like `.length`:

```tsx
<Ask.Text name="username" default="octocat" />

{username}         // "octocat"
{username.length}  // 7
```

---

## Rules and Constraints

### Variables Must Be Declared Before Use

Because the Babel plugin emits `const` declarations, you cannot reference a variable before you declare it -- just like standard JavaScript:

```tsx
// Works
<Ask.Text name="username" default="octocat" />
<Task>Hello {username}</Task>

// Error: username is not defined
<Task>Hello {username}</Task>
<Ask.Text name="username" default="octocat" />
```

### Variable Names Must Be Valid Identifiers

Because the plugin turns `name` into a `const` declaration, the value must be a legal JavaScript identifier. The plugin validates this with a regex (`/^[a-zA-Z_$][a-zA-Z0-9_$]*$/`) and also rejects JavaScript reserved words:

```tsx
// Valid
<Ask.Text name="userName" ... />
<Ask.Text name="item1" ... />
<Ask.Text name="_private" ... />

// Invalid (will error)
<Ask.Text name="user-name" ... />
<Ask.Text name="123abc" ... />
<Ask.Text name="class" ... />
```

### Each Name Must Be Unique

The plugin tracks which names it has already hoisted per file. If it encounters the same `name` a second time, it replaces that JSX element with a reference to the existing variable rather than emitting a new `const` declaration.

### No Forward References

The renderer processes the element tree top-to-bottom. If component B references component A's variable, A must appear earlier in the JSX so the renderer resolves it first. This matches standard JavaScript execution order.

---

## Writing Components That Produce Variables

To make a custom component participate in the variable system, you implement the `resolve()` method on your `Component` subclass. The renderer calls `resolve()` before `render()`, stores the returned value in a `Map<PuptElement, unknown>` keyed by element reference, and makes that value available whenever another component accesses the variable.

### Resolve-Only Component

```typescript
import { Component } from 'pupt-lib';
import { z } from 'zod';

class WordCount extends Component<{ text: string }, number> {
  static schema = z.object({ text: z.string() });

  resolve({ text }: { text: string }): number {
    return text.split(/\s+/).length;
  }
  // No render() -- the number is stringified automatically
}
```

```tsx
<WordCount text="hello world foo" name="count" />
<Task>The text has {count} words.</Task>
<!-- Renders: "The text has 3 words." -->
```

### Resolve + Render Component

When you want to control how the component appears in the prompt *and* expose its data to other components, implement both methods. The renderer calls `resolve()` first, stores the value, then passes it as the second argument to `render()`:

```typescript
class GitHubUserInfo extends Component<
  { username: string },
  { displayName: string; stars: number; email: string }
> {
  static schema = z.object({ username: z.string() });

  async resolve({ username }) {
    const data = await fetchGitHubUser(username);
    return { displayName: data.name, stars: data.public_repos, email: data.email };
  }

  render(props, value) {
    return `User: ${value.displayName}, Stars: ${value.stars}`;
  }
}
```

The `resolve()` method produces the data object -- when another component writes `{github.stars}`, the renderer looks up the stored resolved value and follows the path `['stars']` to extract it. The `render()` method controls what text appears inline in the prompt output.

### Render-Only Component (No Variable)

If you only implement `render()`, your component produces text output but does not store a resolvable value. Other components cannot reference it with `{varName}` because there is nothing in the resolved values map:

```typescript
class Greeting extends Component<{ name: string }> {
  static schema = z.object({ name: z.string() });

  render({ name }: { name: string }) {
    return `Hello, ${name}!`;
  }
}
```

---

## How It Works Under the Hood

The variable system combines three cooperating mechanisms: a compile-time Babel plugin, a Proxy wrapper on every element, and a render-time resolution pipeline.

### 1. Compile-Time: Name Hoisting (Babel Plugin)

When the transformer processes your `.prompt` or `.tsx` file, the `pupt-name-hoisting` Babel plugin runs *before* the JSX transform. It visits every `JSXElement` node (using an exit traversal so children are processed before parents), finds `name="x"` attributes on eligible components, and rewrites the surrounding code to produce a `const` declaration:

```tsx
// You write:
<Ask.Text name="username" label="Your name" default="World" />
<Task>Hello {username}</Task>

// Babel transforms this to:
const username = jsx(AskText, { name: "username", label: "Your name", default: "World" });
jsx(Task, { children: ["Hello ", username] });
```

This is why `{username}` works -- it is a real JavaScript variable that points to the `PuptElement` created by `jsx()`.

The plugin decides whether to hoist based on the `shouldHoistName()` function. JSX member expressions (like `Ask.Text`) always get hoisted. For simple identifiers, the plugin checks the structural component set (computed dynamically from exports by `getStructuralComponents()` in `component-discovery.ts`). If the component is *not* structural and its name starts with an uppercase letter, it gets hoisted. Structural components like `Prompt`, `Section`, `Task`, and `Context` are excluded -- their `name` prop serves as a label, not a variable. Built-in components that need hoisting but would otherwise be classified as structural (like `File` and `ReviewFile`) opt in by declaring `static hoistName = true` on their class, which removes them from the structural set.

### 2. Element Creation: Proxy Wrapping

The `jsx()` function in `src/jsx-runtime/index.ts` wraps every element it creates in a JavaScript `Proxy` via `wrapWithProxy()`. When you write `{github.stars}`, JavaScript evaluates `github.stars` at module evaluation time -- well before any rendering happens.

The Proxy intercepts this property access and calls `createDeferredRef()`, which builds a *deferred reference* object:

```
github.stars
  -> Proxy on github intercepts .stars
  -> createDeferredRef(github, ['stars'])
  -> Returns a Proxy-wrapped DeferredRef { [DEFERRED_REF]: true, element: github, path: ['stars'] }
```

The returned `DeferredRef` is itself wrapped in a Proxy, so chained access extends the path by creating a new `DeferredRef` with a longer path array:

```
github.user.address.city
  -> DeferredRef { element: github, path: ['user', 'address', 'city'] }
```

The Proxy also skips certain reserved properties (`then`, `catch`, `finally`, `constructor`, `toString`, `valueOf`, `Symbol.toPrimitive`, and others) to avoid interfering with Promise resolution and standard JavaScript operations. Accessing these properties returns `undefined` instead of creating a deferred reference.

### 3. Render-Time: Value Resolution

During rendering, the renderer in `src/render.ts` maintains a `RenderState` containing a `resolvedValues: Map<PuptElement, unknown>` and a `pendingResolutions: Map<PuptElement, Promise<string>>`. When it encounters an element reference or `DeferredRef` as a child node or prop value, it kicks off resolution:

1. **`ensureElementResolved()`** checks whether the element already has a value in `resolvedValues`. If not, it checks `pendingResolutions` to see if resolution is already in progress (from a parallel rendering path). If neither, it starts rendering that element and tracks the promise in `pendingResolutions` so concurrent requests can await the same result.
2. **`resolveProps()`** walks all props before rendering a component, recursively resolving any element references, `DeferredRef` objects, arrays, and nested objects. This guarantees that by the time a component's `resolve()` or `render()` method runs, all its prop values are concrete.
3. For `DeferredRef` nodes, the renderer calls **`followPath()`** to walk the property path on the resolved value. For example, if `github` resolved to `{ displayName: "Octocat", stars: 42 }`, then a `DeferredRef` with path `['stars']` extracts `42`.

The renderer uses `Promise.all` to process sibling children in parallel, so independent components resolve concurrently. Dependent components wait only for their specific dependencies via `ensureElementResolved()`.

---

## Related

- [Variables & Inputs](/guide/variables-and-inputs) -- user-facing guide
- [Writing Components](/developers/first-component) -- the resolve/render lifecycle
- [API Reference](/developers/api) -- `Component`, `render()`, types
