# Default Component Library

[← Back to Index](00-index.md) | [Previous: JSX Runtime](04-jsx-runtime.md) | [Next: User Input](06-user-input.md)

---

## Component Overview

| Category | Components |
|----------|------------|
| Container | `Prompt`, `Fragment` |
| Structural | `Role`, `Task`, `Context`, `Constraints`, `Format`, `Audience`, `Tone`, `SuccessCriteria` |
| Examples | `Example`, `Examples` |
| Reasoning | `Steps`, `Step` |
| Data | `Data`, `Code`, `File`, `Json`, `Xml` |
| Utility | `UUID`, `Timestamp`, `DateTime`, `Hostname`, `Username`, `Cwd` |
| Control Flow | `If`, `ForEach`, `Scope` |
| Meta | `Uses` |
| Post-Execution | `PostExecution`, `ReviewFile`, `OpenUrl`, `RunCommand` |
| User Input | `Ask.Text`, `Ask.Editor`, `Ask.Select`, `Ask.MultiSelect`, `Ask.Confirm`, `Ask.File`, `Ask.Number`, `Ask.Date`, `Ask.Secret`, `Ask.Path`, `Ask.Choice`, `Ask.Rating`, `Ask.ReviewFile` |

---

## Prompt Container Component

The `<Prompt>` component marks a top-level, complete prompt. This distinguishes executable prompts from reusable fragments.

```tsx
<Prompt
  name="code-review"
  version="1.0.0"
  description="Review code for quality and security issues"
  tags={["code", "review", "security"]}
>
  <Role>You are a senior software engineer...</Role>
  <Task>Review the following code...</Task>
</Prompt>
```

### Prompt Props Interface

```typescript
export interface PromptProps {
  /** Unique identifier for this prompt */
  name: string;
  /** Semantic version */
  version?: string;
  /** Human-readable description */
  description?: string;
  /** Tags for categorization and search */
  tags?: string[];
  /** Prompt content */
  children: PuptNode;
}
```

### Prompt vs Fragment

Files that export a `<Prompt>` wrapper are complete prompts. Files that export components without the wrapper are fragments (reusable pieces):

```tsx
// fragments/common-roles.tsx - These are FRAGMENTS
export const SecurityExpert = (
  <Role expertise="security">
    You are a security expert with 15 years of experience
    in application security, penetration testing, and secure code review.
  </Role>
);

export const CodeReviewer = (
  <Role expertise="code-review">
    You are a senior software engineer specializing in code quality.
  </Role>
);
```

```tsx
// prompts/security-review.tsx - This is a PROMPT
import { SecurityExpert } from "../fragments/common-roles";

export default (
  <Prompt name="security-review" version="1.0.0" tags={["security", "code"]}>
    {SecurityExpert}
    <Task>Analyze the following code for security vulnerabilities...</Task>
    <SuccessCriteria>
      <Criterion>Identify all OWASP Top 10 vulnerabilities</Criterion>
      <Criterion>Provide severity ratings for each finding</Criterion>
    </SuccessCriteria>
  </Prompt>
);
```

---

## Core Structural Components

```tsx
// Section: Creates a labeled section with optional XML delimiters
<Section name="context" delimiter="xml">
  Content here
</Section>
// Output: <context>\nContent here\n</context>

// Role: Defines the persona/role for the AI (research: 28.4% usage, all frameworks)
<Role expertise="senior" domain="TypeScript">
  You are an expert TypeScript developer with 10 years of experience.
</Role>
// Output: <role>\nYou are an expert TypeScript developer...\n</role>

// Context: Provides background information (research: 56.2% usage)
<Context>
  The user is building a web application using React.
</Context>

// Task: Clearly states what the AI should do (research: 86.7% usage)
<Task>
  Review the provided code for security vulnerabilities.
</Task>

// Audience: Who the output is for (research: CO-STAR, RISEN frameworks)
<Audience expertise="beginner" domain="web development">
  Junior developers new to security concepts
</Audience>

// Tone: Emotional quality of output (research: CO-STAR, CRISPE frameworks)
<Tone type="friendly" formality="casual">
  Be encouraging and supportive while explaining issues.
</Tone>
// Supported types: formal, casual, friendly, professional, empathetic, assertive, educational

// SuccessCriteria: Defines what success looks like
<SuccessCriteria>
  <Criterion>Identify all SQL injection risks</Criterion>
  <Criterion>Suggest specific fixes for each issue</Criterion>
  <Criterion priority="high">Response is under 200 words</Criterion>
</SuccessCriteria>

// Constraint: Adds boundaries/rules (research: 35.7% usage)
<Constraint type="must">Always include code examples</Constraint>
<Constraint type="should">Prefer TypeScript over JavaScript</Constraint>
<Constraint type="must-not">Do not suggest deprecated APIs</Constraint>
// Types: must, should, must-not (research: positive framing preferred)

// Format: Specifies output format (research: 39.7% usage)
<Format type="json" schema={mySchema} />
<Format type="markdown" template="## Summary\n{content}" />
<Format type="code" language="typescript" />
<Format type="list" style="numbered" />
```

