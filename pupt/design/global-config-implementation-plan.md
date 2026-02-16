# Implementation Plan for Global Configuration

## Overview

Migrate pupt from per-project `.pt-config.json` files (discovered via cosmiconfig directory traversal) to a single global `config.json` file stored in OS-appropriate directories. This eliminates config duplication, centralizes prompt libraries and history, and uses `env-paths` for cross-platform directory resolution.

The implementation is divided into 5 phases, each independently testable and building on the previous phase without breaking it.

---

## Phase Breakdown

### Phase 1: Global Config Foundation (MVP)

**What this phase accomplishes:**
Point cosmiconfig at a single global config directory (`{configDir}/`) instead of traversing from CWD. After this phase, users run `pt init` once and have a working global config. All existing commands (`pt run`, `pt history`, etc.) work with the new config location. Cosmiconfig is retained for its multi-format support (JSON, YAML, JS) and to keep the door open for project-level overrides in the future.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/config/global-paths.test.ts`: Test cross-platform path resolution
  ```typescript
  describe('GlobalPaths', () => {
    it('should return platform-appropriate config dir');
    it('should respect PUPT_CONFIG_DIR env override');
    it('should respect PUPT_DATA_DIR env override');
    it('should respect PUPT_CACHE_DIR env override');
    it('should use env-paths defaults when no env vars set');
    it('should build config file path under config dir');
  });
  ```

- `test/config/config-manager.test.ts`: Update existing tests + add new global config tests
  ```typescript
  describe('ConfigManager - Global Config', () => {
    it('should load config from global config path');
    it('should return default config when no global config exists');
    it('should validate config with Zod schema');
    it('should migrate older config versions to 8.0.0');
    it('should create backup before migration');
    it('should expand ~ in user-edited paths');
    it('should use cosmiconfig to load from global config dir (not CWD traversal)');
    it('should support JSON, YAML, and JS config formats in global dir');
    it('should write default config with platform-resolved paths');
  });
  ```

- `test/config/migration-v8.test.ts`: Test migration from v7 to v8
  ```typescript
  describe('Migration v8', () => {
    it('should migrate v7 config to v8 format');
    it('should remove gitPromptDir field');
    it('should remove codingTool/codingToolArgs/codingToolOptions fields');
    it('should remove targetLlm field');
    it('should update default paths from relative to global');
    it('should set version to 8.0.0');
    it('should preserve user-configured values (defaultCmd, environment, etc.)');
  });
  ```

- `test/commands/init.test.ts`: Update existing tests for global init
  ```typescript
  describe('initCommand - Global', () => {
    it('should create config at global config path');
    it('should create {dataDir}/prompts/ directory');
    it('should not create project-local files');
    it('should not modify .gitignore');
    it('should detect installed AI tools');
    it('should offer reconfiguration if config already exists');
    it('should set outputCapture.enabled to true by default');
  });
  ```

**Implementation**:

1. `src/config/global-paths.ts`: New module for cross-platform directory resolution
   ```typescript
   import envPaths from 'env-paths';

   const platformPaths = envPaths('pupt', { suffix: '' });

   export function getConfigDir(): string {
     return process.env.PUPT_CONFIG_DIR || platformPaths.config;
   }
   export function getDataDir(): string {
     return process.env.PUPT_DATA_DIR || platformPaths.data;
   }
   export function getCacheDir(): string {
     return process.env.PUPT_CACHE_DIR || platformPaths.cache;
   }
   export function getConfigPath(): string {
     return path.join(getConfigDir(), 'config.json');
   }
   ```

2. `src/types/config.ts`: Update `Config` interface and `DEFAULT_CONFIG`
   - Remove `gitPromptDir`, `codingTool`, `codingToolArgs`, `codingToolOptions`, `targetLlm`
   - Change `libraries` type from `string[]` to `LibraryEntry[]` (empty array initially, full types in Phase 2)
   - Update `DEFAULT_CONFIG` to use global paths from `global-paths.ts`
   - Set `outputCapture.enabled` default to `true`
   - Set `version` to `'8.0.0'`

3. `src/schemas/config-schema.ts`: Update Zod schema
   - Remove `gitPromptDir`, `codingTool*`, `targetLlm` from `ConfigSchema`
   - Add `ConfigV8Schema` with the new shape
   - Update `ConfigFileSchema` union to include v8
   - Keep old schemas for migration validation

4. `src/config/config-manager.ts`: Update config loading
   - Update `getExplorer()` to point cosmiconfig at `getConfigDir()` instead of traversing from CWD
     - Set `searchPlaces` to look in the global config dir
     - Set `stopDir` to the global config dir (no traversal)
   - Remove `checkForOldConfigFiles()`, `renameOldConfigFile()`, `contractPaths()`
   - Remove `${projectRoot}` expansion from `expandPath()`
   - Keep `expandPath()` for `~` expansion
   - Keep `validateConfig()` and `migrateConfig()`
   - Update `loadWithPath()` to search from `getConfigDir()` instead of `process.cwd()`
   - Add static `save(config)` method for writing config back to disk

5. `src/config/migration.ts`: Add v8 migration
   - New migration that removes deprecated fields, updates paths to global defaults
   - Bumps version to `'8.0.0'`

6. `src/commands/init.ts`: Rewrite for global config
   - Create config at `getConfigPath()` instead of `process.cwd()/.pt-config.json`
   - Create `{dataDir}/prompts/` directory
   - Remove `.gitignore` management
   - Remove project-local directory prompts (historyDir, annotationDir as local paths)
   - Use global default paths for history and output capture

7. `src/cli.ts`: Remove `checkAndMigrateOldConfig()` call
   - Remove the old config file migration prompt at startup

8. `src/commands/config.ts`: Update to show global config info
   - Remove `--fix-paths` option (no longer relevant)
   - Show resolved global paths

**Dependencies**:
- External: `env-paths` (new npm dependency)
- Internal: None (this is the foundation)

**Removals in this phase**:
- CWD-based cosmiconfig traversal (cosmiconfig itself stays, pointed at global dir)
- `src/utils/path-utils.ts`: `contractPath()`, `warnAboutNonPortablePaths()`, `isNonPortableAbsolutePath()` — no longer needed
- `${projectRoot}` expansion from `expandPath()`

**Verification**:
1. Run: `PUPT_CONFIG_DIR=/tmp/pupt-test-config PUPT_DATA_DIR=/tmp/pupt-test-data pt init`
2. Expected: Config created at `/tmp/pupt-test-config/config.json`, prompts dir at `/tmp/pupt-test-data/prompts/`
3. Run: `PUPT_CONFIG_DIR=/tmp/pupt-test-config PUPT_DATA_DIR=/tmp/pupt-test-data pt config`
4. Expected: Shows global config with resolved paths, version 8.0.0
5. Run: `npm test`
6. Expected: All tests pass

---

### Phase 2: Centralized History & Output

**What this phase accomplishes:**
Move history and output capture to the global data directory. History is stored centrally but still filtered by git directory by default. After this phase, `pt history` works from any project and shows entries for the current git repo, while `pt history --all-dir` shows everything.

**Duration**: 1-2 days

**Tests to Write First**:

- `test/history/global-history.test.ts`: Test centralized history behavior
  ```typescript
  describe('Global History', () => {
    it('should save history to global data dir by default');
    it('should filter history by current git directory');
    it('should show all history with --all-dir flag');
    it('should save output capture files to global output dir');
    it('should respect outputCapture.maxSizeMB');
    it('should respect outputCapture.retentionDays');
  });
  ```

- `test/commands/history.test.ts`: Update existing history tests
  ```typescript
  describe('historyCommand - Global', () => {
    it('should load history from global history dir');
    it('should display entries filtered by current git repo');
    it('should display all entries with --all-dir');
  });
  ```

**Implementation**:

1. `src/history/history-manager.ts`: No structural changes needed
   - The constructor already accepts `historyDir` and `annotationDir` — just pass global paths
   - Verify `environment.git_dir` filtering works with centralized history

2. `src/services/output-capture-service.ts`: Update default output directory
   - Use `getDataDir()` for default output path resolution
   - Ensure output files are saved to `{dataDir}/output/`

3. `src/commands/history.ts`: Minimal changes
   - Verify history loading uses the global config's `historyDir`
   - The `--all-dir` flag already exists and works

4. `src/commands/run.ts`: Update output capture path defaults
   - Ensure run command uses global `outputCapture.directory`

5. Update any remaining places that construct `HistoryManager` to use global config paths

**Dependencies**:
- External: None
- Internal: Phase 1 (global config must be in place)

**Verification**:
1. Run: `pt init` (creates global config)
2. Create a test prompt, run: `pt run` from project A
3. Run: `pt run` from project B
4. From project A, run: `pt history` — should show only project A entries
5. Run: `pt history --all-dir` — should show entries from both projects
6. Check `{dataDir}/history/` contains history JSON files
7. Check `{dataDir}/output/` contains captured output files

---

### Phase 3: Git Library Management

**What this phase accomplishes:**
Rewrite `pt install` for git sources to use a global library directory (`{dataDir}/libraries/`). Add `pt update` and `pt uninstall` commands. After this phase, users can install prompt libraries once and use them from any project.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/config/library-entry.test.ts`: Test LibraryEntry types and validation
  ```typescript
  describe('LibraryEntry', () => {
    it('should validate a valid GitLibraryEntry');
    it('should reject entry with missing required fields');
    it('should validate promptDirs as array of strings');
  });
  ```

