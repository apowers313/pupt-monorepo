# pupt-monorepo Design

## Overview

This document describes the plan for consolidating four independent pupt repositories into a single monorepo (`pupt-monorepo`), following the same patterns and scaffolding as `graphty-monorepo`.

### Repositories Being Merged

| Repo | Current npm Name | New npm Name | Version | Description | Build |
|------|-----------------|-------------|---------|-------------|-------|
| `pupt` | `pupt` | `@pupt/cli` | 2.2.1 | CLI tool (`pt` binary) for managing AI prompts | tsc |
| `pupt-lib` | `pupt-lib` | `@pupt/lib` | 1.3.7 | TypeScript library for creating prompts with JSX syntax | vite |
| `pupt-react` | `pupt-react` | `@pupt/react` | 1.1.2 | Headless React component library for pupt-lib | vite |
| `pupt-sde` | `pupt-sde` | `@pupt/sde` | 1.0.0 | Software development prompt collection | none |

### Dependency Graph

```
@pupt/lib (foundation, no pupt dependencies)
  ↑
  ├── @pupt/cli   (production dependency on @pupt/lib)
  ├── @pupt/react (peer dependency on @pupt/lib + react)
  └── @pupt/sde   (peer dependency on @pupt/lib)
```

Build order: `@pupt/lib` → `@pupt/cli`, `@pupt/react`, `@pupt/sde` (parallel)

---

## Decisions Made

### 1. Package Naming: `@pupt` scope

**Decision:** Use `@pupt/` scope for all packages. A `pupt` GitHub organization will be created.

| Current | New | Directory |
|---------|-----|-----------|
| `pupt` | `@pupt/cli` | `pupt/` |
| `pupt-lib` | `@pupt/lib` | `pupt-lib/` |
| `pupt-react` | `@pupt/react` | `pupt-react/` |
| `pupt-sde` | `@pupt/sde` | `pupt-sde/` |

**Migration for consumers:** The old unscoped package names should publish a final version that re-exports from the `@pupt/*` scoped packages, with a deprecation notice pointing users to the new names.

**GitHub:** Repository will be at `pupt/pupt-monorepo` (under the new pupt org).

### 2. Git History: Subtree merge with `git-filter-repo`

**Decision:** Use `git-filter-repo` to rewrite each repo's history into its subdirectory, then merge into the monorepo with `--allow-unrelated-histories`. This preserves full `git log`, `git blame`, etc. without needing `--follow`.

This is the same approach used by graphty-monorepo (see `graphty-monorepo/design/monorepo/nx-monorepo-implementation-plan.md` Phase 3). See **"Git History Deep Dive"** section below for full analysis, failure modes, and safeguards.

**Critical:** History must be merged BEFORE files exist in the target directories. If files already exist, git treats them as separate lineages.

### 3. Uncommitted Files: Copy into monorepo without committing

**Decision:** After importing committed history from each repo, copy all uncommitted/untracked files from the working trees of the original repos into the monorepo. These files remain uncommitted in the monorepo working tree, preserving your in-progress work.

### 4. Default Branch: `master`

**Decision:** Use `master` as the default branch (matching graphty-monorepo convention).

### 5. pupt-sde design/ Directory: Keep as-is

The large `design/` directory with sample prompts stays in `pupt-sde/design/`. Can be moved to a submodule later if it becomes a problem.

---

## Monorepo Structure

Following graphty-monorepo's flat layout (packages at root level):

