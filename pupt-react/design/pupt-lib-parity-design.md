# pupt-lib Parity Design: Closing API Gaps

## Context

pupt-react wraps pupt-lib's core functionality as React hooks and headless components. After auditing both libraries, several pupt-lib features are not yet exposed through pupt-react. This design covers closing the gaps that are appropriate for a browser-focused React component library.

### Out of Scope

The following gaps were evaluated and intentionally excluded:

| Gap | Reason |
|-----|--------|
| **Pupt class** (library/module management) | Module loading from npm/GitHub/local paths has limited browser support. Not worth wrapping. |
| **FileSearchEngine** | Node.js-only (requires `fs`, `path`, `os`). Throws in browser environments. |
| **CDN/ImportMap utilities** | Build-time/setup-time utilities, not runtime React concerns. Import directly from pupt-lib. |
| **ModuleLoader / Transformer** | Internal implementation details. Not part of pupt-lib's intended public API surface. |
| **RenderMetadata** | Type exists in pupt-lib but `render()` doesn't return it yet. Revisit when pupt-lib adds it. |

---

## Phase 1: SearchEngine Configuration

### Problem

`PuptProvider` creates a `SearchEngine` via `createSearchEngine()` but doesn't pass any configuration. pupt-lib's `SearchEngineConfig` allows tuning threshold, field weights, fuzzy matching, and term combination — all useful for search-heavy UIs.

### Changes

**`src/types/context.ts`** — Add `searchConfig` prop and re-export type:

```typescript
import type { SearchEngineConfig } from "pupt-lib";

export type { SearchEngineConfig } from "pupt-lib";

export interface PuptProviderProps {
  children: React.ReactNode;
  prompts?: SearchablePrompt[];
  searchConfig?: SearchEngineConfig;       // NEW
  renderOptions?: Partial<RenderOptions>;
  environment?: Partial<EnvironmentContext>;
}
```

**`src/components/PuptProvider.tsx`** — Pass config to `createSearchEngine()`:

```typescript
export function PuptProvider({
  children,
  prompts,
  searchConfig,                            // NEW
  renderOptions = {},
  environment = {},
}: PuptProviderProps): React.ReactElement {
  // ...
  const searchEngine: SearchEngine | null = useMemo(() => {
    if (!prompts || prompts.length === 0) return null;
    try {
      const engine = createSearchEngine(searchConfig);  // CHANGED: pass config
      engine.index(prompts);
      return engine;
    } catch (err) {
      console.error("Failed to initialize search engine:", err);
      return null;
    }
  }, [prompts, searchConfig]);                           // CHANGED: add dep
  // ...
}
```

### Tests

Add to `test/unit/components/PuptProvider.test.tsx`:
- Test that `searchConfig` is passed through (verify search behavior changes, e.g., fuzzy toggle or threshold)
- Test that omitting `searchConfig` preserves existing default behavior

---

## Phase 2: Advanced InputIterator Features

### Problem

pupt-lib's `InputIterator` supports `runNonInteractive()` for auto-filling inputs with defaults, `getValues()` for retrieving all collected values, and `InputIteratorOptions` for pre-supplying values and controlling missing-default behavior. The `useAskIterator` hook doesn't expose any of these.

### Changes

**`src/types/hooks.ts`** — Extend options and return types:

```typescript
import type { OnMissingDefaultStrategy } from "pupt-lib";

export interface UseAskIteratorOptions {
  element: PuptElement | null;
  onComplete?: (values: Map<string, unknown>) => void;
  initialValues?: Map<string, unknown>;
  /** Pre-supply values that skip interactive iteration */
  preSuppliedValues?: Record<string, unknown>;          // NEW
  /** Enable non-interactive mode to auto-fill with defaults */
  nonInteractive?: boolean;                              // NEW
  /** Strategy when required input has no default in non-interactive mode */
  onMissingDefault?: OnMissingDefaultStrategy;           // NEW
}

export interface UseAskIteratorReturn {
  // ... existing fields ...
  /** Run all inputs non-interactively using defaults and pre-supplied values */
  runNonInteractive: () => Promise<Map<string, unknown>>;  // NEW
}
```

Re-export the strategy type in `src/types/context.ts`:

```typescript
export type { OnMissingDefaultStrategy } from "pupt-lib";
```

**`src/utils/transform.ts`** — Update `extractInputRequirements` to accept iterator options:

```typescript
export interface ExtractOptions {
  /** Pre-supply values to skip during iteration */
  values?: Record<string, unknown>;
}

export async function extractInputRequirements(
  element: PuptElement,
  options?: ExtractOptions
): Promise<InputRequirement[]> {
  try {
    const iterator = createInputIterator(element, {
      validateOnSubmit: false,
      environment: "browser",
      values: options?.values,
    });
    // ... rest unchanged ...
  }
}
```

