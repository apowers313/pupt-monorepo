# GitWorktree Component — Design & Requirements

This document captures the requirements, design decisions, and rationale for the `<GitWorktree>` component so that implementation can be picked up in a future session.

## Status: Design Complete, Not Yet Implemented

The technical design is in `design/git-worktree-component.md`. This document captures the "why" behind the decisions.

## Requirements

### Original Requirements

1. Detect and respond to git worktrees when running prompts that make code changes
2. If `.git` is present and worktrees are available: create a worktree for the changes, merge back when done
3. If `.git` is present but no worktrees exist: prompt the user if they'd like to use one
4. If no `.git` or running in a browser: skip worktree behavior entirely
5. Consider parallel execution scenarios beyond bug fixes
6. Support configuration options like "silent" (never prompt)

### Refined Requirements (from design discussion)

- The component should be a **pupt Component** (like `GitHubProfile` in pupt-react), not an execution wrapper
- It renders at prompt compile time, injecting instructions into the prompt text that tell the LLM how to use worktrees
- The LLM is the actor — it creates worktrees, makes changes, and handles merge/discard. The component just provides the instructions.
- Use `simple-git` npm package for git detection at render time

## Key Design Decisions

### Decision 1: Prompt Component, Not Execution Wrapper

**What was considered:** Initially designed as a `WorktreeManager` class that wraps prompt execution — creating worktrees before the prompt runs and managing merge/discard after.

**What was chosen:** A `Component` subclass with `async render()` that detects the git environment and emits LLM instructions into the rendered prompt text.

**Why:** In pupt, prompts render to text that an LLM interprets. The LLM is the actor that modifies files. The component's job is to add context and instructions to the prompt — the same pattern as `GitHubProfile` fetching data from the GitHub API and rendering it into the prompt. This fits the existing architecture without requiring pupt-lib to grow an execution orchestration layer.

**Reference pattern:** `GitHubProfile` in `/home/apowers/Projects/pupt-react/demo/src/data/examples.ts` (lines 322-342). It extends `Component`, has `async render()`, fetches external data, returns a string.

### Decision 2: simple-git for Git Detection

**What was considered:** isomorphic-git, nodegit, dugite, gift, raw `child_process`, dedicated worktree packages.

**What was chosen:** `simple-git` (~11M weekly downloads, published daily, MIT license).

**Why:**
- isomorphic-git is **actively broken** inside worktrees — fails to resolve refs when `.git` is a file (which is exactly how worktrees represent themselves). No worktree command equivalents exist.
- nodegit hasn't been published since 2020, native C++ bindings fail on modern Node, and has a known worktree bug open since 2016.
- dugite works but bundles a ~30 MB git binary. Overkill since the LLM also needs system git to execute the commands.
- simple-git has built-in methods for the common checks (`checkIsRepo()`, `branchLocal()`, `revparse()`) and a `.raw()` escape hatch for `git worktree list/add/remove`.

**Tradeoff:** simple-git requires system git to be installed. This is the correct constraint — the LLM will execute `git worktree add` commands, so system git is already required.

### Decision 3: Four Modes

| Mode | Behavior |
|------|----------|
| `"auto"` (default) | Emit worktree instructions if git is available; render nothing otherwise |
| `"always"` | Emit worktree instructions; warn if git is unavailable |
| `"never"` | Never emit anything (silent skip — the "silent" option from requirements) |
| `"prompt"` | Emit instructions that tell the LLM to ask the user before creating a worktree |

### Decision 4: Worktrees as Siblings

Worktrees are created at `../.pupt-worktrees/` (sibling to the repo root), not inside the repo. This avoids triggering IDE file watchers, build tools, and search indexing on the worktree contents.

### Decision 5: Shell-Out for Detection, Instructions for Execution

The component shells out to git (via simple-git) at **render time** for detection only. It does NOT create worktrees itself. It renders text instructions that the LLM follows at runtime. This separation means the component works with any LLM agent framework — Claude Code, aider, Cursor, etc.

## Which Prompts Should Use `<GitWorktree>`

The deciding factor: **does the prompt instruct the LLM to modify files?**

