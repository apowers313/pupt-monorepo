# Module Loading Refactor Design

## Problem Statement

pupt-lib's `ModuleLoader` currently only supports loading pre-compiled JavaScript modules that export `PuptElement` objects and `Component` classes. It cannot discover or compile `.prompt` files from packages. This forces prompt package authors to either:

1. Maintain a JS entry point that compiles and re-exports prompts (friction for non-technical users)
2. Rely on the `pupt` CLI's `promptDirs` mechanism, which bypasses the module system entirely

The goal is to redesign module loading so that:
- Packages can ship raw `.prompt` files with zero build step
- Modules can be loaded from npm packages, CDN URLs, and GitHub URLs
- Discovered prompts are searchable via the `Pupt` API and usable in pupt-react
- Technical users can still export components for use in `.prompt` files

## Two Distinct Concepts

This design recognizes that **prompts** and **components** are fundamentally different things with different audiences, distribution mechanisms, and loading strategies.

### Prompts

Prompts are the primary artifact for non-technical users. They are:

- **Authored** as `.prompt` files (XML-like syntax, no JS knowledge required)
- **Distributed** as collections of files — in a directory, a `.tgz` archive, or a GitHub repo
- **Discovered** by scanning file structures (directory listing, tarball iteration, Git tree API)
- **Compiled** at runtime by pupt-lib's existing pipeline (preprocessor → babel → evaluator)
- **Searchable** via the `Pupt` API (by name, tags, description)
- **Self-contained** — a `.prompt` file has everything needed to render (built-in components are auto-imported)

Prompts do not require an npm package entry point, a build step, or any JavaScript knowledge.

### Components

Components are code for technical users. They are:

- **Authored** as `.ts` / `.tsx` files (extends `Component` base class or function components)
- **Distributed** as npm packages with proper `exports` / `main` fields
- **Loaded** via standard ES module `import()` — from `node_modules` (local npm), CDN URL, or a direct URL pointing to an npm package served over HTTP
- **Referenced** in `.prompt` files via `<Uses component="X" from="package-name" />`, which compiles to a real `import` statement
- **Built** before publishing (TypeScript → JavaScript, with type declarations)

Components require npm packaging because `import()` resolution depends on it. The `from` attribute in `<Uses>` resolves through Node's module resolution (local) or CDN URL rewriting (browser) — both of which operate on npm package structures.

### How They Interact

A prompt can use components from an npm package:

```xml
<Uses component="Callout" from="pupt-ui-components" />

<Prompt name="sde-code-review">
  <Callout type="warning">Check for security issues</Callout>
</Prompt>
```

A single package can ship both prompts and components:

```
my-package/
├── package.json        ← exports field for components
├── prompts/            ← convention directory for prompts
│   └── review.prompt
└── dist/               ← built component code
    └── index.js
```

But many packages will ship only prompts (no JS, no build step, no entry point).

## Prompt Discovery: Convention-Based

### Core Idea

Packages place `.prompt` files in a `prompts/` directory at the package root. The module loader discovers them by scanning that directory — no manifest or configuration required.

```
my-prompt-package/
├── package.json
├── prompts/                    ← conventional location
│   ├── code-review.prompt
│   ├── debug-root-cause.prompt
│   └── security-audit.prompt
└── src/components/             ← optional, for component authors
    └── index.ts
```

### Built-In PromptSource Implementations

Each built-in source type is a `PromptSource` implementation — the same interface that third-party sources use. This ensures the interface is proven by real usage and that built-in sources have no special privileges over third-party ones.

#### `NpmLocalPromptSource`

Handles locally installed npm packages (resolved via `node_modules/`).

- Resolve package to `node_modules/<package>/`
- `fs.readdir` on `prompts/` directory
- `fs.readFile` each `.prompt` file
- Return `{ filename, content }` pairs

Triggered by: bare package names (`pupt-sde`, `pupt-sde@1.2.0`)

#### `NpmRegistryPromptSource`

Handles npm packages that aren't locally installed, fetching directly from the npm registry.

- Fetch package metadata: `GET https://registry.npmjs.org/<package>/<version>`
- Download tarball from `response.dist.tarball`
- Decompress `.tgz` in memory
- Iterate `package/prompts/**/*.prompt` entries
- Return `{ filename, content }` pairs

