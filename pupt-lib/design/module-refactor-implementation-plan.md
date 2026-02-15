# Implementation Plan for Module Loading Refactor

## Overview

Refactor pupt-lib's module loading system so that packages can ship raw `.prompt` files in a conventional `prompts/` directory and have them automatically discovered, compiled, and searchable — with no build step required. The refactor introduces a `PromptSource` interface that all discovery backends (local filesystem, npm local, npm registry, GitHub) implement uniformly, and extends the `modules` array to accept PromptSource instances and dynamic package references alongside the existing string entries.

The existing `ModuleLoader` currently only handles pre-compiled JS modules via `import()`. This refactor adds a parallel prompt discovery path that scans for `.prompt` files and compiles them through the existing `createPromptFromSource()` pipeline, without changing any existing component-loading behavior.

## Phase Breakdown

### Phase 1: PromptSource Interface + LocalPromptSource + ModuleLoader Integration

**What this phase accomplishes**: The foundational MVP. Defines the `PromptSource` and `DiscoveredPromptFile` interfaces, implements `LocalPromptSource` to scan a directory for `.prompt` files, and wires prompt discovery into `ModuleLoader` so discovered files are compiled into `PuptElement`s. After this phase, a user can point to a local directory of `.prompt` files and have them automatically discovered, compiled, and rendered through the `Pupt` API.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/unit/services/prompt-source.test.ts`: Core interface and LocalPromptSource unit tests
  ```typescript
  describe('LocalPromptSource', () => {
    it('should discover .prompt files in a directory', async () => {
      const source = new LocalPromptSource('test/fixtures/prompt-packages/basic/prompts');
      const prompts = await source.getPrompts();
      expect(prompts).toHaveLength(2);
      expect(prompts[0].filename).toBe('greeting.prompt');
      expect(prompts[0].content).toContain('<Prompt');
    });

    it('should discover .prompt files in prompts/ subdirectory when given package root', async () => {
      const source = new LocalPromptSource('test/fixtures/prompt-packages/basic');
      const prompts = await source.getPrompts();
      expect(prompts).toHaveLength(2);
    });

    it('should return empty array for directory with no .prompt files', async () => {
      const source = new LocalPromptSource('test/fixtures/prompt-packages/empty');
      const prompts = await source.getPrompts();
      expect(prompts).toEqual([]);
    });

    it('should throw for non-existent directory', async () => {
      const source = new LocalPromptSource('/does/not/exist');
      await expect(source.getPrompts()).rejects.toThrow();
    });

    it('should ignore non-.prompt files in the directory', async () => {
      const source = new LocalPromptSource('test/fixtures/prompt-packages/mixed');
      const prompts = await source.getPrompts();
      expect(prompts.every(p => p.filename.endsWith('.prompt'))).toBe(true);
    });
  });
  ```

- `test/unit/services/module-loader.test.ts` (additions): Tests for the new prompt discovery path in ModuleLoader
  ```typescript
  describe('prompt discovery from PromptSource', () => {
    it('should compile discovered .prompt files into PuptElements', async () => {
      const library = await loader.load('./test/fixtures/prompt-packages/basic');
      expect(Object.keys(library.prompts)).toHaveLength(2);
      expect(library.prompts['greeting'].name).toBe('greeting');
    });

    it('should include both components and prompts from same source', async () => {
      // A package that has both dist/index.js and prompts/
      const library = await loader.load('./test/fixtures/prompt-packages/with-components');
      expect(Object.keys(library.components).length).toBeGreaterThan(0);
      expect(Object.keys(library.prompts).length).toBeGreaterThan(0);
    });
  });
  ```

- `test/integration/prompt-source-local.test.ts`: End-to-end integration test
  ```typescript
  describe('LocalPromptSource integration', () => {
    it('should discover, compile, and render a .prompt file from a local directory', async () => {
      const pupt = new Pupt({ modules: ['./test/fixtures/prompt-packages/basic'] });
      await pupt.init();
      const prompts = pupt.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);

      const result = await prompts[0].render();
      expect(result.success).toBe(true);
      expect(result.text.length).toBeGreaterThan(0);
    });
  });
  ```

**Implementation**:

- `src/types/prompt-source.ts`: New type definitions
  ```typescript
  /** A raw .prompt file discovered from a source */
  export interface DiscoveredPromptFile {
    filename: string;   // e.g., "code-review.prompt"
    content: string;    // raw .prompt file source
  }

  /** Interface for all prompt discovery backends */
  export interface PromptSource {
    getPrompts(): Promise<DiscoveredPromptFile[]>;
  }
  ```

- `src/services/prompt-sources/local-prompt-source.ts`: LocalPromptSource implementation
  - Constructor takes a path (relative or absolute)
  - `getPrompts()` checks if path contains `.prompt` files directly, or if it has a `prompts/` subdirectory
  - Uses `fs.readdir` + `fs.readFile` (dynamic imports for browser compat)
  - Returns `{ filename, content }` pairs for all `.prompt` files found

- `src/services/module-loader.ts`: Extend with prompt compilation
  - Add `prompts` field to `LoadedLibrary` interface: `prompts: Record<string, { element: PuptElement; id: string; name: string; description: string; tags: string[]; version?: string }>`
  - Note: `id` is a unique internal identifier assigned at load time (not from the `.prompt` file) — see Phase 5 for ID generation details. `version` is optional, extracted from the `<Prompt>` element's props when present.
  - Add private method `discoverAndCompilePrompts(source: PromptSource): Promise<Record<string, ...>>` that calls `source.getPrompts()` then runs each through `createPromptFromSource()`
  - Modify `loadLocal()` to additionally instantiate `LocalPromptSource` and compile any discovered `.prompt` files
  - Existing JS `import()` behavior is unchanged — prompts are additive

- `src/api.ts`: Update `discoverPrompts()` to also consume `library.prompts`
  - When iterating loaded libraries, create `DiscoveredPromptWithMethods` from compiled prompts in addition to the existing export-based detection

- `src/types/module.ts`: Update `PuptInitConfig` (preparation for Phase 2)
  - No change yet — `modules` remains `string[]` in this phase

- `src/index.ts`: Export new types
  - Export `PromptSource`, `DiscoveredPromptFile` from types
  - Export `LocalPromptSource` from services

**Test Fixtures to Create**:

- `test/fixtures/prompt-packages/basic/prompts/greeting.prompt`:
  ```xml
  <Prompt name="greeting" description="A simple greeting" tags={["test"]}>
    <Role>You are a friendly assistant.</Role>
    <Task>Greet the user warmly.</Task>
  </Prompt>
  ```
- `test/fixtures/prompt-packages/basic/prompts/review.prompt`:
  ```xml
  <Prompt name="code-review" description="Code review prompt" tags={["code", "test"]}>
    <Role>You are a senior code reviewer.</Role>
    <Task>Review the provided code for quality.</Task>
  </Prompt>
  ```
- `test/fixtures/prompt-packages/empty/prompts/` (empty directory)
- `test/fixtures/prompt-packages/mixed/prompts/` (contains `.prompt` files plus `.txt`, `.md` files that should be ignored)

**Dependencies**:
- External: None (uses Node.js built-in `fs/promises` and `path`)
- Internal: `createPromptFromSource()` (existing), `preprocessSource()` (existing)

**Verification**:
1. Run: `npm run test -- test/unit/services/prompt-source.test.ts test/integration/prompt-source-local.test.ts`
2. Expected: All tests pass — LocalPromptSource discovers `.prompt` files, ModuleLoader compiles them, Pupt API exposes them
3. Run: `npm run prompt` (interactive CLI)
4. Place a `.prompt` file in `./tmp/prompts/` and verify it appears in the CLI's prompt list and can be rendered

---

### Phase 2: NpmLocalPromptSource + ModuleEntry Polymorphism

**What this phase accomplishes**: Adds the ability to discover `.prompt` files from locally installed npm packages (in `node_modules/`) and extends the `modules` array to accept `PromptSource` instances and `{ source, config }` package references alongside strings. After this phase, a user can `npm install pupt-sde` and have its `prompts/` directory automatically discovered, and can also pass custom `PromptSource` instances programmatically.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/unit/services/npm-local-prompt-source.test.ts`: NpmLocalPromptSource tests
  ```typescript
  describe('NpmLocalPromptSource', () => {
    it('should discover .prompt files in node_modules/pkg/prompts/', async () => {
      // Uses a fixture symlinked or set up in node_modules for testing
      const source = new NpmLocalPromptSource('test-prompt-package');
      const prompts = await source.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].filename).toMatch(/\.prompt$/);
    });

    it('should return empty array for packages without prompts/ directory', async () => {
      const source = new NpmLocalPromptSource('vitest'); // real dep, no prompts/
      const prompts = await source.getPrompts();
      expect(prompts).toEqual([]);
    });

    it('should throw for packages that are not installed', async () => {
      const source = new NpmLocalPromptSource('non-existent-package-xyz');
      await expect(source.getPrompts()).rejects.toThrow();
    });
  });
  ```

