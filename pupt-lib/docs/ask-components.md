# Ask Components

Ask components collect user input when rendering prompts. They let you define what information a prompt needs, validate it, and insert the values into the rendered output.

```tsx
<Prompt name="greeter">
  <Ask.Text name="userName" label="Your name" />
  Hello, <Ask.Text name="userName" label="Your name" />! How can I help you today?
</Prompt>
```

When this prompt is rendered interactively, the user is asked to provide their name. The value replaces the `<Ask.Text>` element in the output. When no value is provided, a `{userName}` placeholder appears instead.

## Overview

There are 14 Ask components organized into categories:

| Category | Components | Purpose |
|----------|-----------|---------|
| **Text input** | `Ask.Text`, `Ask.Editor`, `Ask.Secret` | Free-form text entry |
| **Numeric input** | `Ask.Number`, `Ask.Rating` | Numbers and scales |
| **Selection** | `Ask.Select`, `Ask.MultiSelect`, `Ask.Choice` | Pick from options |
| **Boolean** | `Ask.Confirm` | Yes/no decisions |
| **Date/Time** | `Ask.Date` | Date and datetime values |
| **Filesystem** | `Ask.File`, `Ask.Path`, `Ask.ReviewFile` | File and directory paths |
| **Helpers** | `Ask.Option`, `Ask.Label` | Child elements for Select and Rating |

All Ask components share a common set of props and follow the same value resolution pattern.

## Common Props

Every Ask component (except the helpers `Ask.Option` and `Ask.Label`) accepts these base props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input. Used to look up and store the value. |
| `label` | `string` | *(required)* | Display label shown to the user when collecting input. |
| `description?` | `string` | Same as `label` | Extended description for additional context. |
| `required?` | `boolean` | `false` | Whether the user must provide a value. |
| `silent?` | `boolean` | `false` | When `true`, the component registers its input requirement but renders nothing in the output. Useful for inputs that drive conditional logic without appearing in the prompt text. |

## How Ask Components Work

### Value Resolution

Each Ask component resolves its value using a three-step priority chain:

1. **User input** -- If `context.inputs` contains a value for the component's `name`, that value is used.
2. **Default value** -- If no user input exists but a `default` prop is set, the default is used.
3. **Placeholder** -- If neither input nor default is available, a `{name}` placeholder appears in the output (e.g., `{userName}`).

```tsx
// Renders "admin" if no input is provided
<Ask.Text name="role" label="Role" default="admin" />

// Renders "{role}" if no input and no default
<Ask.Text name="role" label="Role" />
```

### Input Collection

Ask components integrate with the `InputIterator` system, which walks the prompt tree and collects input requirements. Each Ask component registers an `InputRequirement` that describes its name, type, constraints, and default value. The iterator then presents these requirements to the user one at a time, validates each submission, and stores accepted values for rendering.

The basic workflow:

1. Call `createInputIterator(element)` with a prompt element.
2. The iterator calls `start()`, which renders the tree and collects all `InputRequirement` objects.
3. Loop: get `current()` requirement, present it to the user, call `submit(value)` to validate and store, then `advance()` to the next requirement.
4. When `isDone()` returns `true`, all inputs are collected. Render the prompt with the final values.

### Non-Interactive Mode

For automated pipelines, you can supply values upfront and skip interactive collection:

```typescript
const iterator = createInputIterator(element, {
  nonInteractive: true,
  values: { userName: 'Alice', count: 5 },
});
await iterator.runNonInteractive();
```

Missing values fall back to defaults. If a required input has no default and no pre-supplied value, an error is raised.

### Silent Inputs

The `silent` prop suppresses the component's rendered output while still registering the input requirement and making the value available to other components. This is particularly useful with conditional rendering:

```tsx
<Ask.Confirm name="verbose" label="Include detailed output?" silent />
<If when="=verbose">
  <Section name="details">
    Provide comprehensive explanations with examples.
  </Section>
</If>
```

Here, the `<Ask.Confirm>` collects user input and seeds the value into `context.inputs`, but "Yes" or "No" never appears in the prompt text. The `<If>` component reads the value to conditionally include the section.

## Defining Options

