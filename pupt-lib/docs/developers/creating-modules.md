# Creating Modules

You can package your components and prompts as npm packages so others can install and reuse them. This guide walks you through the project structure, configuration, and publishing workflow.

## Project Structure

A typical component library looks like this:

```
my-prompt-components/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Re-exports all components
│   ├── Callout.tsx
│   └── Summary.tsx
└── dist/
    └── index.js          # Built output
```

## package.json

```json
{
  "name": "@acme/prompt-components",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  }
}
```

Always list `pupt-lib` as a peer dependency, never a direct dependency. This ensures a single copy of pupt-lib at runtime, which avoids duplicate symbol issues. Set `"type": "module"` so Node.js treats your package as ESM. Include `"types"` so consumers get full TypeScript type checking.

## Entry Point

Re-export all your components from a single `index.ts`. This gives consumers a clean import path and lets the module loader discover your components automatically:

```typescript
// src/index.ts
export { Callout } from './Callout';
export { Summary } from './Summary';
```

## Writing the Components

Your components import from `pupt-lib` (the public API), never from internal paths like `pupt-lib/src/...`. This keeps your module compatible across pupt-lib versions.

```tsx
// src/Callout.tsx
import { Component, wrapWithDelimiter } from 'pupt-lib';
import type { PuptNode, RenderContext } from 'pupt-lib';
import { z } from 'zod';

const calloutSchema = z.object({
  type: z.enum(['info', 'warning', 'error']),
});

type CalloutProps = z.infer<typeof calloutSchema> & { children?: PuptNode };

export class Callout extends Component<CalloutProps> {
  static schema = calloutSchema;

  render({ type, children }: CalloutProps, _resolved: void, context: RenderContext): PuptNode {
    const delimiter = this.getDelimiter(context);
    const prefix = { info: 'INFO', warning: 'WARNING', error: 'ERROR' }[type];
    return wrapWithDelimiter(`[${prefix}] ${children}`, 'callout', delimiter);
  }
}
```

The `render` method receives three arguments: props, a resolved value (from `resolve()` if you implement it, otherwise `void`), and the render context. Use `this.getDelimiter(context)` to respect the consumer's output format setting, and `wrapWithDelimiter` to wrap your output in the appropriate XML tags or markdown headers.

---

## Documenting Capabilities

If your components depend on specific runtime capabilities (like filesystem access or network requests), document that in your README and optionally in `package.json`. This helps consumers know whether your module works in their environment -- for example, a component that reads files won't work in a browser.

You can add a `pupt.capabilities` field to `package.json` as a convention:

```json
{
  "pupt": {
    "capabilities": ["network"]
  }
}
```

Common capabilities to document:

| Capability | Description | Node.js | Browser |
|------------|-------------|---------|---------|
| `filesystem` | Read/write files | Yes | No |
| `network` | Make HTTP requests | Yes | Yes (CORS) |
| `process` | Access process info | Yes | No |

> **Note:** This field is purely informational. pupt-lib does not read or enforce it at runtime. It exists as a convention to communicate requirements to your consumers.

---

## Build and Publish

Build your package and publish it to npm:

```bash
npm run build
npm publish --access public
```

Once published, consumers can use your components in two ways. In `.prompt` files, they declare dependencies with `<Uses>`:

```xml
<!-- In a .prompt file -->
<Uses component="Callout, Summary" from="@acme/prompt-components" />
```

In `.tsx` files, they use standard ES imports:

```tsx
// In a .tsx file
import { Callout, Summary } from '@acme/prompt-components';
```

---

## Publishing Prompts

You can also share complete prompts as a package, not just individual components. This works well for teams that want a shared library of reusable prompt templates.

### Prompt Package

A prompt-only package contains `.prompt` files and a `package.json`:

```
my-prompts/
├── package.json
├── prompts/
│   ├── code-review.prompt
│   ├── bug-report.prompt
│   └── feature-request.prompt
└── README.md
```

```json
{
  "name": "@acme/prompts",
  "version": "1.0.0",
  "type": "module",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  }
}
```

### TypeScript Prompt Package

When your prompts need complex logic or dynamic behavior, you can export JSX elements from `.tsx` files instead. Each prompt is a named export that consumers can import directly:

```tsx
// src/prompts/code-review.tsx
import { Prompt, Role, Task, Steps, Step } from 'pupt-lib';

export const codeReview = (
  <Prompt name="code-review" description="Structured code review" tags={['code', 'review']}>
    <Role preset="engineer" />
    <Task>Review the provided code for correctness, style, and performance.</Task>
    <Steps>
      <Step>Check for bugs and logic errors</Step>
      <Step>Evaluate code style and readability</Step>
      <Step>Identify performance concerns</Step>
    </Steps>
  </Prompt>
);
```

Re-export all your prompts from the package entry point:

```typescript
// src/index.ts
export { codeReview } from './prompts/code-review';
export { bugReport } from './prompts/bug-report';
```

---

## Publishing Checklist

Before you publish, run through these checks.

### Component Libraries

- [ ] All components extend `Component` or are exported as functions
- [ ] All components are re-exported from `index.ts`
- [ ] `pupt-lib` is listed in `peerDependencies` (not `dependencies`)
- [ ] README documents any runtime capabilities (filesystem, network, etc.)
- [ ] TypeScript types are exported
- [ ] Unit tests pass

### Prompt Packages

- [ ] Each prompt has a unique `name` value
- [ ] `description` and `tags` are set on each prompt
- [ ] Required inputs have clear labels
- [ ] Prompts render correctly with `render()`

---

## Related

- [Writing Components](/developers/first-component) -- building function and class components
- [Writing Modules](/developers/first-module) -- exports and imports
- [Publishing](/modules/publishing) -- user-facing publishing guide
