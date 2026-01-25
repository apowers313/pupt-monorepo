# Architecture

[← Back to Index](00-index.md) | [Previous: Design Decisions](02-design-decisions.md) | [Next: JSX Runtime](04-jsx-runtime.md)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Higher-Level Programs                        │
│                  (CLI, Web UI, Mobile App, AI Agent)                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            pupt-lib API                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  PromptRenderer │  │  InputCollector  │  │  LibraryLoader     │  │
│  │                 │  │                  │  │                    │  │
│  │  - render()     │  │  - getInputs()   │  │  - loadLibrary()   │  │
│  │  - validate()   │  │  - setValues()   │  │  - resolveImport() │  │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Core Components                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │  JSX Runtime    │  │  Babel Transform │  │  Component         │  │
│  │                 │  │                  │  │  Registry          │  │
│  │  - jsx()        │  │  - transform()   │  │                    │  │
│  │  - jsxs()       │  │  - parse()       │  │  - register()      │  │
│  │  - Fragment     │  │                  │  │  - get()           │  │
│  └─────────────────┘  └──────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Default Component Library                       │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ CORE: <Role> <Task> <Context> <Format> <Constraint>             ││
│  │       <Audience> <Tone> <SuccessCriteria>                       ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ EXAMPLES: <Example> <Examples>                                  ││
│  │ REASONING: <Steps> <Step>                                       ││
│  │ DATA: <Data> <Code> <File>                                      ││
│  │ CONTROL: <If> <ForEach> <Section>                                ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ USER INPUT: <Ask.Text> <Ask.Editor> <Ask.Select>                ││
│  │   <Ask.MultiSelect> <Ask.Confirm> <Ask.File> <Ask.Number>       ││
│  │   <Ask.Choice> <Ask.Rating> <Ask.Date> <Ask.Secret> <Ask.Path>  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

```
1. User writes JSX prompt template
           │
           ▼
2. Babel transforms JSX to function calls
           │
           ▼
3. JSX Runtime creates component tree
           │
           ▼
4. InputCollector extracts required inputs from tree
           │
           ▼
5. Higher-level program collects input values from user
           │
           ▼
6. InputCollector receives values, updates component tree
           │
           ▼
7. PromptRenderer traverses tree, produces text output
           │
           ▼
8. Text prompt ready for LLM
```

---

## Key Abstractions

### PuptElement

The core data structure representing a JSX element:

```typescript
export interface PuptElement {
  /** Component name as string - resolved from registry at render time */
  type: string;
  props: Record<string, unknown>;
  children: PuptNode[];
}

export type PuptNode =
  | PuptElement
  | string
  | number
  | boolean
  | null
  | undefined
  | PuptNode[];
```

### RenderContext

Context passed to components during rendering:

```typescript
export interface RenderContext {
  /** Component scope for resolution */
  scope: Scope;
  /** Collected input values */
  inputs: Map<string, unknown>;
  /** Environment configuration */
  env: EnvironmentContext;
  /** Post-execution actions collector */
  postExecution: PostExecutionAction[];
}
```

### RenderResult

The result of rendering a prompt:

```typescript
export interface RenderResult {
  /** The rendered prompt text */
  text: string;
  /** Actions to perform after prompt execution */
  postExecution: PostExecutionAction[];
}
```

---

## Services

| Service | Purpose | Location |
|---------|---------|----------|
| `InputIterator` | Depth-first input collection | `src/services/input-iterator.ts` |
| `InputCollector` | Convenience wrapper for input collection | `src/services/input-collector.ts` |
| `Scope` | Component resolution namespace | `src/services/scope.ts` |
| `ScopeLoader` | Package.json walking, scope building | `src/services/scope-loader.ts` |
| `LibraryLoader` | Third-party library loading | `src/services/library-loader.ts` |
| `Transformer` | Babel transformation | `src/services/transformer.ts` |
| `ComponentRegistry` | Component registration and lookup | `src/services/component-registry.ts` |
| `SearchEngine` | Fuzzy prompt search | `src/services/search-engine.ts` |

---

## Next Steps

- [JSX Runtime](04-jsx-runtime.md) - Understand the custom JSX runtime
- [Components](05-components.md) - Explore the built-in components
- [API](07-api.md) - See the public API surface
