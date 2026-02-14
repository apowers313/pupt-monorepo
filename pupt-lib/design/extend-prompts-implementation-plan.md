# Implementation Plan for Prompt Inheritance / Extension

## Overview

Add the ability to extend (inherit from) existing prompts, where an extending prompt overrides specific children and props while inheriting everything else from the base. This implements the design in `design/extend-prompts-design.md`.

The feature has three main subsystems:
1. **Merge engine** — an algorithm that combines a base prompt's children and props with an extender's overrides
2. **Prompt registry** — a `Map<string, PuptElement>` that stores named prompts for string-based lookup
3. **Resolution pipeline** — wiring in the `<Uses>` babel plugin, preprocessor, and Pupt API so that base prompts are discoverable at render time

## Phase Breakdown

### Phase 1: Core Merge Algorithm (MVP)

**What this phase accomplishes:**
A pure function `mergePromptElements(base, extender)` that merges two `PuptElement` trees according to the design's merge algorithm. The `<Prompt>` component gains an `extend` prop that accepts a `PuptElement` directly (element-reference mode only — no string registry lookup yet). This is the minimum viable feature: users can extend prompts in `.tsx` files by passing an element reference.

**Duration**: 2–3 days

**Tests to Write First**:

- `test/unit/services/prompt-merge.test.ts`: Core merge algorithm unit tests.
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { mergePromptElements } from '../../../src/services/prompt-merge';
  import { jsx, jsxs } from '../../../src/jsx-runtime';
  import { Prompt } from '../../../components/structural/Prompt';
  import { Role } from '../../../components/structural/Role';
  import { Task } from '../../../components/structural/Task';
  import { Section } from '../../../components/structural/Section';
  import { Constraint } from '../../../components/structural/Constraint';
  import { Constraints } from '../../../components/structural/Constraints';
  import { TYPE, PROPS, CHILDREN } from '../../../src/types/symbols';

  describe('mergePromptElements', () => {
    describe('singleton component matching', () => {
      it('should replace a singleton child when extender provides the same type', () => {
        // Base: <Prompt name="base"><Role>Base role</Role><Task>Do X</Task></Prompt>
        // Extender: <Prompt extend={base}><Role>New role</Role></Prompt>
        // Result: children = [Role("New role"), Task("Do X")]
      });

      it('should keep base singleton when extender does not override it', () => {
        // Base: <Prompt name="base"><Role>Base role</Role><Task>Do X</Task></Prompt>
        // Extender: <Prompt extend={base}><Task>Do Y</Task></Prompt>
        // Result: children = [Role("Base role"), Task("Do Y")]
      });

      it('should handle all singleton component types (Role, Task, Format, Audience, ...)', () => {
        // Test each of: Role, Task, Format, Audience, Tone, Objective, Style,
        // WhenUncertain, Specialization, ChainOfThought
        // Also containers: Constraints, Guardrails, Contexts, SuccessCriteria,
        // EdgeCases, Fallbacks, References, Examples
      });
    });

    describe('named component matching', () => {
      it('should replace a named child when type + name match', () => {
        // Base: <Prompt name="base"><Section name="a">Old</Section></Prompt>
        // Extender: <Prompt extend={base}><Section name="a">New</Section></Prompt>
        // Result: children = [Section name="a" "New"]
      });

      it('should not replace when names differ', () => {
        // Base: <Prompt name="base"><Section name="a">A</Section></Prompt>
        // Extender: <Prompt extend={base}><Section name="b">B</Section></Prompt>
        // Result: children = [Section("a"), Section("b")]
      });

      it('should match named Constraint, Context, and Ask components by name', () => {
        // Verify name-based matching for Constraint, Context, and Ask components
      });
    });

    describe('ordering', () => {
      it('should preserve base order for overrides and append additions', () => {
        // Base children: [Role, Task, Section("examples")]
        // Extender: [Role (override), Section("new")]
        // Result: [Role (overridden), Task (inherited), Section("examples") (inherited), Section("new") (appended)]
      });
    });

    describe('prop merging', () => {
      it('should merge Prompt-level props with extender winning', () => {
        // Base: <Prompt name="base" audience="engineers" role="developer">
        // Extender: <Prompt extend={base} role="architect">
        // Result props: { name: "base", audience: "engineers", role: "architect" }
      });

      it('should shallow-merge slots prop', () => {
        // Base slots: { role: ComponentA }
        // Extender slots: { format: ComponentB }
        // Result: { role: ComponentA, format: ComponentB }
      });

      it('should strip extend prop from merged result', () => {
        // The extend prop must not appear in the final merged element
      });

      it('should let extender override name', () => {
        // Base: name="base", Extender: name="derived"
        // Result: name="derived"
      });

      it('should inherit name from base when extender omits it', () => {
        // Extender has no name prop → inherits from base
      });

      it('should let boolean false re-enable something base disabled', () => {
        // Base: noGuardrails={true}
        // Extender: noGuardrails={false}
        // Result: noGuardrails={false}
      });
    });

    describe('unrecognized / custom components', () => {
      it('should append custom components not in singleton or named lists', () => {
        // Custom function component in extender → appended to end
      });
    });

    describe('edge cases', () => {
      it('should handle base with no children', () => {});
      it('should handle extender with no children (pure prop override)', () => {});
      it('should handle empty extender (inherit everything)', () => {});
    });
  });
  ```

- `test/unit/components/structural/prompt-extend.test.ts`: Prompt component `extend` prop integration.
  ```typescript
  describe('Prompt extend prop (element reference)', () => {
    it('should render a merged prompt when extend receives a PuptElement', async () => {
      // Create base element, create extender with extend={base}, render, verify output
    });

    it('should auto-generate defaults from merged props', async () => {
      // Base has role="developer", extender overrides role="architect"
      // Verify rendered output contains architect defaults
    });

    it('should compose with container-level extend prop', async () => {
      // Base has default constraints
      // Extender: <Constraints extend><Constraint>Extra</Constraint></Constraints>
      // Verify both default and extra constraints appear
    });
  });
  ```

- `test/e2e/prompt-extend.e2e.test.ts`: End-to-end through the full render pipeline.
  ```typescript
  describe('Prompt extension e2e', () => {
    it('should render an extended prompt with role override', async () => {
      // Construct elements with jsx(), render(), check output
    });

    it('should render an extended prompt with section override by name', async () => {});
    it('should inherit inputs from base prompt', async () => {});
  });
  ```

**Implementation**:

- `src/services/prompt-merge.ts` *(new file)*: Core merge algorithm.
  ```typescript
  // Key exports:
  export function mergePromptElements(base: PuptElement, extender: PuptElement): PuptElement;

  // Internal helpers:
  function computeMatchingKey(child: PuptElement): string;
  function isSingletonComponent(element: PuptElement): boolean;
  function getComponentName(element: PuptElement): string | null;
  function mergeProps(baseProps: Record<string, unknown>, extenderProps: Record<string, unknown>): Record<string, unknown>;
  function mergeChildren(baseChildren: PuptNode[], extenderChildren: PuptNode[]): PuptNode[];
  ```

  The matching key computation:
  - Extract the component type from `element[TYPE]`
  - For singleton types (a known set discovered from component exports or duck-typed by checking whether the component is in the singleton list), the key is the type reference or type name
  - For named components, the key is `typeName + ':' + element[PROPS].name`
  - The singleton list includes: Role, Task, Format, Audience, Tone, Objective, Style, WhenUncertain, Specialization, ChainOfThought, Constraints, Guardrails, Contexts, SuccessCriteria, EdgeCases, Fallbacks, References, Examples
  - Important: per the "component equality" principle, the singleton list must NOT be hardcoded in `src/`. Instead, use a duck-typing approach: a component is "named-matchable" if the element has a `name` prop AND is not a singleton type. Singleton types can be identified by checking if the component type matches known types via `isElementOfType()` from `src/utils/children.ts`

  Merge algorithm (from design doc):
  1. Create a working copy of `baseChildren`
  2. Create an additions list
  3. For each extender child: compute key, search base for match, replace in-place or add to additions
  4. Result = `[...working copy, ...additions]`

  Props merge: `{ ...baseProps, ...extenderProps }` with special handling for `slots` (shallow merge), `children` (separate algorithm), and `extend` (stripped).

- `components/structural/Prompt.tsx` *(modify)*:
  - Add `extend` to `promptSchema`: `extend: z.union([z.string(), z.unknown()]).optional()`
  - At the top of the `render()` method, if `props.extend` is a PuptElement, call `mergePromptElements(props.extend, thisElement)` and re-render with the merged element's props/children
  - Careful not to infinite-loop: after merging, the merged element should NOT have an `extend` prop (the merge function strips it)

- `src/types/element.ts` *(no changes needed)* — PuptElement is already generic enough.

**Dependencies**:
- External: none
- Internal: `src/utils/children.ts` (reuse `isElementOfType`), `src/jsx-runtime/index.ts` (for creating merged elements via `jsx()`/`jsxs()`)

**Verification**:
1. Run: `npm run test -- test/unit/services/prompt-merge.test.ts`
2. Run: `npm run test -- test/unit/components/structural/prompt-extend.test.ts`
3. Run: `npm run test -- test/e2e/prompt-extend.e2e.test.ts`
4. Manual: Create a small test script in `./tmp/test-extend.ts`:
   ```typescript
   import { render, jsx, jsxs, Prompt, Role, Task, Section } from 'pupt-lib';

   const base = jsxs(Prompt, {
     name: 'base',
     children: [
       jsx(Role, { children: 'You are a developer.' }),
       jsx(Task, { children: 'Review this code.' }),
       jsx(Section, { name: 'scope', children: 'All files' }),
     ],
   });

   const extended = jsxs(Prompt, {
     name: 'extended',
     extend: base,
     children: [
       jsx(Role, { children: 'You are a security expert.' }),
     ],
   });

   const result = await render(extended);
   console.log(result.text);
   // Should show: security expert role, "Review this code" task, "All files" scope section
   ```
5. Run: `npm run lint` — verify no type errors or lint issues
6. Run: `npm run build` — verify successful build
7. Run: `npm run test` — verify no existing tests break

---

### Phase 2: Prompt Registry and String-Based Resolution

**What this phase accomplishes:**
Introduces the prompt registry (`Map<string, PuptElement>`) so that `extend="prompt-name"` works via string lookup. The registry is populated two ways: (1) a module-level registry populated by a `__pupt_registerPrompt()` helper, and (2) a `promptRegistry` field on `RenderContext` populated by the Pupt API. Also adds chaining support (A extends B extends C) with circular dependency detection.

**Duration**: 2–3 days

**Tests to Write First**:

- `test/unit/services/prompt-registry.test.ts`: Registry unit tests.
  ```typescript
  describe('PromptRegistry', () => {
    it('should register a named prompt element', () => {});
    it('should retrieve a prompt by name', () => {});
    it('should throw if registering an element without a name prop', () => {});
    it('should overwrite if same name is registered twice', () => {});
    it('should return undefined for unknown names', () => {});
  });

  describe('__pupt_registerPrompt', () => {
    it('should register a PuptElement into the module-level registry', () => {});
    it('should throw if element is not a PuptElement', () => {});
    it('should throw if element has no name prop', () => {});
  });
  ```

- `test/unit/components/structural/prompt-extend-string.test.ts`: String-based resolution.
  ```typescript
  describe('Prompt extend prop (string name)', () => {
    it('should resolve base prompt from RenderContext promptRegistry', async () => {
      // Register a prompt in context.promptRegistry, render with extend="name"
    });

    it('should resolve base prompt from module-level registry', async () => {
      // Use __pupt_registerPrompt, render with extend="name"
    });

    it('should prefer RenderContext registry over module-level registry', async () => {
      // Both have same name, context one should win
    });

    it('should report error when base prompt not found', async () => {
      // extend="nonexistent" → error in result.errors
    });

    it('should report error when extend is not string or PuptElement', async () => {
      // extend={42} → type error
    });
  });
  ```

- `test/unit/services/prompt-merge-chaining.test.ts`: Chaining and cycle detection.
  ```typescript
  describe('prompt merge chaining', () => {
    it('should support A extends B extends C', () => {
      // C is base, B extends C, A extends B
      // A should have C's children (overridden by B, overridden by A)
    });

    it('should detect circular inheritance and throw', () => {
      // A extends B, B extends A
    });

    it('should detect transitive cycles', () => {
      // A extends B, B extends C, C extends A
    });

    it('should enforce maximum depth limit (10)', () => {
      // Chain of 11 prompts → depth exceeded error
    });

    it('should include chain path in error messages', () => {
      // Error message should show: A → B → C → A
    });
  });
  ```

- `test/unit/api-prompt-registry.test.ts`: Pupt API integration.
  ```typescript
  describe('Pupt API prompt registry', () => {
    it('should make discovered prompts available for extend resolution', async () => {
      // Load a library with a named prompt, then render another prompt that extends it
    });
  });
  ```

**Implementation**:

- `src/services/prompt-registry.ts` *(new file)*: Module-level registry and helper.
  ```typescript
  // Module-level singleton registry
  const moduleRegistry = new Map<string, PuptElement>();

  export function registerPrompt(element: PuptElement): void;
  export function getRegisteredPrompt(name: string): PuptElement | undefined;
  export function clearModuleRegistry(): void;  // for testing

  // Runtime helper injected by babel plugin
  export function __pupt_registerPrompt(element: unknown): void;
  ```

- `src/types/context.ts` *(modify)*: Add `promptRegistry` to `RenderContext`.
  ```typescript
  export interface RenderContext {
    inputs: Map<string, unknown>;
    env: EnvironmentContext;
    postExecution: PostExecutionAction[];
    errors: RenderError[];
    metadata: Map<string, unknown>;
    promptRegistry?: Map<string, PuptElement>;  // NEW
  }
  ```

- `src/render.ts` *(modify)*: Pass `promptRegistry` from options into context.
  - Add `promptRegistry?: Map<string, PuptElement>` to `RenderOptions`
  - Populate `context.promptRegistry` from the option

- `src/services/prompt-merge.ts` *(modify)*: Add chaining support.
  ```typescript
  // Enhanced to support recursive resolution:
  export function resolveAndMerge(
    extender: PuptElement,
    context: RenderContext,
    visited?: Set<string>,
  ): PuptElement;
  ```
  - If `extender` has an `extend` prop that is a string, look up from `context.promptRegistry` first, then module-level registry
  - If the base itself has `extend`, recurse (depth-first)
  - Track visited names in a `Set<string>` for cycle detection
  - Enforce max depth of 10

- `components/structural/Prompt.tsx` *(modify)*: Update render to handle string-based extend.
  - When `extend` is a string, call `resolveAndMerge()` with the context
  - When `extend` is a PuptElement, call `mergePromptElements()` directly (as in Phase 1)

- `src/api.ts` *(modify)*: Populate prompt registry from discovered prompts.
  - In `createDiscoveredPrompt()`, the `render()` method should pass a `promptRegistry` to the render options, built from all discovered prompts
  - Add a `getPromptRegistry(): Map<string, PuptElement>` method to the `Pupt` class

- `src/index.ts` *(modify)*: Export `__pupt_registerPrompt` as a public API for the babel plugin to reference.

**Dependencies**:
- External: none
- Internal: Phase 1 (`prompt-merge.ts`), `src/types/context.ts`, `src/render.ts`, `src/api.ts`

**Verification**:
1. Run: `npm run test -- test/unit/services/prompt-registry.test.ts`
2. Run: `npm run test -- test/unit/components/structural/prompt-extend-string.test.ts`
3. Run: `npm run test -- test/unit/services/prompt-merge-chaining.test.ts`
4. Manual: Create `./tmp/test-registry.ts`:
   ```typescript
   import { render, jsx, jsxs, Prompt, Role, Task, __pupt_registerPrompt } from 'pupt-lib';

   // Register a base prompt
   const base = jsxs(Prompt, {
     name: 'code-review',
     children: [
       jsx(Role, { children: 'You are a developer.' }),
       jsx(Task, { children: 'Review this code.' }),
     ],
   });
   __pupt_registerPrompt(base);

   // Extend by name
   const extended = jsx(Prompt, {
     extend: 'code-review',
     children: jsx(Role, { children: 'You are a security expert.' }),
   });

   const result = await render(extended);
   console.log(result.text);
   // Should show: security expert role + "Review this code" task
   ```
5. Run: `npm run lint && npm run build && npm run test`

---

### Phase 3: `<Uses>` Babel Plugin and `.prompt` File Support

**What this phase accomplishes:**
Enhances the `<Uses>` babel plugin and preprocessor so that `.prompt` files can use `<Uses from="./base.prompt" />` to register base prompts for extension. This is what makes the feature accessible to non-technical users. After this phase, the full syntax from the design doc works:
```xml
<Uses from="./base.prompt" />
<Prompt extend="code-review">
  <Role preset="architect" />
