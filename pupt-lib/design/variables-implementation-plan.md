# Implementation Plan for Component Communication (Variables)

## Overview

This plan implements the component communication design from `variables-design.md`, enabling components to share resolved values through a natural JSX syntax. The core changes are:

1. **Two-phase rendering**: Components have `resolve()` (compute value) and `render()` (produce output)
2. **Proxy-wrapped elements**: Property access like `{github.stars}` creates deferred references
3. **Babel name hoisting**: `<Ask.Text name="username" />` creates `const username = jsx(...)`
4. **Unified resolution**: Renderer resolves all dependencies before rendering

This plan is structured as five phases, each delivering independently testable functionality.

---

## Phase 1: Core Infrastructure (Symbols + Component Base Class)

**Objective**: Establish the foundation for the new component model by adding symbols for internal element properties and updating the Component base class to support `resolve()` and `render()` methods.

**Duration**: 2-3 days

### Tests to Write First

**`test/unit/component-resolve.test.ts`**: Test the new Component class structure

```typescript
import { describe, it, expect } from 'vitest';
import { Component, RenderContext } from 'pupt-lib';

describe('Component with resolve()', () => {
  it('should allow components with only resolve()', () => {
    class StringComponent extends Component<{ value: string }, string> {
      resolve(props: { value: string }) {
        return props.value.toUpperCase();
      }
    }
    const instance = new StringComponent();
    expect(instance.resolve({ value: 'hello' })).toBe('HELLO');
  });

  it('should allow components with resolve() and render()', () => {
    class DataComponent extends Component<{ id: number }, { name: string }> {
      resolve(props: { id: number }) {
        return { name: `User ${props.id}` };
      }
      render(props: { id: number }, value: { name: string }) {
        return `Name: ${value.name}`;
      }
    }
    const instance = new DataComponent();
    const resolved = instance.resolve({ id: 42 });
    expect(resolved).toEqual({ name: 'User 42' });
  });

  it('should allow async resolve()', async () => {
    class AsyncComponent extends Component<{}, number> {
      async resolve() {
        return Promise.resolve(42);
      }
    }
    const instance = new AsyncComponent();
    expect(await instance.resolve({})).toBe(42);
  });
});
```

**`test/unit/element-symbols.test.ts`**: Test symbol-based element structure

```typescript
import { describe, it, expect } from 'vitest';
import { jsx } from 'pupt-lib/jsx-runtime';
import { TYPE, PROPS, CHILDREN, isPuptElement } from 'pupt-lib';

describe('Element symbols', () => {
  it('should use symbols for internal properties', () => {
    const element = jsx('div', { id: 'test' });
    expect(element[TYPE]).toBe('div');
    expect(element[PROPS]).toEqual({ id: 'test' });
    expect(element[CHILDREN]).toEqual([]);
  });

  it('should identify PuptElements correctly', () => {
    const element = jsx('div', {});
    expect(isPuptElement(element)).toBe(true);
    expect(isPuptElement({})).toBe(false);
    expect(isPuptElement(null)).toBe(false);
  });
});
```

### Implementation

**`src/types/symbols.ts`**: Create new file for element symbols

```typescript
// Internal symbols for element properties - prevents collision with property access
export const TYPE = Symbol('pupt.type');
export const PROPS = Symbol('pupt.props');
export const CHILDREN = Symbol('pupt.children');

// Marker for identifying deferred references
export const DEFERRED_REF = Symbol('pupt.deferredRef');
```

**`src/component.ts`**: Update Component base class

```typescript
export abstract class Component<
  Props = Record<string, unknown>,
  ResolveType = void
> {
  static schema?: z.ZodSchema;
  static resolveSchema?: z.ZodSchema;

  // Optional: Compute the resolved value
  resolve?(props: Props, context: RenderContext): ResolveType | Promise<ResolveType>;

  // Optional: Produce visual output (receives resolved value if resolve() exists)
  render?(props: Props, value: ResolveType, context: RenderContext): PuptNode | Promise<PuptNode>;
}
```

**`src/types/element.ts`**: Update PuptElement to use symbols internally

