# Module Loading

[← Back to Index](00-index.md) | [Previous: API](07-api.md) | [Next: Simple Prompt Format](09-simple-prompt-format.md)

---

## Overview

pupt-lib supports loading component libraries from multiple sources:
- npm packages
- URLs (CDN, self-hosted)
- GitHub repositories
- Local file paths (CLI only)

---

## Source Format Resolution

| Format | Example | Resolution |
|--------|---------|------------|
| npm package | `@acme/prompts` | Resolved via Node.js or esm.sh |
| npm with version | `@acme/prompts@1.0.0` | Pinned version |
| URL | `https://cdn.example.com/lib.js` | Direct fetch |
| GitHub | `github:acme/prompts#v1.0.0` | GitHub raw URL |
| Local path | `./my-prompts/` | File system (CLI only) |

---

## Library Package Structure

Libraries can be distributed via npm or hosted at any URL. The structure is simple: export Component subclasses and Prompt elements.

### Minimal Structure

```
my-prompts/
├── package.json          # Standard npm package
└── src/
    └── index.ts          # Export components, prompts, and optional metadata
```

### Full Example (npm package)

```
@acme/prompts/
├── package.json
├── src/
│   ├── index.ts          # Main entry - exports everything
│   ├── components/
│   │   ├── AcmeHeader.ts
│   │   └── AcmeFooter.ts
│   └── prompts/
│       ├── support-ticket.tsx
│       └── bug-report.tsx
└── dist/
    └── index.js          # Compiled output
```

### package.json

```json
{
  "name": "@acme/prompts",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "pupt-lib": "^1.0.0"
  },
  "pupt": {
    "capabilities": ["network"]
  }
}
```

### src/index.ts

```typescript
import { Component, Prompt, Role, Task } from 'pupt-lib';

// Components - auto-discovered
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

// Prompts - auto-discovered
export const supportTicket = (
  <Prompt name="support-ticket" tags={['support']}>
    <AcmeHeader title="Support" />
    <Role>You are a support agent.</Role>
    <Task>Help the customer.</Task>
  </Prompt>
);

// Optional: metadata
export default {
  name: 'acme-prompts',
  version: '1.0.0',
  dependencies: [
    '@common/prompt-utils',  // npm dependency
    'https://shared.example.com/utils/v1.0.0/index.js',  // URL dependency
  ],
};
```

---

## Component Registry

### Registry Interface

```typescript
export interface ComponentRegistry {
  /** Register a component class */
  register(name: string, component: ComponentClass): void;

  /** Get a component by name */
  get(name: string): ComponentClass | undefined;

  /** Check if a component exists */
  has(name: string): boolean;

  /** List all registered component names */
  list(): string[];

  /** Create a child registry that inherits from this one */
  createChild(): ComponentRegistry;
}
```

### Default Registry

Built-in components are registered in the default registry:

```typescript
import { defaultRegistry } from 'pupt-lib';

// All built-in components are pre-registered
defaultRegistry.has('Role');      // true
defaultRegistry.has('Task');      // true
defaultRegistry.has('Ask.Text');  // true
```

### Custom Registry (for testing)

```typescript
import { createRegistry } from 'pupt-lib';

const testRegistry = createRegistry();
testRegistry.register('MockHeader', MockHeaderComponent);

const result = render(element, { registry: testRegistry });
```

---

## Scope System

### Scope Class

```typescript
export class Scope {
  readonly name: string;
  readonly parent?: Scope;

  constructor(name: string, parent?: Scope);

  /** Register a component in this scope */
  register(component: ComponentClass): void;

  /** Get a component, checking this scope then parent */
  get(name: string): ComponentClass | undefined;

  /** Check if component exists in this scope or parent */
  has(name: string): boolean;

  /** List components defined in this scope only */
  listOwn(): string[];

  /** List all available components (including inherited) */
  listAll(): string[];
}
```

### ScopeLoader Class

Walks package.json dependencies and builds scope chains:

```typescript
export class ScopeLoader {
  /** Load a package and build its scope */
  async loadPackage(source: string): Promise<Scope>;

  /** Load multiple packages */
  async loadPackages(sources: string[]): Promise<Scope[]>;

  /** Get the combined scope for local prompts */
  getCombinedScope(): Scope;
}
```

