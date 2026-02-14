# Conditional Logic

Prompts don't have to be static. You can show or hide sections based on user input, formulas, or which AI you're targeting. This makes a single prompt file flexible enough to handle many different situations.

## Show or Hide Content with `<If>`

The `<If>` tag includes its content only when a condition is true. When the condition is false, pupt leaves that content out of the prompt entirely.

```xml
<Ask.Confirm name="verbose" label="Include detailed output?" silent />

<Task>Help the user with their question.</Task>

<If when="=verbose">
  <Section name="detail-level">
    Provide comprehensive explanations with examples and references.
  </Section>
</If>
```

When the user answers "Yes", pupt includes the detail-level section. When they answer "No", pupt omits it entirely.

The `silent` property on the `<Ask.Confirm>` tag keeps the "Yes"/"No" value out of the prompt text — it only drives the conditional logic.

## Formula Conditions

The most common way to use `<If>` is with a formula. Formulas start with `=` and can reference any variable you create with an Ask tag:

```xml
<Ask.Number name="count" label="How many items?" default={3} silent />

<If when="=count>5">
  Processing a large batch — this may take a while.
</If>

<If when="=count<=5">
  Processing a small batch.
</If>
```

Formulas use familiar spreadsheet-style syntax. Here are some examples:

### Comparisons

```xml
<If when="=count>10">More than 10</If>
<If when="=count<=5">5 or fewer</If>
<If when="=name='Alice'">Hello, Alice!</If>
```

::: tip String Comparisons
Use single quotes for strings inside formulas: `=name='Alice'`, not `=name="Alice"`.
:::

### Combining Conditions

```xml
<!-- Both must be true -->
<If when="=AND(role='admin', status='active')">
  Active admin content.
</If>

<!-- Either can be true -->
<If when="=OR(lang='en', lang='es')">
  English or Spanish content.
</If>

<!-- Inverts a condition -->
<If when="=NOT(dryRun)">
  Performing real operations.
</If>
```

### Math

```xml
<If when="=price*quantity>1000">
  Large order detected.
</If>

<If when="=SUM(score1,score2,score3)>200">
  High combined score.
</If>
```

### Text

```xml
<If when="=LEN(name)>0">
  A name was provided.
</If>

<If when="=ISBLANK(optionalField)">
  No optional field provided.
</If>
```

Formulas use the same engine that powers spreadsheets, so hundreds of functions are available. See the [Conditionals Reference](/developers/conditionals) for the complete list.

## Targeting a Specific AI Provider

The `<If>` tag can show content only when targeting a specific AI provider. Different AI models respond better to different prompting styles, so this lets you tailor your prompt for each one:

```xml
<If provider="anthropic">
  Use XML tags to structure your response.
</If>

<If provider="openai">
  Use markdown headers to structure your response.
</If>
```

When you run this prompt targeting Claude (an Anthropic model), only the first section appears. When targeting GPT-4 (an OpenAI model), only the second section appears.

You can target multiple providers at once by passing an array:

```xml
<If provider={['anthropic', 'google']}>
  Use XML tags to structure your response.
</If>
```

You can also exclude one or more providers:

```xml
<If notProvider="openai">
  This content appears for all providers except OpenAI.
</If>

<If notProvider={['openai', 'meta']}>
  This content appears for all providers except OpenAI and Meta.
</If>
```

Supported providers include `anthropic`, `openai`, `google`, `meta`, `mistral`, `deepseek`, `xai`, and `cohere`.

## Repeating Content with `<ForEach>`

The `<ForEach>` tag repeats content for each item in a list:

```xml
<ForEach items={['bug fixes', 'improvements', 'style issues']} as="category">
  {(category) => "- Review for " + category + "\n"}
</ForEach>
```

This produces:

```
- Review for bug fixes
- Review for improvements
- Review for style issues
```

The function also receives the current index as a second argument, which you can use for numbering:

```xml
<ForEach items={['Setup', 'Execution', 'Cleanup']} as="step">
  {(step, index) => (index + 1) + ". " + step + "\n"}
</ForEach>
```

::: tip ForEach Syntax
The `<ForEach>` tag uses a function inside curly braces to generate content for each item. This is the one place where `.prompt` files use a small bit of code syntax.
:::

## Describing Conditional Behavior