`Ask.Select`, `Ask.MultiSelect`, and `Ask.Choice` all accept options. You can define them in two ways:

### As Children with `Ask.Option`

```tsx
<Ask.Select name="language" label="Programming language">
  <Ask.Option value="typescript">TypeScript</Ask.Option>
  <Ask.Option value="python">Python</Ask.Option>
  <Ask.Option value="rust">Rust</Ask.Option>
</Ask.Select>
```

The child text becomes the display label. The `value` prop is the underlying value stored when selected.

### As a Prop Array

```tsx
<Ask.Select
  name="language"
  label="Programming language"
  options={[
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'rust', label: 'Rust' },
  ]}
/>
```

When both are used, child options come first, followed by prop options.

## Defining Rating Labels

`Ask.Rating` supports descriptive labels for numeric values. Like options, they can be defined as children or props:

### As Children with `Ask.Label`

```tsx
<Ask.Rating name="quality" label="Code quality" min={1} max={5}>
  <Ask.Label value={1}>Poor</Ask.Label>
  <Ask.Label value={3}>Acceptable</Ask.Label>
  <Ask.Label value={5}>Excellent</Ask.Label>
</Ask.Rating>
```

### As a Prop

```tsx
<Ask.Rating
  name="quality"
  label="Code quality"
  min={1}
  max={5}
  labels={{ 1: 'Poor', 3: 'Acceptable', 5: 'Excellent' }}
/>
```

When a value has a label, it renders as `"4 (Excellent)"` instead of just `"4"`. Prop labels override child labels for the same value.

## Examples

### Building a Code Review Prompt

```tsx
<Prompt name="code-review">
  <Ask.Select name="language" label="Language" default="typescript">
    <Ask.Option value="typescript">TypeScript</Ask.Option>
    <Ask.Option value="python">Python</Ask.Option>
    <Ask.Option value="go">Go</Ask.Option>
  </Ask.Select>

  <Ask.Editor name="code" label="Code to review" language="typescript" />

  <Ask.Rating name="thoroughness" label="Review thoroughness" min={1} max={3}>
    <Ask.Label value={1}>Quick scan</Ask.Label>
    <Ask.Label value={2}>Standard review</Ask.Label>
    <Ask.Label value={3}>Deep analysis</Ask.Label>
  </Ask.Rating>

  <Task>
    Review the following {language} code at thoroughness level: {thoroughness}.
  </Task>

  <Context>
    <Code language={language}>
      {code}
    </Code>
  </Context>
</Prompt>
```

### Conditional Sections Based on User Input

```tsx
<Prompt name="report-generator">
  <Ask.Text name="topic" label="Report topic" required />
  <Ask.Number name="wordCount" label="Target word count" default={500} min={100} max={5000} />
  <Ask.Confirm name="includeSources" label="Include source citations?" silent />
  <Ask.Confirm name="includeCharts" label="Describe charts/visualizations?" silent />

  <Task>
    Write a report on {topic}, approximately {wordCount} words.
  </Task>

  <If when="=includeSources">
    <Constraint>Include source citations in APA format.</Constraint>
  </If>

  <If when="=includeCharts">
    <Constraint>Suggest charts or visualizations where data supports them.</Constraint>
  </If>
</Prompt>
```

### File-Based Workflow

```tsx
<Prompt name="file-processor">
  <Ask.File name="inputFile" label="Input file" extensions={['.csv', '.json']} mustExist required />
  <Ask.Path name="outputDir" label="Output directory" mustExist mustBeDirectory />
  <Ask.Secret name="apiKey" label="API key" required />

  <Task>
    Process the file at {inputFile} and write results to {outputDir}.
    Use the provided API key for authentication.
  </Task>
</Prompt>
```

---

## Component Reference

pupt-lib defines what inputs a prompt needs but does not include a UI. The actual user-facing experience depends on the application consuming pupt-lib. The descriptions below include examples of how each component might appear in a CLI or web application to make the concepts concrete, but any application can consume the `InputRequirement` metadata and present it however it wants.

---

### Ask.Text

