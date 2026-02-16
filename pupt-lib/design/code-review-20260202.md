# Code Review Report - 2/2/2026

## Executive Summary

| Metric | Count |
|--------|-------|
| Files reviewed | 87 production files, 76+ test files |
| Critical issues | 8 |
| High priority issues | 16 |
| Medium priority issues | 24 |
| Low priority issues | 18 |
| DRY violations | 9 major patterns affecting 35+ files |

This codebase was developed over one week using AI assistance and has never been reviewed before. The code is generally well-structured with good test coverage (80%+), but exhibits several patterns typical of AI-generated code including code duplication, overly complex solutions, and inconsistent error handling. The architecture is sound, but several subsystems (module loading, variable passing) have grown organically and would benefit from refactoring.

### Key Findings by Category

- **Security**: 6 issues, mostly around dynamic code execution and path traversal
- **Correctness**: 8 issues including race conditions and missing validation
- **Error Handling**: 12 issues with inconsistent patterns across modules
- **DRY Violations**: 500+ lines of nearly identical code across components
- **AI-Specific Issues**: Hallucinated no-ops, copy-paste errors, overcomplicated solutions

---

## Critical Issues (Fix Immediately)

### 1. Path Traversal Vulnerability in Module Loading

- **Files**: `src/api.ts:129-137`, `src/services/module-loader.ts:231-283`
- **Description**: Local file paths are resolved without validation, allowing directory traversal attacks. An attacker could provide paths like `../../../etc/passwd` or load arbitrary modules.

**Example**: `src/api.ts:129-137`
```typescript
if (isNode && (source.startsWith('./') || source.startsWith('/') || source.startsWith('../'))) {
  const path = await import('path');
  const url = await import('url');
  const absolutePath = path.resolve(process.cwd(), source);  // No validation!
  const fileUrl = url.pathToFileURL(absolutePath).href;
  return await import(/* @vite-ignore */ fileUrl);
}
```

- **Fix**:
```typescript
if (isNode && (source.startsWith('./') || source.startsWith('/') || source.startsWith('../'))) {
  const path = await import('path');
  const url = await import('url');
  const absolutePath = path.resolve(process.cwd(), source);

  // Validate path is within allowed directory
  const allowedBase = path.resolve(process.cwd());
  if (!absolutePath.startsWith(allowedBase + path.sep)) {
    throw new Error(`Security: Cannot load modules outside project directory: ${source}`);
  }

  const fileUrl = url.pathToFileURL(absolutePath).href;
  return await import(/* @vite-ignore */ fileUrl);
}
```

---

### 2. Global Namespace Pollution with Unsanitized Input

- **Files**: `src/create-prompt.ts:128-162`
- **Description**: Custom components are injected via `globalThis` without proper isolation. Component names are injected into code strings without sanitization, creating potential for code injection.

**Example**: `src/create-prompt.ts:128-162`
```typescript
if (components && Object.keys(components).length > 0) {
  globalThis[CUSTOM_COMPONENTS_GLOBAL] = components;

  const componentNames = Object.keys(components);
  // Component names are injected directly into code!
  const extractCode = `const { ${componentNames.join(', ')} } = globalThis.${CUSTOM_COMPONENTS_GLOBAL};\n`;
```

- **Fix**:
```typescript
if (components && Object.keys(components).length > 0) {
  // Validate component names are valid identifiers
  const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
  const componentNames = Object.keys(components);

  for (const name of componentNames) {
    if (!identifierRegex.test(name)) {
      throw new Error(`Invalid component name: "${name}" - must be a valid JavaScript identifier`);
    }
  }

  // Use a unique symbol-based key
  const uniqueKey = `__pupt_components_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  globalThis[uniqueKey] = components;

  const extractCode = `const { ${componentNames.join(', ')} } = globalThis["${uniqueKey}"];\n`;
```

---

### 3. Race Condition in Concurrent Element Resolution

- **Files**: `src/render.ts:230-261`
- **Description**: When multiple components reference the same element simultaneously, there's a window where both could start resolution. The check for `pendingResolutions` and subsequent resolution start is not atomic.

**Example**: `src/render.ts:230-261`
```typescript
// Check if this element was already resolved
if (state.resolvedValues.has(element)) {
  const resolved = state.resolvedValues.get(element);
  return String(resolved);
}

