# Git Worktree Component Design

## Problem Statement

When AI-driven prompts instruct an LLM to make code changes (bug fixes, refactoring, implementation), those changes happen directly in the user's working directory. This creates several problems:

1. **No isolation** — changes are made directly to the user's current branch, potentially contaminating in-progress work
2. **No safe rollback** — if the LLM produces bad changes, the user must manually `git stash` or `git checkout` to recover
3. **No parallelism** — only one code-changing prompt can run at a time because they'd conflict on the same working tree
4. **No atomic review** — changes accumulate incrementally rather than being presented as a discrete unit that can be accepted or rejected wholesale

Git worktrees solve all of these problems. A worktree is a separate checkout of the same repository, with its own working directory and branch, but sharing the same `.git` object store. Changes can be made in isolation, reviewed as a unit, and merged back (or discarded) cleanly.

## Design: A Prompt Component

The git worktree component is a **pupt Component** — the same kind of thing as `GitHubProfile` in pupt-react. It has an `async render()` method that:

1. Detects the git environment at render time (is there a `.git`? are worktrees supported? are we in a browser?)
2. Returns text that gets embedded in the rendered prompt, instructing the LLM on how to use git worktrees

The component doesn't manage worktrees itself. It's a **context injector**: it inspects the environment and adds structured instructions to the prompt. The LLM consuming the prompt is the agent that actually runs `git worktree add`, makes changes in the worktree, and presents merge/discard options to the user.

### Why a Component, Not an Execution Wrapper

In the pupt ecosystem, prompts render to text that an LLM interprets. The LLM is the actor that modifies files. So the natural place to add worktree behavior is in the prompt itself — as instructions the LLM follows. This:

- Fits the existing component model (same pattern as `GitHubProfile`)
- Works with any LLM agent framework (Claude Code, aider, Cursor, etc.) — the instructions are in the prompt text
- Doesn't require pupt-lib to grow an execution orchestration layer
- Lets prompt authors control exactly where and how worktree instructions appear

## Usage in a Prompt

```xml
<Uses component="GitWorktree" from="pupt-sde-components" />

<Prompt name="sde-debug-root-cause" ...>
  <Ask.Editor name="bugDescription" ... />

  <GitWorktree mode="auto" />

  <Role ... />
  <Task ... />
  <Steps ...>
    <Step>Reproduce and minimize the bug...</Step>
    <Step>Collect evidence...</Step>
    ...
  </Steps>
</Prompt>
```

When this prompt renders, `<GitWorktree>` runs its detection logic and emits text. For a worktree-capable repository, the rendered prompt might include:

```markdown
## Git Worktree Instructions

You are working in a git repository on branch `main`.
Git worktrees are available and should be used to isolate your changes.

**Before making any code changes:**
1. Create a new worktree and branch:
   ```
   git worktree add ../.pupt-worktrees/debug-root-cause-2026-02-15 -b pupt/debug-root-cause/2026-02-15
   ```
2. Change your working directory to the worktree:
   ```
   cd ../.pupt-worktrees/debug-root-cause-2026-02-15
   ```
3. Make all code changes within this worktree directory.

**After completing your changes:**
1. Commit your changes in the worktree.
2. Present the user with a summary of changes and ask:
   - **Merge** — merge the worktree branch back into `main`
   - **Squash merge** — combine all commits into one and merge
   - **Keep** — leave the worktree for manual review
   - **Discard** — delete the worktree and branch, discarding all changes
3. Execute the user's choice.
```

If no git is detected or the component is in a browser, it renders nothing — the prompt works normally without worktree instructions.

## Component Implementation

### Class Structure