A simple text field that collects a single string value from the user. The user types in a value and it gets inserted directly into the prompt. This is the most common Ask component and the right default choice for any free-form string input. In a CLI, this would typically appear as a single-line [text prompt](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/input). In a web application, this would be a standard [text input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/text) field.

**When to use:** Names, titles, short descriptions, URLs, identifiers, search queries -- any time you need the user to type in a short piece of text.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier used to store and reference this input's value |
| `label` | `string` | *(required)* | Question or prompt shown to the user when collecting input |
| `description?` | `string` | `label` | Longer explanation shown alongside the label for additional context |
| `required?` | `boolean` | `false` | When `true`, the user cannot skip this input |
| `default?` | `string` | — | Pre-filled value used if the user provides nothing |
| `placeholder?` | `string` | — | Hint text suggesting what kind of value is expected |
| `silent?` | `boolean` | `false` | Collect the value but don't render anything in the prompt output |

**Resolves to:** `string`

**Rendered output:** The text the user entered, the default value, or `{name}` as a placeholder if no value is available.

```tsx
// Basic text input -- user is asked "What is your name?"
<Ask.Text name="userName" label="What is your name?" />

// With a default value -- renders "my-project" if the user presses Enter without typing
<Ask.Text name="projectName" label="Project name" default="my-project" />

// Required input with a description for extra context
<Ask.Text
  name="endpoint"
  label="API endpoint"
  description="The full URL of the REST API to call, including the path"
  required
/>
```

---

### Ask.Number

A numeric input that collects a number from the user. You can set minimum and maximum bounds to constrain the range of acceptable values. The input is validated to ensure it's actually a number, not arbitrary text. In a CLI, this would appear as a [text prompt](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/input) that rejects non-numeric input. In a web application, this would be a [number input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/number) with spinner controls and browser-enforced min/max bounds.

**When to use:** Counts, quantities, limits, thresholds, percentages, dimensions, or any parameter that should be numeric. Use `min` and `max` when there's a meaningful range -- for example, a retry count between 0 and 10, or a confidence threshold between 0 and 100.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Question shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must provide a value |
| `default?` | `number` | — | Pre-filled numeric value |
| `min?` | `number` | — | Lowest acceptable value (inclusive) |
| `max?` | `number` | — | Highest acceptable value (inclusive) |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `number`

**Rendered output:** The number converted to a string (e.g., `"42"`), or `{name}` if no value.

**Validation:**
- Value must be a number (non-numeric input is rejected).
- If `min` is set, value must be `>= min`.
- If `max` is set, value must be `<= max`.

```tsx
// Simple number input
<Ask.Number name="retries" label="How many retries?" default={3} />

// Bounded range -- user must enter a value between 1 and 100
<Ask.Number name="confidence" label="Confidence threshold (%)" min={1} max={100} default={80} />

// Required with no default -- user must provide a value
<Ask.Number name="batchSize" label="Batch size" min={1} required />
```

---

### Ask.Select

A single-choice picker. The user sees a list of labeled options and picks exactly one. Each option has an underlying `value` (stored in code) and a display `label` (shown to the user). When the prompt renders, the selected option's display text appears in the output. In a CLI, this would appear as an arrow-key navigable [select list](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/select) where the user highlights an option and presses Enter to choose it. In a web application, this would be a [drop-down select box](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/select).

Options can be defined in two ways: as `<Ask.Option>` child elements (more readable for static lists) or as an `options` prop array (useful when options are computed dynamically). When both are used, child options appear first.

**When to use:** Choosing a language, selecting an output format, picking a mode or preset -- any time the user should pick one item from a fixed list.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Question shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must pick an option |
| `default?` | `string` | — | The `value` of the pre-selected option |
| `options?` | `Array<{ value: string, label?: string }>` | `[]` | Options as a prop array |
| `silent?` | `boolean` | `false` | Collect but don't render |
| `children?` | `Ask.Option` elements | — | Options as child elements |

**Resolves to:** `string` (the `value` of the selected option)

**Rendered output:** The display text of the selected option (its label or child text), or `{name}` if nothing is selected.

**Validation:**
- The submitted value must exactly match one of the defined option values.

**Using child elements:**