// Check if resolution is already in progress
const pending = state.pendingResolutions.get(element);
if (pending) {
  await pending;
  // Gap here: resolution might have failed and been cleaned up
  if (state.resolvedValues.has(element)) {
    return String(state.resolvedValues.get(element));
  }
}

// Start new resolution - race condition if two calls reach here
const resolutionPromise = renderElement(element, state);
```

- **Fix**: Use `ensureElementResolved` consistently and add atomic resolution tracking:
```typescript
async function renderNode(node: PuptNode, state: RenderState): Promise<string> {
  // ... element detection code ...

  if (isPuptElement(node)) {
    // Use single atomic function for all resolution
    await ensureElementResolved(node, state);

    if (state.resolvedValues.has(node)) {
      return String(state.resolvedValues.get(node));
    }

    // Resolution failed - should have been cached with error
    throw new Error('Element resolution failed');
  }
}
```

---

### 4. Missing resolveSchema Validation

- **Files**: `src/render.ts:298-299`, `src/component.ts:59`
- **Description**: Components can define a `resolveSchema` for validating resolved values, but this schema is never used. Resolved values bypass validation entirely.

**Example**: `src/component.ts:56-59`
```typescript
static schema: ZodObject<ZodRawShape>;  // Used for props
static resolveSchema?: ZodObject<ZodRawShape>;  // NEVER USED
```

- **Fix** in `src/render.ts` after line 299:
```typescript
const resolveResult = resolveFn();
resolvedValue = resolveResult instanceof Promise ? await resolveResult : resolveResult;

