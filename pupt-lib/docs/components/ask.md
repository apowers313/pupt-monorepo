# Ask (Input) Tags

Ask tags collect information from users when a prompt runs. They create variables you can use throughout your prompt with `{variableName}`.

::: tip
For a tutorial introduction to Ask tags, see [Variables & Inputs](/guide/variables-and-inputs).
:::

## Common Properties

Every Ask tag (except the helpers `Ask.Option` and `Ask.Label`) shares these properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | *(required)* | Variable name for this input. Must be unique. |
| `label` | `string` | *(required)* | Question shown to the user |
| `description` | `string` | Same as `label` | Additional context or help text |
| `required` | `boolean` | `false` | The user must provide a value |
| `silent` | `boolean` | `false` | Collects the value but hides it from the prompt text |

## How Values Work

Each Ask tag picks its value using a simple priority: if the user provides a value, that value wins. If not, the tag falls back to the `default` you set. If neither exists, `{name}` appears in the prompt text as a placeholder.

## Ask.Text {#asktext}

Collects a single line of text -- great for names, titles, descriptions, or any short answer.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` | — | Pre-filled value |
| `placeholder` | `string` | — | Hint text |

### Example

```xml
<Ask.Text name="userName" label="What is your name?" default="World" />
<Task>Write a greeting for {userName}.</Task>
```

If the user types "Alice", the task becomes: `Write a greeting for Alice.`
If the user presses Enter without typing, the task becomes: `Write a greeting for World.`

---

## Ask.Number {#asknumber}

Collects a number with optional minimum and maximum bounds.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `number` | — | Pre-filled number |
| `min` | `number` | — | Lowest allowed value |
| `max` | `number` | — | Highest allowed value |

### Example

```xml
<Ask.Number name="wordCount" label="Target word count"
            default={500} min={100} max={5000} />
```

---

## Ask.Select {#askselect}

Lets the user pick one option from a list. You can define options as nested `<Ask.Option>` tags or as an `options` property.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` | — | Value of the pre-selected option |
| `options` | `array` | — | Options as `[{ value, label? }]`. If you omit `label`, the `value` is shown. |

### Examples

**Using nested tags:**

```xml
<Ask.Select name="language" label="Programming language" default="python">
  <Ask.Option value="python">Python</Ask.Option>
  <Ask.Option value="javascript">JavaScript</Ask.Option>
  <Ask.Option value="rust">Rust</Ask.Option>
</Ask.Select>
```

**Using the options property:**

```xml
<Ask.Select name="language" label="Programming language" default="python"
  options={[
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'rust', label: 'Rust' },
  ]}
/>
```

When the user picks "Python", `{language}` becomes `Python` in the prompt text.

---

## Ask.MultiSelect {#askmultiselect}

Lets the user pick multiple options from a list.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string[]` | — | Pre-selected option values |
| `options` | `array` | — | Options as `[{ value, label? }]`. If you omit `label`, the `value` is shown. |
| `min` | `number` | — | Minimum number of selections required |
| `max` | `number` | — | Maximum number of selections allowed |

### Example

```xml
<Ask.MultiSelect name="features" label="Which features to include?">
  <Ask.Option value="auth">Authentication</Ask.Option>
  <Ask.Option value="logging">Logging</Ask.Option>
  <Ask.Option value="caching">Caching</Ask.Option>
</Ask.MultiSelect>
```

If the user selects "Authentication" and "Caching", `{features}` becomes `Authentication, Caching`.

---

## Ask.Confirm {#askconfirm}

A simple yes/no question. The value shows up as "Yes" or "No" in the prompt text.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `boolean` | `false` | Pre-selected answer |

### Example

```xml
<Ask.Confirm name="includeExamples" label="Include code examples?" default={true} />
```

You can pair this with `<If>` and the `silent` property to conditionally include sections without showing "Yes" or "No" in the prompt:

```xml
<Ask.Confirm name="verbose" label="Include detailed output?" silent />

<If when="=verbose">
  <Section name="detail-level">
    Provide comprehensive explanations with examples.
  </Section>
</If>
```

---

## Ask.Choice {#askchoice}

A two-option picker for binary decisions that are not yes/no. You must provide exactly 2 options.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` | — | Value of the pre-selected option |
| `options` | `array` | *(required, exactly 2)* | Two alternatives as `[{ value, label, description? }]`. Both `value` and `label` are required. |

### Example

```xml
<Ask.Choice name="mode" label="Parsing mode" default="strict"
  options={[
    { value: 'strict', label: 'Strict', description: 'Fail on any error' },
    { value: 'lenient', label: 'Lenient', description: 'Skip errors' },
  ]}
/>
```

If the user selects "lenient", `{mode}` becomes `Lenient`.

---

## Ask.Editor {#askeditor}

