# Import System Refactor Design

## Overview

This document describes the refactoring of pupt-lib's `.prompt` and `.tsx` file handling to use standard ES modules instead of a custom registry-based component resolution system.

## Goals

Restore full JavaScript/TypeScript capabilities to `.tsx` files while keeping `.prompt` files simple and approachable for non-developers.

## Design Criteria

### Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| R1 | `.tsx` and `.prompt` files MUST use the same compiler | Must |
| R2 | `.tsx` and `.prompt` files MUST work the same way in browser and Node.js | Must |
| R3 | `.tsx` files MUST be able to declare a custom component in the file and use it | Must |
| R4 | `.tsx` files MUST be able to import custom components from external files | Must |
| R5 | `.tsx` and `.prompt` files MUST NOT require manually registering custom components | Must |
| R6 | `.tsx` files SHOULD stay as close to React/JSX conventions as possible | Should |
| R7 | `.prompt` files MUST NOT expose users to JavaScript syntax | Must |
| R8 | `.prompt` files MUST be able to import custom components with `<Uses>` | Must |
| R9 | Both file types MUST support imports from URL, local file, and npm package | Must |
| R10 | Browser local file imports MUST provide a user-friendly error | Must |

### Non-Goals

- Supporting dynamic `import()` inside component code
- Hot module reloading
- Source maps for transformed code (can be added later)

## Current Architecture Problems

### Problem 1: `new Function()` Evaluation

The current system uses `new Function()` to evaluate transformed code:

```typescript
// src/create-prompt.ts:199
const evalFn = new Function(...contextKeys, processedCode);
evalFn(...contextValues);
```

This creates an isolated execution context with **no module system**. Import statements cannot work because:
1. `import` is not valid syntax inside a function body
2. The execution context has no access to the module loader

### Problem 2: Manual Component Injection

To work around the lack of imports, all built-in components are manually injected into the evaluation context:

```typescript
const evalContext = {
  jsx, jsxs, Fragment,
  Prompt, Role, Task, Section, // ... 40+ components
  ...scope,
};
```

This requires:
- Maintaining a list of all components in `create-prompt.ts`
- A component registry for string-based lookups at render time
- Special handling that differs from standard ES modules

### Problem 3: External Imports Don't Work

The current code strips `pupt-lib` imports but leaves others, which then fail:

```typescript
const processedCode = code
  .replace(/import\s*\{[^}]*\}\s*from\s*["']pupt-lib\/jsx-runtime["'];?/g, '')
  .replace(/import\s*\{[^}]*\}\s*from\s*["']pupt-lib["'];?/g, '')
  // Other imports are left in and will cause ReferenceError
```

### Problem 4: `<Uses>` Does Nothing

The `<Uses>` component exists but returns `null` - it doesn't actually load anything:

```typescript
// src/components/meta/Uses.ts
render(_props: UsesProps, _context: RenderContext): PuptNode {
  // Uses is a dependency declaration - parsed but not rendered
  return null;
}
```

## Design Decisions

### Decision 1: Use Real ES Modules via Dynamic `import()`

**Decision:** Replace `new Function()` evaluation with dynamic `import()` using Blob URLs.

**Rationale:**
- Modern browsers and Node.js (14+) support `import()` with Blob/data URLs
- This gives us real ES module semantics - imports work natively
- No need for custom module resolution logic
- Standard, well-understood behavior

