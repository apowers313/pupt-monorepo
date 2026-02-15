# Prompts vs. Components

You can share two types of things: **prompts** and **components** (custom tags). Understanding the difference helps you decide what to create and how to share it.

## Prompts

Prompts are complete prompt templates. They are:

- Written as `.prompt` files (no JavaScript required)
- Placed in a `prompts/` directory
- Discovered automatically by pupt-lib
- Searchable by name, tags, and description

A `.prompt` file is self-contained -- all built-in tags are available automatically:

```xml
<Prompt name="code-review" description="Review code for quality" tags={["code"]}>
  <Role>You are a senior code reviewer.</Role>
  <Task>Review the provided code for quality, readability, and correctness.</Task>
</Prompt>
```

**No build step required.** Write the file, put it in `prompts/`, and it's ready to use.

## Components (Custom Tags)

Components are reusable tags that you use inside prompts. They are:

- Written as TypeScript (`.ts` / `.tsx`) files by developers
- Published as npm packages
- Imported in `.prompt` files via `<Uses>`
- Built before publishing

For example, a custom `<Callout>` tag that you can use in any prompt:

```xml
<Uses component="Callout" from="@acme/prompt-tags" />

<Prompt name="safety-guide">
  <Callout type="warning">Always wear protective equipment.</Callout>
  <Task>Write the safety guide.</Task>
</Prompt>
```

Components are for developers. If you're just writing prompts, you don't need to create them -- you only need to know how to [import them](/modules/using-modules).

## How They Work Together

A prompt can use custom tags from an npm package. A single package can ship both prompts and custom tags:

```
my-package/
├── package.json
├── prompts/            ← prompts (discovered automatically)
│   └── review.prompt
└── dist/               ← custom tags (npm package)
    └── index.js
```

But many packages ship only prompts -- no JavaScript, no build step.

## When to Use Each

| | Prompts | Components (Custom Tags) |
|---|---|---|
| Who creates them | Anyone | Developers |
| File format | `.prompt` | `.ts` / `.tsx` |
| Build step | None | Required |
| Shared as | Directory of `.prompt` files | npm package |
| Use case | Complete prompt templates | Reusable tags for use inside prompts |

## What to Learn Next

- [Using Modules](/modules/using-modules) -- Import tags into your prompts
- [Publishing](/modules/publishing) -- Share your prompts and tags
- [Prompt Sources](/modules/prompt-sources) -- How prompts are discovered from different locations