```
pupt-monorepo/
├── pupt/                    # @pupt/cli (CLI tool)
│   ├── src/
│   ├── test/
│   ├── prompts/
│   ├── package.json
│   ├── project.json         # Nx project config
│   ├── tsconfig.json        # Extends ../tsconfig.base.json
│   ├── vitest.config.ts
│   └── CLAUDE.md
├── pupt-lib/                # @pupt/lib (core JSX prompt library)
│   ├── src/
│   ├── components/
│   ├── test/
│   ├── package.json
│   ├── project.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── CLAUDE.md
├── pupt-react/              # @pupt/react (React component library)
│   ├── src/
│   ├── demo/
│   ├── test/
│   ├── package.json
│   ├── project.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── CLAUDE.md
├── pupt-sde/                # @pupt/sde (SDE prompt collection)
│   ├── prompts/
│   ├── test/
│   ├── design/
│   ├── package.json
│   ├── project.json
│   └── vitest.config.mjs
├── design/                  # Monorepo-level design documents
│   └── pupt-monorepo-design.md
├── tools/                   # Build scripts
│   ├── preserve-git-history.sh
│   ├── merge-coverage.sh
│   └── prepush.sh
├── .github/workflows/       # CI/CD
│   ├── ci.yml
│   └── release.yml
├── .husky/                  # Git hooks
│   ├── commit-msg
│   └── pre-push
├── package.json             # Root workspace config
├── pnpm-workspace.yaml      # pnpm workspace definition
├── pnpm-lock.yaml
├── nx.json                  # Nx build orchestration
├── tsconfig.base.json       # Shared TypeScript config
├── eslint.config.js         # Shared ESLint config
├── vitest.shared.config.ts  # Shared Vitest config factory
├── commitlint.config.js     # Commitlint config
├── knip.config.ts           # Dead code detection
├── CLAUDE.md                # Root-level Claude Code guidance
└── README.md
```

---

## Tool Stack (Matching graphty-monorepo)

| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager | Switch from npm; use `workspace:*` protocol for inter-package deps |
| **Nx** | Build orchestration | Task caching, dependency-aware builds, `nx affected` for PRs |
| **Vite** | Build system | pupt-lib and pupt-react already use vite; pupt uses tsc (keep tsc for CLI) |
| **Vitest** | Test framework | Already used by all repos |
| **ESLint** | Linting | Unified flat config at root |
| **TypeScript** | Type checking | Shared base tsconfig with project references |
| **Husky** | Git hooks | commit-msg (commitlint) + pre-push (lint + test) |
| **Commitlint** | Commit messages | Conventional commits with package scope enforcement |
| **Knip** | Dead code detection | Workspace-aware configuration |
| **Prettier** | Formatting | Shared config at root |
| **Nx Release** | Publishing | Independent versioning with conventional commits |

---

## Configuration Details

### Root package.json

```jsonc
{
  "name": "pupt-monorepo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "PUPT monorepo - Powerful Universal Prompt Tool ecosystem",
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "build": "pnpm exec nx run-many --target=build",
    "test": "pnpm exec nx run-many --target=test",
    "lint": "pnpm exec nx run-many --target=lint",
    "typecheck": "pnpm exec nx run-many --target=typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint:knip": "knip",
    "coverage": "pnpm -r run coverage && ./tools/merge-coverage.sh",
    "prepush": "NX_DAEMON=false pnpm exec nx affected -t build lint test --base=origin/master --head=HEAD --parallel=3",
    "prepare": "husky"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### pnpm-workspace.yaml

```yaml
packages:
  - "pupt"
  - "pupt-lib"
  - "pupt-react"
  - "pupt-sde"
```

### nx.json

```jsonc
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "master",
  "release": {
    "projects": ["*"],
    "projectsRelationship": "independent",
    "releaseTagPattern": "{projectName}@{version}",
    "version": {
      "conventionalCommits": true,
      "fallbackCurrentVersionResolver": "disk",
      "generatorOptions": {
        "updateDependents": "auto",
        "preserveLocalDependencyProtocols": true
      }
    },
    "changelog": {
      "automaticFromRef": true,
      "projectChangelogs": {
        "createRelease": "github",
        "file": "CHANGELOG.md",
        "renderOptions": {
          "authors": true,
          "commitReferences": true,
          "versionTitleDate": true
        }
      }
    },
    "git": {
      "commit": true,
      "tag": true,
      "commitMessage": "chore(release): publish {projectName} v{version} [skip ci]",
      "commitArgs": "--no-verify"
    }
  },
  "plugins": [
    {
      "plugin": "@nx/vite/plugin",
      "options": {
        "buildTargetName": "vite:build",
        "testTargetName": "vite:test"
      }
    }
  ],
  "parallel": 3,
  "cacheDirectory": ".nx/cache",
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "outputs": ["{projectRoot}/dist"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/vitest.shared.config.ts"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/eslint.config.js"],
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/vitest.config.ts",
      "!{projectRoot}/eslint.config.js",
      "!{projectRoot}/**/*.md"
    ],
    "sharedGlobals": [
      "{workspaceRoot}/tsconfig.base.json",
      "{workspaceRoot}/eslint.config.js"
    ]
  }
}
```

### tsconfig.base.json

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  },
  "exclude": ["node_modules", "tmp", "dist", ".nx"]
}
```