```typescript
import { Component } from "pupt-lib";
import type { PuptNode } from "pupt-lib";
import { z } from "zod";

interface GitWorktreeProps {
  /**
   * Controls behavior.
   * - "auto": emit worktree instructions if git is available (default)
   * - "always": emit worktree instructions, warn if git is unavailable
   * - "never": never emit worktree instructions
   * - "prompt": emit instructions that tell the LLM to ask the user first
   */
  mode?: "auto" | "always" | "never" | "prompt";

  /**
   * Base directory for worktree checkouts, relative to the repo root.
   * Default: "../.pupt-worktrees"
   */
  worktreeDir?: string;

  /**
   * Branch prefix for worktree branches.
   * Default: "pupt"
   */
  branchPrefix?: string;

  /**
   * Merge strategy to suggest to the LLM.
   * - "ask": tell the LLM to ask the user (default)
   * - "merge": tell the LLM to merge automatically
   * - "squash": tell the LLM to squash merge automatically
   * - "keep": tell the LLM to leave the worktree for review
   */
  onComplete?: "ask" | "merge" | "squash" | "keep";

  children?: PuptNode;
}

export class GitWorktree extends Component<GitWorktreeProps> {
  static schema = z.object({
    mode: z.enum(["auto", "always", "never", "prompt"]).default("auto"),
    worktreeDir: z.string().default("../.pupt-worktrees"),
    branchPrefix: z.string().default("pupt"),
    onComplete: z.enum(["ask", "merge", "squash", "keep"]).default("ask"),
  }).passthrough();

  async render(props: GitWorktreeProps): Promise<PuptNode> {
    const { mode, worktreeDir, branchPrefix, onComplete } = props;

    if (mode === "never") {
      return "";
    }

    const env = await this.detectEnvironment();

    if (env.type === "browser" || env.type === "no-git") {
      if (mode === "always") {
        return "**Warning:** Git worktrees were requested but git is not available. Proceeding without worktree isolation.";
      }
      return "";
    }

    if (env.type === "git-no-worktree") {
      if (mode === "always") {
        return `**Warning:** Git worktrees were requested but are not supported (${env.reason}). Proceeding without worktree isolation.`;
      }
      return "";
    }

    // env.type === "worktree-capable"
    return this.renderWorktreeInstructions(env, props);
  }

  // ... (detection and rendering methods below)
}
```

### Environment Detection

The component needs to determine what git capabilities are available at render time.

#### Git Library: simple-git