### How ScopeLoader Works

```
1. Receive package source (npm, URL, local)
   │
   ▼
2. Fetch package metadata (dependencies list)
   │
   ▼
3. Recursively load dependencies first (with deduplication)
   │
   ▼
4. Create scope with parent = builtins
   │
   ▼
5. Merge dependency scopes into this scope
   │
   ▼
6. Load this package's components, register in scope
   │
   ▼
7. Cache and return scope
```

### Edge Case Handling

```typescript
// Circular dependency detection
const loading = new Set<string>();  // Track packages currently being loaded

async function loadPackage(name: string): Promise<Scope> {
  if (loading.has(name)) {
    warnings.push(`Circular dependency: ${name}`);
    return partialScope;  // Return what we have so far
  }

  loading.add(name);
  try {
    // ... load package ...
  } finally {
    loading.delete(name);
  }
}

// Diamond dependency handling - error on version conflict
function mergeScope(target: Scope, source: Scope): void {
  for (const name of source.listOwn()) {
    if (target.has(name)) {
      throw new Error(
        `Component "${name}" already exists. ` +
        `Conflicting sources: "${target.getSource(name)}" and "${source.name}". ` +
        `Use explicit versioning or aliases to resolve.`
      );
    }
    target.register(source.get(name)!);
  }
}

// Version conflict detection
async function loadDependency(name: string, requestedVersion: string): Promise<LoadedModule> {
  const existing = this.loaded.get(name);
  if (existing) {
    if (existing.version !== requestedVersion) {
      throw new Error(
        `Version conflict for "${name}": ` +
        `already loaded ${existing.version}, but ${requestedVersion} requested. ` +
        `Pin versions explicitly to resolve.`
      );
    }
    return existing;
  }
  return this.load(`${name}@${requestedVersion}`);
}
```

### Detecting pupt-lib Libraries

A package is identified as a pupt-lib library if:

```typescript
async function isPuptLibrary(packageName: string): Promise<boolean> {
  const pkg = await readPackageJson(packageName);

  return (
    pkg.keywords?.includes('pupt-lib') ||
    pkg.peerDependencies?.['pupt-lib'] !== undefined
  );
}
```

---

## Module Deduplication

The loader tracks loaded modules to prevent duplicate loading:

```typescript
class ModuleLoader {
  private loaded = new Map<string, LoadedModule>();     // Completed
  private loading = new Map<string, Promise<LoadedModule>>(); // In progress

  async load(source: string): Promise<LoadedModule> {
    // Already loaded?
    if (this.loaded.has(source)) {
      return this.loaded.get(source)!;
    }

    // Currently loading? (handles concurrent requests for same module)
    if (this.loading.has(source)) {
      return this.loading.get(source)!;
    }

    // Start loading
    const promise = this.doLoad(source);
    this.loading.set(source, promise);

    const module = await promise;
    this.loaded.set(source, module);
    this.loading.delete(source);

    return module;
  }

  private async doLoad(source: string): Promise<LoadedModule> {
    // 1. Fetch manifest (including dependencies)
    const manifest = await this.fetchManifest(source);

    // 2. Load dependencies first (recursive, deduplicated)
    for (const dep of manifest.dependencies ?? []) {
      await this.load(dep);
    }

    // 3. Load this module
    return this.loadAndRegister(manifest);
  }
}
```

---

## Browser Module Loading

For browser environments, `Pupt.init()` generates and injects an import map before loading any modules.

### The Problem

When a library does:
```typescript
import { Component } from 'pupt-lib';
```

Where does `pupt-lib` come from in a browser? Unlike Node.js, browsers don't have `node_modules`.

### Solution: Import Maps