Each package's `tsconfig.json` extends this base and adds package-specific settings:
- `pupt`: `rootDir: "./src"`, `outDir: "./dist"`, `composite: true`
- `pupt-lib`: `jsx: "react-jsx"`, `jsxImportSource: "@pupt/lib"`, paths aliases, `composite: true`
- `pupt-react`: `jsx: "react-jsx"`, `lib: ["ES2022", "DOM", "DOM.Iterable"]`, `composite: true`
- `pupt-sde`: No tsconfig needed (no TypeScript source)

TypeScript project references:
- `pupt/tsconfig.json` → references `pupt-lib`
- `pupt-react/tsconfig.json` → references `pupt-lib`

### Inter-Package Dependencies

In the monorepo, replace npm registry versions with workspace protocol:

```jsonc
// pupt/package.json (name: "@pupt/cli")
{
  "dependencies": {
    "@pupt/lib": "workspace:*"
  }
}

// pupt-react/package.json (name: "@pupt/react")
{
  "peerDependencies": {
    "@pupt/lib": "workspace:*"
  },
  "devDependencies": {
    "@pupt/lib": "workspace:*"
  }
}

// pupt-sde/package.json (name: "@pupt/sde")
{
  "peerDependencies": {
    "@pupt/lib": "workspace:*"
  }
}
```

### Unified ESLint Config

The root `eslint.config.js` will combine the rules from all repos into a single flat config:
- Use `@eslint/js` + `typescript-eslint` (like graphty-monorepo)
- Include React rules only for `pupt-react/**/*.{ts,tsx}` files
- Include JSX-related rules for `pupt-lib/components/**/*.tsx` files
- Relax rules for test files (same pattern as graphty-monorepo)
- Use Prettier for formatting (not `@stylistic`, matching graphty pattern)

### Shared Vitest Config

`vitest.shared.config.ts` following graphty-monorepo pattern:

```typescript
import { defineConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

export interface VitestConfigOptions {
  projectName: string;
  setupFiles?: string[];
}

export function createVitestConfig(options: VitestConfigOptions): UserConfig {
  return defineConfig({
    test: {
      globals: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html", "lcov"],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 75,
          statements: 80,
        },
      },
      reporters: ["default"],
      testTimeout: 30000,
    },
  });
}
```

Each package keeps its own `vitest.config.ts` with package-specific settings (browser tests, pool options, etc.) while using the shared defaults. Note: `pupt` has higher coverage thresholds (90/85/90/90) which it should retain.

### Commitlint

```javascript
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "pupt",
        "pupt-lib",
        "pupt-react",
        "pupt-sde",
        "deps",
        "release",
        "ci",
        "docs",
        "tools",
        "workspace",
      ],
    ],
  },
};
```

### Port Assignments

Following the server config constraint (ports 9000-9099):

| Package | Dev Server | Coverage Preview |
|---------|-----------|-----------------|
| pupt-lib | 9000 | 9051 |
| pupt | 9010 | 9052 |
| pupt-react | 9020 | 9053 |
| pupt-react demo | 9025 | - |
| pupt-sde | - | - |

---

## Per-Package project.json (Nx)

Each package gets a `project.json` with Nx targets. Example for `pupt-lib`:

```jsonc
{
  "name": "pupt-lib",
  "$schema": "../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "pupt-lib/src",
  "projectType": "library",
  "tags": [],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "outputs": ["{projectRoot}/dist"],
      "options": {
        "command": "npm run build",
        "cwd": "pupt-lib"
      },
      "dependsOn": ["^build"]
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "npm run test",
        "cwd": "pupt-lib"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint && tsc --noEmit",
        "cwd": "pupt-lib"
      }
    }
  }
}
```

---

## CI/CD Pipeline

### ci.yml

Following graphty-monorepo pattern:

1. **lint-pr** - Validate PR title against commitlint
2. **build** - Build all packages (or `nx affected` for PRs), upload dist artifacts
3. **test** - Parallel test shards:
   - `pupt` (node tests)
   - `pupt-lib-node` (node tests)
   - `pupt-lib-browser` (Playwright browser tests)
   - `pupt-react` (browser tests)
   - `pupt-sde` (integration tests)
4. **lint** - ESLint + typecheck + knip

### release.yml