- `test/unit/services/module-loader.test.ts` (additions): Tests for mixed ModuleEntry types
  ```typescript
  describe('ModuleEntry polymorphism', () => {
    it('should accept a PromptSource instance in the modules array', async () => {
      const mockSource: PromptSource = {
        async getPrompts() {
          return [{ filename: 'test.prompt', content: '<Prompt name="test"><Task>Do stuff</Task></Prompt>' }];
        },
      };
      const library = await loader.loadPromptSource(mockSource, 'custom-source');
      expect(Object.keys(library.prompts)).toContain('test');
    });

    it('should accept { source, config } package references', async () => {
      // Mock the dynamic import of the source package
      const library = await loader.loadPackageReference({
        source: './test/fixtures/prompt-sources/mock-source',
        config: { path: 'test/fixtures/prompt-packages/basic' },
      });
      expect(Object.keys(library.prompts).length).toBeGreaterThan(0);
    });
  });
  ```

- `test/unit/api.test.ts` (additions): Tests for mixed module types in Pupt
  ```typescript
  describe('Pupt with mixed module entries', () => {
    it('should accept PromptSource instances alongside strings', async () => {
      const mockSource: PromptSource = {
        async getPrompts() {
          return [{ filename: 'custom.prompt', content: '<Prompt name="custom"><Task>Test</Task></Prompt>' }];
        },
      };
      const pupt = new Pupt({ modules: [mockSource] });
      await pupt.init();
      expect(pupt.getPrompt('custom')).toBeDefined();
    });
  });
  ```

**Implementation**:

- `src/services/prompt-sources/npm-local-prompt-source.ts`: NpmLocalPromptSource
  - Constructor takes a package name (bare specifier like `"pupt-sde"`)
  - Resolves package to `node_modules/<package>/` using `import.meta.resolve()` or `createRequire().resolve()` (same pattern as module-evaluator.ts)
  - Reads `prompts/` subdirectory if it exists
  - Returns `{ filename, content }` pairs

- `src/services/prompt-sources/index.ts`: Barrel export for all prompt sources

- `src/types/module.ts`: Extend `PuptInitConfig`
  ```typescript
  export type ModuleEntry =
    | string                          // routed to built-in sources
    | PromptSource                    // self-resolving instance
    | { source: string; config: Record<string, unknown> };  // dynamic package load

  export interface PuptInitConfig {
    modules?: ModuleEntry[];
    searchConfig?: { ... };
  }
  ```

- `src/services/module-loader.ts`: Handle new entry types
  - Add `loadEntry(entry: ModuleEntry): Promise<LoadedLibrary>` that dispatches on type:
    - `string` → existing `load()` method (now also tries `NpmLocalPromptSource` for npm-type strings)
    - `PromptSource` → call `getPrompts()`, compile, return library
    - `{ source, config }` → `import(source)`, instantiate default export with config, call `getPrompts()`
  - Add `isPromptSource(value: unknown): value is PromptSource` type guard (duck-type: checks for `getPrompts` method)
  - Modify `loadNpm()` to additionally try `NpmLocalPromptSource` for the package