```typescript
import { TYPE, PROPS, CHILDREN } from './symbols';

export interface PuptElement<P = Record<string, unknown>> {
  [TYPE]: string | symbol | ComponentType<P>;
  [PROPS]: P;
  [CHILDREN]: PuptNode[];
}

export interface DeferredRef {
  [DEFERRED_REF]: true;
  element: PuptElement;
  path: (string | number)[];
}
```

**`src/jsx-runtime/index.ts`**: Update to use symbols

```typescript
import { TYPE, PROPS, CHILDREN } from '../types/symbols';

export function jsx<P>(type: ElementType<P>, props: P): PuptElement<P> {
  const { children, ...rest } = props as any;
  return {
    [TYPE]: type,
    [PROPS]: rest as P,
    [CHILDREN]: children ? (Array.isArray(children) ? children : [children]) : [],
  };
}
```

### Dependencies

- External: None (uses existing Zod for schema validation)
- Internal: None (foundational phase)

### Verification

1. Run: `npm run test -- test/unit/component-resolve.test.ts test/unit/element-symbols.test.ts`
2. Expected output: All tests pass
3. Run: `npm run build` to verify no type errors
4. Existing tests should still pass: `npm run test`

### Migration Notes

- Existing components with only `render()` continue to work (backward compatible)
- The `ResolveType` generic defaults to `void` for components without resolve()
- Internal code accessing `element.type`, `element.props`, `element.children` must migrate to symbols

---

## Phase 2: Renderer Value Resolution

**Objective**: Update the renderer to support the two-phase model: first resolve all component values, then render with resolved props. This phase delivers the core value-passing capability.

**Duration**: 2-3 days

### Tests to Write First

**`test/unit/render-resolve.test.ts`**: Test renderer resolution logic

```typescript
import { describe, it, expect } from 'vitest';
import { render, Component } from 'pupt-lib';

describe('Renderer value resolution', () => {
  it('should call resolve() before render()', async () => {
    const callOrder: string[] = [];

    class TrackedComponent extends Component<{}, string> {
      resolve() {
        callOrder.push('resolve');
        return 'resolved-value';
      }
      render(props: {}, value: string) {
        callOrder.push('render');
        return `Value: ${value}`;
      }
    }

    const result = await render(<TrackedComponent />);
    expect(callOrder).toEqual(['resolve', 'render']);
    expect(result).toBe('Value: resolved-value');
  });

  it('should pass resolved element values as props', async () => {
    class Inner extends Component<{ prefix: string }, string> {
      resolve({ prefix }: { prefix: string }) {
        return `${prefix}-inner`;
      }
    }

    class Outer extends Component<{ value: string }> {
      render({ value }: { value: string }) {
        return `Got: ${value}`;
      }
    }

    const inner = <Inner prefix="test" />;
    const result = await render(<Outer value={inner} />);
    expect(result).toBe('Got: test-inner');
  });

  it('should handle components with only resolve()', async () => {
    class ValueOnly extends Component<{}, number> {
      resolve() {
        return 42;
      }
    }

    const result = await render(<ValueOnly />);
    expect(result).toBe('42');
  });

  it('should handle async resolve()', async () => {
    class AsyncFetch extends Component<{}, { data: string }> {
      async resolve() {
        return { data: 'fetched' };
      }
      render(props: {}, value: { data: string }) {
        return value.data;
      }
    }

    const result = await render(<AsyncFetch />);
    expect(result).toBe('fetched');
  });
});
```

**`test/integration/resolve-chain.test.ts`**: Test chained value resolution

```typescript
import { describe, it, expect } from 'vitest';
import { render, Component } from 'pupt-lib';

describe('Chained resolution', () => {
  it('should resolve dependency chain: A -> B -> C', async () => {
    class A extends Component<{}, string> {
      resolve() { return 'a-value'; }
    }

    class B extends Component<{ from: string }, string> {
      resolve({ from }: { from: string }) { return `${from}+b`; }
    }

    class C extends Component<{ from: string }> {
      render({ from }: { from: string }) { return `Final: ${from}`; }
    }

    const a = <A />;
    const b = <B from={a} />;
    const result = await render(<C from={b} />);
    expect(result).toBe('Final: a-value+b');
  });
});
```

