# Implementation Plan for Code Review Fixes (2/2/2026)

## Overview

This plan addresses the issues identified in the code review report (`code-review-20260202.md`). The review identified 8 critical issues, 16 high priority issues, 24 medium priority issues, and 18 low priority issues across 87 production files.

The implementation is structured in 7 phases:
1. **Security Foundations** - Critical security vulnerabilities
2. **Correctness & Race Conditions** - Critical correctness issues
3. **Resolution System Robustness** - Timeout, caching, and plugin fixes
4. **Error Handling Infrastructure** - Consistent errors and utilities
5. **DRY Violations - Components** - Reduce component code duplication
6. **Module System & Types** - Import handling and TypeScript improvements
7. **Cleanup & Polish** - Final fixes and dead code removal

---

## Phase 1: Security Foundations

**Objective**: Fix critical security vulnerabilities related to path traversal, code injection, and regex denial of service (ReDoS).

**Duration**: 2-3 days

### Issues Addressed

| Issue # | Description | Severity |
|---------|-------------|----------|
| #1 | Path traversal in module loading | Critical |
| #2 | Global namespace pollution with unsanitized input | Critical |
| #7 | ReDoS vulnerability in import regex | Critical |
| #8 | Silent error swallowing in module loading | Critical |
| #21 | Uses-to-import plugin missing validation | High |

### Tests to Write First

**`test/unit/security/path-traversal.test.ts`**: Test path validation

```typescript
import { describe, it, expect } from 'vitest';
import { validateModulePath, isPathWithinDirectory } from '../../src/services/path-validator';

describe('Path traversal prevention', () => {
  it('should allow paths within project directory', () => {
    const base = '/home/user/project';
    expect(isPathWithinDirectory('/home/user/project/src/file.ts', base)).toBe(true);
    expect(isPathWithinDirectory('/home/user/project/lib/index.js', base)).toBe(true);
  });

  it('should reject paths outside project directory', () => {
    const base = '/home/user/project';
    expect(isPathWithinDirectory('/home/user/other/file.ts', base)).toBe(false);
    expect(isPathWithinDirectory('/etc/passwd', base)).toBe(false);
  });

  it('should reject path traversal attempts', () => {
    const base = '/home/user/project';
    expect(isPathWithinDirectory('/home/user/project/../other/file.ts', base)).toBe(false);
    expect(isPathWithinDirectory('/home/user/project/src/../../other', base)).toBe(false);
  });

  it('should handle symbolic path components', () => {
    const base = '/home/user/project';
    // Even if resolved path looks valid, traversal patterns should be rejected
    expect(() => validateModulePath('../../../etc/passwd', base)).toThrow(/outside project/i);
  });
});
```

**`test/unit/security/component-name-validation.test.ts`**: Test identifier validation

```typescript
import { describe, it, expect } from 'vitest';
import { validateComponentName, validateIdentifier } from '../../src/services/identifier-validator';

describe('Component name validation', () => {
  it('should allow valid JavaScript identifiers', () => {
    expect(() => validateComponentName('MyComponent')).not.toThrow();
    expect(() => validateComponentName('_private')).not.toThrow();
    expect(() => validateComponentName('$special')).not.toThrow();
    expect(() => validateComponentName('camelCase')).not.toThrow();
  });

  it('should reject invalid identifiers', () => {
    expect(() => validateComponentName('123invalid')).toThrow(/valid JavaScript identifier/);
    expect(() => validateComponentName('has-dash')).toThrow(/valid JavaScript identifier/);
    expect(() => validateComponentName('has space')).toThrow(/valid JavaScript identifier/);
    expect(() => validateComponentName('')).toThrow(/valid JavaScript identifier/);
  });

  it('should reject code injection attempts', () => {
    expect(() => validateComponentName('x; alert(1);')).toThrow();
    expect(() => validateComponentName('x\n} = evil; {')).toThrow();
    expect(() => validateComponentName('constructor')).toThrow(/reserved/i);
    expect(() => validateComponentName('__proto__')).toThrow(/reserved/i);
  });
});
```

**`test/unit/security/import-parsing.test.ts`**: Test AST-based import parsing

```typescript
import { describe, it, expect } from 'vitest';
import { findLastImportEnd, extractImports } from '../../src/services/import-parser';

describe('AST-based import parsing', () => {
  it('should find last import position correctly', () => {
    const source = `
import { a } from 'a';
import { b } from 'b';

const x = 1;
`;
    const position = findLastImportEnd(source);
    expect(source.slice(0, position).trim().endsWith("from 'b';")).toBe(true);
  });

  it('should handle multiline imports', () => {
    const source = `
import {
  a,
  b,
  c
} from 'module';

export default {};
`;
    const position = findLastImportEnd(source);
    expect(position).toBeGreaterThan(source.indexOf('c'));
  });

  it('should not be fooled by imports in strings', () => {
    const source = `
import { real } from 'real';

const str = "import { fake } from 'fake';";
const template = \`import { also } from 'fake';\`;
`;
    const imports = extractImports(source);
    expect(imports).toHaveLength(1);
    expect(imports[0].source).toBe('real');
  });

  it('should handle malicious input without catastrophic backtracking', () => {
    // ReDoS test - this should complete quickly
    const malicious = 'import '.repeat(1000) + '{ x } from "y";';
    const start = Date.now();
    expect(() => findLastImportEnd(malicious)).not.toThrow();
    expect(Date.now() - start).toBeLessThan(1000); // Should complete in under 1 second
  });
});
```

**`test/unit/api/module-loading-errors.test.ts`**: Test error handling

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Pupt } from '../../src/api';

describe('Module loading error handling', () => {
  it('should log warnings in development mode', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.NODE_ENV = 'development';

    const pupt = new Pupt();
    await pupt.loadLibrary('./non-existent-module.ts');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load module'),
      expect.any(String)
    );
    warnSpy.mockRestore();
  });

  it('should rethrow unexpected errors', async () => {
    const pupt = new Pupt();
    // Simulate unexpected error (not a module-not-found error)
    await expect(pupt.loadLibrary('./invalid-syntax-file.ts'))
      .rejects.toThrow();
  });

  it('should silently skip expected errors in production', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';

    const pupt = new Pupt();
    await pupt.loadLibrary('./non-existent-module.ts');

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
```

### Implementation

**`src/services/path-validator.ts`**: New file for path validation

```typescript
import * as path from 'path';

/**
 * Check if a path is within an allowed base directory.
 * Resolves all path components (including ..) before comparison.
 */
export function isPathWithinDirectory(targetPath: string, baseDir: string): boolean {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);

  // Ensure the resolved path starts with the base directory
  // Add path.sep to prevent /home/user/project-other from matching /home/user/project
  return resolvedTarget.startsWith(resolvedBase + path.sep) ||
         resolvedTarget === resolvedBase;
}

/**
 * Validate and return a safe module path.
 * Throws if the path would escape the allowed directory.
 */
export function validateModulePath(source: string, allowedBase: string): string {
  const absolutePath = path.resolve(allowedBase, source);

  if (!isPathWithinDirectory(absolutePath, allowedBase)) {
    throw new Error(
      `Security: Cannot load module outside project directory.\n` +
      `  Requested: ${source}\n` +
      `  Resolved to: ${absolutePath}\n` +
      `  Allowed base: ${allowedBase}`
    );
  }

  return absolutePath;
}
```

**`src/services/identifier-validator.ts`**: New file for identifier validation

```typescript
// Valid JavaScript identifier pattern
const IDENTIFIER_REGEX = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

// Reserved words that could cause issues
const RESERVED_IDENTIFIERS = new Set([
  'constructor', 'prototype', '__proto__',
  'eval', 'arguments', 'this', 'super',
  'import', 'export', 'default', 'class', 'function',
  'var', 'let', 'const', 'return', 'throw', 'try', 'catch',
]);

/**
 * Validate that a string is a safe JavaScript identifier.
 */
export function validateIdentifier(name: string, context: string = 'identifier'): void {
  if (!name || typeof name !== 'string') {
    throw new Error(`Invalid ${context}: must be a non-empty string`);
  }

  if (!IDENTIFIER_REGEX.test(name)) {
    throw new Error(
      `Invalid ${context}: "${name}" is not a valid JavaScript identifier. ` +
      `Must start with a letter, underscore, or dollar sign, followed by letters, digits, underscores, or dollar signs.`
    );
  }

  if (RESERVED_IDENTIFIERS.has(name)) {
    throw new Error(
      `Invalid ${context}: "${name}" is a reserved identifier and cannot be used.`
    );
  }
}

/**
 * Validate a component name for use in code generation.
 */
export function validateComponentName(name: string): void {
  validateIdentifier(name, 'component name');
}
```