- `src/api.ts`: Update to use `loadEntry()` instead of `load()`
  - Change `discoverPrompts()` to iterate `ModuleEntry[]` and call `moduleLoader.loadEntry()` for each

- `src/index.ts`: Export new types and classes
  - Export `ModuleEntry`, `NpmLocalPromptSource`

**Test Fixtures to Create**:

- `test/fixtures/prompt-sources/mock-source.ts`: A mock PromptSource package for testing `{ source, config }` entries
  ```typescript
  import type { PromptSource, DiscoveredPromptFile } from 'pupt-lib';
  export default class MockSource implements PromptSource {
    constructor(private config: { path: string }) {}
    async getPrompts(): Promise<DiscoveredPromptFile[]> {
      // Read from config.path
    }
  }
  ```

- `test/fixtures/prompt-packages/npm-mock/`: A fake npm package structure with `package.json` and `prompts/` directory, used to test NpmLocalPromptSource resolution

**Dependencies**:
- External: None
- Internal: Phase 1 (PromptSource interface, LocalPromptSource, ModuleLoader prompt compilation)

**Verification**:
1. Run: `npm run test -- test/unit/services/npm-local-prompt-source.test.ts test/unit/services/module-loader.test.ts test/unit/api.test.ts`
2. Expected: All tests pass — npm packages with `prompts/` directories are discovered, mixed module entry types work
3. Manual: Create a minimal npm package in `tmp/test-pkg/` with a `prompts/` directory, `npm link` it, add it to modules, verify prompts are discovered via `npm run prompt`

---

### Phase 3: NpmRegistryPromptSource (Remote npm Packages)

**What this phase accomplishes**: Adds the ability to fetch npm packages directly from the registry without local installation, download their tarballs, and extract `.prompt` files from the `prompts/` directory. After this phase, a user can reference an npm package that isn't locally installed and still have its prompts discovered.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/unit/services/npm-registry-prompt-source.test.ts`: Unit tests with mocked HTTP
  ```typescript
  describe('NpmRegistryPromptSource', () => {
    // Uses MSW (Mock Service Worker) to mock npm registry API
    it('should fetch package metadata and download tarball', async () => {
      const source = new NpmRegistryPromptSource('mock-prompt-pkg@1.0.0');
      const prompts = await source.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].filename).toBe('greeting.prompt');
    });

    it('should handle packages with no prompts/ directory in tarball', async () => {
      const source = new NpmRegistryPromptSource('no-prompts-pkg@1.0.0');
      const prompts = await source.getPrompts();
      expect(prompts).toEqual([]);
    });

    it('should handle specific versions', async () => {
      const source = new NpmRegistryPromptSource('mock-prompt-pkg@2.0.0');
      const prompts = await source.getPrompts();
      // Version 2.0.0 has different prompts than 1.0.0
      expect(prompts[0].content).toContain('v2');
    });

    it('should resolve "latest" when no version specified', async () => {
      const source = new NpmRegistryPromptSource('mock-prompt-pkg');
      const prompts = await source.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('should throw on network errors with helpful message', async () => {
      const source = new NpmRegistryPromptSource('network-fail-pkg');
      await expect(source.getPrompts()).rejects.toThrow(/fetch.*failed/i);
    });
  });
  ```

- `test/integration/npm-registry-prompt-source.test.ts`: Integration test with MSW
  ```typescript
  describe('NpmRegistryPromptSource integration', () => {
    it('should discover, compile, and render prompts from a remote npm package', async () => {
      const source = new NpmRegistryPromptSource('mock-prompt-pkg@1.0.0');
      const pupt = new Pupt({ modules: [source] });
      await pupt.init();
      const prompts = pupt.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      const result = await prompts[0].render();
      expect(result.success).toBe(true);
    });
  });
  ```

**Implementation**:

- `src/services/prompt-sources/npm-registry-prompt-source.ts`: NpmRegistryPromptSource
  - Constructor takes a package specifier (e.g., `"pupt-sde"`, `"pupt-sde@1.2.0"`)
  - `getPrompts()` flow:
    1. Parse package name and version from specifier
    2. Fetch metadata: `GET https://registry.npmjs.org/<package>/<version>` (use `fetch()`)
    3. Get tarball URL from `response.dist.tarball`
    4. Download tarball as `ArrayBuffer`
    5. Decompress gzip → tar using a streaming approach
    6. Iterate tar entries, filter for `package/prompts/**/*.prompt`
    7. Extract content as UTF-8 strings
    8. Return `{ filename, content }` pairs
  - Supports custom registry URL (for enterprise npm registries)

- `src/services/prompt-sources/tar-utils.ts`: Tarball extraction utilities
  - `extractPromptFiles(tarballBuffer: ArrayBuffer): Promise<DiscoveredPromptFile[]>`
  - Uses a lightweight tar parser — the tar format is simple enough to parse manually for read-only extraction (512-byte headers, file data aligned to 512-byte blocks)
  - Alternatively, use the `pako` library for gzip decompression (works in both Node.js and browser) and a minimal tar reader
  - Filter entries matching `package/prompts/**/*.prompt` path pattern

- `src/services/module-loader.ts`: Update string routing
  - When `resolveSourceType()` returns `'npm'` and the package is not locally installed (the existing `loadNpm()` fails with module-not-found), fall back to `NpmRegistryPromptSource`
  - Add new method `loadNpmFromRegistry(source: string): Promise<LoadedLibrary>` as fallback

**Dependencies**:
- External: `pako` (gzip decompression, works in Node.js + browser) — or use Node.js built-in `zlib` with a browser polyfill decision
- Internal: Phase 1 (PromptSource interface), Phase 2 (ModuleEntry polymorphism)