### Implementation

**`src/render.ts`**: Core renderer updates

```typescript
// Add to renderer state
interface RenderState {
  resolvedValues: Map<PuptElement, unknown>;
  // ... existing state
}

// New function: resolve props by looking up element values
function resolveProps(props: Record<string, unknown>, state: RenderState): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isPuptElement(value)) {
      resolved[key] = state.resolvedValues.get(value);
    } else if (isDeferredRef(value)) {
      const elementValue = state.resolvedValues.get(value.element);
      resolved[key] = followPath(elementValue, value.path);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

// New function: follow property path on resolved value
function followPath(obj: unknown, path: (string | number)[]): unknown {
  return path.reduce((current, key) => {
    if (current == null) return undefined;
    return (current as Record<string | number, unknown>)[key];
  }, obj);
}

// Updated render logic
async function renderElement(element: PuptElement, state: RenderState): Promise<string> {
  const component = getComponent(element);
  const resolvedProps = resolveProps(element[PROPS], state);

  // Phase 1: Resolve value if component has resolve()
  let value: unknown;
  if (component.resolve) {
    value = await component.resolve(resolvedProps, state.context);
    state.resolvedValues.set(element, value);
  }

  // Phase 2: Render if component has render(), otherwise stringify value
  if (component.render) {
    const output = await component.render(resolvedProps, value, state.context);
    return renderNode(output, state);
  } else if (value !== undefined) {
    return String(value);
  }

  return '';
}
```

### Dependencies

- External: None
- Internal: Phase 1 (symbols, Component class updates)

### Verification

1. Run: `npm run test -- test/unit/render-resolve.test.ts test/integration/resolve-chain.test.ts`
2. Expected output: All new tests pass
3. Run: `npm run test` to verify no regressions
4. Manual test with a simple prompt file:

```tsx
// tmp/test-resolve.prompt
<Prompt name="test-resolve">
  <Task>Say hello to the user</Task>
</Prompt>
```

Run: `npm run prompt` and select `test-resolve` - should render normally

---

## Phase 3: Proxy-Wrapped Elements and Deferred References

**Objective**: Wrap all JSX elements in Proxies to intercept property access. When a user writes `{github.stars}`, create a deferred reference that the renderer resolves at render time.

**Duration**: 2-3 days

### Tests to Write First

**`test/unit/proxy-element.test.ts`**: Test Proxy behavior

```typescript
import { describe, it, expect } from 'vitest';
import { jsx } from 'pupt-lib/jsx-runtime';
import { TYPE, PROPS, isDeferredRef, isPuptElement } from 'pupt-lib';

describe('Proxy-wrapped elements', () => {
  it('should allow symbol access on proxied elements', () => {
    const element = jsx('div', { id: 'test' });
    expect(element[TYPE]).toBe('div');
    expect(element[PROPS]).toEqual({ id: 'test' });
  });

  it('should create deferred ref on property access', () => {
    const element = jsx('div', { name: 'github' });
    const ref = element.stars;

    expect(isDeferredRef(ref)).toBe(true);
    expect(ref.element).toBe(element);
    expect(ref.path).toEqual(['stars']);
  });

  it('should chain property access in deferred refs', () => {
    const element = jsx('div', {});
    const ref = element.user.address.city;

    expect(isDeferredRef(ref)).toBe(true);
    expect(ref.path).toEqual(['user', 'address', 'city']);
  });

  it('should handle array index access', () => {
    const element = jsx('div', {});
    const ref = element.items[0].name;

    expect(isDeferredRef(ref)).toBe(true);
    expect(ref.path).toEqual(['items', '0', 'name']);
  });

  it('should handle reserved properties correctly', () => {
    const element = jsx('div', {});

    // These should not create deferred refs
    expect(isDeferredRef(element.then)).toBe(false);
    expect(isDeferredRef(element.catch)).toBe(false);
    expect(isDeferredRef(element.constructor)).toBe(false);
  });
});
```

