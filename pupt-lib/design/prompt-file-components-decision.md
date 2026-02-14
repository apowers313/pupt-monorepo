# .prompt File Component Definitions — Feasibility Decision

> Phase 5b.4 — Determines whether Phase 7-8 components can be implemented as `.prompt` files.

## Date

2026-02-07

## Background

The preprocessor wraps `.prompt` file content as:
```javascript
export default (
  <OriginalContent />
);
```

This produces a **prompt expression** (a PuptElement tree), not a component definition. The question is whether `.prompt` files can define **reusable components** (classes or functions) for use in other prompts.

## Feasibility Test Results

### Test 1: Declarative content rendering

**Result**: PASS

`.prompt` files can render any combination of built-in components:
```xml
<Prompt name="test" bare>
  <Role>You are a code reviewer.</Role>
  <Task>Review code.</Task>
  <Context label="Guidelines">Follow SOLID.</Context>
</Prompt>
```

This works because the preprocessor auto-imports all built-in components and the expression evaluates to a valid PuptElement.

### Test 2: Control flow in .prompt files

**Result**: PASS

`.prompt` files support `<If>`, `<ForEach>`, and other control-flow components:
```xml
<Prompt name="test" bare>
  <Task>Main task</Task>
  <If when={true}>
    <Section name="extra">Extra instructions</Section>
  </If>
</Prompt>
```

### Test 3: Defining a reusable component in .prompt

**Result**: NOT POSSIBLE (without preprocessor changes)

The current preprocessor wraps content as an expression. To define a component, you would need:
```tsx
// This is a component definition — requires function/class syntax
function WhenUncertain(props) {
  return <Section name="when-uncertain">{props.children}</Section>;
}
export default WhenUncertain;
```

A `.prompt` file cannot express this because:
1. The `export default (...)` wrapper forces the content to be a JSX expression
2. There is no way to define a function or class inside the expression wrapper
3. The preprocessor does not detect or handle component-definition patterns

### Test 4: Workaround with .tsx

**Result**: PASS

`.tsx` files can define components using standard JavaScript syntax and full import control.

## Decision Criteria

Components should be `.prompt` files when they are:
- Purely declarative (only compose built-in components)
- Do not use `resolve()`, `context.metadata`, `findChildrenOfType()`, or complex logic
- Are self-contained prompt expressions (not reusable component definitions)

Components should be `.tsx` files when they:
- Define new component classes or functions
- Need `resolve()` method
- Use `context.metadata` or other RenderContext APIs
- Use child inspection (`findChildrenOfType`, `partitionChildren`)
- Contain complex conditional logic beyond `<If>`
- Need presets, extend/exclude patterns, or complex prop handling

## Component Format Assignment

Since Phase 7-8 components all define **new component classes** (they extend `Component` or are function components with props schemas), they cannot be `.prompt` files. The `.prompt` format is for authoring prompts, not defining components.

### Phase 7 Components

| Component | Format | Reason |
|-----------|--------|--------|
| Objective | `.tsx` | New component class with schema, renders primary/secondary goals |
| Style | `.tsx` | New component class with schema, renders type/verbosity |
| WhenUncertain | `.tsx` | New component class with schema and action rendering |
| Specialization | `.tsx` | New component class with schema, areas/level props |
| ChainOfThought | `.tsx` | Model detection logic, complex rendering |
| NegativeExample | `.tsx` | Extends Example, JSX composition with reason |

### Phase 8 Components

| Component | Format | Reason |
|-----------|--------|--------|
| Guardrails | `.tsx` | Presets, extend/exclude, prohibit/require arrays |
| EdgeCases | `.tsx` | Container with When child inspection |
| When | `.tsx` | New component class with condition → action rendering |
| Fallback | `.tsx` | New component class with when/then rendering |
| Fallbacks | `.tsx` | Container with Fallback child inspection |
| References | `.tsx` | Container with extend, sources array |
| Reference | `.tsx` | New component class with title/url/description |

## Preprocessor Changes

**No preprocessor changes are needed for Phase 6.** All new components will be `.tsx` files.

The `.prompt` format remains valuable for **authoring prompts** (composing existing components into prompt expressions), but it is not suitable for **defining new components**.

## Future Consideration

If there is a desire to support component definitions in `.prompt` files in the future, the preprocessor would need a new mode that detects component-definition patterns (e.g., a `<ComponentDef>` meta-element or a naming convention) and generates appropriate wrapper code. This is not in scope for the current implementation plan.