Triggered after CI succeeds on master:
1. Download build artifacts from CI
2. Run `pnpm exec nx release --yes` for independent versioning
3. Publish to npm with OIDC trusted publishing under `@pupt` scope

---

## Migration Plan

### Phase 0: Preparation (Before Any Cutover)

These steps create the monorepo scaffold while original repos are still active.

#### 0.1 Create monorepo root configs

- Initialize `pupt-monorepo` as a git repo with `master` branch
- Create root `package.json`, `pnpm-workspace.yaml`, `nx.json`
- Create `tsconfig.base.json`, `eslint.config.js`, `vitest.shared.config.ts`
- Create `commitlint.config.js`, `knip.config.ts`
- Set up `.husky/` hooks (commit-msg + pre-push)
- Set up `.github/workflows/` (ci.yml + release.yml)
- Set up `tools/` scripts

#### 0.2 Create the `@pupt` npm org

- Create the `pupt` org on npmjs.com
- Configure OIDC trusted publishing for the monorepo GitHub repo
- Reserve the `@pupt/cli`, `@pupt/lib`, `@pupt/react`, `@pupt/sde` package names

#### 0.3 Create the `pupt` GitHub org

- Create the `pupt` org on GitHub
- Create the `pupt-monorepo` repo under it

### Phase 1: Import Git History

Following the approach from `graphty-monorepo/design/monorepo/nx-monorepo-implementation-plan.md` Phase 3.

**Prerequisites:** `pip install git-filter-repo`

**Critical sequence (DO NOT deviate):**
1. The monorepo must have ONLY the root scaffold committed (no package directories)
2. Run `preserve-git-history.sh` to merge all 4 histories
3. Run `verify-history.sh` to confirm history is properly linked
4. ONLY after verification passes, proceed to Phase 2+

See the **"Git History Deep Dive"** section for full explanation of why this order matters and what happens if it's violated.

```bash
#!/bin/bash
# tools/preserve-git-history.sh
set -e

echo "============================================================"
echo "  Preserving Git History for pupt-monorepo"
echo "============================================================"

# Package configuration - using local paths since repos are siblings
declare -A PACKAGE_PATHS
PACKAGE_PATHS["pupt"]="../pupt"
PACKAGE_PATHS["pupt-lib"]="../pupt-lib"
PACKAGE_PATHS["pupt-react"]="../pupt-react"
PACKAGE_PATHS["pupt-sde"]="../pupt-sde"

# All repos use master
DEFAULT_BRANCH="master"

# Order: pupt-lib first (foundation), then dependents
PACKAGES=("pupt-lib" "pupt" "pupt-react" "pupt-sde")
MONOREPO_DIR="$(pwd)"

# Verify we have git-filter-repo
if ! command -v git-filter-repo &> /dev/null; then
    echo "FATAL: git-filter-repo not found. Install with: pip install git-filter-repo"
    exit 1
fi

# CRITICAL SAFEGUARD: Verify package directories DON'T exist yet
echo ""
echo "Pre-flight check: verifying no package directories have files..."
for pkg in "${PACKAGES[@]}"; do
  if [ -d "$pkg" ] && [ "$(ls -A $pkg 2>/dev/null)" ]; then
    echo "FATAL: $pkg/ directory already has files!"
    echo ""
    echo "History MUST be merged BEFORE files exist in the target directories."
    echo "If files already exist, git will treat them as separate lineages"
    echo "and 'git log' will only work with --follow (which is broken behavior)."
    echo ""
    echo "To fix: reset to the scaffold commit and re-run this script."
    exit 1
  fi
done
echo "Pre-flight check passed: no package directories exist."

for pkg in "${PACKAGES[@]}"; do
    echo ""
    echo "============================================================"
    echo "  Processing $pkg..."
    echo "============================================================"

    SOURCE_PATH="${PACKAGE_PATHS[$pkg]}"
    TEMP_DIR="/tmp/$pkg-history-rewrite"

    rm -rf "$TEMP_DIR"

    echo "  Cloning from $SOURCE_PATH..."
    git clone "$SOURCE_PATH" "$TEMP_DIR"

    echo "  Rewriting history: all files -> $pkg/ subdirectory..."
    cd "$TEMP_DIR"
    git checkout "$DEFAULT_BRANCH"
    git-filter-repo --to-subdirectory-filter "$pkg" --force

    cd "$MONOREPO_DIR"

    echo "  Adding temp remote and fetching..."
    git remote add "$pkg-temp" "$TEMP_DIR" 2>/dev/null || git remote set-url "$pkg-temp" "$TEMP_DIR"
    git fetch "$pkg-temp"

    echo "  Merging with --allow-unrelated-histories..."
    git merge --allow-unrelated-histories --no-edit \
      -m "feat(workspace): merge $pkg history into monorepo" \
      "$pkg-temp/$DEFAULT_BRANCH"

    git remote remove "$pkg-temp"
    rm -rf "$TEMP_DIR"

    COMMIT_COUNT=$(git log --oneline -- "$pkg/package.json" 2>/dev/null | wc -l)
    echo "  $pkg history merged ($COMMIT_COUNT commits for $pkg/package.json)"
done

echo ""
echo "============================================================"
echo "  History preservation complete!"
echo "============================================================"
echo ""
echo "Total commits in monorepo: $(git log --oneline | wc -l)"
echo ""
echo "NEXT STEP: Run ./tools/verify-history.sh before making ANY other commits."
```