Triggered by: bare package names when not found locally, or when explicitly requesting remote resolution.

Note: CDN providers (jsdelivr, unpkg, esm.sh) distribute the same npm artifacts, so they can use this same source. Some CDNs also provide file tree APIs as an optimization:
- **jsdelivr**: `GET https://data.jsdelivr.com/v1/packages/npm/<package>@<version>` returns full file tree as JSON
- **unpkg**: `GET https://unpkg.com/<package>@<version>/?meta` returns directory metadata

#### `GitHubPromptSource`

Handles GitHub repository references.

- Use the Git Trees API: `GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1`
- Filter tree entries for `prompts/**/*.prompt`
- Fetch each file from `https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}`
- Return `{ filename, content }` pairs

Triggered by: `github:` prefix (`github:user/repo`, `github:user/repo#v1.0`)

#### `LocalPromptSource`

Handles local directories on the filesystem. This is the same source used for user-authored prompts in a project's local `.prompts/` directory — local prompts are not a separate concept, they're just another module entry.

- `fs.readdir` on `<path>/prompts/` (or the path itself if it contains `.prompt` files)
- `fs.readFile` each `.prompt` file
- Return `{ filename, content }` pairs

Triggered by: relative or absolute paths (`./my-prompts`, `../shared/prompts`, `${projectRoot}/.prompts`)

### Summary Table

| String format | Built-in PromptSource | Discovery method | File access |
|---|---|---|---|
| `pupt-sde` | `NpmLocalPromptSource` | `fs.readdir` on `node_modules/pkg/prompts/` | `fs.readFile` |
| `pupt-sde` (not installed) | `NpmRegistryPromptSource` | Download `.tgz`, iterate in memory | Extract from tar |
| `https://cdn.example.com/...` | `NpmRegistryPromptSource` | Download npm `.tgz`, iterate in memory | Extract from tar |
| `github:user/repo` | `GitHubPromptSource` | Git Trees API | `raw.githubusercontent.com` |
| `./my-prompts` | `LocalPromptSource` | `fs.readdir` | `fs.readFile` |

All built-in sources return the same `DiscoveredPrompt[]` shape. The module loader treats them identically to third-party sources — there is no separate code path.

### Compilation Pipeline

Each discovered `.prompt` file goes through the existing pupt-lib compilation pipeline:

```
.prompt file source
  → preprocessor (inject built-in imports, extract <Uses>, wrap with export default)
  → transformer (babel: JSX → JS, uses-to-import plugin)
  → module evaluator (rewrite bare specifiers, dynamic import)
  → PuptElement with metadata (name, description, tags)
```

This pipeline already exists in pupt-lib and is used by the `pupt` CLI. The refactor extends the `ModuleLoader` to use it.

### Metadata Extraction

After compilation, prompt metadata is extracted from the `PuptElement` props:
- `name` — human-readable prompt name (for display and search, not used as a key)
- `description` — human-readable summary
- `tags` — array of tags for filtering and search
- `version` — prompt version

Each discovered prompt is assigned a unique internal ID at load time (e.g., a UUID or hash of source + filename). This ID is used for internal indexing and deduplication. It is ephemeral — not persisted, cached, or committed. Multiple prompts can share the same `name` without conflict; the `name` is display/search metadata only.

This metadata powers `Pupt.getPrompts()`, `Pupt.searchPrompts()`, and pupt-react's prompt discovery UI.

### Error Handling

If a `PromptSource` fails (e.g., GitHub rate limited, S3 credentials expired, network timeout), the module loader **skips that source and continues** loading the remaining sources. A warning is raised that will be shown to the user, including the source identifier and the error reason. This ensures one broken source doesn't prevent access to all other prompts.

## Component Loading: npm Packages via `import()`

### How Components Are Loaded

Components are standard ES module exports. The module loader uses `import()` to load them, which means they must be resolvable as npm packages:

- **npm (local)**: `import("pupt-ui-components")` resolves via `node_modules/`
- **npm via CDN URL**: `import("https://esm.sh/pupt-ui-components@1.0.0")` fetches from CDN
- **Direct URL**: Any URL pointing to a valid ES module

GitHub is not a viable source for component `import()` because there is no reliable way to resolve a GitHub repo reference to a JS entry point without first fetching and parsing `package.json`.

### How Components Are Discovered

