# Simple Prompt Format

[← Back to Index](00-index.md) | [Previous: Module Loading](08-module-loading.md) | [Next: Workflows](10-workflows.md)

---

For non-technical users, pupt-lib supports a simple `.prompt` file format that requires no build step.

## File Format

Simple prompts are XML-like files with no JavaScript:

```xml
<!-- greeting.prompt -->
<Prompt name="greeting" description="A friendly greeting">
  Say hello to the user
</Prompt>
```

### With Dependencies

```xml
<!-- support.prompt -->
<Uses src="@acme/components" />

<Prompt name="support" description="Customer support response" tags="support, customer-service">
  <AcmeHeader title="Support Request" />

  <Ask.Text name="issue" label="What's the customer's issue?" />

  <Role>You are a helpful support agent</Role>
  <Task>Help the customer with: {inputs.issue}</Task>
</Prompt>
```

### Multiple Prompts in One File

```xml
<!-- customer-prompts.prompt -->
<Uses src="@acme/components" />

<Prompt name="support-ticket" tags="support">
  <AcmeHeader />
  <Role>Support agent</Role>
  <Task>Help with the ticket</Task>
</Prompt>

<Prompt name="bug-report" tags="engineering">
  <AcmeHeader />
  <Role>Bug triage specialist</Role>
  <Task>Analyze the bug report</Task>
</Prompt>
```

---

## Runtime Parsing

`.prompt` files are parsed at runtime - no Babel/TypeScript build step required:

```typescript
// Internal: how .prompt files are processed
async function loadPromptFile(filePath: string): Promise<ParsedPromptFile> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Parse XML-like syntax
  const ast = parsePromptSyntax(content);

  // Extract Uses declarations and load dependencies
  const uses = ast.filter(n => n.type === 'Uses');
  for (const use of uses) {
    await moduleLoader.load(use.props.src);
  }

  // Extract and return prompts
  const prompts = ast.filter(n => n.type === 'Prompt');
  return { uses, prompts, filePath };
}
```

---

## Variable Interpolation

Simple prompts support basic variable interpolation for inputs:

```xml
<Prompt name="greeting">
  <Ask.Text name="userName" label="What's your name?" />
  Hello, {inputs.userName}! Welcome to our service.
</Prompt>
```

For advanced logic (loops, conditionals, async data), use the `.tsx` format instead.

---

## Comparison: .prompt vs .tsx

| Feature | `.prompt` | `.tsx` |
|---------|-----------|--------|
| Build step required | No | Yes (Babel/TypeScript) |
| JavaScript/TypeScript | No | Yes |
| Variable interpolation | Basic `{inputs.name}` | Full JS expressions |
| Loops | No | `{items.map(...)}` |
| Complex conditionals | Excel formulas only | Full JavaScript |
| Type checking | No | Yes (TypeScript) |
| Target audience | Non-technical users | Developers |
| File extension | `.prompt` | `.tsx` |

---

## When to Use .prompt Files

**Use `.prompt` when:**
- Non-technical users will edit the prompts
- Prompts are simple with minimal logic
- Quick iteration without build step is important
- Sharing prompts with non-developers

**Use `.tsx` when:**
- Complex logic is needed (loops, async data)
- Type safety is important
- Building reusable component libraries
- Integration with existing TypeScript projects

---

## Example: Complete .prompt File

```xml
<!-- code-review.prompt -->
<Uses src="@company/code-components" />

<Prompt
  name="code-review"
  description="Review code for quality and security"
  tags="code, review, security"
>
  <CompanyHeader title="Code Review Request" />

  <Ask.Select name="reviewType" label="Type of review">
    <Option value="security">Security Review</Option>
    <Option value="quality">Code Quality</Option>
    <Option value="performance">Performance Review</Option>
  </Ask.Select>

  <Ask.Editor name="code" label="Paste your code" language="auto" required />

  <Role>
    You are a senior software engineer specializing in {inputs.reviewType} reviews.
  </Role>

  <Context>
    The developer has submitted code for a {inputs.reviewType} review.
  </Context>

  <Task>
    Review the following code and provide detailed feedback:

    {inputs.code}
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
