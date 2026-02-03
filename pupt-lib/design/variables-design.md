# Component Communication Design

## Status

**Approved** - Direction locked in, ready for implementation

## Problem Statement

When a user passes an Ask component (or any component) as a prop value to another component, the receiving component gets the raw PuptElement object instead of the resolved value:

```tsx
<GitHubUserInfo username={<Ask.Text name="username" default="octocat" />} />
```

The `GitHubUserInfo` component's `render()` method receives the Ask element object, which becomes `[object Object]` when used in template strings, rather than the resolved string value `"octocat"`.

This breaks a natural expectation: that components should be able to receive values from other components without knowing where those values come from.

## Requirements

1. **Simple syntax** - `.prompt` files shouldn't require JavaScript functions or complex patterns
2. **Sync and async support** - Must handle both synchronous and asynchronous components, and data sharing between any combination
3. **Intuitive mental model** - Developers should be able to predict behavior without reading extensive documentation
4. **Familiar patterns** - Reuse React/JSX design patterns where possible so developers don't have to learn conflicting concepts
5. **Encapsulation** - Components should not need to know the internal names or implementation details of their data sources
6. **Flexibility** - A component like `GitHubUserInfo` should accept:
   - Static values: `username="octocat"`
   - Dynamic inputs: `username={<Ask.Text name="username" />}`
   - Values from other components: `username={<SomeOtherComponent />}`
7. **Identical behavior** - `.prompt` and `.tsx` files must behave the same; no special preprocessing for one format
8. **No separate preprocessor** - All transformations happen in the standard Babel JSX transform
9. **Clean export syntax** - Accessing values should be simple: `{github.stars}` not `{github.exports.stars}`
10. **Nested property access** - Support accessing nested properties: `{github.raw.email}`
11. **Type safety** - Export types declared via TypeScript generics, with optional Zod schemas for runtime validation
12. **Uniform value handling** - All value types (string, number, object, array) should be treated uniformly; no special cases based on type
13. **Single value per element** - Each named element has one resolved value (which can be any type)
14. **Separation of concerns** - Data resolution and presentation should be separate

## Design Decisions

### PuptElements All The Way Down

Components return PuptElements, not strings. This aligns with React's model:

- React: Components → React Elements → DOM (via ReactDOM)
- pupt-lib: Components → PuptElements → Text (via renderer)

### Two Methods: resolve() and render()

Components have two separate concerns:

1. **`resolve()`** - Compute the value (data fetching, input collection, computation)
2. **`render()`** - Produce the visual output (optional, for custom presentation)

```tsx
class GitHubUserInfo extends Component {
  // Compute the resolved value
  async resolve({ username }) {
    const data = await fetchUser(username);
    return { name: data.name, stars: data.stars };
  }

  // Produce the rendered output (receives resolved value)
  render(props, value) {
    return <Section>{value.name} - {value.stars} repos</Section>;
  }
}
```

### Simple Components Only Need resolve()

If `render()` is not defined, the resolved value is converted to text directly:

```tsx
class Text extends Component {
  resolve(props) {
    return collectInput(props);  // "octocat"
  }
  // No render() - resolved value IS the output
}
```

### Uniform Value Resolution

All value types are treated the same - no special cases:

```tsx
// String value
{username}           // → "octocat"
{username.length}    // → 7 (strings have .length)

// Object value
{github}             // → { name: "octocat", stars: 42 }
{github.stars}       // → 42
{github.name.length} // → 7

// Array value
{results}            // → [{ title: "..." }, ...]
{results.length}     // → 10
{results[0].title}   // → "React Guide"
```

### Symbols for Internal Element Properties

PuptElement internal properties use symbols to avoid conflicts with property access:

```tsx
const TYPE = Symbol('pupt.type');
const PROPS = Symbol('pupt.props');
const CHILDREN = Symbol('pupt.children');

const element = {
  [TYPE]: GitHubUserInfo,
  [PROPS]: { username: "octocat", name: "github" },
  [CHILDREN]: [],
};
```

### Proxy-Wrapped Elements

Every element is wrapped in a Proxy that intercepts property access:

```tsx
function jsx(type, props) {
  const element = {
    [TYPE]: type,
    [PROPS]: props,
    [CHILDREN]: props.children ?? [],
  };

  return new Proxy(element, {
    get(target, prop) {
      if (typeof prop === 'symbol') return target[prop];
      // Any property access creates a deferred reference
      return createDeferredRef(target, [prop]);
    }
  });
}
```

