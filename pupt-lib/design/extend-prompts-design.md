# Prompt Inheritance / Extension Design

## Status

**Draft** - Ready for review

## Problem Statement

Users want to take an existing prompt and create a variant that overrides specific parts while keeping everything else the same. For example, a team might have a standard "code review" prompt and want a variant that uses a different role or adds extra constraints, without duplicating the entire prompt.

Currently there is no mechanism for prompt-level inheritance. The existing `extend` prop on container components (`<Constraints extend>`, `<Guardrails extend>`, etc.) allows additive composition *within* a single prompt, but there's no way to compose *across* prompts.

## Requirements

1. Non-technical users can extend prompts using simple declarative syntax in `.prompt` files
2. Everything from the base prompt carries over unless explicitly overridden (children, props, inputs)
3. Override semantics match existing patterns: providing a component replaces the matching base component
4. The existing `extend` prop on container components continues to work within the merged tree
5. Works in both Node.js and browser environments
6. Works with the Pupt API (`loadLibrary()` prompts available as base prompts)
7. Supports chaining (A extends B extends C) with circular dependency detection
8. `.prompt` and `.tsx` files behave identically

## Design Decisions

### Decision 1: "Extender is in control" model (not "base declares blocks")

**Decision:** The extending prompt decides what to override. The base prompt does not need to declare extension points.

**Rationale:** We evaluated three approaches inspired by prior art in template languages and programming paradigms:

1. **Prompt-level inheritance** (CSS/OOP model) - extender overrides freely by component matching
2. **Higher-order composition** (React HOC model) - programmatic wrapping functions
3. **Template/slot pattern** (Django/Vue model) - base declares named slots, extender fills them

We chose approach #1 because:

- It's the most intuitive for non-technical users ("take this prompt, change the role")
- It doesn't require the base prompt author to anticipate what might be overridden
- It's the most flexible - any component can be overridden
- Django/Blade-style blocks would require every base prompt to declare extension points, which adds boilerplate and limits flexibility
- HOC-style composition requires JavaScript knowledge, making it unsuitable for `.prompt` files
- The slot pattern adds new primitives (`<Slot>`, `<FillSlot>`) and is the least React-like

**Prior art:** CSS cascade (override by type/selector matching), OOP inheritance (override by method name), Kotlin `data class copy()` (property-level override), Docker layers (filesystem-path matching). All use the "extender is in control" model with a matching key.

### Decision 2: Use `extend` prop name on `<Prompt>`

**Decision:** The prop is named `extend` (not `base`, `extends`, or `inherits`).

**Rationale:** This matches the existing naming convention used by container components (`<Constraints extend>`, `<Guardrails extend>`, etc.). Users already understand what `extend` means in this codebase.

### Decision 3: Matching strategy — component type + `name` prop

**Decision:** Override matching uses component type for singleton components and component type + `name` prop for named/repeatable components.

**Rationale:** Every inheritance system needs a "matching key" — the thing that answers "which part of the base does this override replace?"

- CSS uses selectors (element type + class + id + structure)
- OOP uses method names
- Docker uses filesystem paths

For pupt-lib, the natural matching key is the component type itself (for singletons like `<Role>`, `<Task>`) and component type + `name` prop (for repeatable components like `<Section name="...">`) because:

- It's intuitive: `<Role>` in the extender obviously replaces `<Role>` in the base
- It requires no extra syntax or annotations
- `name` is already the standard identification prop in the codebase
- It covers the vast majority of real-world use cases

### Decision 4: Override replaces, additions append

**Decision:** An override replaces the matched base child in its original position. New children (no match in the base) are appended at the end.

**Rationale:** This gives predictable, intuitive ordering. If the base has `[Role, Task, Section("examples")]` and the extender provides `[Role (override), Section("new")]`, the result is `[Role (overridden), Task (inherited), Section("examples") (inherited), Section("new") (appended)]`. Overrides stay in the base's order; additions go at the end.

### Decision 5: `extend` accepts both string name and element reference

**Decision:** `extend` accepts a string (prompt name lookup) or a PuptElement (direct reference).

```
<!-- String: resolve by name from prompt registry -->
<Prompt extend="my-base-prompt">

<!-- Element reference: direct (for .tsx files) -->
<Prompt extend={basePromptElement}>
```

**Rationale:** String names are the best UX for `.prompt` files and the Pupt API. Element references provide a more direct, type-safe option for `.tsx` files. Supporting both is trivial (check `typeof extend`) and serves both audiences.

