# Variables

pupt-lib lets components share data using variables. A component declares a variable with `name="myVar"`, and other components reference it with `{myVar}`.

```tsx
<Ask.Text name="username" label="Your name" default="World" />
<Task>Write a greeting for {username}.</Task>
```

This renders as:

```
Write a greeting for World.
```

---

## Basics

### Declaring a variable

Add `name="..."` to a component to create a variable:

```tsx
<Ask.Text name="color" label="Favorite color" default="blue" />
```

This does two things:
1. Creates a JavaScript variable called `color`
2. Stores the component's resolved value (here, the string `"blue"`) so other components can access it

### Using a variable

Reference a variable with curly braces:

```tsx
<Task>Your favorite color is {color}.</Task>
```

The variable resolves to the component's value -- for `Ask.Text`, that's the user's input (or the default).

### Passing a variable as a prop

Variables can be passed to other components as prop values:

```tsx
<Ask.Text name="username" label="GitHub username" default="octocat" />
<GitHubUserInfo username={username} />
```

The `GitHubUserInfo` component receives the resolved string `"octocat"` as its `username` prop -- not the raw element.

---

## Property access

When a component resolves to an object or array, you can access its properties with dot notation:

### Object properties

```tsx
<GitHubUserInfo username="octocat" name="github" />

<Context>
  Name: {github.displayName}
  Stars: {github.stars}
  Email: {github.email}
</Context>
```

### Nested properties

Property access chains to any depth:

```tsx
{github.address.city}
{github.metadata.created.year}
```

### Array access

```tsx
<SearchResults query="react" name="results" />

<Task>
  Found {results.length} results.
  Top result: {results[0].title}
</Task>
```

### String properties

Even simple string values support property access:

```tsx
<Ask.Text name="username" default="octocat" />

{username}         // "octocat"
{username.length}  // 7
```

---

## Complete examples

### Collecting user input

```tsx
<Prompt name="greetingPrompt">
  <Ask.Text name="firstName" label="First name" default="John" />
  <Ask.Text name="lastName" label="Last name" default="Doe" />
  <Task>Greet {firstName} {lastName}.</Task>
</Prompt>
```

### Chaining components

One component's output can feed into another:

```tsx
<Prompt name="profileSearchPrompt">
  <Ask.Text name="rawInput" label="Username" default="test" />
  <UserLookup username={rawInput} name="userInfo" />
  <SearchResults query={userInfo.displayName} name="results" />

  <Task>
    Input: {rawInput}
    User: {userInfo.displayName}
    Search found: {results.length} results
  </Task>
</Prompt>
```

The renderer automatically resolves dependencies in the right order: `rawInput` first, then `userInfo` (which depends on `rawInput`), then `results` (which depends on `userInfo`).

### Multiple instances of the same component

```tsx
<Prompt name="compareUsersPrompt">
  <Ask.Text name="user1" label="First username" default="alice" />
  <Ask.Text name="user2" label="Second username" default="bob" />

  <GitHubUserInfo username={user1} name="profile1" />
  <GitHubUserInfo username={user2} name="profile2" />

  <Task>Compare these two profiles.</Task>

  <Context>
    User 1: {profile1.displayName} with {profile1.stars} stars
    User 2: {profile2.displayName} with {profile2.stars} stars
  </Context>
</Prompt>
```

### Different input types

Variables work with all Ask components:

```tsx
<Ask.Number name="count" label="How many items?" default={5} />
<Task>Generate {count} items.</Task>

<Ask.Confirm name="includeCode" label="Include code?" default={true} />
<Task>Agreement status: {includeCode}</Task>

<Ask.Select name="language" label="Language" default="python">
  <Ask.Option value="python" label="Python" />
  <Ask.Option value="javascript" label="JavaScript" />
</Ask.Select>
<Task>Write the example in {language}.</Task>

<Ask.MultiSelect name="features" label="Features" default={["auth", "api"]}>
  <Ask.Option value="auth" label="Authentication" />
  <Ask.Option value="api" label="API" />
  <Ask.Option value="ui" label="UI" />
</Ask.MultiSelect>
<Task>Include these features: {features}</Task>
```

### Inline elements (no variable needed)

If you only need a value in one place, pass the element directly as a prop without naming it:

```tsx
<GitHubUserInfo username={<Ask.Text name="_inline" label="Username" default="octocat" />} />
```

Named variables are better when you need to reuse a value in multiple places:

```tsx
<Ask.Text name="username" label="Username" default="octocat" />
<GitHubUserInfo username={username} />
<Task>Processing user: {username}</Task>
```

---

## Which components create variables?

Not all components create variables when given a `name` prop. The behavior depends on the component type:

| Component type | `name` creates a variable? | Example |
|---|---|---|
| **Ask components** (`Ask.Text`, `Ask.Number`, etc.) | Yes | `<Ask.Text name="x" />` |
| **File** | Yes | `<File name="src" path="./app.ts" />` |
| **ReviewFile** | Yes | `<ReviewFile name="doc" path="./README.md" />` |
| **Custom components** (PascalCase) | Yes | `<MyComponent name="data" />` |
| **Structural components** (`Prompt`, `Section`, `Task`, `Context`, etc.) | No -- `name` is a label | `<Section name="intro">` |

