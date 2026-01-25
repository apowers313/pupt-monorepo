# Implementation Plan for pupt-lib

## Overview

pupt-lib is a TypeScript library for creating AI prompts using JSX syntax. This plan breaks implementation into 9 phases, each delivering testable functionality that builds on previous phases.

**Total Estimated Effort**: 18-27 days (2-3 days per phase)

**Milestone Capabilities**:
- Phase 1-3: Render hardcoded JSX to text
- Phase 4: Render prompts with built-in components
- Phase 5: Collect user inputs with validation
- Phase 6: Use all component types (examples, data, post-execution)
- Phase 7: Transform .tsx files at runtime
- Phase 8: Load third-party component libraries
- Phase 9: Full API with search and discovery

---

## Phase 1: Project Scaffolding

**Objective**: Set up project infrastructure with build, test, lint, and CI/CD pipelines.

**Duration**: 2 days

### Tests to Write First

- `test/setup.test.ts`: Verify test infrastructure works
  ```typescript
  import { describe, it, expect } from 'vitest';

  describe('Test Infrastructure', () => {
    it('should run tests', () => {
      expect(1 + 1).toBe(2);
    });

    it('should support TypeScript', () => {
      const value: string = 'hello';
      expect(typeof value).toBe('string');
    });
  });
  ```

### Implementation

**Package Configuration**:
- `package.json`:
  ```json
  {
    "name": "pupt-lib",
    "version": "0.0.0-development",
    "type": "module",
    "exports": {
      ".": {
        "types": "./dist/index.d.ts",
        "import": "./dist/index.js"
      },
      "./jsx-runtime": {
        "types": "./dist/jsx-runtime/index.d.ts",
        "import": "./dist/jsx-runtime/index.js"
      },
      "./jsx-dev-runtime": {
        "types": "./dist/jsx-runtime/jsx-dev-runtime.d.ts",
        "import": "./dist/jsx-runtime/jsx-dev-runtime.js"
      },
      "./babel-preset": {
        "types": "./dist/babel/preset.d.ts",
        "import": "./dist/babel/preset.js"
      }
    },
    "scripts": {
      "build": "vite build",
      "test": "vitest run",
      "test:watch": "vitest",
      "test:coverage": "vitest run --coverage",
      "lint": "eslint src test",
      "lint:fix": "eslint src test --fix",
      "knip": "knip",
      "prepare": "husky"
    }
  }
  ```

- `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "jsx": "react-jsx",
      "jsxImportSource": "pupt-lib",
      "strict": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true,
      "outDir": "./dist",
      "rootDir": "./src"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "test"]
  }
  ```

- `vite.config.ts`: Library build configuration with multiple entry points
- `vitest.config.ts`: Test configuration with coverage thresholds (80%)
- `eslint.config.mjs`: Flat config with typescript-eslint and stylistic
- `knip.json`: Unused dependency detection
- `.husky/pre-push`: Run lint and tests before push
- `commitlint.config.js`: Conventional commits
- `.github/workflows/ci.yml`: CI pipeline (lint, test, build)
- `.releaserc`: Semantic release configuration

**Directory Structure**:
```
src/
├── index.ts                    # Main exports (placeholder)
├── types/                      # Type definitions
├── jsx-runtime/                # JSX runtime
├── components/                 # Built-in components
│   ├── structural/
│   ├── examples/
│   ├── reasoning/
│   ├── data/
│   ├── utility/
│   ├── control/
│   ├── post-execution/
│   └── ask/
├── services/                   # Core services
├── babel/                      # Babel preset
└── utils/                      # Utilities
test/
├── unit/
├── integration/
└── fixtures/
    ├── prompts/
    └── libraries/
```

### Dependencies

**External** (install these):
```bash
npm install -D typescript vite vitest @vitest/coverage-v8
npm install -D eslint @eslint/js typescript-eslint @stylistic/eslint-plugin
npm install -D husky @commitlint/cli @commitlint/config-conventional
npm install -D knip semantic-release
npm install zod minisearch
```

**Internal**: None (first phase)

### Verification

1. Run: `npm install && npm run build`
   - Expected: Build completes without errors

2. Run: `npm test`
   - Expected: Test passes, shows coverage report

3. Run: `npm run lint`
   - Expected: No lint errors

4. Run: `npm run knip`
   - Expected: No unused dependencies reported

---

## Phase 2: Core Types + JSX Runtime

**Objective**: Implement type system and JSX runtime so we can create PuptElement trees.

**Duration**: 2-3 days

### Tests to Write First

- `test/unit/types/element.test.ts`: Element type tests
  ```typescript
  import { describe, it, expect } from 'vitest';
  import type { PuptElement, PuptNode } from '../../../src/types';

  describe('PuptElement', () => {
    it('should have required properties', () => {
      const element: PuptElement = {
        type: 'div',
        props: { className: 'test' },
        children: ['Hello'],
      };

      expect(element.type).toBe('div');
      expect(element.props.className).toBe('test');
      expect(element.children).toEqual(['Hello']);
    });

    it('should allow Component type', () => {
      const MockComponent = () => 'test';
      const element: PuptElement = {
        type: MockComponent,
        props: {},
        children: [],
      };

      expect(typeof element.type).toBe('function');
    });
  });

  describe('PuptNode', () => {
    it('should accept string', () => {
      const node: PuptNode = 'hello';
      expect(node).toBe('hello');
    });

    it('should accept number', () => {
      const node: PuptNode = 42;
      expect(node).toBe(42);
    });

    it('should accept null', () => {
      const node: PuptNode = null;
      expect(node).toBeNull();
    });

    it('should accept element', () => {
      const node: PuptNode = { type: 'span', props: {}, children: [] };
      expect(node).toHaveProperty('type', 'span');
    });
  });
  ```