### Decision 6: Resolution via `<Uses>` + prompt registry

**Decision:** Base prompts are loaded via `<Uses>` (for `.prompt` files) or import (for `.tsx` files), and registered in a prompt registry that the `<Prompt>` component queries at render time.

**Rationale:** `<Uses>` is the existing mechanism for declaring dependencies in `.prompt` files. Extending it to handle prompt imports is a natural evolution. The alternative — putting the URL directly on `extend` — mixes loading with rendering and is less flexible.

### Decision 7: Prompt-level props merge with "extender wins"

**Decision:** Props on the extending `<Prompt>` override the base's props. Unspecified props inherit from the base.

**Rationale:** This is the simplest, most predictable rule and matches how every inheritance system works. Explicit `false` can re-enable something the base disabled (e.g., `noGuardrails={false}`).

### Decision 8: Inputs inherit unless overridden

**Decision:** Ask components (inputs) from the base carry over. They are matched by `name` prop and can be overridden or removed.

**Rationale:** Consistent with the overall "everything carries over unless overridden" principle. Inputs are identified by `name` throughout the system, making `name` the natural matching key.

### Decision 9: Pupt API prompts available as base prompts

**Decision:** Prompts loaded via `pupt.loadLibrary()` are available for `extend` resolution. The prompt registry lives on the RenderContext so library-loaded prompts are accessible.

**Rationale:** The Pupt API is how prompt libraries are loaded at the application level. If a prompt is discovered and indexed, it should be usable as a base for extension.

### Decision 10: `slots` prop inherits from base

