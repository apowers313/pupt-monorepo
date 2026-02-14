# Examples & Reasoning

These tags help you show the AI what you expect and guide how it thinks through problems.

## Examples

Use `<Examples>` to show the AI exactly what kind of response you want. This technique is called "few-shot prompting" -- you give a few sample inputs and outputs, and the AI follows the pattern.

### Properties

No specific properties. Place `<Example>` or `<NegativeExample>` tags inside.

### Example

```xml
<Prompt name="test" bare>
  <Examples>
    <Example>
      <ExampleInput>What is 2+2?</ExampleInput>
      <ExampleOutput>4</ExampleOutput>
    </Example>
    <Example>
      <ExampleInput>What is the capital of France?</ExampleInput>
      <ExampleOutput>Paris</ExampleOutput>
    </Example>
  </Examples>
</Prompt>
```

Renders as:

```
<examples>
<example>
<input>
What is 2+2?
</input><output>
4
</output>
</example>
<example>
<input>
What is the capital of France?
</input><output>
Paris
</output>
</example>
</examples>
```

---

## Example

A single input/output pair. Place an `<ExampleInput>` and an `<ExampleOutput>` inside to define what goes in and what comes out.

### Properties

No specific properties.

---

## ExampleInput

The input portion of an example -- what the user might say or provide.

### Properties

No specific properties.

---

## ExampleOutput

The expected output -- what the AI should respond with.

### Properties

No specific properties.

---

## NegativeExample

Shows the AI what *not* to do. Add a `reason` to explain why the example is bad so the AI understands what to avoid.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `reason` | `string` | -- | Why this is a bad example |

### Example

```xml
<Examples>
  <NegativeExample reason="Too vague">
    The code has some issues.
  </NegativeExample>
</Examples>
```

Renders as:

```
<examples>
<bad-example>
The code has some issues.
Reason this is wrong: Too vague
</bad-example>
</examples>
```

---

## Steps

Guides the AI to think through a problem in ordered steps. Write your own steps or use a preset for common reasoning patterns.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `preset` | `string` | -- | Steps preset (see [Presets](/components/presets)) |
| `style` | `'step-by-step'` \| `'think-aloud'` \| `'structured'` \| `'minimal'` \| `'least-to-most'` | -- | Reasoning style |
| `showReasoning` | `boolean` | -- | Ask the AI to show its reasoning |
| `verify` | `boolean` | -- | Add a verification step |
| `selfCritique` | `boolean` | -- | Add a self-critique step |
| `extend` | `boolean` | -- | Extend a preset with additional steps |

### Examples

**Custom steps:**

```xml
<Steps>
  <Step>Read the code carefully</Step>
  <Step>Identify potential bugs</Step>
  <Step>Suggest improvements</Step>
</Steps>
```

Renders as:

```
Think through this step by step.

<steps>
1. Read the code carefully
2. Identify potential bugs
3. Suggest improvements
</steps>
```

**Using a preset:**

```xml
<Steps preset="analysis" />
```

Renders as:

```
Follow the structured approach below.

<steps>
1. Understand
2. Analyze
3. Conclude
</steps>

Show your reasoning process in the output.
```

**Other presets:**

```xml
<!-- Problem solving: Define → Explore → Solve → Verify -->
<Steps preset="problem-solving" />

<!-- Debugging: Reproduce → Isolate → Fix → Verify -->
<Steps preset="debugging" />

<!-- Code generation: Understand requirements → Design approach → Implement → Test -->
<Steps preset="code-generation" />

<!-- Research: Define scope → Gather information → Analyze findings → Synthesize -->
<Steps preset="research" />
```

See the [Presets](/components/presets) page for all available step presets.

---

## Step

A single step in a reasoning chain. Place inside `<Steps>`.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `number` | `number` | -- | Step number (auto-assigned if you leave it out) |

---

## ChainOfThought

Tells the AI to show its reasoning process. This is a simpler alternative to `<Steps>` when you don't need specific ordered steps -- you just want the AI to think out loud.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `style` | `'step-by-step'` \| `'think-aloud'` \| `'structured'` \| `'minimal'` | `'step-by-step'` | Reasoning style |
| `showReasoning` | `boolean` | `true` | Ask the AI to show its reasoning |
| `delimiter` | `'xml'` \| `'markdown'` \| `'none'` | `'xml'` | Output format for the reasoning block |

### Examples

**With custom instructions:**

```xml
<ChainOfThought>
  Think carefully about each aspect.
</ChainOfThought>
```

Renders as:

```
<reasoning>
Think carefully about each aspect.
Show your reasoning process.
</reasoning>
```

**With a style:**

```xml
<ChainOfThought style="think-aloud" />
```

Renders as:

```
<reasoning>
Reason through your thought process as you work on this.
Show your reasoning process.
</reasoning>
```

---

## When to Use What

Use `<Steps>` with custom `<Step>` tags when you want the AI to follow specific ordered steps. If you want a common reasoning pattern without writing steps yourself, use `<Steps preset="analysis" />` or one of the other presets.

Use `<ChainOfThought>` when you want the AI to show its thinking but don't need specific steps. It's lighter-weight and works well for general reasoning.

Use `<Examples>` with `<Example>` tags when you want to show the AI what good output looks like. Add `<NegativeExample>` tags when you want to show what bad output looks like.

---

## Related

- [Writing Your First Prompt](/guide/first-prompt#examples-and-reasoning) -- tutorial with examples
- [Presets](/components/presets) -- all available step presets
- [Tags Overview](/components/) -- browse all available tags