The component uses [simple-git](https://github.com/steveukx/git-js) (~11M weekly downloads, actively maintained) for all git interactions. simple-git provides:

- **Built-in methods** for common operations: `checkIsRepo()`, `branchLocal()`, `revparse()`
- **`.raw()` escape hatch** for worktree commands that don't have first-class API methods
- **Promise-based API** with TypeScript types
- **Lightweight** — ~1 MB, 3 dependencies, no native compilation, no bundled binaries

simple-git requires the system `git` binary to be installed, which is the correct constraint for this component — the LLM will also need system git to execute the worktree commands in the rendered instructions.

##### Why simple-git Over Alternatives?

| Library | Why not |
|---------|---------|
| **isomorphic-git** | Actively broken inside worktrees — fails to resolve refs when `.git` is a file (which is how worktrees work). No `git worktree` command equivalents. |
| **nodegit** | Last published 2020. Native C++ bindings fail on modern Node. Known worktree bug open since 2016. |
| **dugite** | Viable alternative (used by GitHub Desktop), but bundles a ~30 MB git binary on install. Overkill when system git is required anyway. |
| **Raw `child_process`** | Works, but simple-git's built-in methods (`checkIsRepo`, `branchLocal`, error handling) avoid reinventing the wheel. |

#### Detection Strategy

```typescript
import simpleGit, { type SimpleGit } from "simple-git";

private async detectEnvironment(): Promise<GitEnvironment> {
  // 1. Browser check — no filesystem or git binary available
  if (typeof globalThis.window !== "undefined" && typeof globalThis.process === "undefined") {
    return { type: "browser" };
  }

  // 2. Initialize simple-git
  let git: SimpleGit;
  try {
    git = simpleGit();
  } catch {
    return { type: "no-git" };
  }

  // 3. Check if we're in a git repo
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    return { type: "no-git" };
  }

  // 4. Get current branch and repo root
  let currentBranch: string;
  let repoRoot: string;
  try {
    const branchResult = await git.branchLocal();
    currentBranch = branchResult.current;
    repoRoot = await git.revparse(["--show-toplevel"]);
  } catch {
    return { type: "no-git" };
  }

  // 5. Check worktree support via raw command
  try {
    const worktreeOutput = await git.raw(["worktree", "list", "--porcelain"]);
    const worktreeCount = worktreeOutput
      .split("\n")
      .filter(line => line.startsWith("worktree ")).length;
    return {
      type: "worktree-capable",
      currentBranch,
      hasExistingWorktrees: worktreeCount > 1,
      repoRoot: repoRoot.trim(),
    };
  } catch {
    return {
      type: "git-no-worktree",
      reason: "git worktree command not supported (git 2.5+ required)",
    };
  }
}
```

#### Type Definitions

```typescript
type GitEnvironment =
  | { type: "worktree-capable"; currentBranch: string; hasExistingWorktrees: boolean; repoRoot: string }
  | { type: "git-no-worktree"; reason: string }
  | { type: "no-git" }
  | { type: "browser" };
```

### Rendering Instructions

The core of the component is generating the text that gets embedded in the prompt. This text needs to be specific enough that the LLM can execute the commands, but flexible enough to work across different LLM agent frameworks.

```typescript
private renderWorktreeInstructions(
  env: Extract<GitEnvironment, { type: "worktree-capable" }>,
  props: GitWorktreeProps,
): string {
  const { worktreeDir, branchPrefix, onComplete } = props;
  const date = new Date().toISOString().split("T")[0];
  const shortId = Math.random().toString(16).slice(2, 6);

  // The prompt name isn't available as a prop — use a placeholder
  // that the prompt author fills in, or derive from context
  const branchName = `${branchPrefix}/${date}-${shortId}`;
  const worktreePath = `${worktreeDir}/${date}-${shortId}`;

  const sections: string[] = [];

  // Header
  sections.push(`## Git Worktree Instructions`);
  sections.push(``);
  sections.push(`You are working in a git repository on branch \`${env.currentBranch}\`.`);
  sections.push(`Git worktrees are available and should be used to isolate your changes.`);

  if (env.hasExistingWorktrees) {
    sections.push(`Note: This repository already has active worktrees. This is expected.`);
  }

  // Mode-specific preamble
  if (props.mode === "prompt") {
    sections.push(``);
    sections.push(`**Before making changes, ask the user:** "Would you like me to use a git worktree to isolate these changes? This creates a separate branch and working directory, making it easy to review, merge, or discard the changes as a unit."`);
    sections.push(`If the user declines, skip the worktree setup and make changes directly.`);
    sections.push(`If the user accepts (or doesn't respond), follow the worktree steps below.`);
  }

  // Setup instructions
  sections.push(``);
  sections.push(`**Before making any code changes:**`);
  sections.push(`1. Create a new worktree and branch:`);
  sections.push(`   \`\`\``);
  sections.push(`   git worktree add ${worktreePath} -b ${branchName}`);
  sections.push(`   \`\`\``);
  sections.push(`2. Change your working directory to the worktree: \`${worktreePath}\``);
  sections.push(`3. Make all code changes within this worktree directory.`);
  sections.push(`4. Commit changes in the worktree as you work.`);

  // Completion instructions
  sections.push(``);
  sections.push(`**After completing your changes:**`);

  switch (onComplete) {
    case "ask":
      sections.push(`1. Commit all remaining changes in the worktree.`);
      sections.push(`2. Present the user with a summary of all changes (files modified, added, deleted).`);
      sections.push(`3. Ask the user what they would like to do:`);
      sections.push(`   - **Merge** — \`cd ${env.repoRoot} && git merge ${branchName}\` then \`git worktree remove ${worktreePath} && git branch -d ${branchName}\``);
      sections.push(`   - **Squash merge** — \`cd ${env.repoRoot} && git merge --squash ${branchName} && git commit\` then clean up`);
      sections.push(`   - **Keep for review** — leave the worktree in place, tell the user the path and branch name`);
      sections.push(`   - **Discard** — \`git worktree remove --force ${worktreePath} && git branch -D ${branchName}\``);
      sections.push(`4. Execute the user's choice.`);
      break;

    case "merge":
      sections.push(`1. Commit all remaining changes in the worktree.`);
      sections.push(`2. Merge back: \`cd ${env.repoRoot} && git merge ${branchName}\``);
      sections.push(`3. Clean up: \`git worktree remove ${worktreePath} && git branch -d ${branchName}\``);
      sections.push(`4. Inform the user that changes have been merged.`);
      break;

    case "squash":
      sections.push(`1. Commit all remaining changes in the worktree.`);
      sections.push(`2. Squash merge: \`cd ${env.repoRoot} && git merge --squash ${branchName} && git commit\``);
      sections.push(`3. Clean up: \`git worktree remove ${worktreePath} && git branch -d ${branchName}\``);
      sections.push(`4. Inform the user that changes have been merged as a single commit.`);
      break;

    case "keep":
      sections.push(`1. Commit all remaining changes in the worktree.`);
      sections.push(`2. Tell the user: "Changes are ready for review in \`${worktreePath}\` on branch \`${branchName}\`."`);
      sections.push(`3. Do NOT merge or delete the worktree.`);
      break;
  }

  return sections.join("\n");
}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `"auto" \| "always" \| "never" \| "prompt"` | `"auto"` | Controls when worktree instructions are emitted |
| `worktreeDir` | `string` | `"../.pupt-worktrees"` | Base directory for worktree checkouts, relative to repo root |
| `branchPrefix` | `string` | `"pupt"` | Prefix for worktree branch names |
| `onComplete` | `"ask" \| "merge" \| "squash" \| "keep"` | `"ask"` | What the LLM should do when changes are complete |