The tags above (`<If>` and `<ForEach>`) control what *appears* in the prompt. The tags below work differently — they *describe* conditional behavior to the AI as instructions. They always appear in the prompt text.

### Edge Cases

The `<EdgeCases>` tag tells the AI how to handle unusual situations:

```xml
<EdgeCases>
  <When condition="the user provides no code"
        then="ask them to paste the code they want reviewed" />
  <When condition="the code is in an unfamiliar language"
        then="let the user know and suggest a general review" />
</EdgeCases>
```

This produces text that the AI reads and follows:

```
<edge-cases>
<when>
When the user provides no code: ask them to paste the code they want reviewed
</when>
<when>
When the code is in an unfamiliar language: let the user know and suggest a general review
</when>

</edge-cases>
```

You can also use a `standard` or `minimal` preset for common situations:

```xml
<EdgeCases preset="standard" />
```

### Fallbacks

The `<Fallbacks>` tag tells the AI what to do when something goes wrong:

```xml
<Fallbacks preset="standard" />
```

This produces:

```
<fallbacks>
If unable to complete the request, then explain why and suggest alternatives
If missing required information, then ask clarifying questions
If encountering an error, then describe the error and suggest a fix

</fallbacks>
```

You can also define individual fallback rules with the `<Fallback>` tag:

```xml
<Fallbacks>
  <Fallback when="the API is unreachable"
            then="use cached data and inform the user" />
  <Fallback when="the file format is unsupported"
            then="suggest converting to a supported format" />
</Fallbacks>
```

## Putting It Together

Here's a practical example that combines input collection with conditional logic. The prompt adapts based on what you choose:

```xml
<Prompt name="report-builder">
  <Ask.Text name="topic" label="Report topic" required />
  <Ask.Number name="wordCount" label="Target word count"
              default={500} min={100} max={5000} silent />
  <Ask.Confirm name="includeSources" label="Include source citations?" silent />
  <Ask.Confirm name="includeCharts" label="Describe charts?" silent />
  <Ask.Select name="audience" label="Target audience" default="general" silent>
    <Ask.Option value="general">General</Ask.Option>
    <Ask.Option value="technical">Technical</Ask.Option>
    <Ask.Option value="executive">Executive</Ask.Option>
  </Ask.Select>

  <Task>
    Write a report on {topic}, approximately {wordCount} words.
  </Task>

  <If when="=includeSources">
    <Constraint type="must">Include source citations in APA format.</Constraint>
  </If>

  <If when="=includeCharts">
    <Constraint type="should">
      Suggest charts or visualizations where data supports them.
    </Constraint>
  </If>

  <If when="=audience='technical'">
    <Constraint type="should">
      Include code examples and technical details.
    </Constraint>
  </If>

  <If when="=audience='executive'">
    <Constraint type="should">
      Keep the language concise. Lead with key findings and recommendations.
    </Constraint>
  </If>

  <If when="=wordCount>2000">
    <Constraint type="must">Include a table of contents at the beginning.</Constraint>
  </If>

  <EdgeCases preset="standard" />
  <Fallbacks preset="standard" />
</Prompt>
```

Depending on your choices, this single prompt file can produce very different prompts — with or without citations, with technical or executive language, with or without a table of contents. The prompt adapts to the situation.

## Quick Reference

| Tag | What it does |
|-----|-------------|
| `<If when="=formula">` | Shows content when a formula is true |
| `<If when={true}>` | Shows content when a value is true |
| `<If provider="anthropic">` | Shows content for a specific AI provider |
| `<If provider={['anthropic', 'google']}>` | Shows content for multiple AI providers |
| `<If notProvider="openai">` | Shows content for all providers except one |
| `<ForEach>` | Repeats content for each item in a list |
| `<EdgeCases>` | Describes how to handle unusual situations |
| `<When>` | Describes a single edge case (condition and action) |
| `<Fallbacks>` | Describes what to do when something fails |
| `<Fallback>` | Describes a single fallback rule (when and then) |

## What to Learn Next

- [Environment & Context](/guide/environment) — How pupt adapts prompts for different AI providers
- [Control Flow Reference](/components/control-flow) — All properties and options for `<If>` and `<ForEach>`
- [Conditionals Reference](/developers/conditionals) — Complete list of formula functions
