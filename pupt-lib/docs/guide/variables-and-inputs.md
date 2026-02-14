# Variables & Inputs

Prompts become much more useful when they adapt to the person running them. With variables and inputs, you can ask questions, capture answers, and weave those answers throughout your prompt.

## Asking for Input

`Ask` tags collect information when a prompt runs. The simplest is `Ask.Text`, which asks for a short text answer:

```xml
<Prompt name="greeting">
  <Ask.Text name="userName" label="What is your name?" />
  <Task>Write a personalized greeting for {userName}.</Task>
</Prompt>
```

When you run this prompt, pupt asks "What is your name?" and waits for an answer. If you type "Alice", the final prompt becomes:

```
Write a personalized greeting for Alice.
```

The `<Ask.Text>` tag creates a variable called `userName`. Once you provide a value, every `{userName}` reference in your prompt gets replaced with your answer.

## Setting Default Values

You can provide a default value that applies when you press Enter without typing anything:

```xml
<Ask.Text name="userName" label="What is your name?" default="World" />
<Task>Write a greeting for {userName}.</Task>
```

If you press Enter without typing anything, `{userName}` becomes "World".

## Types of Input

Pupt provides several input tag types beyond plain text. Here are the most common ones.

### Text

Use this for short text like names, titles, or descriptions:

```xml
<Ask.Text name="topic" label="What topic should we cover?" />
```

### Number

For numeric values. You can set minimum and maximum bounds:

```xml
<Ask.Number name="wordCount" label="Target word count" default={500} min={100} max={5000} />
```

### Select

For choosing one option from a list:

```xml
<Ask.Select name="language" label="Programming language" default="python">
  <Ask.Option value="python">Python</Ask.Option>
  <Ask.Option value="javascript">JavaScript</Ask.Option>
  <Ask.Option value="rust">Rust</Ask.Option>
</Ask.Select>
```

When you pick "Python", `{language}` becomes `Python` (the display text, not the underlying value).

### Confirm

For yes/no questions:

```xml
<Ask.Confirm name="includeExamples" label="Include code examples?" default={true} />
```

In the prompt text, the variable appears as "Yes" or "No".

### MultiSelect

For choosing multiple options from a list:

```xml
<Ask.MultiSelect name="features" label="Which features to include?">
  <Ask.Option value="auth">Authentication</Ask.Option>
  <Ask.Option value="logging">Logging</Ask.Option>
  <Ask.Option value="caching">Caching</Ask.Option>
</Ask.MultiSelect>
```

If you select "Authentication" and "Caching", `{features}` becomes "Authentication, Caching".

### Editor

For longer text like code snippets or multi-line content:

```xml
<Ask.Editor name="code" label="Paste the code to review" language="python" />
```

### File

For selecting a file path:

```xml
<Ask.File name="config" label="Configuration file" extensions={['.json', '.yaml']} />
```

### Rating

For a numeric scale. You can attach labels to each value:

```xml
<Ask.Rating name="priority" label="Task priority" min={1} max={4}>
  <Ask.Label value={1}>Low</Ask.Label>
  <Ask.Label value={2}>Medium</Ask.Label>
  <Ask.Label value={3}>High</Ask.Label>
  <Ask.Label value={4}>Critical</Ask.Label>
</Ask.Rating>
```

If you select 3, `{priority}` becomes "3 (High)".

::: tip All Ask Tags
There are 13 input types in total, including `Ask.Date`, `Ask.Secret`, `Ask.Path`, `Ask.Choice`, `Ask.ReviewFile`, and more. See the [Ask reference](/components/ask) for the full list.
:::

## Using Variables

Once you create a variable with an Ask tag, you can use it anywhere in your prompt with curly braces:

```xml
<Prompt name="code-helper">
  <Ask.Text name="language" label="Programming language" default="Python" />
  <Ask.Text name="task" label="What do you need help with?" />

  <Role>You are an expert {language} developer.</Role>
  <Task>{task}</Task>
  <Constraint type="must">Write all code examples in {language}.</Constraint>
</Prompt>
```

If you enter "TypeScript" and "Sort an array", the final prompt becomes:

```
You are an expert TypeScript developer.
Sort an array.
MUST: Write all code examples in TypeScript.
```

Variables work everywhere -- inside roles, tasks, constraints, context, and any other tag.

## Silent Inputs

Sometimes you want to collect an answer that controls the prompt's behavior without showing up in the output text. Add the `silent` property to make this happen:

```xml
<Ask.Confirm name="verbose" label="Include detailed output?" silent />
```

You still see the question and answer it. But "Yes" or "No" never appears in the final prompt text. Silent inputs pair well with [conditional logic](/guide/conditional-logic) -- you can collect a preference and then use it to show or hide entire sections.

## Required Inputs

Add the `required` property to prevent skipping:

```xml
<Ask.Text name="topic" label="Report topic" required />
```

If you try to skip a required input, pupt asks you again.

## Variable Rules

Variables follow a few simple rules.

First, you must declare a variable before you use it. Place your Ask tags above any tags that reference them:

```xml
<!-- This works -->
<Ask.Text name="userName" label="Name" default="World" />
<Task>Hello {userName}</Task>

<!-- This does NOT work -- userName isn't defined yet -->
<Task>Hello {userName}</Task>
<Ask.Text name="userName" label="Name" default="World" />
```

Second, each variable name must be unique within a prompt. You cannot reuse the same name for two different inputs.

Third, stick to simple names like `userName`, `itemCount`, or `outputFormat`. Variable names cannot contain spaces or dashes.

## A Complete Example

Here is a prompt that collects several inputs and uses them together:

```xml
<Prompt name="report-generator">
  <Ask.Text name="topic" label="Report topic" required />
  <Ask.Number name="wordCount" label="Target word count" default={500} min={100} max={5000} />
  <Ask.Select name="audience" label="Target audience" default="general">
    <Ask.Option value="general">General</Ask.Option>
    <Ask.Option value="technical">Technical</Ask.Option>
    <Ask.Option value="executive">Executive</Ask.Option>
  </Ask.Select>

  <Role preset="writer" />
  <Task>Write a report on {topic}, approximately {wordCount} words.</Task>
  <Audience level="{audience}" />
  <Format type="markdown" />
</Prompt>
```

If you enter "AI in Healthcare" as the topic, 1000 as the word count, and "technical" as the audience, pupt fills in every variable and produces a complete, well-structured prompt with all your values in the right places.

## What to Learn Next

- [Conditional Logic](/guide/conditional-logic) -- Show or hide sections based on input
- [Ask Reference](/components/ask) -- Full reference for all 13 input types
- [Tags Overview](/components/) -- Browse all available tags