- `test/commands/install-git.test.ts`: Test global git library installation
  ```typescript
  describe('installCommand - Git (Global)', () => {
    it('should clone repo into {dataDir}/libraries/{name}/');
    it('should extract library name from URL');
    it('should support --name flag for custom name');
    it('should read .pt-config.json from cloned repo for promptDirs');
    it('should fall back to ["prompts"] if no config in repo');
    it('should add GitLibraryEntry to global config');
    it('should error if library name already exists');
    it('should use shallow clone (--depth 1)');
  });
  ```

- `test/commands/update.test.ts`: Test library update command
  ```typescript
  describe('updateCommand', () => {
    it('should git pull in library directory');
    it('should update version field with new commit hash');
    it('should update specific library by name');
    it('should update all libraries when no name given');
    it('should re-discover promptDirs if library config changed');
    it('should report error if library directory does not exist');
  });
  ```

- `test/commands/uninstall.test.ts`: Test library uninstall command
  ```typescript
  describe('uninstallCommand', () => {
    it('should remove library directory from {dataDir}/libraries/');
    it('should remove LibraryEntry from global config');
    it('should error if library name not found');
  });
  ```

- `test/services/pupt-service.test.ts`: Update prompt discovery tests
  ```typescript
  describe('PuptService - Library Discovery', () => {
    it('should discover prompts from user promptDirs');
    it('should discover prompts from git library promptDirs');
    it('should resolve library paths from {dataDir}/libraries/{name}/{promptDir}');
    it('should skip libraries with missing directories');
  });
  ```

