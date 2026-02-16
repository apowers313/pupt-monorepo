# Control Flow

Control flow tags let you show or hide content based on conditions and repeat content for each item in a list.

::: tip
For a tutorial-style introduction to these tags, see [Conditional Logic](/guide/conditional-logic).
:::

## If

Shows its content only when a condition is true. When the condition is false, the content stays out of the prompt entirely.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `when` | `boolean` \| `string` | — | Boolean value, or a formula string starting with `=` |
| `provider` | `string` \| `string[]` | — | Show content only for these AI providers |
| `notProvider` | `string` \| `string[]` | — | Show content for all providers except these |

When you set multiple properties, pupt evaluates them in order: `provider` first, then `notProvider`, then `when`.

### Boolean Conditions

Pass `true` or `false` directly:

```xml
<If when={true}>This content is included.</If>
<If when={false}>This content is excluded.</If>
```

The first line includes its content. The second produces nothing.

### Formula Conditions

You can use Excel-style formulas that start with `=`. Formulas can reference any variable created by an Ask tag:

```xml
<Ask.Number name="count" label="How many items?" default={3} silent />

<If when="=count>5">
  Processing a large batch.
</If>
```

**Comparisons**

```xml
<If when="=count>10">More than 10</If>
<If when="=count<=5">5 or fewer</If>
<If when="=name='Alice'">Hello, Alice!</If>
```

::: tip String Comparisons
Use single quotes for strings inside formulas: `=name='Alice'`, not `=name="Alice"`.
:::

**Combining conditions**

```xml
<If when="=AND(role='admin', status='active')">
  Active admin content.
</If>

<If when="=OR(lang='en', lang='es')">
  English or Spanish content.
</If>

<If when="=NOT(dryRun)">
  Performing real operations.
</If>
```

**Math**

```xml
<If when="=price*quantity>1000">
  Large order detected.
</If>

<If when="=SUM(score1,score2,score3)>200">
  High combined score.
</If>
```

**Text functions**

```xml
<If when="=LEN(name)>0">
  A name was provided.
</If>

<If when="=ISBLANK(optionalField)">
  No optional field provided.
</If>
```

HyperFormula, an Excel-compatible formula engine, powers these formulas. See the [Conditionals Reference](/developers/conditionals) for the complete function list.

### Provider Conditions

You can show content only when targeting a specific AI provider:

```xml
<If provider="anthropic">
  Use XML tags to structure your response.
</If>

<If provider="openai">
  Use markdown headers to structure your response.
</If>
```

When you target Claude (Anthropic), only the first section appears. When you target GPT-4 (OpenAI), only the second appears.

You can also exclude a provider:

```xml
<If notProvider="openai">
  This content appears for all providers except OpenAI.
</If>
```

Supported providers: `anthropic`, `openai`, `google`, `meta`, `mistral`, `deepseek`, `xai`, `cohere`.

---

## ForEach

Repeats content for each item in a list. You provide a function inside the tag that receives each item and returns the content to include.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `items` | `array` | *(required)* | Array of items to iterate over |
| `as` | `string` | *(required)* | Name for the current item |

### Example

```xml
<ForEach items={['bug fixes', 'improvements', 'style issues']} as="category">
  {(category) => "- Review for " + category + "\n"}
</ForEach>
```

Produces:

```
- Review for bug fixes
- Review for improvements
- Review for style issues
```

When the `items` list is empty, nothing appears in the output.

::: tip
`<ForEach>` uses a function inside curly braces to generate content for each item. This is the one place where prompt files use a small bit of programming syntax.
:::

---

## Descriptive Conditionals

The tags below don't control what appears in the prompt -- they *always* produce output. They describe conditional behavior to the AI as structured instructions.

### EdgeCases

Groups `<When>` tags that describe how the AI should handle unusual situations.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `preset` | `'standard'` \| `'minimal'` | — | Use a preset set of edge cases |
| `extend` | `boolean` | — | Add to a preset instead of replacing it |
| `delimiter` | `'xml'` \| `'markdown'` \| `'none'` | `'xml'` | Delimiter style |

