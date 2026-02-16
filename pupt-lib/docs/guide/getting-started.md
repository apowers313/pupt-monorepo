# Getting Started

This guide walks you through installing pupt, writing your first prompt, and running it. No programming experience required.

## Install Pupt

Install the pupt command-line tool:

```bash
npm install -g pupt
```

Then set it up:

```bash
pt init
```

This walks you through a few questions about where to store your prompts and which AI tool you use. You only need to do this once.

::: tip Don't have npm?
npm comes with [Node.js](https://nodejs.org/). Download the latest version and install it -- npm is included automatically.
:::

## Write Your First Prompt

Create a file called `greeting.prompt` in your prompts directory:

```xml
<Prompt name="greeting">
  <Role>You are a friendly assistant who speaks in a warm, welcoming tone.</Role>
  <Task>Greet the user and ask how you can help them today.</Task>
</Prompt>
```

Each tag has a clear job. `<Prompt>` wraps your entire prompt and gives it a name. `<Role>` tells the AI who it should be. `<Task>` tells the AI what to do. You can explore every available tag in the [Tags Overview](/components/).

## Run It

```bash
pt
```

Select your greeting prompt from the list. Pupt turns your tags into a well-formatted prompt and sends it to your AI tool.

Here's what the AI actually receives:

```
<role>
You are a friendly assistant who speaks in a warm, welcoming tone.
</role>
<task>
Greet the user and ask how you can help them today.
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

Notice that pupt added `<format>` and `<constraints>` sections automatically. You only wrote a role and a task, but pupt filled in sensible defaults for the sections you left out. You get a well-structured prompt from just a few lines.

## Add Rules

Use `<Constraint>` to set rules the AI should follow. The `type` property controls how strongly the rule is enforced:

```xml
<Prompt name="greeting">
  <Role>You are a friendly assistant who speaks in a warm, welcoming tone.</Role>
  <Task>Greet the user and ask how you can help them today.</Task>
  <Constraint type="must">Keep the greeting under 50 words.</Constraint>
</Prompt>
```

When you provide your own `<Constraint>` tags, pupt skips the default constraints and uses yours instead. Learn more about constraints and other structural tags in [Writing Your First Prompt](/guide/first-prompt).

## Try a Preset

Instead of writing your own role description, try a preset -- a ready-made configuration based on prompt engineering best practices:

```xml
<Prompt name="code-review">
  <Role preset="engineer" />
  <Task>Review the following code for bugs and improvements.</Task>
  <Constraint type="must">Explain each issue clearly.</Constraint>
  <Format type="markdown" />
</Prompt>
```

The `<Role preset="engineer" />` tag expands into a detailed software engineer persona with relevant expertise and traits. There are presets for [many roles](/components/presets) -- writer, analyst, teacher, designer, and more.

## Collect Input

Prompts can ask for information when they run. Add an `Ask` tag to collect input:

```xml
<Prompt name="greeting">
  <Role>You are a friendly assistant.</Role>
  <Task>
    Greet the user named <Ask.Text name="userName" label="User's name" />
    warmly and ask how you can help them today.
  </Task>
</Prompt>
```

When you run this prompt, pupt asks for the user's name and inserts it into the right place. There are many input types -- text, numbers, choices, file paths, and more. See [Variables & Inputs](/guide/variables-and-inputs).

## Disable Defaults

If you want full control over your prompt with no auto-generated sections, use `bare`:

```xml
<Prompt name="custom" bare>
  <Role>You are a helpful assistant.</Role>
  <Task>Help the user.</Task>
</Prompt>
```

This outputs only what you write -- no extra format or constraint sections.

## What to Learn Next

You now know the basics: write tags, run prompts, use presets. Here's where to go deeper:

- [Writing Your First Prompt](/guide/first-prompt) -- Learn all the structural tags and how to combine them
- [Variables & Inputs](/guide/variables-and-inputs) -- Collect user input and use it throughout your prompt
- [Tags Overview](/components/) -- Browse every tag available in pupt
- [Presets](/components/presets) -- See all the built-in role, task, and constraint presets