Collects multi-line text -- useful for code snippets, configuration, or longer content.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` | — | Pre-filled content |
| `language` | `string` | — | Language for syntax highlighting (e.g., `"python"`, `"json"`) |

### Example

```xml
<Ask.Editor name="code" label="Paste the code to review" language="python" />
```

---

## Ask.File {#askfile}

Asks the user to select a file. You can restrict which file types are accepted.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` \| `string[]` | — | Default file path(s) |
| `extensions` | `string[]` | — | Allowed extensions (e.g., `['.json', '.yaml']`) |
| `multiple` | `boolean` | `false` | Allow selecting multiple files |
| `mustExist` | `boolean` | `false` | Validate that the file exists |
| `includeContents` | `boolean` | `false` | Include file contents in the prompt |

### Example

```xml
<Ask.File name="config" label="Configuration file"
          extensions={['.json', '.yaml']} mustExist />
```

---

## Ask.Path {#askpath}

Collects a directory or file path. Use this instead of `Ask.File` when you need a directory path or do not need file-specific features like extension filtering.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` | — | Default path |
| `mustExist` | `boolean` | `false` | Validate that the path exists |
| `mustBeDirectory` | `boolean` | `false` | Validate that the path is a directory |

### Example

```xml
<Ask.Path name="outputDir" label="Output directory" mustExist mustBeDirectory />
```

---

## Ask.Rating {#askrating}

A numeric scale with optional labels. The user picks a whole number from a defined range.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `number` | — | Pre-selected value |
| `min` | `number` | `1` | Lowest value on the scale |
| `max` | `number` | `5` | Highest value on the scale |
| `labels` | `object` | — | Maps scale values to descriptions, e.g., `{ 1: 'Low', 5: 'High' }` |

### Examples

**Using nested tags:**

```xml
<Ask.Rating name="priority" label="Task priority" min={1} max={4}>
  <Ask.Label value={1}>Low</Ask.Label>
  <Ask.Label value={2}>Medium</Ask.Label>
  <Ask.Label value={3}>High</Ask.Label>
  <Ask.Label value={4}>Critical</Ask.Label>
</Ask.Rating>
```

**Using the labels property:**

```xml
<Ask.Rating name="priority" label="Task priority" min={1} max={4}
  labels={{ 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' }}
/>
```

If the user selects 3, `{priority}` becomes `3 (High)`.

---

## Ask.Date {#askdate}

Collects a date (or date and time) with optional earliest and latest bounds.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` | — | Default date (ISO format) |
| `includeTime` | `boolean` | `false` | Include time selection |
| `minDate` | `string` | — | Earliest allowed date (ISO or `'today'`) |
| `maxDate` | `string` | — | Latest allowed date (ISO or `'today'`) |

### Example

```xml
<Ask.Date name="deadline" label="Project deadline" minDate="today" />
```

---

## Ask.Secret {#asksecret}

Masked input for sensitive values like API keys and passwords. The user's input stays hidden while they type.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` | — | Default value |
| `validator` | `string` | — | Validation pattern |

### Example

```xml
<Ask.Secret name="apiKey" label="API key" required />
```

---

## Ask.ReviewFile {#askreviewfile}

Combines file selection with an automatic post-execution action. After the prompt finishes, the selected file opens for review.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `default` | `string` | — | Default file path |
| `extensions` | `string[]` | — | Allowed file extensions |
| `editor` | `string` | — | Editor to open the file in (e.g., `"code"`, `"vim"`) |

### Example

```xml
<Ask.ReviewFile name="output" label="Output file" extensions={['.md']} editor="code" />
```

This tag is shorthand for using `<Ask.File>` plus `<PostExecution>` with `<ReviewFile>` separately.

---

## Ask.Option {#askoption}

A helper tag you nest inside `Ask.Select` or `Ask.MultiSelect` to define individual options.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `string` | *(required)* | The value stored when the user picks this option |

The text inside the tag becomes the display label. If you leave it empty, the `value` is used as the label instead.

```xml
<Ask.Option value="ts">TypeScript</Ask.Option>
```

---

## Ask.Label {#asklabel}

A helper tag you nest inside `Ask.Rating` to label specific values on the scale.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `value` | `number` \| `string` | *(required)* | The scale value this label describes |

The text inside the tag becomes the label.

```xml
<Ask.Label value={1}>Low</Ask.Label>
```

---

## All Ask Tags at a Glance

| Tag | What it collects | Value type |
|-----|-----------------|------------|
| `Ask.Text` | Short text | `string` |
| `Ask.Number` | A number | `number` |
| `Ask.Select` | One choice from a list | `string` |
| `Ask.MultiSelect` | Multiple choices from a list | `string[]` |
| `Ask.Confirm` | Yes or no | `boolean` |
| `Ask.Choice` | One of exactly two options | `string` |
| `Ask.Editor` | Multi-line text | `string` |
| `Ask.File` | File path(s) | `string` or `string[]` |
| `Ask.Path` | Directory or file path | `string` |
| `Ask.Rating` | Number on a scale | `number` |
| `Ask.Date` | Date or datetime | `string` |
| `Ask.Secret` | Sensitive text (masked) | `string` |
| `Ask.ReviewFile` | File path + auto-review | `string` |

---

## Related

- [Variables & Inputs](/guide/variables-and-inputs) — tutorial introduction
- [Conditional Logic](/guide/conditional-logic) — using Ask values with `<If>`
- [Tag Overview](/components/) — browse all available tags
