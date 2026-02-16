# Tags Overview

Pupt gives you a library of tags for building prompts. Each tag handles a specific part of your prompt -- defining roles and tasks, collecting user input, controlling what appears based on conditions, and more.

This section is a reference for every built-in tag. If you're new to pupt, start with the [Guide](/guide/what-is-pupt) first.

## Categories at a Glance

| Category | Tags | What they do |
|----------|------|-------------|
| [Structural](/components/structural) | `Prompt`, `Section`, `Role`, `Task`, `Context`, `Constraint`, `Format`, `Audience`, `Tone`, `Objective`, `Style`, `Guardrails`, `EdgeCases`, `WhenUncertain`, `SuccessCriteria`, `Criterion`, `Constraints`, `Contexts`, `Specialization`, `When`, `Fallback`, `Fallbacks`, `References`, `Reference` | Define the shape and content of your prompt |
| [Ask (Inputs)](/components/ask) | `Ask.Text`, `Ask.Number`, `Ask.Select`, `Ask.Confirm`, `Ask.Editor`, `Ask.MultiSelect`, `Ask.File`, `Ask.Path`, `Ask.Date`, `Ask.Secret`, `Ask.Choice`, `Ask.Rating`, `Ask.ReviewFile`, `Ask.Option`, `Ask.Label` | Collect information from the user |
| [Control Flow](/components/control-flow) | `If`, `ForEach` | Show or hide content based on conditions |
| [Data](/components/data) | `Code`, `Data`, `File`, `Json`, `Xml` | Embed code, files, and structured data |
| [Examples](/components/examples-reasoning) | `Examples`, `Example`, `ExampleInput`, `ExampleOutput`, `NegativeExample` | Show the AI what you expect |
| [Reasoning](/components/examples-reasoning) | `Steps`, `Step`, `ChainOfThought` | Guide how the AI thinks through problems |
| [Post-Execution](/components/post-execution) | `PostExecution`, `ReviewFile`, `OpenUrl`, `RunCommand` | Trigger actions after the AI responds |
| [Utility](/components/utility) | `UUID`, `DateTime`, `Hostname`, `Username`, `Cwd`, `Timestamp` | Insert live system values |
| [Meta](/components/meta) | `Uses` | Declare dependencies on other prompt libraries |
| [Presets](/components/presets) | -- | Pre-built configurations for roles, tasks, constraints, and more |

## How to Read Reference Pages

Every reference page starts with a description of what the tag does and when you'd reach for it. Next, you'll find a properties table listing every property the tag accepts, along with its type and default value. Finally, each page includes examples that pair your tags (input) with what the AI actually sees (output).

## Common Properties

Many structural tags share these properties:

| Property | Type | Default | What it does |
|----------|------|---------|-------------|
| `delimiter` | `'xml'` \| `'markdown'` \| `'none'` | `'xml'` | Controls how the tag wraps its content |
| `preset` | `string` | -- | Uses a pre-built configuration instead of custom content |
| `extend` | `boolean` | -- | Adds to a preset instead of replacing it |

The `delimiter` property controls how your content gets wrapped. The default value `xml` wraps content in XML-style markers like `<role>...</role>`. Set it to `markdown` to use markdown headers like `## Role` instead, or `none` to output just the content with no wrapping at all.

## Presets

Many tags support presets -- pre-built configurations based on prompt engineering best practices. Instead of writing everything from scratch, you can use a preset as a starting point:

```xml
<Role preset="engineer" />
<Steps preset="debugging" />
<Guardrails preset="standard" />
```

See the [Presets](/components/presets) page for every available preset.

## Smart Defaults

The `<Prompt>` tag automatically fills in sensible defaults for `Role`, `Format`, and `Constraints` when you don't provide your own. You can turn these off with `bare`, `noRole`, `noFormat`, or `noConstraints`. See [Writing Your First Prompt](/guide/first-prompt#smart-defaults) for details.

## Where to Go Next

If you're new to pupt, start with the [Guide](/guide/what-is-pupt). Looking for a specific tag? Browse the categories in the table above. If you want to import tags from others, see [Using Modules](/modules/using-modules). And if you're ready to build your own tags, check out [Writing Custom Tags](/developers/first-component).
