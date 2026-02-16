# Writing Your First Prompt

In [Getting Started](/guide/getting-started), you wrote a simple prompt with a few tags and ran it. This page walks you through all the building blocks you can use to structure your prompts.

## The Building Blocks

Every prompt is made of tags that describe different parts of your instructions to the AI. Here are the main ones:

| Tag | Purpose |
|-----|---------|
| `<Prompt>` | Wraps your entire prompt |
| `<Role>` | Who the AI should be |
| `<Task>` | What the AI should do |
| `<Context>` | Background information |
| `<Constraint>` | Rules the AI should follow |
| `<Format>` | How the output should look |
| `<Section>` | Custom labeled sections |
| `<Audience>` | Who the output is for |
| `<Tone>` | The emotional quality of the output |

You don't need all of them in every prompt. Use the ones that make sense for your situation.

## Roles

The `<Role>` tag tells the AI who it should be. You can write a custom role description or use a preset.

### Custom Role

Write your own description directly inside the tag:

```xml
<Prompt name="helper" bare>
  <Role>You are a patient math tutor who explains concepts step by step.</Role>
  <Task>Help the user solve their math problem.</Task>
</Prompt>
```

This produces:

```
<role>
You are a patient math tutor who explains concepts step by step.
</role>
<task>
Help the user solve their math problem.
</task>
```

### Role Presets

Instead of writing your own role description, you can use a preset. Presets are pre-built personas based on prompt engineering best practices:

```xml
<Prompt name="code-review" bare>
  <Role preset="engineer" />
  <Task>Review this code.</Task>
</Prompt>
```

The `preset="engineer"` expands to:

```
<role>
You are a senior Software Engineer with expertise in software development,
programming, system design. You are analytical, detail-oriented, problem-solver.
</role>
<task>
Review this code.
</task>
```

There are presets for many roles:

| Preset | Title |
|--------|-------|
| `assistant` | Assistant |
| `engineer` | Software Engineer |
| `writer` | Writer |
| `analyst` | Business Analyst |
| `teacher` | Teacher |
| `designer` | Designer |
| `data-scientist` | Data Scientist |
| `consultant` | Consultant |

See the full list at [Presets](/components/presets).

## Tasks

The `<Task>` tag tells the AI what to do. Write your instructions directly inside it:

```xml
<Prompt name="summary" bare>
  <Task>Summarize the following document in 3 bullet points.</Task>
</Prompt>
```

This produces:

```
<task>
Summarize the following document in 3 bullet points.
</task>
```

## Context

Use the `<Context>` tag to give the AI background information it needs:

```xml
<Prompt name="review" bare>
  <Context>
    The application is a REST API built with Express.js.
    It handles user authentication and data storage.
  </Context>
  <Task>Suggest improvements to the architecture.</Task>
</Prompt>
```

This produces:

```
<context>
The application is a REST API built with Express.js.
It handles user authentication and data storage.
</context>
<task>
Suggest improvements to the architecture.
</task>
```

## Constraints

Constraints set rules for the AI to follow. Use the `type` property to indicate how strict each rule is:

```xml
<Prompt name="docs" bare>
  <Constraint type="must">Explain each issue clearly.</Constraint>
  <Constraint type="should">Include code examples.</Constraint>
  <Constraint type="must-not">Do not suggest removing tests.</Constraint>
</Prompt>
```

This produces:

```
<constraint>
MUST: Explain each issue clearly.
</constraint>
<constraint>
SHOULD: Include code examples.
</constraint>
<constraint>
MUST NOT: Do not suggest removing tests.
</constraint>
```

Here are the available constraint types:

| Type | Meaning |
|------|---------|
| `must` | Required — the AI must follow this rule |
| `should` | Recommended — the AI should follow this if possible |
| `must-not` | Forbidden — the AI must not do this |
| `may` | Optional — the AI can do this if appropriate |
| `should-not` | Discouraged — the AI should avoid this |

## Format

The `<Format>` tag tells the AI how to structure the output:

```xml
<Prompt name="report" bare>
  <Task>Write a summary of the meeting.</Task>
  <Format type="markdown" />
</Prompt>
```

This produces:

```
<task>
Write a summary of the meeting.
</task>
<format>
Output format: markdown
</format>
```

The available format types are `markdown`, `json`, `xml`, `text`, `code`, `yaml`, `csv`, `list`, and `table`.

## Sections

When you need a section that doesn't match any built-in tag, use `<Section>` to create your own:

```xml
<Prompt name="review" bare>
  <Section name="background">
    This project uses TypeScript and React.
  </Section>
  <Task>Review the code.</Task>
</Prompt>
```

This produces:

```
<background>
This project uses TypeScript and React.
</background>
<task>
Review the code.
</task>
```

## Audience and Tone

Tell the AI who the output is for and how it should sound.

You can describe your audience as free-form text, or use the `level` and `type` properties for built-in guidance:

```xml
<Prompt name="tutorial" bare>
  <Audience level="beginner" type="general" />
  <Tone type="friendly" formality="informal" />
  <Task>Explain how REST APIs work.</Task>
</Prompt>
```

The `<Audience>` tag produces:

```
<audience>
Target audience: beginner general users

Use simple language, avoid jargon, and provide analogies where helpful.
</audience>
```

The `<Tone>` tag produces:

```
<tone>
Tone: friendly
Be warm, approachable, and supportive.
Voice characteristics: formality: informal
</tone>
```

## Smart Defaults

When you write a `<Prompt>` without certain sections, pupt fills in sensible defaults. For example, a minimal prompt:

```xml
<Prompt name="test" noRole>
  <Task>Summarize this document.</Task>
</Prompt>
```

Pupt fills in the format and constraints for you:

```
<task>
Summarize this document.
</task>
<format>
Output format: markdown
</format>
<constraints>
- Keep responses concise and focused
- Be accurate and factual
- Acknowledge uncertainty when unsure
</constraints>
```

If you don't include a `<Role>`, pupt adds one using the "assistant" preset. It also adds a default `<Format>` section and a `<Constraints>` section with sensible default rules. You only get these defaults when you leave those sections out -- if you provide your own, pupt uses yours instead.

### Controlling Defaults

You can turn off individual defaults:

```xml
<!-- Skip the default role -->
<Prompt name="test" noRole>
  <Task>Help the user.</Task>
</Prompt>

<!-- Skip the default format -->
<Prompt name="test" noFormat>
  <Task>Help the user.</Task>
</Prompt>

<!-- Skip the default constraints -->
<Prompt name="test" noConstraints>
  <Task>Help the user.</Task>
</Prompt>
```

Or turn off everything at once with `bare`:

```xml
<Prompt name="simple" bare>
  <Role>You are a helpful assistant.</Role>
  <Task>Answer the user's question clearly and concisely.</Task>
</Prompt>
```

This produces only what you write:

```
<role>
You are a helpful assistant.
</role>
<task>
Answer the user's question clearly and concisely.
</task>
```

## Examples and Reasoning

### Providing Examples

You can show the AI exactly what you expect with input/output examples:

```xml
<Prompt name="test" bare>
  <Task>Answer factual questions briefly.</Task>
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

This produces:

```
<task>
Answer factual questions briefly.
</task>
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

### Step-by-Step Reasoning

Guide the AI through a problem one step at a time:

```xml
<Prompt name="test" bare>
  <Steps>
    <Step>Understand the requirements</Step>
    <Step>Break the problem into parts</Step>
    <Step>Solve each part</Step>
    <Step>Verify the solution</Step>
  </Steps>
</Prompt>
```

This produces:

```
Think through this step by step.

<steps>
1. Understand the requirements
2. Break the problem into parts
3. Solve each part
4. Verify the solution
</steps>
```

`<Steps>` also has presets for common reasoning patterns:

```xml
<!-- Structured analysis: Understand → Analyze → Conclude -->
<Steps preset="analysis" />

<!-- Problem solving: Define → Explore → Solve → Verify -->
<Steps preset="problem-solving" />

<!-- Debugging: Reproduce → Isolate → Fix → Verify -->
<Steps preset="debugging" />
```

### Chain of Thought

For a simpler approach, `<ChainOfThought>` encourages the AI to show its reasoning:

```xml
<Prompt name="test" bare>
  <ChainOfThought>
    Think about the problem carefully before answering.
  </ChainOfThought>
</Prompt>
```

This produces:

```
<reasoning>
Think about the problem carefully before answering.
Show your reasoning process.
</reasoning>
```

## Edge Cases and Fallbacks

You can tell the AI what to do in unusual situations:

```xml
<Prompt name="test" bare>
  <EdgeCases>
    <When condition="the user provides no code"
          then="ask them to paste the code they want reviewed" />
    <When condition="the code is in an unfamiliar language"
          then="let the user know and suggest a general review" />
  </EdgeCases>
</Prompt>
```

This produces:

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

Both `<EdgeCases>` and `<Fallbacks>` have presets for common patterns:

```xml
<!-- Handles: missing data, out-of-scope requests, ambiguity -->
<EdgeCases preset="standard" />

<!-- Handles: unable to complete, missing info, errors -->
<Fallbacks preset="standard" />
```

## Putting It All Together

Here's a complete prompt that brings together many of the tags you've learned:

```xml
<Prompt name="writing-assistant">
  <Role preset="writer" />
  <Task>Help the user improve their writing.</Task>
  <Context>
    The user is working on a blog post about technology trends.
  </Context>
  <Constraint type="must">Preserve the author's voice and style.</Constraint>
  <Constraint type="should">Suggest specific improvements, not vague advice.</Constraint>
  <Constraint type="must-not">Rewrite entire paragraphs without being asked.</Constraint>
  <Audience level="intermediate" type="general" />
  <Tone type="friendly" formality="semi-formal" />
  <Format type="markdown" />
</Prompt>
```

This produces:

```
<role>
You are an expert Writer with expertise in content creation, storytelling,
communication. You are creative, articulate, thoughtful.
</role>
<task>
Help the user improve their writing.
</task>
<context>
The user is working on a blog post about technology trends.
</context>
<constraint>
MUST: Preserve the author's voice and style.
</constraint>
<constraint>
SHOULD: Suggest specific improvements, not vague advice.
</constraint>
<constraint>
MUST NOT: Rewrite entire paragraphs without being asked.
</constraint>
<audience>
Target audience: intermediate general users

You can use technical terms but provide brief explanations when needed.
</audience>
<tone>
Tone: friendly
Be warm, approachable, and supportive.
Voice characteristics: formality: semi-formal
</tone>
<format>
Output format: markdown
</format>
```

Notice there's no extra constraints section at the end -- because you provided your own constraints, pupt skips the defaults.

## What to Learn Next

You now know all the building blocks for structuring prompts. Next, make your prompts interactive:

- [Variables & Inputs](/guide/variables-and-inputs) -- Collect user input and use it throughout your prompt
- [Conditional Logic](/guide/conditional-logic) -- Include or exclude sections based on conditions
- [Tags Overview](/components/) -- Browse every tag available in pupt
