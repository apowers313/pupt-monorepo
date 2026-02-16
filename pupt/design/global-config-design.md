# Global Configuration Design

## Problem Statement

Currently, pupt uses per-project `.pt-config.json` files discovered via cosmiconfig's directory traversal (from CWD up to `$HOME`). This creates several problems:

1. **Per-project config duplication**: Users must run `pt init` and maintain a `.pt-config.json` in every project. Tool preferences (`defaultCmd`, `environment`, etc.) are the same across projects but must be configured repeatedly.
2. **Per-project prompt installation**: `pt install` clones repos into `.git-prompts/` or installs npm packages into `node_modules/`, making prompts available only within that project. Prompt libraries should be shared across all projects.
3. **Scattered history**: History defaults to `.pthistory/` within each project. Reviewing prompt usage across projects is impossible without `--all-dir` and manual aggregation.
4. **AI tool interchangeability friction**: When switching between kiro-cli and claude across the same project, per-project config makes the tool selection sticky rather than flexible.

## Design Goals

- A single user-level config file that applies everywhere
- Prompts installed once and available in all projects
- History stored centrally, filtered by project/worktree by default
- Support all pupt-lib module source types: local files, npm packages, URLs, and GitHub sources
- Correct cross-platform paths (Linux, macOS, Windows)

## Non-Goals

- Project-level config overrides (may be added later, but not in this phase)
- Multi-user or team-shared configuration
- Remote/cloud sync of prompts or history
- Backward compatibility with per-project `.pt-config.json` (manual migration is fine)

---

## 1. Cross-Platform Directory Resolution

### Using `env-paths`