**`test/unit/render-deferred-ref.test.ts`**: Test renderer with deferred refs

```typescript
import { describe, it, expect } from 'vitest';
import { render, Component } from 'pupt-lib';

describe('Rendering deferred references', () => {
  it('should resolve deferred ref to nested property', async () => {
    class DataSource extends Component<{}, { user: { name: string } }> {
      resolve() {
        return { user: { name: 'Alice' } };
      }
    }

    class Display extends Component<{ value: string }> {
      render({ value }: { value: string }) {
        return `Name: ${value}`;
      }
    }

    const source = <DataSource name="data" />;
    const result = await render(<Display value={source.user.name} />);
    expect(result).toBe('Name: Alice');
  });

  it('should resolve array index access', async () => {
    class ListSource extends Component<{}, string[]> {
      resolve() {
        return ['first', 'second', 'third'];
      }
    }

    class Display extends Component<{ item: string }> {
      render({ item }: { item: string }) {
        return `Item: ${item}`;
      }
    }

    const list = <ListSource />;
    const result = await render(<Display item={list[1]} />);
    expect(result).toBe('Item: second');
  });
});
```

### Implementation

**`src/jsx-runtime/index.ts`**: Add Proxy wrapping

```typescript
import { TYPE, PROPS, CHILDREN, DEFERRED_REF } from '../types/symbols';

const RESERVED_PROPS = new Set([
  'then', 'catch', 'finally',  // Promise methods
  'constructor', 'prototype', '__proto__',
  'toJSON', 'toString', 'valueOf',
  'Symbol.toPrimitive', 'Symbol.toStringTag',
]);

function createDeferredRef(element: PuptElement, path: (string | number)[]): DeferredRef {
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
      // Extend path for chained access
      if (typeof prop === 'string' || typeof prop === 'number') {
        return createDeferredRef(element, [...path, String(prop)]);
      }
      return undefined;
    }
  }) as DeferredRef;
}

function wrapWithProxy<P>(element: PuptElement<P>): PuptElement<P> {
  return new Proxy(element, {
    get(target, prop) {
      // Allow symbol access (internal properties)
      if (typeof prop === 'symbol') {
        return target[prop as keyof typeof target];
      }
      // Reserved properties return undefined or actual property
      if (RESERVED_PROPS.has(prop as string)) {
        return undefined;
      }
      // Any other property access creates a deferred reference
      return createDeferredRef(target, [prop as string]);
    }
  });
}

export function jsx<P>(type: ElementType<P>, props: P): PuptElement<P> {
  const { children, ...rest } = props as any;
  const element = {
    [TYPE]: type,
    [PROPS]: rest as P,
    [CHILDREN]: children ? (Array.isArray(children) ? children : [children]) : [],
  };
  return wrapWithProxy(element);
}
```

**`src/types/element.ts`**: Add DeferredRef type and helper

```typescript
export interface DeferredRef {
  [DEFERRED_REF]: true;
  element: PuptElement;
  path: (string | number)[];
}

export function isDeferredRef(value: unknown): value is DeferredRef {
  return value != null &&
         typeof value === 'object' &&
         DEFERRED_REF in value;
}
```

### Dependencies

- External: None
- Internal: Phase 1 (symbols), Phase 2 (renderer resolution)

### Verification

1. Run: `npm run test -- test/unit/proxy-element.test.ts test/unit/render-deferred-ref.test.ts`
2. Expected output: All tests pass
3. Run: `npm run test` to verify no regressions
4. Manual verification in Node REPL:

```javascript
const { jsx } = require('pupt-lib/jsx-runtime');
const el = jsx('div', { name: 'test' });
console.log(el.foo.bar.baz); // Should show deferred ref object
```

---

## Phase 4: Babel Transform for Named Variables

**Objective**: Create a Babel plugin that transforms `<Ask.Text name="username" />` into a variable declaration `const username = jsx(Ask.Text, { name: "username" })`, enabling natural variable syntax.

**Duration**: 2-3 days

### Tests to Write First

**`test/unit/babel-name-hoisting.test.ts`**: Test Babel transformation