```tsx
<Ask.Select name="format" label="Output format" default="json">
  <Ask.Option value="json">JSON</Ask.Option>
  <Ask.Option value="yaml">YAML</Ask.Option>
  <Ask.Option value="csv">CSV</Ask.Option>
</Ask.Select>
```

**Using the options prop:**

```tsx
<Ask.Select
  name="format"
  label="Output format"
  default="json"
  options={[
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'csv', label: 'CSV' },
  ]}
/>
```

Both produce the same result. If the user selects "yaml", the rendered output is `YAML`.

---

### Ask.MultiSelect

A multi-choice picker that lets the user select any number of items from a list, like a group of [checkboxes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox). Unlike `Ask.Select` which allows exactly one choice, `Ask.MultiSelect` returns an array of selected values. You can optionally set `min` and `max` to constrain how many items the user must (or can) pick. In a CLI, this would appear as a [checkbox list](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/checkbox) where the user toggles items with the Space key and confirms with Enter. In a web application, this would be a multi-select widget where multiple items can be toggled on and off.

Options work the same way as `Ask.Select` -- defined as `<Ask.Option>` children or via the `options` prop.

**When to use:** Selecting features to enable, tags to apply, categories to include, topics to cover -- any time the user should pick zero or more items from a list.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Question shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must select at least one option |
| `default?` | `string[]` | — | Array of pre-selected option values |
| `options?` | `Array<{ value: string, label?: string }>` | `[]` | Options as a prop array |
| `min?` | `number` | — | Minimum number of selections required |
| `max?` | `number` | — | Maximum number of selections allowed |
| `silent?` | `boolean` | `false` | Collect but don't render |
| `children?` | `Ask.Option` elements | — | Options as child elements |

**Resolves to:** `string[]` (array of selected option values)

**Rendered output:** A comma-separated list of the display texts for selected options (e.g., `"Authentication, Caching"`), or `{name}` if nothing is selected.

**Validation:**
- Value must be an array.
- Each selected value must match a defined option.

**Using child elements:**

```tsx
<Ask.MultiSelect name="features" label="Which features should be included?" default={['auth']}>
  <Ask.Option value="auth">Authentication</Ask.Option>
  <Ask.Option value="logging">Logging</Ask.Option>
  <Ask.Option value="caching">Caching</Ask.Option>
  <Ask.Option value="monitoring">Monitoring</Ask.Option>
</Ask.MultiSelect>
```

**Using the options prop with min/max constraints:**

```tsx
<Ask.MultiSelect
  name="topics"
  label="Select 2-4 topics to cover"
  min={2}
  max={4}
  options={[
    { value: 'security', label: 'Security' },
    { value: 'performance', label: 'Performance' },
    { value: 'testing', label: 'Testing' },
    { value: 'deployment', label: 'Deployment' },
    { value: 'monitoring', label: 'Monitoring' },
  ]}
/>
```

If the user selects "security" and "testing", the rendered output is `Security, Testing`.

---

### Ask.Choice

A specialized two-option picker for binary decisions. The user must pick one of exactly two alternatives. Unlike `Ask.Confirm` (which is strictly yes/no), `Ask.Choice` lets you define custom labels and descriptions for each side of the decision. In a CLI, this would appear as a two-item [select list](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/select). In a web application, this could be a pair of radio buttons, a segmented control, or a toggle switch with custom labels on each side.

The `options` prop must contain exactly two items -- this is enforced by schema validation.

**When to use:** Either/or decisions that aren't simple yes/no questions: "Strict vs Lenient", "Dark vs Light", "Overwrite vs Append", "Public vs Private". Use `Ask.Confirm` instead when the question is naturally a yes/no.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Question shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must choose |
| `default?` | `string` | — | The `value` of the pre-selected option |
| `options` | `Array<{ value: string, label: string, description?: string }>` | *(required, exactly 2)* | The two alternatives |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `string` (the `value` of the chosen option)

**Rendered output:** The `label` of the selected option, or `{name}` if no selection.

**Validation:**
- Exactly 2 options must be provided (enforced at schema level).
- The submitted value must match one of the two option values.

