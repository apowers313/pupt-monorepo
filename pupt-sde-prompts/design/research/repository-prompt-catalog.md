# Repository Prompt Catalog

**Date:** 2026-02-07
**Purpose:** Comprehensive catalog of real developer prompts and configuration files found in code repositories (GitHub, GitLab, Gists, npm/PyPI). Organized by type with clear distinction between actual executable prompts and configuration/context files.

**How to use this catalog:** Each entry includes a URL, what's there, and a classification. The user should review this catalog and decide which items to investigate further for verbatim prompt extraction.

---

## Table of Contents

1. [Actual Executable Prompts](#1-actual-executable-prompts) — Text developers type or that gets executed as prompts
2. [Configuration/Context Files](#2-configurationcontext-files) — Injected into LLM context but not typed by developers
3. [Collection & Aggregation Repos](#3-collection--aggregation-repos) — Meta-resources pointing to many prompts
4. [Cross-Platform Findings](#4-cross-platform-findings) — GitLab, Gists, npm, PyPI

---

## 1. Actual Executable Prompts

These are the closest to "text developers actually type into the LLM." Includes slash commands, `.prompt.md` files, system prompts embedded in code, CI/CD workflow prompts, and autonomous agent loop prompts.

### 1.1 Slash Command Collections (Claude Code `.claude/commands/`)

These ARE actual prompts — each file is a markdown prompt that gets executed verbatim when a developer types `/command-name`.

| # | Repository | URL | Commands | What's There |
|---|-----------|-----|----------|-------------|
| 1 | qdhenry/Claude-Command-Suite | https://github.com/qdhenry/Claude-Command-Suite | 148 | Full SDLC: `/dev:code-review`, `/dev:debug-error`, `/dev:refactor-code`, `/dev:ultra-think`, `/test:generate-test-cases`, `/security:security-audit`, `/deploy:prepare-release`, `/deploy:containerize-application` |
| 2 | danielrosehill/Claude-Slash-Commands | https://github.com/danielrosehill/Claude-Slash-Commands | 357 | Diverse workflow automation. Searchable INDEX.md. Each command is markdown with `$ARGUMENTS` placeholder. |
| 3 | wshobson/commands | https://github.com/wshobson/commands | 57 | 15 workflows + 42 tools. Notable: `/workflows:feature-development` (multi-agent), `/workflows:tdd-cycle`, `/workflows:full-review`, `/workflows:security-hardening`, `/tools:smart-debug`, `/tools:tdd-red`/`green`/`refactor`, `/tools:standup-notes`, `/tools:context-save`/`restore` |
| 4 | wbern/claude-instructions | https://github.com/wbern/claude-instructions | 30+ | TDD-focused commands |
| 5 | Comfy-Org/comfy-claude-prompt-library | https://github.com/Comfy-Org/comfy-claude-prompt-library | 80+ | ComfyUI project: `/user:AGENT-create-command`, `/user:scan-comfy-conventions`, `/user:scan-performance-reactivity`, `/user:scan-vue-patterns`, `/user:STUDY-current-repo`, `/user:ANALYZE-repo-for-claude` |
| 6 | carlrannaberg/claudekit | https://github.com/carlrannaberg/claudekit | 20+ | Commands + hooks + subagents. `/code-review [target]` (6 parallel agents), `/spec:create [feature]`, `/spec:execute [file]` (6-phase workflow), `/checkpoint:create [msg]`, `/checkpoint:restore [n]`, `/research [query]`, `/validate-and-fix` |
| 7 | scopecraft/command | https://github.com/scopecraft/command | 5+ | Feature lifecycle: `/project:01_brainstorm-feature`, `/project:02_feature-proposal`, `/project:03_feature-to-prd`, `/project:04_feature-planning`, `/project:05_implement {mode}` (TypeScript, UI, MCP, CLI, DevOps) |
| 8 | iannuttall/claude-sessions | https://github.com/iannuttall/claude-sessions | 6 | Session tracking: `session-start.md`, `session-update.md`, `session-end.md`, `session-current.md`, `session-list.md`, `session-help.md` |
| 9 | artemgetmann (dotfiles) | (referenced in agent output) | ~20 | Personal commands including `/commands:code-review`, `/commands:test-generation` |

### 1.2 Claude Code Skills (`.claude/skills/SKILL.md`)

Skills are prompt-like artifacts that teach Claude how to perform specific tasks. They're loaded on demand and influence behavior.

| # | Repository | URL | Skills | What's There |
|---|-----------|-----|--------|-------------|
| 1 | obra/superpowers | https://github.com/obra/superpowers | 14+ | Full methodology: `test-driven-development` (RED-GREEN-REFACTOR), `systematic-debugging` (4-phase root cause), `brainstorming` (Socratic design), `writing-plans` (2-5 min tasks), `executing-plans` (batch with checkpoints), `dispatching-parallel-agents`, `requesting-code-review`/`receiving-code-review`, `subagent-driven-development`, `using-git-worktrees`. Meta-skill: `writing-skills/SKILL.md` defines skill authoring as "TDD applied to process documentation" |
| 2 | trailofbits/skills | https://github.com/trailofbits/skills | 16+ | Security research: `audit-context-building` (3-phase ultra-granular analysis), `variant-analysis` (5-step generalization), `differential-review`, `insecure-defaults`, `semgrep-rule-creator`, `constant-time-analysis`, `building-secure-contracts` (6 blockchains), `sharp-edges` |
| 3 | levnikolaevich/claude-code-skills | https://github.com/levnikolaevich/claude-code-skills | 85 | Full delivery: `ln-200-scope-decomposer`, `ln-230-story-prioritizer` (RICE), `ln-400-story-executor` (auto pipeline), `ln-501-code-quality-checker` (DRY/KISS/YAGNI), `ln-621-security-auditor`, `ln-624-code-quality-auditor` (cyclomatic complexity), `ln-628-concurrency-auditor` (race conditions), `ln-640-pattern-evolution-auditor` |
| 4 | glebis/claude-skills | https://github.com/glebis/claude-skills | 28 | Personal/productivity: `Doctor G` (health research), `De-AI Text Humanizer`, `Decision Toolkit` (7 frameworks), `Deep Research`, `Presentation Generator`, `Retrospective` |
| 5 | ckelsoe/claude-skill-prompt-architect | https://github.com/ckelsoe/claude-skill-prompt-architect | 1 | Meta-prompt: transforms vague prompts into structured expert prompts using 7 frameworks (CO-STAR, RISEN, RISE-IE, etc.) with quality scoring |
| 6 | baz-scm/awesome-reviewers | https://github.com/baz-scm/awesome-reviewers | 3,000+ | Code review prompts distilled from real open-source review comments. YAML files in `_reviewers/`. Covers 100+ languages. Includes `tools/awesome2claude.py` CLI to export as Claude Skills. |

### 1.3 Copilot Prompt Files (`.github/prompts/*.prompt.md`)

These are executable prompt files that VS Code Copilot runs when invoked.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | GitHub Official: review-code | https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/review-code | Agent mode prompt. Role: "senior software engineer." Reviews Security, Performance, Code Quality, Architecture, Testing. Output: Critical Issues, Suggestions, Good Practices with line refs and code fixes. |
| 2 | GitHub Official: generate-unit-tests | https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/generate-unit-tests | Generates 5-8 tests: Core Functionality, Input Validation, Error Handling, Side Effects. AAA pattern. Uses `${input:function_name}` and `${input:framework}` variables. |
| 3 | jim60105/copilot-prompt | https://github.com/jim60105/copilot-prompt/blob/master/.github/prompts/create-plan.prompt.md | Planning: "We are at planning stage so don't start to implement anything!" Uses `#search`, `#codebase`, `#list_issues`. Creates GitHub issues via `#issue_write`. Output in Traditional Chinese. |
| 4 | github/awesome-copilot | https://github.com/github/awesome-copilot/blob/main/prompts/suggest-awesome-github-copilot-prompts.prompt.md | Meta-prompt: discovers and suggests relevant prompt files for current repo. 138 total prompt files in collection. |
| 5 | Code-and-Sorts/awesome-copilot-agents | https://github.com/Code-and-Sorts/awesome-copilot-agents | Full lifecycle: `prd-creation.prompt.md`, `task-generation.prompt.md`, `task-execution.prompt.md`, `architect.agent.md`, `clean-code.agent.md`, `debugger.agent.md`. Language instructions for C, C#, C++, Go, Java, JS, Kotlin, Lua, Python, Rust, Swift, TypeScript. Framework instructions for Azure Functions, Express, Cobra CLI, Terraform. |

### 1.4 System Prompts Embedded in Code

Actual prompt text hardcoded in source files — what the LLM actually receives.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | coderabbitai/ai-pr-reviewer | https://github.com/coderabbitai/ai-pr-reviewer/blob/main/src/prompts.ts | PR review system prompt in TypeScript. Triage prompt classifies PR changes. Summarize prompt generates structured YAML (type, bullet descriptions, title). Review prompt includes optional modules for ticket compliance, effort estimation, security assessment, TODO scanning, PR splitting. |
| 2 | qodo-ai/pr-agent | https://github.com/qodo-ai/pr-agent/blob/main/pr_agent/settings/pr_description_prompts.toml | TOML-formatted prompts. PR type classification (bug fix, tests, enhancement, etc.), 1-4 prioritized descriptions, concise title. Reviewer prompt includes effort estimation (1-5 scale), security vulnerability assessment. |
| 3 | xai-org/grok-prompts | https://github.com/xai-org/grok-prompts/blob/main/grok4_system_turn_prompt_v8.j2 | **The actual Grok 4 system prompt** — Jinja2 template. Safety instructions, disallowed activities, web/X searching, mathematics, subjective query handling. |
| 4 | anthropics/claude-code-security-review | https://github.com/anthropics/claude-code-security-review | `claudecode/prompts.py` — Security review prompts. Flags vulnerabilities >80% exploitation certainty. Excludes DOS, disk-stored secrets, rate limiting. Categories: input validation, auth, crypto, injection, data exposure. Structured JSON output with confidence 0.7-1.0. |
| 5 | openai/codex | https://github.com/openai/codex/blob/main/codex-rs/core/prompt.md | **The actual Codex CLI system prompt.** Instructions for precise, safe coding. Reads AGENTS.md for project guidance. Plans complex tasks, validates through testing. |
| 6 | CharlesCreativeContent/toolhouse-examples | https://github.com/CharlesCreativeContent/toolhouse-examples/blob/main/system_prompts.py | Python file with real system prompts: `customer_agent_prompt` (280 char max, timezone-aware), `blog_prompt` ("BloggerGPT" with exclusion list banning "delve," "synergy," etc.), `pet_care_prompt` (500 char max with search). |
| 7 | samrawal/langchain-prompts | https://github.com/samrawal/langchain-prompts | **Actual LangChain default prompts** extracted from core. SQL expert prompts for GoogleSQL, MySQL, PostgreSQL, Oracle with `{top_k}` templating. |
| 8 | brexhq/prompt-engineering | https://github.com/brexhq/prompt-engineering/blob/main/README.md | **Brex's production prompt patterns.** Travel booking assistant embedding company policy (airline classes, car rental limits, lodging rates) in table format. |

### 1.5 CI/CD & GitHub Actions Prompts

Prompts that run automatically in pipelines — actual text sent to LLMs.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | anthropics/claude-code-action | https://github.com/anthropics/claude-code-action/blob/main/.github/workflows/claude-review.yml | Anthropic's own PR review workflow. Command: `/review-pr REPO: ${{ github.repository }} PR_NUMBER: ${{ github.event.pull_request.number }}`. Targets Claude Opus 4.6. |
| 2 | snarktank/ai-pr-review | https://github.com/snarktank/ai-pr-review | System prompt: "Review this patch like a thoughtful senior engineer. Focus on security vulnerabilities, performance issues, and code quality. Be concise and constructive." |
| 3 | actions/ai-inference | https://github.com/actions/ai-inference | **Official GitHub Action for AI inference.** Default: "You are a helpful assistant." Templates: `messages: [{role: system, content: "Be as concise as possible"}, {role: user, content: "Compare {{a}} and {{b}}, please"}]`. GitHub tools: "List my open pull requests and create a summary." |
| 4 | FidelusAleksander/prompt-action | https://github.com/FidelusAleksander/prompt-action | GitHub Action with persona support: `system-prompt: 'You are Gilfoyle from Silicon Valley.'` Templating: `"You are a {{ language }} expert translator."` |
| 5 | tmokmss/bedrock-pr-reviewer | https://github.com/tmokmss/bedrock-pr-reviewer | AWS Bedrock Claude PR reviewer. System: "You are `/reviewbot`... a highly experienced DevRel professional with focus on cloud-native infrastructure." |
| 6 | promptfoo/promptfoo | https://github.com/promptfoo/promptfoo/blob/main/examples/custom-grading-prompt/promptfooconfig.yaml | LLM testing framework. `llm-rubric` assertion prompts evaluate outputs against criteria with scoring. |

### 1.6 Autonomous Agent Loop Prompts (Ralph Wiggum Pattern)

Prompts designed to be fed repeatedly to an agent for autonomous development.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | ghuntley/how-to-ralph-wiggum | https://github.com/ghuntley/how-to-ralph-wiggum/blob/main/files/PROMPT_build.md | **The original Ralph Wiggum technique.** 16 instructions: "Study specifications using up to 500 parallel Sonnet subagents," implement per specs, run tests, update IMPLEMENTATION_PLAN.md, commit/push. "Use Opus 4.5 with ultrathink for spec inconsistencies." |
| 2 | snarktank/ralph | https://github.com/snarktank/ralph/blob/main/prompt.md | Autonomous agent loop: read PRD + progress log, verify branch, select highest-priority incomplete story, implement, run quality checks (typecheck/lint/test), update docs, commit, mark complete. Signals `<promise>COMPLETE</promise>` when done. |
| 3 | Harper Reed prompt_plan pattern | https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/ | Saves `prompt_plan.md` and `spec.md` in repo. Uses reasoning model (o3) to produce prompts for each step. "Magic" prompt: check plan, find incomplete items, do next task, commit, update plan. |

### 1.7 Spec-Driven Development Prompts

Structured prompts that enforce specification-first workflows.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | github/spec-kit | https://github.com/github/spec-kit/blob/main/spec-driven.md | **GitHub's official toolkit.** Three commands: `/speckit.specify` (creates specs with auto branch), `/speckit.plan` (generates plans with constitutional compliance), `/speckit.tasks` (creates parallelizable task lists). Nine constitutional articles govern generated code. |
| 2 | mosofsky/spec-then-code | https://github.com/mosofsky/spec-then-code | Structured prompts: spec creation, test-first development, completeness checks, traceability. "Plan-Within-A-Plan" recursive decomposition. TDD methodology. Available as Windsurf workflows in `.windsurf/workflows/`. |

### 1.8 Claude Code Hooks (Automated Prompt Injection/Enforcement)

Hooks that inject prompts or block actions — automated prompt behavior.

| # | Repository | URL | Hooks | What's There |
|---|-----------|-----|-------|-------------|
| 1 | disler/claude-code-hooks-mastery | https://github.com/disler/claude-code-hooks-mastery | 13 | All 13 lifecycle events. `PreToolUse`: blocks rm -rf, .env access. `PostToolUse`: runs Ruff, type checking. `UserPromptSubmit`: validates prompts, injects context. `Stop`: AI-powered completion messages with TTS. `PreCompact`: transcript backups. |
| 2 | nizos/tdd-guard | https://github.com/nizos/tdd-guard | 3 | TDD enforcement: blocks implementation without failing tests, prevents over-engineering. Supports Jest, Vitest, pytest, PHPUnit, Go, Rust. |
| 3 | decider/claude-hooks | https://github.com/decider/claude-hooks | 3+ | Code quality: max function 30 lines, max file 200 lines, max nesting 4 levels. Package age checker (blocks >180 days). Task completion notifier. |
| 4 | carlrannaberg/claudekit | https://github.com/carlrannaberg/claudekit | 12+ | `file-guard` (blocks 195+ sensitive patterns), `typecheck-changed`/`lint-changed`/`test-changed`, `check-any-changed` (forbids TypeScript `any`), `check-comment-replacement`, `codebase-map` (invisible context injection), `thinking-level` (enhances reasoning), `self-review` |
| 5 | johnlindquist/claude-hooks | https://github.com/johnlindquist/claude-hooks | SDK | TypeScript hook framework with typed payloads. Generates settings.json, hooks/index.ts, hooks/lib.ts. |

### 1.9 Multi-Artifact Showcases

Repos combining multiple prompt artifact types.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | ChrisWiles/claude-code-showcase | https://github.com/ChrisWiles/claude-code-showcase | Skills (`testing-patterns/SKILL.md`, `core-components/SKILL.md`), agents (`code-reviewer.md`), commands (`/ticket`, `/onboard`), hooks (branch protection, auto-format), GitHub Action (`pr-claude-code-review.yml`) |
| 2 | EveryInc/compound-engineering-plugin | https://github.com/EveryInc/compound-engineering-plugin | "Compound engineering" methodology: `/workflows:plan` (ideas → plans), `/workflows:work` (execute with worktrees), `/workflows:review` (multi-agent review), `/workflows:compound` (document learnings). Plan, work, review, compound, repeat. |

### 1.10 Executable AI Prompt Files

Prompts made executable like shell scripts.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | andisearch/airun | https://github.com/andisearch/claude-switcher | `#!/usr/bin/env ai` shebang followed by natural language. Example: "Analyze my codebase and summarize the architecture." Unix pipe support: `#!/usr/bin/env claude-run` with "Summarize the following git commits in plain Japanese." |

---

## 2. Configuration/Context Files

These are injected into LLM context automatically but NOT typed by developers as prompts. They provide project context, coding standards, and behavioral constraints. Useful for understanding how developers configure AI behavior, but distinct from actual prompts.

### 2.1 CLAUDE.md Files (42 cataloged)

Project-level instructions automatically loaded by Claude Code.

#### Major Open-Source Projects

| # | Project | URL | Contents Summary |
|---|---------|-----|-----------------|
| 1 | astral-sh/ruff | https://github.com/astral-sh/ruff/blob/main/CLAUDE.md | Rust linter/formatter. Repo structure, crate naming (ruff_* vs ty_*), testing (nextest), Clippy, PR standards, mandatory testing, `#[expect()]` over `#[allow()]` |
| 2 | excalidraw/excalidraw | https://github.com/excalidraw/excalidraw/blob/master/CLAUDE.md | Virtual whiteboard. Monorepo structure, 4-step dev workflow, key commands, Yarn workspaces, esbuild vs Vite, strict TypeScript |
| 3 | zed-industries/zed | https://github.com/zed-industries/zed/blob/main/CLAUDE.md | Code editor. Pointer file — delegates to `.rules` files |
| 4 | cloudflare/workers-sdk | https://github.com/cloudflare/workers-sdk/blob/main/CLAUDE.md | Workers SDK. Pointer file — references `@AGENTS.md` |
| 5 | langchain-ai/langgraph | https://github.com/langchain-ai/langgraph/blob/main/CLAUDE.md | Agent framework. 8 libraries in monorepo, dependency map, make commands, single backticks in docstrings |
| 6 | supabase/supabase-js | https://github.com/supabase/supabase-js/blob/master/CLAUDE.md | JS SDK. 6 packages architecture, backward compatibility, hybrid release model, Jest + Docker, 7 common pitfalls |
| 7 | grafana/pyroscope | https://github.com/grafana/pyroscope/blob/main/CLAUDE.md | Profiling. Go architecture (distributors/ingesters/compactors/queriers), Go 1.24+, gRPC, Parquet, React frontend, 10 anti-patterns |
| 8 | grafana/alloy | https://github.com/grafana/alloy/blob/main/CLAUDE.md | OTel collector. Pointer — references `.docs/agent/role.md`, `.docs/agent/grafana.md`, `.docs/agent/style.md` |
| 9 | getsentry/sentry-java | https://github.com/getsentry/sentry-java/blob/main/CLAUDE.md | Java SDK. Gradle, essential commands, module architecture, Java 8+ and Kotlin guidelines, scopes/deduplication/OpenTelemetry |
| 10 | modelcontextprotocol/python-sdk | https://github.com/modelcontextprotocol/python-sdk/blob/main/CLAUDE.md | MCP Python SDK. uv exclusively, type hints, docstrings, 120 char, pytest + anyio, ruff 88-char, git trailers |
| 11 | modelcontextprotocol/typescript-sdk | https://github.com/modelcontextprotocol/typescript-sdk/blob/main/CLAUDE.md | MCP TS SDK. pnpm, breaking changes migration guide, Zod v4, 3-layer architecture (Types/Protocol/Client-Server), transport systems |
| 12 | PostHog/Twig | https://github.com/PostHog/Twig/blob/main/CLAUDE.md | Desktop app. pnpm + turbo, Electron (main + renderer), Zustand, React 19, Radix UI, TanStack Query, Vitest + Playwright |
| 13 | PostHog/posthog-foss | https://github.com/PostHog/posthog-foss/blob/master/CLAUDE.md | Analytics. Pointer — references `@AGENTS.md` |
| 14 | vercel/next-devtools-mcp | https://github.com/vercel/next-devtools-mcp/blob/main/CLAUDE.md | MCP server. pnpm, vitest + Anthropic API, tools/prompts/resources architecture |
| 15 | neondatabase/mcp-server-neon | https://github.com/neondatabase/mcp-server-neon/blob/main/CLAUDE.md | Neon MCP. 10 sections: Next.js architecture, Bun, MCP server factory, OAuth, 4-step tool walkthrough, Vercel deployment |

#### Notable Developer Tools

| # | Project | URL | Contents Summary |
|---|---------|-----|-----------------|
| 16 | anthropics/claude-code-action | https://github.com/anthropics/claude-code-action/blob/main/CLAUDE.md | GitHub Action. Bun, auth priority, mode lifecycle, prompt construction, strict TypeScript, discriminated unions |
| 17 | anthropics/anthropic-quickstarts | https://github.com/anthropics/anthropic-quickstarts/blob/main/CLAUDE.md | Quickstarts. Per-project instructions for computer-use demo, customer support agent, financial data analyst |
| 18 | prescient-design/lobster | https://github.com/prescient-design/lobster/blob/main/CLAUDE.md | Protein LMs. 5 model architectures, Hydra config, uv, Python 3.10+ |
| 19 | foambubble/foam | https://github.com/foambubble/foam/blob/main/CLAUDE.md | Knowledge management. FoamWorkspace/FoamGraph/ResourceProvider architecture, research-plan-implement-validate workflow |
| 20 | humanlayer/humanlayer | https://github.com/humanlayer/humanlayer/blob/main/CLAUDE.md | Human-in-loop AI. TypeScript + Go SDKs, hld daemon, hlyr CLI, priority-based TODO (levels 0-4) |
| 21 | petyosi/react-virtuoso | https://github.com/petyosi/react-virtuoso/blob/master/CLAUDE.md | React lists. urx reactive state, Playwright + Ladle, lefthook git hooks |
| 22 | CommE2E/comm | https://github.com/CommE2E/comm/blob/master/CLAUDE.md | Encrypted messaging. Flow typing, `*.react.js` naming, Prettier 80 char, kebab-case filenames |
| 23 | storybookjs/react-native | https://github.com/storybookjs/react-native/blob/next/CLAUDE.md | RN Storybook. Yarn + Lerna, tsup + Metro, Component Story Format, WebSocket remote |
| 24 | hyochan/react-native-iap | https://github.com/hyochan/react-native-iap/blob/main/CLAUDE.md | In-app purchase. Nitro Modules, StoreKit 2 + Play Billing, Yarn 3, Angular Conventional Commits |
| 25 | pydantic/genai-prices | https://github.com/pydantic/genai-prices/blob/main/CLAUDE.md | LLM pricing DB. YAML data → Python pipeline → published package, Helicone/OpenRouter/LiteLLM sources |
| 26 | gaearon/overreacted.io | https://github.com/gaearon/overreacted.io/blob/main/CLAUDE.md | Dan Abramov's blog. Next.js 15 + React 19. Personality-driven commit messages: "write as a humble but experienced engineer, avoid robot speak" |
| 27 | eastlondoner/vibe-tools | https://github.com/eastlondoner/vibe-tools/blob/main/CLAUDE.md | CLI for AI agents. "Don't ask me for permission to do stuff." Commands: ask, plan, web, repo, doc, YouTube, GitHub, ClickUp, MCP, browser, Xcode |

#### Smaller / Specialized Projects

| # | Project | URL | Contents Summary |
|---|---------|-----|-----------------|
| 28 | rand/rlm-claude-code | https://github.com/rand/rlm-claude-code/blob/main/CLAUDE.md | Recursive LM. 5-phase architecture, REPL helpers, 50-line function limit, Google docstrings |
| 29 | omar-dulaimi/prisma-trpc-shield-generator | https://github.com/omar-dulaimi/prisma-trpc-shield-generator/blob/master/CLAUDE.md | Prisma generator. Integration testing, DMMF parsing, shield construction |
| 30 | thecodecrate/python-pipeline | https://github.com/thecodecrate/python-pipeline/blob/main/CLAUDE.md | Pipeline pattern. Concerns pattern, Protocol contracts, async, uv + pytest + ruff |
| 31 | open-responses/open-responses | https://github.com/open-responses/open-responses/blob/main/CLAUDE.md | Self-hosted Responses API. Go/Python/Node.js code style, `CLAUDE-{type}-{descriptor}` navigation markers |
| 32 | ruvnet/claude-flow | https://github.com/ruvnet/claude-flow/blob/main/CLAUDE.md | Agent orchestration. Multi-agent swarms, distributed workflows |

#### Personal Global Configs

| # | Source | URL | Contents Summary |
|---|--------|-----|-----------------|
| 33 | wshobson global | https://gist.github.com/wshobson/011992e50f39e48600917ddc0db389f4 | `~/.claude/CLAUDE.md`. Orchestration rules, memory.md, decisions.md, custom subagents |
| 34 | ctoth global | https://gist.github.com/ctoth/d8e629209ff1d9748185b9830fa4e79f | Personal development preferences and workflow rules |
| 35 | gregsantos | https://gist.github.com/gregsantos/2fc7d7551631b809efa18a0bc4debd2a | Next.js + TypeScript + Tailwind + shadcn + React Query stack guidelines |

### 2.2 AGENTS.md Files (Cross-Tool Standard)

Emerging cross-tool standard stewarded by Linux Foundation / Agentic AI Foundation.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | openai/codex | https://github.com/openai/codex/blob/main/AGENTS.md | Codex codebase itself. Extremely detailed Rust conventions, inline format args, exhaustive match, pretty_assertions, ratatui Stylize, insta snapshot tests, camelCase wire format, cursor pagination. "Run `just fmt` automatically after finishing Rust changes; do not ask for approval." |
| 2 | github/awesome-copilot | https://github.com/github/awesome-copilot/blob/main/AGENTS.md | Structure definitions for agents (.agent.md), prompts (.prompt.md), instructions (.instructions.md), skills (SKILL.md). PR and code review checklists. |
| 3 | Dicklesworthstone/agentic_coding_flywheel_setup | https://github.com/Dicklesworthstone/agentic_coding_flywheel_setup/blob/main/AGENTS.md | Core rule: "If I tell you to do something, even if it goes against what follows below, YOU MUST LISTEN TO ME." Never delete files without per-session approval. Bun exclusively. MCP Agent Mail for multi-agent file reservations. Generated files read-only. |
| 4 | vercel/next.js | (referenced in earlier agent) | Next.js monorepo. Turbopack, test conventions, codemod patterns |

### 2.3 .cursorrules / .cursor/rules/*.mdc Files

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | grapeot/devin.cursorrules | https://github.com/grapeot/devin.cursorrules/blob/master/.cursorrules | "Turn Cursor/Windsurf into 90% of Devin." Scratchpad with `[X]`/`[ ]` todos. 4 tools: screenshot, LLM queries, web scraper, search. Learned lessons section. |
| 2 | agno-agi/agno | https://github.com/agno-agi/agno/blob/main/.cursorrules | AI agent framework. "NEVER create agents in loops." PostgreSQL for production. 3 patterns: single agent (90%), teams, workflows. |
| 3 | haydenbleasel/next-forge | https://github.com/haydenbleasel/next-forge/blob/main/.cursorrules.example | "You are a senior software engineer." Iteration over duplication, descriptive names with auxiliary verbs, unit + E2E tests, CSP, input sanitization. |
| 4 | DVC2/cursor_prompts | https://github.com/DVC2/cursor_prompts | 11+ MDC rules: `memory-management.mdc`, `session-coordinator.mdc`, `debugging.mdc`, `efficiency.mdc`, `audit.mdc`, `javascript.mdc`, `typescript.mdc`, `ADR.mdc` |
| 5 | instructa/ai-prompts | https://github.com/instructa/ai-prompts/tree/main/prompts | 97 technology stacks: Angular 19, React 18/19, Vue 3, Svelte 5, Next.js 15, Auth0/Clerk, Prisma/Drizzle/Neon, Firebase/Supabase, Tailwind 4, Flutter, Laravel 11. Cross-tool (Cursor + Windsurf + Copilot). |

### 2.4 Aider Conventions

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | Aider-AI/conventions (Next.js/TS) | https://github.com/Aider-AI/conventions/blob/main/nextjs-ts/CONVENTIONS.md | "Senior Front-End Developer" persona. Step-by-step pseudocode before implementation. DRY, Material UI, `handle` prefix for events, accessibility. |
| 2 | Aider-AI/conventions (Go) | https://github.com/Aider-AI/conventions/blob/main/golang/CONVENTIONS.md | Complete Go project structure (/cmd, /internal, /pkg). Functions under 30 lines, centralized error handling, error wrapping. |
| 3 | Aider-AI/conventions (others) | https://github.com/Aider-AI/conventions | bash-scripts, flutter, functional-programming, icalendar-events, moodle500 |

### 2.5 Windsurf Rules

| # | Source | URL | What's There |
|---|--------|-----|-------------|
| 1 | mberman84 | https://gist.github.com/mberman84/19e184e3a3a4c3a20f32a18af51ce3bc | 5 sections: Project Approach, Code Quality (files <300 lines), Dev Workflow (kill servers before starting new), Version Control (no .env commits), Best Practices |
| 2 | obviousworks/vibe-coding-ai-rules | https://github.com/obviousworks/vibe-coding-ai-rules | Templates + adaptation prompts for generating project-specific rules |

### 2.6 Cline Rules

| # | Source | URL | What's There |
|---|--------|-----|-------------|
| 1 | cline/prompts | https://github.com/cline/prompts/blob/main/.clinerules/writing-effective-clinerules.md | Meta-rule. 4 rule types: Informational, Process, Behavioral, Meta. "Use MUST for absolute requirements." `<thinking>` blocks for AI verification. |
| 2 | nickbaumann98/cline_docs | https://github.com/nickbaumann98/cline_docs/blob/main/prompting/custom%20instructions%20library/cline-memory-bank.md | "My memory resets completely between sessions." 6 required files: projectbrief, productContext, activeContext, systemPatterns, techContext, progress. Plan Mode vs Act Mode. |

### 2.7 Copilot Instructions (`.github/copilot-instructions.md`)

| # | Source | URL | What's There |
|---|--------|-----|-------------|
| 1 | GitHub official example | https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot | "We use Bazel for managing our Java dependencies, not Maven... We always write JavaScript with double quotes and tabs... Our team uses Jira." |
| 2 | yf-yang/v0-copilot | https://github.com/yf-yang/v0-copilot/blob/main/.github/copilot-instructions.md | Wireframe-to-React. Single static JSX with hardcoded data. 50+ UI components. "Incomplete content such as `// TODO` should never appear." |

---

## 3. Collection & Aggregation Repos

Meta-resources that aggregate or curate prompts from many sources.

| # | Repository | URL | Stars | What's There |
|---|-----------|-----|-------|-------------|
| 1 | x1xhlol/system-prompts-and-models-of-ai-tools | https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools | 114K | Leaked/extracted system prompts from major AI tools (ChatGPT, Claude, Gemini, Copilot, Cursor, etc.) |
| 2 | PatrickJS/awesome-cursorrules | https://github.com/PatrickJS/awesome-cursorrules | 37.7K | Curated .cursorrules files organized by technology |
| 3 | hesreallyhim/awesome-claude-code | https://github.com/hesreallyhim/awesome-claude-code | 21.9K | Curated Claude Code resources including CLAUDE.md files, commands, skills, hooks |
| 4 | github/awesome-copilot | https://github.com/github/awesome-copilot | 20.3K | Official GitHub collection of 138 prompt files, agents, instructions, skills |
| 5 | josix/awesome-claude-md | https://github.com/josix/awesome-claude-md | ~500 | Links to 37+ CLAUDE.md files with analyses and best practices |
| 6 | ArthurClune/claude-md-examples | https://github.com/ArthurClune/claude-md-examples | — | Templates for Python, Terraform, Hugo |
| 7 | abhishekray07/claude-md-templates | https://github.com/abhishekray07/claude-md-templates | — | Templates for Next.js/React, Python/FastAPI, generic |
| 8 | davila7/claude-code-templates | https://github.com/davila7/claude-code-templates/blob/main/CLAUDE.md | — | CLI tool for configuring Claude Code + its own CLAUDE.md |

### Meta-Tools for Managing Multiple Config Formats

| # | Tool | URL | What It Does |
|---|------|-----|-------------|
| 1 | block/ai-rules | https://github.com/block/ai-rules | Manages rules for 10+ AI coding tools from single source |
| 2 | botingw/rulebook-ai | https://github.com/botingw/rulebook-ai | Universal rules across 21+ AI tools |
| 3 | rulesync (npm) | https://www.npmjs.com/package/rulesync | npm package: syncs rules across AI tools |
| 4 | ai-rulez (PyPI) | https://pypi.org/project/ai-rulez/ | Python package: manages AI coding rules |

---

## 4. Cross-Platform Findings

### 4.1 GitHub Gists (51 found)

Gists contain personal configs, snippets, and one-off prompts. Most notable:

| # | Author | URL | What's There |
|---|--------|-----|-------------|
| 1 | wshobson | https://gist.github.com/wshobson/011992e50f39e48600917ddc0db389f4 | Global CLAUDE.md with orchestration rules |
| 2 | ctoth | https://gist.github.com/ctoth/d8e629209ff1d9748185b9830fa4e79f | Personal global CLAUDE.md |
| 3 | gregsantos | https://gist.github.com/gregsantos/2fc7d7551631b809efa18a0bc4debd2a | Next.js stack CLAUDE.md |
| 4 | mberman84 | https://gist.github.com/mberman84/19e184e3a3a4c3a20f32a18af51ce3bc | .windsurfrules template |

### 4.2 GitLab (9 found)

| # | Project | What's There |
|---|---------|-------------|
| 1 | Various | `.cursorrules` files mirroring GitHub patterns |
| 2 | GitLab CI templates | AI-integrated CI/CD configurations |
| 3-9 | Various | Sparse adoption; most AI prompt activity is on GitHub |

### 4.3 npm Packages (7 found)

| # | Package | URL | What It Does |
|---|---------|-----|-------------|
| 1 | rulesync | https://www.npmjs.com/package/rulesync | Syncs AI coding rules across tools |
| 2-7 | Various | Cursor/AI rule management packages |

### 4.4 PyPI Packages (2 found)

| # | Package | URL | What It Does |
|---|---------|-----|-------------|
| 1 | ai-rulez | https://pypi.org/project/ai-rulez/ | Python AI coding rules management |
| 2 | Various | Prompt template management |

### 4.5 Other Platforms

- **Bitbucket:** Nearly nothing found
- **SourceHut:** Nearly nothing found
- **Codeberg:** Nearly nothing found
- **Pastebin:** 7 items (prompt snippets, mostly AI art prompts not SE)
- **crates.io:** 2 Rust packages for AI rule management

---

## Summary Statistics

| Category | Count | Most Verbatim? |
|----------|-------|---------------|
| Slash commands (Claude Code) | ~700+ across 9 repos | **YES** — executed as typed |
| Skills (Claude Code) | ~150+ across 6 repos | Semi — loaded as context |
| Copilot prompt files | ~160+ across 5 repos | **YES** — executed by agent |
| System prompts in code | 8 repos | **YES** — hardcoded prompt text |
| CI/CD workflow prompts | 6 repos | **YES** — sent to LLM in pipeline |
| Agent loop prompts (Ralph Wiggum) | 3 repos | **YES** — fed to agent repeatedly |
| Spec-driven prompts | 2 repos | **YES** — executed as commands |
| Hooks | 30+ across 5 repos | Automated enforcement |
| CLAUDE.md files | 42 files | No — configuration context |
| AGENTS.md files | 4 files | No — configuration context |
| .cursorrules / .cursor/rules | 56+ entries | No — configuration context |
| Aider conventions | 7+ files | No — configuration context |
| Windsurf rules | 2+ files | No — configuration context |
| Cline rules | 2+ repos | No — configuration context |
| Copilot instructions | 2+ files | No — configuration context |
| Collection/aggregation repos | 8+ repos | Meta — pointers to others |
| Cross-platform (Gists, GitLab, npm, PyPI) | 70+ items | Mixed |

### Highest-Priority Items for Deep Dive

Based on the user's focus on **actual prompts developers type**, these are the richest sources:

1. **danielrosehill/Claude-Slash-Commands** (357 commands) — Largest single collection of executable prompts
2. **qdhenry/Claude-Command-Suite** (148 commands) — Full SDLC coverage
3. **github/awesome-copilot** (138 prompt files) — Official GitHub collection
4. **levnikolaevich/claude-code-skills** (85 skills) — Full delivery pipeline
5. **Comfy-Org/comfy-claude-prompt-library** (80+ commands) — Real production team
6. **wshobson/commands** (57 commands) — Production-ready workflows
7. **baz-scm/awesome-reviewers** (3,000+ review prompts) — Distilled from real reviews
8. **Code-and-Sorts/awesome-copilot-agents** — Full lifecycle prompts + agents
9. **trailofbits/skills** (16+ skills) — Professional security research
10. **obra/superpowers** (14+ skills) — Development methodology framework

---

## Source Agent Attribution

This catalog was compiled from 8 parallel search agents:

1. **ab26910** — CLAUDE.md files on GitHub (42 files)
2. **a89900b** — .cursorrules files (56 entries)
3. **a25bf4c** — AGENTS.md, copilot-instructions, windsurfrules, etc. (50+ files)
4. **ac3cbd4** — Prompt collection repos and awesome lists (49 repos)
5. **a62a543** — Real prompt files in project repos (33 distinct prompt files/patterns)
6. **a25e597** — GitLab, Gists, npm, PyPI, other platforms (92 items)
7. **af9d58f** — SE-specific prompt patterns across repos (42 prompts)
8. **a277663** — Claude commands, skills, hooks (50+ artifacts across 30+ repos)

---

## Wave 2 Deep Dive

A second sweep of 8 additional agents found significantly more content. See **[repository-prompt-catalog-wave2.md](repository-prompt-catalog-wave2.md)** for:

- 64 additional Claude Code command repos (~500+ new commands)
- 18 Copilot ecosystem repos (prompts, agents, chatmodes, skills)
- 24 production system prompts hardcoded in coding tools (Aider, Bolt.new, Cline, GPT-Engineer, OpenHands, SWE-agent, Fabric's 243 patterns, etc.)
- 16 AI framework prompt patterns (CrewAI, AutoGen, LangGraph, DSPy, Semantic Kernel, Pydantic AI, etc.)
- 34 CI/CD repos with prompts sent to LLMs in pipelines
- 49 autonomous agent/workflow repos (9 Ralph Wiggum implementations, 7 spec-driven frameworks, 6 multi-agent orchestration systems)
- 30 personal dotfiles repos with authentic daily-driver AI configs
- 40+ SE activity-specific prompt repos (code review, TDD, refactoring, security, DevOps, etc.)