### Phase 2: Copy Uncommitted Work

After the history merge is complete, copy uncommitted files from each original repo:

```bash
#!/bin/bash
# tools/copy-uncommitted.sh
# Copies uncommitted changes (modified + untracked) from original repos
set -e

PACKAGES=("pupt" "pupt-lib" "pupt-react" "pupt-sde")
MONOREPO_DIR="$(pwd)"

for pkg in "${PACKAGES[@]}"; do
    SOURCE="../$pkg"
    DEST="$MONOREPO_DIR/$pkg"

    echo "Processing uncommitted files for $pkg..."

    cd "$SOURCE"

    # Get list of modified/added/untracked files
    # Use git status --porcelain for machine-parseable output
    git status --porcelain | while IFS= read -r line; do
        status="${line:0:2}"
        file="${line:3}"

        # Skip deleted files
        if [[ "$status" == " D" ]] || [[ "$status" == "D " ]]; then
            continue
        fi

        # Copy the file to monorepo, preserving directory structure
        src_file="$SOURCE/$file"
        dst_file="$DEST/$file"

        if [ -f "$src_file" ]; then
            mkdir -p "$(dirname "$dst_file")"
            cp "$src_file" "$dst_file"
            echo "  Copied: $file"
        fi
    done

    cd "$MONOREPO_DIR"
    echo "$pkg uncommitted files copied."
done

echo ""
echo "All uncommitted files copied. They are NOT committed in the monorepo."
echo "Review with: git status"
```

### Phase 3: Adapt Packages for Monorepo

For each package, make these changes (committed as monorepo adaptation):

1. **Update `package.json`**:
   - Rename: `pupt` → `@pupt/cli`, `pupt-lib` → `@pupt/lib`, etc.
   - Update `repository` field to point to `pupt/pupt-monorepo`
   - Replace inter-package deps with `workspace:*`
   - Remove per-package `husky`, `commitlint` deps (root handles these)
   - Remove per-package `semantic-release` deps
   - Remove `prepare` script (husky at root)
   - Remove `package-lock.json` (pnpm-lock.yaml at root)

2. **Update `tsconfig.json`**:
   - Add `"extends": "../tsconfig.base.json"`
   - Add `"composite": true`
   - Add `"references"` for cross-package deps
   - Remove settings that duplicate the base config

3. **Add `project.json`** for Nx targets

4. **Remove per-package configs that move to root**:
   - `.github/workflows/` (root CI)
   - `.husky/` (root hooks)
   - `commitlint.config.js` / `commitlint.config.mjs` (root commitlint)
   - `eslint.config.js` / `eslint.config.mjs` (root eslint)
   - `.gitignore` (root gitignore, but keep package-specific ignores if needed)

5. **Update internal imports**:
   - `pupt-lib` → `@pupt/lib` in all import statements
   - `pupt-react` → `@pupt/react`
   - `pupt` → `@pupt/cli`
   - Update `jsxImportSource` in pupt-lib from `"pupt-lib"` to `"@pupt/lib"`

### Phase 4: Validate

```bash
pnpm install
pnpm run build
pnpm run test
pnpm run lint
pnpm run lint:knip
```

### Phase 5: Cutover