```tsx
// Toggle between two modes
<Ask.Choice
  name="mode"
  label="Parsing mode"
  default="strict"
  options={[
    { value: 'strict', label: 'Strict', description: 'Fail immediately on any error' },
    { value: 'lenient', label: 'Lenient', description: 'Skip errors and parse what you can' },
  ]}
/>

// Public vs private visibility
<Ask.Choice
  name="visibility"
  label="Repository visibility"
  default="private"
  options={[
    { value: 'public', label: 'Public' },
    { value: 'private', label: 'Private' },
  ]}
/>
```

If the user selects "lenient", the rendered output is `Lenient`.

---

### Ask.Confirm

A yes/no toggle that collects a boolean value. The user is presented with a simple yes-or-no question and their answer resolves to `true` or `false`. In the rendered prompt, the value appears as the text `"Yes"` or `"No"`. In a CLI, this would appear as a [confirm prompt](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/confirm) with a `(Y/n)` or `(y/N)` indicator showing the default. In a web application, this would be a [checkbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/checkbox) or a toggle switch.

This is one of the most commonly used Ask components because it pairs naturally with the `<If>` component to conditionally include or exclude sections of a prompt based on user preference.

**When to use:** Toggling features on or off, enabling optional prompt sections, asking for permission or confirmation. For binary decisions with custom labels (not yes/no), use `Ask.Choice` instead.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | The yes/no question to ask |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must answer |
| `default?` | `boolean` | `false` | Pre-selected answer |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `boolean`

**Rendered output:** `"Yes"` when `true`, `"No"` when `false`.

**Validation:**
- Value must be a boolean.

**Implicit default:** `Ask.Confirm` always has a value -- even without an explicit `default` prop, it defaults to `false`. This value is seeded into `context.inputs` before the render pass begins, which means `<If when="=myConfirm">` conditions can evaluate immediately without waiting for user input. This makes it safe to use `Ask.Confirm` with `<If>` for conditional sections.

```tsx
// Simple confirmation
<Ask.Confirm name="dryRun" label="Perform a dry run?" default={true} />

// Driving a conditional section (common pattern)
// The 'silent' prop hides "Yes"/"No" from the output since it's only
// used to control whether the section below is included.
<Ask.Confirm name="includeExamples" label="Include usage examples?" silent />
<If when="=includeExamples">
  <Section name="examples">
    Provide 3 practical usage examples with code.
  </Section>
</If>
```

---

### Ask.Rating

A numeric scale input where the user picks an integer from a defined range, like a 1-to-5 star rating or a 1-to-10 satisfaction score. You can attach descriptive labels to specific values so the user understands what each number means (e.g., 1 = "Poor", 5 = "Excellent"). In a CLI, this would appear as a [select list](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/select) where each value on the scale is a selectable item (e.g., "1 - Low", "2 - Medium", "3 - High"). In a web application, this would be a [range slider](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/range) with tick marks at each integer value, with labels displayed as annotations on the marks.

Labels can be defined as `<Ask.Label>` child elements or via the `labels` prop. When both are used, prop labels take precedence for any overlapping values.

**When to use:** Priority levels, satisfaction scores, severity ratings, skill levels, confidence scales -- any ordinal ranking where the user picks a point on a numeric scale.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Question shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must provide a rating |
| `default?` | `number` | — | Pre-selected rating value |
| `min?` | `number` | `1` | Lowest value on the scale |
| `max?` | `number` | `5` | Highest value on the scale |
| `labels?` | `Record<number, string>` | `{}` | Map of numeric values to descriptive text |
| `silent?` | `boolean` | `false` | Collect but don't render |
| `children?` | `Ask.Label` elements | — | Labels defined as child elements |

**Resolves to:** `number` (an integer within the min-max range)

**Rendered output:** The number with its label if one exists (e.g., `"4 (Good)"`), just the number if no label is defined for that value (e.g., `"3"`), or `{name}` if no value.

**Validation:**
- Value must be an integer (no decimals).
- Value must be `>= min` and `<= max`.

**Using child elements:**

```tsx
<Ask.Rating name="priority" label="Task priority" min={1} max={4}>
  <Ask.Label value={1}>Low</Ask.Label>
  <Ask.Label value={2}>Medium</Ask.Label>
  <Ask.Label value={3}>High</Ask.Label>
  <Ask.Label value={4}>Critical</Ask.Label>
</Ask.Rating>
```