**Implementation:**
```typescript
async function evaluateAsModule(code: string): Promise<PuptElement> {
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    const module = await import(url);
    return module.default;
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

### Decision 2: Inject Imports into `.prompt` Files

**Decision:** For `.prompt` files, automatically inject `import` statements for all built-in components.

**Rationale:**
- Makes `.prompt` files equivalent to `.tsx` files after preprocessing
- No need for a component registry
- Standard ES module resolution handles everything
- Keeps `.prompt` files simple for users (no JS syntax required)

**Implementation:**
```typescript
function preprocessPromptFile(source: string): string {
  return `
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from 'pupt-lib/jsx-runtime';
import {
  Prompt, Role, Task, Section, Context, Constraint, Format,
  Audience, Tone, SuccessCriteria, Criterion,
  If, ForEach,
  Code, Data, File, Json, Xml,
  Example, Examples, ExampleInput, ExampleOutput,
  Steps, Step,
  Ask,
  // ... all built-in components
} from 'pupt-lib';

export default (
${source}
);
`;
}
```

### Decision 3: Transform `<Uses>` to `import` via Babel Plugin

**Decision:** Create a Babel plugin that transforms `<Uses>` elements into `import` declarations.

**Rationale:**
- `<Uses>` cannot be a runtime component because imported components must be defined before JSX evaluation
- A Babel plugin handles this at the right phase (compile time)
- The transformation is simple and predictable
- Users get the XML-like syntax they expect in `.prompt` files

**Why not a runtime component?**
```xml
<Uses component="CustomCard" from="my-lib" />
<CustomCard>Hello</CustomCard>
```

After Babel (without plugin):
```javascript
_jsx(Uses, { component: "CustomCard", from: "my-lib" });
_jsx(CustomCard, { ... });  // ReferenceError: CustomCard is not defined
```

The `CustomCard` identifier is evaluated immediately when the JS runs. The `Uses` component's render method runs later - too late to define the identifier.

**Syntax:**
```xml
<!-- Import a named export -->
<Uses component="CustomCard" from="my-lib" />

<!-- Import with alias -->
<Uses component="Card" as="CustomCard" from="my-lib" />

<!-- Import default export -->
<Uses default="CustomCard" from="my-lib" />

<!-- Import multiple components -->
<Uses component="Card, Button, Input" from="my-lib" />
```

**Transforms to:**
```javascript
import { CustomCard } from "my-lib";
import { Card as CustomCard } from "my-lib";
import CustomCard from "my-lib";
import { Card, Button, Input } from "my-lib";
```

### Decision 4: Remove Component Registry

**Decision:** Eliminate the component registry entirely.

**Rationale:**
- With real ES modules, components are resolved by the module loader
- No need for string-based lookups at render time
- Simplifies the codebase
- Aligns with React/JSX conventions

### Decision 5: Use Import Maps for Browser Support

**Decision:** Require/generate import maps for browser environments.

**Rationale:**
- Browsers need import maps to resolve bare specifiers like `pupt-lib`
- Import maps are a web standard
- We already have `browser-support.ts` with import map generation utilities

**Implementation:**
```html
<script type="importmap">
{
  "imports": {
    "pupt-lib": "https://esm.sh/pupt-lib@1.0.0",
    "pupt-lib/jsx-runtime": "https://esm.sh/pupt-lib@1.0.0/jsx-runtime"
  }
}
</script>
```

### Decision 6: Unified Pipeline

**Decision:** Both `.prompt` and `.tsx` files go through the same pipeline with minimal differences.

```
.prompt file                              .tsx file
     │                                         │
     ▼                                         │
[Preprocess]                                   │
 - Inject imports for built-ins                │
 - Wrap with export default                    │
     │                                         │
     └─────────────────┬───────────────────────┘
                       ▼
               [Babel Transform]
                - TypeScript preset
                - JSX transform (automatic runtime)
                - Uses→import plugin
                       │
                       ▼
               [Dynamic import()]
                - Create Blob URL
                - import() as ES module
                - Return default export
```

## Detailed Design

### 1. File: `src/services/preprocessor.ts` (New)

Handles preprocessing of `.prompt` files before Babel transformation.

```typescript
interface PreprocessOptions {
  filename: string;
  builtinComponents: string[];
}

function preprocessSource(source: string, options: PreprocessOptions): string;
function isPromptFile(filename: string): boolean;
function needsPreprocessing(source: string): boolean;
```

**Responsibilities:**
- Detect if source needs preprocessing (no `import` statements, no `export default`)
- Inject imports for built-in components
- Wrap source with `export default`

### 2. File: `src/services/babel-plugins/uses-to-import.ts` (New)

Babel plugin that transforms `<Uses>` elements to `import` declarations.

```typescript
interface UsesPluginOptions {
  // Future: could add options for import map validation, etc.
}