// Add validation of resolved value
const componentClass = type as typeof Component;
if (componentClass.resolveSchema && resolvedValue !== undefined) {
  const validation = componentClass.resolveSchema.safeParse(resolvedValue);
  if (!validation.success) {
    state.context.errors.push({
      type: 'validation',
      message: `Invalid resolved value for ${componentClass.name}: ${validation.error.message}`,
      component: componentClass.name,
    });
  }
}
```

---

### 5. Arbitrary Code Execution Without Sandboxing

- **Files**: `src/services/module-evaluator.ts:33-39`, `src/services/input-iterator.ts:245-258`
- **Description**: Modules are evaluated via dynamic import without any sandboxing. Components are instantiated during input requirement collection, potentially executing malicious code.

**Example**: `src/services/module-evaluator.ts:33-39`
```typescript
// Browser: Create blob URL and import
const blob = new Blob([code], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);
try {
  const module = await import(/* @vite-ignore */ url);  // Executes arbitrary code
```

- **Impact**: This is by design for a prompt library, but should be documented as a security consideration. Add a warning in documentation and consider adding an optional sandbox mode for untrusted sources.

---

### 6. No Circular Dependency Detection

- **Files**: `src/render.ts` (entire resolution system)
- **Description**: If two components reference each other's resolved values, the system will deadlock indefinitely with no error message.

**Example** (problematic user code):
```tsx
<ComponentA data={componentB.value} name="componentA" />
<ComponentB data={componentA.value} name="componentB" />
```

- **Fix**: Add cycle detection in `ensureElementResolved`:
```typescript
const resolvingSet = new Set<PuptElement>();  // Add to RenderState

async function ensureElementResolved(element: PuptElement, state: RenderState): Promise<void> {
  if (state.resolvedValues.has(element)) return;

  // Detect cycles
  if (state.resolvingSet.has(element)) {
    const elementName = getElementName(element);
    throw new Error(`Circular dependency detected: ${elementName} references itself`);
  }

  state.resolvingSet.add(element);
  try {
    // ... existing resolution logic ...
  } finally {
    state.resolvingSet.delete(element);
  }
}
```

---

### 7. ReDoS Vulnerability in Import Regex

- **Files**: `src/create-prompt.ts:142-153`
- **Description**: The regex pattern for finding import statements uses nested quantifiers that could cause catastrophic backtracking with crafted input.

**Example**: `src/create-prompt.ts:146`
```typescript
const fullImportRegex = /import\s+(?:(?:\{[^}]*\}|[^;{]*)\s+from\s+)?['"][^'"]+['"];?/g;
```

- **Fix**: Use Babel's AST parser instead of regex:
```typescript
import { parse } from '@babel/standalone';

function findLastImportEnd(source: string): number {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  let lastImportEnd = 0;

  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration' && node.end) {
      lastImportEnd = Math.max(lastImportEnd, node.end);
    }
  }

  return lastImportEnd;
}
```

---

### 8. Silent Error Swallowing in Module Loading

- **Files**: `src/api.ts:93-119`
- **Description**: All module loading errors are silently caught and ignored, making debugging impossible and hiding potential security issues.

**Example**: `src/api.ts:117-119`
```typescript
} catch {
  // Skip modules that can't be loaded for prompt detection
}
```

- **Fix**:
```typescript
} catch (error) {
  // Log error for debugging but continue
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`Failed to load module "${source}" for prompt detection:`,
      error instanceof Error ? error.message : String(error));
  }
  // Only skip expected "not a prompt" errors, rethrow unexpected errors
  if (error instanceof SyntaxError ||
      (error instanceof Error && error.message.includes('Cannot find module'))) {
    return; // Expected error, skip
  }
  throw error; // Unexpected error, propagate
}
```

---

## High Priority Issues (Fix Soon)

### 9. Failed Resolution Not Cached

- **Files**: `src/render.ts:62-67`
- **Description**: If an element's resolution fails, the error is not cached. Subsequent attempts will retry the failed resolution, potentially causing performance issues or repeated errors.

**Fix**: Add error caching:
```typescript
interface RenderState {
  context: RenderContext;
  resolvedValues: Map<PuptElement, unknown>;
  pendingResolutions: Map<PuptElement, Promise<string>>;
  failedResolutions: Map<PuptElement, Error>;  // Add this
}
```

---

### 10. Name Hoisting Plugin Over-Aggressive Prevention

- **Files**: `src/services/babel-plugins/name-hoisting.ts:189-193`
- **Description**: The infinite loop prevention skips hoisting for ANY element inside a variable declarator, even when it should be hoisted.

**Example**:
```typescript
// This should hoist "username" but won't:
const wrapper = <div><Ask.Text name="username" /></div>;
```

---

### 11. Missing Ask Components in Shorthand List

- **Files**: `src/services/babel-plugins/name-hoisting.ts:144-148`
- **Description**: `Date`, `File`, and `ReviewFile` Ask components are missing from the shorthand hoisting list.

**Fix**:
```typescript
const askShortNames = new Set([
  'Text', 'Number', 'Select', 'Confirm', 'Editor', 'MultiSelect',
  'Path', 'Secret', 'Choice', 'Rating', 'Option', 'Label',
  'Date', 'File', 'ReviewFile',  // Add these
]);
```

---

### 12. Numeric Index Access Not Supported in DeferredRef

- **Files**: `src/jsx-runtime/index.ts:104-109`
- **Description**: The DeferredRef proxy only handles string property access, but array indices (numbers) should also work for accessing array elements.

**Fix**:
```typescript
if (typeof prop === 'string' || typeof prop === 'number') {
  return createDeferredRef(element, [...path, prop]);
}
```

---

### 13. Incomplete Import Regex Rewriting

- **Files**: `src/services/module-evaluator.ts:122-160`
- **Description**: The regex-based import rewriting doesn't handle multiline imports, imports in comments, or template literals containing import keywords.

**Recommendation**: Use Babel AST transformation instead of regex for import rewriting.

---

### 14. Transformer Sync Method Hidden Dependency

- **Files**: `src/services/transformer.ts:87-99`
- **Description**: `transformSource()` (sync) requires Babel to be pre-loaded via an async method, but this isn't enforced by the type system.

**Fix**: Remove sync method or add explicit preload:
```typescript
// Option 1: Remove sync
async transform(source: string, filename: string): Promise<string>