We use the [`env-paths`](https://github.com/sindresorhus/env-paths) library (by Sindre Sorhus, ~33M downloads, 1,247 dependents) to resolve OS-appropriate directories. This is the de facto standard approach used by pnpm and many other Node.js CLI tools.

```typescript
import envPaths from 'env-paths';
const paths = envPaths('pupt', { suffix: '' });
// paths.config, paths.data, paths.cache, paths.log, paths.temp
```

### Resolved Paths Per OS

| Directory | Linux | macOS | Windows |
|-----------|-------|-------|---------|
| **config** | `~/.config/pupt` | `~/Library/Preferences/pupt` | `%APPDATA%\pupt\Config` |
| **data** | `~/.local/share/pupt` | `~/Library/Application Support/pupt` | `%LOCALAPPDATA%\pupt\Data` |
| **cache** | `~/.cache/pupt` | `~/Library/Caches/pupt` | `%LOCALAPPDATA%\pupt\Cache` |
| **log** | `~/.local/state/pupt` | `~/Library/Logs/pupt` | `%LOCALAPPDATA%\pupt\Log` |
| **temp** | `/tmp/<user>/pupt` | `/var/folders/.../T/pupt` | `%LOCALAPPDATA%\Temp\pupt` |

On Linux, `env-paths` also respects the XDG environment variables (`$XDG_CONFIG_HOME`, `$XDG_DATA_HOME`, `$XDG_CACHE_HOME`, `$XDG_STATE_HOME`).

### Environment Variable Overrides

In addition to XDG variables (Linux only), pupt supports its own overrides that work on all platforms:

| Variable | Overrides | Default (Linux example) |
|----------|-----------|------------------------|
| `PUPT_CONFIG_DIR` | `paths.config` | `~/.config/pupt` |
| `PUPT_DATA_DIR` | `paths.data` | `~/.local/share/pupt` |
| `PUPT_CACHE_DIR` | `paths.cache` | `~/.cache/pupt` |

### Implementation

```typescript
import envPaths from 'env-paths';

const platformPaths = envPaths('pupt', { suffix: '' });

class ConfigManager {
  static getConfigDir(): string {
    return process.env.PUPT_CONFIG_DIR || platformPaths.config;
  }

  static getDataDir(): string {
    return process.env.PUPT_DATA_DIR || platformPaths.data;
  }

  static getCacheDir(): string {
    return process.env.PUPT_CACHE_DIR || platformPaths.cache;
  }

  static getConfigPath(): string {
    return path.join(this.getConfigDir(), 'config.json');
  }
}
```

---

## 2. Global Config File

### Location

`{configDir}/config.json` — resolved per-OS as described above.

### Full Directory Layout

```
{configDir}/
├── config.json              # Main configuration
└── config.json.backup       # Auto-created before schema migrations

{dataDir}/
├── prompts/                 # User's own prompt files
├── libraries/               # Installed prompt libraries
│   ├── team-prompts/        #   (git clones)
│   └── my-utils/            #   (git clones)
├── packages/                # npm package installs (managed node_modules)
│   ├── node_modules/        #   resolved packages
│   └── package.json         #   tracks installed packages
├── history/                 # All execution history
│   ├── 20250101-120000-a1b2c3d4.json
│   └── ...
└── output/                  # Captured command output
    ├── 20250101-120000-a1b2c3d4.json
    └── ...

{cacheDir}/
├── url/                     # Cached URL-fetched modules
│   ├── <hash>.js            #   cached module files
│   └── manifest.json        #   URL -> hash mapping with TTLs
└── github/                  # Cached GitHub-fetched modules
    ├── <hash>.js
    └── manifest.json
```

### Config Schema

```typescript
interface GlobalConfig {
  // --- Prompt Discovery ---
  promptDirs: string[];          // Default: ["{dataDir}/prompts"]
  libraries: LibraryEntry[];     // Installed libraries — see Section 4

  // --- History & Annotations ---
  historyDir: string;            // Default: "{dataDir}/history"
  annotationDir: string;         // Default: "{dataDir}/history"

  // --- Output Capture ---
  outputCapture: {
    enabled: boolean;            // Default: true
    directory: string;           // Default: "{dataDir}/output"
    maxSizeMB: number;           // Default: 50
    retentionDays: number;       // Default: 30
  };

  // --- Tool Configuration ---
  defaultCmd?: string;
  defaultCmdArgs?: string[];
  defaultCmdOptions?: Record<string, string>;
  autoReview: boolean;           // Default: true
  autoRun: boolean;              // Default: false

  // --- Environment ---
  environment?: EnvironmentConfig;

  // --- Template Helpers ---
  helpers?: Record<string, HelperConfig>;

  // --- Metadata ---
  version: string;               // Schema version for migrations
  logLevel?: string;
}
```

### Changes from Current Config

| Field | Current Default | New Default | Notes |
|-------|----------------|-------------|-------|
| `promptDirs` | `["./.prompts"]` (project-relative) | `["{dataDir}/prompts"]` | Global user prompts |
| `historyDir` | `"./.pthistory"` (project-relative) | `"{dataDir}/history"` | Centralized history |
| `annotationDir` | `"./.pthistory"` (project-relative) | `"{dataDir}/history"` | Co-located with history |
| `outputCapture.directory` | `".pt-output"` (project-relative) | `"{dataDir}/output"` | Centralized output |
| `outputCapture.enabled` | `false` | `true` | On by default |
| `gitPromptDir` | `".git-prompts"` | **Removed** | Replaced by global library management |
| `libraries` | `string[]` (npm package names) | `LibraryEntry[]` | Richer library metadata |

### Removed Fields

These fields are deleted with no migration path:

- `gitPromptDir` — replaced by global library directory
- `codingTool`, `codingToolArgs`, `codingToolOptions` — legacy, already deprecated
- `targetLlm` — legacy, already deprecated
- `${projectRoot}` path variable — no longer needed

---

## 3. pupt-lib Module Source Types

pupt-lib's `<Uses>` directive (and standard `import` in `.tsx` files) supports these source types. pupt must support all of them in a global context.

| Source Type | Example | Resolution Strategy |
|-------------|---------|-------------------|
| Local file (relative) | `from="./my-components"` | Relative to the `.prompt` file — works as-is |
| Local file (absolute) | `from="/home/user/libs/components"` | Absolute path — works as-is |
| npm package | `from="@acme/prompt-components"` | Resolved from global `{dataDir}/packages/node_modules/` |
| npm package + version | `from="@acme/prompt-components@1.2.0"` | Same as npm, version enforced by pupt-lib |
| Package subpath | `from="@acme/components/alerts"` | Same as npm, subpath resolved within package |
| URL | `from="https://cdn.example.com/components.js"` | Fetched and cached in `{cacheDir}/url/` |
| GitHub shorthand | `from="github:acme/components#v1.0.0"` | Resolved to raw.githubusercontent.com URL, cached in `{cacheDir}/github/` |

### How Each Source Type Works

**Local files** — No change needed. Relative paths resolve from the `.prompt` file's directory. Absolute paths resolve directly. Since prompts now live in `{dataDir}/prompts/`, relative imports between prompt files in that directory work naturally.

**npm packages** — See Section 5 (npm Package Management).

**URLs** — See Section 6 (URL and GitHub Caching).

**GitHub shorthand** — Resolved to a URL (`https://raw.githubusercontent.com/{user}/{repo}/{ref}/index.js`) and then handled by the URL caching system.

---

## 4. Library Management

Libraries are collections of `.prompt` files that pupt discovers and makes available via `pt run`. This is distinct from npm component packages (which are imported via `<Uses>` inside prompt files).

### LibraryEntry Schema

```typescript
interface LibraryEntry {
  name: string;           // Human-readable name (derived from repo name or user-specified)
  type: 'git';            // Source type (only git for now; npm prompt packages
                          //   are installed via the packages system in Section 5)
  source: string;         // Git URL
  promptDirs: string[];   // Prompt directories within the library (relative to library root)
  installedAt: string;    // ISO timestamp
  version?: string;       // Git commit hash at install time
}
```

### Example Config

```json
{
  "promptDirs": ["/home/user/.local/share/pupt/prompts"],
  "libraries": [
    {
      "name": "team-prompts",
      "type": "git",
      "source": "https://github.com/org/team-prompts.git",
      "promptDirs": ["prompts"],
      "installedAt": "2025-06-15T10:30:00Z",
      "version": "abc1234"
    }
  ]
}
```

### Library Storage

```
{dataDir}/libraries/
├── team-prompts/              # git clone of the library
│   ├── .pt-config.json        # library's own config (read for promptDirs)
│   ├── prompts/
│   │   ├── code-review.prompt
│   │   └── bug-report.prompt
│   └── ...
└── another-lib/
```

### Prompt Discovery with Libraries

`PuptService.init()` scans:

1. All directories in `config.promptDirs` (user's own prompts)
2. For each library in `config.libraries`, resolve `{dataDir}/libraries/{name}/{promptDir}` for each entry in the library's `promptDirs`

```typescript
async init(): Promise<void> {
  const allDirs: string[] = [...this.config.promptDirs];

  const dataDir = ConfigManager.getDataDir();
  for (const lib of this.config.libraries || []) {
    const libRoot = path.join(dataDir, 'libraries', lib.name);
    for (const pd of lib.promptDirs) {
      allDirs.push(path.join(libRoot, pd));
    }
  }

  for (const dir of allDirs) {
    if (await fs.pathExists(dir)) {
      const entries = await this.discoverPromptsInDir(dir, dir);
      allEntries.push(...entries);
    }
  }
}
```

### `pt install` (Git Libraries)

```
pt install https://github.com/org/team-prompts.git
pt install https://github.com/org/team-prompts.git --name my-team
```

Flow:

1. Validate source (git URL)
2. Determine library name (from `--name` flag, or extracted from URL)
3. Clone into `{dataDir}/libraries/{name}/` (shallow clone, `--depth 1`)
4. Read the library's `.pt-config.json` to discover `promptDirs`; fall back to `["prompts"]` if none
5. Add a `LibraryEntry` to the global config
6. Save global config

### `pt update`

```
pt update                    # Update all libraries
pt update team-prompts       # Update specific library
```

Flow:

1. `git pull` in the library directory
2. Update the `version` field with the new commit hash
3. Re-discover `promptDirs` if the library's config changed

### `pt uninstall`

```
pt uninstall team-prompts
```

Flow:

1. Remove the library directory from `{dataDir}/libraries/`
2. Remove the `LibraryEntry` from the global config

---

## 5. npm Package Management

### Two Roles of npm Packages

npm packages serve two distinct roles in pupt:

1. **Prompt packages** — Contain `.prompt` files that pupt discovers via `promptDirs`. Example: `@acme/prompts` with a `prompts/` directory of `.prompt` files.
2. **Component libraries** — Export components imported via `<Uses>` in prompt files. Example: `@acme/prompt-components` exporting `Callout`, `Summary`, etc.

Both roles are handled by the same npm install mechanism.

### Global Package Directory

Instead of installing into each project's `node_modules/`, pupt maintains its own package directory:

```
{dataDir}/packages/
├── package.json             # Tracks installed packages
└── node_modules/            # Standard npm resolution tree
    ├── @acme/
    │   ├── prompts/
    │   └── prompt-components/
    └── pupt-lib/            # Peer dep, shared instance
```

The `package.json` is managed by pupt (not the user). It tracks all installed prompt/component packages:

```json
{
  "private": true,
  "name": "pupt-packages",
  "description": "Managed by pupt — do not edit manually",
  "dependencies": {
    "@acme/prompts": "^1.0.0",
    "@acme/prompt-components": "^2.3.0",
    "pupt-lib": "^1.0.0"
  }
}
```

`pupt-lib` is always included as a dependency so it acts as the shared singleton for all component packages that declare it as a `peerDependency`.

### `pt install` (npm Packages)

```
pt install @acme/prompts
pt install @acme/prompt-components@2.3.0
```

Flow:

1. Detect that the source is an npm package name (existing `isNpmPackage()` logic)
2. Add the package to `{dataDir}/packages/package.json` as a dependency
3. Run `npm install` in `{dataDir}/packages/`
4. Check if the installed package contains prompt files:
   - Read the package's `.pt-config.json` for `promptDirs`
   - Or check for a `pupt.promptDirs` field in its `package.json`
   - Or check for a `prompts/` directory
5. If prompt dirs found, add them as an npm-type library entry:

```typescript
interface NpmLibraryEntry {
  name: string;           // Package name (e.g., "@acme/prompts")
  type: 'npm';
  source: string;         // npm package specifier (e.g., "@acme/prompts@^1.0.0")
  promptDirs: string[];   // Prompt directories within the package (relative to package root)
  installedAt: string;
  version: string;        // Installed version (e.g., "1.2.3")
}
```

Updated union type for libraries:

```typescript
type LibraryEntry = GitLibraryEntry | NpmLibraryEntry;

interface GitLibraryEntry {
  name: string;
  type: 'git';
  source: string;         // Git URL
  promptDirs: string[];
  installedAt: string;
  version?: string;       // Git commit hash
}

interface NpmLibraryEntry {
  name: string;
  type: 'npm';
  source: string;         // npm specifier
  promptDirs: string[];
  installedAt: string;
  version: string;        // Resolved semver version
}
```

### Module Resolution for `<Uses>` Imports

When pupt-lib's transformer encounters `from="@acme/prompt-components"`, it needs to resolve the package. Since packages are installed in `{dataDir}/packages/node_modules/` rather than the project's `node_modules/`, pupt must configure the resolution path.

**Approach**: Set `NODE_PATH` to include `{dataDir}/packages/node_modules/` before evaluating prompt code. This makes standard Node.js module resolution find packages installed in pupt's global directory.

```typescript
// In PuptService, before evaluating transformed code
const packagesNodeModules = path.join(ConfigManager.getDataDir(), 'packages', 'node_modules');

// Add to NODE_PATH if not already present
const existingNodePath = process.env.NODE_PATH || '';
const paths = existingNodePath.split(path.delimiter).filter(Boolean);
if (!paths.includes(packagesNodeModules)) {
  paths.push(packagesNodeModules);
  process.env.NODE_PATH = paths.join(path.delimiter);
  // Re-initialize module resolution paths
  require('module').Module._initPaths();
}
```

If pupt-lib's Transformer resolves imports at transform time (bundling them into the output), then pupt needs to pass the resolution path to the transformer instead. This would be a configuration option on the `Transformer` class:

```typescript
const transformer = new Transformer({
  resolve: {
    paths: [path.join(ConfigManager.getDataDir(), 'packages', 'node_modules')]
  }
});
```

The exact approach depends on how pupt-lib resolves `<Uses>` imports internally. If the transformer bundles imports at compile time, use the transformer option. If imports are resolved at runtime via Node.js module resolution, use `NODE_PATH`.

### `pt update` for npm Packages

```
pt update @acme/prompts      # Update specific package
pt update                    # Update all (git libraries + npm packages)
```

For npm packages:
1. Run `npm update @acme/prompts` in `{dataDir}/packages/`
2. Update the `version` field in the library entry

### `pt uninstall` for npm Packages

```
pt uninstall @acme/prompts
```

1. Run `npm uninstall @acme/prompts` in `{dataDir}/packages/`
2. Remove the `NpmLibraryEntry` from the global config

### Prompt Discovery for npm Packages

For npm packages with prompt directories, `PuptService.init()` resolves them from the global packages directory:

```typescript
for (const lib of this.config.libraries || []) {
  let libRoot: string;

  if (lib.type === 'git') {
    libRoot = path.join(dataDir, 'libraries', lib.name);
  } else if (lib.type === 'npm') {
    libRoot = path.join(dataDir, 'packages', 'node_modules', lib.name);
  }

  for (const pd of lib.promptDirs) {
    allDirs.push(path.join(libRoot, pd));
  }
}
```

---

## 6. URL and GitHub Caching

### When Caching Applies

pupt-lib supports importing components from URLs:

```xml
<Uses component="Badge" from="https://cdn.example.com/components/badge.js" />
<Uses component="Badge" from="https://esm.sh/@acme/prompt-components@1.0.0" />
<Uses component="Check" from="github:acme/components#v1.0.0" />
```

These URLs are fetched at render time by pupt-lib. pupt provides a caching layer so that:
- Repeated renders don't re-fetch the same URL
- Prompts work offline after the first fetch
- Render performance is not gated by network latency

### Cache Structure

```
{cacheDir}/
├── modules/
│   ├── <sha256-of-url>.js       # Cached module content
│   └── manifest.json            # URL -> cache entry mapping
```

### Manifest Format

```json
{
  "entries": {
    "https://cdn.example.com/components/badge.js": {
      "hash": "a1b2c3d4...",
      "fetchedAt": "2025-06-15T10:30:00Z",
      "etag": "\"abc123\"",
      "lastModified": "2025-06-14T00:00:00Z",
      "ttl": 86400
    },
    "https://raw.githubusercontent.com/acme/components/v1.0.0/index.js": {
      "hash": "e5f6g7h8...",
      "fetchedAt": "2025-06-15T10:30:00Z",
      "ttl": 604800
    }
  }
}
```

### TTL Strategy

| Source | Default TTL | Rationale |
|--------|------------|-----------|
| URL with version/tag in path | 7 days | Versioned URLs are effectively immutable |
| URL without version | 1 hour | May change frequently |
| GitHub with tag (`#v1.0.0`) | 7 days | Tags are immutable |
| GitHub with branch (`#main`) | 1 hour | Branches change |
| GitHub without ref | 1 hour | Defaults to `main` |

### Cache Operations

**On fetch** (called by pupt-lib, intercepted by pupt's cache layer):

1. Compute SHA-256 of the URL
2. Check manifest for a valid (non-expired) cache entry
3. If cached and fresh: return cached file path
4. If cached but stale: re-fetch with `If-None-Match` / `If-Modified-Since` headers
   - If 304 Not Modified: update `fetchedAt`, return cached file
   - If 200: write new file, update manifest
5. If not cached: fetch, write file, add to manifest

**Cache bypass**:

```
pt run my-prompt --no-cache    # Bypass cache for this run
pt cache clear                 # Clear all cached URL modules
pt cache clear --url <url>     # Clear specific cached URL
```

### Integration with pupt-lib

pupt-lib needs a hook or configuration to use pupt's cache when resolving URL imports. Two possible approaches:

**Option A: Custom fetch function** — pupt-lib accepts a custom `fetch` implementation that pupt wraps with caching logic:

```typescript
const cachedFetch = createCachedFetch(ConfigManager.getCacheDir());

await render(element, {
  fetch: cachedFetch
});
```

**Option B: Custom module resolver** — pupt-lib accepts a resolver that maps URLs to local file paths:

```typescript
await render(element, {
  resolveModule: async (specifier: string) => {
    if (specifier.startsWith('http://') || specifier.startsWith('https://')) {
      return cache.resolve(specifier); // Returns local file path
    }
    return specifier; // Pass through for other types
  }
});
```

The best approach depends on pupt-lib's architecture. Option A is simpler; Option B gives more control.

---

## 7. ConfigManager Changes

### Config Loading (New Behavior)

cosmiconfig directory traversal is removed. Config is loaded from a single known location.

```typescript
import envPaths from 'env-paths';

const platformPaths = envPaths('pupt', { suffix: '' });

class ConfigManager {
  static getConfigDir(): string {
    return process.env.PUPT_CONFIG_DIR || platformPaths.config;
  }

  static getDataDir(): string {
    return process.env.PUPT_DATA_DIR || platformPaths.data;
  }

  static getCacheDir(): string {
    return process.env.PUPT_CACHE_DIR || platformPaths.cache;
  }

  static getConfigPath(): string {
    return path.join(this.getConfigDir(), 'config.json');
  }

  static async load(): Promise<Config> {
    const configPath = this.getConfigPath();

    if (await fs.pathExists(configPath)) {
      const raw = await fs.readJson(configPath);
      this.validateConfig(raw);
      const migrated = await this.migrateConfig(raw, configPath);
      return this.expandPaths(migrated);
    }

    return this.getDefaultConfig();
  }

  static getDefaultConfig(): Config {
    const dataDir = this.getDataDir();
    return {
      promptDirs: [path.join(dataDir, 'prompts')],
      libraries: [],
      historyDir: path.join(dataDir, 'history'),
      annotationDir: path.join(dataDir, 'history'),
      outputCapture: {
        enabled: true,
        directory: path.join(dataDir, 'output'),
        maxSizeMB: 50,
        retentionDays: 30,
      },
      autoReview: true,
      autoRun: false,
      version: '8.0.0',
    };
  }
}
```

### What Gets Removed from ConfigManager

- `getExplorer()` and all cosmiconfig usage
- `checkForOldConfigFiles()` and `renameOldConfigFile()`
- `contractPaths()` — no longer needed since paths are always absolute/global
- `${projectRoot}` expansion in `expandPath()`
- `warnAboutNonPortablePaths()` — paths are always platform-resolved by `env-paths`

### What Stays

- `expandPath()` — still needed for `~` expansion in user-edited config values
- `validateConfig()` — still validates with Zod
- `migrateConfig()` — still handles schema version upgrades

---

## 8. `pt init` Changes

`pt init` creates the global config if it doesn't exist:

1. Check if `{configDir}/config.json` already exists; if so, offer to reconfigure
2. Create `{dataDir}/prompts/` directory
3. Detect installed AI tools and prompt for default tool selection
4. Save config to `{configDir}/config.json`
5. No `.gitignore` entries, no project-local directories

---

## 9. History Filtering

### Current Behavior (Preserved)

History is already filtered by `environment.git_dir` (the absolute path to the `.git` directory). The `EnhancedHistoryManager` already stores this metadata in each entry, and `listHistory()` already supports filtering. This works identically with centralized history — the filtering logic doesn't depend on where files are stored.

### Changes

1. **Default `historyDir`** points to `{dataDir}/history/` instead of `./.pthistory`
2. **`pt history` default behavior** stays the same: filter by current git directory
3. **`pt history --all-dir`** shows all history across all projects
4. **No per-directory history directories** — everything is in one place

---

## 10. What Gets Removed

- **cosmiconfig dependency** — no more directory traversal for config discovery
- **`.git-prompts/` directory** — replaced by `{dataDir}/libraries/`
- **Project-local `node_modules` dependency for prompts** — replaced by `{dataDir}/packages/`
- **Per-project `.gitignore` entries** — no project-local files to ignore
- **`${projectRoot}` path variable** — no longer needed
- **`contractPaths()`** — no longer needed
- **`gitPromptDir` config field** — removed
- **Legacy config fields** — `codingTool`, `codingToolArgs`, `codingToolOptions`, `targetLlm`

### What Stays

- **`environment.git_dir` in history entries** — needed for project filtering
- **`getGitInfo()` utility** — captures git context at execution time
- **Path expansion for `~`** — needed for user-edited config values

---

## 11. Implementation Plan

### Phase 1: Global Config Foundation

1. Add `env-paths` dependency
2. Add `getConfigDir()`, `getDataDir()`, `getCacheDir()`, `getConfigPath()` to `ConfigManager`
3. Create new default config with platform-resolved global paths
4. Update `ConfigManager.load()` to read from the global location (remove cosmiconfig)
5. Add `PUPT_CONFIG_DIR`, `PUPT_DATA_DIR`, `PUPT_CACHE_DIR` environment variable support
6. Update config schema to version 8.0.0
7. Remove `gitPromptDir`, `${projectRoot}`, `contractPaths()`, legacy fields
8. Rewrite `pt init` to create global config

### Phase 2: Library Management (Git)

1. Define `GitLibraryEntry` type
2. Rewrite `pt install` for global git library directory (`{dataDir}/libraries/`)
3. Add `pt update` command for git libraries
4. Add `pt uninstall` command
5. Update `PuptService.init()` to discover prompts from global libraries

### Phase 3: npm Package Management

1. Define `NpmLibraryEntry` type and unified `LibraryEntry` union
2. Implement global package directory (`{dataDir}/packages/`)
3. Add `pt install` support for npm packages (into global packages dir)
4. Configure module resolution (`NODE_PATH` or transformer option) so `<Uses>` can find globally-installed packages
5. Add `pt update` and `pt uninstall` support for npm packages
6. Update `PuptService.init()` to discover prompts from npm packages

### Phase 4: URL and GitHub Caching

1. Implement cache directory structure in `{cacheDir}/modules/`
2. Implement manifest-based cache with TTL strategy
3. Implement conditional re-fetch (ETag / If-Modified-Since)
4. Integrate cache with pupt-lib's URL module resolution (custom fetch or resolver)
5. Add `pt cache clear` command
6. Add `--no-cache` flag to `pt run`

### Phase 5: Cleanup

1. Remove cosmiconfig dependency entirely
2. Remove all per-project config code (old config file detection, renaming, etc.)
3. Update all tests
4. Update documentation

---

## 12. Open Questions

1. **How does pupt-lib resolve `<Uses>` imports internally?** The integration approach for npm packages (Section 5) and URL caching (Section 6) depends on whether pupt-lib resolves imports at transform time (bundling), at evaluation time (Node.js resolution), or provides hooks for custom resolution. This needs investigation to pick the right integration pattern.

2. **Should `pt install` auto-detect source type or require explicit flags?** Current design auto-detects (npm package name vs. git URL). This should be preserved but may need refinement for edge cases like GitHub shorthand (`github:user/repo`).

3. **Should there be a `pt list` enhancement to show installed libraries?** Currently `pt list` shows prompts. It could grow a `pt list --libraries` or `pt libraries` subcommand to show installed git/npm libraries with their status.

4. **What package manager should be used for the global packages directory?** The current codebase detects pnpm/yarn/npm per-project. For the global packages dir, we should pick one (npm is the safest default since it's always available with Node.js) and not try to detect.