- `test/unit/jsx-runtime/jsx.test.ts`: JSX runtime tests
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { jsx, jsxs, Fragment } from '../../../src/jsx-runtime';

  describe('jsx()', () => {
    it('should create element with single child', () => {
      const element = jsx('div', { id: 'test', children: 'Hello' });

      expect(element.type).toBe('div');
      expect(element.props.id).toBe('test');
      expect(element.children).toEqual(['Hello']);
    });

    it('should handle null children', () => {
      const element = jsx('span', { children: null });
      expect(element.children).toEqual([]);
    });
  });

  describe('jsxs()', () => {
    it('should create element with multiple children', () => {
      const element = jsxs('div', {
        children: ['Hello', ' ', 'World']
      });

      expect(element.children).toEqual(['Hello', ' ', 'World']);
    });

    it('should flatten nested arrays', () => {
      const element = jsxs('div', {
        children: ['A', ['B', 'C'], 'D']
      });

      expect(element.children).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('Fragment', () => {
    it('should be a symbol', () => {
      expect(typeof Fragment).toBe('symbol');
    });

    it('should work as element type', () => {
      const element = jsx(Fragment, { children: 'content' });
      expect(element.type).toBe(Fragment);
    });
  });
  ```

- `test/unit/component.test.ts`: Component base class tests
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { Component, isComponentClass, COMPONENT_MARKER } from '../../src/component';

  class TestComponent extends Component<{ name: string }> {
    render(props: { name: string }) {
      return `Hello, ${props.name}!`;
    }
  }

  describe('Component', () => {
    it('should have COMPONENT_MARKER', () => {
      expect(TestComponent[COMPONENT_MARKER]).toBe(true);
    });

    it('should render with props', () => {
      const instance = new TestComponent();
      const result = instance.render({ name: 'World' });
      expect(result).toBe('Hello, World!');
    });
  });

  describe('isComponentClass()', () => {
    it('should return true for Component subclass', () => {
      expect(isComponentClass(TestComponent)).toBe(true);
    });

    it('should return false for plain function', () => {
      const fn = () => 'test';
      expect(isComponentClass(fn)).toBe(false);
    });

    it('should return false for non-function', () => {
      expect(isComponentClass('string')).toBe(false);
      expect(isComponentClass(null)).toBe(false);
      expect(isComponentClass({})).toBe(false);
    });
  });
  ```

### Implementation

- `src/types/index.ts`: Re-export all types
- `src/types/element.ts`:
  ```typescript
  export type PuptNode =
    | string
    | number
    | boolean
    | null
    | undefined
    | PuptElement
    | PuptNode[];

  export interface PuptElement<P = Record<string, unknown>> {
    type: string | symbol | ComponentType<P>;
    props: P;
    children: PuptNode[];
  }

  export type ComponentType<P = Record<string, unknown>> =
    | (new () => Component<P>)
    | ((props: P) => PuptNode);
  ```

- `src/types/context.ts`: EnvironmentContext, RenderContext, LlmConfig, OutputConfig, etc.
- `src/types/render.ts`: RenderResult, RenderOptions, PostExecutionAction
- `src/types/input.ts`: InputRequirement, ValidationResult
- `src/types/component.ts`: ComponentProps, PromptProps
- `src/types/search.ts`: SearchablePrompt, SearchOptions, SearchResult
- `src/types/module.ts`: PuptConfig, PuptLibrary, DiscoveredPrompt

- `src/jsx-runtime/index.ts`:
  ```typescript
  import type { PuptElement, PuptNode, ComponentType } from '../types';

  export const Fragment = Symbol.for('pupt.Fragment');

  export function jsx<P>(
    type: string | symbol | ComponentType<P>,
    props: P & { children?: PuptNode }
  ): PuptElement<P> {
    const { children, ...restProps } = props;
    return {
      type,
      props: restProps as P,
      children: normalizeChildren(children),
    };
  }

  export const jsxs = jsx; // Same implementation, children already array

  function normalizeChildren(children: PuptNode | undefined): PuptNode[] {
    if (children === null || children === undefined) return [];
    if (Array.isArray(children)) return children.flat(Infinity).filter(Boolean);
    return [children];
  }
  ```

- `src/jsx-runtime/jsx-dev-runtime.ts`: Development runtime with source tracking
- `src/component.ts`:
  ```typescript
  import type { PuptNode, RenderContext } from './types';

  export const COMPONENT_MARKER = Symbol.for('pupt-lib:component:v1');

  export abstract class Component<Props = Record<string, unknown>> {
    static [COMPONENT_MARKER] = true;

    abstract render(props: Props, context: RenderContext): PuptNode;
  }

  export function isComponentClass(value: unknown): value is typeof Component {
    return (
      typeof value === 'function' &&
      (value as Record<symbol, unknown>)[COMPONENT_MARKER] === true
    );
  }
  ```

- `src/types/context.ts` (implementation part):
  ```typescript
  export const DEFAULT_ENVIRONMENT: EnvironmentContext = {
    llm: { model: 'claude-3-sonnet', provider: 'anthropic' },
    output: { format: 'xml', trim: true, indent: '  ' },
    code: { language: 'typescript' },
    runtime: {},
  };

  export function createEnvironment(
    overrides?: Partial<EnvironmentContext>
  ): EnvironmentContext {
    return { ...DEFAULT_ENVIRONMENT, ...overrides };
  }

  export function createRuntimeConfig(): RuntimeConfig {
    return {
      hostname: typeof window === 'undefined' ? require('os').hostname() : 'browser',
      username: typeof window === 'undefined' ? require('os').userInfo().username : 'user',
      cwd: typeof window === 'undefined' ? process.cwd() : '/',
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toISOString().split('T')[1].split('.')[0],
      uuid: crypto.randomUUID(),
    };
  }
  ```

### Dependencies

**External**: None new (zod already installed)

**Internal**: None (builds on Phase 1 scaffolding)

### Verification

1. Run: `npm test -- test/unit/types`
   - Expected: All type tests pass

2. Run: `npm test -- test/unit/jsx-runtime`
   - Expected: JSX runtime tests pass

3. Create `tmp/test-jsx.ts`:
   ```typescript
   import { jsx, Fragment } from '../src/jsx-runtime';

   const element = jsx('div', {
     id: 'test',
     children: jsx('span', { children: 'Hello' })
   });

   console.log(JSON.stringify(element, null, 2));
   ```
   Run: `npx tsx tmp/test-jsx.ts`
   - Expected: Outputs element tree structure

---

## Phase 3: Registry, Scope & Render

**Objective**: Implement component registry, scope system, and render function to convert element trees to text.

**Duration**: 2-3 days

### Tests to Write First

- `test/unit/services/component-registry.test.ts`:
  ```typescript
  import { describe, it, expect, beforeEach } from 'vitest';
  import { createRegistry, defaultRegistry } from '../../../src/services/component-registry';
  import { Component } from '../../../src/component';

  class MockComponent extends Component<{ text: string }> {
    render({ text }) { return text; }
  }

  describe('ComponentRegistry', () => {
    it('should register and retrieve components', () => {
      const registry = createRegistry();
      registry.register('Mock', MockComponent);

      expect(registry.has('Mock')).toBe(true);
      expect(registry.get('Mock')).toBe(MockComponent);
    });

    it('should list registered components', () => {
      const registry = createRegistry();
      registry.register('A', MockComponent);
      registry.register('B', MockComponent);

      expect(registry.list()).toContain('A');
      expect(registry.list()).toContain('B');
    });

    it('should create child registry that inherits', () => {
      const parent = createRegistry();
      parent.register('Parent', MockComponent);

      const child = parent.createChild();
      expect(child.has('Parent')).toBe(true);

      child.register('Child', MockComponent);
      expect(child.has('Child')).toBe(true);
      expect(parent.has('Child')).toBe(false);
    });
  });

  describe('defaultRegistry', () => {
    it('should be a singleton', () => {
      expect(defaultRegistry).toBeDefined();
    });
  });
  ```

- `test/unit/services/scope.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { Scope, createScope } from '../../../src/services/scope';
  import { Component } from '../../../src/component';

  class TestComp extends Component { render() { return 'test'; } }

  describe('Scope', () => {
    it('should register components', () => {
      const scope = createScope('test');
      scope.register('Test', TestComp);

      expect(scope.has('Test')).toBe(true);
      expect(scope.get('Test')).toBe(TestComp);
    });

    it('should inherit from parent', () => {
      const parent = createScope('parent');
      parent.register('Parent', TestComp);

      const child = createScope('child', parent);
      expect(child.has('Parent')).toBe(true);
    });

    it('should list own components separately', () => {
      const parent = createScope('parent');
      parent.register('Parent', TestComp);

      const child = createScope('child', parent);
      child.register('Child', TestComp);

      expect(child.listOwn()).toEqual(['Child']);
      expect(child.listAll()).toContain('Parent');
      expect(child.listAll()).toContain('Child');
    });
  });
  ```

- `test/unit/render.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../src/render';
  import { jsx, Fragment } from '../../src/jsx-runtime';
  import { Component } from '../../src/component';
  import { createRegistry } from '../../src/services/component-registry';

  describe('render()', () => {
    it('should render string nodes', () => {
      const result = render(jsx(Fragment, { children: 'Hello World' }));
      expect(result.text).toBe('Hello World');
    });

    it('should render nested elements', () => {
      const element = jsx(Fragment, {
        children: [
          'Line 1',
          '\n',
          'Line 2',
        ],
      });

      const result = render(element);
      expect(result.text).toBe('Line 1\nLine 2');
    });

    it('should render Component instances', () => {
      class Greeting extends Component<{ name: string }> {
        render({ name }) {
          return `Hello, ${name}!`;
        }
      }

      const registry = createRegistry();
      registry.register('Greeting', Greeting);

      const element = jsx(Greeting, { name: 'World' });
      const result = render(element, { registry });

      expect(result.text).toBe('Hello, World!');
    });

    it('should pass context to components', () => {
      class EnvAware extends Component {
        render(props, context) {
          return `Model: ${context.env.llm.model}`;
        }
      }

      const registry = createRegistry();
      registry.register('EnvAware', EnvAware);

      const element = jsx(EnvAware, {});
      const result = render(element, { registry });

      expect(result.text).toContain('Model:');
    });

    it('should return empty postExecution by default', () => {
      const result = render(jsx(Fragment, { children: 'test' }));
      expect(result.postExecution).toEqual([]);
    });
  });
  ```

### Implementation

- `src/services/component-registry.ts`:
  ```typescript
  import type { ComponentType } from '../types';

  export interface ComponentRegistry {
    register(name: string, component: ComponentType): void;
    get(name: string): ComponentType | undefined;
    has(name: string): boolean;
    list(): string[];
    createChild(): ComponentRegistry;
  }

  export function createRegistry(parent?: ComponentRegistry): ComponentRegistry {
    const components = new Map<string, ComponentType>();

    return {
      register(name, component) {
        components.set(name, component);
      },
      get(name) {
        return components.get(name) ?? parent?.get(name);
      },
      has(name) {
        return components.has(name) || (parent?.has(name) ?? false);
      },
      list() {
        const parentList = parent?.list() ?? [];
        return [...new Set([...parentList, ...components.keys()])];
      },
      createChild() {
        return createRegistry(this);
      },
    };
  }

  export const defaultRegistry = createRegistry();
  ```

- `src/services/scope.ts`:
  ```typescript
  import type { ComponentType } from '../types';

  export class Scope {
    private components = new Map<string, ComponentType>();

    constructor(
      readonly name: string,
      readonly parent?: Scope
    ) {}

    register(name: string, component: ComponentType): void {
      this.components.set(name, component);
    }

    get(name: string): ComponentType | undefined {
      return this.components.get(name) ?? this.parent?.get(name);
    }

    has(name: string): boolean {
      return this.components.has(name) || (this.parent?.has(name) ?? false);
    }

    listOwn(): string[] {
      return [...this.components.keys()];
    }

    listAll(): string[] {
      const parentList = this.parent?.listAll() ?? [];
      return [...new Set([...parentList, ...this.components.keys()])];
    }
  }

  export function createScope(name: string, parent?: Scope): Scope {
    return new Scope(name, parent);
  }
  ```

- `src/render.ts`:
  ```typescript
  import type { PuptElement, PuptNode, RenderResult, RenderOptions, RenderContext } from './types';
  import { Fragment } from './jsx-runtime';
  import { isComponentClass, Component } from './component';
  import { defaultRegistry } from './services/component-registry';
  import { DEFAULT_ENVIRONMENT, createRuntimeConfig } from './types/context';

  export function render(
    element: PuptElement,
    options: RenderOptions = {}
  ): RenderResult {
    const {
      inputs = new Map(),
      registry = defaultRegistry,
      env = DEFAULT_ENVIRONMENT,
      indent = '  ',
      trim = true,
    } = options;

    const context: RenderContext = {
      inputs: inputs instanceof Map ? inputs : new Map(Object.entries(inputs)),
      env: { ...env, runtime: createRuntimeConfig() },
      scope: null, // Set during component rendering
      registry,
    };

    const postExecution: PostExecutionAction[] = [];

    const text = renderNode(element, context, postExecution);

    return {
      text: trim ? text.trim() : text,
      postExecution,
    };
  }

  function renderNode(
    node: PuptNode,
    context: RenderContext,
    postExecution: PostExecutionAction[]
  ): string {
    if (node === null || node === undefined || node === false) {
      return '';
    }

    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }

    if (Array.isArray(node)) {
      return node.map(n => renderNode(n, context, postExecution)).join('');
    }

    // PuptElement
    return renderElement(node as PuptElement, context, postExecution);
  }

  function renderElement(
    element: PuptElement,
    context: RenderContext,
    postExecution: PostExecutionAction[]
  ): string {
    const { type, props, children } = element;

    // Fragment - just render children
    if (type === Fragment) {
      return children.map(c => renderNode(c, context, postExecution)).join('');
    }

    // Component class
    if (isComponentClass(type)) {
      const instance = new (type as new () => Component)();
      const result = instance.render({ ...props, children }, context);
      return renderNode(result, context, postExecution);
    }

    // Function component
    if (typeof type === 'function') {
      const result = type({ ...props, children });
      return renderNode(result, context, postExecution);
    }

    // String type - look up in registry
    if (typeof type === 'string') {
      const ComponentClass = context.registry.get(type);
      if (ComponentClass) {
        if (isComponentClass(ComponentClass)) {
          const instance = new (ComponentClass as new () => Component)();
          const result = instance.render({ ...props, children }, context);
          return renderNode(result, context, postExecution);
        }
        // Function component from registry
        const result = (ComponentClass as Function)({ ...props, children });
        return renderNode(result, context, postExecution);
      }
      // Unknown string type - render as-is for now
      console.warn(`Unknown component: ${type}`);
      return children.map(c => renderNode(c, context, postExecution)).join('');
    }

    return '';
  }
  ```

- `src/utils/define-component.ts`: Functional component API with Zod validation
- `src/utils/validation.ts`: createValidator helper

### Dependencies

**External**: None new

**Internal**: Phase 2 (types, jsx-runtime, component)

### Verification

1. Run: `npm test -- test/unit/services`
   - Expected: Registry and scope tests pass

2. Run: `npm test -- test/unit/render.test.ts`
   - Expected: Render tests pass

3. Create `tmp/test-render.ts`:
   ```typescript
   import { render } from '../src/render';
   import { jsx, Fragment } from '../src/jsx-runtime';
   import { Component } from '../src/component';
   import { createRegistry } from '../src/services/component-registry';

   class Bold extends Component<{ children: string }> {
     render({ children }) {
       return `**${children}**`;
     }
   }

   const registry = createRegistry();
   registry.register('Bold', Bold);

   const element = jsx(Fragment, {
     children: [
       'Hello, ',
       jsx(Bold, { children: 'World' }),
       '!',
     ],
   });

   const result = render(element, { registry });
   console.log(result.text);
   // Output: Hello, **World**!
   ```
   Run: `npx tsx tmp/test-render.ts`
   - Expected: Outputs "Hello, **World**!"

---

## Phase 4: Core Built-in Components

**Objective**: Implement structural and utility components so users can write real prompts.

**Duration**: 2-3 days

### Tests to Write First

- `test/unit/components/structural/prompt.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { Prompt } from '../../../../src/components/structural/Prompt';
  import { defaultRegistry } from '../../../../src/services/component-registry';

  describe('Prompt', () => {
    it('should render children', () => {
      const element = jsx(Prompt, {
        name: 'test-prompt',
        children: 'Hello World',
      });

      const result = render(element);
      expect(result.text).toContain('Hello World');
    });

    it('should include metadata in output', () => {
      const element = jsx(Prompt, {
        name: 'test-prompt',
        version: '1.0.0',
        description: 'A test prompt',
        tags: ['test', 'example'],
        children: 'Content',
      });

      const result = render(element);
      // Metadata available but may not be in text output
      expect(result.text).toContain('Content');
    });
  });
  ```

- `test/unit/components/structural/role.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { Role } from '../../../../src/components/structural/Role';

  describe('Role', () => {
    it('should render role section', () => {
      const element = jsx(Role, {
        children: 'You are a helpful assistant.',
      });

      const result = render(element);
      expect(result.text).toContain('You are a helpful assistant.');
    });

    it('should render with XML delimiters by default', () => {
      const element = jsx(Role, {
        children: 'Assistant role',
      });

      const result = render(element);
      expect(result.text).toMatch(/<role>[\s\S]*Assistant role[\s\S]*<\/role>/);
    });

    it('should accept expertise and domain props', () => {
      const element = jsx(Role, {
        expertise: 'senior',
        domain: 'TypeScript',
        children: 'You are an expert.',
      });

      const result = render(element);
      expect(result.text).toContain('You are an expert.');
    });
  });
  ```

- `test/unit/components/structural/section.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { Section } from '../../../../src/components/structural/Section';

  describe('Section', () => {
    it('should render with XML delimiters', () => {
      const element = jsx(Section, {
        name: 'context',
        children: 'Some context here',
      });

      const result = render(element);
      expect(result.text).toContain('<context>');
      expect(result.text).toContain('</context>');
      expect(result.text).toContain('Some context here');
    });

    it('should support markdown delimiter', () => {
      const element = jsx(Section, {
        name: 'context',
        delimiter: 'markdown',
        children: 'Some context here',
      });

      const result = render(element);
      expect(result.text).toContain('## context');
    });

    it('should support no delimiter', () => {
      const element = jsx(Section, {
        name: 'context',
        delimiter: 'none',
        children: 'Some context here',
      });

      const result = render(element);
      expect(result.text).not.toContain('<context>');
      expect(result.text).not.toContain('## context');
      expect(result.text).toContain('Some context here');
    });
  });
  ```

- `test/unit/components/utility/datetime.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { DateTime, Timestamp, UUID } from '../../../../src/components/utility';

  describe('DateTime', () => {
    it('should render current date/time', () => {
      const element = jsx(DateTime, {});
      const result = render(element);

      // Should be ISO format
      expect(result.text).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should respect format prop', () => {
      const element = jsx(DateTime, { format: 'YYYY-MM-DD' });
      const result = render(element);

      expect(result.text).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result.text).not.toContain('T');
    });
  });

  describe('Timestamp', () => {
    it('should render Unix timestamp', () => {
      const element = jsx(Timestamp, {});
      const result = render(element);

      const num = parseInt(result.text);
      expect(num).toBeGreaterThan(1700000000); // After 2023
    });
  });

  describe('UUID', () => {
    it('should render valid UUID', () => {
      const element = jsx(UUID, {});
      const result = render(element);

      expect(result.text).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });
  ```

- `test/integration/simple-prompt.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../src/render';
  import { jsx, Fragment } from '../../src/jsx-runtime';
  import { Prompt, Role, Task, Context, Constraint, Format } from '../../src/components/structural';

  describe('Simple Prompt Rendering', () => {
    it('should render a complete prompt', () => {
      const element = jsx(Prompt, {
        name: 'code-review',
        children: [
          jsx(Role, { children: 'You are a senior software engineer.' }),
          jsx(Context, { children: 'The user needs help reviewing TypeScript code.' }),
          jsx(Task, { children: 'Review the provided code for bugs and improvements.' }),
          jsx(Constraint, { type: 'must', children: 'Explain each issue clearly.' }),
          jsx(Format, { type: 'markdown' }),
        ],
      });

      const result = render(element);

      expect(result.text).toContain('senior software engineer');
      expect(result.text).toContain('TypeScript code');
      expect(result.text).toContain('Review');
      expect(result.text).toContain('Explain');
    });
  });
  ```

### Implementation

**Structural Components** (`src/components/structural/`):

- `Prompt.ts`:
  ```typescript
  import { Component } from '../../component';
  import type { PuptNode, RenderContext } from '../../types';

  interface PromptProps {
    name: string;
    version?: string;
    description?: string;
    tags?: string[];
    children: PuptNode;
  }

  export class Prompt extends Component<PromptProps> {
    render({ children }: PromptProps, context: RenderContext): PuptNode {
      // Prompt is a container - just render children
      // Metadata is available for discovery, not rendered
      return children;
    }
  }
  ```

- `Section.ts`:
  ```typescript
  import { Component } from '../../component';
  import type { PuptNode, RenderContext } from '../../types';

  interface SectionProps {
    name: string;
    delimiter?: 'xml' | 'markdown' | 'none';
    children: PuptNode;
  }

  export class Section extends Component<SectionProps> {
    render({ name, delimiter = 'xml', children }: SectionProps): PuptNode {
      switch (delimiter) {
        case 'xml':
          return `<${name}>\n${children}\n</${name}>`;
        case 'markdown':
          return `## ${name}\n\n${children}`;
        case 'none':
          return children;
      }
    }
  }
  ```

- `Role.ts`, `Task.ts`, `Context.ts`: Extend Section with specific name
- `Audience.ts`, `Tone.ts`, `SuccessCriteria.ts`, `Criterion.ts`
- `Constraint.ts`:
  ```typescript
  import { Component } from '../../component';
  import type { PuptNode } from '../../types';

  interface ConstraintProps {
    type: 'must' | 'should' | 'must-not';
    children: PuptNode;
  }

  export class Constraint extends Component<ConstraintProps> {
    render({ type, children }: ConstraintProps): PuptNode {
      const prefix = {
        'must': 'MUST:',
        'should': 'SHOULD:',
        'must-not': 'MUST NOT:',
      }[type];

      return `${prefix} ${children}`;
    }
  }
  ```

- `Format.ts`: Output format specification
- `index.ts`: Re-export all structural components

**Utility Components** (`src/components/utility/`):

- `UUID.ts`, `Timestamp.ts`, `DateTime.ts`, `Hostname.ts`, `Username.ts`, `Cwd.ts`
- `index.ts`: Re-export all

**Meta Components** (`src/components/meta/`):

- `Uses.ts`: Dependency declaration (parsed but not rendered)

**Register built-ins**:

- `src/components/index.ts`: Register all components in defaultRegistry

### Dependencies

**External**: None new

**Internal**: Phase 3 (render, registry, component)

### Verification

1. Run: `npm test -- test/unit/components`
   - Expected: All component tests pass

2. Run: `npm test -- test/integration/simple-prompt.test.ts`
   - Expected: Integration test passes

3. Create `tmp/test-prompt.tsx`:
   ```tsx
   /** @jsxImportSource pupt-lib */
   import { render } from '../src/render';
   import '../src/components'; // Register built-ins

   const prompt = (
     <Prompt name="greeting">
       <Role>You are a friendly assistant.</Role>
       <Task>Greet the user warmly.</Task>
       <Constraint type="must">Be concise.</Constraint>
     </Prompt>
   );

   console.log(render(prompt).text);
   ```
   Run: `npx tsx tmp/test-prompt.tsx`
   - Expected: Outputs formatted prompt with Role, Task, Constraint sections

---

## Phase 5: User Input System

**Objective**: Implement Ask.* components, InputIterator, and control flow for collecting user inputs.

**Duration**: 3 days

### Tests to Write First

- `test/unit/components/ask/text.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { Ask } from '../../../../src/components/ask';

  describe('Ask.Text', () => {
    it('should render placeholder when no input provided', () => {
      const element = jsx(Ask.Text, {
        name: 'username',
        label: 'Enter username',
      });

      const result = render(element);
      expect(result.text).toContain('{username}');
    });

    it('should render input value when provided', () => {
      const element = jsx(Ask.Text, {
        name: 'username',
        label: 'Enter username',
      });

      const result = render(element, {
        inputs: { username: 'alice' },
      });

      expect(result.text).toContain('alice');
      expect(result.text).not.toContain('{username}');
    });

    it('should generate InputRequirement', () => {
      // This is tested via InputIterator
    });
  });
  ```

- `test/unit/components/ask/select.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { Ask, Option } from '../../../../src/components/ask';

  describe('Ask.Select', () => {
    it('should render selected value', () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        children: [
          jsx(Option, { value: 'react', children: 'React' }),
          jsx(Option, { value: 'vue', children: 'Vue' }),
        ],
      });

      const result = render(element, {
        inputs: { framework: 'react' },
      });

      expect(result.text).toContain('react');
    });

    it('should accept options as prop', () => {
      const element = jsx(Ask.Select, {
        name: 'framework',
        label: 'Choose framework',
        options: [
          { value: 'react', label: 'React' },
          { value: 'vue', label: 'Vue' },
        ],
      });

      const result = render(element, {
        inputs: { framework: 'vue' },
      });

      expect(result.text).toContain('vue');
    });
  });
  ```

- `test/unit/services/input-iterator.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { createInputIterator } from '../../../src/services/input-iterator';
  import { jsx, Fragment } from '../../../src/jsx-runtime';
  import { Ask } from '../../../src/components/ask';
  import '../../../src/components'; // Register components

  describe('InputIterator', () => {
    it('should iterate through inputs depth-first', async () => {
      const element = jsx(Fragment, {
        children: [
          jsx(Ask.Text, { name: 'first', label: 'First' }),
          jsx(Ask.Text, { name: 'second', label: 'Second' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      expect(iterator.current()?.name).toBe('first');

      await iterator.submit('value1');
      iterator.advance();

      expect(iterator.current()?.name).toBe('second');

      await iterator.submit('value2');
      iterator.advance();

      expect(iterator.isDone()).toBe(true);
    });

    it('should throw on invalid state transitions', () => {
      const element = jsx(Ask.Text, { name: 'test', label: 'Test' });
      const iterator = createInputIterator(element);

      // current() before start()
      expect(() => iterator.current()).toThrow('Iterator not started');

      // submit() before start()
      expect(() => iterator.submit('value')).rejects.toThrow('Iterator not started');

      // advance() before start()
      expect(() => iterator.advance()).toThrow('Iterator not started');

      iterator.start();

      // advance() before submit()
      expect(() => iterator.advance()).toThrow('Current requirement not submitted');
    });

    it('should validate inputs', async () => {
      const element = jsx(Ask.Number, {
        name: 'age',
        label: 'Age',
        min: 0,
        max: 120,
      });

      const iterator = createInputIterator(element);
      iterator.start();

      const result = await iterator.submit(150);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('max');
    });

    it('should return collected values', async () => {
      const element = jsx(Fragment, {
        children: [
          jsx(Ask.Text, { name: 'name', label: 'Name' }),
          jsx(Ask.Number, { name: 'age', label: 'Age' }),
        ],
      });

      const iterator = createInputIterator(element);
      iterator.start();

      await iterator.submit('Alice');
      iterator.advance();
      await iterator.submit(30);
      iterator.advance();

      const values = iterator.getValues();
      expect(values.get('name')).toBe('Alice');
      expect(values.get('age')).toBe(30);
    });
  });
  ```

- `test/unit/components/control/if.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { If } from '../../../../src/components/control/If';

  describe('If', () => {
    it('should render children when condition is true', () => {
      const element = jsx(If, {
        when: true,
        children: 'Visible',
      });

      const result = render(element);
      expect(result.text).toBe('Visible');
    });

    it('should not render when condition is false', () => {
      const element = jsx(If, {
        when: false,
        children: 'Hidden',
      });

      const result = render(element);
      expect(result.text).toBe('');
    });

    it('should evaluate Excel formula syntax', () => {
      const element = jsx(If, {
        when: '=count>5',
        children: 'Many items',
      });

      const result = render(element, {
        inputs: { count: 10 },
      });

      expect(result.text).toBe('Many items');
    });

    it('should support complex Excel formulas', () => {
      const element = jsx(If, {
        when: '=AND(count>5, userType="admin")',
        children: 'Admin with many items',
      });

      const result = render(element, {
        inputs: { count: 10, userType: 'admin' },
      });

      expect(result.text).toContain('Admin');
    });
  });
  ```

- `test/unit/components/control/foreach.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { ForEach } from '../../../../src/components/control/ForEach';

  describe('ForEach', () => {
    it('should iterate over items', () => {
      const element = jsx(ForEach, {
        items: ['a', 'b', 'c'],
        as: 'item',
        children: (item: string) => `Item: ${item}\n`,
      });

      const result = render(element);
      expect(result.text).toContain('Item: a');
      expect(result.text).toContain('Item: b');
      expect(result.text).toContain('Item: c');
    });

    it('should handle empty array', () => {
      const element = jsx(ForEach, {
        items: [],
        as: 'item',
        children: (item: string) => `Item: ${item}`,
      });

      const result = render(element);
      expect(result.text).toBe('');
    });
  });
  ```

### Implementation

**Ask Components** (`src/components/ask/`):

- `Text.ts`, `Editor.ts`, `Select.ts`, `MultiSelect.ts`, `Confirm.ts`
- `File.ts`, `Path.ts`, `Number.ts`, `Date.ts`, `Secret.ts`
- `Choice.ts`, `Rating.ts`, `ReviewFile.ts`
- `Option.ts`: For Select/MultiSelect children
- `index.ts`: Export Ask namespace

Each Ask component:
1. Renders placeholder or value
2. Generates InputRequirement for iterator

- `src/services/input-iterator.ts`:
  ```typescript
  import type { PuptElement, InputRequirement, ValidationResult } from '../types';

  type IteratorState = 'NOT_STARTED' | 'ITERATING' | 'SUBMITTED' | 'DONE';

  export interface InputIterator {
    start(): void;
    current(): InputRequirement | null;
    submit(value: unknown): Promise<ValidationResult>;
    advance(): void;
    isDone(): boolean;
    getValues(): Map<string, unknown>;
  }

  export function createInputIterator(
    element: PuptElement,
    options?: InputIteratorOptions
  ): InputIterator {
    let state: IteratorState = 'NOT_STARTED';
    const values = new Map<string, unknown>();
    const requirements: InputRequirement[] = [];
    let currentIndex = 0;

    function collectRequirements(node: PuptNode): void {
      // Walk tree depth-first, collect InputRequirements
      // Re-evaluate conditionals based on current values
    }

    return {
      start() {
        if (state !== 'NOT_STARTED') {
          throw new Error('Iterator already started.');
        }
        collectRequirements(element);
        state = requirements.length > 0 ? 'ITERATING' : 'DONE';
      },

      current() {
        if (state === 'NOT_STARTED') {
          throw new Error('Iterator not started. Call start() first.');
        }
        if (state === 'DONE') return null;
        return requirements[currentIndex];
      },

      async submit(value: unknown) {
        if (state === 'NOT_STARTED') {
          throw new Error('Iterator not started. Call start() first.');
        }
        if (state === 'DONE') {
          throw new Error('Iterator is done. No current requirement.');
        }

        const req = requirements[currentIndex];
        const result = await validateInput(req, value);

        if (result.valid) {
          values.set(req.name, value);
          state = 'SUBMITTED';
        }

        return result;
      },

      advance() {
        if (state === 'NOT_STARTED') {
          throw new Error('Iterator not started. Call start() first.');
        }
        if (state === 'ITERATING') {
          throw new Error('Current requirement not submitted. Call submit() first.');
        }
        if (state === 'DONE') {
          throw new Error('Iterator is done. Nothing to advance.');
        }

        currentIndex++;
        // Re-collect requirements with new values (for conditionals)
        collectRequirements(element);

        state = currentIndex < requirements.length ? 'ITERATING' : 'DONE';
      },

      isDone() {
        return state === 'DONE';
      },

      getValues() {
        return new Map(values);
      },
    };
  }
  ```

- `src/services/input-collector.ts`: Higher-level collection with retry loop
- `src/services/formula-parser.ts`: Excel formula evaluation

**Control Flow Components** (`src/components/control/`):

- `If.ts`: Conditional rendering with Excel formulas
- `ForEach.ts`: Loop iteration
- `Scope.ts`: Namespace resolution

### Dependencies

**External**:
```bash
npm install hyperformula  # Excel formula parser
```

**Internal**: Phase 4 (structural components)

### Verification

1. Run: `npm test -- test/unit/components/ask`
   - Expected: All Ask.* tests pass

2. Run: `npm test -- test/unit/services/input-iterator.test.ts`
   - Expected: Iterator tests pass

3. Run: `npm test -- test/unit/components/control`
   - Expected: Control flow tests pass

4. Create `tmp/test-inputs.ts`:
   ```typescript
   import { createInputIterator } from '../src/services/input-iterator';
   import { jsx, Fragment } from '../src/jsx-runtime';
   import { Ask } from '../src/components/ask';
   import { If } from '../src/components/control/If';
   import '../src/components';

   const element = (
     <Fragment>
       <Ask.Select name="userType" label="User type">
         <Option value="user">Regular User</Option>
         <Option value="admin">Administrator</Option>
       </Ask.Select>
       <If when='=userType="admin"'>
         <Ask.Text name="adminCode" label="Admin code" />
       </If>
       <Ask.Text name="name" label="Your name" />
     </Fragment>
   );

   async function demo() {
     const iterator = createInputIterator(element);
     iterator.start();

     // Simulate: select "admin"
     console.log('Q:', iterator.current()?.label);
     await iterator.submit('admin');
     iterator.advance();

     // Now adminCode question appears
     console.log('Q:', iterator.current()?.label);
     await iterator.submit('secret123');
     iterator.advance();

     // Finally name
     console.log('Q:', iterator.current()?.label);
     await iterator.submit('Alice');
     iterator.advance();

     console.log('Done:', iterator.isDone());
     console.log('Values:', Object.fromEntries(iterator.getValues()));
   }

   demo();
   ```
   Run: `npx tsx tmp/test-inputs.ts`
   - Expected: Shows questions in order, conditionally includes adminCode

---

## Phase 6: Extended Components

**Objective**: Implement Examples, Reasoning, Data, and Post-Execution components.

**Duration**: 2 days

### Tests to Write First

- `test/unit/components/examples/example.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { Example, Examples } from '../../../../src/components/examples';

  describe('Example', () => {
    it('should render input/output pair', () => {
      const element = jsx(Example, {
        children: [
          jsx(Example.Input, { children: 'Calculate 15% of 200' }),
          jsx(Example.Output, { children: '30' }),
        ],
      });

      const result = render(element);
      expect(result.text).toContain('Calculate 15% of 200');
      expect(result.text).toContain('30');
    });
  });

  describe('Examples', () => {
    it('should render multiple examples', () => {
      const element = jsx(Examples, {
        children: [
          jsx(Example, {
            children: [
              jsx(Example.Input, { children: 'Input 1' }),
              jsx(Example.Output, { children: 'Output 1' }),
            ],
          }),
          jsx(Example, {
            children: [
              jsx(Example.Input, { children: 'Input 2' }),
              jsx(Example.Output, { children: 'Output 2' }),
            ],
          }),
        ],
      });

      const result = render(element);
      expect(result.text).toContain('Input 1');
      expect(result.text).toContain('Output 2');
    });
  });
  ```

- `test/unit/components/reasoning/steps.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { Steps, Step } from '../../../../src/components/reasoning';

  describe('Steps', () => {
    it('should render numbered steps', () => {
      const element = jsx(Steps, {
        children: [
          jsx(Step, { number: 1, children: 'Parse input' }),
          jsx(Step, { number: 2, children: 'Validate data' }),
          jsx(Step, { number: 3, children: 'Process result' }),
        ],
      });

      const result = render(element);
      expect(result.text).toContain('1.');
      expect(result.text).toContain('Parse input');
      expect(result.text).toContain('2.');
      expect(result.text).toContain('3.');
    });

    it('should auto-number if not provided', () => {
      const element = jsx(Steps, {
        children: [
          jsx(Step, { children: 'First' }),
          jsx(Step, { children: 'Second' }),
        ],
      });

      const result = render(element);
      expect(result.text).toMatch(/1\..*First/s);
      expect(result.text).toMatch(/2\..*Second/s);
    });
  });
  ```

- `test/unit/components/data/code.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { Code, Data, Json, Xml } from '../../../../src/components/data';

  describe('Code', () => {
    it('should render code block with language', () => {
      const element = jsx(Code, {
        language: 'typescript',
        children: 'const x = 1;',
      });

      const result = render(element);
      expect(result.text).toContain('```typescript');
      expect(result.text).toContain('const x = 1;');
      expect(result.text).toContain('```');
    });

    it('should include filename if provided', () => {
      const element = jsx(Code, {
        language: 'typescript',
        filename: 'example.ts',
        children: 'const x = 1;',
      });

      const result = render(element);
      expect(result.text).toContain('example.ts');
    });
  });

  describe('Data', () => {
    it('should render data with format', () => {
      const element = jsx(Data, {
        name: 'users',
        format: 'json',
        children: JSON.stringify([{ name: 'Alice' }]),
      });

      const result = render(element);
      expect(result.text).toContain('users');
      expect(result.text).toContain('Alice');
    });
  });

  describe('Json', () => {
    it('should format JSON data', () => {
      const element = jsx(Json, {
        children: { key: 'value' },
      });

      const result = render(element);
      expect(result.text).toContain('"key"');
      expect(result.text).toContain('"value"');
    });
  });
  ```

- `test/unit/components/post-execution/review-file.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../../../src/render';
  import { jsx } from '../../../../src/jsx-runtime';
  import { PostExecution, ReviewFile, OpenUrl, RunCommand } from '../../../../src/components/post-execution';

  describe('PostExecution', () => {
    it('should collect post-execution actions', () => {
      const element = jsx(PostExecution, {
        children: [
          jsx(ReviewFile, { path: './output.ts' }),
          jsx(OpenUrl, { url: 'https://docs.example.com' }),
        ],
      });

      const result = render(element);

      expect(result.postExecution).toHaveLength(2);
      expect(result.postExecution[0]).toEqual({
        type: 'reviewFile',
        path: './output.ts',
      });
      expect(result.postExecution[1]).toEqual({
        type: 'openUrl',
        url: 'https://docs.example.com',
      });
    });
  });

  describe('ReviewFile', () => {
    it('should add reviewFile action', () => {
      const element = jsx(ReviewFile, {
        path: './generated.ts',
        editor: 'vscode',
      });

      const result = render(element);

      expect(result.postExecution[0]).toEqual({
        type: 'reviewFile',
        path: './generated.ts',
        editor: 'vscode',
      });
    });
  });

  describe('RunCommand', () => {
    it('should add runCommand action', () => {
      const element = jsx(RunCommand, {
        command: 'npm test',
        cwd: './project',
      });

      const result = render(element);

      expect(result.postExecution[0]).toEqual({
        type: 'runCommand',
        command: 'npm test',
        cwd: './project',
      });
    });
  });
  ```

### Implementation

**Examples Components** (`src/components/examples/`):
- `Example.ts`, `Examples.ts`, `ExampleInput.ts`, `ExampleOutput.ts`
- `index.ts`

**Reasoning Components** (`src/components/reasoning/`):
- `Steps.ts`, `Step.ts`
- `index.ts`

**Data Components** (`src/components/data/`):
- `Data.ts`, `Code.ts`, `File.ts`, `Json.ts`, `Xml.ts`
- `index.ts`

Note: `File.ts` reads file contents at render time (Node.js only)

**Post-Execution Components** (`src/components/post-execution/`):
- `PostExecution.ts`, `ReviewFile.ts`, `OpenUrl.ts`, `RunCommand.ts`
- `index.ts`

These components add to `context.postExecution[]` during render.

### Dependencies

**External**: None new

**Internal**: Phase 5

### Verification

1. Run: `npm test -- test/unit/components/examples`
   - Expected: Example tests pass

2. Run: `npm test -- test/unit/components/data`
   - Expected: Data tests pass

3. Run: `npm test -- test/unit/components/post-execution`
   - Expected: Post-execution tests pass

4. Create `tmp/test-full-prompt.tsx`:
   ```tsx
   /** @jsxImportSource pupt-lib */
   import { render } from '../src/render';
   import '../src/components';

   const prompt = (
     <Prompt name="code-helper">
       <Role>You are an expert TypeScript developer.</Role>
       <Context>The user needs help writing a function.</Context>

       <Examples>
         <Example>
           <Example.Input>Add two numbers</Example.Input>
           <Example.Output>
             <Code language="typescript">
               {`function add(a: number, b: number): number {
                 return a + b;
               }`}
             </Code>
           </Example.Output>
         </Example>
       </Examples>

       <Task>Write the requested function.</Task>

       <Steps>
         <Step>Understand the requirements</Step>
         <Step>Write the function signature</Step>
         <Step>Implement the logic</Step>
         <Step>Add error handling</Step>
       </Steps>

       <PostExecution>
         <ReviewFile path="./output.ts" />
       </PostExecution>
     </Prompt>
   );

   const result = render(prompt);
   console.log('=== PROMPT ===');
   console.log(result.text);
   console.log('\n=== POST-EXECUTION ===');
   console.log(result.postExecution);
   ```
   Run: `npx tsx tmp/test-full-prompt.tsx`
   - Expected: Full prompt with examples, steps, and post-execution action

---

## Phase 7: Transformation

**Objective**: Implement Babel preset and Transformer to compile .tsx files at runtime.

**Duration**: 2-3 days

### Tests to Write First

- `test/unit/babel/preset.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import * as babel from '@babel/core';
  import { puptBabelPreset } from '../../../src/babel/preset';

  describe('puptBabelPreset', () => {
    it('should transform JSX to jsx() calls', () => {
      const code = `const el = <div>Hello</div>;`;

      const result = babel.transformSync(code, {
        presets: [puptBabelPreset],
        filename: 'test.tsx',
      });

      expect(result?.code).toContain('jsx(');
      expect(result?.code).toContain('"div"');
      expect(result?.code).toContain('"Hello"');
    });

    it('should use pupt-lib jsx-runtime', () => {
      const code = `const el = <Prompt name="test">Content</Prompt>;`;

      const result = babel.transformSync(code, {
        presets: [puptBabelPreset],
        filename: 'test.tsx',
      });

      expect(result?.code).toContain('pupt-lib/jsx-runtime');
    });

    it('should handle TypeScript', () => {
      const code = `
        interface Props { name: string }
        const el = <div>{(x: Props) => x.name}</div>;
      `;

      const result = babel.transformSync(code, {
        presets: [[puptBabelPreset, { typescript: true }]],
        filename: 'test.tsx',
      });

      expect(result?.code).not.toContain('interface');
      expect(result?.code).toContain('jsx(');
    });
  });
  ```

- `test/unit/services/transformer.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { Transformer } from '../../../src/services/transformer';
  import { writeFileSync, mkdirSync, rmSync } from 'fs';
  import { join } from 'path';

  describe('Transformer', () => {
    const tmpDir = join(__dirname, '../../../tmp/transformer-test');

    beforeAll(() => {
      mkdirSync(tmpDir, { recursive: true });
    });

    afterAll(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should transform source string', () => {
      const transformer = new Transformer();
      const source = `const el = <div>Hello</div>;`;

      const result = transformer.transformSource(source, 'test.tsx');

      expect(result).toContain('jsx(');
    });

    it('should transform file', async () => {
      const transformer = new Transformer();
      const filePath = join(tmpDir, 'test.tsx');

      writeFileSync(filePath, `export const el = <span>Test</span>;`);

      const result = await transformer.transformFile(filePath);

      expect(result).toContain('jsx(');
      expect(result).toContain('"span"');
    });
  });
  ```

- `test/unit/services/prompt-parser.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { parsePromptSyntax, loadPromptFile } from '../../../src/services/prompt-parser';

  describe('parsePromptSyntax', () => {
    it('should parse simple prompt file', () => {
      const source = `
        <Prompt name="greeting">
          <Role>You are a friendly assistant.</Role>
          <Task>Greet the user.</Task>
        </Prompt>
      `;

      const element = parsePromptSyntax(source);

      expect(element.type).toBe('Prompt');
      expect(element.props.name).toBe('greeting');
    });

    it('should interpolate variables', () => {
      const source = `
        <Prompt name="hello">
          <Task>Say hello to {inputs.name}.</Task>
        </Prompt>
      `;

      const element = parsePromptSyntax(source);
      // Variable placeholders preserved for render-time substitution
      expect(element).toBeDefined();
    });
  });
  ```

- `test/unit/create-prompt.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { createPrompt, createPromptFromSource } from '../../src/create-prompt';
  import { writeFileSync, mkdirSync, rmSync } from 'fs';
  import { join } from 'path';

  describe('createPromptFromSource', () => {
    it('should create element from TSX source', async () => {
      const source = `
        import { Prompt, Role, Task } from 'pupt-lib';

        export default (
          <Prompt name="test">
            <Role>Assistant</Role>
            <Task>Help user</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'test.tsx');

      expect(element.type).toBeDefined();
      expect(element.props.name).toBe('test');
    });
  });

  describe('createPrompt', () => {
    const tmpDir = join(__dirname, '../../tmp/create-prompt-test');

    beforeAll(() => {
      mkdirSync(tmpDir, { recursive: true });
    });

    afterAll(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should load and transform TSX file', async () => {
      const filePath = join(tmpDir, 'prompt.tsx');
      writeFileSync(filePath, `
        export default (
          <Prompt name="file-test">
            <Task>Do something</Task>
          </Prompt>
        );
      `);

      const element = await createPrompt(filePath);

      expect(element.props.name).toBe('file-test');
    });
  });
  ```

### Implementation

- `src/babel/preset.ts`:
  ```typescript
  import type { ConfigAPI, TransformOptions } from '@babel/core';

  export interface PuptBabelPresetOptions {
    typescript?: boolean;
    development?: boolean;
  }

  export function puptBabelPreset(
    api: ConfigAPI,
    options: PuptBabelPresetOptions = {}
  ): TransformOptions {
    const { typescript = true, development = false } = options;

    api.cache.using(() => JSON.stringify(options));

    return {
      presets: [
        typescript && ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
      ].filter(Boolean),
      plugins: [
        ['@babel/plugin-transform-react-jsx', {
          runtime: 'automatic',
          importSource: 'pupt-lib',
          development,
        }],
      ],
    };
  }

  export default puptBabelPreset;
  ```

- `src/services/transformer.ts`:
  ```typescript
  import * as babel from '@babel/core';
  import { readFile } from 'fs/promises';
  import { puptBabelPreset } from '../babel/preset';

  export class Transformer {
    transformSource(source: string, filename: string): string {
      const result = babel.transformSync(source, {
        presets: [puptBabelPreset],
        filename,
        sourceMaps: 'inline',
      });

      if (!result?.code) {
        throw new Error(`Failed to transform: ${filename}`);
      }

      return result.code;
    }

    async transformFile(filePath: string): Promise<string> {
      const source = await readFile(filePath, 'utf-8');
      return this.transformSource(source, filePath);
    }
  }
  ```

- `src/services/prompt-parser.ts`: Simple XML-like parser for .prompt files
- `src/create-prompt.ts`:
  ```typescript
  import { Transformer } from './services/transformer';
  import type { PuptElement } from './types';

  export async function createPrompt(
    filePath: string,
    options?: CreatePromptOptions
  ): Promise<PuptElement> {
    const transformer = new Transformer();
    const code = await transformer.transformFile(filePath);

    // Evaluate the transformed code
    const module = await evaluateModule(code, filePath);

    return module.default;
  }

  export async function createPromptFromSource(
    source: string,
    filename: string
  ): Promise<PuptElement> {
    const transformer = new Transformer();
    const code = transformer.transformSource(source, filename);

    const module = await evaluateModule(code, filename);

    return module.default;
  }
  ```

### Dependencies

**External**:
```bash
npm install @babel/core @babel/preset-typescript @babel/plugin-transform-react-jsx
```

**Internal**: Phase 6

### Verification

1. Run: `npm test -- test/unit/babel`
   - Expected: Babel preset tests pass

2. Run: `npm test -- test/unit/services/transformer.test.ts`
   - Expected: Transformer tests pass

3. Run: `npm test -- test/unit/create-prompt.test.ts`
   - Expected: createPrompt tests pass

4. Create `tmp/dynamic-prompt.tsx`:
   ```tsx
   export default (
     <Prompt name="dynamic">
       <Role>Assistant</Role>
       <Task>Help with {inputs.topic}</Task>
     </Prompt>
   );
   ```

   Create `tmp/test-transform.ts`:
   ```typescript
   import { createPrompt } from '../src/create-prompt';
   import { render } from '../src/render';
   import '../src/components';

   async function demo() {
     const element = await createPrompt('./tmp/dynamic-prompt.tsx');
     const result = render(element, {
       inputs: { topic: 'TypeScript' },
     });
     console.log(result.text);
   }

   demo();
   ```
   Run: `npx tsx tmp/test-transform.ts`
   - Expected: Prompt renders with "TypeScript" substituted

---

## Phase 8: Module Loading

**Objective**: Implement ModuleLoader, ScopeLoader, and browser support for loading third-party libraries.

**Duration**: 3 days

### Tests to Write First

- `test/unit/services/module-loader.test.ts`:
  ```typescript
  import { describe, it, expect, vi } from 'vitest';
  import { ModuleLoader } from '../../../src/services/module-loader';

  describe('ModuleLoader', () => {
    it('should detect source type', () => {
      const loader = new ModuleLoader();

      expect(loader.resolveSourceType('@acme/prompts')).toBe('npm');
      expect(loader.resolveSourceType('@acme/prompts@1.0.0')).toBe('npm');
      expect(loader.resolveSourceType('https://example.com/lib.js')).toBe('url');
      expect(loader.resolveSourceType('github:acme/repo#v1')).toBe('github');
      expect(loader.resolveSourceType('./local/path')).toBe('local');
    });

    it('should deduplicate loads', async () => {
      const loader = new ModuleLoader();

      // Mock the actual loading
      const loadSpy = vi.spyOn(loader as any, 'doLoad');
      loadSpy.mockResolvedValue({ name: 'test', components: {} });

      await loader.load('@acme/prompts');
      await loader.load('@acme/prompts');

      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('should error on version conflict', async () => {
      const loader = new ModuleLoader();

      // Simulate loading same package with different versions
      await loader.load('@acme/prompts@1.0.0');

      await expect(
        loader.load('@acme/prompts@2.0.0')
      ).rejects.toThrow('Version conflict');
    });

    it('should detect components in module exports', () => {
      const loader = new ModuleLoader();
      const mockExports = {
        MyComponent: class extends Component { render() { return 'test'; } },
        notAComponent: 'string',
        AnotherComponent: class extends Component { render() { return 'test2'; } },
      };

      const components = loader.detectComponents(mockExports);

      expect(Object.keys(components)).toEqual(['MyComponent', 'AnotherComponent']);
    });

    it('should detect prompts in module exports', () => {
      const loader = new ModuleLoader();
      const mockExports = {
        myPrompt: jsx(Prompt, { name: 'my-prompt', children: 'test' }),
        notAPrompt: 'string',
      };

      const prompts = loader.detectPrompts(mockExports);

      expect(Object.keys(prompts)).toEqual(['myPrompt']);
    });
  });
  ```

- `test/unit/services/scope-loader.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { ScopeLoader } from '../../../src/services/scope-loader';

  describe('ScopeLoader', () => {
    it('should load package and create scope', async () => {
      const loader = new ScopeLoader();

      // Using a mock/fixture package
      const scope = await loader.loadPackage('./test/fixtures/libraries/test-lib');

      expect(scope.name).toBe('test-lib');
      expect(scope.has('TestComponent')).toBe(true);
    });

    it('should handle dependencies', async () => {
      const loader = new ScopeLoader();

      // Package with dependencies
      const scope = await loader.loadPackage('./test/fixtures/libraries/with-deps');

      // Should have own components and dependency components
      expect(scope.listAll().length).toBeGreaterThan(0);
    });

    it('should error on circular dependencies', async () => {
      const loader = new ScopeLoader();

      await expect(
        loader.loadPackage('./test/fixtures/libraries/circular-a')
      ).rejects.toThrow('Circular dependency');
    });

    it('should create combined scope for local prompts', async () => {
      const loader = new ScopeLoader();

      await loader.loadPackage('@acme/prompts');
      await loader.loadPackage('@corp/prompts');

      const combined = loader.getCombinedScope();

      // Combined has components from all packages
      expect(combined.listAll().length).toBeGreaterThan(0);
    });
  });
  ```

- `test/unit/services/browser-support.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import {
    generateImportMap,
    resolveCdn,
  } from '../../../src/services/browser-support';

  describe('generateImportMap', () => {
    it('should generate import map for dependencies', () => {
      const deps = [
        { name: 'pupt-lib', version: '1.0.0' },
        { name: '@acme/prompts', version: '2.0.0' },
      ];

      const importMap = generateImportMap(deps, { cdn: 'esm.sh' });

      expect(importMap.imports['pupt-lib']).toBe('https://esm.sh/pupt-lib@1.0.0');
      expect(importMap.imports['@acme/prompts']).toBe('https://esm.sh/@acme/prompts@2.0.0');
    });
  });

  describe('resolveCdn', () => {
    it('should resolve esm.sh URLs', () => {
      const url = resolveCdn('@acme/pkg', '1.0.0', { cdn: 'esm.sh' });
      expect(url).toBe('https://esm.sh/@acme/pkg@1.0.0');
    });

    it('should resolve unpkg URLs', () => {
      const url = resolveCdn('@acme/pkg', '1.0.0', { cdn: 'unpkg' });
      expect(url).toBe('https://unpkg.com/@acme/pkg@1.0.0');
    });

    it('should support custom template', () => {
      const url = resolveCdn('@acme/pkg', '1.0.0', {
        cdnTemplate: 'https://cdn.example.com/{name}@{version}',
      });
      expect(url).toBe('https://cdn.example.com/@acme/pkg@1.0.0');
    });
  });
  ```

### Implementation

- `src/services/module-loader.ts`:
  ```typescript
  import { isComponentClass, Component } from '../component';
  import type { PuptLibrary, ComponentType, PuptElement } from '../types';

  export class ModuleLoader {
    private loaded = new Map<string, PuptLibrary>();
    private loading = new Map<string, Promise<PuptLibrary>>();

    resolveSourceType(source: string): 'npm' | 'url' | 'github' | 'local' {
      if (source.startsWith('https://') || source.startsWith('http://')) return 'url';
      if (source.startsWith('github:')) return 'github';
      if (source.startsWith('./') || source.startsWith('/')) return 'local';
      return 'npm';
    }

    async load(source: string): Promise<PuptLibrary> {
      const normalizedSource = this.normalizeSource(source);

      // Already loaded?
      if (this.loaded.has(normalizedSource)) {
        return this.loaded.get(normalizedSource)!;
      }

      // Currently loading?
      if (this.loading.has(normalizedSource)) {
        return this.loading.get(normalizedSource)!;
      }

      // Start loading
      const promise = this.doLoad(normalizedSource);
      this.loading.set(normalizedSource, promise);

      try {
        const library = await promise;
        this.loaded.set(normalizedSource, library);
        return library;
      } finally {
        this.loading.delete(normalizedSource);
      }
    }

    detectComponents(exports: Record<string, unknown>): Record<string, ComponentType> {
      const components: Record<string, ComponentType> = {};

      for (const [name, value] of Object.entries(exports)) {
        if (isComponentClass(value)) {
          components[name] = value;
        }
      }

      return components;
    }

    detectPrompts(exports: Record<string, unknown>): Record<string, PuptElement> {
      const prompts: Record<string, PuptElement> = {};

      for (const [name, value] of Object.entries(exports)) {
        if (this.isPromptElement(value)) {
          prompts[name] = value as PuptElement;
        }
      }

      return prompts;
    }

    private isPromptElement(value: unknown): boolean {
      return (
        typeof value === 'object' &&
        value !== null &&
        'type' in value &&
        'props' in value &&
        (value as any).props?.name !== undefined
      );
    }

    private async doLoad(source: string): Promise<PuptLibrary> {
      // Implementation depends on source type
      // npm: dynamic import or fetch from CDN
      // url: fetch and evaluate
      // local: readFile and transform
    }
  }
  ```

- `src/services/scope-loader.ts`:
  ```typescript
  import { ModuleLoader } from './module-loader';
  import { Scope, createScope, builtinScope } from './scope';

  export class ScopeLoader {
    private moduleLoader = new ModuleLoader();
    private scopes = new Map<string, Scope>();
    private loading = new Set<string>();

    async loadPackage(source: string): Promise<Scope> {
      // Circular dependency detection
      if (this.loading.has(source)) {
        throw new Error(`Circular dependency detected: ${source}`);
      }

      this.loading.add(source);

      try {
        const library = await this.moduleLoader.load(source);

        // Load dependencies first
        for (const dep of library.dependencies) {
          await this.loadPackage(dep);
        }

        // Create scope with builtin as parent
        const scope = createScope(library.name, builtinScope);

        // Register components
        for (const [name, component] of Object.entries(library.components)) {
          scope.register(name, component);
        }

        this.scopes.set(source, scope);
        return scope;
      } finally {
        this.loading.delete(source);
      }
    }

    getCombinedScope(): Scope {
      const combined = createScope('combined', builtinScope);

      for (const scope of this.scopes.values()) {
        for (const name of scope.listOwn()) {
          if (!combined.has(name)) {
            combined.register(name, scope.get(name)!);
          }
        }
      }

      return combined;
    }
  }
  ```

- `src/services/browser-support.ts`: Import map generation, CDN resolution

### Dependencies

**External**: None new (uses dynamic import)

**Internal**: Phase 7

### Verification

1. Run: `npm test -- test/unit/services/module-loader.test.ts`
   - Expected: Module loader tests pass

2. Run: `npm test -- test/unit/services/scope-loader.test.ts`
   - Expected: Scope loader tests pass

3. Create test fixtures:
   ```
   test/fixtures/libraries/
   ├── test-lib/
   │   ├── package.json
   │   └── src/index.ts
   └── with-deps/
       ├── package.json
       └── src/index.ts
   ```

4. Create `tmp/test-module-load.ts`:
   ```typescript
   import { ScopeLoader } from '../src/services/scope-loader';
   import { render } from '../src/render';
   import { jsx } from '../src/jsx-runtime';

   async function demo() {
     const loader = new ScopeLoader();
     const scope = await loader.loadPackage('./test/fixtures/libraries/test-lib');

     console.log('Loaded components:', scope.listAll());

     // Use a component from the loaded library
     const TestComponent = scope.get('TestComponent');
     if (TestComponent) {
       const element = jsx(TestComponent, { children: 'Hello' });
       const result = render(element, { registry: scope });
       console.log('Rendered:', result.text);
     }
   }

   demo();
   ```
   Run: `npx tsx tmp/test-module-load.ts`
   - Expected: Shows loaded components and renders output

---

## Phase 9: Search, Pupt Class & Final API

**Objective**: Implement SearchEngine, Pupt class, DiscoveredPrompt, and finalize the public API.

**Duration**: 2-3 days

### Tests to Write First

- `test/unit/services/search-engine.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { createSearchEngine } from '../../../src/services/search-engine';

  describe('SearchEngine', () => {
    it('should index prompts', () => {
      const engine = createSearchEngine();

      engine.index([
        { name: 'code-review', description: 'Review code', tags: ['code'], library: 'test' },
        { name: 'bug-fix', description: 'Fix bugs', tags: ['code', 'debug'], library: 'test' },
      ]);

      const results = engine.search('review');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].prompt.name).toBe('code-review');
    });

    it('should support fuzzy matching', () => {
      const engine = createSearchEngine({ fuzzy: true });

      engine.index([
        { name: 'authentication', description: 'Handle auth', tags: [], library: 'test' },
      ]);

      // Typo in search
      const results = engine.search('authentcation');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should filter by tags', () => {
      const engine = createSearchEngine();

      engine.index([
        { name: 'prompt-1', tags: ['frontend'], library: 'test' },
        { name: 'prompt-2', tags: ['backend'], library: 'test' },
        { name: 'prompt-3', tags: ['frontend', 'backend'], library: 'test' },
      ]);

      const frontend = engine.getByTag('frontend');

      expect(frontend.length).toBe(2);
      expect(frontend.map(p => p.name)).toContain('prompt-1');
      expect(frontend.map(p => p.name)).toContain('prompt-3');
    });

    it('should return all tags', () => {
      const engine = createSearchEngine();

      engine.index([
        { name: 'a', tags: ['x', 'y'], library: 'test' },
        { name: 'b', tags: ['y', 'z'], library: 'test' },
      ]);

      const tags = engine.getAllTags();

      expect(tags).toContain('x');
      expect(tags).toContain('y');
      expect(tags).toContain('z');
    });
  });
  ```

- `test/unit/api.test.ts`:
  ```typescript
  import { describe, it, expect, beforeEach } from 'vitest';
  import { Pupt } from '../../src/api';

  describe('Pupt', () => {
    it('should initialize with modules', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/libraries/test-lib'],
      });

      await pupt.init();

      expect(pupt.hasComponent('TestComponent')).toBe(true);
    });

    it('should return discovered prompts', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/libraries/test-lib'],
      });

      await pupt.init();

      const prompts = pupt.getPrompts();

      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].name).toBeDefined();
    });

    it('should get prompt by name', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/libraries/test-lib'],
      });

      await pupt.init();

      const prompt = pupt.getPrompt('test-prompt');

      expect(prompt).toBeDefined();
      expect(prompt?.name).toBe('test-prompt');
    });

    it('should search prompts', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/libraries/test-lib'],
      });

      await pupt.init();

      const results = pupt.searchPrompts('test');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should get prompts by tag', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/libraries/test-lib'],
      });

      await pupt.init();

      const prompts = pupt.getPromptsByTag('example');

      expect(Array.isArray(prompts)).toBe(true);
    });
  });

  describe('DiscoveredPrompt', () => {
    it('should render with correct scope', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/libraries/test-lib'],
      });

      await pupt.init();

      const prompt = pupt.getPrompt('test-prompt');
      const result = prompt?.render({ inputs: { name: 'Alice' } });

      expect(result?.text).toContain('Alice');
    });

    it('should provide input iterator', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/libraries/test-lib'],
      });

      await pupt.init();

      const prompt = pupt.getPrompt('prompt-with-inputs');
      const iterator = prompt?.getInputIterator();

      expect(iterator).toBeDefined();
      iterator?.start();
      expect(iterator?.current()).toBeDefined();
    });
  });
  ```

- `test/integration/full-workflow.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { Pupt } from '../../src/api';

  describe('Full Workflow', () => {
    it('should load, discover, collect inputs, and render', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/libraries/test-lib'],
      });

      await pupt.init();

      // Discover
      const prompts = pupt.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);

      // Search
      const results = pupt.searchPrompts('test');
      expect(results.length).toBeGreaterThan(0);

      // Select and render
      const prompt = prompts[0];
      const result = prompt.render({
        inputs: { name: 'World' },
      });

      expect(result.text).toBeDefined();
      expect(result.postExecution).toBeDefined();
    });
  });
  ```

### Implementation

- `src/services/search-engine.ts`:
  ```typescript
  import MiniSearch from 'minisearch';
  import type { SearchablePrompt, SearchResult, SearchEngineConfig } from '../types';

  export interface SearchEngine {
    index(prompts: SearchablePrompt[]): void;
    search(query: string, options?: Partial<SearchOptions>): SearchResult[];
    getByTag(tag: string): SearchablePrompt[];
    getAllTags(): string[];
    clear(): void;
  }

  export function createSearchEngine(config?: SearchEngineConfig): SearchEngine {
    const {
      threshold = 0.3,
      weights = { name: 2, description: 1.5, tags: 1, content: 0.5 },
      fuzzy = true,
      fuzziness = 0.4,
    } = config ?? {};

    const miniSearch = new MiniSearch({
      fields: ['name', 'description', 'tags', 'content'],
      storeFields: ['name', 'description', 'tags', 'library'],
      searchOptions: {
        fuzzy: fuzzy ? fuzziness : false,
        boost: weights,
      },
    });

    const allPrompts: SearchablePrompt[] = [];

    return {
      index(prompts) {
        allPrompts.push(...prompts);
        miniSearch.addAll(prompts.map((p, i) => ({ id: i, ...p, tags: p.tags.join(' ') })));
      },

      search(query, options) {
        const results = miniSearch.search(query, {
          filter: options?.tags
            ? (result) => options.tags!.every(t => result.tags.includes(t))
            : undefined,
        });

        return results
          .filter(r => r.score >= threshold)
          .slice(0, options?.limit ?? 10)
          .map(r => ({
            prompt: allPrompts[r.id as number],
            score: r.score,
            matches: r.match ? Object.entries(r.match).map(([field, terms]) => ({
              field,
              indices: [], // MiniSearch doesn't provide indices
            })) : [],
          }));
      },

      getByTag(tag) {
        return allPrompts.filter(p => p.tags.includes(tag));
      },

      getAllTags() {
        const tags = new Set<string>();
        allPrompts.forEach(p => p.tags.forEach(t => tags.add(t)));
        return [...tags];
      },

      clear() {
        miniSearch.removeAll();
        allPrompts.length = 0;
      },
    };
  }
  ```

- `src/api.ts`:
  ```typescript
  import type { PuptConfig, DiscoveredPrompt, SearchResult, SearchOptions } from './types';
  import { ScopeLoader } from './services/scope-loader';
  import { createSearchEngine, SearchEngine } from './services/search-engine';
  import { render } from './render';
  import { createInputIterator } from './services/input-iterator';

  export class Pupt {
    private scopeLoader = new ScopeLoader();
    private searchEngine: SearchEngine;
    private prompts: DiscoveredPrompt[] = [];
    private initialized = false;

    constructor(private config: PuptConfig) {
      this.searchEngine = createSearchEngine();
    }

    async init(): Promise<void> {
      if (this.initialized) return;

      // Load all modules
      for (const source of this.config.modules ?? []) {
        await this.scopeLoader.loadPackage(source);
      }

      // Discover prompts from loaded libraries
      this.prompts = this.discoverPrompts();

      // Index for search
      this.searchEngine.index(this.prompts.map(p => ({
        name: p.name,
        description: p.description,
        tags: p.tags,
        library: p.library,
      })));

      this.initialized = true;
    }

    getPrompts(filter?: { tags?: string[] }): DiscoveredPrompt[] {
      if (filter?.tags) {
        return this.prompts.filter(p =>
          filter.tags!.every(t => p.tags.includes(t))
        );
      }
      return [...this.prompts];
    }

    getPrompt(name: string): DiscoveredPrompt | undefined {
      return this.prompts.find(p => p.name === name);
    }

    searchPrompts(query: string, options?: Partial<SearchOptions>): SearchResult[] {
      return this.searchEngine.search(query, options);
    }

    getTags(): string[] {
      return this.searchEngine.getAllTags();
    }

    getPromptsByTag(tag: string): DiscoveredPrompt[] {
      return this.prompts.filter(p => p.tags.includes(tag));
    }

    hasComponent(name: string): boolean {
      return this.scopeLoader.getCombinedScope().has(name);
    }

    getRegistry() {
      return this.scopeLoader.getCombinedScope();
    }

    private discoverPrompts(): DiscoveredPrompt[] {
      // Extract prompts from loaded libraries
      // Wrap each with render() and getInputIterator() methods
    }
  }
  ```

- `src/index.ts`: Final public API exports
  ```typescript
  // Core
  export { render, renderAsync } from './render';
  export { createPrompt, createPromptFromSource } from './create-prompt';

  // JSX
  export { jsx, jsxs, Fragment } from './jsx-runtime';

  // Types
  export type {
    PuptElement,
    PuptNode,
    RenderResult,
    RenderOptions,
    RenderContext,
    EnvironmentContext,
    InputRequirement,
    ValidationResult,
    SearchablePrompt,
    SearchResult,
    SearchOptions,
    PuptConfig,
    DiscoveredPrompt,
  } from './types';

  // Environment
  export { DEFAULT_ENVIRONMENT, createEnvironment, createRuntimeConfig } from './types/context';

  // API
  export { Pupt } from './api';

  // Services
  export { createInputIterator, type InputIterator } from './services/input-iterator';
  export { createInputCollector, type InputCollector } from './services/input-collector';
  export { ScopeLoader } from './services/scope-loader';
  export { Scope, createScope } from './services/scope';
  export { Transformer } from './services/transformer';
  export { createRegistry, defaultRegistry, type ComponentRegistry } from './services/component-registry';
  export { createSearchEngine, type SearchEngine } from './services/search-engine';

  // Component base
  export { Component, isComponentClass } from './component';

  // Built-in components
  export * from './components';

  // Utilities
  export { defineComponent } from './utils/define-component';
  export { createValidator } from './utils/validation';
  ```

### Dependencies

**External**: minisearch (already installed in Phase 1)

**Internal**: All previous phases

### Verification

1. Run: `npm test`
   - Expected: All tests pass (unit + integration)

2. Run: `npm run build`
   - Expected: Build succeeds, dist/ contains all exports

3. Create `tmp/test-full-api.ts`:
   ```typescript
   import { Pupt } from '../src/api';

   async function demo() {
     const pupt = new Pupt({
       modules: ['./test/fixtures/libraries/test-lib'],
     });

     await pupt.init();

     console.log('=== Available Prompts ===');
     for (const prompt of pupt.getPrompts()) {
       console.log(`- ${prompt.name}: ${prompt.description}`);
     }

     console.log('\n=== Search Results for "test" ===');
     const results = pupt.searchPrompts('test');
     for (const { prompt, score } of results) {
       console.log(`- ${prompt.name} (score: ${score.toFixed(2)})`);
     }

     console.log('\n=== Tags ===');
     console.log(pupt.getTags().join(', '));

     console.log('\n=== Render ===');
     const prompt = pupt.getPrompt('test-prompt');
     if (prompt) {
       const result = prompt.render({ inputs: { name: 'World' } });
       console.log(result.text);
     }
   }

   demo();
   ```
   Run: `npx tsx tmp/test-full-api.ts`
   - Expected: Shows prompts, search results, tags, and rendered output

---

## Common Utilities Needed

| Utility | Purpose | Used In |
|---------|---------|---------|
| `normalizeChildren()` | Flatten arrays, filter nulls | jsx-runtime, render |
| `trimWhitespace()` | Smart whitespace handling | render, Section |
| `formatSection()` | XML/markdown section formatting | structural components |
| `validateWithZod()` | Zod schema validation wrapper | Ask.*, defineComponent |
| `parseExcelFormula()` | Excel formula evaluation | If component |
| `createProxy()` | Proxy for inputs access | InputIterator |
| `evaluateModule()` | Dynamic code evaluation | createPrompt |

---

## External Libraries Assessment

| Task | Library | Reason |
|------|---------|--------|
| Excel formulas | hyperformula | Actively maintained, full Excel compatibility |
| Fuzzy search | minisearch | Fast, in-memory, good API |
| Schema validation | zod | TypeScript-first, great DX |
| JSX transformation | @babel/core + presets | Industry standard |
| UUID generation | crypto.randomUUID() | Built-in, no library needed |
| Date formatting | Native Intl or dayjs | Intl is built-in, dayjs is lightweight |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Excel formula parser performance | Lazy load hyperformula, cache compiled formulas |
| Browser bundle size | Tree-shakeable exports, separate entry points |
| Circular dependencies in user libraries | Explicit detection and clear error messages |
| Version conflicts | Error on conflict (decided), suggest resolution |
| JSX runtime conflicts with React | Separate jsx-runtime export, clear jsxImportSource |
| Breaking changes during development | Semantic versioning, deprecation warnings |
| Test flakiness from async operations | Proper async/await, timeouts, deterministic tests |

---

## Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| 1. Scaffolding | 2 days | Project infrastructure |
| 2. Types + JSX | 2-3 days | Create element trees |
| 3. Registry + Render | 2-3 days | Render elements to text |
| 4. Core Components | 2-3 days | Real prompts with components |
| 5. User Input | 3 days | Collect and validate inputs |
| 6. Extended Components | 2 days | Examples, data, post-execution |
| 7. Transformation | 2-3 days | Runtime .tsx compilation |
| 8. Module Loading | 3 days | Third-party libraries |
| 9. Search + API | 2-3 days | Full public API |
| **Total** | **20-25 days** | **Complete library** |