**Implementation**:

1. `src/types/config.ts`: Add `LibraryEntry` types
   ```typescript
   export interface GitLibraryEntry {
     name: string;
     type: 'git';
     source: string;
     promptDirs: string[];
     installedAt: string;
     version?: string;
   }

   // For now, only git. NpmLibraryEntry added in Phase 4.
   export type LibraryEntry = GitLibraryEntry;
   ```

2. `src/schemas/config-schema.ts`: Add LibraryEntry schema
   ```typescript
   const GitLibraryEntrySchema = z.object({
     name: z.string(),
     type: z.literal('git'),
     source: z.string(),
     promptDirs: z.array(z.string()),
     installedAt: z.string(),
     version: z.string().optional(),
   });
   const LibraryEntrySchema = GitLibraryEntrySchema;
   ```
   Update `ConfigSchema` to use `z.array(LibraryEntrySchema)` for `libraries`.

3. `src/commands/install.ts`: Rewrite git installation
   - Clone to `{dataDir}/libraries/{name}/` instead of `.git-prompts/{name}/`
   - Read cloned repo's `.pt-config.json` for `promptDirs` (use cosmiconfig pointed at clone dir, or simple `fs.readJson`)
   - Add `GitLibraryEntry` to global config's `libraries` array
   - Save config via `ConfigManager.save()`
   - Remove `.gitignore` management