**Using the labels prop:**

```tsx
<Ask.Rating
  name="priority"
  label="Task priority"
  min={1}
  max={4}
  labels={{ 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' }}
/>
```

Both produce the same result. If the user selects 3, the rendered output is `3 (High)`. You don't need to label every value -- only the ones where a description adds clarity:

```tsx
<Ask.Rating name="score" label="Overall score" min={1} max={10}>
  <Ask.Label value={1}>Unacceptable</Ask.Label>
  <Ask.Label value={5}>Average</Ask.Label>
  <Ask.Label value={10}>Outstanding</Ask.Label>
</Ask.Rating>
```

---

### Ask.Date

A date input that collects a date (or date and time) as an ISO-formatted string. You can set minimum and maximum bounds to restrict the range of acceptable dates. The special keyword `'today'` can be used for bounds that should be relative to when the prompt is run. In a CLI, this would appear as a text prompt where the user types a date string (e.g., `2025-06-15`). In a web application, this would be a [date picker](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/date) -- a calendar widget where the user selects a date visually.

**When to use:** Deadlines, scheduling, date ranges, expiration dates, or any input where the value represents a point in time.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Question shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must provide a date |
| `default?` | `string` | — | Default date as an ISO string (e.g., `"2025-06-15"`) |
| `includeTime?` | `boolean` | `false` | When `true`, collect both date and time |
| `minDate?` | `string` | — | Earliest allowed date (ISO string or `'today'`) |
| `maxDate?` | `string` | — | Latest allowed date (ISO string or `'today'`) |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `string` (an ISO date or datetime string)

**Rendered output:** The date string as provided by the user, or `{name}` if no value.

**Validation:**
- Value must be a string that parses as a valid date.
- If `minDate` is set, the date must not be earlier.
- If `maxDate` is set, the date must not be later.
- `'today'` is resolved to the current date at validation time, so a `minDate` of `'today'` means "no past dates".

```tsx
// Date-only, must be in the future
<Ask.Date name="deadline" label="Project deadline" minDate="today" />

// Date and time with a default
<Ask.Date
  name="meetingTime"
  label="Meeting time"
  includeTime
  default="2025-06-15T14:00:00Z"
/>

// Bounded date range
<Ask.Date
  name="eventDate"
  label="Event date"
  minDate="2025-01-01"
  maxDate="2025-12-31"
/>
```

---

### Ask.Editor

A multi-line text input designed for longer content like code, configuration, prose, or structured text. Unlike `Ask.Text` which is for short single-line values, `Ask.Editor` signals to the consuming application that it should present a full multi-line editing experience. The optional `language` prop provides a hint for syntax highlighting. In a CLI, this would open the user's system editor (vim, nano, VS Code, etc.) in a [separate window](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/editor) where the user writes their content, saves, and closes the editor to submit. In a web application, this would be a [textarea](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/textarea) or a code editor component where the `language` prop configures syntax highlighting.

**When to use:** Code snippets, SQL queries, JSON/YAML configuration, essay-length descriptions, templates, or any input where the user needs to write or paste multiple lines of text.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Prompt shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must provide content |
| `default?` | `string` | — | Pre-filled content |
| `language?` | `string` | — | Language for syntax highlighting (e.g., `'python'`, `'json'`, `'sql'`, `'markdown'`) |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `string`

**Rendered output:** The full text content the user entered, or `{name}` if no value.

```tsx
// Code input with syntax highlighting
<Ask.Editor name="query" label="SQL query" language="sql" />

// Configuration input with a default template
<Ask.Editor
  name="config"
  label="Configuration"
  language="json"
  default={'{\n  "debug": false,\n  "verbose": true\n}'}
/>

// Free-form multi-line text
<Ask.Editor name="requirements" label="Describe the requirements in detail" />
```

---

### Ask.File

A file picker that collects one or more file paths from the user. You can restrict which file types are accepted using the `extensions` prop and optionally validate that the selected file actually exists on disk. In `multiple` mode, the user can select several files at once. In a CLI, this would appear as an interactive [search prompt](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/search) where the user sees directory contents and matching files are filtered in real-time as they type. In a web application, this would be a [file input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file) or a text field for entering file paths.