// Option 2: Add explicit preload
async preload(): Promise<void> { await loadBabel(); }
transformSourceSync(source: string, filename: string): string  // Rename for clarity
```

---

### 15. Import Replacement Substring Bug

- **Files**: `src/services/module-evaluator.ts:144-160`
- **Description**: If one package name is a substring of another (e.g., 'foo' and 'foo-bar'), the replacement could corrupt the longer name.

**Fix**: Sort replacements by length descending:
```typescript
const sortedResolutions = [...resolutions].sort((a, b) => b[0].length - a[0].length);
for (const [specifier, resolved] of sortedResolutions) {
```

---

### 16. Environment Detection Duplication

- **Files**: `src/services/input-iterator.ts:14-20`, `src/services/module-evaluator.ts:13-22`, `src/services/module-loader.ts:7`, `src/api.ts:127`
- **Description**: Environment detection (Node vs Browser) is duplicated in 4+ locations with slight variations.

**Fix**: Create shared utility:
```typescript
// src/services/runtime-env.ts
export const RuntimeEnv = {
  isNode: typeof process !== 'undefined' && process.versions?.node !== undefined,
  isBrowser: typeof window !== 'undefined' && typeof Blob !== 'undefined',
} as const;
```

---

### 17. Hardcoded Component Lists in Preprocessor

- **Files**: `src/services/preprocessor.ts:9-94`
- **Description**: `BUILTIN_COMPONENTS` and `ASK_COMPONENTS` are hardcoded lists that will get out of sync with actual components.

**Recommendation**: Generate these lists at build time from component exports or use a registry pattern.

---

### 18. File Existence Check Without Path Validation

- **Files**: `src/services/input-iterator.ts:505-524, 537-597`
- **Description**: File paths from user input are checked for existence without validating they're within allowed directories.

---

### 19. validateInput Function is 332 Lines

- **Files**: `src/services/input-iterator.ts:283-615`
- **Description**: Massive function handling all validation types. Difficult to test, maintain, and understand.

**Recommendation**: Split into per-type validators:
```typescript
const validators = {
  string: validateStringInput,
  number: validateNumberInput,
  select: validateSelectInput,
  // ...
};
```

---

### 20. Inconsistent Error Message Formats

- **Files**: Multiple service files
- **Description**: Error messages vary in format, detail level, and whether they include original error context.

**Recommendation**: Create an `ErrorFactory` with consistent patterns:
```typescript
class PuptError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) { super(message); }
}
```

---

### 21. Uses-to-Import Plugin Missing Validation

- **Files**: `src/services/babel-plugins/uses-to-import.ts:104-119`
- **Description**: Component names from `<Uses>` are not validated as valid JavaScript identifiers before generating import statements.

---

### 22. No Timeout for Async Resolution

- **Files**: `src/render.ts` (entire resolution system)
- **Description**: If a component's `resolve()` method hangs (e.g., network timeout), the entire render hangs indefinitely.

**Recommendation**: Add configurable timeout:
```typescript
interface RenderOptions {
  resolveTimeout?: number;  // Default 30000ms
}
```

---

### 23. ComponentType Missing Async Function Component Support

- **Files**: `src/types/element.ts:43-45`
- **Description**: Function components can return `Promise<PuptNode>` but the type doesn't include this.

**Fix**:
```typescript
export type ComponentType<P = Record<string, unknown>> =
  | (new () => Component<P>)
  | ((props: P & { children?: PuptNode }) => PuptNode | Promise<PuptNode>);
```

---

### 24. Missing Type Guards for Discriminated Unions

- **Files**: `src/types/index.ts`
- **Description**: `RenderResult` is a discriminated union but there are no exported type guards.

**Fix**:
```typescript
export function isRenderSuccess(result: RenderResult): result is RenderSuccess {
  return result.success === true;
}