4. `src/commands/update.ts`: New command
   - `pt update [name]` — `git pull` in library directory, update version hash
   - If no name: iterate all libraries of type `'git'` and update each
   - Re-read library config to detect `promptDirs` changes

5. `src/commands/uninstall.ts`: New command
   - `pt uninstall <name>` — remove directory and config entry
   - Confirm with user before deleting

6. `src/services/pupt-service.ts`: Update prompt discovery
   - Update `PuptServiceConfig` to accept `libraries: LibraryEntry[]`
   - In `init()`, resolve library prompt dirs:
     - For git: `{dataDir}/libraries/{name}/{promptDir}`
   - Scan all resolved dirs for `.prompt` files

7. `src/cli.ts`: Register new commands
   - Add `update` and `uninstall` commands
   - Update `install` command description

**Dependencies**:
- External: `simple-git` (already a dependency)
- Internal: Phase 1 (global config, `ConfigManager.save()`)

**Verification**:
1. Run: `pt install https://github.com/<some-public-prompts-repo>.git`
2. Expected: Clone appears in `{dataDir}/libraries/`, library entry appears in `config.json`
3. Run: `pt` or `pt run` — prompts from installed library should appear in search
4. Run: `pt update` — should pull latest changes
5. Run: `pt uninstall <library-name>` — should remove library
6. Verify: `pt config` shows the library entries

---

### Phase 4: npm Package Management

