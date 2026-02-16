# Simple Prompt Format

[← Back to Index](00-index.md) | [Previous: Module Loading](08-module-loading.md) | [Next: Workflows](10-workflows.md)

---

## Overview

`.prompt` files are **identical to `.tsx` files** in syntax and capabilities. They use standard JSX syntax, support full JavaScript expressions, and have access to all pupt-lib features.

The only difference is **when** they are transformed:
- `.tsx` files are transformed at **build time** (requires build tooling)
- `.prompt` files are transformed at **runtime** (no build step needed)

This makes `.prompt` files ideal for:
- Quick iteration without rebuilding
- Sharing with users who don't have build tooling set up
- Rapid prototyping

## Non-Technical User Friendliness

pupt-lib is designed so that **non-technical users can write effective prompts without learning JavaScript**. This is achieved through intuitive component design, not by limiting the syntax.

### Inline Input Components

The `<Ask.*>` components render their collected values inline, making prompts read naturally:

```tsx
// greeting.prompt
<Prompt name="greeting">
  <Task>
    Say hello to <Ask.Text name="userName" label="What's your name?" />
    and help them with <Ask.Text name="topic" label="What do you need help with?" />.
  </Task>
</Prompt>
```

This reads naturally: "Say hello to [user's name] and help them with [their topic]."

During input collection, the user is asked:
1. "What's your name?"
2. "What do you need help with?"

During rendering, the collected values are inserted inline.

### Reusing Input Values

When the same `name` appears multiple times, the value is collected once and reused:

```tsx
<Prompt name="personalized">
  <Role>You are helping <Ask.Text name="userName" label="User's name" />.</Role>
  <Task>
    <Ask.Text name="userName" />, here's what I can do for you...
  </Task>
</Prompt>
```

The user is only asked for `userName` once. Both instances render the same collected value.

### Excel Formula Conditionals

For conditional logic, use the `<If>` component with Excel formula syntax:

```tsx
<Prompt name="support">
  <Ask.Select name="userType" label="User type">
    <Option value="admin" label="Administrator">admin user</Option>
    <Option value="regular" label="Regular User">regular user</Option>
  </Ask.Select>

  <If when='=userType="admin"'>
    <Context>This user has administrative privileges.</Context>
  </If>

  <Task>Help the <Ask.Select name="userType" /> with their request.</Task>
</Prompt>
```

Supported Excel functions:
- Logical: `AND`, `OR`, `NOT`
- Comparison: `=`, `<>`, `>`, `<`, `>=`, `<=`
- Text: `LEN`, `ISBLANK`

### Select Options

For `<Ask.Select>` and `<Ask.MultiSelect>`, the `<Option>` component has:
- `value` attribute: The internal value stored when selected
- `label` attribute: What the user sees during input collection
- Children (text): What gets rendered inline in the prompt

```tsx
<Ask.Select name="priority" label="Priority level">
  <Option value="high" label="High (urgent, needs immediate attention)">high priority</Option>
  <Option value="medium" label="Medium (important but not urgent)">medium priority</Option>
  <Option value="low" label="Low (when you have time)">low priority</Option>
</Ask.Select>
```

- User sees: "High (urgent, needs immediate attention)", etc.
- Prompt renders: "high priority", "medium priority", or "low priority"

---

## Loading Dependencies

Use `<Uses>` to declare module dependencies:

```tsx
// support.prompt
<Uses src="@acme/components" />

<Prompt name="support" description="Customer support response">
  <AcmeHeader title="Support Request" />

  <Role>You are a helpful support agent</Role>
  <Task>
    Help the customer with: <Ask.Text name="issue" label="What's the issue?" />
  </Task>
</Prompt>
```

### Source Formats

| Format | Example |
|--------|---------|
| npm package | `<Uses src="@acme/components" />` |
| npm with version | `<Uses src="@acme/components@1.0.0" />` |
| URL | `<Uses src="https://cdn.example.com/components.js" />` |
| GitHub | `<Uses src="github:acme/components#v1.0.0" />` |
| Local (CLI only) | `<Uses src="./my-components/" />` |

---

## Full JavaScript Access

Since `.prompt` files are just `.tsx` files, technical users have full access to JavaScript:

```tsx
// advanced.prompt
<Prompt name="code-review">
  <Ask.Select name="files" label="Files to review" multiple>
    {repoFiles.map(file => (
      <Option key={file.path} value={file.path} label={file.name}>
        {file.path}
      </Option>
    ))}
  </Ask.Select>

  <Task>
    Review the following files:
    {selectedFiles.map(f => <Code key={f} file={f} />)}
  </Task>

  {config.strictMode && (
    <Constraint type="must">Follow all linting rules strictly</Constraint>
  )}
</Prompt>
```

---

## Comparison: .prompt vs .tsx

| Aspect | `.prompt` | `.tsx` |
|--------|-----------|--------|
| Syntax | JSX (identical) | JSX (identical) |
| JavaScript | Full support | Full support |
| Transform timing | Runtime | Build time |
| Build tooling required | No | Yes |
| IDE TypeScript support | Limited | Full |
| Best for | Quick iteration, sharing | Production, type safety |

---

## Example: Complete .prompt File

```tsx
// code-review.prompt
<Uses src="@company/components" />

<Prompt
  name="code-review"
  description="Review code for quality and security"
  tags={["code", "review", "security"]}
>
  <CompanyHeader title="Code Review Request" />

  <Ask.Select name="reviewType" label="Type of review">
    <Option value="security" label="Security Review">security</Option>
    <Option value="quality" label="Code Quality Review">code quality</Option>
    <Option value="performance" label="Performance Review">performance</Option>
  </Ask.Select>

  <Ask.Editor name="code" label="Paste your code" language="auto" required />

  <Role>
    You are a senior software engineer specializing in
    <Ask.Select name="reviewType" /> reviews.
  </Role>

  <Context>
    The developer has submitted code for a <Ask.Select name="reviewType" /> review.
  </Context>

  <Task>
    Review the following code and provide detailed feedback:

    <Code><Ask.Editor name="code" /></Code>
  </Task>

  <If when='=reviewType="security"'>
    <SuccessCriteria>
      <Criterion>Check for OWASP Top 10 vulnerabilities</Criterion>
      <Criterion>Identify injection risks</Criterion>
      <Criterion>Review authentication/authorization</Criterion>
    </SuccessCriteria>
  </If>

  <If when='=reviewType="quality"'>
    <SuccessCriteria>
      <Criterion>Check code readability</Criterion>
      <Criterion>Identify code smells</Criterion>
      <Criterion>Suggest refactoring opportunities</Criterion>
    </SuccessCriteria>
  </If>

  <Format type="markdown" />
</Prompt>
```

---

## Next Steps

- [Workflows](10-workflows.md) - Publish prompts and components
- [Components](05-components.md) - Available built-in components
- [User Input](06-user-input.md) - Input component details