```typescript
import { describe, it, expect } from 'vitest';
import { transformSync } from '@babel/core';
import { nameHoistingPlugin } from '../src/babel/name-hoisting-plugin';

describe('Babel name hoisting plugin', () => {
  const transform = (code: string) => {
    const result = transformSync(code, {
      plugins: [
        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic', importSource: 'pupt-lib' }],
        nameHoistingPlugin,
      ],
      parserOpts: { plugins: ['jsx'] },
    });
    return result?.code || '';
  };

  it('should hoist named element to variable declaration', () => {
    const input = '<Ask.Text name="username" default="test" />';
    const output = transform(input);

    expect(output).toContain('const username =');
    expect(output).toContain('jsx(Ask.Text');
  });

  it('should keep element in place when used inline', () => {
    const input = `
      <Ask.Text name="username" default="test" />
      <Component value={username} />
    `;
    const output = transform(input);

    expect(output).toContain('const username =');
    // The JSX for Component should reference the variable
    expect(output).toMatch(/jsx\(Component,.*username/);
  });

  it('should handle multiple named elements', () => {
    const input = `
      <Ask.Text name="user1" />
      <Ask.Text name="user2" />
    `;
    const output = transform(input);

    expect(output).toContain('const user1 =');
    expect(output).toContain('const user2 =');
  });

  it('should preserve elements without name attribute', () => {
    const input = '<Ask.Text default="test" />';
    const output = transform(input);

    expect(output).not.toContain('const');
    expect(output).toContain('jsx(Ask.Text');
  });

  it('should handle name attribute with property access', () => {
    const input = `
      <GitHubUserInfo username="octocat" name="github" />
      <Display stars={github.stars} />
    `;
    const output = transform(input);

    expect(output).toContain('const github =');
    expect(output).toMatch(/github\.stars/);
  });
});
```

**`test/integration/prompt-file-transform.test.ts`**: Test end-to-end .prompt file transformation

```typescript
import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from 'pupt-lib';

describe('.prompt file transformation', () => {
  it('should transform prompt with named variables', async () => {
    const source = `
      <Prompt name="test">
        <Ask.Text name="username" default="World" />
        <Task>Greet {username}</Task>
      </Prompt>
    `;

    const prompt = await createPromptFromSource(source);
    const result = await prompt.render({ inputs: new Map([['username', 'Alice']]) });

    expect(result).toContain('Greet Alice');
  });

  it('should transform prompt with component value passing', async () => {
    const source = `
      <Prompt name="test">
        <Ask.Text name="query" default="test" />
        <SearchComponent query={query} name="results" />
        <Data>{results.count}</Data>
      </Prompt>
    `;

    // This tests the full pipeline including name hoisting and deferred ref resolution
    const prompt = await createPromptFromSource(source);
    // ... test with mock SearchComponent
  });
});
```

### Implementation

**`src/babel/name-hoisting-plugin.ts`**: Create new Babel plugin

```typescript
import { PluginObj, types as t } from '@babel/core';

export function nameHoistingPlugin(): PluginObj {
  return {
    name: 'pupt-name-hoisting',
    visitor: {
      JSXElement(path) {
        // Find name attribute
        const nameAttr = path.node.openingElement.attributes.find(
          (attr): attr is t.JSXAttribute =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === 'name' &&
            t.isStringLiteral(attr.value)
        );

        if (!nameAttr || !t.isStringLiteral(nameAttr.value)) {
          return;
        }

        const varName = nameAttr.value.value;

        // Validate variable name
        if (!t.isValidIdentifier(varName)) {
          throw path.buildCodeFrameError(
            `Invalid variable name: "${varName}". Must be a valid JavaScript identifier.`
          );
        }

        // Check if we're in a position where hoisting makes sense
        const statementParent = path.findParent(p => p.isStatement() || p.isProgram());
        if (!statementParent) return;

        // Create variable declaration: const varName = <OriginalJSX />
        const varDeclaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(varName),
            path.node
          )
        ]);

        // Replace the JSX with variable reference, insert declaration before
        if (path.parentPath.isExpressionStatement()) {
          // If the JSX is a standalone statement, replace with variable declaration
          // and add the variable reference as the next statement
          path.parentPath.replaceWithMultiple([
            varDeclaration,
            t.expressionStatement(t.identifier(varName))
          ]);
        } else {
          // JSX is part of an expression - insert declaration before the statement
          // and replace JSX with variable reference
          statementParent.insertBefore(varDeclaration);
          path.replaceWith(t.identifier(varName));
        }
      }
    }
  };
}
```