**What this phase accomplishes:**
Support installing npm packages into a global packages directory (`{dataDir}/packages/`). npm packages can provide prompt files (discovered like libraries) and/or component libraries (imported via `<Uses>` in prompts). After this phase, `pt install @acme/prompts` works without requiring a project `package.json`.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/commands/install-npm.test.ts`: Test global npm package installation
  ```typescript
  describe('installCommand - npm (Global)', () => {
    it('should create {dataDir}/packages/package.json if not exists');
    it('should add package to {dataDir}/packages/package.json dependencies');
    it('should run npm install in {dataDir}/packages/');
    it('should always include pupt-lib as a dependency');
    it('should detect prompt dirs from package .pt-config.json');
    it('should detect prompt dirs from package.json pupt.promptDirs field');
    it('should fall back to checking for prompts/ directory');
    it('should add NpmLibraryEntry to global config when prompts found');
    it('should not add library entry for pure component packages');
    it('should not require project-local package.json');
  });
  ```

- `test/commands/update-npm.test.ts`: Test npm package updates
  ```typescript
  describe('updateCommand - npm', () => {
    it('should run npm update for specific package');
    it('should update version in library entry');
    it('should update all npm packages when no name given');
  });
  ```

- `test/commands/uninstall-npm.test.ts`: Test npm package uninstall
  ```typescript
  describe('uninstallCommand - npm', () => {
    it('should run npm uninstall in packages dir');
    it('should remove NpmLibraryEntry from config');
  });
  ```

- `test/services/pupt-service-npm.test.ts`: Test npm prompt discovery
  ```typescript
  describe('PuptService - npm Package Discovery', () => {
    it('should discover prompts from npm package promptDirs');
    it('should resolve paths from {dataDir}/packages/node_modules/{name}/{promptDir}');
  });
  ```

- `test/config/module-resolution.test.ts`: Test NODE_PATH setup
  ```typescript
  describe('Module Resolution', () => {
    it('should add packages/node_modules to NODE_PATH');
    it('should not duplicate NODE_PATH entries');
    it('should preserve existing NODE_PATH entries');
  });
  ```

**Implementation**:

1. `src/types/config.ts`: Add `NpmLibraryEntry` and update union
   ```typescript
   export interface NpmLibraryEntry {
     name: string;
     type: 'npm';
     source: string;
     promptDirs: string[];
     installedAt: string;
     version: string;
   }
   export type LibraryEntry = GitLibraryEntry | NpmLibraryEntry;
   ```

2. `src/schemas/config-schema.ts`: Add NpmLibraryEntry schema
   ```typescript
   const NpmLibraryEntrySchema = z.object({
     name: z.string(),
     type: z.literal('npm'),
     source: z.string(),
     promptDirs: z.array(z.string()),
     installedAt: z.string(),
     version: z.string(),
   });
   const LibraryEntrySchema = z.discriminatedUnion('type', [
     GitLibraryEntrySchema,
     NpmLibraryEntrySchema,
   ]);
   ```

3. `src/services/package-manager.ts`: New module for global npm package management
   ```typescript
   export class GlobalPackageManager {
     private packagesDir: string;

     constructor(dataDir: string) {
       this.packagesDir = path.join(dataDir, 'packages');
     }

     async ensureInitialized(): Promise<void>;  // Create package.json if missing
     async install(packageSpec: string): Promise<InstalledPackageInfo>;
     async update(packageName?: string): Promise<void>;
     async uninstall(packageName: string): Promise<void>;
     async getInstalledVersion(packageName: string): Promise<string | null>;
     async detectPromptDirs(packageName: string): Promise<string[]>;
   }
   ```

4. `src/commands/install.ts`: Update npm installation flow
   - Remove `isNpmProject()` check — no longer needed
   - Remove `detectPackageManager()` — always use npm in global dir
   - Use `GlobalPackageManager` for installation
   - Add `NpmLibraryEntry` to config if prompts found

5. `src/commands/update.ts`: Add npm update support
   - If library type is `'npm'`, use `GlobalPackageManager.update()`

6. `src/commands/uninstall.ts`: Add npm uninstall support
   - If library type is `'npm'`, use `GlobalPackageManager.uninstall()`

7. `src/services/pupt-service.ts`: Update discovery for npm libraries
   - For npm libraries, resolve paths from `{dataDir}/packages/node_modules/{name}/{promptDir}`

8. `src/services/module-resolution.ts`: New module for NODE_PATH configuration
   ```typescript
   export function configureModuleResolution(dataDir: string): void {
     const packagesNodeModules = path.join(dataDir, 'packages', 'node_modules');
     const existing = process.env.NODE_PATH || '';
     const paths = existing.split(path.delimiter).filter(Boolean);
     if (!paths.includes(packagesNodeModules)) {
       paths.push(packagesNodeModules);
       process.env.NODE_PATH = paths.join(path.delimiter);
     }
   }
   ```
   Call this early in `cli.ts` and in `PuptService.init()` before evaluating prompts.

**Dependencies**:
- External: `execa` (already a dependency, for running `npm install`)
- Internal: Phase 1 (global paths), Phase 3 (LibraryEntry types, update/uninstall commands)

**Verification**:
1. Run: `pt install <some-npm-prompt-package>` (or create a test package locally)
2. Expected: Package installed in `{dataDir}/packages/node_modules/`, entry in config
3. Run: `pt` — prompts from npm package appear in search
4. Create a prompt that uses `<Uses component="Foo" from="@acme/components" />` — verify it resolves from global packages
5. Run: `pt update @acme/prompts` — should update the package
6. Run: `pt uninstall @acme/prompts` — should remove it

---

### Phase 5: URL/GitHub Caching & Cleanup

**What this phase accomplishes:**
Add a caching layer for URL and GitHub `<Uses>` imports so prompts work offline after first fetch. Also remove remaining legacy code paths: old config file detection, `contractPaths()`, `path-utils.ts` dead code, etc. After this phase, the migration is complete.

**Duration**: 2-3 days

**Tests to Write First**:

- `test/services/module-cache.test.ts`: Test URL/GitHub caching
  ```typescript
  describe('ModuleCache', () => {
    it('should cache fetched URL content to {cacheDir}/modules/');
    it('should compute SHA-256 hash of URL for filename');
    it('should return cached content when not expired');
    it('should re-fetch when TTL expired');
    it('should use 7-day TTL for versioned URLs');
    it('should use 1-hour TTL for unversioned URLs');
    it('should support conditional fetch with ETag/If-Modified-Since');
    it('should return cached content on 304 Not Modified');
    it('should handle network errors gracefully when cache exists');
    it('should resolve GitHub shorthand to raw.githubusercontent.com URL');
    it('should persist manifest.json with cache metadata');
  });
  ```

- `test/commands/cache.test.ts`: Test cache management command
  ```typescript
  describe('cacheCommand', () => {
    it('should clear all cached modules with pt cache clear');
    it('should clear specific URL with pt cache clear --url <url>');
    it('should show cache statistics');
  });
  ```

- `test/services/pupt-service-nocache.test.ts`: Test --no-cache flag
  ```typescript
  describe('PuptService - Cache Bypass', () => {
    it('should bypass cache when --no-cache flag is set');
    it('should still update cache even when bypassed');
  });
  ```

**Implementation**:

1. `src/services/module-cache.ts`: New caching service
   ```typescript
   interface CacheManifestEntry {
     hash: string;
     fetchedAt: string;
     etag?: string;
     lastModified?: string;
     ttl: number;
   }

   interface CacheManifest {
     entries: Record<string, CacheManifestEntry>;
   }

   export class ModuleCache {
     constructor(private cacheDir: string);

     async resolve(url: string, options?: { noCache?: boolean }): Promise<string>;
     async clear(url?: string): Promise<void>;
     async getStats(): Promise<{ entryCount: number; totalSizeMB: number }>;

     private computeTtl(url: string): number;
     private isVersionedUrl(url: string): boolean;
     private resolveGitHubShorthand(specifier: string): string;
   }
   ```

2. `src/commands/cache.ts`: New cache management command
   - `pt cache clear` — clear all cached modules
   - `pt cache clear --url <url>` — clear specific URL
   - `pt cache` — show cache statistics (entry count, total size)

3. `src/cli.ts`: Register cache command, add `--no-cache` global option
   - Add `cache` command with subcommands
   - Add `--no-cache` option to `pt run`

4. Integration with pupt-lib: Configure URL resolution
   - Depends on pupt-lib's resolution mechanism (custom fetch or resolver)
   - If pupt-lib supports custom fetch: wrap with `ModuleCache`
   - If pupt-lib supports custom resolver: map URLs to cached local paths
   - Pass through `PuptService` render options

5. **Cleanup tasks** (removing legacy code):

   - Remove `src/utils/path-utils.ts` exports: `contractPath()`, `warnAboutNonPortablePaths()`, `isNonPortableAbsolutePath()` (or remove the file entirely if nothing else uses it)
   - Remove `ConfigManager.checkForOldConfigFiles()` and `ConfigManager.renameOldConfigFile()` (if not already removed in Phase 1)
   - Remove `ConfigManager.contractPaths()` (if not already removed in Phase 1)
   - Remove `${projectRoot}` handling from `ConfigManager.expandPath()` (if not already removed in Phase 1)
   - Remove `checkAndMigrateOldConfig()` from `cli.ts` (if not already removed in Phase 1)
   - Remove `ConfigV1Schema`, `ConfigV2Schema` from schema if no longer needed for migration
   - Remove `install.ts` functions: `isNpmProject()`, `detectPackageManager()`, `PACKAGE_MANAGER_CONFIGS` (replaced by GlobalPackageManager in Phase 4)
   - Remove `--fix-paths` option from `pt config` command
   - Update `src/utils/gitignore.ts` — remove exports no longer called (`addToGitignore`, `isGitRepository` if unused elsewhere)
   - Update all tests to use global config patterns
   - Remove test helpers that create per-project configs

**Dependencies**:
- External: None new (use Node.js built-in `fetch` for HTTP requests, `crypto` for SHA-256)
- Internal: Phase 1 (global paths), pupt-lib URL resolution hooks

**Verification**:
1. Create a prompt with `<Uses component="Badge" from="https://some-cdn.com/badge.js" />`
2. Run: `pt run` — should fetch and cache the module
3. Disconnect network (or use `--no-cache` to verify): run again — should use cache
4. Run: `pt cache` — should show 1 cached entry
5. Run: `pt cache clear` — should clear the cache
6. Run: `npm run check` — lint, build, and all tests pass

---

## Common Utilities Needed

- **`src/config/global-paths.ts`**: Centralized path resolution using `env-paths`. Used by ConfigManager, HistoryManager, ModuleCache, GlobalPackageManager, and CLI commands. Created in Phase 1, used in all subsequent phases.

- **`ConfigManager.save(config)`**: Static method to write config back to disk at the global config path. Created in Phase 1, used by install/update/uninstall commands.

- **Library config reader**: A function to read `.pt-config.json` or `package.json` from an installed library/package to discover its `promptDirs`. Used by install commands for both git and npm sources. Can use cosmiconfig pointed at the library directory (preserving multi-format support) or a simpler `fs.readJson` + validation since we know exactly which files to look for.

---

## External Libraries Assessment

| Task | Library | Rationale |
|------|---------|-----------|
| Cross-platform directory resolution | `env-paths` | De facto standard (~33M downloads), used by pnpm. Respects XDG on Linux, uses proper macOS/Windows paths. Small, no dependencies. |
| Git operations | `simple-git` | Already a dependency. Used for clone/pull in library management. |
| npm package installation | `execa` + `npm` CLI | Already a dependency. Run `npm install`/`update`/`uninstall` in the global packages directory. Using npm CLI directly is simpler than programmatic npm APIs. |
| Config file loading | `cosmiconfig` | Already a dependency. Retained for multi-format support (JSON, YAML, JS) and potential future project-level overrides. Pointed at global config dir instead of CWD traversal. |
| HTTP fetching for URL cache | Node.js built-in `fetch` | Available in Node 18+. No additional dependency needed for URL module caching. |
| SHA-256 hashing | Node.js built-in `crypto` | For computing cache file names from URLs. |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking existing users' workflows** | Phase 1 includes v7→v8 migration that preserves user values (defaultCmd, environment, etc.). The migration only runs when the old config is loaded. Users can manually copy their `.pt-config.json` values to the new global location. |
| **History data loss during migration** | History files are not moved automatically — old history remains in place. The design document explicitly states "manual migration is fine." We can add a `pt migrate` command later if needed, but it's not in scope. |
| **`env-paths` platform behavior differences** | All path resolution is centralized in `global-paths.ts` with env variable overrides (`PUPT_CONFIG_DIR`, etc.). Tests use env overrides to point at temp directories, making them platform-independent. |
| **npm install failures in global packages dir** | The `GlobalPackageManager` creates `package.json` with `"private": true` to prevent accidental publishing. Error messages include recovery steps. The packages dir is isolated from user projects. |
| **pupt-lib URL resolution integration uncertainty** | The design notes this as an open question. Phase 5 implementation will investigate pupt-lib's actual resolution mechanism. The `ModuleCache` is designed to support both custom fetch and custom resolver patterns. If pupt-lib doesn't expose hooks, we can file an issue on pupt-lib to add support. |
| **Tests becoming slow due to git clone/npm install** | Integration tests for install commands should mock `simple-git` and `execa` (as existing tests already do). Only a small number of end-to-end tests should use real git/npm operations. |
| **Config file corruption** | ConfigManager creates a `.backup` file before any migration (existing behavior, preserved). The `save()` method writes atomically via `fs.writeJson()` which uses `fs-extra`'s safe write semantics. |
| **Module cache growing unbounded** | Cache entries have TTLs. A future enhancement could add `outputCapture`-style `retentionDays` / `maxSizeMB` to the cache config. For now, `pt cache clear` provides manual cleanup. |