**`src/hooks/useAskIterator.ts`** — Add new capabilities:

1. Pass `preSuppliedValues` to `extractInputRequirements()` so pre-supplied inputs are skipped during iteration.

2. Add `runNonInteractive` function that creates a fresh iterator with `nonInteractive: true` and calls `iterator.runNonInteractive()`:

```typescript
const runNonInteractive = useCallback(async () => {
  if (!element) return new Map<string, unknown>();
  const iterator = createInputIterator(element, {
    validateOnSubmit: false,
    environment: "browser",
    values: preSuppliedValues,
    nonInteractive: true,
    onMissingDefault: onMissingDefault ?? "error",
  });
  await iterator.start();
  const result = await iterator.runNonInteractive();
  setValues(result);
  setCurrentIndex(requirements.length);
  return result;
}, [element, preSuppliedValues, onMissingDefault, requirements.length]);
```

### Tests

Add to `test/unit/hooks/useAskIterator.test.tsx`:
- Test `runNonInteractive` returns a Map with auto-filled defaults
- Test `preSuppliedValues` skips those inputs during iteration
- Test `onMissingDefault: "error"` propagates error
- Test `onMissingDefault: "skip"` leaves values undefined

Update `test/setup.ts`:
- Extend the mock `createInputIterator` to support `runNonInteractive()` method
- Support the `values` option to filter out pre-supplied inputs

---

## Phase 3: evaluateFormula Utility and Hook

### Problem

pupt-lib's `evaluateFormula()` evaluates Excel-style formulas against input values (e.g., `"=count>5"`, `"=AND(a>1, b<10)"`). This is useful for conditional UI logic driven by prompt inputs. No React wrapper exists.

### Changes

**`src/utils/formula.ts`** (new file) — Re-export utility:

```typescript
export { evaluateFormula } from "pupt-lib";
```

**`src/hooks/useFormula.ts`** (new file) — Reactive hook:

```typescript
import { useMemo } from "react";
import { evaluateFormula } from "pupt-lib";

export interface UseFormulaOptions {
  /** Formula string (e.g., "=count>5", "=AND(a>1, b<10)") */
  formula: string;
  /** Input values for formula variables */
  inputs: Map<string, unknown>;
}

export interface UseFormulaReturn {
  /** Boolean result of formula evaluation */
  result: boolean;
  /** Error if evaluation failed */
  error: Error | null;
}

export function useFormula(options: UseFormulaOptions): UseFormulaReturn {
  const { formula, inputs } = options;

  return useMemo(() => {
    try {
      return { result: evaluateFormula(formula, inputs), error: null };
    } catch (err) {
      return {
        result: false,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }, [formula, inputs]);
}
```

**Type definitions** in `src/types/hooks.ts`:

```typescript
export interface UseFormulaOptions {
  formula: string;
  inputs: Map<string, unknown>;
}

export interface UseFormulaReturn {
  result: boolean;
  error: Error | null;
}
```

**Barrel exports** — Add to `src/hooks/index.ts`, `src/utils/index.ts`, `src/types/index.ts`, and `src/index.ts`.

### Tests

**`test/unit/hooks/useFormula.test.tsx`**:
- Test simple formula returns true/false
- Test formula with multiple conditions (AND, OR)
- Test error handling for invalid formula
- Test reactivity when inputs Map changes

**`test/unit/utils/formula.test.ts`**:
- Test re-exported `evaluateFormula` works

Update `test/setup.ts`:
- Add mock for `evaluateFormula` that handles basic comparison formulas

---

## Phase 4: Re-exports and Element Introspection

### Problem

Several useful pupt-lib utilities and types are not accessible through pupt-react, forcing consumers to depend on pupt-lib directly for common operations.

### 4A: createRuntimeConfig Re-export

`createRuntimeConfig()` captures runtime environment info (hostname, platform, locale, etc.). Already used directly in the demo app but not exported from pupt-react.

**`src/utils/index.ts`** — Add re-export:

```typescript
export { createRuntimeConfig } from "pupt-lib";
```

**`src/types/context.ts`** — Add type re-export:

```typescript
export type { RuntimeConfig } from "pupt-lib";
```

**`src/index.ts`** — Add to utility exports.

### 4B: Element Introspection Exports

pupt-react already has `traverseElement`, `isElement`, `isAskComponent` in `src/utils/transform.ts` and exports them from `src/utils/index.ts` — but they're NOT exported from the main `src/index.ts` entry point. Additionally, pupt-lib has `isPuptElement`, `isDeferredRef`, `isComponentClass`, and symbols `TYPE`, `PROPS`, `CHILDREN`, `DEFERRED_REF` that consumers building prompt visualization tools would need.