**`src/babel/preset.ts`**: Register the new plugin

```typescript
import { nameHoistingPlugin } from './name-hoisting-plugin';

export default function puptBabelPreset() {
  return {
    plugins: [
      nameHoistingPlugin,
      // ... existing plugins
    ],
    // ... existing presets
  };
}
```

**`src/services/transformer.ts`**: Ensure plugin is used in runtime transform

```typescript
function getTransformPlugins() {
  return [
    nameHoistingPlugin,
    // ... existing plugins
  ];
}
```

### Dependencies

- External: `@babel/core`, `@babel/types` (already dependencies)
- Internal: Phases 1-3

### Verification

1. Run: `npm run test -- test/unit/babel-name-hoisting.test.ts test/integration/prompt-file-transform.test.ts`
2. Expected output: All tests pass
3. Run: `npm run build` to verify build works
4. Manual test with a real prompt file:

```tsx
// tmp/test-named-vars.prompt
<Prompt name="test-named-vars">
  <Ask.Text name="username" label="Your name" default="World" />
  <Task>Write a greeting for {username}.</Task>
</Prompt>
```

Run: `npm run prompt`, select `test-named-vars`, enter a name, verify the output includes the entered name.

---

## Phase 5: Ask Component Migration and Polish

**Objective**: Migrate all Ask components to the new resolve/render model, implement parallel async resolution, add TypeScript improvements, and ensure comprehensive error handling.

**Duration**: 3-4 days

### Tests to Write First

**`test/unit/ask-resolve.test.ts`**: Test Ask components with resolve()

```typescript
import { describe, it, expect } from 'vitest';
import { render, Ask, Component } from 'pupt-lib';

describe('Ask components with resolve()', () => {
  it('Ask.Text should resolve to input value', async () => {
    const result = await render(
      <Ask.Text name="username" default="default-value" />,
      { inputs: new Map([['username', 'Alice']]) }
    );
    expect(result).toBe('Alice');
  });

  it('Ask.Number should resolve to number', async () => {
    const result = await render(
      <Ask.Number name="count" default={0} />,
      { inputs: new Map([['count', 42]]) }
    );
    expect(result).toBe('42');
  });

  it('Ask.Select should resolve to selected option', async () => {
    const result = await render(
      <Ask.Select name="choice" options={['a', 'b', 'c']} />,
      { inputs: new Map([['choice', 'b']]) }
    );
    expect(result).toBe('b');
  });

  it('should pass Ask value to other component', async () => {
    class Greeter extends Component<{ name: string }> {
      render({ name }: { name: string }) {
        return `Hello, ${name}!`;
      }
    }

    const prompt = (
      <>
        <Ask.Text name="username" default="World" />
        <Greeter name={username} />
      </>
    );

    const result = await render(prompt, {
      inputs: new Map([['username', 'Alice']])
    });
    expect(result).toContain('Hello, Alice!');
  });
});
```

**`test/unit/parallel-resolution.test.ts`**: Test parallel async resolution