### Mode Behavior

| Mode | Git available | No git / browser |
|------|--------------|------------------|
| `"auto"` | Emit worktree instructions | Render nothing (silent) |
| `"always"` | Emit worktree instructions | Emit a warning |
| `"never"` | Render nothing | Render nothing |
| `"prompt"` | Emit instructions that start with "ask the user first" | Render nothing |

## Usage Examples

### Bug Fixing with Worktree Isolation

```xml
<Prompt name="sde-debug-root-cause" ...>
  <Ask.Editor name="bugDescription" label="Bug Description" required silent />

  <GitWorktree mode="auto" onComplete="ask" />

  <Role preset="engineer" experience="expert" ... />
  <Task verb="Investigate" subject="a reported bug" ... />
  <Steps ...>
    <Step>Reproduce and minimize the bug...</Step>
    ...
  </Steps>
</Prompt>
```

The LLM receives the rendered prompt, sees the worktree instructions, creates a worktree, does its debugging work there, and asks the user what to do with the result.

### Parallel Refactoring (Multiple Prompts)

Each prompt renders with a unique branch name (generated at render time), so multiple prompts can run concurrently:

```xml
<!-- Prompt 1: runs in worktree with branch pupt/2026-02-15-a1b2 -->
<Prompt name="sde-refactor-auth" ...>
  <GitWorktree mode="auto" onComplete="keep" />
  <Task>Refactor the authentication module...</Task>
</Prompt>

<!-- Prompt 2: runs in worktree with branch pupt/2026-02-15-c3d4 -->
<Prompt name="sde-refactor-db" ...>
  <GitWorktree mode="auto" onComplete="keep" />
  <Task>Refactor the database access layer...</Task>
</Prompt>
```

Both create separate worktrees. The user reviews and merges each independently.

### Silent Mode for CI/CD

```xml
<Prompt name="sde-test-generation" ...>
  <GitWorktree mode="never" />
  <Task>Generate tests for the following code...</Task>
</Prompt>
```

In CI, worktrees add unnecessary complexity. `mode="never"` renders nothing — the prompt works as if the component isn't there.

