# Design Decisions

[← Back to Index](00-index.md) | [Previous: Overview](01-overview.md) | [Next: Architecture](03-architecture.md)

---

This document captures key architectural decisions, the alternatives considered, and the rationale for each choice.

## Table of Contents

- [Component Resolution](#component-resolution)
- [Library-Based Scoping](#library-based-scoping)
- [Local Prompts: Combined Scope](#local-prompts-combined-scope)
- [Conflict Resolution: `<Scope>` Component](#conflict-resolution-scope-component)
- [Third-Party Library Detection](#third-party-library-detection)
- [Component Export Convention](#component-export-convention)
- [Environment Context API Stability](#environment-context-api-stability)
- [Conditional Input Collection](#conditional-input-collection)
- [Condition Input Access](#condition-input-access)
- [Input Validation](#input-validation)
- [Component Model](#component-model)
- [Conditional Syntax](#conditional-syntax)
- [User Input Syntax](#user-input-syntax)
- [Module Loading](#module-loading)
- [Dependency Declaration](#dependency-declaration)
- [Unified Module Loading](#unified-module-loading)

---

## Component Resolution

**Decision:** Components are resolved by string name from a scoped registry at runtime. Prompt files do not need to import components.

```tsx
// No imports needed - components resolved from registry
export default (
  <Prompt name="support">
    <Role>You are a support agent</Role>
    <Task>Help the customer</Task>
  </Prompt>
);
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Option A: Explicit Imports** | Standard JSX - import components to use them | Type-safe, familiar, no namespace conflicts | Verbose prompt files, boilerplate |
| **Option B: String-Based Lookup** | Components resolved by name from registry | Clean prompt files, no imports | Namespace conflicts, no static type checking |
| **Hybrid: Lowercase Built-ins** | Lowercase = string lookup, uppercase = import | Best of both | Two mental models, inconsistent |

**Why Option B:**
- Prompts should be clean and readable - they're the primary artifact users create
- Third-party libraries benefit from clean prompt syntax
- Namespace conflicts are solvable with scoping (see below)
- Type checking can be provided by editor plugins or build-time validation

---

## Library-Based Scoping

**Decision:** Each library gets its own component scope based on its metadata name. Components from a library are registered under that library's scope. Prompts from a library render with access to their own components plus dependencies.

```typescript
// Library defines its scope via metadata
export default {
  name: 'acme-prompts',  // This becomes the scope name
  version: '1.0.0',
  dependencies: ['@common/utils'],  // Dependencies are loaded first
};
```

**Scoping in practice:**

```
acme-prompts (loaded from URL or npm)
├── scope: "acme-prompts"
└── components available: builtins + @common/utils + own components

corp-prompts (loaded from URL or npm)
├── scope: "corp-prompts"
└── components available: builtins + own components
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Global Flat Registry** | All components in one namespace | Simple | Namespace conflicts inevitable |
| **Package.json Walking** | Derive scope from npm dependencies | Automatic | Only works for npm, not URLs |
| **Metadata-Based** | Library declares its name and dependencies | Works for URLs and npm | Requires metadata export |

**Why Metadata-Based Scoping:**
- Works for all source types: URLs, npm packages, local files
- Library author controls their scope name
- Dependencies are explicit in the library's metadata
- Conflicts resolved with `<Scope>` wrapper or `as` alias at load time

**Edge Cases Handled:**
- **Circular dependencies:** Detected via "loading" set, return partial scope
- **Name conflicts:** Use `<Scope from="lib-name">` to disambiguate
- **Missing metadata:** Scope name derived from source URL or package name

---

## Local Prompts: Combined Scope

**Decision:** Local prompts (user's own, not from npm packages) get access to all registered components from all loaded packages.

```typescript
const pupt = new Pupt({
  modules: [
    '@acme/prompts',    // Package prompts use @acme's scope
    '@corp/prompts',    // Package prompts use @corp's scope
    './my-prompts',     // Local prompts get combined scope
  ],
});
await pupt.init();
const prompts = pupt.getPrompts();
```

**Rationale:**
- Local prompts are the user's own - they should access whatever they've loaded
- User explicitly configured which libraries to load
- If conflicts occur, user can resolve with `<Scope>` wrapper

---

## Conflict Resolution: `<Scope>` Component

**Decision:** When component names conflict between packages, use the `<Scope>` wrapper to specify which package to resolve from.

```tsx
<Prompt name="my-prompt">
  <Role>...</Role>  {/* Built-in */}

  <Scope from="@acme/prompts">
    <Header>Acme header</Header>     {/* @acme/prompts:Header */}
    <Footer>Acme footer</Footer>     {/* @acme/prompts:Footer */}
  </Scope>

  <Widget scope="@corp/utils" />     {/* One-off: scope prop */}
</Prompt>
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Namespace Syntax** | `<acme$prompts:Header>` | Always explicit | Ugly syntax |
| **Config-Based Aliasing** | Rename at load time | User control | Breaks third-party cross-references |
| **`<Scope>` Wrapper** | Wrap children to set resolution scope | Clean, explicit when needed | Slight verbosity |
| **`scope` Prop** | Per-component `scope="@pkg"` | Fine-grained | Very verbose if many components |

**Why `<Scope>` + `scope` prop:**
- Only needed when conflicts exist (most prompts won't need it)
- `<Scope>` for groups, `scope` prop for one-offs
- Full package names are valid (`@acme/prompts`) - no encoding needed
- Explicit is better than implicit when disambiguation is required

**Namespace Syntax Rejected Because:**
- `<@acme/prompts:Header>` is invalid JSX (`@` and `/` not allowed in tag names)
- `<acme$prompts:Header>` works but is ugly
- Only `$` and uppercase differentiate JSX from npm (limited options)
- `<Scope>` achieves the same goal with cleaner syntax

---

## Third-Party Library Detection

**Decision:** Libraries are identified by scanning their exports when loaded via `loadModule()`. Any export that extends the `Component` base class is registered as a component. Any export that is a `<Prompt>` element is registered as a prompt.

**Detection logic:**
- **Components:** Named exports where `value.prototype instanceof Component`
- **Prompts:** Named exports where `value.type === Prompt` (JSX element check)
- **Metadata:** Default export with `{ name, version, dependencies }` (optional)

```typescript
// Module loader scans exports
for (const [exportName, exportValue] of Object.entries(module)) {
  if (isComponentClass(exportValue)) {
    // Register as component using export name
    components[exportName] = exportValue;
  } else if (isPromptElement(exportValue)) {
    // Register as prompt
    prompts[exportName] = exportValue;
  }
}
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **peerDependencies marker** | Check package.json for pupt-lib | Clear intent | Requires npm package, doesn't work for URLs |
| **Export scanning** | Check exports for Component subclasses | Works for URLs and npm, automatic | Slight runtime cost |
| **Explicit registration** | Require `registerComponent()` calls | Very explicit | Boilerplate, easy to forget |

**Why Export Scanning:**
- Works for all source types: URLs, npm packages, local files
- Zero boilerplate for library authors—just export your classes
- Automatic discovery matches the "just works" philosophy
- Component name comes from export name (no separate `name` property needed)

---

## Component Export Convention

**Decision:** Libraries export Component subclasses as named exports. Components are auto-discovered by the module loader—no explicit registration or `components` array needed.

```typescript
// @acme/prompts/src/index.ts
import { Component } from 'pupt-lib';

// Just export Component subclasses - they're auto-discovered
export class AcmeHeader extends Component<{ title: string }> {
  render({ title }) {
    return `=== ${title} ===`;
  }
}

export class AcmeFooter extends Component {
  render() {
    return '--- ACME Corp ---';
  }
}

// Optional: metadata as default export
export default {
  name: 'acme-prompts',
  version: '1.0.0',
};
```

**Rationale:**
- Zero boilerplate—just extend Component and export
- Component name is the export name (e.g., `AcmeHeader`)
- Library controls what's public via what they export
- No separate `name` property or registration call needed

---

## Environment Context API Stability

**Problem:** The `EnvironmentContext` will be baked into many prompts via `context.env`. Once prompts depend on properties like `context.env.runtime.hostname`, changing the API breaks existing prompts. However, it's too early to freeze the API - we're still learning what fields are needed.

**Decision:** Use a **proxy-based accessor pattern** (future work) that provides clean property access syntax while allowing internal changes without breaking prompts.

```typescript
// Clean property access syntax (what prompt authors write)
context.env.runtime.hostname

// Internally uses accessor (can change implementation anytime)
// Old names can be aliased to new implementations
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Versioned Namespaces** | `context.env.v1.runtime`, `context.env.v2.runtime` | Explicit versioning | Complexity, maintain forever |
| **Stable Core + Extensions** | Freeze core, put new things in `extensions` | Clear contract | Too early to know what's "core" |
| **Accessor Functions** | `context.get("hostname")` | Flexible implementation | Loses type safety, no autocomplete, typos fail silently |
| **Frozen Types + Adapter** | Never change public interface | Clean API | Can't fix naming mistakes |
| **Proxy-Based Access** | Property syntax backed by accessor | Best DX, flexible | Slight runtime overhead |

**Why Proxy-Based:**
- **Transparent to users** - Prompts use clean property access: `context.env.runtime.hostname`
- **Flexible internally** - Can rename, refactor, or alias without breaking prompts
- **Type-safe** - TypeScript still provides autocomplete and type checking
- **Discoverable** - IDE shows available properties
- **Backwards compatible** - Old property names can alias to new implementations

**Implementation Status:** Future work. Initial implementation will use plain objects. Proxy layer will be added before v1.0.0 to ensure API stability.

---

## Conditional Input Collection

**Decision:** Use an async generator that walks the component tree depth-first, yielding questions as they're encountered and receiving answers via `next(answer)`. This allows conditional inputs to be evaluated with previously-collected values.

```typescript
const iterator = inputIterator.iterate(element);
let result = await iterator.next();

while (!result.done) {
  const question = result.value;
  const answer = await askUser(question);
  result = await iterator.next(answer);
}
```

**The Problem:** Prompts can have conditional questions:

```tsx
<Ask.Select name="userType" options={[...]} />
<If when={inputs.userType === "admin"}>
  <Ask.Text name="adminCode" />  {/* Only ask if admin */}
</If>
```

We need to ask `userType` first, evaluate the condition, then maybe ask `adminCode`.

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Multi-Pass** | Get answerable questions, collect answers, repeat | Simple concept | Breadth-first ordering, disjointed UX |
| **Declarative Conditions** | `showWhen={{ field: "x", equals: "y" }}` | All questions known upfront | Limited expressiveness, no JS conditions |
| **Generator (Depth-First)** | Yield questions as encountered, receive answers | Natural ordering, full JS conditions | Can't show total question count |
| **Reactive/Observable** | Questions update as values change | Real-time, flexible | Complex, overkill for CLI |

**Why Generator:**

1. **Depth-first ordering** - Questions near each other in the tree are asked together:
   ```
   Multi-pass would ask: name → email → projectName → (jump back to) adminCode
   Generator asks:       name → adminCode → email → projectName
   ```

2. **Handles any condition** - Full JavaScript expressions, not limited DSL:
   ```tsx
   <If when={inputs.items?.length > 5 && inputs.userType === "admin"}>
   ```

3. **Natural flow** - Single pass through tree, pause at each question, continue with answer

4. **Memory efficient** - No repeated tree walks

**Tradeoff Accepted:**
- Cannot show total question count or progress bar upfront
- This is acceptable because the alternative (disjointed question ordering) is worse UX

---

## Condition Input Access

**Decision:** Condition functions receive a Proxy-wrapped object that allows natural property access (`inputs.userType`) while maintaining Map-like behavior internally.

```tsx
// This works naturally - no .get() required
<If when={inputs.userType === "admin"}>
  <Ask.Text name="adminCode" />
</If>

// Complex conditions also work
<If when={inputs.items?.length > 5 && inputs.userType === "admin"}>
  <Ask.Text name="specialCode" />
</If>
```

**The Problem:** If `inputs` is a `Map<string, unknown>`, property access silently fails:

```tsx
// Map doesn't have a .userType property - this is always undefined!
<If when={inputs.userType === "admin"}>  // ❌ Always false
```

Users must use `inputs.get("userType")` which is verbose and easy to forget.

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Document `.get()` syntax** | Require `inputs.get("userType")` | No code changes | Verbose, error-prone, silent failures |
| **Use `Record<string, unknown>`** | Plain object instead of Map | Natural property access | Loses Map benefits, mutable |
| **Proxy wrapper** | Proxy that makes Map look like object | Natural syntax, Map internals | Slight complexity |

**Why Proxy:**

1. **Natural syntax** - Users write `inputs.userType` as expected
2. **Silent failure prevention** - No undefined property access issues
3. **Type-safe** - TypeScript can type the proxy appropriately
4. **Backwards compatible** - Still works with `.get()` if someone prefers it

---

## Input Validation

**Decision:** Validation is async (supporting network calls, file system checks, etc.) and uses an explicit `current()` / `submit()` / `advance()` API rather than re-yielding requirements through the generator.

```typescript
const iterator = createInputIterator(options);
let req = await iterator.start(element);

while (req) {
  let result: ValidationResult;
  do {
    const answer = await askUser(req, result?.error);
    result = await iterator.submit(answer);
  } while (!result.valid);

  req = await iterator.advance();
}
```

**The Problem:** Validation can be complex and asynchronous:
- Check if a file exists on disk
- Verify a hostname resolves via DNS
- Check if a server is reachable
- Validate against an external API

Additionally, when validation fails:
- The UI needs to show an error and let the user retry
- The same input field should remain rendered (not be destroyed/recreated)
- Conditionals should NOT be evaluated with invalid data

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Batch validation at end** | Collect all answers, validate once before render | Simple | No immediate feedback, invalid data may affect conditionals |
| **Pass validate function to caller** | Include `validate: (v) => Promise<Result>` in requirement | Flexible | Can't serialize functions, validation logic leaks to UI layer |
| **Re-yield on validation failure** | Generator yields same requirement with error | Keeps generator pattern | UI can't tell if same question, may re-render input |
| **Explicit current/submit/advance** | Separate methods for getting requirement, validating, and advancing | Clear control flow, UI stability | More verbose API |

**Why Explicit Control Flow:**

1. **UI stability** - `current()` returns the same object until `advance()` is called. UI knows it's the same question and can update error state without re-rendering the input

2. **Validation stays in pupt-lib** - Validation logic is defined in Ask components, not passed to the caller. The caller just submits values and receives results.

3. **Conditionals only see valid data** - `advance()` only proceeds after `submit()` succeeds, so conditional evaluation always uses validated answers.

4. **Async-friendly** - `submit()` returns a Promise, naturally supporting network calls

5. **Clear retry loop** - The `do/while` pattern makes retry logic explicit and controlled by the caller.

---

## Component Model

**Decision:** Components are classes that extend a `Component<Props>` base class, rather than objects created by a factory function.

```typescript
// Class-based (chosen)
export class AcmeHeader extends Component<{ title: string }> {
  render({ title }, context) {
    return `=== ${title} ===`;
  }
}

// Factory function (rejected)
const AcmeHeader = defineComponent({
  name: 'AcmeHeader',
  render: ({ title }) => `=== ${title} ===`,
});
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Factory function** | `defineComponent({ name, render })` | Simple, functional style | Requires explicit name, no inheritance |
| **Class-based** | `class Foo extends Component` | Auto-discovery via `instanceof`, familiar OOP | Slightly more verbose |
| **Decorator-based** | `@component class Foo` | Clean syntax | Extra syntax, still needs decorator |

**Why Class-Based:**
- **Auto-discovery:** `instanceof Component` check enables automatic registration when modules are loaded
- **No explicit name:** Component name comes from the export name, not a separate property
- **Familiar pattern:** Similar to React class components, widely understood
- **Inheritance works:** Can create base components that others extend
- **Python parallel:** Similar to Python's `__init_subclass__` pattern for auto-registration

---

## Conditional Syntax

**Decision:** Conditional rendering uses Excel formula syntax, evaluated by [hot-formula-parser](https://www.npmjs.com/package/hot-formula-parser). This makes conditions accessible to non-technical users familiar with spreadsheets.

```tsx
// Excel formula syntax (chosen)
<If when='=AND(count>5, userType="admin")'>
<If when='=NOT(ISBLANK(notes))'>

// JavaScript expression (available for power users)
<If when={items.filter(i => i.priority > 3).length >= 2}>
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Natural language** | `when="userType is admin"` | Very readable | Ambiguous, hard to parse reliably |
| **Attribute-based** | `<If input="count" greaterThan={5}>` | Pure markup | Can't express complex conditions |
| **JavaScript expressions** | `when="count > 5 && type === 'admin'"` | Full power | Intimidating to non-technical users |
| **Excel formulas** | `when='=AND(count>5, type="admin")'` | Familiar to business users | Need formula parser library |

**Why Excel Formulas:**
- **Target audience:** Non-technical users are often very familiar with Excel
- **Readable:** `AND(a, b)` is clearer than `a && b` for non-programmers
- **Powerful:** Supports complex logic without learning JavaScript
- **Existing library:** hot-formula-parser handles parsing and evaluation
- **Fallback available:** JavaScript expressions still work for power users

**Supported Functions:**
- Logical: `AND`, `OR`, `NOT`
- Comparison: `=`, `<>`, `>`, `<`, `>=`, `<=`
- Text: `LEN`, `ISBLANK`, `CONTAINS`, `STARTSWITH`, `ENDSWITH`
- Date: `TODAY`, `NOW`

---

## User Input Syntax

**Decision:** User input components (`Ask.*`) support two syntaxes: child elements for simple cases (non-technical users) and JS attributes for dynamic/complex cases (power users).

```tsx
// Child elements - simple, no JavaScript knowledge needed
<Ask.Select name="framework" label="Which framework?">
  <Option value="react">React</Option>
  <Option value="vue">Vue</Option>
</Ask.Select>

// JS attributes - for dynamic data
<Ask.Select
  name="framework"
  options={frameworks.map(f => ({ value: f.id, label: f.name }))}
/>
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **JS only** | `options={[...]}` | Consistent, powerful | JavaScript syntax intimidates non-technical users |
| **Child elements only** | `<Option>` children | Pure markup | Verbose for dynamic data |
| **String parsing** | `options="React, Vue, Angular"` | Simple | Can't handle complex values or labels |
| **Hybrid (chosen)** | Child elements + JS attributes | Best of both worlds | Two ways to do the same thing |

**Why Hybrid:**
- **Progressive complexity:** Simple cases look simple, complex cases are still possible
- **Non-technical friendly:** Child elements are pure markup, no JavaScript
- **Power user friendly:** JS attributes available when needed
- **Precedent:** Similar to how HTML works (inline styles vs CSS, onclick vs addEventListener)

**Components with child element support:**
- `Ask.Select` → `<Option value="x">Label</Option>`
- `Ask.MultiSelect` → `<Option value="x">Label</Option>`
- `Ask.Rating` → `<Label value="1">Low</Label>`

---

## Module Loading

**Decision:** Libraries can be loaded from URLs, npm packages, or local paths using a unified `loadModule()` API. Components and prompts are auto-discovered by scanning module exports.

```typescript
// All source types use the same API
await loadModule('https://prompts.acme.com/v1.0.0/index.js');  // URL
await loadModule('@acme/prompts');                              // npm
await loadModule('./my-prompts/index.js');                      // local
```

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **npm only** | Require npm packages | Familiar, versioned | Non-technical users can't use npm |
| **Config file** | List libraries in YAML/JSON | Declarative | Another file to manage |
| **URL-based** | Load from any URL | Works without npm | Less discoverability |
| **Unified loadModule()** | URLs, npm, and paths | Maximum flexibility | More complex resolution logic |

**Why Unified loadModule():**
- **Non-technical users:** Can use URL-based libraries without learning npm
- **Teams:** Can host internal libraries on any web server
- **npm users:** Still works with npm packages
- **Flexibility:** Same API regardless of source

**Auto-discovery rationale:**
- **Zero boilerplate:** Just export Component subclasses and Prompt elements
- **Component name = export name:** No separate `name` property to maintain
- **Library metadata optional:** Default export with `{ name, version, dependencies }` is optional
- **Python-like:** Similar to how Python's import system discovers classes

---

## Dependency Declaration

**Decision:** Prompt files can optionally declare their module dependencies using `<Uses src="...">` elements at the file level (outside `<Prompt>`). Dependencies are optional - when a component is not found, the runtime provides helpful error messages suggesting which package to install.

```xml
<Uses src="@acme/components" />
<Uses src="https://example.com/utils.js" />

<Prompt name="support" description="Customer support response">
  <AcmeHeader />
  <Role>Support agent</Role>
  <Task>Help the customer</Task>
</Prompt>
```

**Key behaviors:**

| Scenario | Result |
|----------|--------|
| `<Prompt>Say hi</Prompt>` (no deps) | Works - only uses built-ins |
| `<AcmeHeader>` with package installed | Works - component found in registry |
| `<AcmeHeader>` without package installed | Error: "AcmeHeader not found. Available in @acme/components" |
| `<Uses>` present, package not installed | Auto-install or prompt user to install |
| `<Uses>` present, package installed | Works |

**Source formats supported:**

| Format | Example |
|--------|---------|
| npm package | `<Uses src="@acme/components" />` |
| npm with version | `<Uses src="@acme/components@1.0.0" />` |
| URL | `<Uses src="https://cdn.example.com/components.js" />` |
| GitHub | `<Uses src="github:acme/components#v1.0.0" />` |
| Local (CLI only) | `<Uses src="./my-components/" />` |

### Sub-Decisions

#### No YAML Frontmatter

**Decision:** Use `<Prompt name="..." description="...">` attributes for metadata instead of YAML frontmatter.

**Why no frontmatter:**
- **Consistent syntax:** Entire file uses XML/JSX syntax, not a mix of YAML and XML
- **Simpler parsing:** One parser, not two
- **Familiar to target users:** Non-technical users already see `<Prompt>` as the container

#### `<Uses>` Placement (Outside Prompt)

**Decision:** `<Uses>` elements go at file level, outside `<Prompt>` elements.

**Why outside:**
- **File-level scope:** Dependencies apply to all prompts in the file
- **No redundancy:** Declare once, use in multiple prompts
- **Clear separation:** Metadata/dependencies separate from content
- **Extensible:** `<Uses>` can gain attributes (e.g., `optional`, `as`) without changing Prompt

#### Single `src` Attribute

**Decision:** Use a single `src` attribute that accepts any source format, rather than separate attributes per format.

**Why single attribute:**
- **Simpler:** One attribute to learn
- **Flexible:** Format detected from value (URLs start with http/https, npm packages have @ or /, etc.)
- **Consistent:** Same pattern as HTML `<script src="...">` and `<img src="...">`

#### Optional Dependencies with Helpful Errors

**Decision:** `<Uses>` is optional. When a component is not found and no `<Uses>` declares it, the runtime provides a helpful error suggesting which package to install.

**Why optional with helpful errors:**
- **Simplest case stays simple:** `<Prompt>Say hi</Prompt>` works with zero setup
- **Installed packages just work:** No need to redeclare what's already available
- **Portability when needed:** Add `<Uses>` to make a file self-contained for sharing
- **Good DX:** Clear error messages guide users to the fix

---

## Unified Module Loading

**Decision:** Provide a single `Pupt` class that handles module loading for both CLI (Node.js) and browser environments, with automatic deduplication and browser import map generation.

```typescript
import { Pupt } from 'pupt-lib';

const pupt = new Pupt({
  modules: [
    '@acme/prompts',                    // npm
    'github:corp/prompts#v1.0.0',       // git
    'https://example.com/prompts.js',   // URL
  ],
});

await pupt.init();  // Loads all modules, deduplicates, generates import map (browser)
const prompts = pupt.getPrompts();
```

**The core problems solved:**

1. **Multiple source types:** npm, URLs, git, local files all need to work
2. **Deduplication:** Same module shouldn't be loaded twice
3. **Dependency ordering:** Dependencies must load before dependents
4. **Browser compatibility:** How do dynamic imports resolve `'pupt-lib'` in browsers?
5. **Cross-environment API:** Same code should work in Node.js and browsers

**Alternatives Considered:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Separate functions** | `loadModule()`, `getPrompts()` as standalone | Simple API surface | No shared state, repeated dedup logic |
| **Global registry** | Single global that tracks loaded modules | Easy to use | Implicit state, testing difficulties |
| **Factory function** | `createPupt(config)` returns instance | Functional style | Same as class, just different syntax |
| **Class instance** | `new Pupt(config)` | Explicit state, testable, extensible | Slightly more verbose |

**Why class-based `Pupt`:**
- **Explicit state:** Each instance tracks its own loaded modules (no globals)
- **Testable:** Easy to create isolated instances for testing
- **Extensible:** Can add methods like `loadModule()`, `hasComponent()`, etc.
- **Lifecycle:** Clear `init()` step for async setup (browser import maps)

### Sub-Decisions

See [Module Loading](08-module-loading.md) for details on:
- Browser Module Loading via Import Maps
- Module Deduplication Strategy
- Environment Capability Declarations

---

## Next Steps

- [Architecture](03-architecture.md) - See how these decisions shape the system
- [JSX Runtime](04-jsx-runtime.md) - Understand the custom JSX implementation
- [Components](05-components.md) - Explore the built-in components