**`src/index.ts`** — Add utility exports:

```typescript
// Export utility functions
export {
  transformSource,
  extractInputRequirements,
  isAskComponent,
  traverseElement,
  isElement,
  validateInput,
  createRuntimeConfig,
  evaluateFormula,
} from "./utils";

// Re-export pupt-lib introspection utilities
export { TYPE, PROPS, CHILDREN, DEFERRED_REF } from "pupt-lib";
export { isPuptElement, isDeferredRef, isComponentClass } from "pupt-lib";
```

**`src/types/context.ts`** — Add type re-exports:

```typescript
export type {
  DeferredRef,
  PuptNode,
  RuntimeConfig,
  SearchEngineConfig,
  OnMissingDefaultStrategy,
} from "pupt-lib";
```

### Tests

**`test/unit/utils/runtimeConfig.test.ts`**:
- Test that `createRuntimeConfig()` returns object with expected shape

**Export smoke test** (extend existing or create `test/unit/exports.test.ts`):
- Verify all new exports are importable from `pupt-react`
- Verify symbols are actual Symbol values
- Verify type guards are functions

---

## Implementation Order

```
Phase 1: SearchEngine Configuration
  1. Add searchConfig prop type to PuptProviderProps
  2. Re-export SearchEngineConfig type
  3. Pass searchConfig to createSearchEngine() in PuptProvider
  4. Add tests
  5. Run lint + build + test

Phase 2: Advanced InputIterator Features
  1. Add OnMissingDefaultStrategy re-export
  2. Extend UseAskIteratorOptions and UseAskIteratorReturn types
  3. Update extractInputRequirements to accept options
  4. Add runNonInteractive to useAskIterator
  5. Update test mocks
  6. Add tests
  7. Run lint + build + test

Phase 3: evaluateFormula Utility and Hook
  1. Create src/utils/formula.ts
  2. Create src/hooks/useFormula.ts
  3. Add UseFormulaOptions and UseFormulaReturn types
  4. Update barrel exports
  5. Add test mocks
  6. Add tests
  7. Run lint + build + test

Phase 4: Re-exports and Element Introspection
  1. Re-export createRuntimeConfig from utils
  2. Re-export RuntimeConfig, DeferredRef, PuptNode types
  3. Export utils from main index.ts
  4. Re-export symbols and type guards from pupt-lib
  5. Add tests
  6. Run lint + build + test
```

---

## File Change Summary

### New Files

| File | Purpose |
|------|---------|
| `src/utils/formula.ts` | Re-export of `evaluateFormula` |
| `src/hooks/useFormula.ts` | Reactive formula evaluation hook |
| `test/unit/hooks/useFormula.test.tsx` | Tests for useFormula |
| `test/unit/utils/formula.test.ts` | Tests for evaluateFormula re-export |
| `test/unit/utils/runtimeConfig.test.ts` | Tests for createRuntimeConfig re-export |
| `test/unit/exports.test.ts` | Smoke test for all new exports |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/context.ts` | Add `searchConfig` to `PuptProviderProps`; re-export `SearchEngineConfig`, `RuntimeConfig`, `OnMissingDefaultStrategy`, `DeferredRef`, `PuptNode` |
| `src/types/hooks.ts` | Extend `UseAskIteratorOptions` and `UseAskIteratorReturn`; add `UseFormulaOptions`, `UseFormulaReturn` |
| `src/types/index.ts` | Re-export new types |
| `src/components/PuptProvider.tsx` | Accept `searchConfig` prop, pass to `createSearchEngine()` |
| `src/hooks/useAskIterator.ts` | Add `runNonInteractive`, pass `preSuppliedValues` to iterator |
| `src/utils/transform.ts` | Add `ExtractOptions` parameter to `extractInputRequirements` |
| `src/utils/index.ts` | Add `evaluateFormula` and `createRuntimeConfig` re-exports |
| `src/hooks/index.ts` | Add `useFormula` export |
| `src/index.ts` | Add all new hook, utility, symbol, and type guard exports |
| `test/setup.ts` | Add mocks for `evaluateFormula`, `runNonInteractive`, and iterator `values` option |
| `test/unit/hooks/useAskIterator.test.tsx` | Add tests for new iterator features |
| `test/unit/components/PuptProvider.test.tsx` | Add test for `searchConfig` prop |

---

## Verification

After each phase, run:

```bash
npm run lint        # ESLint + TypeScript type checking
npm run build       # Ensure dist/ output is correct
npm run test        # All unit + integration tests pass
```

After all phases complete:
- Verify new exports work with `import { ... } from "pupt-react"` in a consuming project
- Verify demo app still works: `npm run dev:demo`
- Check that no existing tests broke
- Review bundle output to confirm no unexpected size increase