When the module loader processes a package, it checks whether the package has a JS entry point (`exports` or `main` in `package.json`). If so, it `import()`s the module and scans exports:

- Exports extending `Component` base class → registered as components
- Exports that are `PuptElement` objects with a `name` prop → registered as prompts (for technical users who prefer `.tsx` over `.prompt`)

This is the existing `ModuleLoader` behavior and does not change.

### How Prompts Reference Components

A `.prompt` file uses `<Uses>` to declare a dependency on a component from an npm package:

```xml
<Uses component="Callout" from="pupt-ui-components" />
```

This compiles (via the `uses-to-import` babel plugin) to:

```js
import { Callout } from "pupt-ui-components";
```

The `from` attribute must be:
- An **npm package name** (e.g., `"pupt-ui-components"`) — resolved via `node_modules/` or bare specifier rewriting to CDN
- A **CDN URL** (e.g., `"https://esm.sh/pupt-ui-components@1.0.0"`) — direct ES module fetch
- A **relative path** (e.g., `"./components/MyHelper"`) — for components within the same package

### Bare Specifier Resolution

Both `.prompt` files (via `<Uses>`) and `.tsx` files (via standard `import`) can reference external packages by bare specifier (e.g., `"pupt-ui-components"`). These specifiers must be resolved to actual URLs or file paths at evaluation time. There are two distinct loading paths, and they handle resolution differently.

#### Path 1: Published npm packages (loaded via `import()`)

When the module loader `import()`s a published npm package (for component discovery), the runtime handles all resolution:

- **Node**: `import("pupt-ui-components")` resolves via `node_modules/`. Node handles all transitive dependencies through standard module resolution. No pupt-lib involvement.
- **Browser**: `import("https://esm.sh/pupt-ui-components@1.0.0")` fetches from CDN. The CDN rewrites the package's internal bare specifiers to CDN URLs for transitive dependencies. No pupt-lib involvement.

This path just works — it's standard ES module loading.

#### Path 2: Code evaluated via Blob URL (prompts and local .tsx)

When pupt-lib preprocesses, transforms, and evaluates code itself (`.prompt` files, local `.tsx` files), the module evaluator's **bare specifier rewriter** handles all resolution. This rewriter already exists in pupt-lib and processes every bare specifier in the transformed output — regardless of whether it originated from a `<Uses>` tag or a standard `import` statement.

- **Node**: bare specifiers are rewritten to `file://` paths resolved from `node_modules/`
- **Browser**: bare specifiers are rewritten to CDN URLs (e.g., `"pupt-ui-components"` → `"https://esm.sh/pupt-ui-components"`)

The rewriter is the single point of resolution for all evaluated code. It does not distinguish between specifiers from `<Uses>` and those from standard imports.

#### Summary

| | Published npm packages (Path 1) | Evaluated code (Path 2) |
|---|---|---|
| **Node** | Node module resolution | Bare specifier rewriter → `node_modules/` path |
| **Browser** | CDN handles transitive deps | Bare specifier rewriter → CDN URL |

#### Node Fallback Behavior

When the bare specifier rewriter encounters a package that isn't in `node_modules/`, it currently fails with an error. An option for the future is to fall back to CDN resolution (like the browser path does), making the behavior consistent across environments. This would be opt-in to avoid surprising implicit network requests.

#### Import Maps Are Not Required

In the browser, pupt-lib does not rely on the browser's native import map mechanism for evaluated code. The bare specifier rewriter handles resolution before the Blob URL is created — the browser only sees fully-resolved URLs. This avoids the limitation that import maps are static and cannot be modified after module loading begins.

## Package Configuration

### Minimal package.json (prompt-only package)

```json
{
  "name": "pupt-sde",
  "version": "1.0.0",
  "type": "module",
  "peerDependencies": {
    "pupt-lib": "^1.3.5"
  },
  "files": [
    "prompts",
    "README.md",
    "LICENSE"
  ]
}
```

No `main`, no `exports`, no build step. Just ship the `prompts/` directory.

### Package with components