```typescript
import { describe, it, expect } from 'vitest';
import { render, Component } from 'pupt-lib';

describe('Parallel async resolution', () => {
  it('should resolve independent components in parallel', async () => {
    const timing: string[] = [];

    class SlowA extends Component<{}, string> {
      async resolve() {
        timing.push('A-start');
        await delay(50);
        timing.push('A-end');
        return 'A';
      }
    }

    class SlowB extends Component<{}, string> {
      async resolve() {
        timing.push('B-start');
        await delay(50);
        timing.push('B-end');
        return 'B';
      }
    }

    const start = Date.now();
    await render(
      <>
        <SlowA />
        <SlowB />
      </>
    );
    const elapsed = Date.now() - start;

    // If parallel, should take ~50ms, not ~100ms
    expect(elapsed).toBeLessThan(80);
    // Both should start before either finishes
    expect(timing.indexOf('B-start')).toBeLessThan(timing.indexOf('A-end'));
  });

  it('should wait for dependencies before resolving', async () => {
    const timing: string[] = [];

    class Source extends Component<{}, string> {
      async resolve() {
        timing.push('Source-start');
        await delay(30);
        timing.push('Source-end');
        return 'data';
      }
    }

    class Consumer extends Component<{ data: string }> {
      render({ data }: { data: string }) {
        timing.push('Consumer-render');
        return data;
      }
    }

    const source = <Source />;
    await render(<Consumer data={source} />);

    // Consumer should render after Source resolves
    expect(timing).toEqual(['Source-start', 'Source-end', 'Consumer-render']);
  });
});

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**`test/unit/error-handling.test.ts`**: Test error messages

```typescript
import { describe, it, expect } from 'vitest';
import { render, Component } from 'pupt-lib';

describe('Error handling', () => {
  it('should provide helpful error for undefined property access', async () => {
    class Source extends Component<{}, { name: string }> {
      resolve() { return { name: 'test' }; }
    }

    class Consumer extends Component<{ value: string }> {
      render({ value }: { value: string }) { return value; }
    }

    const source = <Source />;

    await expect(
      render(<Consumer value={source.nonexistent.deep} />)
    ).rejects.toThrow(/property.*nonexistent.*undefined/i);
  });

  it('should error if resolve() throws', async () => {
    class Failing extends Component<{}, string> {
      resolve() {
        throw new Error('Intentional failure');
      }
    }

    await expect(render(<Failing />)).rejects.toThrow('Intentional failure');
  });
});
```

### Implementation

**`src/components/ask/text.ts`**: Update Ask.Text (example pattern for all Ask components)

```typescript
interface TextProps {
  name: string;
  label?: string;
  default?: string;
  placeholder?: string;
}

export class Text extends Component<TextProps, string> {
  static schema = z.object({
    name: z.string(),
    label: z.string().optional(),
    default: z.string().optional(),
    placeholder: z.string().optional(),
  });

  resolve(props: TextProps, context: RenderContext): string {
    const value = context.inputs.get(props.name);
    if (value !== undefined) return String(value);
    if (props.default !== undefined) return props.default;
    throw new Error(`No input provided for "${props.name}" and no default specified`);
  }

  // No render() - resolved value is rendered directly
}
```

**`src/render.ts`**: Add parallel async resolution

```typescript
async function resolveAllElements(
  elements: PuptElement[],
  state: RenderState
): Promise<void> {
  const resolvePromises = new Map<PuptElement, Promise<void>>();

  async function resolveElement(element: PuptElement): Promise<void> {
    const component = getComponent(element);
    if (!component.resolve) return;

    // Wait for elements this one depends on
    const deps = findElementDependencies(element[PROPS]);
    await Promise.all(deps.map(dep => resolvePromises.get(dep)));

    // Resolve this element
    const resolvedProps = resolveProps(element[PROPS], state);
    const value = await component.resolve(resolvedProps, state.context);
    state.resolvedValues.set(element, value);
  }

  // Start all resolutions immediately
  for (const element of elements) {
    resolvePromises.set(element, resolveElement(element));
  }

  await Promise.all(resolvePromises.values());
}

function findElementDependencies(props: Record<string, unknown>): PuptElement[] {
  const deps: PuptElement[] = [];
  for (const value of Object.values(props)) {
    if (isPuptElement(value)) {
      deps.push(value);
    } else if (isDeferredRef(value)) {
      deps.push(value.element);
    }
  }
  return deps;
}
```

**`src/types/component.ts`**: Enhanced TypeScript generics

```typescript
// Better type inference for property access
type ResolveTypeOf<C> = C extends Component<any, infer R> ? R : never;