### Deferred References with Path Tracking

Property access returns a deferred reference that tracks the access path:

```tsx
function createDeferredRef(element, path) {
  const ref = { __ref: true, element, path };

  return new Proxy(ref, {
    get(target, prop) {
      if (prop === '__ref' || prop === 'element' || prop === 'path') {
        return target[prop];
      }
      // Extend path for nested access
      return createDeferredRef(element, [...path, prop]);
    }
  });
}
```

This enables arbitrarily deep property access:

```tsx
github.user.address.city
// → Proxy({ __ref: true, element: github, path: ['user', 'address', 'city'] })
```

### JSX Transform Handles Named Variables

The Babel JSX transform hoists `name="X"` to variable declarations:

```tsx
// User writes:
<Ask.Text name="username" default="octocat" />
<GitHubUserInfo username={username} />

// Babel outputs:
const username = jsx(Ask.Text, { name: "username", default: "octocat" });
username;
jsx(GitHubUserInfo, { username: username });
```

## Syntax

### Declaring a Named Element

```tsx
<Ask.Text name="username" label="Enter username" default="octocat" />
```

### Passing an Element as a Prop

```tsx
// The element is passed; renderer resolves to its value
<GitHubUserInfo username={username} />
```

### Accessing Properties of Resolved Value

```tsx
<GitHubUserInfo username="octocat" name="github" />

{github}              // The whole resolved value
{github.stars}        // Property of resolved value
{github.raw.email}    // Nested property
```

### Inline Elements (No Variable Needed)

```tsx
<GitHubUserInfo username={<Ask.Text default="octocat" />} />
```

### No Forward References

Variables must be declared before use (matches JavaScript):

```tsx
// ✓ Works
<Ask.Text name="username" default="octocat" />
<GitHubUserInfo username={username} />

// ✗ Error: username is not defined
<GitHubUserInfo username={username} />
<Ask.Text name="username" default="octocat" />
```

## Component Implementation

### TypeScript Generics for Type Safety

Components use `Component<Props, ResolveType>` generics for compile-time type checking:

```tsx
// The resolve type flows through to:
// - resolve() return type
// - render() value parameter
// - Property access like {github.stars}
class GitHubUserInfo extends Component<Props, GitHubData> {
  async resolve({ username }): Promise<GitHubData> { ... }
  render(props: Props, value: GitHubData) { ... }
}
```

### Optional Runtime Validation with Zod

Schemas are optional. If provided, the renderer validates the `resolve()` output:

```tsx
// Option 1: TypeScript only (no runtime validation)
class GitHubUserInfo extends Component<Props, GitHubData> {
  async resolve({ username }): Promise<GitHubData> { ... }
}

// Option 2: TypeScript + runtime validation
const gitHubDataSchema = z.object({ name: z.string(), stars: z.number() });
type GitHubData = z.infer<typeof gitHubDataSchema>;

class GitHubUserInfo extends Component<Props, GitHubData> {
  static schema = z.object({ username: z.string() });      // props validation
  static resolveSchema = gitHubDataSchema;                  // resolve() validation

  async resolve({ username }): Promise<GitHubData> { ... }
}
```

### Simple Component (resolve only)

```tsx
interface TextProps {
  name?: string;
  label?: string;
  default?: string;
}

class Text extends Component<TextProps, string> {
  static schema = z.object({
    name: z.string().optional(),
    label: z.string().optional(),
    default: z.string().optional(),
  });

  resolve(props: TextProps): string {
    return collectInput(props);  // "octocat"
  }
  // No render() - resolved value is rendered directly
}
```

### Complex Component (resolve + render)

```tsx
interface Props {
  username: string;
}

interface GitHubData {
  name: string;
  stars: number;
  email: string;
}

class GitHubUserInfo extends Component<Props, GitHubData> {
  static schema = z.object({ username: z.string() });

  async resolve({ username }: Props): Promise<GitHubData> {
    const data = await fetchUser(username);
    return {
      name: data.name,
      stars: data.public_repos,
      email: data.email,
    };
  }

  render(props: Props, value: GitHubData) {
    return <Section>{value.name} - {value.stars} repos</Section>;
  }
}
```

### Presentation-Only Component (render only)