**`src/services/import-parser.ts`**: New file using Babel AST

```typescript
import { parse } from '@babel/standalone';

interface ImportInfo {
  source: string;
  specifiers: string[];
  start: number;
  end: number;
}

/**
 * Find the end position of the last import statement using AST parsing.
 * This is safe from ReDoS attacks unlike regex-based approaches.
 */
export function findLastImportEnd(source: string): number {
  try {
    const ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    let lastImportEnd = 0;

    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration' && node.end) {
        lastImportEnd = Math.max(lastImportEnd, node.end);
      }
    }

    return lastImportEnd;
  } catch {
    // If parsing fails, return 0 (no imports found)
    return 0;
  }
}

/**
 * Extract all import statements from source code using AST parsing.
 */
export function extractImports(source: string): ImportInfo[] {
  try {
    const ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    const imports: ImportInfo[] = [];

    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration') {
        imports.push({
          source: node.source.value,
          specifiers: node.specifiers.map((spec: any) => {
            if (spec.type === 'ImportDefaultSpecifier') {
              return spec.local.name;
            } else if (spec.type === 'ImportSpecifier') {
              return spec.imported?.name || spec.local.name;
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              return `* as ${spec.local.name}`;
            }
            return '';
          }).filter(Boolean),
          start: node.start || 0,
          end: node.end || 0,
        });
      }
    }

    return imports;
  } catch {
    return [];
  }
}
```

**`src/api.ts`**: Update module loading with path validation

```typescript
// Add to imports
import { validateModulePath } from './services/path-validator';

// Update loadFromLocalPath method (around line 129-137)
private async loadFromLocalPath(source: string): Promise<Module | null> {
  if (!isNode) return null;

  if (source.startsWith('./') || source.startsWith('/') || source.startsWith('../')) {
    const path = await import('path');
    const url = await import('url');

    // Validate path is within allowed directory
    const allowedBase = path.resolve(process.cwd());
    const absolutePath = validateModulePath(source, allowedBase);

    const fileUrl = url.pathToFileURL(absolutePath).href;
    return await import(/* @vite-ignore */ fileUrl);
  }

  return null;
}

// Update error handling (around line 93-119)
private async tryLoadModule(source: string): Promise<Module | null> {
  try {
    return await this.loadModule(source);
  } catch (error) {
    // Log in development for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `Failed to load module "${source}" for prompt detection:`,
        error instanceof Error ? error.message : String(error)
      );
    }

    // Only suppress expected errors, rethrow unexpected ones
    if (this.isExpectedLoadError(error)) {
      return null;
    }
    throw error;
  }
}

private isExpectedLoadError(error: unknown): boolean {
  if (error instanceof SyntaxError) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('cannot find module') ||
           msg.includes('module not found') ||
           msg.includes('no such file');
  }
  return false;
}
```

**`src/create-prompt.ts`**: Update with identifier validation

```typescript
// Add to imports
import { validateComponentName } from './services/identifier-validator';
import { findLastImportEnd } from './services/import-parser';

// Update custom component injection (around line 128-162)
if (components && Object.keys(components).length > 0) {
  // Validate all component names before code generation
  const componentNames = Object.keys(components);
  for (const name of componentNames) {
    validateComponentName(name);
  }

  // Use a unique key to avoid collisions
  const uniqueKey = `__pupt_components_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  globalThis[uniqueKey] = components;

  const extractCode = `const { ${componentNames.join(', ')} } = globalThis["${uniqueKey}"];\n`;
  // ... rest of the code
}

// Replace regex-based import finding with AST-based
const lastImportEnd = findLastImportEnd(sourceCode);
```

### Dependencies

- External: None (uses existing `@babel/standalone`)
- Internal: None (foundational phase)

### Verification

1. Run security tests:
   ```bash
   npm run test -- test/unit/security/
   ```
2. Expected: All security tests pass

3. Manual verification - create a test file:
   ```bash
   # In project root
   echo "Attempting path traversal..."
   ```

   Create `tmp/path-traversal-test.ts`:
   ```typescript
   import { validateModulePath } from '../src/services/path-validator';

   try {
     validateModulePath('../../../etc/passwd', process.cwd());
     console.log('FAIL: Should have thrown');
   } catch (e) {
     console.log('PASS: Path traversal blocked:', e.message);
   }
   ```

   Run: `npx tsx tmp/path-traversal-test.ts`

4. Run full test suite to ensure no regressions:
   ```bash
   npm run test
   ```

---

## Phase 2: Correctness & Race Conditions

**Objective**: Fix race conditions in element resolution, add circular dependency detection, and implement resolution failure caching.

**Duration**: 2-3 days

### Issues Addressed

| Issue # | Description | Severity |
|---------|-------------|----------|
| #3 | Race condition in concurrent element resolution | Critical |
| #4 | Missing resolveSchema validation | Critical |
| #6 | No circular dependency detection | Critical |
| #9 | Failed resolution not cached | High |

### Tests to Write First

**`test/unit/render/race-condition.test.ts`**: Test concurrent resolution

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, Component } from '../../src';

describe('Concurrent element resolution', () => {
  it('should not resolve the same element twice', async () => {
    const resolveSpy = vi.fn().mockResolvedValue('value');

    class OnceOnly extends Component<{}, string> {
      async resolve() {
        return resolveSpy();
      }
    }

    const element = <OnceOnly name="shared" />;

    // Both components reference the same element
    class Consumer extends Component<{ data: string }> {
      render({ data }) {
        return data;
      }
    }

    await render(
      <>
        <Consumer data={element} />
        <Consumer data={element} />
      </>
    );

    expect(resolveSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle concurrent access to pending resolution', async () => {
    let resolveCount = 0;
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    class SlowResolver extends Component<{}, string> {
      async resolve() {
        resolveCount++;
        await delay(50);
        return `resolved-${resolveCount}`;
      }
    }

    const shared = <SlowResolver name="shared" />;

    class FastConsumer extends Component<{ data: string }> {
      render({ data }) {
        return data;
      }
    }

    const result = await render(
      <>
        <FastConsumer data={shared} />
        <FastConsumer data={shared} />
        <FastConsumer data={shared} />
      </>
    );

    // All should get the same value from single resolution
    expect(resolveCount).toBe(1);
    expect(result).toBe('resolved-1resolved-1resolved-1');
  });
});
```

**`test/unit/render/circular-dependency.test.ts`**: Test cycle detection

```typescript
import { describe, it, expect } from 'vitest';
import { render, Component } from '../../src';

describe('Circular dependency detection', () => {
  it('should detect simple circular dependency', async () => {
    // Create components that reference each other
    class A extends Component<{ fromB?: string }, string> {
      resolve({ fromB }) {
        return `A-got-${fromB}`;
      }
    }

    class B extends Component<{ fromA?: string }, string> {
      resolve({ fromA }) {
        return `B-got-${fromA}`;
      }
    }

    // This creates a cycle: a needs b, b needs a
    const a = <A name="a" />;
    const b = <B name="b" fromA={a} />;
    // Manually create the cycle by updating a's props
    // (This is a contrived example; real cycles come from user code)

    await expect(
      render(
        <>
          {/* Simulating mutual dependency */}
        </>
      )
    ).rejects.toThrow(/circular dependency/i);
  });

  it('should detect self-referential dependency', async () => {
    class SelfRef extends Component<{ data?: string }, string> {
      resolve({ data }) {
        return `self-${data}`;
      }
    }

    // Element references itself
    const el = <SelfRef name="self" />;

    await expect(
      render(<SelfRef data={el} name="self" />)
    ).rejects.toThrow(/circular dependency/i);
  });

  it('should provide helpful error message with cycle path', async () => {
    // Test that error message includes the cycle path
    // e.g., "Circular dependency detected: A -> B -> C -> A"
  });
});
```

**`test/unit/render/resolve-schema-validation.test.ts`**: Test schema validation