1. **Final sync**: Pull latest committed changes from each repo, re-merge histories if needed
2. **Copy final uncommitted work**: Re-run `tools/copy-uncommitted.sh`
3. **Final validation**: Build, test, lint
4. **Push the monorepo** to `pupt/pupt-monorepo` on GitHub
5. **Publish deprecation releases** from old repos pointing to `@pupt/*` packages
6. **Test release pipeline** from monorepo
7. **Archive original repos** on GitHub (mark read-only, update READMEs)

### Phase 6: Post-Cutover

1. Update old repo READMEs: "This repo has been merged into pupt-monorepo"
2. Archive old repos on GitHub
3. Publish final versions of old packages with deprecation notice:
   ```
   npm deprecate pupt "This package has moved to @pupt/cli"
   npm deprecate pupt-lib "This package has moved to @pupt/lib"
   npm deprecate pupt-react "This package has moved to @pupt/react"
   npm deprecate pupt-sde "This package has moved to @pupt/sde"
   ```
4. Update any external documentation links
5. Set up npm trusted publishing for `@pupt/*` scope

---

## Package Rename: Source Code Changes

When renaming packages to `@pupt/*`, the following source code changes are needed:

### pupt → @pupt/cli
- `package.json`: `"name": "@pupt/cli"`
- `bin` stays as `"pt"` (no change to CLI command)
- Internal imports of `pupt-lib` → `@pupt/lib`

### pupt-lib → @pupt/lib
- `package.json`: `"name": "@pupt/lib"`, exports paths stay the same
- `tsconfig.json`: `jsxImportSource` → `"@pupt/lib"`, paths aliases updated
- `vite.config.ts`: resolve aliases updated
- `vitest.config.ts`: self-referencing aliases updated
- All internal self-references (`pupt-lib` → `@pupt/lib`)
- All `components/` imports that reference `pupt-lib` → `@pupt/lib`

### pupt-react → @pupt/react
- `package.json`: `"name": "@pupt/react"`, peerDep on `@pupt/lib`
- `vite.config.ts`: external list updated
- All imports of `pupt-lib` → `@pupt/lib`

### pupt-sde → @pupt/sde
- `package.json`: `"name": "@pupt/sde"`, peerDep on `@pupt/lib`
- Prompt files may contain references to `pupt-lib` that need updating

---

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Breaking npm installs for consumers | Publish deprecation versions of old packages pointing to `@pupt/*`; old versions remain installable |
| npm `@pupt` scope not available | Check availability early; create org before starting migration |
| Lost git history | Use `git-filter-repo` subtree merge (tested approach from graphty-monorepo) |
| CI pipeline failures | Build and validate CI before cutover; keep old repos available for emergency fixes |
| Merge conflicts during cutover | Keep freeze window short; copy uncommitted work separately |
| Different code style across packages | Unified ESLint + Prettier config; gradually align via lint --fix |
| pupt-sde has no TypeScript | Fine - it only contains prompts and .mjs test files. Minimal Nx config. |
| In-progress work lost during migration | Explicit step to copy all uncommitted files preserves working tree state |

---

## Git History Deep Dive

This section documents the lessons learned from graphty-monorepo's migration, why the `git-filter-repo` approach works, exactly what went wrong the first time, and the safeguards we must follow to ensure history works flawlessly.

### What "Flawless History" Means

After migration, the following must all work **without `--follow`**:

| Command | Expected |
|---------|----------|
| `git log -- pupt-lib/src/index.ts` | Shows full pre-monorepo history of that file |
| `git blame pupt/src/cli.ts` | Shows original commit hashes, authors, and dates |
| `git log --oneline -- pupt/package.json` | Hundreds of commits, not just a few monorepo ones |
| VS Code / IDE "file history" | Shows original commit lineage without special config |

### How `git-filter-repo` + Merge Works

The approach has two steps per package:

1. **Rewrite**: `git-filter-repo --to-subdirectory-filter "pupt-lib"` rewrites every commit in the package's history so that all file paths are prefixed with `pupt-lib/`. What was `src/index.ts` becomes `pupt-lib/src/index.ts` in every historical commit.

2. **Merge**: `git merge --allow-unrelated-histories` brings the rewritten history into the monorepo. Because the files "arrive" via the merge commit, git sees continuous lineage from the original `pupt-lib/src/index.ts` commits all the way to HEAD.

### Why Files Must Not Exist Before the Merge