```tsx
interface SectionProps {
  title?: string;
  children: PuptNode;
}

class Section extends Component<SectionProps> {
  static schema = z.object({
    title: z.string().optional(),
    children: z.any(),
  });

  render({ title, children }: SectionProps) {
    return <>{title ? `## ${title}\n` : ''}{children}</>;
  }
  // No resolve() - no value to export
}
```

## Execution Flow

### 1. JSX Transform (Babel)

```tsx
// Input
<Ask.Text name="username" default="octocat" />
<GitHubUserInfo username={username} name="github" />
<Display user={github} stars={github.stars} />

// Output
const username = jsx(Ask.Text, { name: "username", default: "octocat" });
const github = jsx(GitHubUserInfo, { username: username, name: "github" });
jsx(Display, { user: github, stars: github.stars });
```

### 2. JavaScript Execution (Element Tree)

```js
// username is a Proxy-wrapped element
username = Proxy({
  [TYPE]: Ask.Text,
  [PROPS]: { name: "username", default: "octocat" },
  [CHILDREN]: []
})

// github is a Proxy-wrapped element
github = Proxy({
  [TYPE]: GitHubUserInfo,
  [PROPS]: { username: username, name: "github" },
  [CHILDREN]: []
})

// github.stars triggers the Proxy
github.stars = Proxy({ __ref: true, element: github, path: ['stars'] })
```

### 3. Renderer Resolution

```
1. Render username (Ask.Text)
   - Call resolve(props) → "octocat"
   - Store: resolvedValues[username] = "octocat"
   - No render(), so output the value directly: "octocat"

2. Render github (GitHubUserInfo)
   - Resolve props.username:
     - It's an element (Proxy)
     - Look up resolvedValues[username] → "octocat"
   - Call await resolve({ username: "octocat" })
     → { name: "octocat", stars: 42, email: "..." }
   - Store: resolvedValues[github] = { name: "octocat", stars: 42, ... }
   - Call render(props, value)
     → <Section>octocat - 42 repos</Section>
   - Output: "## GitHub User\noctocat - 42 repos"

3. Render Display
   - Resolve props.user:
     - It's an element (Proxy)
     - Look up resolvedValues[github] → { name, stars, ... }
   - Resolve props.stars:
     - It's a deferred ref with path ['stars']
     - Look up resolvedValues[github]['stars'] → 42
   - Call render({ user: { name, stars, ... }, stars: 42 }, value)
```

### Resolution Logic

```tsx
function resolveValue(value, resolvedValues) {
  if (isPuptElement(value)) {
    // Element → return its resolved value
    return resolvedValues.get(value);
  }
  if (isDeferredRef(value)) {
    // Deferred ref → get resolved value, follow path
    const resolved = resolvedValues.get(value.element);
    return followPath(resolved, value.path);
  }
  // Already a plain value
  return value;
}

function followPath(obj, path) {
  return path.reduce((current, key) => current?.[key], obj);
}
```

### Parallel Async Resolution

Independent components resolve in parallel. Each element awaits only its specific dependencies:

```tsx
async function resolveElement(el, resolvePromises, resolvedValues) {
  // Wait only for elements this one depends on (via props)
  const deps = Object.values(el[PROPS]).filter(isPuptElement);
  await Promise.all(deps.map(dep => resolvePromises.get(dep)));

  // Now resolve this element
  const props = resolveProps(el, resolvedValues);
  const value = await el[TYPE].prototype.resolve?.(props);
  resolvedValues.set(el, value);
}

// Start all resolves immediately - they await their deps internally
const resolvePromises = new Map();
for (const el of elements) {
  resolvePromises.set(el, resolveElement(el, resolvePromises, resolvedValues));
}
await Promise.all(resolvePromises.values());
```

For this tree:
```tsx
<Ask.Text name="username" />           // A
<GitHubUserInfo username={username} /> // B (depends on A)
<TwitterInfo username={username} />    // C (depends on A)
```

- A starts immediately
- B and C both start, but await A internally
- Once A resolves, B and C run in parallel
- No topological sort needed - `await` calls naturally serialize dependent work

## Examples

### Basic: String Value

```tsx
<Prompt name="greeting">
  <Ask.Text name="username" label="Your name" default="World" />

  <Task>Write a greeting for {username}.</Task>
</Prompt>
```

### Passing Values Between Components

```tsx
<Prompt name="github-profile">
  <Ask.Text name="username" label="GitHub username" default="octocat" />

  <!-- username's resolved value ("octocat") is passed to GitHubUserInfo -->
  <GitHubUserInfo username={username} name="github" />

  <Task>Write a professional summary.</Task>

  <Context>
    <Data label="Profile">{github}</Data>
    <Data label="Stars">{github.stars}</Data>
  </Context>