**When to use:** Selecting input files for processing, choosing a configuration file, picking source files for analysis, or any workflow that operates on files.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Prompt shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must select a file |
| `default?` | `string \| string[]` | — | Default file path(s) |
| `extensions?` | `string[]` | — | Allowed file extensions, including the dot (e.g., `['.json', '.yaml']`) |
| `multiple?` | `boolean` | `false` | Allow selecting more than one file |
| `mustExist?` | `boolean` | `false` | Validate that the file exists on disk |
| `includeContents?` | `boolean` | `false` | Signal that file contents should be loaded |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `string` when `multiple` is `false`, `string[]` when `multiple` is `true`

**Rendered output:** The file path for a single file, comma-separated paths for multiple files, or `{name}` if empty.

**Validation:**
- If `extensions` is set, each file path must end with one of the allowed extensions.
- If `mustExist` is `true`, each file must exist on the filesystem. This check only runs in Node.js -- in browser environments it is skipped with a warning.

```tsx
// Single file with type restriction
<Ask.File name="config" label="Configuration file" extensions={['.json', '.yaml']} mustExist />

// Multiple files
<Ask.File name="sources" label="Source files to analyze" extensions={['.ts', '.tsx']} multiple />

// Simple file path with no validation
<Ask.File name="output" label="Output file" default="./results.csv" />
```

---

### Ask.Path

A path input for collecting filesystem paths that may point to files or directories. This is more general than `Ask.File` -- it doesn't assume the path points to a file and can validate that a path is a directory. Use this when you need a directory path or when the distinction between file and directory matters. In a CLI, this would appear as the same interactive [search prompt](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/search) used by `Ask.File`, allowing the user to browse and search the filesystem. In a web application, this would typically be a [text input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/text) where the user types or pastes a path.

**When to use:** Selecting output directories, project roots, workspace folders, or any path where you need directory-level targeting rather than specific files.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Prompt shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must provide a path |
| `default?` | `string` | — | Default path |
| `mustExist?` | `boolean` | `false` | Validate that the path exists on disk |
| `mustBeDirectory?` | `boolean` | `false` | Validate that the path is a directory (not a file) |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `string`

**Rendered output:** The path as entered by the user, or `{name}` if no value.

**Validation:**
- If `mustExist` is `true`, the path must exist on the filesystem (Node.js only).
- If `mustBeDirectory` is `true`, the path must point to a directory, not a file (Node.js only).

```tsx
// Directory that must already exist
<Ask.Path name="outputDir" label="Output directory" mustExist mustBeDirectory />

// Project root with a sensible default
<Ask.Path name="projectRoot" label="Project root" default="./" />

// Any path, no validation
<Ask.Path name="destination" label="Destination path" />
```

---

### Ask.Secret

A masked text input for sensitive values like passwords, API keys, and tokens. It works like `Ask.Text` in terms of value resolution, but it signals to the consuming application that the value should be treated as sensitive and hidden from view while the user types. In a CLI, this would appear as a [password prompt](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/password) where the user types their value but sees dots or asterisks instead of the actual characters. In a web application, this would be a [password input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/password) which masks the characters and may offer a "show/hide" toggle.

The input requirement is registered with a `masked: true` flag so that logging systems and UIs know to redact the value.

**When to use:** API keys, passwords, access tokens, connection strings, or any value that should not appear in logs, screenshots, or UI displays.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Prompt shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must provide a value |
| `default?` | `string` | — | Default value |
| `validator?` | `string` | — | Custom validator identifier |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `string`

**Rendered output:** The secret value as a string, or `{name}` if no value. The component renders the raw value into the prompt so it can be used -- the masking only applies to the input UI, not the prompt output.

```tsx
// Required API key
<Ask.Secret name="apiKey" label="API key" required />

// Database password with a description
<Ask.Secret
  name="dbPassword"
  label="Database password"
  description="Password for the PostgreSQL production database"
  required
/>
```

---

### Ask.ReviewFile