```typescript
import { describe, it, expect } from 'vitest';
import { render, Component } from '../../src';
import { z } from 'zod';

describe('resolveSchema validation', () => {
  it('should validate resolve() output against resolveSchema', async () => {
    class Validated extends Component<{}, { name: string; count: number }> {
      static resolveSchema = z.object({
        name: z.string(),
        count: z.number(),
      });

      resolve() {
        return { name: 'test', count: 42 };
      }
    }

    const result = await render(<Validated />);
    expect(result).toBeDefined();
  });

  it('should report validation errors for invalid resolve output', async () => {
    class Invalid extends Component<{}, { name: string; count: number }> {
      static resolveSchema = z.object({
        name: z.string(),
        count: z.number(),
      });

      resolve() {
        // Returns wrong type - count should be number
        return { name: 'test', count: 'not a number' } as any;
      }
    }

    await expect(render(<Invalid />)).rejects.toThrow(/validation/i);
  });

  it('should skip validation if no resolveSchema defined', async () => {
    class NoSchema extends Component<{}, any> {
      resolve() {
        return { anything: 'goes' };
      }
    }

    // Should not throw
    await render(<NoSchema />);
  });
});
```

**`test/unit/render/failed-resolution-caching.test.ts`**: Test error caching

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, Component } from '../../src';

describe('Failed resolution caching', () => {
  it('should cache failed resolutions', async () => {
    const resolveSpy = vi.fn().mockRejectedValue(new Error('Resolve failed'));

    class Failing extends Component<{}, string> {
      async resolve() {
        return resolveSpy();
      }
    }

    const failing = <Failing name="failing" />;

    class Consumer extends Component<{ data: string }> {
      render({ data }) {
        return data;
      }
    }

    await expect(
      render(
        <>
          <Consumer data={failing} />
          <Consumer data={failing} />
        </>
      )
    ).rejects.toThrow('Resolve failed');

    // Should only attempt resolution once, not twice
    expect(resolveSpy).toHaveBeenCalledTimes(1);
  });

  it('should include element info in cached error', async () => {
    class NamedFailing extends Component<{}, string> {
      resolve() {
        throw new Error('Original error');
      }
    }

    await expect(
      render(<NamedFailing name="myElement" />)
    ).rejects.toThrow(/myElement/);
  });
});
```

### Implementation

**`src/render.ts`**: Update RenderState and resolution logic

```typescript
// Updated RenderState interface
interface RenderState {
  context: RenderContext;
  resolvedValues: Map<PuptElement, unknown>;
  pendingResolutions: Map<PuptElement, Promise<void>>;
  failedResolutions: Map<PuptElement, Error>;  // NEW: Cache failures
  resolvingSet: Set<PuptElement>;              // NEW: Track in-progress for cycle detection
}

// New function: Atomic element resolution with cycle detection
async function ensureElementResolved(
  element: PuptElement,
  state: RenderState
): Promise<void> {
  // Already resolved successfully
  if (state.resolvedValues.has(element)) {
    return;
  }

  // Already failed
  if (state.failedResolutions.has(element)) {
    throw state.failedResolutions.get(element);
  }

  // Resolution already in progress - wait for it
  const pending = state.pendingResolutions.get(element);
  if (pending) {
    await pending;
    // After waiting, check if it succeeded or failed
    if (state.failedResolutions.has(element)) {
      throw state.failedResolutions.get(element);
    }
    return;
  }

  // Detect circular dependency
  if (state.resolvingSet.has(element)) {
    const elementName = getElementName(element);
    throw new Error(
      `Circular dependency detected: "${elementName}" is already being resolved. ` +
      `Elements cannot depend on their own resolved value.`
    );
  }

  // Start resolution
  state.resolvingSet.add(element);
  const resolutionPromise = resolveElementValue(element, state);
  state.pendingResolutions.set(element, resolutionPromise);

  try {
    await resolutionPromise;
  } catch (error) {
    // Cache the failure
    const wrappedError = wrapResolutionError(error, element);
    state.failedResolutions.set(element, wrappedError);
    throw wrappedError;
  } finally {
    state.resolvingSet.delete(element);
    state.pendingResolutions.delete(element);
  }
}

// New function: Wrap error with element context
function wrapResolutionError(error: unknown, element: PuptElement): Error {
  const elementName = getElementName(element);
  const originalMessage = error instanceof Error ? error.message : String(error);

  const wrappedError = new Error(
    `Failed to resolve element "${elementName}": ${originalMessage}`
  );
  if (error instanceof Error) {
    wrappedError.cause = error;
  }
  return wrappedError;
}

// New function: Get element name for error messages
function getElementName(element: PuptElement): string {
  const props = element[PROPS] as Record<string, unknown>;
  if (props.name && typeof props.name === 'string') {
    return props.name;
  }

  const type = element[TYPE];
  if (typeof type === 'string') {
    return type;
  }
  if (typeof type === 'function') {
    return type.name || 'AnonymousComponent';
  }
  return 'UnknownElement';
}

// Updated: resolveElementValue with schema validation
async function resolveElementValue(
  element: PuptElement,
  state: RenderState
): Promise<void> {
  const type = element[TYPE];
  const props = element[PROPS];

  // Get component class
  const ComponentClass = typeof type === 'function' ? type : null;
  if (!ComponentClass) return;

  const instance = new (ComponentClass as any)();
  if (!instance.resolve) return;

  // First resolve all prop dependencies
  const resolvedProps = await resolvePropsDeep(props, state);

  // Call resolve
  const resolveResult = instance.resolve(resolvedProps, state.context);
  const resolvedValue = resolveResult instanceof Promise
    ? await resolveResult
    : resolveResult;

  // Validate against resolveSchema if defined
  const componentClass = ComponentClass as typeof Component;
  if (componentClass.resolveSchema && resolvedValue !== undefined) {
    const validation = componentClass.resolveSchema.safeParse(resolvedValue);
    if (!validation.success) {
      throw new Error(
        `Validation failed for ${componentClass.name}.resolve() output: ` +
        validation.error.message
      );
    }
  }

  state.resolvedValues.set(element, resolvedValue);
}