</Prompt>
```

### Accessing String Properties

```tsx
<Ask.Text name="username" default="octocat" />

{username}           // "octocat"
{username.length}    // 7
```

### Accessing Object Properties

```tsx
<GitHubUserInfo username="octocat" name="github" />

{github}             // { name: "octocat", stars: 42, email: "..." }
{github.stars}       // 42
{github.name}        // "octocat"
{github.name.length} // 7
```

### Accessing Array Elements

```tsx
<SearchResults query="react" name="results" />

{results}            // [{ title: "React Guide", ... }, ...]
{results.length}     // 10
{results[0]}         // { title: "React Guide", ... }
{results[0].title}   // "React Guide"
```

### Multiple Instances

```tsx
<Prompt name="compare-users">
  <Ask.Text name="user1" label="First username" />
  <Ask.Text name="user2" label="Second username" />

  <GitHubUserInfo username={user1} name="profile1" />
  <GitHubUserInfo username={user2} name="profile2" />

  <Task>Compare these two profiles.</Task>

  <Context>
    <Section title="User 1">
      <Data label="Name">{profile1.name}</Data>
      <Data label="Stars">{profile1.stars}</Data>
    </Section>
    <Section title="User 2">
      <Data label="Name">{profile2.name}</Data>
      <Data label="Stars">{profile2.stars}</Data>
    </Section>
  </Context>
</Prompt>
```

### Async Components

```tsx
<Prompt name="async-example">
  <Ask.Text name="query" label="Search query" />

  <!-- SearchResults fetches data asynchronously -->
  <SearchResults query={query} name="results" />

  <!-- Values available after async resolve completes -->
  <Data label="Total">{results.length}</Data>
  <Data label="Top Result">{results[0].title}</Data>
</Prompt>
```

### Inline vs Named

```tsx
<!-- Inline: element passed directly, no variable -->
<GitHubUserInfo username={<Ask.Text default="octocat" />} />

<!-- Named: element assigned to variable for reuse -->
<Ask.Text name="username" default="octocat" />
<GitHubUserInfo username={username} />
<AnotherComponent user={username} />
```

## Reserved Property Names

The following cannot be used as property access on elements (they conflict with JavaScript internals):

- `then`, `catch`, `finally` (Promise methods - would break async/await)
- `constructor`, `prototype`, `__proto__`
- `toJSON`, `toString`, `valueOf`

The Proxy should return `undefined` or the actual element property for these, not create a deferred reference.

## Error Handling

- **Undefined variable**: Standard JavaScript `ReferenceError`
- **Duplicate names**: Standard JavaScript `SyntaxError`
- **Property access on undefined value**: Runtime error with helpful message
- **Value accessed before component resolved**: Runtime error explaining render order

## Implementation Plan

### Phase 1: Components Return PuptElements

- Update component base class to support `resolve()` and `render()` methods
- Update built-in components to use new pattern
- Update renderer to call `resolve()` then `render()`
- Use symbols for internal element properties (`TYPE`, `PROPS`, `CHILDREN`)

### Phase 2: JSX Transform for Named Variables

- Extend the existing Babel JSX plugin to detect `name="X"` attributes
- Generate `const X = jsx(...)` declarations
- Handle scoping correctly within the AST transformation

### Phase 3: Proxy-Wrapped Elements

- Wrap all elements in Proxy in the `jsx()` function
- Implement `createDeferredRef()` for property access
- Handle reserved property names

### Phase 4: Renderer Updates

- Resolve element props by looking up resolved values
- Resolve deferred references by following paths
- Handle nested property access uniformly
- Store resolved values per-element during render
- Parallel async resolution (elements await only their dependencies)

### Phase 5: Polish

- TypeScript types via `Component<Props, ResolveType>` generics
- Optional `static resolveSchema` for runtime validation
- Comprehensive error messages
- Integration with input collection (discover Ask in props)
- Documentation and examples

## What Was Eliminated

- ~~Separate preprocessor~~ - Name hoisting is part of the Babel JSX transform
- ~~Multiple named exports~~ - Single resolved value per element
- ~~`context.setValue()`~~ - Replaced with `resolve()` return value
- ~~`context.export()`~~ - Replaced with `resolve()` return value
- ~~`.exports` property~~ - Properties accessed directly on element
- ~~`<Ref>` component~~ - Variables are real JavaScript
- ~~`<Export>` component~~ - `resolve()` method handles this
- ~~Dependency graph~~ - Not needed without forward references
- ~~Topological sorting~~ - Not needed without forward references
- ~~Forward references~~ - Removed for simplicity
- ~~Special scoping rules~~ - Standard JS scoping applies
- ~~Type-specific handling~~ - All types handled uniformly
- ~~`static valueType`~~ - Replaced with `Component<Props, ResolveType>` generics
- ~~Sequential async resolution~~ - Parallel resolution with dependency awaiting

## Comparison with React

### What's the Same

pupt-lib intentionally mirrors React patterns to minimize the learning curve:

| Concept | How It Works |
|---------|--------------|
| **JSX Syntax** | Same `<Component prop={value}>children</Component>` syntax |
| **Components** | Classes with render methods, or function components |
| **Props** | Same pattern: parent passes data to child via attributes |
| **Elements as Props** | Components can receive other components as prop values |
| **Children** | Same `{children}` pattern for nested content |
| **Fragments** | Same `<>...</>` syntax for grouping without wrapper |
| **Render Method** | Similar signature: receives props, returns elements |

### What's Different

| Concept | React | pupt-lib | Why |
|---------|-------|----------|-----|
| **Render passes** | Multiple (re-renders on state change) | Single pass | No interactivity needed |
| **State management** | `useState`, `useReducer`, context | None | Values computed once |
| **Value computation** | `useEffect` + state | `resolve()` method | Simpler for one-shot computation |
| **Variable binding** | Manual (useState, useRef) | `name="X"` attribute | Simplified for prompt authors |
| **Property access** | Direct JavaScript | Proxy-wrapped deferred refs | Enables `{foo.bar}` before resolution |
| **Output** | Virtual DOM → Real DOM | Element tree → Text | Different target medium |
| **Lifecycle** | mount/update/unmount | resolve → render | No updates or unmount |

### The `resolve()` Method

React uses `useState` + `useEffect` for async data fetching:

```tsx
// React pattern
function GitHubUserInfo({ username }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchUser(username).then(setData);
  }, [username]);

  if (!data) return <Loading />;
  return <div>{data.name} - {data.stars} repos</div>;
}
```

pupt-lib uses a simpler `resolve()` method because there's no reactivity:

```tsx
// pupt-lib pattern
class GitHubUserInfo extends Component {
  async resolve({ username }) {
    return await fetchUser(username);
  }

