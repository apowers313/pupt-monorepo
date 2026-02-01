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

## Research: Prior Art and Inspiration

### React Component Communication

React uses several patterns for component communication ([Pluralsight](https://www.pluralsight.com/resources/blog/react-communicating-between-components), [Medium](https://medium.com/@aristela.marku/communication-between-components-in-reactjs-5b86d5bb4321)):

- **Props** - Parent passes data down to children (one-way data flow)
- **Callback functions** - Child notifies parent via function props
- **Context API** - Global data shared across component tree without prop drilling
- **Compound components** - Related components share implicit state (like `<Select>` and `<Option>`)

**Relevance to pupt-lib**: Props and compound components are most applicable. Context is already used for `inputs`. Callbacks don't apply since pupt-lib has no interactivity.

### Angular Template Reference Variables

Angular provides template reference variables using `#var` syntax ([Angular Docs](https://angular.dev/guide/templates/variables), [Ultimate Courses](https://ultimatecourses.com/blog/angular-template-reference-variables)):

```html
<input #username placeholder="Enter username">
<button (click)="greet(username.value)">Greet</button>

<app-child #childComp></app-child>
<button (click)="childComp.doSomething()">Call Child Method</button>
```

Key characteristics:
- `#name` declares a variable referencing that element/component
- Variable scope is the entire template
- Can access component instance properties and methods
- `#var="exportAsName"` exports a specific directive/aspect

**Relevance to pupt-lib**: The `#name` / `name="x"` pattern for declaring named references is directly applicable. The concept of accessing component outputs via the reference is useful.

### Svelte Reactive Declarations

Svelte uses the `$:` label for reactive declarations ([Svelte Tutorial](https://learn.svelte.dev/tutorial/reactive-declarations), [DigitalOcean](https://www.digitalocean.com/community/tutorials/svelte-reactivity-intro)):

```svelte
<script>
  let firstName = 'John';
  let lastName = 'Doe';
  $: fullName = `${firstName} ${lastName}`;  // Re-runs when dependencies change
</script>
```

Key characteristics:
- Automatic dependency tracking
- Declarations re-evaluate when dependencies change
- Uses valid JavaScript syntax (labels) with new semantics

**Relevance to pupt-lib**: The concept of derived/computed values that automatically resolve based on dependencies is relevant. However, pupt-lib doesn't have reactivity (single render pass), so we only need initial resolution, not updates.

### Dataflow Programming

Dataflow programming models programs as directed graphs where nodes have inputs and outputs connected by wires ([Wikipedia](https://en.wikipedia.org/wiki/Dataflow_programming), [Devopedia](https://devopedia.org/dataflow-programming)):

- Nodes represent operations with explicit inputs and outputs
- Edges/wires connect outputs to inputs
- Operations execute when all inputs are available
- Inherently parallel - independent nodes can run concurrently

Examples: LabVIEW, Node-RED, Max/MSP, Unreal Blueprints

**Relevance to pupt-lib**: The mental model of components having named outputs that can be wired to other components' inputs is directly applicable. The "execute when inputs are ready" model maps well to async resolution.

### GraphQL Fragments

GraphQL uses named fragments for composition and reuse ([Apollo Docs](https://www.apollographql.com/docs/react/data/fragments), [GraphQL.org](https://graphql.org/learn/queries/)):

```graphql
fragment UserFields on User {
  id
  name
  email
}

query {
  user(id: "123") {
    ...UserFields
    posts {
      title
    }
  }
}
```

Key characteristics:
- Fragments define reusable field sets
- `...fragmentName` spreads a fragment's fields
- Fragments can access query variables
- Collocating fragments with components is a best practice (Relay)

**Relevance to pupt-lib**: The pattern of named, reusable pieces that get "spread" into a larger structure is applicable. The collocation pattern (fragments defined alongside components) is a good practice.

### Jinja2 Template Scoping

Jinja2 has specific scoping rules for macros, includes, and inheritance ([Jinja Docs](https://jinja.palletsprojects.com/en/stable/templates/), [TTL255](https://ttl255.com/jinja2-tutorial-part-5-macros/)):

- Macros have local scope - variables set inside don't leak out
- Blocks in child templates don't access outer scope by default (can opt-in with `scoped`)
- Imports are cached and don't access current template variables by default
- Includes inherit the current context

**Relevance to pupt-lib**: Understanding scoping tradeoffs is important. We need to decide if named values are document-scoped (simpler) or tree-scoped (more encapsulated).

## Design Options Considered

### Option 1: Auto-resolve Element Props

Any PuptElement passed as a prop is automatically rendered to its string value.

```tsx
<GitHubUserInfo username={<Ask.Text name="username" default="octocat" />} />
// GitHubUserInfo receives username="octocat"
```

**Pros:**
- Pure JSX syntax, no new concepts
- `.prompt` friendly
- Preserves component encapsulation

**Cons:**
- Implicit behavior - might surprise developers expecting React semantics
- Only works for string values, not structured data

### Option 2: Named References with `$` Binding

Use `$name` syntax to reference named values.

```tsx
<Ask.Text name="username" default="octocat" />
<GitHubUserInfo username="$username" />
```

**Pros:**
- Explicit binding
- Decoupled - components don't need to be nested
- `.prompt` friendly

**Cons:**
- New syntax to learn
- String-based, loses type information
- Similar to but different from shell/template variable syntax

### Option 3: Scoped Providers

Explicit scope boundaries with provider/consumer pattern.

```tsx
<Scope username={<Ask.Text default="octocat" />}>
  <GitHubUserInfo username={<Use name="username" />} />
</Scope>
```

**Pros:**
- Familiar React Context pattern
- Explicit scope boundaries
- Supports structured data

**Cons:**
- Verbose
- Extra nesting

### Option 4: Render Props

Pass functions that receive resolved values.

```tsx
<Ask.Text name="username" default="octocat">
  {(username) => <GitHubUserInfo username={username} />}
</Ask.Text>
```

**Pros:**
- Standard React pattern
- Explicit data flow
- Type-safe

**Cons:**
- **Requires JavaScript functions - not `.prompt` friendly**
- Inverted nesting structure

### Option 5: Named Variables (Proposed)

Components declare named outputs via `name` attribute. Those names become referenceable values.

```tsx
<Ask.Text name="myAnswer" default="octocat" />
<Foo fooProp={myAnswer} />
```

Components can also expose named exports:

```tsx
<Foo name="myFoo" />
<Bar barProp={myFoo.customReturn} />
```

**Pros:**
- Clean, intuitive syntax
- Feels like regular variable references
- `.prompt` friendly
- Supports structured data via exports
- Similar to Angular template variables

**Cons:**
- Requires preprocessor transformation in `.prompt` files
- Need to define scoping rules
- Need to handle forward references

## Proposed Design: Named Variables

### Core Concept

Components can declare a name, making their output available as a named variable:

```tsx
<Ask.Text name="username" default="octocat" />
<GitHubUserInfo username={username} />
```

**Mental model:**
- `name="X"` declares a variable `X` whose value is the component's rendered output
- `{X}` anywhere in the prompt references that value
- `{X.property}` accesses a named export from component `X`

### Syntax

#### Declaring a Named Output

```tsx
// The 'name' attribute declares a variable
<Ask.Text name="username" label="Enter username" default="octocat" />
```

#### Referencing a Value

```tsx
// Reference by name - gets the component's rendered text output
<GitHubUserInfo username={username} />
```

#### Component Exports (Structured Data)

Components can export structured data beyond their text output:

```tsx
// UserFetcher exports structured data
<UserFetcher userId="123" name="user" />

// Access specific exports
<Display name={user.name} email={user.email} />
```

Component implementation:

```tsx
class UserFetcher extends Component {
  static schema = z.object({ userId: z.string() });
  static exports = ['name', 'email', 'avatar'];  // Declare available exports

  async render({ userId }, context) {
    const data = await fetchUser(userId);

    // Provide exports
    context.provide('name', data.name);
    context.provide('email', data.email);
    context.provide('avatar', data.avatarUrl);

    // Return text representation (optional)
    return `User: ${data.name}`;
  }
}
```

### Transformation (for `.prompt` files)

The preprocessor transforms bare identifiers that match declared names:

```tsx
// User writes:
<Ask.Text name="username" default="octocat" />
<GitHubUserInfo username={username} />

// Transformed to:
<Ask.Text name="username" default="octocat" />
<GitHubUserInfo username={<Ref name="username" />} />
```

The `<Ref>` component resolves the reference at render time.

### Resolution Order

The renderer builds a dependency graph and resolves in topological order:

1. **Discovery phase**: Walk the tree, find all `name="X"` declarations and `{X}` references
2. **Dependency analysis**: Build a directed graph of what depends on what
3. **Resolution phase**: Resolve values in topological order (leaves first)
4. **Render phase**: Render components with resolved prop values

This naturally handles:
- Async components (await resolution before dependents render)
- Mixed sync/async (resolved in correct order)
- Parallel resolution (independent branches resolve concurrently)

### Error Handling

- **Undefined reference**: Error if `{X}` is used but `name="X"` is never declared
- **Circular dependency**: Error if A depends on B and B depends on A
- **Duplicate names**: Warning or error if same name declared twice

## Scoping Model: Component-Boundary Scoping

After considering the tradeoffs between global scope (simple but collision-prone) and tree scope (encapsulated but confusing), we adopt **component-boundary scoping** - similar to how JavaScript modules work.

### Core Principles

1. **Each `.prompt` file has its own scope** - Names declared at the top level are local to that file
2. **Components encapsulate their internals** - Names inside a component don't leak out
3. **Explicit exports via `name` attribute** - Components expose their output through naming
4. **Dot notation for exports** - Access component exports via `{componentName.exportName}`

### How It Works

**Inside a component - names are private:**
```tsx
// GitHubUserInfo.prompt (component definition)
<Ask.Text name="username" />           // Private to this component
<Fetch url={`/users/${username}`} />   // Can reference it internally
// "username" does NOT leak out to consumers
```

**Exposing values - via `name` attribute:**
```tsx
// Consumer prompt
<GitHubUserInfo name="github" />       // "github" is now a reference
<Display value={github} />             // Gets rendered text output
<Display value={github.stars} />       // Gets named export (if defined)
```

**Simple prompts - just works:**
```tsx
// When there's no component boundary, top-level names are accessible
<Ask.Text name="username" />
<Foo prop={username} />                // ✓ Works, same scope
```

### Mental Model

| Concept | JavaScript Analogy |
|---------|-------------------|
| `.prompt` file | Module |
| Names inside component | Private variables |
| Component with `name="X"` | Named export |
| `{X}` reference | Import/usage |
| `{X.property}` | Accessing export's property |

### Progressive Complexity

**Level 1 (Beginner):** Simple prompts with flat scope
```tsx
<Ask.Text name="username" label="Your name" />
<Greeting name={username} />
```
*Mental model: "`name` creates a variable, `{variable}` uses it."*

**Level 2 (Intermediate):** Using components with exports
```tsx
<GitHubUserInfo username="octocat" name="info" />
<Bar value={info.stars} />
```

**Level 3 (Advanced):** Building reusable components with encapsulation
```tsx
// Component authors use scoped names internally
// Only exports are visible to consumers
```

### Benefits

- **No conflicts across imports** - Each component's internals are isolated
- **Simple for simple cases** - Beginners don't hit scoping issues
- **Familiar pattern** - Works like JavaScript modules
- **Clear ownership** - Always know where a name came from (`{componentName.export}`)

## Forward References

Forward references ARE supported:

```tsx
<Foo prop={username} />        // Reference before declaration
<Ask.Text name="username" />   // Declaration comes later
```

### Why This Works

The renderer uses a **dependency graph** to determine resolution order, not source order:

1. **Discovery pass**: Walk tree, collect all `name="X"` declarations and `{X}` references
2. **Build graph**: Create edges from references to declarations
3. **Topological sort**: Determine resolution order
4. **Resolution pass**: Resolve values in dependency order

This matches the **dataflow programming model** where execution order follows data dependencies, not textual order.

### Error Cases

- **Undefined reference**: `{X}` used but `name="X"` never declared → Error with suggestion
- **Circular dependency**: A needs B, B needs A → Error showing the cycle
- **Duplicate names in same scope**: Warning (last declaration wins) or error

## Primary Output vs Named Exports

### The Rule: Primary output is ALWAYS text

pupt-lib generates **text**. To avoid ambiguity:

- `{componentName}` → Always the rendered text output
- `{componentName.exportName}` → Always a named export (never object property access)

### Component Implementation

```tsx
class GitHubUserInfo extends Component {
  static schema = z.object({ username: z.string() });
  static exports = ['name', 'stars', 'avatar', 'raw'];  // Declare available exports

  async render({ username }, context) {
    const data = await fetchUser(username);

    // Explicit exports - consumers access via {github.exportName}
    context.export('name', data.name);
    context.export('stars', data.public_repos);
    context.export('avatar', data.avatar_url);
    context.export('raw', data);  // Full object if consumers need it

    // Return is always the TEXT output
    return `${data.name} - ${data.public_repos} public repos`;
  }
}
```

### Usage

```tsx
<GitHubUserInfo username="octocat" name="github" />

{github}              // "octocat - 42 public repos" (always text)
{github.name}         // "octocat" (named export)
{github.stars}        // 42 (named export)
{github.raw}          // { name: "octocat", ... } (full object export)
{github.raw.email}    // Nested access on exported object
```

### Why This Design

1. **No ambiguity** - Clear distinction between text output and exports
2. **Consistent with pupt-lib's purpose** - Everything is ultimately text
3. **Component author controls API** - Exports are explicitly declared
4. **Flexible** - Want the raw object? Export it as `raw` or `data`

## Naming Conflicts

### Component Names vs Variable Names

JSX syntax naturally distinguishes:
- `<Section>` - Always a component (capitalized, JSX element)
- `{Section}` - Always a variable reference (inside braces)

```tsx
<Ask.Text name="Section" />    // Creates variable "Section"
<Section>                      // Uses Section component
  {Section}                    // Uses variable "Section"
</Section>
```

**Recommendation**: Allow this but emit a warning when a variable shadows a component name.

### Duplicate Names in Same Scope

```tsx
<Ask.Text name="username" />
<Ask.Text name="username" />   // Duplicate!
```

**Behavior**: Error - "Duplicate name 'username' in scope. Names must be unique."

## Integration with Input Collection

The `createInputIterator` is extended to:

1. **Discover Ask components anywhere** - Including in props, not just children
2. **Build dependency graph** - Understand resolution order
3. **Collect in dependency order** - Ensure inputs are collected before dependents need them

```tsx
<GitHubUserInfo username={<Ask.Text name="username" default="octocat" />} />
```

The iterator discovers the Ask.Text even though it's in a prop position.

## Examples

### Basic Input to Component

```tsx
<Prompt name="github-profile">
  <Ask.Text name="username" label="GitHub username" default="octocat" />

  <Task>Write a professional summary for this GitHub user.</Task>

  <Context>
    <GitHubUserInfo username={username} />
  </Context>
</Prompt>
```

### Using Component Exports

```tsx
<Prompt name="github-profile-detailed">
  <Ask.Text name="username" label="GitHub username" default="octocat" />

  <!-- GitHubUserInfo fetches data and exposes exports -->
  <GitHubUserInfo username={username} name="github" />

  <Task>Write a professional summary for this GitHub user.</Task>

  <Context>
    <Data label="User Profile">{github}</Data>           <!-- Text output -->
    <Data label="Name">{github.name}</Data>              <!-- Export -->
    <Data label="Public Repos">{github.stars}</Data>     <!-- Export -->
  </Context>
</Prompt>
```

### Forward References (Order Doesn't Matter)

```tsx
<Prompt name="flexible-ordering">
  <!-- Reference before declaration - works because dependency graph resolves order -->
  <GitHubUserInfo username={username} name="github" />

  <Context>
    <Data label="Profile">{github}</Data>
  </Context>

  <!-- Declaration can come after usage -->
  <Ask.Text name="username" label="GitHub username" default="octocat" />

  <Task>Summarize this user's GitHub activity.</Task>
</Prompt>
```

### Chained Components with Exports

```tsx
<Prompt name="repo-analysis">
  <Ask.Text name="repoUrl" label="Repository URL" />

  <!-- RepoFetcher exposes structured data via exports -->
  <RepoFetcher url={repoUrl} name="repo" />

  <Context>
    <Data label="Repository">{repo}</Data>               <!-- Text summary -->
    <Data label="Primary Language">{repo.language}</Data>
    <Data label="Stars">{repo.stars}</Data>
    <Data label="Open Issues">{repo.issues}</Data>
  </Context>

  <Task>Analyze this repository's code quality and suggest improvements.</Task>
</Prompt>
```

### Nested Export Access

```tsx
<Prompt name="detailed-analysis">
  <Ask.Text name="username" default="octocat" />

  <GitHubUserInfo username={username} name="github" />

  <Context>
    <!-- Access the raw object export for full data -->
    <Json data={github.raw} />

    <!-- Or access nested properties on exported objects -->
    <Data label="Email">{github.raw.email}</Data>
    <Data label="Company">{github.raw.company}</Data>
  </Context>
</Prompt>
```

### Component Encapsulation (No Leaking)

```tsx
// ProfileCard.prompt - a reusable component
// Internal names like "avatar" are private
<Fetch url={`/users/${username}/avatar`} name="avatar" />
<Fetch url={`/users/${username}/stats`} name="stats" />

<Card>
  <Image src={avatar} />
  <Text>{stats.followers} followers</Text>
</Card>
```

```tsx
// Consumer prompt - cannot access ProfileCard's internal names
<Prompt name="user-page">
  <ProfileCard username="octocat" name="card" />

  {card}                  <!-- ✓ Gets ProfileCard's rendered output -->
  {card.someExport}       <!-- ✓ If ProfileCard exports it -->
  {avatar}                <!-- ✗ Error: "avatar" is not defined -->
  {stats}                 <!-- ✗ Error: "stats" is not defined -->
</Prompt>
```

### Multiple Instances with Unique Names

```tsx
<Prompt name="compare-users">
  <Ask.Text name="user1" label="First GitHub username" />
  <Ask.Text name="user2" label="Second GitHub username" />

  <!-- Same component, different instances with different names -->
  <GitHubUserInfo username={user1} name="profile1" />
  <GitHubUserInfo username={user2} name="profile2" />

  <Task>
    Compare these two GitHub profiles and determine who would be
    a better fit for a senior frontend role.
  </Task>

  <Context>
    <Section title="Candidate 1">
      {profile1}
      <Data label="Repos">{profile1.stars}</Data>
    </Section>
    <Section title="Candidate 2">
      {profile2}
      <Data label="Repos">{profile2.stars}</Data>
    </Section>
  </Context>
</Prompt>
```

### Conditional Based on Input

```tsx
<Prompt name="code-review">
  <Ask.Select name="language" label="Programming language">
    <Ask.Option value="typescript">TypeScript</Ask.Option>
    <Ask.Option value="python">Python</Ask.Option>
    <Ask.Option value="rust">Rust</Ask.Option>
  </Ask.Select>

  <Role>You are an expert {language} developer.</Role>

  <If condition={language === "typescript"}>
    <Constraint>Follow the official TypeScript style guide.</Constraint>
  </If>
</Prompt>
```

## Implementation Plan

### Phase 1: Auto-resolve element props (addresses issue #10)
**Goal**: Quick win - elements in props render to their text value

- Modify `renderComponentWithValidation` to detect PuptElement props
- Render element props before calling component's render method
- Minimal change, immediate value for users

**Estimated effort**: Small

### Phase 2: Dependency graph infrastructure
**Goal**: Enable forward references and proper resolution ordering

- Add discovery pass to collect all `name="X"` declarations
- Add pass to collect all `{X}` references (including in props)
- Build directed dependency graph
- Implement topological sort for resolution order
- Detect and report cycles with clear error messages
- Refactor renderer for two-pass approach (discovery → resolution)

**Estimated effort**: Medium

### Phase 3: Named variables with `<Ref>` component
**Goal**: Support the `{variableName}` syntax in `.prompt` files

- Implement `<Ref name="X" />` component that looks up values
- Update preprocessor to transform bare identifiers to `<Ref>` elements
- Handle undefined reference errors with helpful messages
- Add duplicate name detection and warnings

**Estimated effort**: Medium

### Phase 4: Component exports
**Goal**: Support structured data sharing between components

- Add `context.export(name, value)` API
- Add `static exports = [...]` declaration to Component class
- Support dot notation `{component.exportName}` for accessing exports
- Update `<Ref>` to handle dot notation paths
- Document the "primary output is always text" rule

**Estimated effort**: Medium

### Phase 5: Component-boundary scoping
**Goal**: Proper encapsulation for reusable components

- Implement scope isolation per `.prompt` file / component definition
- Internal names don't leak out of component boundaries
- Only `name` attribute on component exposes values
- Update discovery pass to respect scope boundaries

**Estimated effort**: Medium-Large

### Phase 6: Polish and edge cases
**Goal**: Production-ready implementation

- Comprehensive error messages
- Warning when variable shadows component name
- Integration with input collection (discover Ask in props)
- Performance optimization for large dependency graphs
- Documentation and examples

**Estimated effort**: Medium

## References

- [React Component Communication Patterns](https://www.pluralsight.com/resources/blog/react-communicating-between-components)
- [Angular Template Reference Variables](https://angular.dev/guide/templates/variables)
- [Svelte Reactive Declarations](https://learn.svelte.dev/tutorial/reactive-declarations)
- [Dataflow Programming](https://en.wikipedia.org/wiki/Dataflow_programming)
- [GraphQL Fragments](https://www.apollographql.com/docs/react/data/fragments)
- [Jinja2 Template Scoping](https://jinja.palletsprojects.com/en/stable/templates/)