// Type-safe element reference
type ElementRef<C extends Component<any, any>> = PuptElement & {
  [K in keyof ResolveTypeOf<C>]: DeferredRef;
};
```

### Migrate All Ask Components

Update each Ask component in `src/components/ask/`:
- `text.ts` → add `resolve(): string`
- `number.ts` → add `resolve(): number`
- `select.ts` → add `resolve(): string`
- `confirm.ts` → add `resolve(): boolean`
- `multi-select.ts` → add `resolve(): string[]`
- etc.

### Dependencies

- External: None
- Internal: All previous phases

### Verification

1. Run all tests: `npm run test`
2. Run lint: `npm run lint`
3. Run build: `npm run build`
4. Manual end-to-end test:

```tsx
// tmp/test-full-pipeline.prompt
<Prompt name="github-test">
  <Ask.Text name="username" label="GitHub username" default="octocat" />

  <!-- Simulated with a mock component for testing -->
  <MockGitHubInfo username={username} name="github" />

  <Task>Write a summary for this GitHub user.</Task>

  <Context>
    <Data label="Username">{username}</Data>
    <Data label="Stars">{github.stars}</Data>
    <Data label="Repos">{github.repos}</Data>
  </Context>
</Prompt>
```

Run: `npm run prompt`, verify all values flow correctly through the pipeline.

---

## Common Utilities Needed

### `src/utils/path.ts`: Path following utility
```typescript
export function followPath(obj: unknown, path: (string | number)[]): unknown {
  return path.reduce((current, key) => {
    if (current == null) return undefined;
    return (current as Record<string | number, unknown>)[key];
  }, obj);
}
```

### `src/utils/element.ts`: Element identification utilities
```typescript
export function isPuptElement(value: unknown): value is PuptElement {
  return value != null && typeof value === 'object' && TYPE in value;
}

export function isDeferredRef(value: unknown): value is DeferredRef {
  return value != null && typeof value === 'object' && DEFERRED_REF in value;
}

export function getElementType(element: PuptElement): ElementType {
  return element[TYPE];
}
```

### `src/utils/props.ts`: Prop resolution utilities
```typescript
export function resolveProps(
  props: Record<string, unknown>,
  resolvedValues: Map<PuptElement, unknown>
): Record<string, unknown> {
  // ... implementation as shown above
}
```

---

## External Libraries Assessment

| Task | Library | Reason |
|------|---------|--------|
| Babel AST manipulation | `@babel/types`, `@babel/traverse` | Already used; mature and well-documented |
| Schema validation | `zod` | Already used for props validation; extend to resolve() |
| Proxy utilities | None needed | Native Proxy is sufficient |

No new external libraries are required for this implementation.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking existing components** | Phase 2 maintains backward compatibility - components with only `render()` continue to work |
| **Proxy performance overhead** | Profile in Phase 3; Proxy overhead is minimal for typical prompt sizes |
| **Babel plugin complexity** | Phase 4 tests thoroughly before integration; plugin is relatively simple AST transformation |
| **Async resolution deadlocks** | Design explicitly forbids forward references; dependency cycles are impossible |
| **Property access on undefined** | Phase 5 adds comprehensive error messages with context about which element and property |
| **Reserved property conflicts** | Phase 3 explicitly handles `then`, `catch`, etc. to prevent Promise detection issues |
| **TypeScript type inference** | Phase 5 adds better generics; fallback to `any` if inference fails |

---

## Summary Timeline

| Phase | Focus | Duration | Key Deliverable |
|-------|-------|----------|-----------------|
| 1 | Core Infrastructure | 2-3 days | Symbols, Component class with resolve() |
| 2 | Renderer Resolution | 2-3 days | Working value passing between components |
| 3 | Proxy Elements | 2-3 days | Property access syntax (`{github.stars}`) |
| 4 | Babel Transform | 2-3 days | Natural `name="X"` variable syntax |
| 5 | Polish | 3-4 days | Ask migration, parallel async, error handling |

**Total estimated duration**: 11-16 days

Each phase delivers independently testable functionality. The system works progressively better as each phase completes, with Phase 2 delivering the core MVP.