  render(props, value) {
    return <Section>{value.name} - {value.stars} repos</Section>;
  }
}
```

The `resolve()` pattern is simpler because:
- No loading states (renderer waits for resolution)
- No dependency arrays (runs once)
- No state management (return value is the state)
- Separation of concerns (data vs. presentation)

### Why These Differences Exist

React is designed for **reactive UIs** where:
- The UI must stay in sync with changing data
- User interactions trigger state changes
- Components re-render when dependencies change
- The output is an interactive DOM

pupt-lib is designed for **static text generation** where:
- Values are computed once and don't change
- There's no user interaction after render
- Components produce final output in one pass
- The output is plain text

This fundamental difference (reactive vs. one-shot) allows pupt-lib to use simpler patterns:

| React Complexity | pupt-lib Simplification |
|------------------|------------------------|
| useState + useEffect for async | Single `resolve()` method |
| Dependency arrays | Not needed |
| Loading/error states | Handled automatically |
| Re-render optimization | Not needed |
| State synchronization | Not needed |

### Implications for React Developers

If you know React, you'll find pupt-lib familiar but simpler:

1. **No hooks** - Use `resolve()` instead of `useState`/`useEffect`
2. **No state management** - Just return values from `resolve()`
3. **`name="X"` magic** - Creates variables automatically (not standard JSX)
4. **Single render** - No need to think about re-renders or optimization
5. **Proxies everywhere** - Elements are wrapped, but this is transparent in usage

The trade-off: pupt-lib's patterns are simpler for the non-reactive model, but differ from React in ways that might initially surprise React developers.

## References

- [React Component Communication Patterns](https://www.pluralsight.com/resources/blog/react-communicating-between-components)
- [Material UI Button (startIcon prop)](https://mui.com/material-ui/react-button/)
- [Compound Components Pattern](https://www.smashingmagazine.com/2021/08/compound-components-react/)
- [patterns.dev - Compound Pattern](https://www.patterns.dev/react/compound-pattern/)
- [React createElement](https://react.dev/reference/react/createElement)
