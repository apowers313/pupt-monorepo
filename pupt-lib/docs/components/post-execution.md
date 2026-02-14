# Post-Execution Tags

Post-execution tags schedule actions that happen *after* the AI responds. They don't add any visible text to your prompt. Instead, they tell the tool running pupt (like the `pt` CLI) what to do when the prompt finishes.

You can automatically open a file for review, launch a URL in a browser, or run a shell command -- all without any manual steps.

## PostExecution

Container for post-execution actions. Wrap your action tags inside this one.

### Properties

No specific properties. Place `<ReviewFile>`, `<OpenUrl>`, or `<RunCommand>` tags inside it.

### Example

```xml
<Prompt name="report-generator" bare>
  <Task>Generate a report and save it to report.md.</Task>
  <PostExecution>
    <ReviewFile file="./report.md" editor="code" />
    <OpenUrl url="https://example.com/dashboard" />
    <RunCommand command="npm run lint" />
  </PostExecution>
</Prompt>
```

None of these actions appear in the prompt text -- the AI only sees the task. After the AI responds, the tool running pupt opens `report.md` in VS Code for review, launches the dashboard URL in a browser, and runs `npm run lint`.

---

## ReviewFile

Opens a file for review after the prompt finishes. Use this when the AI generates or modifies a file and you want to inspect the result.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `file` | `string` | *(required)* | Path to the file to review |
| `editor` | `string` | — | Editor to open the file in (e.g., `"code"`, `"vim"`) |

### Example

```xml
<PostExecution>
  <ReviewFile file="./output.md" editor="code" />
</PostExecution>
```

---

## OpenUrl

Opens a URL in the default browser after the prompt finishes.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `url` | `string` | *(required)* | URL to open |
| `browser` | `string` | — | Browser to use (e.g., `"firefox"`, `"chrome"`) |

### Example

```xml
<PostExecution>
  <OpenUrl url="https://example.com/results" />
</PostExecution>
```

---

## RunCommand

Runs a shell command after the prompt finishes.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `command` | `string` | *(required)* | Command to execute |
| `cwd` | `string` | — | Working directory |
| `env` | `Record<string, string>` | — | Environment variables |

### Example

```xml
<PostExecution>
  <RunCommand command="npm run build" cwd="./my-project" />
</PostExecution>
```

::: warning
Post-execution commands run automatically, so be careful with destructive commands. The tool running pupt may prompt you for confirmation depending on its configuration.
:::

---

## Related

- [Ask.ReviewFile](/components/ask#askreviewfile) -- combines file input with automatic post-execution review
- [Writing Your First Prompt](/guide/first-prompt) -- tutorial covering all building blocks