This is the single most critical rule. If `pupt-lib/src/index.ts` already exists in the monorepo (e.g., because someone manually copied files or committed them before the history merge), then git sees **two separate lineages**:

- Lineage A: The file as it existed in the monorepo (starts at the commit that created it)
- Lineage B: The file as it existed in the merged history (the full original repo history)

Git connects these only if you use `--follow`, which detects that the file was "renamed" (from the merge). Without `--follow`, `git log` only sees Lineage A (the monorepo commits). This is exactly what happened in graphty-monorepo's first attempt.

### Verified: graphty-monorepo's Current Approach Works

I verified the actual git history in graphty-monorepo:

**Commit sequence:**
```
5ad00ab  chore: initial monorepo commit          ← Root scaffold ONLY (20 files: configs, design docs, NO package directories)
a77eaed  feat: merge algorithms history           ← History merge (parent: 5ad00ab + filtered algorithms)
ac4a1da  feat: merge layout history               ← History merge
4ee5f76  feat: merge graphty-element history       ← History merge
e84a5a0  feat: merge graphty history               ← History merge
326c06a  chore: phase 3 of monorepo migration     ← First adaptation commit (AFTER histories are in)
```

**Results without `--follow` vs with `--follow`:**
| Package | Without --follow | With --follow | Status |
|---------|-----------------|--------------|--------|
| algorithms | 42 | 37 | History properly linked |
| layout | 58 | 46 | History properly linked |
| graphty-element | 159 | 132 | History properly linked |
| graphty | 38 | 35 | History properly linked |

In all cases, the count **without** `--follow` is actually **higher** than with it (the extra commits are merge commits that touch the files). This confirms the history is properly linked.

`git blame algorithms/package.json` shows original commit hashes from 2025-07-19 (original repo creation date), not just monorepo commits.

### What Went Wrong in graphty-monorepo's First Attempt

The first implementation of graphty-monorepo had the package files **already present** before the history merge. This meant:
- `git log -- algorithms/package.json` only showed monorepo commits
- `git log --follow -- algorithms/package.json` showed the full history
- `git blame` only showed the monorepo commit that copied files in
- IDE file history was broken

The fix was to **completely rebuild the monorepo from scratch**, following the correct sequence:
1. Create initial commit with ONLY root scaffold files
2. Merge all histories IMMEDIATELY (before any package files exist)
3. THEN make adaptation commits

### Safeguards for pupt-monorepo

#### Safeguard 1: Pre-flight check in the script

The `preserve-git-history.sh` script must verify that NO package directories have files:

```bash
for pkg in "${PACKAGES[@]}"; do
  if [ -d "$pkg" ] && [ "$(ls -A $pkg 2>/dev/null)" ]; then
    echo "FATAL: $pkg/ directory already has files!"
    echo "History must be merged BEFORE files exist."
    exit 1
  fi
done
```

#### Safeguard 2: Initial commit must ONLY contain root scaffold

The very first commit must contain only:
- `package.json` (root)
- `pnpm-workspace.yaml`
- `nx.json`
- `tsconfig.base.json`
- `eslint.config.js`
- `vitest.shared.config.ts`
- `commitlint.config.js`
- `.gitignore`, `.npmrc`
- `design/` (monorepo design docs)
- `tools/` (migration scripts)
- `CLAUDE.md`

It must NOT contain any `pupt/`, `pupt-lib/`, `pupt-react/`, or `pupt-sde/` directories.

#### Safeguard 3: Merge order matches dependency order

Merge `pupt-lib` first (it has no pupt dependencies), then the rest. This ensures the foundation package's history is cleanly in place before dependents:

```
pupt-lib → pupt → pupt-react → pupt-sde
```

#### Safeguard 4: Post-merge verification script

Run immediately after all 4 history merges, before any adaptation commits:

```bash
#!/bin/bash
# tools/verify-history.sh
set -e

echo "Verifying git history preservation..."
ERRORS=0

for pkg in pupt-lib pupt pupt-react pupt-sde; do
  if [ ! -f "$pkg/package.json" ]; then
    echo "FAIL: $pkg/package.json not found after merge"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  NO_FOLLOW=$(git log --oneline -- "$pkg/package.json" 2>/dev/null | wc -l)
  WITH_FOLLOW=$(git log --oneline --follow -- "$pkg/package.json" 2>/dev/null | wc -l)

  if [ "$NO_FOLLOW" -gt 3 ]; then
    echo "OK: $pkg - $NO_FOLLOW commits without --follow (history linked)"
  elif [ "$WITH_FOLLOW" -gt "$NO_FOLLOW" ]; then
    echo "FAIL: $pkg - only $NO_FOLLOW commits without --follow ($WITH_FOLLOW with --follow)"
    echo "  History NOT properly linked. Files existed before history merge."
    ERRORS=$((ERRORS + 1))
  else
    echo "WARN: $pkg - only $NO_FOLLOW commits (may be a new repo with few commits)"
  fi
done

# Check blame shows original dates
echo ""
echo "Checking git blame for original dates..."
for pkg in pupt-lib pupt; do
  OLDEST_DATE=$(git blame "$pkg/package.json" 2>/dev/null | head -1 | grep -oP '\d{4}-\d{2}-\d{2}')
  echo "  $pkg/package.json oldest blame date: $OLDEST_DATE"
done

echo ""
if [ $ERRORS -gt 0 ]; then
  echo "VERIFICATION FAILED with $ERRORS errors."
  echo "DO NOT proceed with adaptation commits."
  echo "Fix: git reset --hard <initial-scaffold-commit> && ./tools/preserve-git-history.sh"
  exit 1
fi

echo "All history checks passed."
```

#### Safeguard 5: Expected commit counts for verification

| Package | Current commit count | Expected after merge (approx) |
|---------|---------------------|-------------------------------|
| pupt | 137 | 137+ without --follow |
| pupt-lib | 97 | 97+ without --follow |
| pupt-react | 20 | 20+ without --follow |
| pupt-sde | 4 | 4+ without --follow |

#### Safeguard 6: Backup before starting

Create a full backup of all original repos before running any migration:

```bash
BACKUP_DIR="$HOME/pupt-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
for repo in pupt pupt-lib pupt-react pupt-sde; do
  tar -czf "$BACKUP_DIR/$repo.tar.gz" -C "$HOME/Projects" "$repo"
done
```

#### Safeguard 7: No adaptation until verification passes

The migration script should enforce this ordering:
1. Create scaffold commit (root configs only)
2. Run `preserve-git-history.sh` (merges all 4 histories)
3. Run `verify-history.sh` (MUST PASS before continuing)
4. Only THEN proceed to Phase 3 (adaptation commits)

If verification fails at step 3, the fix is to `git reset --hard` back to the scaffold commit and re-run the history merge.

### Edge Cases Considered

| Edge Case | Risk | Mitigation |
|-----------|------|-----------|
| File renames in original repos | `git-filter-repo` preserves renames; they become `pkg/old` → `pkg/new` | Low risk; verified pupt repos have minimal renames |
| Merge commits in original repos | Properly preserved by `git-filter-repo`; appear in merged history | None needed |
| Tags in original repos | Not imported (tags are repo-level, not needed in monorepo) | Nx Release creates new tags |
| Binary files in history | `git-filter-repo` rewrites all commits including binaries | May slow clone; consider `--blob-callback` if needed |
| Simultaneous development | History merge uses committed state; uncommitted work copied separately | Phase 2 handles this |
| pupt-sde has only 4 commits | Verification must account for small repos | Threshold set at 3 commits |

---

## Implementation Checklist

- [ ] Create `pupt` GitHub org
- [ ] Create `@pupt` npm org and reserve package names
- [ ] Set up monorepo root configs (package.json, nx.json, tsconfig.base.json, etc.)
- [ ] Set up CI/CD workflows
- [ ] Set up husky hooks
- [ ] Back up all original repos (`~/pupt-backups/`)
- [ ] Run `tools/preserve-git-history.sh` to import all repo histories
- [ ] Run `tools/verify-history.sh` - **MUST PASS before continuing**
- [ ] Run `tools/copy-uncommitted.sh` to bring in working tree changes
- [ ] Adapt each package (rename, update deps, remove per-package configs)
- [ ] Update all internal imports for `@pupt/*` scope
- [ ] Validate: build, test, lint, knip
- [ ] Push to `pupt/pupt-monorepo`
- [ ] Set up npm OIDC trusted publishing
- [ ] Test release pipeline
- [ ] Publish deprecation versions of old packages
- [ ] Archive old repos
- [ ] Update external documentation links