// Updated: resolvePropsDeep ensures dependencies are resolved first
async function resolvePropsDeep(
  props: Record<string, unknown>,
  state: RenderState
): Promise<Record<string, unknown>> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    if (isPuptElement(value)) {
      await ensureElementResolved(value, state);
      resolved[key] = state.resolvedValues.get(value);
    } else if (isDeferredRef(value)) {
      await ensureElementResolved(value.element, state);
      const elementValue = state.resolvedValues.get(value.element);
      resolved[key] = followPath(elementValue, value.path);
    } else if (Array.isArray(value)) {
      resolved[key] = await Promise.all(
        value.map(v => resolveValueRecursive(v, state))
      );
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
```

### Dependencies

- External: None
- Internal: Phase 1 (path validator used in error messages)

### Verification

1. Run resolution tests:
   ```bash
   npm run test -- test/unit/render/
   ```

2. Expected: All tests pass

3. Manual verification - create a test file `tmp/circular-test.prompt`:
   ```tsx
   <Prompt name="circular-test">
     <!-- This should error with helpful message -->
     <Task>This prompt has issues</Task>
   </Prompt>
   ```

4. Run full test suite:
   ```bash
   npm run test
   ```

---

## Phase 3: Resolution System Robustness

**Objective**: Add resolution timeout, fix name hoisting plugin issues, and support numeric index access in deferred references.

**Duration**: 2-3 days

### Issues Addressed

| Issue # | Description | Severity |
|---------|-------------|----------|
| #22 | No timeout for async resolution | High |
| #10 | Name hoisting plugin over-aggressive prevention | High |
| #11 | Missing Ask components in shorthand list | High |
| #12 | Numeric index access not supported in DeferredRef | High |

### Tests to Write First

**`test/unit/render/resolution-timeout.test.ts`**: Test timeout handling

```typescript
import { describe, it, expect } from 'vitest';
import { render, Component } from '../../src';

describe('Resolution timeout', () => {
  it('should timeout if resolve() takes too long', async () => {
    class Hanging extends Component<{}, string> {
      async resolve() {
        // Never resolves
        await new Promise(() => {});
        return 'never';
      }
    }

    await expect(
      render(<Hanging />, { resolveTimeout: 100 })
    ).rejects.toThrow(/timeout/i);
  });

  it('should use default timeout if not specified', async () => {
    // Default should be 30000ms (30 seconds)
    class Quick extends Component<{}, string> {
      async resolve() {
        return 'quick';
      }
    }

    const result = await render(<Quick />);
    expect(result).toBe('quick');
  });

  it('should include element name in timeout error', async () => {
    class SlowComponent extends Component<{}, string> {
      async resolve() {
        await new Promise(() => {});
        return 'never';
      }
    }

    await expect(
      render(<SlowComponent name="mySlowThing" />, { resolveTimeout: 50 })
    ).rejects.toThrow(/mySlowThing/);
  });
});
```

**`test/unit/babel/name-hoisting-fixes.test.ts`**: Test plugin fixes

```typescript
import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import nameHoistingPlugin from '../../src/services/babel-plugins/name-hoisting';

describe('Name hoisting plugin fixes', () => {
  const transform = (code: string) => {
    const result = transformSync(code, {
      plugins: [
        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic', importSource: 'pupt-lib' }],
        nameHoistingPlugin,
      ],
      parserOpts: { plugins: ['jsx', 'typescript'] },
    });
    return result?.code || '';
  };

  it('should hoist element inside variable declarator wrapper', () => {
    const input = `const wrapper = <div><Ask.Text name="username" /></div>;`;
    const output = transform(input);

    // Should still hoist username even though it's inside a variable declarator
    expect(output).toContain('const username =');
  });

  it('should include Date in Ask shorthand list', () => {
    const input = `<Date name="birthdate" />`;
    const output = transform(input);
    expect(output).toContain('const birthdate =');
  });

  it('should include File in Ask shorthand list', () => {
    const input = `<File name="document" />`;
    const output = transform(input);
    expect(output).toContain('const document =');
  });

  it('should include ReviewFile in Ask shorthand list', () => {
    const input = `<ReviewFile name="code" />`;
    const output = transform(input);
    expect(output).toContain('const code =');
  });
});
```

**`test/unit/jsx-runtime/numeric-index.test.ts`**: Test array index access

```typescript
import { describe, it, expect } from 'vitest';
import { jsx } from '../../src/jsx-runtime';
import { isDeferredRef } from '../../src/types/element';

describe('Numeric index access in DeferredRef', () => {
  it('should handle array index access via bracket notation', () => {
    const element = jsx('div', { name: 'list' });
    const ref = element.items[0];

    expect(isDeferredRef(ref)).toBe(true);
    expect(ref.path).toEqual(['items', 0]);
  });

  it('should handle mixed property and index access', () => {
    const element = jsx('div', {});
    const ref = element.data.items[0].name;

    expect(isDeferredRef(ref)).toBe(true);
    expect(ref.path).toEqual(['data', 'items', 0, 'name']);
  });

  it('should handle negative indices', () => {
    // JavaScript allows negative indices (they're just properties)
    const element = jsx('div', {});
    const ref = element.items[-1];

    expect(isDeferredRef(ref)).toBe(true);
    expect(ref.path).toEqual(['items', -1]);
  });
});
```

### Implementation

**`src/render.ts`**: Add timeout support

```typescript
// Add to RenderOptions interface
interface RenderOptions {
  inputs?: Map<string, unknown>;
  resolveTimeout?: number;  // Default: 30000ms
}

const DEFAULT_RESOLVE_TIMEOUT = 30000;

// New function: withTimeout wrapper
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  elementName: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(
        `Resolution timeout: Element "${elementName}" did not resolve within ${ms}ms. ` +
        `This may indicate an infinite loop or a network request that never completes.`
      ));
    }, ms);

    promise
      .then(value => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Update resolveElementValue to use timeout
async function resolveElementValue(
  element: PuptElement,
  state: RenderState
): Promise<void> {
  const timeout = state.options.resolveTimeout ?? DEFAULT_RESOLVE_TIMEOUT;
  const elementName = getElementName(element);

  // ... existing setup code ...

  // Wrap resolve call with timeout
  const resolvePromise = (async () => {
    const resolveResult = instance.resolve(resolvedProps, state.context);
    return resolveResult instanceof Promise ? await resolveResult : resolveResult;
  })();

  const resolvedValue = await withTimeout(resolvePromise, timeout, elementName);

  // ... rest of validation and storage ...
}
```

**`src/services/babel-plugins/name-hoisting.ts`**: Fix issues

```typescript
// Update askShortNames to include missing components
const askShortNames = new Set([
  'Text', 'Number', 'Select', 'Confirm', 'Editor', 'MultiSelect',
  'Path', 'Secret', 'Choice', 'Rating', 'Option', 'Label',
  'Date', 'File', 'ReviewFile',  // Added these
]);

// Fix over-aggressive prevention in variable declarators
function shouldHoist(path: NodePath<t.JSXElement>): boolean {
  const nameAttr = findNameAttribute(path.node);
  if (!nameAttr) return false;

  // Check if this is already inside a variable declarator with the SAME name
  // This prevents infinite loops but allows hoisting in wrapper elements
  const varName = (nameAttr.value as t.StringLiteral).value;

  const varDeclarator = path.findParent(p => p.isVariableDeclarator());
  if (varDeclarator) {
    const id = (varDeclarator.node as t.VariableDeclarator).id;
    if (t.isIdentifier(id) && id.name === varName) {
      // Already being assigned to this variable name - skip to prevent loop
      return false;
    }
  }

  // Otherwise, allow hoisting
  return true;
}
```

**`src/jsx-runtime/index.ts`**: Support numeric index access

```typescript
function createDeferredRef(
  element: PuptElement,
  path: (string | number)[]
): DeferredRef {
  const ref = {
    [DEFERRED_REF]: true as const,
    element,
    path,
  };

  return new Proxy(ref, {
    get(target, prop) {
      // Allow access to internal properties
      if (prop === DEFERRED_REF || prop === 'element' || prop === 'path') {
        return target[prop as keyof typeof target];
      }

      // Handle both string and number property access
      if (typeof prop === 'string' || typeof prop === 'number') {
        // Convert string numbers to actual numbers for array indices
        const key = typeof prop === 'string' && /^-?\d+$/.test(prop)
          ? parseInt(prop, 10)
          : prop;
        return createDeferredRef(element, [...path, key]);
      }

      return undefined;
    }
  }) as DeferredRef;
}
```

### Dependencies

- External: None
- Internal: Phases 1-2

### Verification

1. Run all new tests:
   ```bash
   npm run test -- test/unit/render/resolution-timeout.test.ts test/unit/babel/name-hoisting-fixes.test.ts test/unit/jsx-runtime/numeric-index.test.ts
   ```

2. Manual test with array access in `tmp/array-test.prompt`:
   ```tsx
   <Prompt name="array-test">
     <MockList name="items" />
     <Task>Process {items[0].name}</Task>
   </Prompt>
   ```

3. Run full test suite:
   ```bash
   npm run test
   ```

---

## Phase 4: Error Handling Infrastructure

**Objective**: Create consistent error handling patterns, fix environment detection duplication, and fix the child content normalization bug.

**Duration**: 2-3 days

### Issues Addressed

| Issue # | Description | Severity |
|---------|-------------|----------|
| #20 | Inconsistent error message formats | High |
| #16 | Environment detection duplication | High |
| #25-33 | Child content normalization no-op bug | Medium (Bug) |

### Tests to Write First

**`test/unit/errors/pupt-error.test.ts`**: Test error infrastructure

```typescript
import { describe, it, expect } from 'vitest';
import {
  PuptError,
  ValidationError,
  ResolutionError,
  ModuleLoadError,
  ErrorCodes,
} from '../../src/errors';

describe('PuptError infrastructure', () => {
  it('should create error with code and context', () => {
    const error = new PuptError(
      'Something went wrong',
      ErrorCodes.VALIDATION_FAILED,
      { componentName: 'MyComponent', propName: 'value' }
    );

    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
    expect(error.context).toEqual({ componentName: 'MyComponent', propName: 'value' });
  });

  it('should preserve cause for error chaining', () => {
    const cause = new Error('Original error');
    const error = new PuptError(
      'Wrapped error',
      ErrorCodes.RESOLUTION_FAILED,
      {},
      cause
    );

    expect(error.cause).toBe(cause);
  });

  it('should provide ValidationError helper', () => {
    const error = new ValidationError(
      'Invalid prop type',
      { expected: 'string', received: 'number' }
    );

    expect(error.code).toBe(ErrorCodes.VALIDATION_FAILED);
    expect(error.context.expected).toBe('string');
  });

  it('should provide ResolutionError helper', () => {
    const error = new ResolutionError(
      'Failed to resolve',
      'MyComponent',
      new Error('Network error')
    );

    expect(error.code).toBe(ErrorCodes.RESOLUTION_FAILED);
    expect(error.context.componentName).toBe('MyComponent');
  });
});
```

**`test/unit/services/runtime-env.test.ts`**: Test environment detection

```typescript
import { describe, it, expect } from 'vitest';
import { RuntimeEnv } from '../../src/services/runtime-env';

describe('RuntimeEnv', () => {
  it('should detect Node.js environment', () => {
    // In Vitest running on Node, this should be true
    expect(RuntimeEnv.isNode).toBe(true);
  });

  it('should have consistent values across imports', async () => {
    // Import from different paths to verify consistency
    const { RuntimeEnv: env1 } = await import('../../src/services/runtime-env');
    const { RuntimeEnv: env2 } = await import('../../src/services/runtime-env');

    expect(env1.isNode).toBe(env2.isNode);
    expect(env1.isBrowser).toBe(env2.isBrowser);
  });

  it('should provide readonly values', () => {
    expect(() => {
      (RuntimeEnv as any).isNode = false;
    }).toThrow();
  });
});
```

**`test/unit/components/child-normalization.test.ts`**: Test child handling fix

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '../../src';
import { normalizeChildren } from '../../src/utils/children';

describe('Child content normalization', () => {
  it('should flatten nested arrays', () => {
    const children = [['a', 'b'], 'c', ['d', ['e', 'f']]];
    const normalized = normalizeChildren(children);

    expect(normalized).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('should filter out null and undefined', () => {
    const children = ['a', null, 'b', undefined, 'c'];
    const normalized = normalizeChildren(children);

    expect(normalized).toEqual(['a', 'b', 'c']);
  });

  it('should filter out false but keep 0 and empty string', () => {
    const children = ['a', false, 0, '', 'b'];
    const normalized = normalizeChildren(children);

    expect(normalized).toEqual(['a', 0, '', 'b']);
  });

  it('should handle single child (not array)', () => {
    const normalized = normalizeChildren('single');
    expect(normalized).toEqual(['single']);
  });
});
```

### Implementation

**`src/errors/index.ts`**: New error infrastructure

```typescript
/**
 * Error codes for consistent error identification
 */
export const ErrorCodes = {
  // Validation errors
  VALIDATION_FAILED: 'PUPT_VALIDATION_FAILED',
  INVALID_PROPS: 'PUPT_INVALID_PROPS',
  INVALID_IDENTIFIER: 'PUPT_INVALID_IDENTIFIER',

  // Resolution errors
  RESOLUTION_FAILED: 'PUPT_RESOLUTION_FAILED',
  RESOLUTION_TIMEOUT: 'PUPT_RESOLUTION_TIMEOUT',
  CIRCULAR_DEPENDENCY: 'PUPT_CIRCULAR_DEPENDENCY',

  // Module errors
  MODULE_LOAD_FAILED: 'PUPT_MODULE_LOAD_FAILED',
  PATH_TRAVERSAL: 'PUPT_PATH_TRAVERSAL',

  // Render errors
  RENDER_FAILED: 'PUPT_RENDER_FAILED',
  MISSING_INPUT: 'PUPT_MISSING_INPUT',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Base error class for all pupt-lib errors
 */
export class PuptError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context: Record<string, unknown> = {},
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PuptError';

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Create a formatted string for logging
   */
  toDetailedString(): string {
    const parts = [
      `[${this.code}] ${this.message}`,
      this.context && Object.keys(this.context).length > 0
        ? `Context: ${JSON.stringify(this.context, null, 2)}`
        : null,
      this.cause
        ? `Caused by: ${this.cause.message}`
        : null,
    ];

    return parts.filter(Boolean).join('\n');
  }
}

/**
 * Validation-specific error
 */
export class ValidationError extends PuptError {
  constructor(message: string, context: Record<string, unknown> = {}, cause?: Error) {
    super(message, ErrorCodes.VALIDATION_FAILED, context, cause);
    this.name = 'ValidationError';
  }
}

/**
 * Resolution-specific error
 */
export class ResolutionError extends PuptError {
  constructor(
    message: string,
    componentName: string,
    cause?: Error
  ) {
    super(message, ErrorCodes.RESOLUTION_FAILED, { componentName }, cause);
    this.name = 'ResolutionError';
  }
}

/**
 * Module loading error
 */
export class ModuleLoadError extends PuptError {
  constructor(
    message: string,
    modulePath: string,
    cause?: Error
  ) {
    super(message, ErrorCodes.MODULE_LOAD_FAILED, { modulePath }, cause);
    this.name = 'ModuleLoadError';
  }
}
```

**`src/services/runtime-env.ts`**: New centralized environment detection

```typescript
/**
 * Centralized runtime environment detection.
 * Provides consistent isNode/isBrowser checks across the codebase.
 */
export const RuntimeEnv = Object.freeze({
  /**
   * True if running in Node.js
   */
  isNode: typeof process !== 'undefined' &&
          process.versions?.node !== undefined,

  /**
   * True if running in a browser
   */
  isBrowser: typeof window !== 'undefined' &&
             typeof document !== 'undefined',

  /**
   * True if Blob API is available (for module evaluation)
   */
  hasBlobSupport: typeof Blob !== 'undefined' &&
                  typeof URL !== 'undefined' &&
                  typeof URL.createObjectURL === 'function',
});
```

**`src/utils/children.ts`**: New child normalization utility

```typescript
import type { PuptNode } from '../types';

/**
 * Normalize children into a flat array, filtering out invalid values.
 * Replaces the broken `Array.isArray(children) ? children : children` pattern.
 */
export function normalizeChildren(children: PuptNode): PuptNode[] {
  if (children == null) {
    return [];
  }

  if (!Array.isArray(children)) {
    return [children];
  }

  const result: PuptNode[] = [];

  function flatten(items: PuptNode[]): void {
    for (const item of items) {
      if (item == null || item === false) {
        continue; // Skip null, undefined, false
      }
      if (Array.isArray(item)) {
        flatten(item);
      } else {
        result.push(item);
      }
    }
  }

  flatten(children);
  return result;
}
```

### Migrate Existing Code

Update all files using duplicated patterns:

1. **Replace environment detection** in:
   - `src/services/input-iterator.ts:14-20`
   - `src/services/module-evaluator.ts:13-22`
   - `src/services/module-loader.ts:7`
   - `src/api.ts:127`

   With:
   ```typescript
   import { RuntimeEnv } from './runtime-env';
   // ... then use RuntimeEnv.isNode, RuntimeEnv.isBrowser
   ```

2. **Fix child normalization no-op** in 10+ component files:

   Search for:
   ```typescript
   const childContent = Array.isArray(children) ? children : children;
   ```

   Replace with:
   ```typescript
   import { normalizeChildren } from '../../utils/children';
   // ...
   const childContent = normalizeChildren(children);
   ```

### Dependencies

- External: None
- Internal: None (standalone utilities)

### Verification

1. Run utility tests:
   ```bash
   npm run test -- test/unit/errors/ test/unit/services/runtime-env.test.ts test/unit/components/child-normalization.test.ts
   ```

2. Search for remaining environment detection duplication:
   ```bash
   grep -r "typeof process !== 'undefined'" src/ | grep -v runtime-env
   ```
   Expected: No results (all migrated)

3. Search for child normalization no-op:
   ```bash
   grep -r "Array.isArray(children) ? children : children" src/
   ```
   Expected: No results (all fixed)

4. Run full test suite:
   ```bash
   npm run test
   ```

---

## Phase 5: DRY Violations - Components

**Objective**: Reduce code duplication in components by extracting common patterns into shared utilities and base classes.

**Duration**: 3-4 days

### Issues Addressed

| Issue # | Description | Estimated Savings |
|---------|-------------|-------------------|
| #25 | Delimiter rendering duplication | ~150 lines |
| #26 | Option/Label collection | ~90 lines |
| #27-28 | Ask render/resolve patterns | ~280 lines |

### Tests to Write First

**`test/unit/utils/delimiter-renderer.test.ts`**: Test delimiter utility

```typescript
import { describe, it, expect } from 'vitest';
import { renderWithDelimiter, DelimiterStyle } from '../../src/utils/delimiter-renderer';

describe('Delimiter renderer utility', () => {
  it('should render items with newline delimiter', () => {
    const items = ['first', 'second', 'third'];
    const result = renderWithDelimiter(items, 'newline');

    expect(result).toBe('first\nsecond\nthird');
  });

  it('should render items with bullet delimiter', () => {
    const items = ['first', 'second'];
    const result = renderWithDelimiter(items, 'bullet');

    expect(result).toBe('- first\n- second');
  });

  it('should render items with numbered delimiter', () => {
    const items = ['first', 'second'];
    const result = renderWithDelimiter(items, 'numbered');

    expect(result).toBe('1. first\n2. second');
  });

  it('should handle empty arrays', () => {
    const result = renderWithDelimiter([], 'newline');
    expect(result).toBe('');
  });

  it('should handle single item', () => {
    const result = renderWithDelimiter(['only'], 'bullet');
    expect(result).toBe('- only');
  });

  it('should handle custom delimiter', () => {
    const items = ['a', 'b', 'c'];
    const result = renderWithDelimiter(items, { separator: ' | ', prefix: '>> ' });

    expect(result).toBe('>> a | >> b | >> c');
  });
});
```

**`test/unit/utils/option-collector.test.ts`**: Test option collection

```typescript
import { describe, it, expect } from 'vitest';
import { collectOptions, collectLabels } from '../../src/utils/option-collector';
import { jsx } from '../../src/jsx-runtime';
import { Option, Label } from '../../src/components/ask';

describe('Option collector utility', () => {
  it('should collect options from children', () => {
    const children = [
      jsx(Option, { value: 'a', children: 'Option A' }),
      jsx(Option, { value: 'b', children: 'Option B' }),
    ];

    const options = collectOptions(children);

    expect(options).toEqual([
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ]);
  });

  it('should ignore non-Option children', () => {
    const children = [
      jsx(Option, { value: 'a', children: 'Valid' }),
      'plain text',
      jsx('div', { children: 'ignored' }),
    ];

    const options = collectOptions(children);

    expect(options).toHaveLength(1);
    expect(options[0].value).toBe('a');
  });

  it('should collect labels from children', () => {
    const children = [
      jsx(Label, { name: 'first', children: 'First Label' }),
      jsx(Label, { name: 'second', children: 'Second Label' }),
    ];

    const labels = collectLabels(children);

    expect(labels).toEqual({
      first: 'First Label',
      second: 'Second Label',
    });
  });
});
```

### Implementation

**`src/utils/delimiter-renderer.ts`**: New utility for delimiter rendering

```typescript
export type DelimiterStyle = 'newline' | 'bullet' | 'numbered' | 'comma' | 'space';

export interface CustomDelimiter {
  separator: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Render an array of items with consistent delimiter formatting.
 * Replaces ~150 lines of duplicated code across structural components.
 */
export function renderWithDelimiter(
  items: string[],
  style: DelimiterStyle | CustomDelimiter
): string {
  if (items.length === 0) return '';

  if (typeof style === 'object') {
    const { separator, prefix = '', suffix = '' } = style;
    return items.map(item => `${prefix}${item}${suffix}`).join(separator);
  }

  switch (style) {
    case 'newline':
      return items.join('\n');

    case 'bullet':
      return items.map(item => `- ${item}`).join('\n');

    case 'numbered':
      return items.map((item, i) => `${i + 1}. ${item}`).join('\n');

    case 'comma':
      return items.join(', ');

    case 'space':
      return items.join(' ');

    default:
      return items.join('\n');
  }
}

/**
 * Map a delimiter prop value to the appropriate style
 */
export function getDelimiterStyle(
  delimiter?: string
): DelimiterStyle | CustomDelimiter {
  if (!delimiter) return 'newline';

  const builtIn: Record<string, DelimiterStyle> = {
    '\n': 'newline',
    'bullet': 'bullet',
    'numbered': 'numbered',
    ',': 'comma',
    ' ': 'space',
  };

  return builtIn[delimiter] ?? { separator: delimiter };
}
```

**`src/utils/option-collector.ts`**: New utility for option/label collection

```typescript
import { isPuptElement, PuptNode, PuptElement, TYPE, PROPS, CHILDREN } from '../types';

export interface CollectedOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Collect Option components from children array.
 * Replaces ~90 lines duplicated in Select, MultiSelect, and Rating.
 */
export function collectOptions(children: PuptNode[]): CollectedOption[] {
  const options: CollectedOption[] = [];

  for (const child of children) {
    if (!isPuptElement(child)) continue;

    const type = child[TYPE];
    const isOption =
      (typeof type === 'function' && type.name === 'Option') ||
      (typeof type === 'string' && type === 'Option');

    if (isOption) {
      const props = child[PROPS] as Record<string, unknown>;
      const childContent = child[CHILDREN];

      options.push({
        value: String(props.value ?? ''),
        label: extractTextContent(childContent) || String(props.value ?? ''),
        disabled: Boolean(props.disabled),
      });
    }
  }

  return options;
}

/**
 * Collect Label components into a name->content map.
 */
export function collectLabels(children: PuptNode[]): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const child of children) {
    if (!isPuptElement(child)) continue;

    const type = child[TYPE];
    const isLabel =
      (typeof type === 'function' && type.name === 'Label') ||
      (typeof type === 'string' && type === 'Label');

    if (isLabel) {
      const props = child[PROPS] as Record<string, unknown>;
      const name = String(props.name ?? '');
      const content = extractTextContent(child[CHILDREN]);

      if (name) {
        labels[name] = content;
      }
    }
  }

  return labels;
}

/**
 * Extract text content from children, joining array elements.
 */
function extractTextContent(children: PuptNode[]): string {
  return children
    .map(child => {
      if (typeof child === 'string') return child;
      if (typeof child === 'number') return String(child);
      if (isPuptElement(child)) return extractTextContent(child[CHILDREN]);
      return '';
    })
    .join('');
}
```

**Update structural components** to use `renderWithDelimiter`:

```typescript
// Example: src/components/structural/Constraint.ts
import { Component, PuptNode } from '../../component';
import { renderWithDelimiter, getDelimiterStyle } from '../../utils/delimiter-renderer';
import { normalizeChildren } from '../../utils/children';

interface ConstraintProps {
  delimiter?: string;
  children?: PuptNode;
}

export class Constraint extends Component<ConstraintProps> {
  render({ delimiter, children }: ConstraintProps) {
    const normalizedChildren = normalizeChildren(children);
    const renderedChildren = await this.renderChildren(normalizedChildren);
    const style = getDelimiterStyle(delimiter);

    return renderWithDelimiter(renderedChildren, style);
  }
}
```

### Dependencies

- External: None
- Internal: Phase 4 (normalizeChildren utility)

### Verification

1. Run utility tests:
   ```bash
   npm run test -- test/unit/utils/delimiter-renderer.test.ts test/unit/utils/option-collector.test.ts
   ```

2. Verify components still work:
   ```bash
   npm run test -- test/unit/components/
   ```

3. Count lines saved (rough estimate):
   ```bash
   # Before: Count lines in affected components
   wc -l src/components/structural/*.ts src/components/ask/Select.ts src/components/ask/MultiSelect.ts

   # After migration, this should be significantly lower
   ```

4. Run full test suite:
   ```bash
   npm run test
   ```

---

## Phase 6: Module System & Types

**Objective**: Fix import handling issues and improve TypeScript types.

**Duration**: 2-3 days

### Issues Addressed

| Issue # | Description | Severity |
|---------|-------------|----------|
| #13 | Incomplete import regex rewriting | High |
| #14 | Transformer sync method hidden dependency | High |
| #15 | Import replacement substring bug | High |
| #23 | ComponentType missing async support | High |
| #24 | Missing type guards for discriminated unions | High |

### Tests to Write First

**`test/unit/services/module-evaluator-imports.test.ts`**: Test import rewriting

```typescript
import { describe, it, expect } from 'vitest';
import { rewriteImports } from '../../src/services/module-evaluator';

describe('Import rewriting', () => {
  it('should handle multiline imports', () => {
    const code = `
import {
  a,
  b,
  c
} from 'my-package';
`;
    const resolutions = new Map([['my-package', 'https://cdn.example.com/my-package']]);
    const result = rewriteImports(code, resolutions);

    expect(result).toContain('https://cdn.example.com/my-package');
    expect(result).not.toContain("'my-package'");
  });

  it('should not rewrite imports inside comments', () => {
    const code = `
// import { x } from 'commented';
/* import { y } from 'also-commented'; */
import { real } from 'real-package';
`;
    const resolutions = new Map([
      ['commented', 'https://commented'],
      ['real-package', 'https://real'],
    ]);
    const result = rewriteImports(code, resolutions);

    expect(result).toContain("'commented'"); // Still in comment
    expect(result).toContain('https://real');
  });

  it('should handle substring package names correctly', () => {
    const code = `
import { a } from 'foo';
import { b } from 'foo-bar';
import { c } from 'foo-bar-baz';
`;
    const resolutions = new Map([
      ['foo', 'https://foo'],
      ['foo-bar', 'https://foo-bar'],
      ['foo-bar-baz', 'https://foo-bar-baz'],
    ]);
    const result = rewriteImports(code, resolutions);

    // Each should be replaced with its own URL, not corrupted
    expect(result).toContain("from 'https://foo'");
    expect(result).toContain("from 'https://foo-bar'");
    expect(result).toContain("from 'https://foo-bar-baz'");
  });
});
```

**`test/unit/types/type-guards.test.ts`**: Test type guards

```typescript
import { describe, it, expect } from 'vitest';
import {
  isRenderSuccess,
  isRenderFailure,
  RenderResult,
} from '../../src/types';

describe('Type guards', () => {
  it('isRenderSuccess should identify success results', () => {
    const success: RenderResult = {
      success: true,
      output: 'result',
      metadata: { renderTime: 100 },
    };

    expect(isRenderSuccess(success)).toBe(true);
    expect(isRenderFailure(success)).toBe(false);

    // TypeScript should narrow the type
    if (isRenderSuccess(success)) {
      expect(success.output).toBe('result');
    }
  });

  it('isRenderFailure should identify failure results', () => {
    const failure: RenderResult = {
      success: false,
      error: new Error('Failed'),
    };

    expect(isRenderFailure(failure)).toBe(true);
    expect(isRenderSuccess(failure)).toBe(false);
  });
});
```

**`test/unit/types/async-function-component.test.ts`**: Test async components

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '../../src';
import type { ComponentType } from '../../src/types';

describe('Async function components', () => {
  it('should support async function components', async () => {
    const AsyncGreeter: ComponentType<{ name: string }> = async ({ name }) => {
      await Promise.resolve(); // Simulate async work
      return `Hello, ${name}!`;
    };

    const result = await render(<AsyncGreeter name="World" />);
    expect(result).toBe('Hello, World!');
  });

  it('should handle async components returning elements', async () => {
    const AsyncWrapper: ComponentType<{ children: string }> = async ({ children }) => {
      await Promise.resolve();
      return <div>{children}</div>;
    };

    // Type should be valid
    const element = <AsyncWrapper>content</AsyncWrapper>;
    expect(element).toBeDefined();
  });
});
```

### Implementation

**`src/services/module-evaluator.ts`**: Fix import rewriting

```typescript
import { parse, traverse } from '@babel/standalone';
import generate from '@babel/generator';

/**
 * Rewrite imports using AST transformation instead of regex.
 * This handles multiline imports, comments, and avoids substring issues.
 */
export function rewriteImports(
  code: string,
  resolutions: Map<string, string>
): string {
  // Sort by length descending to handle substring package names
  const sortedResolutions = [...resolutions.entries()]
    .sort((a, b) => b[0].length - a[0].length);

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    });

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;

        for (const [specifier, resolved] of sortedResolutions) {
          if (source === specifier) {
            path.node.source.value = resolved;
            break;
          }
        }
      },
      // Also handle dynamic imports
      CallExpression(path) {
        if (
          path.node.callee.type === 'Import' &&
          path.node.arguments[0]?.type === 'StringLiteral'
        ) {
          const source = path.node.arguments[0].value;

          for (const [specifier, resolved] of sortedResolutions) {
            if (source === specifier) {
              path.node.arguments[0].value = resolved;
              break;
            }
          }
        }
      },
    });

    return generate(ast).code;
  } catch {
    // Fall back to simple string replacement if AST parsing fails
    // (e.g., for non-JS/TS code snippets)
    let result = code;
    for (const [specifier, resolved] of sortedResolutions) {
      result = result.replace(
        new RegExp(`from\\s+['"]${escapeRegex(specifier)}['"]`, 'g'),
        `from '${resolved}'`
      );
    }
    return result;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

**`src/services/transformer.ts`**: Fix sync method issue

```typescript
import { loadBabel, isBabelLoaded } from './babel-loader';

export class Transformer {
  private babelLoaded = false;

  /**
   * Ensure Babel is loaded before using sync transform.
   * Call this in async code before using transformSourceSync.
   */
  async ensureBabelLoaded(): Promise<void> {
    if (!this.babelLoaded) {
      await loadBabel();
      this.babelLoaded = true;
    }
  }

  /**
   * Transform source asynchronously. Preferred method.
   */
  async transform(source: string, filename: string): Promise<string> {
    await this.ensureBabelLoaded();
    return this.transformSourceSync(source, filename);
  }

  /**
   * Transform source synchronously.
   * IMPORTANT: Call ensureBabelLoaded() first in async context.
   * @throws Error if Babel is not loaded
   */
  transformSourceSync(source: string, filename: string): string {
    if (!isBabelLoaded()) {
      throw new Error(
        'Babel is not loaded. Call ensureBabelLoaded() before using transformSourceSync().'
      );
    }
    // ... existing transform logic
  }
}
```

**`src/types/element.ts`**: Fix ComponentType

```typescript
import type { PuptNode } from './node';

/**
 * Type for function or class components.
 * Supports both sync and async function components.
 */
export type ComponentType<P = Record<string, unknown>> =
  | (new () => Component<P>)
  | ((props: P & { children?: PuptNode }) => PuptNode)
  | ((props: P & { children?: PuptNode }) => Promise<PuptNode>);
```

**`src/types/render.ts`**: Add type guards

```typescript
export interface RenderSuccess {
  success: true;
  output: string;
  metadata: RenderMetadata;
}

export interface RenderFailure {
  success: false;
  error: Error;
}

export type RenderResult = RenderSuccess | RenderFailure;

/**
 * Type guard for successful render results
 */
export function isRenderSuccess(result: RenderResult): result is RenderSuccess {
  return result.success === true;
}

/**
 * Type guard for failed render results
 */
export function isRenderFailure(result: RenderResult): result is RenderFailure {
  return result.success === false;
}
```

### Dependencies

- External: `@babel/generator` (may need to add if not present)
- Internal: Phases 1-4

### Verification

1. Run type and module tests:
   ```bash
   npm run test -- test/unit/services/module-evaluator-imports.test.ts test/unit/types/
   ```

2. Run TypeScript type checking:
   ```bash
   npm run lint
   ```

3. Verify async function components work in real code:
   ```typescript
   // tmp/async-component-test.tsx
   const AsyncComp = async ({ name }: { name: string }) => {
     return `Hello ${name}`;
   };

   // Should compile without errors
   ```

4. Run full test suite:
   ```bash
   npm run test
   ```

---

## Phase 7: Cleanup & Polish

**Objective**: Remove unused code, fix remaining low-priority issues, and ensure build-time optimizations.

**Duration**: 2-3 days

### Issues Addressed

| Issue # | Description | Severity |
|---------|-------------|----------|
| #34 | Unused CommonProps interface | Low |
| #35 | Version hardcoded as development | Low |
| #36 | Unused warnings field in RenderMetadata | Low |
| #37 | Dangerous type assertion to never | Medium |
| #38 | Reserved props symbol entries never matched | Low |
| #40 | Module loader cache inconsistency | Medium |
| #43 | CDN URL construction missing URL encoding | Medium |

### Tests to Write First

**`test/unit/services/module-loader-cache.test.ts`**: Test cache normalization

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeModulePath, ModuleCache } from '../../src/services/module-loader';