export function isRenderFailure(result: RenderResult): result is RenderFailure {
  return result.success === false;
}
```

---

## Medium Priority Issues (Technical Debt)

### 25-33. DRY Violations in Components (9 patterns)

These are significant opportunities to reduce code duplication:

| Pattern | Files Affected | Duplicated Lines | Priority |
|---------|---------------|------------------|----------|
| Delimiter rendering | 9 structural components | ~150 lines | High |
| Option/Label collection | Select, MultiSelect, Rating | ~90 lines identical | High |
| Ask resolve logic | 11 Ask components | ~80 lines | Medium |
| Ask render structure | 14 Ask components | ~200 lines | Medium |
| Empty schema pattern | 5 utility components | ~25 lines | Low |
| Props type definition | 15+ components | ~30 lines | Low |
| Marker component pattern | Label, Option | ~20 lines | Low |
| Runtime info access | Hostname, Username | ~10 lines | Low |
| Child content normalization | 10+ files (no-op bug) | See below | Bug |

**Critical Bug - Child Content Normalization No-Op**:
```typescript
// This line appears in 10+ files and does NOTHING:
const childContent = Array.isArray(children) ? children : children;
```

This is a copy-paste error where the intended logic was lost.

---

### 34. Unused `CommonProps` Interface

- **Files**: `src/types/component.ts:32-35`
- **Description**: `CommonProps` is defined and exported but never used anywhere in the codebase.

---

### 35. Version Hardcoded as Development

- **Files**: `src/index.ts:3`
- **Description**: `VERSION = '0.0.0-development'` should be injected at build time.

---

### 36. Unused `warnings` Field in RenderMetadata

- **Files**: `src/types/render.ts:69`
- **Description**: The `warnings` field is defined but never populated.

---

### 37. Dangerous Type Assertion to `never`

- **Files**: `src/render.ts:354`
- **Description**: `resolvedValue as never` bypasses type safety entirely.

---

### 38. Reserved Props Symbol Entries Never Matched

- **Files**: `src/jsx-runtime/index.ts:67-73`
- **Description**: RESERVED_PROPS includes Symbol entries but the check only receives strings, making them dead code.

---

### 39. Source Location Info Unused in Dev Runtime

- **Files**: `src/jsx-runtime/jsx-dev-runtime.ts:30-40`
- **Description**: The `_source` parameter is accepted but never used for error messages.

---

### 40. Module Loader Cache Inconsistency

- **Files**: `src/services/module-loader.ts:195-199`
- **Description**: `normalizeSource()` is used as cache key but returns source unchanged, causing `./file.js` and `file.js` to be cached separately.

---

### 41. Prompt Detection Logic Incorrect

- **Files**: `src/services/module-loader.ts:180-190`
- **Description**: Checking for `name` prop doesn't reliably identify Prompt elements since many components have `name` props.

---

### 42. Incorrect Export Wrapping for Multi-Statement Code

- **Files**: `src/services/preprocessor.ts:186-188`
- **Description**: Wrapping in parentheses creates an expression, which fails for multiple statements.

---

### 43. CDN URL Construction Missing URL Encoding

- **Files**: `src/services/browser-support.ts:74-100`
- **Description**: Package names with special characters could break or be exploited for URL injection.

---

### 44. extractNameFromPath Doesn't Handle Windows Paths

- **Files**: `src/services/browser-support.ts:306-309`, `src/services/module-loader.ts:306-323`
- **Description**: Path extraction assumes forward slashes only.

---

### 45. Structural Components Naming Inconsistency

- **Files**: `src/services/babel-plugins/name-hoisting.ts:92-98`
- **Description**: `STRUCTURAL_COMPONENTS` constant includes control, data, and reasoning components - misleading name.

---

### 46-48. Inconsistent Property Naming in RenderState

- **Files**: `src/render.ts:16-21`
- **Description**: `pendingResolutions` stores render promises, not just resolution status. Consider renaming to `pendingRenders` or separating concerns.

---

## Low Priority Issues (Nice to Have)

### 49. Console.warn Exposes Internal State
- **File**: `src/render.ts:398`
- Component tree structure exposed in production

### 50. PascalCase Detection Doesn't Handle Non-ASCII
- **File**: `src/services/babel-plugins/name-hoisting.ts:154`
- Non-ASCII uppercase letters not detected

### 51. Comma-Separated Components with Alias Silently Ignored
- **File**: `src/services/babel-plugins/uses-to-import.ts:104-119`
- Should error rather than silently ignore

### 52. Empty Component Names Not Validated
- **File**: `src/services/babel-plugins/uses-to-import.ts:105`
- `component="A, , C"` silently becomes `import { A, C }`

### 53. Boolean `true` Not Filtered in Children
- **File**: `src/jsx-runtime/index.ts:34-35`
- `false` is filtered but `true` could render as string

### 54. Proxy Wrapping Memory Concerns
- **File**: `src/jsx-runtime/index.ts:127-148`
- Deep property chains create many proxy objects

### 55. InputRequirement Type Union Manually Maintained
- **File**: `src/types/input.ts:12`
- String literal union should be derived from components

### 56. CollectedInputs Loses Type Information
- **File**: `src/types/input.ts:74-77`
- `unknown` values lose all type safety

### 57. passthrough() Allows Arbitrary Config Properties
- **File**: `src/types/context.ts:145`
- Runtime config accepts undocumented properties

### 58. Mixed Default and Component Import Order Undocumented
- **File**: `src/services/babel-plugins/uses-to-import.ts:96-120`
- Works but not tested or documented

### 59. STRUCTURAL_COMPONENTS Set Misleadingly Named
- **File**: `src/services/babel-plugins/name-hoisting.ts:92-98`
- Should be `BUILTIN_COMPONENTS_NO_HOIST`

### 60. Temp File Cleanup Errors Silently Ignored
- **File**: `src/services/module-evaluator.ts:213-218`
- Could lead to /tmp filling up

### 61. No Runtime Validation of module.default
- **File**: `src/create-prompt.ts:176`
- Unsafe type assertion without `isPuptElement()` check

### 62. File System Errors Get Generic Messages
- **File**: `src/create-prompt.ts:199-207`
- ENOENT, EACCES, EISDIR should have specific messages

### 63. Version Conflict Detection Only for Parsed Versions
- **File**: `src/services/module-loader.ts:107-113`
- Loading `pkg` then `pkg@1.0.0` doesn't detect conflict

### 64. Special pupt-lib Handling is Fragile
- **File**: `src/services/module-evaluator.ts:93-104`
- Hardcoded paths and fallbacks

### 65. Bare Specifier Detection Incomplete
- **File**: `src/services/module-evaluator.ts:64-82`
- Missing Windows absolute paths (`C:\path`)

### 66. Missing inputSchema Type
- **File**: `src/types/module.ts:38`
- Should be `ZodSchema` not `Record<string, unknown>`

---

## Positive Findings

### Good Patterns to Replicate

1. **Comprehensive Test Coverage**: 80%+ coverage with both unit and integration tests, plus browser tests via Playwright.

2. **Type-Safe Component Props**: Using Zod schemas for runtime validation combined with TypeScript inference (`z.infer<typeof schema>`) is excellent.

3. **Clear Component Architecture**: The separation between `resolve()` (data) and `render()` (presentation) is clean and intuitive.

4. **Proxy-Based Variable Passing**: The deferred reference system is clever and provides an intuitive API for users.

5. **Good Module Organization**: Clear separation between components, services, and types.

6. **Fragment Support**: Proper JSX Fragment handling in the runtime.

7. **Parallel Child Rendering**: Using `Promise.all` for children is correct for performance.

8. **Symbol-Based Element Properties**: Using symbols for internal properties (`TYPE`, `PROPS`, `CHILDREN`) prevents collisions.

9. **Defensive Coding in Type Guards**: `isPuptElement()` and `isDeferredRef()` are well-implemented.

10. **Build System**: Vite + Vitest setup is modern and well-configured.

---

## AI-Generated Code Analysis

Based on research into common AI-generated code issues ([sources below](#sources)), this codebase exhibits several characteristic patterns:

### Patterns Found

1. **Code Duplication (DRY Violations)**: AI tends to repeat similar code rather than abstracting. Found 500+ lines of nearly identical code across components.

2. **Copy-Paste Errors**: The `Array.isArray(children) ? children : children` no-op appears in 10+ files - a clear copy-paste error where intended logic was lost.

3. **Overly Complex Solutions**: The regex-based import detection and rewriting could be much simpler using Babel's AST.

4. **Missing Edge Cases**: No circular dependency detection, no timeout handling, incomplete path validation.

5. **Inconsistent Error Handling**: Some modules wrap errors carefully, others swallow them silently.

6. **Silent Failures**: Multiple empty catch blocks that hide errors.

7. **Hardcoded Lists**: Component lists in preprocessor that need manual maintenance.

8. **Unused Code**: `CommonProps` interface defined but never used, `warnings` field never populated.

### Methodology for Identifying DRY Violations

Applied methodology:
1. **Pattern extraction**: Identified common code patterns (schemas, render methods, resolve logic)
2. **Similarity scoring**: Compared function bodies for >80% structural similarity
3. **Categorization**: Grouped by refactoring approach (base class, utility function, shared constant)
4. **Impact assessment**: Counted affected files and estimated duplicated lines

---

## Recommendations

### Priority 1: Security (This Sprint)

1. Add path validation to all dynamic module loading
2. Validate component names before code injection
3. Add circular dependency detection with clear errors
4. Replace regex-based import parsing with AST parsing

### Priority 2: Correctness (Next Sprint)

5. Fix race condition in element resolution
6. Implement `resolveSchema` validation
7. Add resolution timeout mechanism
8. Cache failed resolutions to prevent retry storms

### Priority 3: Code Quality (Ongoing)

9. Extract delimiter rendering to shared base class (saves ~150 lines)
10. Extract option collection helpers (saves ~90 lines)
11. Create base AskComponent class (saves ~200 lines)
12. Consolidate environment detection to single utility
13. Split 332-line `validateInput` function
14. Fix child content normalization no-op bug

### Priority 4: Architecture (Future)

15. Consider splitting `module-evaluator.ts` into focused modules
16. Move custom component injection to preprocessor or Babel plugin
17. Create `ResolutionManager` class for clearer separation of concerns
18. Generate component lists at build time

---

## File Inventory Summary

### Production Code (src/) - 87 files

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/` | 5 | Core (render, component, api, create-prompt, index) |
| `src/components/` | 60 | Built-in components (structural, ask, data, utility, etc.) |
| `src/services/` | 13 | Business logic (transformer, module-loader, input-iterator, etc.) |
| `src/types/` | 9 | TypeScript type definitions |
| `src/jsx-runtime/` | 2 | Custom JSX runtime |