| Prompt | Use GitWorktree | Rationale |
|--------|----------------|-----------|
| `debug-root-cause` | **Yes** | Designs and applies bug fixes. Isolation lets you discard bad diagnoses. |
| `refactor` | **Yes** | Restructures code. Worktree gives clean before/after for review. |
| `implementation-plan` | **Yes** | If the LLM implements the plan, changes should be on a branch. |
| `test-generation` | **Yes** | Generates test files. Easy to discard if tests are bad. |
| `security-audit` | **Maybe** | Primarily analysis, but may apply fixes. Use `mode="prompt"`. |
| `performance-analysis` | **Maybe** | Primarily analysis, but may apply optimizations. Use `mode="prompt"`. |
| `documentation` | **Maybe** | If generating doc files in the repo. Low stakes either way. |
| `code-review` | **No** | Read-only analysis. No code changes. |
| `design-architecture` | **No** | Produces an architecture document. No code changes. |
| `pr-description` | **No** | Reads an existing diff. No code changes. |
| `requirements-clarification` | **No** | Produces questions and analysis. No code changes. |

## Implementation Plan

### Step 1: Create the Component Package

Either as `pupt-sde-components` (standalone) or as a `src/components/` directory within pupt-sde. The component needs:

- `simple-git` as a dependency
- `pupt-lib` as a peer dependency
- TypeScript, extends `Component` from pupt-lib
- Zod schema for prop validation
- Build step (TypeScript → JavaScript)

### Step 2: Implement `GitWorktree` Component

The full implementation is sketched in `design/git-worktree-component.md`. Key parts:

1. **`detectEnvironment()`** — browser check → `simpleGit()` → `checkIsRepo()` → `branchLocal()` / `revparse()` → `raw(["worktree", "list", "--porcelain"])`
2. **`renderWorktreeInstructions()`** — generates the markdown text with specific git commands, branch names, and merge/discard instructions based on the detected environment and props
3. **`render()`** — orchestrates detection → mode check → instruction rendering

### Step 3: Add `<GitWorktree>` to Existing Prompts

Add `<Uses component="GitWorktree" from="..." />` and `<GitWorktree mode="auto" />` to the prompts identified above. This is purely additive — existing prompt behavior is unchanged when git is unavailable.

### Step 4: Test

- Test that the component renders worktree instructions when git is available
- Test that it renders nothing in browser / no-git environments
- Test each mode ("auto", "always", "never", "prompt")
- Test that branch names are unique across renders
- Snapshot tests for the rendered instruction text

## Open Questions

1. **Package location** — standalone `pupt-sde-components` package or `src/components/` within pupt-sde? The former is cleaner separation; the latter avoids a new package. Depends on whether other components are expected.

2. **Prompt name in branch names** — the component doesn't currently have access to the enclosing `<Prompt>`'s `name` prop. The workaround is the `branchPrefix` prop (e.g., `<GitWorktree branchPrefix="pupt/debug-root-cause" />`). A future pupt-lib enhancement could expose the parent prompt's name to child components.

3. **Stale worktree cleanup** — the current design doesn't address cleaning up worktrees from crashed sessions. A future `<GitWorktreeCleanup />` companion component could handle this, or instructions could be added to the main component's output.

4. **Browser rendering** — the component imports `simple-git` which depends on `node:child_process`. In a browser bundle (pupt-react), this import would fail at module load time, not just at render time. The component may need conditional dynamic import (`await import("simple-git")`) wrapped in a try/catch, or be excluded from browser bundles entirely via package.json `exports` conditions.

## Key Files

- **This document:** `design/git-worktree-component-design.md` — requirements, decisions, rationale
- **Technical design:** `design/git-worktree-component.md` — full API, implementation sketches, edge cases
- **Reference component:** `/home/apowers/Projects/pupt-react/demo/src/data/examples.ts` lines 322-342 — `GitHubProfile` async component pattern
- **Reference component (class):** `/home/apowers/Projects/pupt-react/demo/src/components/GithubUser.ts` — `GithubUser` component with Zod schema
- **Prompt that should use it first:** `prompts/debug-root-cause.prompt` — the primary bug-fixing prompt