#### Examples

**Custom edge cases:**

```xml
<EdgeCases>
  <When condition="input is empty" then="Return a helpful error message" />
  <When condition="input contains special characters">
    Sanitize the input before processing
  </When>
</EdgeCases>
```

Produces:

```
<edge-cases>
<when>
When input is empty: Return a helpful error message
</when>
<when>
When input contains special characters: Sanitize the input before processing
</when>

</edge-cases>
```

**Using a preset:**

```xml
<EdgeCases preset="standard" />
```

Produces:

```
<edge-cases>
When input is missing required data: Ask the user to provide the missing information
When request is outside your expertise: Acknowledge limitations and suggest alternative resources
When multiple valid interpretations exist: List the interpretations and ask for clarification

</edge-cases>
```

The `minimal` preset includes a single case: "When input is unclear: Ask for clarification."

---

### When

Describes a single conditional scenario. You typically use it inside `<EdgeCases>`.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `condition` | `string` | *(required)* | The situation description |
| `then` | `string` | — | What to do (or use children instead) |
| `delimiter` | `'xml'` \| `'markdown'` \| `'none'` | `'xml'` | Delimiter style |

#### Example

```xml
<When condition="the user provides no code"
      then="ask them to paste the code they want reviewed" />
```

Produces:

```
<when>
When the user provides no code: ask them to paste the code they want reviewed
</when>
```

---

### Fallbacks

Groups `<Fallback>` tags that describe what the AI should do when something goes wrong.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `preset` | `'standard'` | — | Use the standard fallback preset |
| `extend` | `boolean` | — | Add to a preset instead of replacing it |
| `delimiter` | `'xml'` \| `'markdown'` \| `'none'` | `'xml'` | Delimiter style |

#### Examples

**Custom fallbacks:**

```xml
<Fallbacks>
  <Fallback when="unable to find an answer"
            then="Suggest related topics the user might explore" />
  <Fallback when="question is outside your expertise"
            then="Recommend a more appropriate resource" />
</Fallbacks>
```

Produces:

```
<fallbacks>
<fallback>
If unable to find an answer, then Suggest related topics the user might explore
</fallback>
<fallback>
If question is outside your expertise, then Recommend a more appropriate resource
</fallback>

</fallbacks>
```

**Using a preset:**

```xml
<Fallbacks preset="standard" />
```

Produces:

```
<fallbacks>
If unable to complete the request, then explain why and suggest alternatives
If missing required information, then ask clarifying questions
If encountering an error, then describe the error and suggest a fix

</fallbacks>
```

---

### Fallback

Describes a single fallback behavior. You typically use it inside `<Fallbacks>`.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `when` | `string` | *(required)* | The error condition |
| `then` | `string` | *(required)* | What to do |
| `delimiter` | `'xml'` \| `'markdown'` \| `'none'` | `'xml'` | Delimiter style |

---

## Quick Reference

| Tag | What it does |
|-----|-------------|
| `<If when="=formula">` | Shows content when a formula is true |
| `<If when={true}>` | Shows content when a value is true |
| `<If provider="anthropic">` | Shows content for a specific AI provider |
| `<If notProvider="openai">` | Shows content for all providers except one |
| `<ForEach>` | Repeats content for each item in a list |
| `<EdgeCases>` | Tells the AI how to handle unusual situations |
| `<When>` | Tells the AI about a single edge case scenario |
| `<Fallbacks>` | Tells the AI what to do when something fails |
| `<Fallback>` | Tells the AI about a single fallback strategy |

---

## Related

- [Conditional Logic](/guide/conditional-logic) -- tutorial introduction
- [Conditionals Reference](/developers/conditionals) -- complete formula function list
- [Presets](/components/presets) -- all available presets for edge cases and fallbacks