function usesToImportPlugin({ types: t }): babel.PluginObj;
```

**Handles:**
- `<Uses component="X" from="source" />` → `import { X } from "source"`
- `<Uses component="X" as="Y" from="source" />` → `import { X as Y } from "source"`
- `<Uses default="X" from="source" />` → `import X from "source"`
- `<Uses component="A, B, C" from="source" />` → `import { A, B, C } from "source"`

**Edge cases:**
- Error if `from` prop is missing
- Error if neither `component` nor `default` is specified
- Remove the `<Uses>` element from JSX output after extracting import

### 3. File: `src/services/transformer.ts` (Modified)

Update to include the `uses-to-import` plugin.

```typescript
function getTransformOptions(filename: string): Record<string, unknown> {
  return {
    presets: ['typescript'],
    filename,
    plugins: [
      ['transform-react-jsx', {
        runtime: 'automatic',
        importSource: 'pupt-lib',
      }],
      usesToImportPlugin,  // Add this
    ],
  };
}
```

### 4. File: `src/services/module-evaluator.ts` (New)

Handles ES module evaluation via dynamic import.

```typescript
interface EvaluateOptions {
  filename: string;
}

async function evaluateModule(code: string, options: EvaluateOptions): Promise<unknown>;
```

**Responsibilities:**
- Create Blob URL from code
- Execute `import()`
- Clean up Blob URL
- Handle errors with helpful messages
- Detect environment (browser vs Node.js) and use appropriate strategy

**Browser implementation:**
```typescript
const blob = new Blob([code], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
try {
  return await import(url);
} finally {
  URL.revokeObjectURL(url);
}
```

**Node.js implementation:**
```typescript
// Node.js supports data URLs for import()
const dataUrl = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
return await import(dataUrl);
```

### 5. File: `src/create-prompt.ts` (Modified)

Simplify to use the new pipeline.

```typescript
export async function createPromptFromSource(
  source: string,
  filename: string,
  options: CreatePromptOptions = {},
): Promise<PuptElement> {
  // 1. Preprocess if needed (.prompt file or raw JSX)
  let processedSource = source;
  if (isPromptFile(filename) || needsPreprocessing(source)) {
    processedSource = preprocessSource(source, {
      filename,
      builtinComponents: BUILTIN_COMPONENTS,
    });
  }

  // 2. Babel transform (includes Uses→import plugin)
  const transformer = new Transformer();
  const code = await transformer.transformSourceAsync(processedSource, filename);

  // 3. Evaluate as ES module
  const module = await evaluateModule(code, { filename });

  if (!module.default) {
    throw new Error(`${filename} must have a default export`);
  }

  return module.default;
}
```

**Removed:**
- Manual component injection into eval context
- Import stripping regex
- `new Function()` evaluation

### 6. File: `src/components/meta/Uses.ts` (Modified)

Update to be a no-op component (Babel plugin handles the real work).

```typescript
export class Uses extends Component<UsesProps> {
  static schema = usesSchema;

  render(_props: UsesProps, _context: RenderContext): PuptNode {
    // This component is transformed to an import statement by Babel.
    // If render() is called, it means the Babel plugin didn't run,
    // which is a configuration error.
    console.warn(
      'Warning: <Uses> was rendered instead of transformed. ' +
      'Ensure the uses-to-import Babel plugin is configured.'
    );
    return null;
  }
}
```

Update schema to match new syntax:

```typescript
export const usesSchema = z.object({
  component: z.string().optional(),  // Named export(s)
  default: z.string().optional(),    // Default export
  as: z.string().optional(),         // Alias for component
  from: z.string(),                  // Module specifier (required)
}).refine(
  data => data.component || data.default,
  { message: 'Either "component" or "default" must be specified' }
);
```

### 7. File: `src/render.ts` (Modified)

Simplify render to remove string-based component lookup.

```typescript
function renderElement(element: PuptElement, context: RenderContext): string {
  const { type, props, children } = element;

  // Type should always be a function/class now, not a string
  if (typeof type === 'string') {
    // String types are only for HTML-like elements or errors
    return renderUnknownElement(type, props, children, context);
  }

  // Normal path: type is a component class or function
  return renderComponent(type, props, children, context);
}
```

### 8. Remove Component Registry

Delete `src/services/component-registry.ts` and all references to it. The registry is no longer needed since ES modules handle all component resolution.

### 9. Browser Import Maps

For browser usage, document and provide utilities for import map generation.

**Required imports for pupt-lib:**
```json
{
  "imports": {
    "pupt-lib": "https://esm.sh/pupt-lib@VERSION",
    "pupt-lib/jsx-runtime": "https://esm.sh/pupt-lib@VERSION/jsx-runtime",
    "zod": "https://esm.sh/zod@VERSION"
  }
}
```

**API for generating import maps:**
```typescript
// src/services/browser-support.ts (already exists, extend)
function generatePuptImportMap(options: {
  version: string;
  cdn?: CdnProvider;
  additionalImports?: Record<string, string>;
}): ImportMap;
```

### 10. Error Handling

Provide helpful errors for common issues:

**Browser local file import:**
```typescript
if (isBrowser && isLocalPath(source)) {
  throw new Error(
    `Cannot import local file "${source}" in browser environment. ` +
    `Use a URL (https://...) or npm package name instead.`
  );
}
```

**Missing import map:**
```typescript
// Detect and provide helpful error
if (isBrowser && error.message.includes('Failed to resolve module specifier')) {
  throw new Error(
    `Module "${specifier}" could not be resolved. ` +
    `Ensure an import map is configured. See: https://...`
  );
}
```

## Testing Plan

### Unit Tests

1. **Preprocessor tests** (`test/unit/services/preprocessor.test.ts`)
   - Injects correct imports for built-ins
   - Wraps with export default
   - Handles edge cases (empty file, already has imports, etc.)

2. **Babel plugin tests** (`test/unit/services/babel-plugins/uses-to-import.test.ts`)
   - Transforms `<Uses component="X" from="y" />`
   - Transforms `<Uses default="X" from="y" />`
   - Transforms `<Uses component="X" as="Y" from="y" />`
   - Transforms multiple components
   - Errors on missing `from`
   - Errors on missing `component`/`default`
   - Removes `<Uses>` from JSX output

3. **Module evaluator tests** (`test/unit/services/module-evaluator.test.ts`)
   - Evaluates simple module
   - Returns default export
   - Handles import statements
   - Provides helpful errors

4. **Integration tests** (`test/unit/create-prompt.test.ts`)
   - `.prompt` file with built-in components
   - `.prompt` file with `<Uses>`
   - `.tsx` file with imports
   - `.tsx` file with inline custom components
   - `.tsx` file with class-based custom components

### Browser Tests

1. **Import map tests** (`test/browser/import-maps.browser.test.ts`)
   - Resolves `pupt-lib` via import map
   - Resolves external packages via import map
   - Provides helpful error without import map

2. **End-to-end tests** (`test/browser/create-prompt.browser.test.ts`)
   - `.prompt` file renders correctly
   - `<Uses>` with URL import works
   - Error on local file import

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/preprocessor.ts` | Create | Preprocessing for .prompt files |
| `src/services/babel-plugins/uses-to-import.ts` | Create | Babel plugin for Uses→import |
| `src/services/module-evaluator.ts` | Create | ES module evaluation via import() |
| `src/services/transformer.ts` | Modify | Add uses-to-import plugin |
| `src/create-prompt.ts` | Modify | Simplify to use new pipeline |
| `src/components/meta/Uses.ts` | Modify | Update schema, add warning |
| `src/render.ts` | Modify | Remove registry usage |
| `src/services/component-registry.ts` | Delete | No longer needed |
| `src/services/scope.ts` | Delete | No longer needed |
| `src/services/scope-loader.ts` | Delete | No longer needed |
| `src/services/browser-support.ts` | Modify | Add pupt-lib import map helper |
| `src/index.ts` | Modify | Remove registry/scope exports |
| `src/components/index.ts` | Modify | Remove registry registration |

## Open Questions

1. **Namespace imports:** Should `<Uses namespace="Lib" from="x" />` be supported for `import * as Lib from "x"`?

2. **Re-exports:** If a `.tsx` file imports from another `.tsx` file, should that work? (Requires the imported file to be pre-compiled or served as ES module)

3. **Source maps:** Should we generate source maps for debugging? (Can be added later)

## References

- [ES Modules in Browsers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Import Maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap)
- [Dynamic import()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)
- [Babel Plugin Handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md)