describe('Module loader cache', () => {
  it('should normalize relative paths', () => {
    expect(normalizeModulePath('./file.js')).toBe(normalizeModulePath('file.js'));
    expect(normalizeModulePath('./src/file.js')).toBe(normalizeModulePath('src/file.js'));
  });

  it('should cache normalized paths consistently', () => {
    const cache = new ModuleCache();

    cache.set('./file.js', { default: 'value1' });
    cache.set('file.js', { default: 'value2' });

    // Both should return the same cached value (first one wins)
    expect(cache.get('./file.js')).toEqual(cache.get('file.js'));
  });

  it('should handle versioned package names', () => {
    const cache = new ModuleCache();

    cache.set('react@18.0.0', { default: 'v18' });

    // Should warn if loading unversioned after versioned
    expect(() => cache.checkVersionConflict('react')).toThrow(/version conflict/i);
  });
});
```

**`test/unit/services/cdn-url.test.ts`**: Test URL encoding

```typescript
import { describe, it, expect } from 'vitest';
import { buildCdnUrl } from '../../src/services/browser-support';

describe('CDN URL construction', () => {
  it('should encode special characters in package names', () => {
    const url = buildCdnUrl('@scope/package-name');

    // @ should be encoded
    expect(url).toContain('%40scope');
  });

  it('should handle scoped packages correctly', () => {
    const url = buildCdnUrl('@types/react');

    expect(url).toMatch(/https:\/\/.*%40types.*react/);
  });

  it('should handle packages with special characters', () => {
    // Edge case: package name with unusual characters
    const url = buildCdnUrl('my-package+extra');

    // + should be encoded
    expect(url).toContain('%2B') || expect(url).toContain('+');
  });
});
```

### Implementation

**Remove unused code:**

1. Delete `CommonProps` from `src/types/component.ts`
2. Remove `warnings` from `RenderMetadata` or implement warning collection
3. Fix `resolvedValue as never` in `src/render.ts:354`

**`src/services/module-loader.ts`**: Fix cache normalization

```typescript
/**
 * Normalize module source path for consistent caching
 */