A convenience component that combines file selection with an automatic post-execution action. When the user provides a file path, the component both inserts the path into the prompt and registers a "review file" action that runs after the prompt completes. The file selection works the same as `Ask.File`. The difference is what happens after the prompt finishes: a CLI might automatically open the selected file in the user's editor for review, while a web application might display a "Review File" button or open a file preview pane.

This is syntactic sugar. Using `Ask.ReviewFile` is equivalent to separately using `Ask.File` for input and `PostExecution` + `ReviewFile` for the post-execution hook.

**When to use:** Workflows where the AI generates or modifies a file and you want the user to automatically review the result afterward -- code generation, report writing, configuration scaffolding.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | *(required)* | Unique identifier for this input |
| `label` | `string` | *(required)* | Prompt shown to the user |
| `description?` | `string` | `label` | Additional context |
| `required?` | `boolean` | `false` | Whether the user must provide a file path |
| `default?` | `string` | — | Default file path |
| `extensions?` | `string[]` | — | Allowed file extensions |
| `editor?` | `string` | — | Editor command to open the file with (e.g., `"code"`, `"vim"`) |
| `silent?` | `boolean` | `false` | Collect but don't render |

**Resolves to:** `string`

**Rendered output:** The file path, or `{name}` if no value.

**Side effect:** When a valid file path is resolved, a `reviewFile` post-execution action is automatically registered. After the prompt finishes, the file will be opened for review.

```tsx
// Open the output file in VS Code after the prompt runs
<Ask.ReviewFile name="output" label="Output file" extensions={['.md']} editor="code" />
```

This is equivalent to writing both pieces manually:

```tsx
<Ask.File name="output" label="Output file" extensions={['.md']} />
<PostExecution>
  <ReviewFile input="output" editor="code" />
</PostExecution>
```

---

### Ask.Option

A helper component used inside `Ask.Select`, `Ask.MultiSelect`, and `Ask.Choice` to define individual options. Each `<Ask.Option>` declares one selectable item with a `value` (stored when chosen) and display text (shown to the user). The parent component collects all `Ask.Option` children and uses them to build its option list. In a CLI, each `Ask.Option` becomes one selectable line in an arrow-key list or checkbox list. In a web application, each one becomes an [`<option>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/option) in a drop-down, an item in a multi-select widget, or a radio button in a choice group.

The child text content becomes the display label. If no child text is provided, the `value` is used as the label.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | *(required)* | The underlying value stored when this option is selected |
| `children` | `string` | — | Display text shown to the user (defaults to `value` if omitted) |

```tsx
// With explicit display text -- user sees "TypeScript", value stored is "ts"
<Ask.Option value="ts">TypeScript</Ask.Option>

// Value used as display text -- user sees "json", value stored is "json"
<Ask.Option value="json" />

// Inside a Select -- each Option becomes one item in the drop-down / list
<Ask.Select name="lang" label="Language">
  <Ask.Option value="en">English</Ask.Option>
  <Ask.Option value="es">Spanish</Ask.Option>
  <Ask.Option value="fr">French</Ask.Option>
</Ask.Select>
```

---

### Ask.Label

A helper component used inside `Ask.Rating` to attach a descriptive text label to a specific numeric value on the rating scale. Each `<Ask.Label>` maps a number to a human-readable description so the user knows what the numbers mean. In a CLI, labels appear next to each number in the selectable list (e.g., the user sees "3 - High" instead of just "3"). In a web application, labels appear as annotations on slider tick marks or as tooltips on rating buttons.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| string` | *(required)* | The numeric rating value this label describes |
| `children` | `string` | — | Descriptive text for the value |

```tsx
// Labels inside a rating scale -- each value gets a human-readable description
<Ask.Rating name="difficulty" label="How difficult was this?" min={1} max={5}>
  <Ask.Label value={1}>Very Easy</Ask.Label>
  <Ask.Label value={2}>Easy</Ask.Label>
  <Ask.Label value={3}>Moderate</Ask.Label>
  <Ask.Label value={4}>Hard</Ask.Label>
  <Ask.Label value={5}>Very Hard</Ask.Label>
</Ask.Rating>
```

When the user selects 4, the rendered output is `4 (Hard)`.