---

## Example Components

```tsx
// Example: Provides input/output examples (research: 19.9% usage, all vendors recommend)
<Example>
  <Example.Input>Calculate 15% of 200</Example.Input>
  <Example.Output>30</Example.Output>
</Example>

// Examples: Groups multiple examples
<Examples>
  <Example>...</Example>
  <Example>...</Example>
</Examples>
// Note: Research shows models have recency bias - order matters
```

---

## Reasoning Components

```tsx
// Steps: Encourages step-by-step thinking (research: 27.5% usage)
<Steps>
  <Step number={1}>Parse the input</Step>
  <Step number={2}>Validate the data</Step>
  <Step number={3}>Process and return</Step>
</Steps>
```

---

## Data Components

```tsx
// Data: Embeds data with optional formatting
<Data name="users" format="json">
  {JSON.stringify(users, null, 2)}
</Data>

// Code: Embeds code with language hint
<Code language="typescript" filename="example.ts">
  {sourceCode}
</Code>

// File: Embeds file contents
<File path="./config.json" />
```

---

## Utility Components

Components that generate dynamic values. These values are also available in `context.env.runtime` for components that need programmatic access.

```tsx
// UUID: Generate a unique identifier
<UUID />
// Output: 550e8400-e29b-41d4-a716-446655440000

// Timestamp: Current Unix timestamp
<Timestamp />
// Output: 1705942800

// DateTime: Current date and time (full ISO format)
<DateTime />
// Output: 2024-01-22T15:30:00.000Z

// DateTime with format
<DateTime format="YYYY-MM-DD" />
// Output: 2024-01-22

<DateTime format="HH:mm:ss" />
// Output: 15:30:00

// Date: Current date only (shorthand for DateTime format="YYYY-MM-DD")
<Date />
// Output: 2024-01-22

// Time: Current time only (shorthand for DateTime format="HH:mm:ss")
<Time />
// Output: 15:30:00

// Hostname: Current machine name
<Hostname />
// Output: dev-machine

// Username: Current user
<Username />
// Output: alice

// Cwd: Current working directory
<Cwd />
// Output: /home/alice/projects/my-app
```

### Accessing Runtime Values in Components

```typescript
class MyComponent extends Component {
  render(props, context: RenderContext) {
    const { hostname, username, cwd } = context.env.runtime;
    return `Running on ${hostname} as ${username} in ${cwd}`;
  }
}
```

---

## Control Flow Components

### Conditional Rendering with `<If>`

Uses Excel formula syntax for non-technical users:

```tsx
// Excel formula syntax
<If when='=AND(count>5, userType="admin")'>
  <Ask.Text name="adminCode" />
</If>

<If when='=NOT(ISBLANK(notes))'>
  <Section name="notes">{notes}</Section>
</If>

<If when='=OR(priority="high", status="urgent")'>
  <Constraint type="must">Respond within 1 hour</Constraint>
</If>

// JavaScript expression (for power users)
<If when={items.filter(i => i.priority > 3).length >= 2}>
  <Task>Handle high-priority items first</Task>
</If>
```

**Supported Excel Functions:**
- Logical: `AND`, `OR`, `NOT`
- Comparison: `=`, `<>`, `>`, `<`, `>=`, `<=`
- Text: `LEN`, `ISBLANK`, `CONTAINS`, `STARTSWITH`, `ENDSWITH`
- Date: `TODAY`, `NOW`

### ForEach Loop

```tsx
<ForEach items={users} as="user">
  <Section name="user">
    Name: {user.name}
    Email: {user.email}
  </Section>
</ForEach>
```

### Scope Resolution

When component names conflict between packages:

```tsx
<Prompt name="my-prompt">
  <Role>...</Role>  {/* Built-in */}

  <Scope from="@acme/prompts">
    <Header>Acme header</Header>     {/* @acme/prompts:Header */}
    <Footer>Acme footer</Footer>     {/* @acme/prompts:Footer */}
  </Scope>

  <Widget scope="@corp/utils" />     {/* One-off: scope prop */}
</Prompt>
```

---

## Uses Component

Declares module dependencies at file level:

```xml
<Uses src="@acme/components" />
<Uses src="https://example.com/utils.js" />

<Prompt name="support">
  <AcmeHeader />
  <Role>Support agent</Role>
</Prompt>
```

### Uses Props Interface

```typescript
export interface UsesProps {
  /** Module source: npm package, URL, or local path */
  src: string;
  /** Optional: make dependency optional (won't error if missing) */
  optional?: boolean;
}
```

### Source Formats

| Format | Example |
|--------|---------|
| npm package | `<Uses src="@acme/components" />` |
| npm with version | `<Uses src="@acme/components@1.0.0" />` |
| URL | `<Uses src="https://cdn.example.com/components.js" />` |
| GitHub | `<Uses src="github:acme/components#v1.0.0" />` |
| Local (CLI only) | `<Uses src="./my-components/" />` |

### When Uses is Optional

`<Uses>` is optional when:
- Only using built-in components
- Package is already installed and configured at the application level
- Running in an environment where all dependencies are pre-loaded

---

## Post-Execution Components

Actions to perform after the prompt is executed by the LLM.

### PostExecution Container

```tsx
<PostExecution>
  <ReviewFile file="./output/generated-code.ts" />
  <OpenUrl url="https://docs.example.com/api" />
  <RunCommand command="npm test" />
</PostExecution>
```

### Action Components

```tsx
// ReviewFile: Open a file for review
<ReviewFile file="./output/generated-code.ts" editor="vscode" />

// OpenUrl: Open a URL in browser
<OpenUrl url="https://docs.example.com/api" />

// RunCommand: Execute a shell command
<RunCommand command="npm test" cwd="./project" />
```

### RenderResult with Post-Execution

```typescript
const result = render(element, options);
// result.text - The rendered prompt text
// result.postExecution - Array of actions to perform after LLM execution

for (const action of result.postExecution) {
  switch (action.type) {
    case 'reviewFile':
      openInEditor(action.file);
      break;
    case 'openUrl':
      openBrowser(action.url);
      break;
    case 'runCommand':
      execSync(action.command);
      break;
  }
}
```

---

## User Input Components (Ask.*)

See [User Input](06-user-input.md) for detailed documentation.

### Inline Rendering Behavior

All `Ask.*` components serve two purposes:

1. **Input Collection Phase**: Register an input requirement (name, type, validation rules)
2. **Render Phase**: Return the collected value as inline text

This allows prompts to read naturally:

```tsx
<Task>
  Help <Ask.Text name="userName" label="What's your name?" /> with their project.
</Task>
```

During input collection, the user is asked "What's your name?". During rendering, if they answered "Alice", the prompt becomes: "Help Alice with their project."

### Same Name = Same Value

When the same `name` appears multiple times, the input is collected **once** and all instances render the same value:

```tsx
<Role>You are assisting <Ask.Text name="userName" label="User's name" />.</Role>
<Task>
  <Ask.Text name="userName" />, here's what I can help with...
</Task>
```

The user is only asked for `userName` once. Both `<Ask.Text name="userName" />` instances render the same collected value.

### Quick Reference