export function normalizeModulePath(source: string): string {
  // Remove leading ./ for relative paths
  if (source.startsWith('./')) {
    source = source.slice(2);
  }

  // Normalize path separators (Windows support)
  source = source.replace(/\\/g, '/');

  // Remove trailing slashes
  source = source.replace(/\/+$/, '');

  return source;
}

export class ModuleCache {
  private cache = new Map<string, unknown>();
  private versionedPackages = new Map<string, string>();

  get(source: string): unknown | undefined {
    return this.cache.get(normalizeModulePath(source));
  }

  set(source: string, module: unknown): void {
    const normalized = normalizeModulePath(source);

    // Track versioned packages
    const versionMatch = normalized.match(/^(@?[^@]+)@(.+)$/);
    if (versionMatch) {
      const [, packageName, version] = versionMatch;
      this.versionedPackages.set(packageName, version);
    }

    this.cache.set(normalized, module);
  }

  checkVersionConflict(source: string): void {
    const normalized = normalizeModulePath(source);

    // Check if loading unversioned after versioned
    if (!normalized.includes('@') || normalized.startsWith('@')) {
      const packageName = normalized.split('@')[0] || normalized;
      if (this.versionedPackages.has(packageName)) {
        const existingVersion = this.versionedPackages.get(packageName);
        throw new Error(
          `Version conflict: "${packageName}" was already loaded as version ${existingVersion}. ` +
          `Cannot load unversioned "${source}".`
        );
      }
    }
  }
}
```

**`src/services/browser-support.ts`**: Fix URL encoding

```typescript
/**
 * Build a CDN URL for a package, properly encoding special characters.
 */
