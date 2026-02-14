# What is Pupt?

Pupt is a way to write AI prompts that you can save, improve, share, and reuse — instead of typing them from scratch every time.

## The Problem

Most AI prompts are throwaway. You type something into ChatGPT, get a result, and the prompt disappears. When you need it again, you rewrite it from memory — slightly different each time.

As you get better at prompting, this becomes frustrating. Good prompts get lost in chat history, so you can't improve what you can't find. You keep rewriting the same things — role descriptions, constraints, output formats — typed out again and again. When you discover a great prompting pattern, there's no easy way to share it with your team. And nothing matures, because each prompt starts from zero.

## What Pupt Does

Pupt lets you write prompts as files using a simple tag-based syntax. You describe the structure of your prompt — who the AI should be, what it should do, what rules to follow — and pupt turns it into well-formatted text you can send to any AI.

Here's a simple prompt file:

```xml
<Prompt name="code-review">
  <Role preset="engineer" />
  <Task>Review the following code for bugs and improvements.</Task>
  <Constraint type="must">Explain each issue clearly.</Constraint>
  <Constraint type="should">Include code examples.</Constraint>
  <Format type="markdown" />
</Prompt>
```

This produces:

```
<role>
You are a senior Software Engineer with expertise in software development,
programming, system design. You are analytical, detail-oriented, problem-solver.
</role>
<task>
Review the following code for bugs and improvements.
</task>
<constraint>
MUST: Explain each issue clearly.
</constraint>
<constraint>
SHOULD: Include code examples.
</constraint>
<format>
Output format: markdown
</format>
```

You write structured tags. Pupt handles the formatting, the repetitive setup, and the best practices.

## Why This Matters

### Prompts that improve over time

Because your prompts live in files, you can track changes, compare versions, and iterate. You tweak a word here, adjust a constraint there, and over time the prompt gets sharper. The version you use six months from now is better than the one you wrote today — because you've been refining it instead of rewriting it.

### Prompts you can share

A `.prompt` file is easy to send to a colleague, check into a repository, or publish for anyone to use. Your team can build a shared library of prompts that captures your organization's best practices — and new team members get those practices on day one. See [Using Modules](/modules/using-modules) for more on sharing and reusing prompt libraries.

### Prompts that are consistent

The tag-based syntax gives every prompt the right structure. You won't forget the constraints section or format instructions because the tags remind you what goes where. And pupt fills in [smart defaults](/guide/first-prompt) automatically — a default role, format guidance, and basic constraints appear unless you opt out.

### Prompts built from reusable pieces

Instead of writing "You are a senior software engineer..." every time, you use a [preset](/components/presets) — a single tag that expands into a well-crafted description:

```xml
<Role preset="engineer" />
```

Instead of listing the same constraints in every prompt, you import them from a shared file:

```xml
<Uses component="OurStandardConstraints" from="./team-defaults" />
```

You build sophisticated prompts from simple, well-tested pieces. Each piece works on its own, and they snap together cleanly.

## The Syntax

Pupt uses a tag-based syntax that looks similar to HTML. If you've ever written a web page or seen HTML, you'll feel at home:

```xml
<Prompt name="my-prompt">
  <Role>You are a helpful assistant.</Role>
  <Task>Help the user with their question.</Task>
</Prompt>
```

Tags have **names** (like `Role` and `Task`) and can have **properties** (like `type="must"`) that control their behavior. Some tags wrap content between an opening and closing pair, and others are self-closing:

```xml
<!-- Tag with content -->
<Task>Summarize this document.</Task>

<!-- Self-closing tag with properties -->
<Role preset="engineer" />
<Format type="markdown" />
```

You don't need to learn a programming language. The `.prompt` file format handles all the technical details for you. To explore every available tag, see the [Tags Overview](/components/).

::: tip Developer Note
If you're a developer who wants full programmatic control, you can also write prompts as `.tsx` files with explicit imports and type safety. See the [Developers](/developers/first-component) section.
:::

## How to Use It

The fastest way to get started is with the **pupt CLI**. Install it once, then use the `pt` command to search, select, and run your prompts interactively:

```bash
npm install -g pupt
pt
```

You can also use **any text editor**. Create a `.prompt` file, write your prompt using the tag syntax, and use it however you like — copy-paste into an AI chat, pipe it to a tool, or integrate it into your workflow.

## Next Steps

- [Getting Started](/guide/getting-started) — Install pupt and write your first prompt
- [Writing Your First Prompt](/guide/first-prompt) — Learn the tag syntax in depth
- [Tags Overview](/components/) — See all the tags you can use