```json
{
  "name": "pupt-ui-components",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "pupt-lib": "^1.3.5"
  },
  "files": [
    "prompts",
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

### Package with both prompts and components

```json
{
  "name": "pupt-full-toolkit",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "pupt-lib": "^1.3.5"
  },
  "files": [
    "prompts",
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

The module loader handles both: scans `prompts/` for `.prompt` files and `import()`s the JS entry point for components.

## Extensible Prompt Sources

### Design Goal

The prompt discovery mechanism should be extensible. The built-in sources (npm, GitHub, CDN, local) cover the common cases, but third parties should be able to create new sources (REST APIs, S3 buckets, databases, etc.) and distribute them as npm packages.

### Architecture: Layered Responsibility

```
┌─────────────────────────────────────────────────┐
│  pupt CLI / pupt-react                          │
│  - Manage module configuration                  │
│  - Read from config files / React state         │
│  - Build the modules array                      │
│  - Pass modules array to pupt-lib               │
├─────────────────────────────────────────────────┤
│  pupt-lib (Pupt class / ModuleLoader)           │
│  - Accept modules array                         │
│  - Route strings to built-in sources            │
│  - Accept PromptSource instances directly        │
│  - Dynamically load source packages by name     │
│  - Compile discovered .prompt files             │
│  - Import components from JS entry points       │
├─────────────────────────────────────────────────┤
│  PromptSource implementations                   │
│  - Built-in: NpmPromptSource, GitHubPromptSource│
│  - Third-party: S3, REST API, etc.             │
│  - Each returns { filename, content } pairs     │
└─────────────────────────────────────────────────┘
```

**pupt-lib** is the engine. It accepts a `modules` array and processes it. It does not read config files.

**pupt CLI** and **pupt-react** are drivers. They manage their own configuration (`.pt-config.json` for the CLI, React props/state for pupt-react), build the modules array from that config, and pass it to pupt-lib.

### The PromptSource Interface

```typescript
interface PromptSource {
  getPrompts(): Promise<DiscoveredPrompt[]>;
}

interface DiscoveredPrompt {
  filename: string;   // e.g., "code-review.prompt"
  content: string;    // raw .prompt file source
}
```

All prompt sources — built-in and third-party — implement this interface. The built-in `NpmLocalPromptSource`, `NpmRegistryPromptSource`, `GitHubPromptSource`, and `LocalPromptSource` are the first implementations, proving the interface works before exposing it to third parties. Third-party sources implement the same interface and are distributed as npm packages.

### The Modules Array

The `modules` array passed to `Pupt` accepts three shapes:

```typescript
type ModuleEntry =
  | ResolvedModuleEntry             // explicit type + metadata (primary format)
  | PromptSource                    // self-resolving instance
  | { source: string; config: Record<string, unknown> };  // dynamic package load

interface ResolvedModuleEntry {
  name: string;                     // display name
  type: 'git' | 'npm' | 'local' | 'url';  // explicit source type
  source: string;                   // the source identifier
  promptDirs?: string[];            // override default 'prompts/' convention
  version?: string;                 // semver, commit hash, etc.
}

const pupt = new Pupt({
  modules: [
    // 1. ResolvedModuleEntry — explicit type routing (primary format)
    { name: 'pupt-sde', type: 'npm', source: 'pupt-sde' },
    { name: 'repo', type: 'git', source: 'https://github.com/user/repo' },
    { name: 'local-prompts', type: 'local', source: './local-prompts' },
    {
      name: 'team-prompts',
      type: 'git',
      source: 'https://github.com/team/prompts',
      promptDirs: ['prompts', 'advanced-prompts'],
      version: 'abc12345',
    },

    // 2. PromptSource instance — for programmatic use
    new S3PromptSource({ bucket: 'my-prompts', prefix: 'sde/' }),

    // 3. Package reference — for config-file-driven use
    { source: 'pupt-source-s3', config: { bucket: 'my-prompts' } },
  ],
});
```

**ResolvedModuleEntry** objects are the primary format. The explicit `type` field routes to the appropriate loader, `promptDirs` overrides the default `prompts/` convention, and `version` enables staleness and conflict detection. This is the bridge between pupt's library management and pupt-lib's module loading.

**PromptSource instances** are called directly — they already know how to get their prompts. This is the natural approach for programmatic use (pupt-react, application code).

**Package references** (`{ source, config }`) are dynamically loaded: pupt-lib does `import(source)`, instantiates the default export with `config`, and calls `getPrompts()`. This is the approach for config files where class instances can't be serialized.

### Config File Examples

#### pupt CLI — with installed libraries

When `pupt` uses `pt install` to manage libraries, it converts its `LibraryEntry[]` tracking format into `ResolvedModuleEntry[]` before passing to pupt-lib. This gives pupt-lib all the resolved metadata without pupt-lib needing to own install/tracking concerns:

```typescript
// pupt converts its libraries config into ResolvedModuleEntry[]
const modules: ModuleEntry[] = config.libraries.map(lib => ({
  name: lib.name,
  type: lib.type,              // 'git' | 'npm'
  source: lib.source,          // git URL or npm package name
  promptDirs: lib.promptDirs,  // e.g., ['prompts', 'advanced-prompts']
  version: lib.version,        // commit hash or semver
}));

const pupt = new Pupt({ modules });
```

#### pupt CLI — simple config (`.pt-config.json`)

```json
{
  "modules": [
    { "name": "pupt-sde", "type": "npm", "source": "pupt-sde" },
    { "name": "community-prompts", "type": "git", "source": "https://github.com/user/community-prompts", "version": "v2.0" },
    { "source": "pupt-source-s3", "config": { "bucket": "team-prompts", "region": "us-east-1" } }
  ]
}
```

The CLI reads this config and passes the `modules` array directly to `new Pupt({ modules })`.

#### pupt-react

```tsx
// Programmatic — source instances
<PuptLibraryProvider modules={[
  { name: 'pupt-sde', type: 'npm', source: 'pupt-sde' },
  new RestApiSource({ url: 'https://api.example.com/prompts' }),
]}>

// Or from config — package references
<PuptLibraryProvider modules={[
  { name: 'pupt-sde', type: 'npm', source: 'pupt-sde' },
  { source: 'pupt-source-rest', config: { url: 'https://api.example.com/prompts' } },
]}>
```

### Creating a Third-Party Source

A third-party source is an npm package that exports a class implementing `PromptSource`:

```typescript
// pupt-source-s3/index.ts
import type { PromptSource, DiscoveredPrompt } from 'pupt-lib';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

export default class S3PromptSource implements PromptSource {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(config: { bucket: string; prefix?: string; region?: string }) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? 'prompts/';
    this.client = new S3Client({ region: config.region ?? 'us-east-1' });
  }

  async getPrompts(): Promise<DiscoveredPrompt[]> {
    // List .prompt files in the bucket
    const list = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: this.prefix,
    }));

    const promptKeys = (list.Contents ?? [])
      .map(obj => obj.Key!)
      .filter(key => key.endsWith('.prompt'));

    // Fetch each file's content
    return Promise.all(promptKeys.map(async (key) => {
      const obj = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return {
        filename: key.split('/').pop()!,
        content: await obj.Body!.transformToString(),
      };
    }));
  }
}
```

Publish to npm. Consumers add it to their modules config. pupt-lib handles compilation, metadata extraction, and search indexing from there.

### Built-In Sources Use the Same Interface

The built-in sources (npm, GitHub, local) are `PromptSource` implementations — the same interface third-party sources implement. When the module loader encounters a string in the `modules` array, it instantiates the appropriate built-in `PromptSource` and calls `getPrompts()` on it, exactly as it would for a third-party source. See "Built-In PromptSource Implementations" above for details on each.

This means:
- The `PromptSource` interface is proven by real, production usage — not just a theoretical extension point
- There are no special code paths for built-in sources. The module loader processes all sources uniformly.
- If a built-in source doesn't meet a user's needs, they can replace it with a third-party source that handles the same string format, or use a `PromptSource` instance directly

## Integration Points

### pupt-lib

The `ModuleLoader.load()` method is extended to:
1. Process each entry in the `modules` array:
   - **String**: route to built-in `PromptSource` by format detection
   - **PromptSource instance**: call `getPrompts()` directly
   - **Package reference**: `import(source)`, instantiate with config, call `getPrompts()`
2. For each source, compile discovered `.prompt` files via `createPromptFromSource()`
3. If the source is an npm package with a JS entry point, also `import()` it for components
4. Return all discovered prompts and components in the `LoadedLibrary` result

The `Pupt` class does not change — it already consumes `LoadedLibrary` results from `ModuleLoader`.

### pupt CLI

The CLI reads `.pt-config.json`, builds the `modules` array (strings and package references), and passes it to `new Pupt({ modules })`.

The existing `promptDirs` config is replaced by `modules`. Local prompt directories that were previously in `promptDirs` become `LocalPromptSource` entries in the `modules` array:

```json
// Before (promptDirs)
{
  "promptDirs": [
    "${projectRoot}/.prompts",
    "node_modules/pupt/prompts"
  ]
}

// After (modules)
{
  "modules": [
    "${projectRoot}/.prompts",
    "pupt"
  ]
}
```

The CLI may still implicitly include `${projectRoot}/.prompts` as a default module entry (similar to how git always looks at `.gitignore`), so users don't need to configure it for the common case of local project prompts.

### pupt-react

No changes to the hook or provider API — `usePuptLibrary` already accepts a `modules` array and passes it to `Pupt`. The only change is that `modules` now accepts mixed types (strings, instances, package references) instead of only strings.

## Relationship to Original Design

The original pupt-lib design (documented in `design/docs/02-design-decisions.md` and `design/docs/08-module-loading.md`) envisioned modules as **compiled JS packages** that export `Component` subclasses and `PuptElement` objects. Prompts were authored as `.tsx` files and compiled before distribution.

This refactor **departs** from the original design in one key way:
- Prompts can now be raw `.prompt` files discovered from a conventional directory, compiled at runtime — no pre-compilation or JS exports required.

This refactor **aligns** with the original design in these ways:
- Components are still JS exports loaded via `import()`, discovered by scanning for `Component` subclasses
- Multiple source types are supported (npm, URL, GitHub, local)
- Module deduplication and caching still apply
- `peerDependencies` on `pupt-lib` remains the recommended pattern
- The `Pupt` API surface for consumers does not change

The original design also included a **scoped component registry** for namespacing. This was later replaced by the **import refactor** (`design/import-refactor-design.md`) which moved to real ES module `import()` with bare specifier rewriting — the system as it exists today. This refactor builds on the import-refactor approach, not the original registry approach.

## Documentation Updates

The following documentation in pupt-lib should be updated to reflect this design:

### Prompts vs. Components

Update `docs/MODULES.md` and `docs/modules/using-modules.md` to clearly explain the two distinct concepts:
- **Prompts**: authored as `.prompt` files, discovered from `prompts/` directories, compiled at runtime, searchable, no JS knowledge required. Loadable from npm packages, GitHub repos, local directories, and custom sources.
- **Components**: authored as `.ts`/`.tsx`, distributed as npm packages with JS entry points, loaded via `import()`, referenced in `.prompt` files via `<Uses>`. Require npm packaging and a build step.

This distinction should be front and center — it's the first thing a new user needs to understand about the module system.

### Default Prompt Sources

Document the built-in prompt sources and how string-based module entries are routed:
- Bare package name → `NpmLocalPromptSource` (falls back to `NpmRegistryPromptSource`)
- `github:` prefix → `GitHubPromptSource`
- `https://` URL → `NpmRegistryPromptSource` (CDN serving npm artifacts)
- Relative path → `LocalPromptSource`

Include the `prompts/` directory convention — packages that place `.prompt` files in `prompts/` at the package root are automatically discovered with no configuration.

### Creating Custom Prompt Sources

Add a new guide (e.g., `docs/developers/custom-sources.md` or a section in `docs/developers/creating-modules.md`) that covers:
- The `PromptSource` interface and `DiscoveredPrompt` type
- How to implement a custom source (with a concrete example like the S3 or REST API source)
- How to distribute a custom source as an npm package (default export convention)
- How consumers use custom sources: programmatically (passing instances) and via config files (package references with `{ source, config }`)
- That built-in sources implement the same interface — custom sources are first-class citizens, not second-class plugins

### Publishing Guide

Update `docs/modules/publishing.md` to reflect the simplified packaging for prompt-only packages:
- Minimal `package.json` (no `main`, no `exports`, no build step)
- The `prompts/` directory convention
- `peerDependencies` on `pupt-lib`
- How to publish a package that includes both prompts and components

## Migration Path for pupt-sde

1. Rename `src/prompts/` to `prompts/` (match convention)
2. Move `pupt-lib` from `dependencies` to `peerDependencies`
3. Update `"files"` in package.json to include `"prompts"`
4. Remove `"main": "index.js"` (no JS entry point needed)
5. Set `"type": "module"`
6. Publish — the package is now loadable by the refactored module loader