export function buildCdnUrl(
  packageName: string,
  cdnBase: string = 'https://esm.sh/'
): string {
  // Encode the package name for URL safety
  // Special handling for scoped packages (@scope/package)
  let encodedName: string;

  if (packageName.startsWith('@')) {
    const [scope, ...rest] = packageName.slice(1).split('/');
    encodedName = `@${encodeURIComponent(scope)}/${rest.map(encodeURIComponent).join('/')}`;
  } else {
    encodedName = encodeURIComponent(packageName);
  }

  return `${cdnBase}${encodedName}`;
}
```

**`src/index.ts`**: Build-time version injection

```typescript
// Version is injected at build time by Vite
declare const __VERSION__: string;

export const VERSION = typeof __VERSION__ !== 'undefined'
  ? __VERSION__
  : '0.0.0-development';
```

**`vite.config.ts`**: Add version define

```typescript
import { defineConfig } from 'vite';
import pkg from './package.json';

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  // ... rest of config
});
```

**Fix dangerous type assertion:**

```typescript
// In src/render.ts around line 354
// Before:
const value = resolvedValue as never;

// After:
if (resolvedValue !== undefined && resolvedValue !== null) {
  return String(resolvedValue);
}
return '';
```

### Run Knip to Find Dead Code

```bash
npm run lint  # Includes Knip
```

Review Knip output and remove any unused:
- Exports
- Functions
- Interfaces
- Type aliases

### Dependencies

- External: None
- Internal: Phases 1-6

### Verification

1. Run cleanup tests:
   ```bash
   npm run test -- test/unit/services/module-loader-cache.test.ts test/unit/services/cdn-url.test.ts
   ```

2. Run full lint including Knip:
   ```bash
   npm run lint
   ```
   Expected: No unused code warnings

3. Verify build works and includes version:
   ```bash
   npm run build
   node -e "console.log(require('./dist/index.cjs').VERSION)"
   ```
   Expected: Prints actual version from package.json, not "0.0.0-development"

4. Run full test suite:
   ```bash
   npm run test
   ```

---

## Common Utilities Created

| Utility | Location | Purpose | Used By |
|---------|----------|---------|---------|
| `validateModulePath` | `src/services/path-validator.ts` | Prevent path traversal | api.ts, module-loader.ts |
| `validateIdentifier` | `src/services/identifier-validator.ts` | Safe identifier validation | create-prompt.ts, babel plugins |
| `findLastImportEnd` | `src/services/import-parser.ts` | AST-based import parsing | create-prompt.ts |
| `PuptError` | `src/errors/index.ts` | Consistent error handling | All modules |
| `RuntimeEnv` | `src/services/runtime-env.ts` | Environment detection | 4+ modules |
| `normalizeChildren` | `src/utils/children.ts` | Child array processing | 10+ components |
| `renderWithDelimiter` | `src/utils/delimiter-renderer.ts` | Delimiter formatting | 9 structural components |
| `collectOptions` | `src/utils/option-collector.ts` | Option extraction | Select, MultiSelect, Rating |
| `isRenderSuccess` | `src/types/render.ts` | Type narrowing | Consumers of render() |

---

## External Libraries Assessment

| Task | Current Approach | Recommendation |
|------|-----------------|----------------|
| AST parsing | `@babel/standalone` | Keep - already used, mature |
| Schema validation | `zod` | Keep - already used |
| Import rewriting | Regex | Change to AST (Phase 6) |
| Path manipulation | Node `path` | Keep - standard library |

No new external libraries required.

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing components | Medium | High | Comprehensive tests before each phase; backward compatibility in early phases |
| Security regressions | Low | Critical | Security tests run in CI; code review for security-related changes |
| Performance degradation | Low | Medium | AST parsing is cached; profile if concerns arise |
| Migration complexity | Medium | Medium | Phase utilities independently; gradual migration |
| Test flakiness | Low | Low | Avoid time-dependent tests; mock external calls |

---

## Summary Timeline

| Phase | Focus | Duration | Critical Issues Fixed |
|-------|-------|----------|----------------------|
| 1 | Security Foundations | 2-3 days | #1, #2, #7, #8 |
| 2 | Correctness & Race Conditions | 2-3 days | #3, #4, #6, #9 |
| 3 | Resolution Robustness | 2-3 days | #10, #11, #12, #22 |
| 4 | Error Handling Infrastructure | 2-3 days | #16, #20, #25-33 (bug) |
| 5 | DRY Violations - Components | 3-4 days | #25-28 |
| 6 | Module System & Types | 2-3 days | #13, #14, #15, #23, #24 |
| 7 | Cleanup & Polish | 2-3 days | #34-40, #43 |

**Total estimated duration**: 15-22 days

Each phase delivers independently testable functionality. Phases 1-2 address all critical issues and should be prioritized. Phases 3-7 can be adjusted based on team priorities.