**Library Assessment**:
- **Gzip decompression**: Consider `pako` (~45KB, mature, works in both Node.js and browser). Alternatively, use native `DecompressionStream` API (available in Node.js 18+ and modern browsers) to avoid the dependency entirely.
- **Tar parsing**: A custom minimal tar reader (< 100 lines) is sufficient since we only need read-only iteration of file entries. Full `tar` npm packages are Node.js-only and add unnecessary weight. The tar format header is a fixed 512-byte struct — parsing it is straightforward.

**Verification**:
1. Run: `npm run test -- test/unit/services/npm-registry-prompt-source.test.ts test/integration/npm-registry-prompt-source.test.ts`
2. Expected: All tests pass with MSW-mocked registry responses
3. Manual: If a real prompt package exists on npm, test loading it without installing: add `new NpmRegistryPromptSource('package-name')` to modules and verify prompts appear

---

### Phase 4: GitHubPromptSource + Error Isolation + Polish

**What this phase accomplishes**: Adds GitHub repository support for prompt discovery using the Git Trees API, implements source-level error isolation (failed sources are skipped with warnings instead of failing the entire load), and completes the full design with all four built-in sources working uniformly.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/unit/services/github-prompt-source.test.ts`: Unit tests with mocked GitHub API
  ```typescript
  describe('GitHubPromptSource', () => {
    it('should discover .prompt files using Git Trees API', async () => {
      const source = new GitHubPromptSource('user/repo');
      const prompts = await source.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      expect(prompts[0].filename).toBe('greeting.prompt');
    });

    it('should support ref (branch/tag)', async () => {
      const source = new GitHubPromptSource('user/repo', { ref: 'v1.0.0' });
      const prompts = await source.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('should default to main branch', async () => {
      const source = new GitHubPromptSource('user/repo');
      // Verify API call uses 'main' as default ref
      const prompts = await source.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('should return empty array for repos without prompts/ directory', async () => {
      const source = new GitHubPromptSource('user/no-prompts-repo');
      const prompts = await source.getPrompts();
      expect(prompts).toEqual([]);
    });

    it('should handle rate limiting gracefully', async () => {
      const source = new GitHubPromptSource('user/rate-limited-repo');
      await expect(source.getPrompts()).rejects.toThrow(/rate limit/i);
    });
  });
  ```

- `test/unit/services/module-loader-error-isolation.test.ts`: Error isolation tests
  ```typescript
  describe('ModuleLoader error isolation', () => {
    it('should skip failed sources and continue loading others', async () => {
      const failingSource: PromptSource = {
        async getPrompts() { throw new Error('S3 credentials expired'); },
      };
      const workingSource: PromptSource = {
        async getPrompts() {
          return [{ filename: 'test.prompt', content: '<Prompt name="ok"><Task>Works</Task></Prompt>' }];
        },
      };

      const pupt = new Pupt({ modules: [failingSource, workingSource] });
      await pupt.init();

      // Working source should still load despite the failing one
      expect(pupt.getPrompts()).toHaveLength(1);
      expect(pupt.getPrompt('ok')).toBeDefined();
    });

    it('should collect warnings from failed sources', async () => {
      const failingSource: PromptSource = {
        async getPrompts() { throw new Error('Network timeout'); },
      };

      const pupt = new Pupt({ modules: [failingSource] });
      await pupt.init();

      const warnings = pupt.getWarnings();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Network timeout');
    });

    it('should not fail entirely when one string module source fails', async () => {
      const pupt = new Pupt({
        modules: [
          'non-existent-package-xyz',
          './test/fixtures/prompt-packages/basic',
        ],
      });
      await pupt.init();
      expect(pupt.getPrompts().length).toBeGreaterThan(0);
    });
  });
  ```

- `test/integration/all-sources.test.ts`: Integration test verifying all source types work together
  ```typescript
  describe('all prompt sources together', () => {
    it('should load prompts from local, npm, and PromptSource instances simultaneously', async () => {
      const customSource: PromptSource = {
        async getPrompts() {
          return [{ filename: 'custom.prompt', content: '<Prompt name="custom"><Task>Custom</Task></Prompt>' }];
        },
      };

      const pupt = new Pupt({
        modules: [
          './test/fixtures/prompt-packages/basic',  // local
          customSource,                              // PromptSource instance
        ],
      });
      await pupt.init();

      const prompts = pupt.getPrompts();
      expect(prompts.length).toBeGreaterThanOrEqual(3); // 2 from local + 1 custom
    });
  });
  ```

**Implementation**:

- `src/services/prompt-sources/github-prompt-source.ts`: GitHubPromptSource
  - Constructor takes `owner/repo` and optional `{ ref, token }` config
  - `getPrompts()` flow:
    1. Call Git Trees API: `GET https://api.github.com/repos/{owner}/{repo}/git/trees/{ref}?recursive=1`
    2. Filter tree entries for paths matching `prompts/**/*.prompt` (type `"blob"`)
    3. Fetch each file: `GET https://raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}`
    4. Return `{ filename, content }` pairs
  - Supports optional GitHub token via constructor config (for private repos / rate limiting)
  - Uses `fetch()` for HTTP requests

- `src/services/module-loader.ts`: String routing for `github:` prefix
  - Update `loadGithub()` to additionally use `GitHubPromptSource` for `.prompt` file discovery alongside the existing `index.js` import approach (additive — both JS components and `.prompt` files can be loaded from the same GitHub repo)
  - Parse `github:user/repo#ref` format, pass to `GitHubPromptSource`

- `src/api.ts`: Error isolation and warnings
  - Add `private warnings: string[]` field to `Pupt`
  - In `discoverPrompts()`, wrap each module load in try/catch — on failure, push warning and continue
  - Add `getWarnings(): string[]` public method
  - Warnings include source identifier and error message

- `src/services/module-loader.ts`: Error wrapping improvements
  - `loadEntry()` no longer throws on individual source failures — returns a result with optional warnings
  - Or alternatively, the error isolation lives in `Pupt.discoverPrompts()` only (keeping `ModuleLoader.loadEntry()` as a pure operation that throws on failure — the caller decides how to handle it)

- `src/index.ts`: Export new classes
  - Export `GitHubPromptSource`
  - Export `getWarnings` type if needed

**Dependencies**:
- External: None (uses `fetch()` for GitHub API, available in Node.js 18+ and browsers)
- Internal: Phases 1-2 (PromptSource interface, ModuleLoader integration, ModuleEntry polymorphism)

**Verification**:
1. Run: `npm run test` (full test suite)
2. Expected: All tests pass, including error isolation scenarios
3. Run: `npm run lint && npm run build`
4. Expected: No lint errors, clean build
5. Manual (GitHub): If desired, test with a real public GitHub repo that contains a `prompts/` directory:
   ```typescript
   const pupt = new Pupt({ modules: ['github:your-user/your-repo'] });
   await pupt.init();
   console.log(pupt.getPrompts().map(p => p.name));
   ```
6. Manual (error isolation): Configure a modules array with one invalid and one valid source, verify the valid source loads and a warning is reported for the invalid one

---

### Phase 5: Metadata Completion, CDN URL Routing, and Deduplication

**What this phase accomplishes**: Fills remaining gaps in the prompt metadata model (unique IDs, version extraction), adds CDN URL routing so `https://` URLs are handled by `NpmRegistryPromptSource`, implements module deduplication so the same source isn't loaded twice, and adds explicit testing for prompt-only packages with minimal `package.json` (no `main` or `exports` fields). After this phase, all prompt metadata matches the design specification, duplicate module entries are silently deduplicated, and CDN URLs work as module entries.

**Duration**: 1-2 days

**Tests to Write First**:

- `test/unit/services/module-loader-metadata.test.ts`: Metadata completeness tests
  ```typescript
  describe('prompt metadata', () => {
    it('should assign a unique ID to each discovered prompt', async () => {
      const library = await loader.load('./test/fixtures/prompt-packages/basic');
      const prompts = Object.values(library.prompts);
      const ids = prompts.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length); // all unique
      expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    });

    it('should extract version from prompt metadata when present', async () => {
      const library = await loader.load('./test/fixtures/prompt-packages/versioned');
      expect(library.prompts['versioned-prompt'].version).toBe('1.2.0');
    });

    it('should set version to undefined when not specified in prompt', async () => {
      const library = await loader.load('./test/fixtures/prompt-packages/basic');
      const prompt = Object.values(library.prompts)[0];
      expect(prompt.version).toBeUndefined();
    });

    it('should allow multiple prompts with the same name across sources', async () => {
      const sourceA: PromptSource = {
        async getPrompts() {
          return [{ filename: 'a.prompt', content: '<Prompt name="review"><Task>Review A</Task></Prompt>' }];
        },
      };
      const sourceB: PromptSource = {
        async getPrompts() {
          return [{ filename: 'b.prompt', content: '<Prompt name="review"><Task>Review B</Task></Prompt>' }];
        },
      };
      const pupt = new Pupt({ modules: [sourceA, sourceB] });
      await pupt.init();
      const prompts = pupt.getPrompts();
      expect(prompts.filter(p => p.name === 'review')).toHaveLength(2);
      // Each should have a distinct ID
      const ids = prompts.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
  ```

- `test/unit/services/module-loader-dedup.test.ts`: Deduplication tests
  ```typescript
  describe('module deduplication', () => {
    it('should not load the same string module twice', async () => {
      const pupt = new Pupt({
        modules: [
          './test/fixtures/prompt-packages/basic',
          './test/fixtures/prompt-packages/basic', // duplicate
        ],
      });
      await pupt.init();
      // Should have 2 prompts (from basic), not 4
      expect(pupt.getPrompts()).toHaveLength(2);
    });

    it('should deduplicate equivalent relative paths', async () => {
      const pupt = new Pupt({
        modules: [
          './test/fixtures/prompt-packages/basic',
          'test/fixtures/prompt-packages/basic', // same path, different format
        ],
      });
      await pupt.init();
      expect(pupt.getPrompts()).toHaveLength(2);
    });

    it('should not deduplicate different sources that happen to share prompt names', async () => {
      const pupt = new Pupt({
        modules: [
          './test/fixtures/prompt-packages/basic',
          './test/fixtures/prompt-packages/alt-basic', // different source, same prompt names
        ],
      });
      await pupt.init();
      expect(pupt.getPrompts()).toHaveLength(4); // 2 from each
    });

    it('should not deduplicate PromptSource instances (no way to compare identity)', async () => {
      const makeSource = (): PromptSource => ({
        async getPrompts() {
          return [{ filename: 'test.prompt', content: '<Prompt name="test"><Task>Do stuff</Task></Prompt>' }];
        },
      });
      const pupt = new Pupt({ modules: [makeSource(), makeSource()] });
      await pupt.init();
      // Two distinct instances — both loaded, even though they return the same content
      expect(pupt.getPrompts()).toHaveLength(2);
    });
  });
  ```

- `test/unit/services/cdn-url-routing.test.ts`: CDN URL routing tests
  ```typescript
  describe('CDN URL routing', () => {
    // Uses MSW to mock CDN/registry responses
    it('should route https:// tarball URLs to NpmRegistryPromptSource', async () => {
      const pupt = new Pupt({
        modules: ['https://registry.npmjs.org/mock-prompt-pkg/-/mock-prompt-pkg-1.0.0.tgz'],
      });
      await pupt.init();
      expect(pupt.getPrompts().length).toBeGreaterThan(0);
    });

    it('should route CDN package URLs to NpmRegistryPromptSource', async () => {
      const pupt = new Pupt({
        modules: ['https://cdn.jsdelivr.net/npm/mock-prompt-pkg@1.0.0'],
      });
      await pupt.init();
      expect(pupt.getPrompts().length).toBeGreaterThan(0);
    });
  });
  ```

- `test/unit/services/prompt-only-package.test.ts`: Prompt-only package tests
  ```typescript
  describe('prompt-only package (no main/exports)', () => {
    it('should discover prompts from a package with no JS entry point', async () => {
      const source = new NpmLocalPromptSource('test-prompt-only-pkg');
      const prompts = await source.getPrompts();
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('should not fail when there is no JS entry point to import()', async () => {
      // Package has package.json with no main/exports, only prompts/
      const library = await loader.load('test-prompt-only-pkg');
      expect(Object.keys(library.components)).toHaveLength(0);
      expect(Object.keys(library.prompts).length).toBeGreaterThan(0);
    });
  });
  ```

**Implementation**:

- `src/services/module-loader.ts`: ID generation
  - In `discoverAndCompilePrompts()`, assign each compiled prompt a unique ID via `crypto.randomUUID()` (available in Node.js 19+ and modern browsers)
  - Fallback for older runtimes: generate an ID by hashing `sourceIdentifier + ':' + filename` (using a simple string hash, not crypto — uniqueness within a single load session is sufficient)
  - Extract `version` from compiled `PuptElement` props alongside `name`, `description`, and `tags`

- `src/services/module-loader.ts`: Deduplication
  - Add `private loadedSources: Set<string>` field to `ModuleLoader`
  - In `loadEntry()`, normalize the source identifier before loading:
    - **Strings**: resolve relative paths to absolute via `path.resolve()`, normalize package names to lowercase
    - **`{ source, config }` objects**: serialize `source + JSON.stringify(config)` as the key
    - **`PromptSource` instances**: skip deduplication (no reliable identity comparison for arbitrary objects)
  - If the normalized identifier is already in the set, skip loading and return an empty library
  - Add the identifier to the set after successful loading

- `src/services/module-loader.ts`: CDN URL routing
  - Update `resolveSourceType()` to detect `https://` URLs (in addition to existing `github:` prefix and relative path detection)
  - Route `https://` URLs to `NpmRegistryPromptSource`
  - If the URL ends in `.tgz`, treat it as a direct tarball URL
  - Otherwise, attempt to resolve it as a CDN package URL (fetch the URL, check for tarball redirect or metadata)

- `src/services/prompt-sources/npm-registry-prompt-source.ts`: Direct tarball URL support
  - Extend constructor to accept a full tarball URL (in addition to the existing `name@version` specifier)
  - If a tarball URL is provided, skip the metadata fetch step and download the tarball directly
  - Add a `static fromUrl(url: string): NpmRegistryPromptSource` factory for clarity

- `src/api.ts`: Prompt lookup by ID
  - Add `getPromptById(id: string)` method for precise lookup by unique ID
  - Clarify that `getPrompt(name)` is a convenience that returns the first match by name — for cases where multiple prompts share a name, use `searchPrompts()` or `getPrompts().filter()`

**Test Fixtures to Create**:

- `test/fixtures/prompt-packages/versioned/prompts/versioned.prompt`: A prompt with `version="1.2.0"` prop
- `test/fixtures/prompt-packages/alt-basic/prompts/greeting.prompt`: Different content but same `name` as basic's greeting (for dedup testing)
- `test/fixtures/prompt-packages/alt-basic/prompts/review.prompt`: Same pattern
- `test/fixtures/prompt-packages/prompt-only/package.json`: Minimal package.json with no `main` or `exports`
- `test/fixtures/prompt-packages/prompt-only/prompts/simple.prompt`: A simple prompt file

**Dependencies**:
- Internal: Phases 1-4 (all core infrastructure)

**Verification**:
1. Run: `npm run test -- test/unit/services/module-loader-metadata.test.ts test/unit/services/module-loader-dedup.test.ts test/unit/services/cdn-url-routing.test.ts test/unit/services/prompt-only-package.test.ts`
2. Expected: All tests pass — IDs are unique, versions extracted, duplicates skipped, CDN URLs routed correctly, prompt-only packages load without error
3. Run: `npm run lint && npm run build && npm run test`
4. Expected: Full suite passes with no regressions

---

### Phase 6: Integration Verification, Documentation, and Migration

**What this phase accomplishes**: Validates that pupt-lib's refactored API fully supports the pupt CLI and pupt-react integration points described in the design document. Adds integration-level tests that simulate real CLI and pupt-react usage patterns. Writes all documentation covering the new module system, creates a migration guide for existing packages (pupt-sde), and documents the `promptDirs` → `modules` migration path for CLI users.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/integration/cli-usage-patterns.test.ts`: Simulates pupt CLI usage
  ```typescript
  describe('CLI integration patterns', () => {
    it('should support a modules array mixing strings and package references', async () => {
      // Simulates what the CLI passes after reading .pt-config.json
      const modules: ModuleEntry[] = [
        './test/fixtures/prompt-packages/basic',
        { source: './test/fixtures/prompt-sources/mock-source', config: { path: 'test/fixtures/prompt-packages/basic' } },
      ];
      const pupt = new Pupt({ modules });
      await pupt.init();
      expect(pupt.getPrompts().length).toBeGreaterThan(0);
      expect(pupt.searchPrompts('greeting').length).toBeGreaterThan(0);
    });

    it('should support promptDirs-style local paths as module string entries', async () => {
      // Old promptDirs paths work identically as module entries
      const pupt = new Pupt({
        modules: ['./test/fixtures/prompt-packages/basic'],
      });
      await pupt.init();
      expect(pupt.getPrompts().length).toBeGreaterThan(0);
    });

    it('should expose searchPrompts() for CLI prompt discovery UI', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/prompt-packages/basic'],
      });
      await pupt.init();
      const results = pupt.searchPrompts('review');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should expose getWarnings() for CLI error display', async () => {
      const failingSource: PromptSource = {
        async getPrompts() { throw new Error('Source unavailable'); },
      };
      const pupt = new Pupt({ modules: [failingSource, './test/fixtures/prompt-packages/basic'] });
      await pupt.init();
      expect(pupt.getWarnings()).toHaveLength(1);
      expect(pupt.getPrompts().length).toBeGreaterThan(0); // working source still loaded
    });
  });
  ```

- `test/integration/react-usage-patterns.test.ts`: Simulates pupt-react usage
  ```typescript
  describe('pupt-react integration patterns', () => {
    it('should accept PromptSource instances in modules (programmatic usage)', async () => {
      const customSource: PromptSource = {
        async getPrompts() {
          return [{ filename: 'react-test.prompt', content: '<Prompt name="react-test"><Task>Test</Task></Prompt>' }];
        },
      };
      const pupt = new Pupt({ modules: ['./test/fixtures/prompt-packages/basic', customSource] });
      await pupt.init();
      const all = pupt.getPrompts();
      expect(all.find(p => p.name === 'react-test')).toBeDefined();
    });

    it('should accept package references in modules (config-driven usage)', async () => {
      const pupt = new Pupt({
        modules: [
          { source: './test/fixtures/prompt-sources/mock-source', config: { path: 'test/fixtures/prompt-packages/basic' } },
        ],
      });
      await pupt.init();
      expect(pupt.getPrompts().length).toBeGreaterThan(0);
    });

    it('should make prompts searchable by name, description, and tags', async () => {
      const pupt = new Pupt({
        modules: ['./test/fixtures/prompt-packages/basic'],
      });
      await pupt.init();
      // Search by tag
      expect(pupt.searchPrompts('test').length).toBeGreaterThan(0);
      // Search by description
      expect(pupt.searchPrompts('greeting').length).toBeGreaterThan(0);
    });
  });
  ```

**Implementation**:

No new pupt-lib runtime code is needed for CLI or pupt-react support — the API surface from Phases 1-5 covers all integration requirements. This phase validates that coverage with integration tests and writes documentation.

**Documentation to Write**:

- **`docs/modules/prompts-vs-components.md`** (or update existing `docs/MODULES.md`):
  - Explain the two distinct concepts: prompts (`.prompt` files, no JS required) vs components (`.ts`/`.tsx`, npm packages)
  - When to use each, how they interact
  - Example: prompt using a component via `<Uses>`
  - Emphasize that prompts require no build step and no JS knowledge

- **`docs/modules/prompt-sources.md`**:
  - How string module entries are routed to built-in sources
  - Table mapping string format → source type → discovery method (reproduce the design's summary table)
  - The `prompts/` directory convention
  - Error handling behavior (failed sources are skipped with warnings)

- **`docs/developers/custom-sources.md`**:
  - The `PromptSource` interface and `DiscoveredPromptFile` type
  - Step-by-step guide to implementing a custom source (use the S3 example from the design document)
  - Distributing a custom source as an npm package (default export convention)
  - Using custom sources: programmatically (passing instances) and via config files (`{ source, config }`)
  - Emphasize that built-in sources implement the same interface — custom sources are first-class

- **`docs/modules/publishing.md`** (update):
  - Minimal `package.json` for prompt-only packages (no `main`, no `exports`, no build step)
  - The `prompts/` directory convention
  - `peerDependencies` on `pupt-lib`
  - Package with both prompts and components
  - Include all three `package.json` examples from the design document

- **`docs/migration/pupt-sde-migration.md`**:
  - Step-by-step migration for pupt-sde:
    1. Rename `src/prompts/` to `prompts/` (match convention)
    2. Move `pupt-lib` from `dependencies` to `peerDependencies`
    3. Update `"files"` in package.json to include `"prompts"`
    4. Remove `"main": "index.js"` (no JS entry point needed)
    5. Set `"type": "module"`
    6. Publish
  - General migration guidance for other prompt packages following the same pattern

- **`docs/migration/promptdirs-to-modules.md`**:
  - Migration guide for pupt CLI users moving from `promptDirs` to `modules`
  - Before/after config examples (from the design document):
    ```json
    // Before (promptDirs)
    { "promptDirs": ["${projectRoot}/.prompts", "node_modules/pupt/prompts"] }

    // After (modules)
    { "modules": ["${projectRoot}/.prompts", "pupt"] }
    ```
  - Note that local paths work identically as module string entries
  - Note that the CLI may implicitly include the project-local `.prompts` directory as a default module entry

**Dependencies**:
- Internal: Phases 1-5 (all implementation complete)

**Verification**:
1. Run: `npm run test` (full suite including new integration tests)
2. Expected: All tests pass
3. Run: `npm run lint && npm run build`
4. Expected: Clean build, no lint errors
5. Review: All documentation accurately reflects the implemented behavior and matches the design document
6. Review: pupt-sde migration steps are correct and complete
7. Review: `promptDirs` → `modules` migration guide covers the transition clearly

---

## Consistency Notes

The following items were identified during a review of the full plan against the design document. They are not bugs but areas where the plan's details should be reconciled:

1. **`DiscoveredPromptFile` vs `DiscoveredPrompt` naming**: The design uses `DiscoveredPrompt` while Phase 1 defines the type as `DiscoveredPromptFile`. The `File` suffix is a deliberate clarification — these are raw file contents, not compiled prompts — and is the preferred name. The design's interface contract (same fields, same semantics) is preserved regardless of the name.

2. **`getPrompt(name)` and name uniqueness**: The design states that "multiple prompts can share the same `name` without conflict" — the `name` is display/search metadata, not a unique key. Some Phase 2 and Phase 4 tests use `pupt.getPrompt('name')` as a convenience lookup. Phase 5 adds `getPromptById(id)` for precise lookup by unique ID. The `getPrompt(name)` method should be documented as returning the first match by name, with `searchPrompts()` or `getPrompts().filter()` recommended when name collisions are possible.

3. **`LoadedLibrary.prompts` key**: In Phase 1, the prompts record is keyed by a string. With the addition of unique IDs in Phase 5, this key should be the prompt's unique `id`, not its `name`. The Phase 1 tests that access `library.prompts['greeting']` by name should be updated in Phase 5 to access by ID (or updated to use a helper method that looks up by name).

---

## Common Utilities Needed

- **`isPromptSource(value: unknown): value is PromptSource`**: Duck-type guard that checks for a `getPrompts` method. Used by `ModuleLoader.loadEntry()` to distinguish PromptSource instances from strings and package references. Defined in `src/types/prompt-source.ts`.

- **`parseGitHubSource(source: string): { owner: string; repo: string; ref?: string }`**: Extracts owner, repo, and optional ref from `github:user/repo#ref` strings. Used by both `ModuleLoader` (routing) and `GitHubPromptSource` (construction). Defined in `src/services/prompt-sources/github-prompt-source.ts` or a shared utils file.

- **`resolvePackagePath(packageName: string): Promise<string>`**: Resolves a bare package name to its filesystem path in `node_modules/`. Shared between `NpmLocalPromptSource` and `ModuleLoader`. Uses the same `import.meta.resolve()` / `createRequire().resolve()` pattern already in `module-evaluator.ts`. Consider extracting the resolution logic from `module-evaluator.ts` into a shared `src/services/resolve-utils.ts`.

- **Tarball extraction utilities** (`src/services/prompt-sources/tar-utils.ts`): Functions for decompressing gzip and iterating tar entries. Used only by `NpmRegistryPromptSource` but separated for testability. Implements minimal tar header parsing (512-byte records) and gzip decompression via `DecompressionStream` or `pako`.

- **`generatePromptId(sourceIdentifier: string, filename: string): string`**: Generates a unique internal ID for each discovered prompt. Uses `crypto.randomUUID()` where available, with a fallback to a deterministic hash of `sourceIdentifier + ':' + filename` for older runtimes. Defined in `src/services/module-loader.ts` (private utility) or extracted to `src/services/prompt-sources/id-utils.ts` if reuse is needed.

- **`normalizeSourceIdentifier(entry: ModuleEntry): string | null`**: Normalizes a module entry to a canonical string for deduplication. Resolves relative paths to absolute via `path.resolve()`, normalizes package names to lowercase, and serializes `{ source, config }` objects to a stable string. Returns `null` for `PromptSource` instances (cannot be deduplicated). Defined in `src/services/module-loader.ts`.

## External Libraries Assessment

| Need | Recommendation | Reason |
|------|----------------|--------|
| Gzip decompression (Phase 3) | Use native `DecompressionStream` API | Available in Node.js 18+ and all modern browsers. Avoids adding a dependency. Fall back to `pako` only if older runtime support is needed. |
| Tar parsing (Phase 3) | Custom minimal parser | The tar format is simple for read-only iteration (512-byte header blocks). A ~80-line utility is sufficient and avoids the `tar` npm package which is Node.js-only and heavyweight. |
| HTTP requests (Phases 3-4) | Native `fetch()` | Available in Node.js 18+ and browsers. Already used elsewhere in the codebase. No need for `node-fetch` or `axios`. |
| MSW (test mocking) | `msw` | Already used in existing `module-loader-integration.test.ts`. Continue using it for mocking npm registry and GitHub API responses. |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking existing ModuleLoader behavior** | The prompt discovery path is purely additive. Existing `import()`-based component loading is unchanged. The `LoadedLibrary` interface gets a new `prompts` field but existing fields remain. All existing tests must continue to pass at every phase. |
| **Tar parsing edge cases** | The custom tar parser only needs to handle npm-published tarballs, which follow a consistent format (gzipped tar, `package/` prefix). Test with real tarballs from npm. If edge cases arise, switch to a battle-tested library. |
| **GitHub API rate limiting** | `GitHubPromptSource` accepts an optional auth token. Without a token, the rate limit is 60 requests/hour. Document this limitation. Error isolation (Phase 4) ensures rate limiting doesn't break other sources. |
| **Browser compatibility for NpmRegistryPromptSource** | The tar/gzip utilities must work in both Node.js and browser. Using `DecompressionStream` + custom tar parser ensures cross-environment compatibility. Test in both environments. |
| **Circular dependency risk in PromptSource → createPromptFromSource** | `ModuleLoader` will call `createPromptFromSource()` to compile discovered `.prompt` files. This is a forward dependency (services → create-prompt), not circular. The `PromptSource` interface itself has no dependency on pupt-lib internals — it just returns raw strings. |
| **`PuptInitConfig.modules` type change** | Changing from `string[]` to `ModuleEntry[]` is a breaking change for TypeScript consumers. Mitigate by making `ModuleEntry` a union that includes `string`, so existing code compiles without changes. The runtime behavior for string entries is identical. |
| **Large tarballs consuming too much memory** | Stream tarball entries where possible instead of loading the entire tarball into memory. For MVP, in-memory extraction is acceptable since prompt packages are small (typically < 100KB). Add streaming in a future optimization pass if needed. |
| **CDN URL format variation** | Different CDNs use different URL formats (jsdelivr, unpkg, esm.sh). `NpmRegistryPromptSource` handles direct tarball URLs (`.tgz`) universally. For non-tarball CDN URLs, the source attempts to resolve to a tarball via registry metadata. CDN-specific file listing APIs (jsdelivr's tree API, unpkg's `?meta`) are a future optimization, not a Phase 5 requirement. |
| **Deduplication false positives** | Source identifier normalization must distinguish different versions of the same package — `pupt-sde@1.0.0` and `pupt-sde@2.0.0` must not be deduplicated. Normalize by resolved absolute path or `name@version`, not just bare package name. `PromptSource` instances are never deduplicated since there is no reliable way to compare arbitrary object identity. |
| **`getPrompt(name)` and non-unique names** | The design allows multiple prompts to share the same `name`. Phase 5 adds `getPromptById(id)` for precise lookup. `getPrompt(name)` remains as a convenience (returns first match) but should log a warning if multiple matches exist. `searchPrompts()` is the recommended API for name-based discovery. |
| **Documentation accuracy drift** | Phase 6 documentation is written after all implementation is complete, but code may evolve during later bug fixes or polish. Mitigate by writing docs that reference the `PromptSource` interface and `ModuleEntry` type definitions directly (so they stay in sync with code), and by including a verification step that cross-checks each doc section against the actual implementation. |
