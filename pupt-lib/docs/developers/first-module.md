# Writing Modules

Modules let you share components across prompts and projects. Any file that exports one or more components -- whether class-based or function-based -- is a module. This page walks you through creating modules, importing them, and structuring your exports.

## Creating a Module

The simplest module is just a file that exports a component:

```typescript
// my-components.ts
import { Component } from 'pupt-lib';
import type { PuptNode } from 'pupt-lib';

export class Greeting extends Component<{ who: string }> {
  render({ who }: { who: string }): PuptNode {
    return `Hello, ${who}!`;
  }
}
```

That's it -- export a component and you have a module.

---

## Importing with `<Uses>`

In `.prompt` files, you import components with the `<Uses>` tag. The compiler transforms each `<Uses>` into a standard JavaScript `import` statement, so you get full module semantics without writing raw imports.

**Named export** (most common):

```xml
<Uses component="Greeting" from="./my-components" />
```

Compiles to: `import { Greeting } from "./my-components"`

**Multiple named exports:**

```xml
<Uses component="Header, Footer, Sidebar" from="./my-components" />
```

Compiles to: `import { Header, Footer, Sidebar } from "./my-components"`

**Default export:**

```xml
<Uses default="Layout" from="./my-components" />
```

Compiles to: `import Layout from "./my-components"`

**Aliased import:**

```xml
<Uses component="Card" as="MyCard" from="./my-components" />
```

Compiles to: `import { Card as MyCard } from "./my-components"`

### `.prompt` vs `.tsx`

If you're writing `.tsx` files instead of `.prompt` files, you use standard `import` statements directly -- they work the same way:

```
.prompt file:  <Uses component="Warning" from="./my-lib" />
.tsx file:     import { Warning } from './my-lib';
```

---

## Import Sources

The `from` attribute tells pupt-lib where to find the module. You can point it at local files, npm packages, URLs, or even GitHub repositories:

| Source | Example | Notes |
|--------|---------|-------|
| Local file (relative) | `from="./my-components"` | Relative to the current file |
| Local file (absolute) | `from="/home/user/libs/components"` | Node.js only |
| npm package | `from="@acme/prompt-components"` | Installed via `npm install` |
| npm + version | `from="@acme/prompt-components@1.2.0"` | Pinned version |
| Package subpath | `from="@acme/components/alerts"` | Specific export within a package |
| URL | `from="https://cdn.example.com/components.js"` | Direct URL to an ES module |
| GitHub | `from="github:acme/components#v1.0.0"` | GitHub raw content; `#ref` is optional (defaults to `main`) |

### Local Files

The simplest approach is pointing to a `.ts` or `.js` file in your project. Relative paths resolve from the directory of the importing file:

```xml
<Uses component="Greeting" from="./my-components" />
<Uses component="Layout" from="../shared/layout" />
```

### npm Packages

When you want to share components across projects, publish them as an npm package and import directly:

```xml
<Uses component="Callout, Summary" from="@acme/prompt-components" />
```

You can pin a specific version to lock down behavior. If two modules try to load different versions of the same package, pupt-lib throws a version conflict error, so pinning helps you catch mismatches early:

```xml
<Uses component="Callout" from="@acme/prompt-components@1.2.0" />
```

### Package Subpaths

Larger packages often organize their exports into subpaths. You can import from a specific subpath to pull in only what you need:

```xml
<Uses component="DangerAlert" from="@acme/components/alerts" />
<Uses component="BarChart" from="@acme/components/charts" />
```

### URLs

You can load an ES module directly from any URL, which makes CDNs a convenient option for sharing components without npm:

```xml
<!-- esm.sh (recommended) -->
<Uses component="Callout" from="https://esm.sh/@acme/prompt-components@1.0.0" />

<!-- unpkg -->
<Uses component="Callout" from="https://unpkg.com/@acme/prompt-components@1.0.0" />

<!-- jsdelivr -->
<Uses component="Callout" from="https://cdn.jsdelivr.net/npm/@acme/prompt-components@1.0.0" />
```

### GitHub

The `github:` prefix provides shorthand for loading from a GitHub repository. It resolves to `https://raw.githubusercontent.com/{user}/{repo}/{ref}/index.js`, where `ref` defaults to `main` if you omit it:

```xml
<Uses component="ReviewChecklist" from="github:acme/prompt-components" />
<Uses component="ReviewChecklist" from="github:acme/prompt-components#v2.0.0" />
<Uses component="ReviewChecklist" from="github:acme/prompt-components#develop" />
```

---

## Exporting Components

### Named Exports

Named exports are the most common pattern. You export each component individually, and consumers pick the ones they need:

```typescript
// my-components.ts
export class Warning extends Component<{ children?: PuptNode }> {
  render({ children }: { children?: PuptNode }): PuptNode {
    return `WARNING: ${children}`;
  }
}

export class Info extends Component<{ children?: PuptNode }> {
  render({ children }: { children?: PuptNode }): PuptNode {
    return `INFO: ${children}`;
  }
}
```

Then import the ones you need:

```xml
<Uses component="Warning" from="./my-components" />
<Uses component="Warning, Info" from="./my-components" />
```

### Default Exports

When a module contains a single component, a default export keeps things clean:

```typescript
// layout.ts
export default class Layout extends Component<{ children?: PuptNode }> {
  render({ children }: { children?: PuptNode }): PuptNode {
    return `=== Layout ===\n${children}\n=== End ===`;
  }
}
```

```xml
<Uses default="Layout" from="./layout" />
```

### Barrel Exports

As your library grows, you can re-export everything from a single index file. This gives consumers one import path for all your components:

```typescript
// index.ts
export { Warning } from './Warning';
export { Info } from './Info';
export { Layout } from './Layout';
```

```xml
<Uses component="Warning, Info, Layout" from="./my-lib" />
```

---

## Full Example

Here's a complete module with two components -- one class-based with schema validation, one function-based -- and a prompt that uses them:

**Module file** (`components.ts`):

```typescript
import { Component } from 'pupt-lib';
import type { PuptNode } from 'pupt-lib';
import { z } from 'zod';

const badgeSchema = z.object({
  label: z.string(),
  color: z.enum(['green', 'yellow', 'red']).optional(),
});

type BadgeProps = z.infer<typeof badgeSchema>;

export class Badge extends Component<BadgeProps> {
  static schema = badgeSchema;

  render({ label, color }: BadgeProps): PuptNode {
    const icon = { green: '+', yellow: '~', red: '!' }[color ?? 'green'];
    return `[${icon} ${label}]`;
  }
}

export function Separator(): string {
  return '---';
}
```

**Prompt file** (`my-prompt.prompt`):

```xml
<Uses component="Badge, Separator" from="./components" />

<Prompt name="status-report">
  <Task>Generate a project status report.</Task>
  <Context>
    Current status: <Badge label="On Track" color="green" />
    <Separator />
    Include sections for progress, risks, and next steps.
  </Context>
</Prompt>
```

---

## Related

- [Writing Components](/developers/first-component) — function and class component patterns
- [Creating Modules](/developers/creating-modules) — publishing npm packages
- [Using Modules](/modules/using-modules) — user-facing guide to imports