### Prompt-the-User Mode

```xml
<Prompt name="sde-implementation-plan" ...>
  <GitWorktree mode="prompt" onComplete="ask" />
  <Task>Implement the following feature...</Task>
</Prompt>
```

The rendered prompt starts with: "Ask the user if they want to use a git worktree." If the user declines, the LLM skips worktree setup and works directly in the repo.

## Environment Detection Details

### Detection Waterfall

The detection runs during `render()` and follows this order:

1. **Browser check** — `typeof globalThis.window !== "undefined" && typeof globalThis.process === "undefined"` → `{ type: "browser" }`. In a browser there's no local filesystem or git binary. simple-git is never initialized.

2. **Initialize simple-git** — `simpleGit()`. If this fails (e.g., git binary not found), → `{ type: "no-git" }`.

3. **Is this a git repo?** — `git.checkIsRepo()`. If false (no `.git` in any parent directory), → `{ type: "no-git" }`.

4. **Branch and repo root** — `git.branchLocal()` and `git.revparse(["--show-toplevel"])`. Gives us the branch name and absolute repo path for the instructions.

5. **Are worktrees supported?** — `git.raw(["worktree", "list", "--porcelain"])`. If this fails (git < 2.5), → `{ type: "git-no-worktree" }`. If it succeeds, → `{ type: "worktree-capable" }` with a count of existing worktrees.

### Performance

The detection runs 3-4 git commands sequentially via simple-git. Each is fast (< 50ms on local disk). Total detection time is under 200ms. This runs once per prompt render, which is acceptable since prompt compilation itself typically takes longer.

If detection performance becomes a concern (e.g., prompts re-rendering frequently in pupt-react), the component could cache the result for a configurable duration. For now, YAGNI.

## Package Distribution

The component is a TypeScript class that extends `Component` from pupt-lib. It would be distributed as part of a components package.

### Dependencies

```json
{
  "dependencies": {
    "simple-git": "^3.31.0"
  },
  "peerDependencies": {
    "pupt-lib": "^1.3.5"
  }
}
```

`simple-git` is a direct dependency (not a peer dependency) because it's an implementation detail of the component — consumers don't interact with it directly. `pupt-lib` remains a peer dependency per the standard convention.

### Package Layout

As a standalone components package:

```
pupt-sde-components/
├── package.json
├── src/
│   ├── index.ts              ← exports { GitWorktree }
│   └── GitWorktree.ts        ← the component
└── dist/
    ├── index.js
    └── index.d.ts
```

Or directly in pupt-sde alongside the prompts, if pupt-sde grows a `src/` directory for components:

```
pupt-sde/
├── package.json              ← adds "exports" field for components
├── prompts/                  ← existing .prompt files
│   ├── debug-root-cause.prompt
│   └── ...
├── src/
│   └── components/
│       └── GitWorktree.ts
└── dist/
    └── index.js
```

Prompts reference it via `<Uses>`:

```xml
<Uses component="GitWorktree" from="pupt-sde" />
```

or if it's a separate package:

```xml
<Uses component="GitWorktree" from="pupt-sde-components" />
```

## Worktree Directory Layout

The component tells the LLM to create worktrees as siblings to the repository root:

```
parent-dir/
├── my-project/              ← original repo (user's working directory)
│   ├── .git/
│   ├── src/
│   └── ...
└── .pupt-worktrees/         ← worktree base directory
    ├── 2026-02-15-a1b2/     ← worktree for one prompt run
    │   ├── src/
    │   └── ...
    └── 2026-02-15-c3d4/     ← worktree for another prompt run
        ├── src/
        └── ...
```

**Why sibling, not nested?** Placing worktrees inside the repo would make them visible to IDE file watchers, build tools, and search indexing. Sibling placement keeps them invisible to the original project's tooling.

## Branch Naming

Generated at render time to ensure uniqueness:

```
{branchPrefix}/{date}-{shortId}
```

Examples:
- `pupt/2026-02-15-a1b2`
- `pupt/2026-02-15-c3d4`