### Test Code (test/) - 76+ files

| Directory | Files | Purpose |
|-----------|-------|---------|
| `test/unit/` | 64 | Unit tests for all modules |
| `test/integration/` | 6 | End-to-end workflow tests |
| `test/browser/` | 3 | Playwright browser tests |
| `test/fixtures/` | 3 | Test data and mock libraries |

### Configuration - 10 files

- `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`
- `eslint.config.mjs`, `knip.json`
- `.releaserc`, `commitlint.config.js`

---

## Sources

Research on AI-generated code issues:

- [AI Coding Degrades: Silent Failures Emerge - IEEE Spectrum](https://spectrum.ieee.org/ai-coding-degrades)
- [AI vs Human Code Generation Report - CodeRabbit](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report)
- [8 AI Code Generation Mistakes - Futurism](https://vocal.media/futurism/8-ai-code-generation-mistakes-devs-must-fix-to-win-2026)
- [Where Do LLMs Fail When Generating Code? - arXiv](https://arxiv.org/html/2406.08731v1)
- [A Survey of Bugs in AI-Generated Code - arXiv](https://arxiv.org/html/2512.05239v1)
- [A Deep Dive Into LLM Code Generation Mistakes - arXiv](https://arxiv.org/html/2411.01414v1)
- [What's Wrong with LLM-Generated Code? - arXiv](https://arxiv.org/html/2407.06153v1)
- [AI Code Needs More Attention - The Register](https://www.theregister.com/2025/12/17/ai_code_bugs/)
- [Hallucinations in Code - Simon Willison](https://simonwillison.net/2025/Mar/2/hallucinations-in-code/)

---

*Report generated: February 2, 2026*
*Reviewer: Claude (AI-assisted review)*
*Files analyzed: 163 total (87 production, 76+ test)*