**Decision:** If the base prompt uses `slots` to override section renderers, those carry over to the extending prompt (they're props, and props inherit).

**Rationale:** Consistent with the "extender wins for specified props, inherit for unspecified" rule. Slots are just a regular prop on `<Prompt>`.

---

## Syntax

### Basic extension in `.prompt` files

```xml
<Uses from="./base.prompt" />

<Prompt extend="code-review">
  <Role preset="architect" />
</Prompt>
```

This takes the prompt named "code-review" from `base.prompt`, keeps everything the same, but replaces the `<Role>` with an architect role.

### Extension in `.tsx` files (by name)

```tsx
import { Prompt, Role } from 'pupt-lib';
import './base-prompts';  // registers prompts by side effect

export default (
  <Prompt extend="code-review">
    <Role preset="architect" />
  </Prompt>
);
```

### Extension in `.tsx` files (by element reference)

```tsx
import { Prompt, Role } from 'pupt-lib';
import basePrompt from './code-review.prompt';

export default (
  <Prompt extend={basePrompt}>
    <Role preset="architect" />
  </Prompt>
);
```

### Adding content with existing container `extend` behavior

```xml
<Uses from="./base.prompt" />

<Prompt extend="code-review">
  <Constraints extend>
    <Constraint>Focus on security vulnerabilities</Constraint>
  </Constraints>
</Prompt>
```

This inherits everything from "code-review" and adds an extra constraint (because `<Constraints extend>` means "add to defaults, don't replace"). The prompt-level `extend` handles the inheritance; the container-level `extend` handles additive composition within the merged tree.

### Overriding multiple components

```xml
<Uses from="./base.prompt" />

<Prompt extend="code-review" audience="senior engineers">
  <Role preset="security-expert" />
  <Section name="scope">
    <p>Focus exclusively on authentication and authorization code.</p>
  </Section>
</Prompt>
```

This overrides the role, the "scope" section (matched by name), and the `audience` prop.

### Removing a section

```xml
<Uses from="./base.prompt" />

<Prompt extend="code-review" noSuccessCriteria>
  <Role preset="architect" />
</Prompt>
```

The existing `no*` flags on `<Prompt>` handle removal of auto-generated sections. For v1, this is sufficient. A future `remove` prop could handle explicit removal of user-defined sections.

### Chaining

```xml
<!-- base.prompt: defines "code-review" -->
<Prompt name="code-review">
  <Role preset="developer" />
  <Task>Review the provided code</Task>
</Prompt>

<!-- security-review.prompt: extends "code-review", defines "security-review" -->
<Uses from="./base.prompt" />
<Prompt name="security-review" extend="code-review">
  <Role preset="security-expert" />
</Prompt>

<!-- deep-security-review.prompt: extends "security-review" -->
<Uses from="./security-review.prompt" />
<Prompt extend="security-review">
  <Constraints extend>
    <Constraint>Check for OWASP Top 10</Constraint>
  </Constraints>
</Prompt>
```

---

## Component Matching

### Singleton components (matched by type alone)

These components appear at most once as direct children of `<Prompt>`. The matching key is the component type.

| Component | Notes |
|-----------|-------|
| `Role` | |
| `Task` | |
| `Format` | |
| `Audience` | |
| `Tone` | |
| `Objective` | |
| `Style` | |
| `WhenUncertain` | |
| `Specialization` | |
| `ChainOfThought` | |
| `Constraints` | Container — replaces the entire container |
| `Guardrails` | Container — replaces the entire container |
| `Contexts` | Container — replaces the entire container |
| `SuccessCriteria` | Container — replaces the entire container |
| `EdgeCases` | Container — replaces the entire container |
| `Fallbacks` | Container — replaces the entire container |
| `References` | Container — replaces the entire container |
| `Examples` | Container — replaces the entire container |

### Named components (matched by type + `name` prop)

These components can appear multiple times. The matching key is component type + `name` prop value.

| Component | Key | Notes |
|-----------|-----|-------|
| `Section` | `type + name` | `<Section name="examples">` matches `<Section name="examples">` |
| `Context` | `type + name` | `<Context name="codebase">` matches `<Context name="codebase">` |
| `Constraint` | `type + name` | Individual constraints with names |
| Ask components | `type + name` | `<Text name="topic">` matches `<Text name="topic">` |

If a named component in the extender has no `name` prop, or its name doesn't match any base child, it is treated as an addition and appended.

### Unrecognized / custom components

Components that are not in the singleton or named lists are treated as additions and appended to the end.

### Matching scope: top-level children only

Matching operates on **direct children** of the `<Prompt>` element only. The merger does not reach inside nested structures. If the base has `<If when={...}><Role>...</Role></If>`, an extender's `<Role>` does not replace the nested role — it adds a new top-level role.

This keeps the merge algorithm simple and predictable. Users who need deeper overrides can override the entire containing element.

---

## Merge Algorithm

Given a base `<Prompt>` element and an extending `<Prompt>` element:

### Step 1: Resolve the base

If the base itself has an `extend` prop, resolve recursively (depth-first) until reaching a prompt with no `extend`. Track visited prompt names in a `Set<string>` to detect cycles.

### Step 2: Merge Prompt-level props

Create a merged props object:

```
mergedProps = { ...baseProps, ...extenderProps }
```

Special handling:
- `name`: extender's `name` wins if specified; if omitted, inherits from base
- `extend`: consumed by the merge process, not passed through to rendering
- `children`: handled separately by the child merge algorithm (not spread-merged)
- `slots`: extender's `slots` is shallow-merged with base's `slots` (`{ ...baseSlots, ...extenderSlots }`)
- `defaults`: extender's `defaults` wins entirely if specified (no deep merge)
- Boolean flags (`noRole`, `noFormat`, etc.): extender wins if specified; inherit from base otherwise. Explicit `false` re-enables something the base disabled.

### Step 3: Merge children

```
Input:
  baseChildren = [B1, B2, B3, ...]
  extenderChildren = [E1, E2, E3, ...]

Algorithm:
  1. Create a working copy of baseChildren
  2. Create an additions list (initially empty)
  3. For each extender child Ei:
     a. Compute its matching key (component type, or component type + name)
     b. Search baseChildren for a match
     c. If matched: replace the base child in-place with Ei
     d. If not matched: add Ei to the additions list
  4. Result = [...working copy of baseChildren (with replacements), ...additions]
```

### Step 4: Construct merged element

Create a new `<Prompt>` PuptElement with the merged props and merged children. This element is then rendered normally by the existing renderer — no changes to the render pipeline.

---

## Resolution Mechanism

### How base prompts get registered

There are three paths for a base prompt to become available for `extend` resolution:

#### Path 1: `<Uses>` in `.prompt` files (compile-time)

The `<Uses>` Babel plugin is enhanced to detect prompt file imports (by file extension). When it encounters a `.prompt` or `.tsx` import that exports a PuptElement (not a component), it generates code to register the prompt:

```xml
<!-- Source -->
<Uses from="./base.prompt" />
```

```js
// Generated code
import _prompt_0 from "./base.prompt";
__pupt_registerPrompt(_prompt_0);
```

**Detection heuristic:** If `from` ends with `.prompt`, it's always a prompt import. For `.tsx` files, the plugin could require an explicit hint like `<Uses prompt from="./base.tsx" />` to distinguish prompt imports from component imports. Alternatively, all `.tsx` default imports could be checked at runtime.

The `__pupt_registerPrompt(element)` runtime helper:
1. Extracts the `name` prop from the element
2. Stores it in a module-level prompt registry (`Map<string, PuptElement>`)
3. Throws if the element has no `name` prop (base prompts must be named)

#### Path 2: Direct import in `.tsx` files (compile-time)

```tsx
import basePrompt from './base.prompt';

// Used as element reference — no registry needed
<Prompt extend={basePrompt}>
```

When `extend` receives a PuptElement directly, no registry lookup is needed.

#### Path 3: Pupt API (runtime)

```typescript
const pupt = new Pupt({ modules: ['./prompts/'] });
await pupt.init();  // discovers and registers prompts

// When rendering a prompt that uses extend="some-name",
// the registry includes all discovered prompts
```

The Pupt API populates the prompt registry on `RenderContext` before rendering. This makes all library-loaded prompts available for `extend` resolution.

### Prompt registry architecture

The prompt registry is a `Map<string, PuptElement>` keyed by prompt name.

It exists in two forms:
1. **Module-level registry** — populated by `__pupt_registerPrompt()` during module evaluation. Available for standalone `createPromptFromSource()` usage.
2. **RenderContext registry** — populated by the Pupt API with discovered prompts. Merged with the module-level registry at render time.

The `<Prompt>` component's render method checks the registry when it sees an `extend` prop with a string value. Resolution order:
1. RenderContext registry (Pupt API prompts)
2. Module-level registry (`<Uses>` / import side effects)
3. Error if not found

### Circular dependency detection

Maintain a `Set<string>` of prompt names during recursive resolution. If a name appears twice, throw:

```
Error: Circular prompt inheritance detected: A → B → C → A
```

### Depth limit

Maximum chain depth: 10 levels. Configurable via environment/options if needed. Exceeding the limit throws:

```
Error: Prompt inheritance chain exceeds maximum depth (10): A → B → C → ...
```

---

## Prompt-Level Prop Merging

Given base props and extender props:

```
Base:     <Prompt name="base" role="developer" audience="engineers" noGuardrails>
Extender: <Prompt extend="base" role="architect">
```

Result after merge:
- `name="base"` (inherited, unless extender specifies a new name)
- `role="architect"` (overridden)
- `audience="engineers"` (inherited)
- `noGuardrails={true}` (inherited)

### Specific prop behaviors

| Prop | Merge rule |
|------|-----------|
| `name` | Extender wins if specified; inherits from base otherwise |
| `version` | Extender wins if specified; inherits from base otherwise |
| `description` | Extender wins if specified; inherits from base otherwise |
| `tags` | Extender wins if specified; inherits from base otherwise (no array merge) |
| `bare` | Extender wins if specified; inherits from base otherwise |
| `defaults` | Extender wins entirely if specified; inherits from base otherwise |
| `noRole`, `noFormat`, etc. | Extender wins if specified; inherits from base otherwise |
| `role`, `expertise`, `format`, `audience`, `tone` | Extender wins if specified; inherits from base otherwise |
| `slots` | Shallow merge: `{ ...baseSlots, ...extenderSlots }` |
| `extend` | Consumed by merge process; not in final element |
| `children` | Merged by the child merge algorithm (see above) |

---

## Input Inheritance

Ask components (inputs) are matched by `name` prop, following the same rules as other named components:

- **Inherited:** Base has `<Text name="topic" label="What topic?">`, extender doesn't mention it → input carries over as-is
- **Overridden:** Base has `<Text name="topic" label="What topic?">`, extender has `<Text name="topic" label="Pick a subject" default="AI">` → extender's version wins
- **Added:** Extender has `<Number name="count" label="How many?">` not in base → new input appended
- **Removed:** (v2) `<Text name="topic" remove />` → input dropped from the merged tree

The `createInputIterator()` function operates on the merged element tree, so it automatically picks up the correct inputs without modification.

---

## Interaction with Existing Features

### Container `extend` prop

The existing `extend` prop on `<Constraints>`, `<Guardrails>`, etc. continues to work as-is within the merged element tree. These are two different levels of extension:

- **Prompt-level `extend`**: "Take another prompt and override parts of it" (this feature)
- **Container-level `extend`**: "Add to the default constraints/guardrails instead of replacing them" (existing feature)

They compose naturally:

```xml
<Prompt extend="base-prompt">
  <!-- This replaces the base's Constraints container entirely -->
  <Constraints extend>
    <!-- But within this prompt, extend the default constraints -->
    <Constraint>Extra constraint</Constraint>
  </Constraints>
</Prompt>
```

### `bare` and `defaults` props

If the base has `bare={true}` or `defaults="none"`, the extender inherits that behavior (no auto-generated sections). The extender can override: `<Prompt extend="base" bare={false}>`.

### `slots` prop

Slots from the base carry over. The extender can override specific slots:

```tsx
// Base: slots={{ role: CustomRoleComponent }}
// Extender: slots={{ role: DifferentRoleComponent }}
// Result: slots={{ role: DifferentRoleComponent }} (shallow merge)
```

### `findChildrenOfType`

The existing `findChildrenOfType` utility is used by the Prompt component to detect which section types are present in children. After merge, the merged children array is passed to `render()` and `findChildrenOfType` operates on it normally. No changes needed.

---

## Error Handling

### Resolution errors

| Error | Message |
|-------|---------|
| Base prompt not found | `Prompt "${name}" not found in prompt registry. Ensure it is loaded via <Uses> or the Pupt API.` |
| Circular inheritance | `Circular prompt inheritance detected: A → B → A` |
| Depth exceeded | `Prompt inheritance chain exceeds maximum depth (10): A → B → C → ...` |
| Base has no name | `Base prompt passed to <Uses> must have a "name" prop for registry lookup.` |
| `extend` is not string or element | `"extend" prop must be a prompt name (string) or PuptElement, got ${typeof extend}` |

These are added to `context.errors` as `RenderError` entries with code `'inheritance_error'`.

---

## Implementation Plan

### Phase 1: Core merge engine

**Files to create:**
- `src/services/prompt-merge.ts` — The merge algorithm

**Files to modify:**
- `components/structural/Prompt.tsx` — Add `extend` prop to schema and render logic
- `src/types/context.ts` — Add `promptRegistry` to `RenderContext`

**What this delivers:**
- `mergePromptElements(base, extender)` function
- Component-type matching for singletons
- Name-based matching for named components
- Prompt-level prop merging
- `extend` prop on `<Prompt>` that accepts a PuptElement directly
- Unit tests for the merge algorithm

### Phase 2: Prompt registry and string-based resolution

**Files to create:**
- `src/services/prompt-registry.ts` — Module-level registry + `__pupt_registerPrompt` helper

**Files to modify:**
- `src/services/babel-plugins/uses-to-import.ts` — Handle prompt file imports
- `components/meta/Uses.tsx` — Update schema/docs for prompt imports
- `src/render.ts` — Populate RenderContext with prompt registry
- `src/api.ts` — Populate prompt registry from discovered prompts
- `components/structural/Prompt.tsx` — String-based `extend` resolution via registry

**What this delivers:**
- `<Uses from="./base.prompt" />` registers base prompts
- `extend="prompt-name"` resolves from the registry
- Pupt API prompts available as base prompts
- Chaining (A extends B extends C)
- Circular dependency detection

### Phase 3: Polish and edge cases

**Files to modify:**
- Various test files

**What this delivers:**
- Comprehensive test coverage (unit + integration + e2e)
- Error messages and validation
- Browser environment testing
- Documentation updates

---

## Future Considerations (not in scope)

### `remove` prop

A `remove` boolean prop on structural components to explicitly remove a base child:

```xml
<Prompt extend="base">
  <Section name="examples" remove />
</Prompt>
```

Deferred because the existing `no*` flags cover the most common removal case (auto-generated sections). Explicit `remove` can be added later without breaking changes.

### Multiple inheritance

Extending from multiple base prompts. Deferred because:
- It introduces complex MRO (method resolution order) questions
- Single inheritance covers the vast majority of use cases
- Can be added later as `extend={["prompt-a", "prompt-b"]}` if needed

### Deep matching

Matching components nested inside other components (e.g., replacing a `<Role>` inside an `<If>`). Deferred because:
- It makes the merge algorithm significantly more complex
- Top-level matching covers common use cases
- Users can override the containing element instead
