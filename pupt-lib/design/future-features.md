# Future Features

## Status

**Living Document** - Features to consider for future pupt-lib development

## Overview

This document captures programming language features and capabilities that pupt-lib may need as it evolves. These emerged from analyzing what challenges we've encountered (module loading, async components, data sharing) and studying patterns from languages developers love (Rust, Python, Gleam, Svelte) and related domains (spreadsheets, workflow engines, template systems).

pupt-lib is essentially becoming a **domain-specific language (DSL)** for prompt engineering. The features below are organized by category and roughly prioritized within each section.

---

## Prompt-Specific Features

These features are unique to the prompt engineering domain and should be high priority.

### Token/Length Awareness

Prompts have token limits. This is critical and unique to this domain. [Priompt](https://github.com/anysphere/priompt) pioneered this approach.

```tsx
<Prompt maxTokens={4000}>
  <Priority level={1}>  {/* Always included */}
    <Role>You are a code reviewer.</Role>
    <Task>Review this code.</Task>
  </Priority>

  <Priority level={2}>  {/* Include if room */}
    <Examples>...</Examples>
  </Priority>

  <Priority level={3}>  {/* First to be cut */}
    <Context>Background info...</Context>
  </Priority>
</Prompt>
```

### Conditional Inclusion Based on Budget

```tsx
<IfFits tokens={500}>
  <Examples>
    <Example>...</Example>
    <Example>...</Example>
  </Examples>
</IfFits>
```

### Truncation Strategies

When content is too long:

```tsx
<Code file={path} truncate="middle" maxLines={100} />
<Data value={json} truncate="end" maxTokens={1000} />
```

Options to consider:
- `truncate="start"` - Remove from beginning
- `truncate="middle"` - Keep start and end, remove middle
- `truncate="end"` - Remove from end (most common)
- `truncate="smart"` - Language-aware truncation (keep function signatures, etc.)

### Output Format Negotiation

Same logical prompt, different serialization per LLM:

```tsx
// Component renders differently based on context.env.llm
<StructuredOutput schema={responseSchema}>
  {/* Claude gets XML, GPT gets JSON, Gemini gets markdown */}
</StructuredOutput>
```

### Prompt Versioning / A-B Testing

```tsx
<Variant name="prompt-v2" percentage={50}>
  <NewPromptStyle />
</Variant>
<Variant name="prompt-v1" percentage={50}>
  <OldPromptStyle />
</Variant>
```

---

## Structural Features

### Named Slots / Multiple Children Regions

Vue and Web Components have this. Currently children is a single blob. Components may need multiple distinct insertion points.

```tsx
// Compound component pattern
<Card>
  <Card.Header>Title Here</Card.Header>
  <Card.Body>Main content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

// Or with explicit slots
<EmailTemplate>
  <slot name="subject">Re: Your inquiry</slot>
  <slot name="greeting">Dear {name},</slot>
  <slot name="body">...</slot>
  <slot name="signature">Best regards</slot>
</EmailTemplate>
```

### Spread Props / Rest Props

Forwarding props through wrapper components:

```tsx
<Wrapper specialProp="mine" {...restProps}>
  <Inner {...innerProps} />
</Wrapper>
```

Without this, wrapper components become maintenance nightmares as props change.

### Dynamic Component Types

Render a component whose type is determined at runtime:

```tsx
const PromptStyle = usesClaude ? ClaudeOptimized : GenericPrompt;
<PromptStyle task={task} />
```

### Component Recursion

For tree-structured data (org charts, nested comments, file trees):

```tsx
class TreeNode extends Component {
  render({ node }) {
    return (
      <>
        {node.name}
        {node.children?.map(child => (
          <TreeNode node={child} />  // Renders itself
        ))}
      </>
    );
  }
}
```

### Higher-Order Components / Component Factories

Pre-configuring components:

```tsx
// Create a specialized version
const TechnicalRole = withDefaults(Role, {
  audience: 'senior engineers',
  tone: 'precise'
});

// Use it
<TechnicalRole>You are a code reviewer.</TechnicalRole>
```

### Partial Application

Pre-fill some props, leave others open:

```tsx
// Define partially applied component
const SecurityReview = partial(CodeReview, {
  focus: 'security',
  checklist: securityChecklist
});

// Use with remaining props
<SecurityReview code={userCode} />
```

### Component Composition Operators

Combine components declaratively:

```tsx
// Sequence: render A then B
const Combined = sequence(Header, Body, Footer);

// Conditional: render A or B based on condition
const Adaptive = when(isTechnical, TechnicalPrompt, SimplePrompt);

// Wrapper: wrap inner with outer
const Wrapped = wrap(ErrorBoundary, RiskyComponent);
```

---

## Data Flow Features

### Computed/Derived Values

Values that depend on other values but aren't components:

```tsx
<Ask.Text name="firstName" />
<Ask.Text name="lastName" />
<Computed name="fullName" from={[firstName, lastName]}
          compute={(f, l) => `${f} ${l}`} />

<Greeting name={fullName} />
```

Question: Is this different from a component? Could just be a function component.

### Transformers / Pipes

Transform data as it flows:

```tsx
// Unix pipe style
<GitHubUserInfo username={username} name="user" />
<Display value={user | uppercase | truncate(50)} />

// Or explicit transformer components
<Transform input={user} with={[uppercase, truncate(50)]}>
  {(transformed) => <Display value={transformed} />}
</Transform>
```

### Collection Operations

Beyond ForEach - filter, map, reduce, sort:

```tsx
<Filter items={users} where={(u) => u.active}>
  {(activeUsers) => (
    <ForEach items={activeUsers}>
      {(user) => <UserCard user={user} />}
    </ForEach>
  )}
</Filter>

// Or more declarative
<List items={users}
      filter={(u) => u.active}
      sortBy="name"
      limit={10}>
  <UserCard />
</List>
```

### Aggregation / Reduction

Combine multiple values into one:

```tsx
<ForEach items={files} name="fileContents">
  <File path={file} />
</ForEach>

<Aggregate values={fileContents} separator="\n---\n" name="allFiles" />
```

---

## Control Flow Features

### Pattern Matching

Beyond if/else, match on data shape:

```tsx
<Match value={input}>
  <Case pattern={{ type: 'code', language: 'typescript' }}>
    <TypeScriptReview />
  </Case>
  <Case pattern={{ type: 'code', language: _ }}>
    <GenericCodeReview />
  </Case>
  <Case pattern={{ type: 'text' }}>
    <TextReview />
  </Case>
  <Default>
    <GenericReview />
  </Default>
</Match>
```

### Guards / Assertions

Validate assumptions before rendering:

```tsx
<Assert condition={code.length > 0} message="Code cannot be empty">
  <CodeReview code={code} />
</Assert>

// Or as a component prop
<CodeReview code={code} require={code.length > 0} />
```

### Early Return / Short Circuit

Stop rendering a branch early:

```tsx
<Section>
  <If when={!user}>
    <Return>Please provide a user.</Return>  {/* Stops here */}
  </If>

  {/* Only renders if user exists */}
  <UserProfile user={user} />
</Section>
```

---

## Whitespace & Text Features

### Whitespace Control

Prompts are text - whitespace matters:

```tsx
// Trim mode
<Trim>
  <Section>   {/* Extra whitespace removed */}
    Content
  </Section>
</Trim>

// Preserve mode
<Preserve>
  <Code>    {/* Indentation kept exactly */}
    function foo() {
      return bar;
    }
  </Code>
</Preserve>

// Collapse mode
<Collapse>  {/* Multiple newlines → single newline */}
  Line 1


  Line 2
</Collapse>
```

### Raw / Escape Hatch

Insert text without any processing:

```tsx
<Raw>{`
  This {{ won't be }} interpreted as a template.
  <NotAComponent> is just text.
`}</Raw>
```

### Interpolation Modes

Different escaping for different contexts:

```tsx
<Xml>
  <data>{userInput}</data>  {/* Auto XML-escapes */}
</Xml>

<Json>
  {"key": "{userInput}"}  {/* Auto JSON-escapes */}
</Json>

<Markdown>
  # {title}  {/* Auto markdown-escapes */}
</Markdown>
```

---

## Async Features

### Render Boundaries / Suspense Points

Isolate parts of the tree:

```tsx
<Prompt>
  <Role>...</Role>  {/* Renders immediately */}

  <Boundary fallback="Loading user data...">
    <GitHubUserInfo username={username} />  {/* Async */}
  </Boundary>

  <Task>...</Task>  {/* Renders immediately */}
</Prompt>
```

### Parallel vs Sequential Rendering

Control execution order:

```tsx
// Parallel (current default)
<Parallel>
  <FetchUser id={1} />
  <FetchUser id={2} />  {/* Both start immediately */}
</Parallel>

// Sequential (when order matters or rate limiting)
<Sequential>
  <FetchUser id={1} />  {/* Waits for this */}
  <FetchUser id={2} />  {/* Then starts this */}
</Sequential>
```

### Timeout / Deadline

```tsx
<Timeout ms={5000} fallback={<DefaultProfile />}>
  <GitHubUserInfo username={username} />
</Timeout>
```

### Retry / Resilience

```tsx
<Retry attempts={3} backoff="exponential">
  <FetchFromAPI endpoint={url} />
</Retry>
```

### Cancellation

Cancel in-progress async renders:

```tsx
const controller = new AbortController();
const result = await render(element, { signal: controller.signal });

// Later...
controller.abort();
```

---

## Composition Features

### Mixins / Traits

Share behavior across unrelated components:

```tsx
// Define reusable behavior
const Cacheable = {
  shouldCache: true,
  cacheKey: (props) => hash(props),
};

const Loggable = {
  beforeRender: (props) => console.log('Rendering with', props),
};

// Apply to component
class MyComponent extends Component {
  static mixins = [Cacheable, Loggable];
}
```

### Component Interfaces / Protocols

Define contracts that components must satisfy:

```tsx
interface Reviewable {
  getReviewTarget(): string;
  getReviewCriteria(): string[];
}

// TypeScript enforces implementation
class CodeReview extends Component implements Reviewable {
  getReviewTarget() { return this.props.code; }
  getReviewCriteria() { return ['correctness', 'style', 'security']; }
}
```

---

## Error Handling & Debugging

### Error Boundaries

Graceful degradation when one component fails:

```tsx
<ErrorBoundary fallback={<DefaultContent />}>
  <RiskyAsyncComponent />
</ErrorBoundary>
```

### Exhaustive Error Messages

Following Rust's philosophy - errors should help users fix problems:

```tsx
// Bad: "Invalid prop"
// Good: "Component 'GitHubUserInfo' received invalid prop 'username':
//        expected string, got undefined.
//        Did you mean to use <Ask.Text name="username" /> first?"
```

### Component Introspection

Query component capabilities:

```tsx
// What inputs does this prompt need?
const requirements = prompt.getInputRequirements();
// → [{ name: 'username', type: 'text', required: true }, ...]

// What's the dependency graph?
const graph = prompt.getDependencyGraph();
// → { nodes: [...], edges: [...] }

// What components are used?
const components = prompt.getComponentTree();
```

### Debug Mode

Show what's happening during render:

```tsx
const result = await render(element, {
  debug: true,
  onResolve: (name, value) => console.log(`Resolved ${name}:`, value),
  onRender: (component, output) => console.log(`Rendered ${component}:`, output),
});
```

### Debug Markers

Leave breadcrumbs in output during development:

```tsx
<Debug label="user-section">  {/* Adds <!-- user-section --> in dev */}
  <UserInfo />
</Debug>
```

### Validation Messages

Compile-time and runtime validation with clear messages:

```tsx
// Schema validation
static schema = z.object({
  username: z.string().min(1, "Username cannot be empty"),
  age: z.number().min(0, "Age must be positive"),
});

// Runtime assertions
<Assert
  condition={items.length > 0}
  message="Cannot render empty list - provide at least one item"
>
  <ForEach items={items}>...</ForEach>
</Assert>
```

---

## Meta Features

### Annotations / Metadata

Attach data for tooling, not rendering:

```tsx
<Component
  meta={{
    author: 'team-ai',
    reviewedAt: '2024-01-15',
    estimatedTokens: 500,
    deprecated: true,
    since: '2.0'
  }}
>
```

### Caching / Memoization

Don't re-compute if inputs haven't changed:

```tsx
<Memoize key={userId}>
  <ExpensiveFetch userId={userId} />
</Memoize>

// Or at component level
class ExpensiveFetch extends Component {
  static memoize = true;
  static cacheKey = (props) => props.userId;
}
```

### Lazy Evaluation

Only render expensive components if actually needed:

```tsx
<Lazy>
  <ExpensiveComponent />  {/* Only renders if parent actually uses it */}
</Lazy>
```

### Streaming / Progressive Output

Output text as it becomes available:

```tsx
const stream = renderStream(element);
for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

---

## Tooling Features

### Linting / Formatting

Enforce consistent prompt structure:

```bash
pupt lint ./prompts/
pupt format ./prompts/ --write
```

Rules to consider:
- Required sections (Role, Task)
- Section ordering
- Token budget warnings
- Unused variables
- Accessibility (clear language)

### Testing Utilities

Test prompts in isolation:

```tsx
import { renderTest, mockInput } from 'pupt-lib/testing';

test('code review prompt', async () => {
  const result = await renderTest(
    <CodeReviewPrompt />,
    {
      inputs: mockInput({ code: 'function foo() {}' }),
      env: mockEnv('claude'),
    }
  );

  expect(result.text).toContain('code reviewer');
  expect(result.tokens).toBeLessThan(4000);
});
```

### Visual Editor

For non-technical users - GUI editing of prompts. This would be a separate tool that generates `.prompt` files.

### Prompt Debugging / DevTools

Step through render, inspect values:

```tsx
// Browser-based inspector showing:
// - Component tree
// - Props at each node
// - Resolved values
// - Dependency graph visualization
// - Token usage breakdown
```

---

## Inspiration Sources

### Languages to Study

| Language | Key Learnings |
|----------|---------------|
| **Rust** | Error handling as first-class, helpful compiler messages, exhaustive matching |
| **Python** | Philosophy of simplicity, "one obvious way", readability |
| **Svelte** | Compiler-based transformation, minimal syntax, "love letter to web dev" |
| **Vue 3** | Composition API, reactive primitives, composables |
| **Gleam** | Learnable in an afternoon, excellent tooling, welcoming community |

### Domains to Study

| Domain | Key Learnings |
|--------|---------------|
| **Spreadsheets** | Reactive by default, transparent state, declarative relationships |
| **Workflow engines** | DAG execution, async handling, error recovery, sagas |
| **Template engines** | Scoping rules, inheritance, macros, includes |
| **Infrastructure as Code** | Declarative graphs from imperative authoring |
| **No-code tools** | Accessibility, balance of simplicity and power |
| **GraphQL** | Schema as documentation, introspection, progressive enhancement |

### References

- [Stack Overflow Developer Survey 2024/2025](https://survey.stackoverflow.co/2025/technology)
- [Why Rust is Most Admired](https://github.blog/developer-skills/programming-languages-and-frameworks/why-rust-is-the-most-admired-language-among-developers/)
- [The Zen of Python (PEP 20)](https://peps.python.org/pep-0020/)
- [Priompt - Priority-based Prompting](https://github.com/anysphere/priompt)
- [Vue Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Svelte Compiler](https://dev.to/joshnuss/svelte-compiler-under-the-hood-4j20)
- [Martin Fowler's DSL Guide](https://martinfowler.com/dsl.html)
- [Temporal Workflow Patterns](https://docs.temporal.io/evaluate/use-cases-design-patterns)
- [Jinja Template Documentation](https://jinja.palletsprojects.com/en/stable/templates/)

---

## Priority Recommendations

### High Priority (Unique to Prompts)

1. **Token/Length Awareness + Priority** - Critical for real-world prompt engineering
2. **Truncation Strategies** - Content often exceeds limits
3. **Whitespace Control** - Text output means whitespace semantics matter

### Medium Priority (Structural)

4. **Named Slots** - Complex prompts need multiple insertion points
5. **Pattern Matching** - Prompts often branch based on input type
6. **Collection Operations** - Filter/map/sort for data-driven prompts
7. **Spread Props** - Essential for wrapper components

### Lower Priority (Nice to Have)

8. **Component Factories** - Useful but can be done manually
9. **Mixins/Traits** - Useful for large codebases
10. **Visual Editor** - Significant effort, separate project

---

## Open Questions

1. **Should computed values be components or functions?** - Leaning toward just using function components
2. **How granular should whitespace control be?** - Per-component? Per-section? Global?
3. **Should we support streaming output?** - Depends on use cases
4. **How do we handle token counting across different LLMs?** - Each has different tokenizers
5. **Should priority/truncation be automatic or explicit?** - Priompt is explicit, but auto might be more user-friendly