The `branchPrefix` prop (default `"pupt"`) namespaces branches to avoid collisions with user branches. The date provides temporal context. The 4-char hex ID (from `Math.random`) ensures uniqueness across concurrent prompt renders.

When the prompt name is known (because the prompt author embeds it), the naming can be more descriptive:

```xml
<GitWorktree branchPrefix="pupt/debug-root-cause" />
```

Produces: `pupt/debug-root-cause/2026-02-15-a1b2`

## Edge Cases

### LLM Doesn't Follow Instructions

The worktree instructions are advisory — the LLM might ignore them, partially follow them, or make mistakes. This is inherent to the prompt-as-instructions model. Mitigations:

- **Clear, imperative language** — "You MUST create a worktree before modifying any files"
- **Specific commands** — exact `git worktree add` commands with paths and branch names, not vague guidance
- **Constraint reinforcement** — prompt authors can add `<Constraint>` tags that reinforce worktree usage

This is the same tradeoff as any other prompt instruction. It works well with capable LLMs (Claude, GPT-4) and less reliably with smaller models.

### Merge Conflicts

The instructions tell the LLM to handle conflicts by informing the user and presenting options. The LLM doesn't auto-resolve conflicts — it describes them and lets the user decide. This matches how most LLM agents handle destructive operations.

### Dirty Working Directory

The worktree is created from HEAD, not from the dirty working tree state. This is standard git behavior. The component's instructions don't need to address this — `git worktree add` handles it correctly.

### No Shell Access

Some LLM agent frameworks restrict shell access or require explicit permission for git commands. The component can't know this at render time. If the LLM can't execute git commands, the worktree instructions will fail gracefully — the LLM will report that it can't create the worktree and fall back to working directly.

### Nested Worktrees

If the prompt is rendered while already inside a pupt-managed worktree (e.g., a user runs a second prompt from within a worktree directory), the component detects this via the worktree path prefix and renders a note: "You are already in a worktree. Make changes directly here."

### Repository Without Commits

`git worktree add` requires at least one commit. In a repo with no commits, the component detects this (HEAD resolution fails) and falls back to `{ type: "no-git" }` behavior.

## Relationship to Existing Prompts

The component is additive — existing prompts work without it. Adding `<GitWorktree />` to a prompt adds the worktree instructions to the rendered output. Removing it removes them. No other part of the prompt needs to change.

### Prompts That Should Use It

| Prompt | Recommended | Reason |
|--------|-------------|--------|
| `debug-root-cause` | Yes | Isolates fix attempts. Discard if diagnosis is wrong. |
| `refactor` | Yes | Preview refactoring in isolation. |
| `implementation-plan` | Yes | Implement features on a separate branch. |
| `test-generation` | Yes | Generate tests without polluting the main branch. |
| `security-audit` | Maybe | If it applies fixes, not just analysis. |
| `code-review` | No | Read-only analysis. |
| `design-architecture` | No | Produces text, not code changes. |
| `documentation` | Maybe | If generating doc files. |
| `performance-analysis` | Maybe | If applying optimizations. |
| `pr-description` | No | Read-only analysis of existing diffs. |
| `requirements-clarification` | No | Produces analysis, not code changes. |

## Future Considerations

- **Prompt-name-aware branches** — if pupt-lib exposes the enclosing `<Prompt>`'s `name` prop to child components during render, the branch name could automatically include the prompt name without the author manually setting `branchPrefix`
- **Worktree cleanup component** — a companion `<GitWorktreeCleanup />` component that adds instructions for cleaning up stale worktrees from previous sessions
- **Diff summary component** — a `<GitWorktreeDiff />` component that detects existing worktrees and includes their diff summaries as context
- **Integration with PR workflows** — a variant that tells the LLM to create a PR instead of merging directly, for team code review workflows
- **Bundled git fallback** — if the component ever needs to work in environments without system git, dugite (which bundles its own git binary) could be used as a fallback behind the same simple-git-style API