</Prompt>
```

**Duration**: 2–3 days

**Tests to Write First**:

- `test/unit/services/babel-plugins/uses-to-import-prompts.test.ts`: Babel plugin prompt import support.
  ```typescript
  describe('uses-to-import plugin (prompt imports)', () => {
    it('should generate registerPrompt call for .prompt file imports', () => {
      // Input: <Uses from="./base.prompt" />
      // Output: import _prompt_0 from "./base.prompt"; __pupt_registerPrompt(_prompt_0);
    });

    it('should generate registerPrompt call for .tsx with prompt hint', () => {
      // Input: <Uses prompt from="./base.tsx" />
      // Output: import _prompt_0 from "./base.tsx"; __pupt_registerPrompt(_prompt_0);
    });

    it('should still handle component imports normally', () => {
      // <Uses component="MyComponent" from="./lib" /> → unchanged behavior
    });

    it('should handle mixed component and prompt imports', () => {
      // Two <Uses> elements, one for components, one for prompts
    });
  });
  ```

- `test/e2e/prompt-extend-prompt-file.e2e.test.ts`: Full pipeline `.prompt` file extension.
  ```typescript
  describe('Prompt extension via .prompt files', () => {
    it('should extend a prompt from an imported .prompt file', async () => {
      // Use createPromptFromSource with both base and extending source
    });

    it('should handle chaining across .prompt files', async () => {
      // A.prompt extends B.prompt extends C.prompt
    });

    it('should extend with multiple overrides in .prompt syntax', async () => {
      // Override role + add constraints in .prompt syntax
    });

    it('should compose prompt-level extend with container-level extend', async () => {
      // <Prompt extend="base"><Constraints extend>...</Constraints></Prompt>
    });
  });
  ```

**Implementation**:

- `src/services/babel-plugins/uses-to-import.ts` *(modify)*: Detect prompt imports.
  - When `from` ends with `.prompt`, or when a `prompt` boolean attribute is present, generate:
    ```javascript
    import _prompt_N from "./path.prompt";
    __pupt_registerPrompt(_prompt_N);
    ```
  - Use a counter (`_prompt_0`, `_prompt_1`, ...) tracked in plugin state for unique identifiers
  - The `__pupt_registerPrompt` identifier must be imported or available as a global; the preprocessor will inject the import

- `src/services/preprocessor.ts` *(modify)*: Add `__pupt_registerPrompt` to auto-imports.
  - Add `__pupt_registerPrompt` to the generated imports so it's available for the babel plugin's generated code
  - This goes in `generateImports()` alongside the existing component imports

- `test/fixtures/` *(new directory)*: Add test fixture `.prompt` files for e2e tests.
  - `test/fixtures/base-review.prompt`: A base code-review prompt
  - `test/fixtures/security-review.prompt`: Extends base-review

**Dependencies**:
- External: none
- Internal: Phase 2 (prompt registry, `__pupt_registerPrompt`)

**Verification**:
1. Run: `npm run test -- test/unit/services/babel-plugins/uses-to-import-prompts.test.ts`
2. Run: `npm run test -- test/e2e/prompt-extend-prompt-file.e2e.test.ts`
3. Manual: Create test `.prompt` files in `./tmp/`:

   `./tmp/base-review.prompt`:
   ```xml
   <Prompt name="code-review">
     <Role>You are a code reviewer.</Role>
     <Task>Review the provided code for quality and correctness.</Task>
     <Section name="scope">Review all files in the changeset.</Section>
   </Prompt>
   ```

   `./tmp/security-review.prompt`:
   ```xml
   <Uses from="./base-review.prompt" />

   <Prompt extend="code-review">
     <Role>You are a security expert.</Role>
     <Section name="scope">Focus on authentication and authorization code.</Section>
   </Prompt>
   ```

   Then run via the interactive CLI:
   ```bash
   npm run prompt
   # Select security-review.prompt, verify output shows security expert role,
   # original task, overridden scope section
   ```
4. Run: `npm run lint && npm run build && npm run test`

---

### Phase 4: Input Inheritance, Error Handling, and Browser Testing

**What this phase accomplishes:**
Ensures Ask component (input) inheritance works correctly through the merge, validates all error paths have clear messages, adds browser environment tests, and hardens edge cases. This is the polish phase that makes the feature production-ready.

**Duration**: 2–3 days

**Tests to Write First**:

- `test/unit/services/prompt-merge-inputs.test.ts`: Input inheritance.
  ```typescript
  describe('prompt merge input inheritance', () => {
    it('should inherit Ask components from base', () => {
      // Base has <Text name="topic" label="Topic?">, extender has no inputs
      // Merged tree should contain the Text input
    });

    it('should override Ask components matched by name', () => {
      // Base: <Text name="topic" label="Topic?">
      // Extender: <Text name="topic" label="Pick a subject" default="AI">
      // Merged: extender's version wins
    });

    it('should add new Ask components from extender', () => {
      // Extender adds <Number name="count" label="How many?"> not in base
      // Merged: base inputs + new input appended
    });

    it('should work with createInputIterator on merged element', () => {
      // Verify createInputIterator picks up correct inputs from merged tree
    });
  });
  ```

- `test/unit/services/prompt-merge-errors.test.ts`: Error handling.
  ```typescript
  describe('prompt merge error handling', () => {
    it('should add error when base prompt not found by name', async () => {
      // result.errors should contain inheritance_error
    });

    it('should add error for circular inheritance', async () => {
      // A → B → A: check error message includes chain
    });

    it('should add error for depth exceeded', async () => {
      // Chain of 11: check error message
    });

    it('should add error when extend is invalid type', async () => {
      // extend={42}: check error message
    });

    it('should use error code inheritance_error', async () => {
      // Verify error.code matches design spec
    });
  });
  ```

- `test/browser/prompt-extend.browser.test.ts`: Browser environment test.
  ```typescript
  describe('Prompt extension in browser', () => {
    it('should render an extended prompt in browser environment', async () => {
      // Verify merge + render works in Playwright/Chromium context
    });
  });
  ```

**Implementation**:

- `src/services/prompt-merge.ts` *(modify)*: Ensure Ask components use name-based matching.
  - Ask components (identified by having both `name` and `label` props, matching the pattern in `seedAskDefaults`) should always use name-based matching, never singleton matching
  - This is probably already handled by the Phase 1 algorithm (they have `name` props), but add explicit tests

- `components/structural/Prompt.tsx` *(modify)*: Add error reporting.
  - When resolution fails (not found, circular, depth exceeded, invalid type), push a `RenderError` with code `'inheritance_error'` to `context.errors`
  - Do NOT throw — report the error and render what's available (graceful degradation)

- `src/types/render.ts` *(modify)*: Add `'inheritance_error'` to the `RenderError` code union if it's not already extensible.

- `test/browser/prompt-extend.browser.test.ts` *(new file)*: Browser test.

**Dependencies**:
- External: none
- Internal: All previous phases

**Verification**:
1. Run: `npm run test -- test/unit/services/prompt-merge-inputs.test.ts`
2. Run: `npm run test -- test/unit/services/prompt-merge-errors.test.ts`
3. Run: `npm run test:browser`
4. Run the full test suite: `npm run test`
5. Run: `npm run lint && npm run build`
6. Manual: Test error cases via `./tmp/test-errors.ts`:
   ```typescript
   import { render, jsx, Prompt, Role } from 'pupt-lib';

   // Test: extend a nonexistent prompt
   const bad = jsx(Prompt, {
     extend: 'does-not-exist',
     children: jsx(Role, { children: 'Test' }),
   });
   const result = await render(bad);
   console.log('ok:', result.ok);
   console.log('errors:', result.errors);
   // Should show: ok: false, errors: [{ code: 'inheritance_error', message: '...' }]
   ```

---

## Common Utilities Needed

- **`computeMatchingKey(element: PuptElement): string | null`** — in `src/services/prompt-merge.ts`. Computes the matching key for a child element (type name for singletons, type + name for named components, null for unrecognized). Used by the merge algorithm.

- **`isSingletonComponentType(type: ComponentType | string | symbol): boolean`** — in `src/services/prompt-merge.ts`. Determines if a component type is a singleton (one-per-prompt) by checking against known structural component types using `isElementOfType`. Must NOT hardcode names — use reference equality checks against imported component classes.

- **`createMergedElement(type, props, children): PuptElement`** — thin wrapper around `jsx()`/`jsxs()` to create a new PuptElement with merged data. Ensures the element goes through the normal creation path (Proxy wrapping, children normalization).

## External Libraries Assessment

- **No new external libraries needed.** The merge algorithm is straightforward tree manipulation. All necessary infrastructure (JSX runtime, Babel standalone, element utilities) already exists in the codebase.

## Risk Mitigation

- **Infinite recursion in render**: If the merged element somehow retains the `extend` prop, the Prompt render method would loop. **Mitigation**: The merge function MUST strip `extend` from the merged props. Add a debug assertion in Prompt.render that throws if `extend` is present after merge.

- **Component matching ambiguity**: A component could potentially match as both singleton and named. **Mitigation**: Singletons take priority. If a Role has a `name` prop (unlikely but possible), match by type alone since Role is a known singleton.

- **Registry pollution across tests**: The module-level registry is a singleton, so tests could leak state. **Mitigation**: Export a `clearModuleRegistry()` function and call it in `beforeEach` in registry tests. The `RenderContext.promptRegistry` is per-render and doesn't have this issue.

- **Breaking existing `.prompt` files**: The babel plugin changes in Phase 3 could affect existing `<Uses>` behavior. **Mitigation**: The new behavior only triggers for `from` paths ending in `.prompt` or when the `prompt` attribute is present. Existing `<Uses component="X" from="source" />` patterns are unaffected. Run the full existing test suite after each phase.

- **Performance of deep chains**: Recursive resolution of A → B → C → ... could be slow for deep chains. **Mitigation**: The depth limit of 10 prevents excessive recursion. In practice, chains of 2–3 levels are the expected use case.

- **Browser compatibility**: The registry and merge code is pure JavaScript with no Node.js dependencies. **Mitigation**: Phase 4 includes explicit browser environment tests via Playwright.