For structural components, `name` controls the section heading or identifier. It does not create a variable.

---

## Rules and constraints

### Variables must be declared before use

Like standard JavaScript, you cannot reference a variable before it's declared:

```tsx
// Works
<Ask.Text name="username" default="octocat" />
<Task>Hello {username}</Task>

// Error: username is not defined
<Task>Hello {username}</Task>
<Ask.Text name="username" default="octocat" />
```

### Variable names must be valid JavaScript identifiers

The `name` value must be a legal JavaScript variable name:

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

### Each name must be unique

Using the same `name` twice in the same scope references the original variable -- it does not create a new one:

```tsx
<Ask.Text name="x" label="First" default="hello" />
<Ask.Text name="x" label="Second" default="world" />
<!-- Both refer to the same variable; the second declaration is ignored -->
```

### No forward references

The system does not support referencing a variable defined later in the document. Variables are resolved top-to-bottom, matching standard JavaScript execution order.

---

## Writing components that produce variables

To make a custom component that works with the variable system, implement the `resolve()` method. The value returned by `resolve()` is what gets stored and made available through the variable.

### Simple component (resolve only)

If your component only needs to produce a value, implement `resolve()` alone. The resolved value is automatically converted to text when rendered:

```tsx
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

Usage:

```tsx
<WordCount text="hello world foo" name="count" />
<Task>The text has {count} words.</Task>
<!-- Renders: "The text has 3 words." -->
```

### Component with resolve and render

When you want to control how the component appears in the prompt *and* make its data available to other components, implement both `resolve()` and `render()`:

```tsx
class GitHubUserInfo extends Component<
  { username: string },
  { displayName: string; stars: number; email: string }
> {
  static schema = z.object({ username: z.string() });

  async resolve({ username }) {
    const data = await fetchGitHubUser(username);
    return {
      displayName: data.name,
      stars: data.public_repos,
      email: data.email,
    };
  }

  render(props, value) {
    return `User: ${value.displayName}, Stars: ${value.stars}`;
  }
}
```

- `resolve()` produces the data object -- this is what `{github.stars}` reads from
- `render()` controls what text appears in the prompt output where the component is placed

### Render-only component (no variable)

Components that only implement `render()` (like `Section`, `Task`, etc.) produce output text but do not store a resolvable value. They can still accept variables as props:

```tsx
class Greeting extends Component<{ name: string }> {
  static schema = z.object({ name: z.string() });

  render({ name }: { name: string }) {
    return `Hello, ${name}!`;
  }
}
```

### Enabling name hoisting for custom components

By default, any PascalCase custom component supports `name` hoisting. If you are creating a structural component that should *not* hoist `name` to a variable, don't worry -- only components exported from `pupt-lib` are in the structural set. All third-party PascalCase components automatically support name hoisting.

If you are adding a built-in component to the library and want it to participate in name hoisting, add `static hoistName = true`:

```tsx
class MyDataComponent extends Component<Props, ResolveType> {
  static hoistName = true;
  // ...
}
```

---

## How it works under the hood

The variable system is built from three cooperating mechanisms:

### 1. Compile-time: name hoisting (Babel plugin)

When your `.prompt` or `.tsx` file is transformed, a Babel plugin detects `name="x"` on eligible components and rewrites the JSX to create a JavaScript variable:

```tsx
// You write:
<Ask.Text name="username" label="Your name" default="World" />
<Task>Hello {username}</Task>

// Babel transforms this to:
const username = jsx(AskText, { name: "username", label: "Your name", default: "World" });
jsx(Task, { children: ["Hello ", username] });
```

This is why `{username}` works -- it's a real JavaScript variable pointing to the element.

### 2. Element creation: Proxy wrapping

Every element created by `jsx()` is wrapped in a JavaScript Proxy. When you write `{github.stars}`, JavaScript executes `github.stars` at module evaluation time -- before any rendering happens. The Proxy intercepts this property access and creates a *deferred reference*: a lightweight marker that says "get the `stars` property of whatever `github` resolves to."

```
github.stars
→ Proxy intercepts .stars
→ Returns DeferredRef { element: github, path: ['stars'] }
```

Chained access extends the path: `github.user.address.city` creates `DeferredRef { element: github, path: ['user', 'address', 'city'] }`.

### 3. Render-time: value resolution

During rendering, when the renderer encounters an element or deferred reference as a prop value or child node, it resolves it:

1. If the referenced element hasn't been resolved yet, the renderer resolves it first (calling `resolve()`)
2. The resolved value is stored in a map keyed by element reference
3. For deferred references, the renderer follows the property path to extract the specific value

This means dependencies are resolved automatically and in parallel where possible -- independent components resolve concurrently, while dependent components wait only for their specific dependencies.