```typescript
// Browser setup (handled internally by Pupt)
async function setupBrowserModules(sources: string[]): Promise<void> {
  // 1. Resolve dependency tree for all sources
  const allDeps = await resolveDependencyTree(sources);

  // 2. Generate import map
  const importMap = {
    imports: {
      'pupt-lib': 'https://esm.sh/pupt-lib@1.0.0',
      ...Object.fromEntries(
        allDeps.map(([name, version]) => [name, `https://esm.sh/${name}@${version}`])
      ),
    },
  };

  // 3. Inject import map into document
  const script = document.createElement('script');
  script.type = 'importmap';
  script.textContent = JSON.stringify(importMap);
  document.head.appendChild(script);
}
```

### Key Properties

| Property | How Achieved |
|----------|--------------|
| **Single copy of pupt-lib** | Import map points all `'pupt-lib'` imports to same URL |
| **Deduplication** | Dependency tree resolved before loading; each module loaded once |
| **No library changes** | Libraries use standard `import { Component } from 'pupt-lib'` |
| **Version control** | Import map specifies exact versions |

### CDN Configuration

The CDN used for browser module loading is configurable, with esm.sh as the default:

```typescript
const pupt = new Pupt({
  modules: ['@acme/prompts'],
  browser: {
    cdn: 'esm.sh',  // Default
    // Or: 'unpkg', 'jsdelivr', or custom URL template
    // cdnTemplate: 'https://cdn.example.com/{name}@{version}'
  },
});
```

| CDN | Value | Example URL | Notes |
|-----|-------|-------------|-------|
| esm.sh | `'esm.sh'` (default) | `https://esm.sh/@acme/pkg@1.0.0` | Auto-builds npm packages as ESM |
| unpkg | `'unpkg'` | `https://unpkg.com/@acme/pkg@1.0.0/dist/index.js` | Serves npm files directly |
| jsDelivr | `'jsdelivr'` | `https://cdn.jsdelivr.net/npm/@acme/pkg@1.0.0` | Fast, global CDN |
| Custom | `cdnTemplate` | User-defined | Full control |

**CDN Fallback:** If the configured CDN is unavailable, the loader throws an error. Users should configure a self-hosted fallback for production reliability.

---

## Environment Capability Declarations

Modules can declare required capabilities:

```json
// package.json
{
  "name": "@acme/file-utils",
  "pupt": {
    "capabilities": ["filesystem"]
  }
}
```

When loading in browser:
```
Warning: @acme/file-utils requires "filesystem" capability
which is not available in browsers.
Components from this module may not work correctly.
```

### Supported Capabilities

| Capability | Description | Node.js | Browser |
|------------|-------------|---------|---------|
| `filesystem` | Read/write files | ✅ | ❌ |
| `network` | Make HTTP requests | ✅ | ✅ (CORS) |
| `process` | Access process info | ✅ | ❌ |

---

## Component Detection Across Bundles

If libraries are bundled separately, each has its own copy of the `Component` class. The `instanceof Component` check fails across bundles.

### Solution: Global Symbol

```typescript
// pupt-lib/src/component.ts
const COMPONENT_MARKER = Symbol.for('pupt-lib:component:v1');

export abstract class Component<Props = {}> {
  static [COMPONENT_MARKER] = true;

  abstract render(props: Props, context: RenderContext): PuptNode;
}

export function isComponentClass(value: unknown): value is typeof Component {
  return (
    typeof value === 'function' &&
    value[Symbol.for('pupt-lib:component:v1')] === true
  );
}
```

| Scenario | Detection Method |
|----------|------------------|
| Single pupt-lib instance (normal) | `instanceof Component` works |
| Multiple pupt-lib instances (edge case) | `Symbol.for()` still works |
| Libraries from different bundles | `Symbol.for()` is globally shared |

---

## PuptLibrary Interface

```typescript
export interface PuptLibrary {
  /** Library name (from metadata or derived from source) */
  name: string;
  /** Library version */
  version: string;
  /** Dependencies that were loaded */
  dependencies: string[];
  /** Source this was loaded from */
  source: string;
  /** Discovered components (classes extending Component) */
  components: Record<string, ComponentClass>;
  /** Discovered prompts (JSX elements with <Prompt> root) */
  prompts: Record<string, PromptElement>;
  /** Capabilities required (filesystem, network, etc.) */
  capabilities?: string[];
}
```

---

## Next Steps

- [Simple Prompt Format](09-simple-prompt-format.md) - `.prompt` files for non-technical users
- [Workflows](10-workflows.md) - How to author and publish libraries
- [API](07-api.md) - Using the module loading API
