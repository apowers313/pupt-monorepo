# Meta Tags

Meta tags manage how your prompt files relate to external code. They handle imports and dependencies so your `.prompt` files can use components from other files and packages.

## Uses

Declares a dependency on an external component. In `.prompt` files, `<Uses>` is the way to import components — it gets transformed into a standard JavaScript `import` statement at compile time.

In `.tsx` files, you can use standard `import` statements instead — both approaches produce identical behavior.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `from` | `string` | — | Module specifier: a local path, npm package, URL, or GitHub shorthand (required) |
| `component` | `string` | — | Named export(s) to import (comma-separated for multiple) |
| `default` | `string` | — | Import the default export with this name |
| `as` | `string` | — | Alias for the imported component (single component only) |

Either `component` or `default` must be provided, but not both.

### Examples

**Named export:**

```xml
<Uses component="Warning" from="./my-components" />
```

This is equivalent to:

```tsx
import { Warning } from './my-components';
```

**Multiple named exports:**

```xml
<Uses component="Header, Footer, Sidebar" from="./my-components" />
```

Equivalent to:

```tsx
import { Header, Footer, Sidebar } from './my-components';
```

**Default export:**

```xml
<Uses default="Layout" from="./my-components" />
```

Equivalent to:

```tsx
import Layout from './my-components';
```

**Aliased import:**

```xml
<Uses component="Card" as="MyCard" from="./my-components" />
```

Equivalent to:

```tsx
import { Card as MyCard } from './my-components';
```

### Source Types

The `from` attribute supports several source types:

| Source | Example |
|--------|---------|
| Local file (relative) | `from="./my-components"` |
| Local file (absolute) | `from="/home/user/libs/components"` |
| npm package | `from="@acme/prompt-components"` |
| npm package with version | `from="@acme/prompt-components@1.2.0"` |
| Package subpath | `from="@acme/components/alerts"` |
| URL | `from="https://cdn.example.com/components.js"` |
| GitHub | `from="github:acme/components#v1.0.0"` |

### Full Example

```xml
<Uses component="Callout" from="@acme/prompt-components" />
<Uses component="ReviewChecklist" from="./shared/checklists" />

<Prompt name="code-review" bare>
  <Role preset="engineer" />
  <Task>Review the following code.</Task>
  <ReviewChecklist />
  <Callout type="warning">Flag any security issues immediately.</Callout>
</Prompt>
```

---

## Related

- [Using Modules](/modules/using-modules) — importing and using shared components
- [Publishing](/modules/publishing) — sharing your own components and prompts
- [Tags Overview](/components/) — browse all available tags