```tsx
// Text input - renders the entered text
<Ask.Text name="projectName" label="Project name" required />

// Multi-line editor - renders the entered text
<Ask.Editor name="description" label="Describe your project" language="markdown" />

// Single selection - renders the selected option's text content
<Ask.Select name="framework" label="Framework">
  <Option value="react" label="React (recommended)">React</Option>
  <Option value="vue" label="Vue.js">Vue</Option>
</Ask.Select>

// Multiple selection - renders comma-separated option texts
<Ask.MultiSelect name="features" label="Features to include">
  <Option value="auth" label="User Authentication">authentication</Option>
  <Option value="api" label="REST API">API routes</Option>
</Ask.MultiSelect>

// Yes/No confirmation - renders "yes" or "no" (or custom text)
<Ask.Confirm name="proceed" label="Continue with setup?" default={true} />

// Binary choice with custom labels (distinct from Confirm)
<Ask.Choice
  name="approach"
  label="Which approach should we take?"
  options={[
    { value: "refactor", label: "Refactor existing code" },
    { value: "rewrite", label: "Rewrite from scratch" }
  ]}
/>

// Numeric rating scale with optional labels
<Ask.Rating name="priority" label="How urgent is this?" min={1} max={5}>
  <Label value="1">Low</Label>
  <Label value="3">Medium</Label>
  <Label value="5">Critical</Label>
</Ask.Rating>

// File selection - renders the file path
<Ask.File name="config" label="Config file" mustExist />

// Directory selection - renders the directory path
<Ask.Path name="output" label="Output directory" mustBeDirectory />

// Number input - renders the number as text
<Ask.Number name="port" label="Port number" min={1024} max={65535} default={3000} />

// Date input - renders the date
<Ask.Date name="deadline" label="Project deadline" />

// Secret/password input - renders the value (use carefully!)
<Ask.Secret name="apiKey" label="API Key" validator="valid-api-key" />

// File with automatic post-execution review - renders the file path
<Ask.ReviewFile name="outputFile" label="Generated file path" />
```

### Option Component

For `<Ask.Select>` and `<Ask.MultiSelect>`, the `<Option>` component has:

| Attribute | Purpose |
|-----------|---------|
| `value` | Internal value stored when selected |
| `label` | What the user sees during input collection |
| Children (text) | What gets rendered inline in the prompt |

```tsx
<Ask.Select name="priority" label="Priority level">
  <Option value="high" label="High (urgent, needs immediate attention)">high priority</Option>
  <Option value="medium" label="Medium (important but not urgent)">medium priority</Option>
  <Option value="low" label="Low (when you have time)">low priority</Option>
</Ask.Select>
```

- **User sees**: "High (urgent, needs immediate attention)", "Medium...", "Low..."
- **Prompt renders**: "high priority", "medium priority", or "low priority"

### Child Elements vs JS Attributes

Both syntaxes are supported:

```tsx
// Child elements - simple, no JavaScript knowledge needed
<Ask.Select name="framework" label="Which framework?">
  <Option value="react" label="React">React</Option>
  <Option value="vue" label="Vue">Vue</Option>
</Ask.Select>

// JS attributes - for dynamic data
<Ask.Select
  name="framework"
  options={frameworks.map(f => ({ value: f.id, label: f.displayName, text: f.name }))}
/>
```

### Ask.Choice Component

`Ask.Choice` provides a binary choice with custom labels, distinct from `Ask.Confirm` which is limited to yes/no:

```tsx
<Ask.Choice
  name="approach"
  label="Which approach should we take?"
  options={[
    { value: "refactor", label: "Refactor existing code" },
    { value: "rewrite", label: "Rewrite from scratch" }
  ]}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Unique identifier for this input |
| `label` | `string` | Question shown to the user |
| `options` | `Array<{value, label}>` | Exactly two options to choose from |
| `default` | `string` | Optional default value |

**Use `Ask.Choice` when:** You need a binary choice with descriptive custom labels.
**Use `Ask.Confirm` when:** You need a simple yes/no answer.

### Ask.Rating Component

`Ask.Rating` provides a numeric scale input with optional labels for specific values:

**Simple syntax (child elements):**

```tsx
<Ask.Rating name="priority" label="How urgent is this issue?" min={1} max={5}>
  <Label value="1">Low</Label>
  <Label value="3">Medium</Label>
  <Label value="5">Critical</Label>
</Ask.Rating>
```

**Advanced syntax (JS attributes):**

```tsx
<Ask.Rating
  name="priority"
  label="How urgent is this issue?"
  min={1}
  max={5}
  labels={{ 1: "Low", 3: "Medium", 5: "Critical" }}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `name` | `string` | Unique identifier for this input |
| `label` | `string` | Question shown to the user |
| `min` | `number` | Minimum value (default: 1) |
| `max` | `number` | Maximum value (default: 5) |
| `labels` | `Record<number, string>` | Optional labels for specific values |
| `default` | `number` | Optional default value |

The `<Label>` child element maps a numeric value to a descriptive label shown in the UI.

---

## Next Steps

- [User Input](06-user-input.md) - Deep dive into input collection
- [API](07-api.md) - See how to use these components programmatically
- [Workflows](10-workflows.md) - Author your own components
