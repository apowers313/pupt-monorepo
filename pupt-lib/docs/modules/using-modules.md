# Using Modules

Modules let you import tags created by other people into your prompts. You can reuse shared tags instead of building everything yourself.

## What Are Modules?

A module is a file or package that contains reusable tags. It could be a file in your project with custom tags, a package published by someone else, or a file hosted on GitHub or a CDN. You bring modules into your prompt with the `<Uses>` tag.

## Importing with `<Uses>`

The `<Uses>` tag tells pupt where to find external tags. Place it at the top of your `.prompt` file:

```xml
<Uses component="Greeting" from="./my-components" />

<Prompt name="welcome" bare>
  <Greeting who="Alice" />
</Prompt>
```

The `from` property tells pupt where to load the tag from. The `component` property says which tag to import.

### Import Patterns

**Import one tag:**

```xml
<Uses component="Warning" from="./my-components" />
```

**Import multiple tags:**

```xml
<Uses component="Header, Footer, Sidebar" from="./my-components" />
```

**Import the default tag from a module:**

```xml
<Uses default="Layout" from="./my-components" />
```

**Rename a tag after importing:**

```xml
<Uses component="Card" as="MyCard" from="./my-components" />
```

## Where Modules Come From

The `from` property supports many source types:

| Source | Example |
|--------|---------|
| Local file | `from="./my-components"` |
| npm package | `from="@acme/prompt-components"` |
| npm package (pinned version) | `from="@acme/prompt-components@1.2.0"` |
| Package subpath | `from="@acme/components/alerts"` |
| URL | `from="https://esm.sh/@acme/prompt-components"` |
| GitHub | `from="github:acme/components"` |
| GitHub (pinned ref) | `from="github:acme/components#v2.0.0"` |

### Local Files

The simplest option. Point to a file in your project:

```xml
<Uses component="Greeting" from="./my-components" />
<Uses component="Layout" from="../shared/layout" />
```

### npm Packages

For packages you have installed in your project:

```xml
<Uses component="Callout, Summary" from="@acme/prompt-components" />
```

Pin a specific version if you need reproducibility:

```xml
<Uses component="Callout" from="@acme/prompt-components@1.2.0" />
```

### URLs and CDNs

Load directly from a URL without installing anything:

```xml
<!-- esm.sh -->
<Uses component="Badge" from="https://esm.sh/@acme/prompt-components@1.0.0" />

<!-- unpkg -->
<Uses component="Badge" from="https://unpkg.com/@acme/prompt-components@1.0.0" />

<!-- jsdelivr -->
<Uses component="Badge" from="https://cdn.jsdelivr.net/npm/@acme/prompt-components@1.0.0" />
```

### GitHub

Load from a GitHub repository:

```xml
<Uses component="Checklist" from="github:acme/prompt-components" />

<!-- Pin to a tag or branch -->
<Uses component="Checklist" from="github:acme/prompt-components#v2.0.0" />
```

This resolves to the raw content of the repository's `index.js` file.

## Using Imported Tags

After you import a tag, you use it just like any built-in tag:

```xml
<Uses component="Warning, Callout" from="@acme/prompt-components" />

<Prompt name="safety-guide" bare>
  <Warning level="high">
    Always wear protective equipment.
  </Warning>
  <Callout type="info">
    See the safety manual for details.
  </Callout>
</Prompt>
```

Imported tags work exactly like built-in ones. They accept properties, contain children, and produce text output.

## Complete Example

```xml
<Uses component="CodeBlock, Explanation" from="@acme/tutorial-components" />
<Uses component="ReviewChecklist" from="github:acme/review-tools#v1.0.0" />

<Prompt name="code-tutorial">
  <Role preset="teacher" />
  <Task>Teach the user about Python list comprehensions.</Task>

  <CodeBlock language="python">
squares = [x**2 for x in range(10)]
  </CodeBlock>

  <Explanation level="beginner">
    Walk through the code step by step.
  </Explanation>

  <ReviewChecklist items={['syntax', 'readability', 'efficiency']} />
</Prompt>
```

## What to Learn Next

- [Prompts vs. Components](/modules/prompts-vs-components) -- Understand the two concepts
- [Prompt Sources](/modules/prompt-sources) -- How prompts are discovered from different locations
- [Publishing](/modules/publishing) -- Share your own tags and prompts
- [Tags Overview](/components/) -- Browse all built-in tags
