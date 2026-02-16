# Repository Prompt Catalog — Wave 2 (Deep Dive)

**Date:** 2026-02-07
**Purpose:** Second sweep of code repositories for real developer prompts, expanding on [repository-prompt-catalog.md](repository-prompt-catalog.md). Focus: deeper discovery of executable prompts, production system prompts, AI framework patterns, CI/CD prompts, autonomous agent workflows, and personal developer configurations.

**How to use this catalog:** Same classification as Wave 1 — actual executable prompts vs. configuration/context files. Each entry includes URL, what's there, and whether it contains text that is actually sent to an LLM.

---

## Table of Contents

1. [Additional Slash Command Collections](#1-additional-slash-command-collections) — 64 new repos
2. [Copilot Ecosystem Expansion](#2-copilot-ecosystem-expansion) — 18 new repos
3. [Production System Prompts in Source Code](#3-production-system-prompts-in-source-code) — 24 tools
4. [AI Framework Prompt Patterns](#4-ai-framework-prompt-patterns) — 16 frameworks
5. [CI/CD & GitHub Actions Prompts](#5-cicd--github-actions-prompts) — 34 repos
6. [Autonomous Agent & Workflow Prompts](#6-autonomous-agent--workflow-prompts) — 49 repos
7. [Personal Dotfiles & Configs with Prompts](#7-personal-dotfiles--configs-with-prompts) — 30 repos
8. [SE Activity-Specific Prompt Repos](#8-se-activity-specific-prompt-repos) — 40+ repos
9. [Updated Summary Statistics](#9-updated-summary-statistics)

---

## 1. Additional Slash Command Collections

64 new repos containing Claude Code slash commands (`.claude/commands/`). Organized by type.

### 1.1 Dedicated Slash Command Collections

| # | Repository | URL | Commands | What's There |
|---|-----------|-----|----------|-------------|
| 1 | avifenesh/awesome-slash | https://github.com/avifenesh/awesome-slash | 11 plugins, 40 agents, 26 skills | Cross-platform plugin for Claude Code, OpenCode, Codex. `/next-task`, `/ship`, `/deslop` (AI artifact removal), `/perf`, `/drift-detect`, `/audit-project`, `/enhance`, `/repo-map`, `/sync-docs`, `/learn`, `/agnix` (agent config linting) |
| 2 | david-t-martel/claude-commands | https://github.com/david-t-martel/claude-commands | 52 | Fork of wshobson/commands. 14 workflows + 38 tools. Feature development, review, DevOps/infrastructure, AI/ML, security, debugging, subagent orchestration |
| 3 | vshishth/claude-custom-commands | https://github.com/vshishth/claude-custom-commands | 17 | 4 categories: Development (architecture, code-review, debug, refactor, test-generator), Productivity (daily-standups, git-commit, meeting-notes, project-plan, task-breakdown), Analysis (code-quality, dependency, performance, security-audit), Writing (code-comments, documentation, release-notes, technical-spec, user-stories) |
| 4 | hikarubw/claude-commands | https://github.com/hikarubw/claude-commands | 6 | `/user:init`, `/user:check`, `/user:plan`, `/user:push`, `/user:handover`, `/user:research` |
| 5 | badlogic/claude-commands | https://github.com/badlogic/claude-commands | 3 | Human-agent collaborative workflows implementing state machine (INIT, SELECT, REFINE, IMPLEMENT, COMMIT). `todo-worktree.md`, `todo-branch.md`, `publish.md`. Zero dependencies |
| 6 | arach/claude-roadmap-commands | https://github.com/arach/claude-roadmap-commands | 4 | `/project:roadmap`, `/project:progress`, `/project:next`, `/user:roadmap` |
| 7 | wanpengxie/deepdive | https://github.com/wanpengxie/deepdive | 1 | `/deepdive` — Deep iterative thinking with explicit todo lists, multi-round exploratory reasoning, non-linear problem-solving |
| 8 | jeremyeder/claude-slash | https://github.com/jeremyeder/claude-slash | ~10 | Dual Python + Markdown command system. Repository management, interactive TUI config editor (menuconfig-style), learning/help systems |
| 9 | brennercruvinel/CCPlugins | https://github.com/brennercruvinel/CCPlugins | 24 | Enterprise-grade. `/review`, `/cleanproject`, more. Optimized for Opus 4 and Sonnet 4 |
| 10 | alexanderop/claude-code-builder | https://github.com/alexanderop/claude-code-builder | 7 | Meta-tool: `create-skill`, `create-agent`, `create-command`, `create-hook`, `create-plugin`, `create-md`, `create-output-style` |
| 11 | artemgetmann/claude-slash-commands | https://github.com/artemgetmann/claude-slash-commands | 3 | `/add-command`, `/askgpt5-web-search`, `/system-prompt-editor` |
| 12 | hiteshbedre/claude-custom-slash-commands | https://github.com/hiteshbedre/claude-custom-slash-commands | 1+ | `/modularize` with 7 more planned |

### 1.2 Comprehensive Config Repos with Commands

| # | Repository | URL | Commands | What's There |
|---|-----------|-----|----------|-------------|
| 1 | rohitg00/awesome-claude-code-toolkit | https://github.com/rohitg00/awesome-claude-code-toolkit | 42 | Plus 135 agents, 35 skills, 120 plugins, 19 hooks. 8 command categories |
| 2 | SuperClaude-Org/SuperClaude_Framework | https://github.com/SuperClaude-Org/SuperClaude_Framework | 30 | All `/sc:` namespaced. Planning/Design, Development, Testing/Quality, Documentation, Version Control, Project Management, Research/Analysis, Utilities. 16 domain specialist agents |
| 3 | affaan-m/everything-claude-code | https://github.com/affaan-m/everything-claude-code | 24 | Anthropic hackathon winner. `/tdd`, `/plan`, `/e2e`, `/code-review`, `/build-fix`, Go-specific, multi-agent (`/multi-plan`, `/multi-execute`), learning system (`/learn`, `/instinct-*`, `/evolve`), PM2 lifecycle |
| 4 | Yeachan-Heo/oh-my-claudecode | https://github.com/Yeachan-Heo/oh-my-claudecode | 31+ | Multi-agent orchestration. 5 execution modes (Autopilot, Ultrapilot, Swarm, Pipeline, Ecomode), 32 specialized agents |
| 5 | Matt-Dionis/claude-code-configs | https://github.com/Matt-Dionis/claude-code-configs | 25+ | Published as NPM package (`claude-config-composer`). Framework-specific: `/create-page`, `/create-server-action` for Next.js |
| 6 | fcakyon/claude-codex-settings | https://github.com/fcakyon/claude-codex-settings | 20+ | Plugin-based. Azure, GitHub, GCloud, MongoDB, Linear, Playwright, paper search. `/commit-staged`, `/create-pr`, `/review-pr`, `/clean-gone-branches` |
| 7 | feiskyer/claude-code-settings | https://github.com/feiskyer/claude-code-settings | 10+ | 1.2k+ stars. `/think-harder`, `/think-ultra`, `/reflection`, `/reflection-harder`, `/eureka`, `/gh:review-pr`, `/gh:fix-issue`, `/cc:create-command`, `/translate` |
| 8 | rohitg00/pro-workflow | https://github.com/rohitg00/pro-workflow | 7 | `/pro-workflow:wrap-up`, `/pro-workflow:learn-rule`, `/pro-workflow:parallel`, `/pro-workflow:learn`, `/pro-workflow:search`, `/pro-workflow:list`, `/pro-workflow:commit` |

### 1.3 Marketplace & Aggregation Repos

| # | Repository | URL | Commands | What's There |
|---|-----------|-----|----------|-------------|
| 1 | davepoon/buildwithclaude | https://github.com/davepoon/buildwithclaude | 175 | Single hub aggregating commands across 22 categories |
| 2 | ccplugins/awesome-claude-code-plugins | https://github.com/ccplugins/awesome-claude-code-plugins | varies | Curated list with installable plugins via `/plugin marketplace add` |
| 3 | leamas-ai/leamas.sh | https://github.com/leamas-ai/leamas.sh | varies | Package manager for Claude commands/kits |

### 1.4 Project-Specific Repos with Commands

| # | Repository | URL | Commands | What's There |
|---|-----------|-----|----------|-------------|
| 1 | steadycursor/steadystart | https://github.com/steadycursor/steadystart | 12 | Next.js/Prisma/GraphQL starter. Commit operations, Prisma migrations, React components, GraphQL tests |
| 2 | disler/just-prompt | https://github.com/disler/just-prompt | 6 | `context_prime.md`, `context_prime_eza.md`, `jprompt_ultra_diff_review.md`, `project_hello.md` |
| 3 | kingler/n8n_agent | https://github.com/kingler/n8n_agent | 4+ | `/analyze_code`, `/generate_knowledge_graph`, `/optimize_code`, `/evaluate_code_quality` |
| 4 | evmts/tevm-monorepo | https://github.com/evmts/tevm-monorepo | 7 | Ethereum VM TypeScript. Git gitmoji, test matchers, worktree management |
| 5 | OneRedOak/claude-code-workflows | https://github.com/OneRedOak/claude-code-workflows | 3+ | AI-native startup. `/review`, `/design-review`, `/security-review`. Dual-loop code review architecture |
| 6 | danielrosehill/Claude-Code-Linux-Desktop-Slash-Commands | https://github.com/danielrosehill/Claude-Code-Linux-Desktop-Slash-Commands | varies | Linux desktop sysadmin slash commands |

### 1.5 Dotfiles with Commands

| # | Repository | URL | Commands | What's There |
|---|-----------|-----|----------|-------------|
| 1 | atxtechbro/dotfiles | https://github.com/atxtechbro/dotfiles | 4+ | `/close-issue`, `/create-issue`, `/extract-best-frame`, `/retro`. Multi-AI-harness orchestration |
| 2 | citypaul/.dotfiles | https://github.com/citypaul/.dotfiles | 2+ | `/pr`, `/generate-pr-review` |

### 1.6 Domain-Specific Command Collections

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | solanabr/solana-claude-config | https://github.com/solanabr/solana-claude-config | Solana/Web3 development. Agents and commands for Anchor, Pinocchio, Unity, Mobile |
| 2 | mischasigtermans/laravel-altitude | https://github.com/mischasigtermans/laravel-altitude | Laravel TALL stack agents (architect, database, livewire) |
| 3 | kanopi/claude-toolbox | https://github.com/kanopi/claude-toolbox | CMS: Drupal/WordPress plugins |
| 4 | elb-pr/claudikins-kernel | https://github.com/elb-pr/claudikins-kernel | SRE thinking. Strict 4-stage pipeline with gates. Synthetic staff agents |

---

## 2. Copilot Ecosystem Expansion

18 new repos for VS Code Copilot `.prompt.md`, `.agent.md`, `.chatmode.md`, `.instructions.md`, and `SKILL.md` files.

### 2.1 Comprehensive Copilot Collections

| # | Repository | URL | File Types | What's There |
|---|-----------|-----|-----------|-------------|
| 1 | TheSethRose/Copilot-Kit | https://github.com/TheSethRose/Copilot-Kit | 32+ prompts, 8 chatmodes | Language-agnostic. `analyze-requirements`, `audit-security`, `build-dockerfile`, `clean`, `commit`, `debug-react`, `deploy-react-app`, `diagnose-database`, `document-project`, `generate-code`, `generate-issues`, `migrate-database`, `optimize-performance`, `review`, `seed-database`, `think`, `validate-schema`. Chatmodes: debug, planner, postgresql-dba, prd, process-tracking, prompt-engineer, gpt-4.1-coding-agent |
| 2 | PlagueHO/github-copilot-assets-library | https://github.com/PlagueHO/github-copilot-assets-library | instructions, prompts, chatmodes, MCP | Multi-technology library. Angular, ASP.NET, Azure Functions, Bicep, Blazor, C#, Docker, GitHub Actions, Go, Java, Kubernetes, Markdown, Next.js+Tailwind, PowerShell, React.js, Ruby on Rails, TanStack Start+Shadcn |
| 3 | doggy8088/github-copilot-configs | https://github.com/doggy8088/github-copilot-configs | 30+ prompts, 30+ chatmodes, 35+ instructions | Will Bao's curated configs. Syncs daily from awesome-copilot. Complete VS Code settings.json and keybindings.json |
| 4 | SebastienDegodez/copilot-instructions | https://github.com/SebastienDegodez/copilot-instructions | instructions, prompts, chatmodes | .NET focused. DDD, Clean Architecture, testing, Conventional Commits, specification patterns. "APM" (Agent Package Manager) concept with YAML collections |

### 2.2 Agent & Chatmode Collections

| # | Repository | URL | File Types | What's There |
|---|-----------|-----|-----------|-------------|
| 1 | groupzer0/vs-code-agents | https://github.com/groupzer0/vs-code-agents | 13 agents | "Flowbaby" multi-agent workflow. Roadmap, Planner, Analyst, Architect, Critic, Security, Implementer, Code Reviewer, QA, UAT, DevOps, Retrospective, ProcessImprovement |
| 2 | jaktestowac/awesome-copilot-for-testers | https://github.com/jaktestowac/awesome-copilot-for-testers | 7 agents, instructions, chatmodes, prompts, skills | Testing/QA specialized. Playwright expert, OpenAPI test automation, accessibility, tech debt auditor, test planner |
| 3 | dfinke/awesome-copilot-chatmodes | https://github.com/dfinke/awesome-copilot-chatmodes | 14 chatmodes | claude-code-system, clean-code, explainer, genui, github-spark-system, gpt5-system, ultra-concise, yaml-structured |
| 4 | hashimwarren/github-copilot-custom-chatmodes | https://github.com/hashimwarren/github-copilot-custom-chatmodes | 6 chatmodes | plan, learn, refactor, research, debug, yolo |
| 5 | abdullahkhawer/ai-github-copilot-vs-code-chat-modes | https://github.com/abdullahkhawer/ai-github-copilot-vs-code-chat-modes | 5 chatmodes | DevOps-focused. code-reviewer, code-commit-assistant, dockerfile-developer, terraform-helm-release-upgrade-analyser, conversation-to-chat-mode |
| 6 | LorcanChinnock/copilot-chat-modes | https://github.com/LorcanChinnock/copilot-chat-modes | 6 chatmodes | code (end-to-end coding), planner (PRD to plan), prd (PRD authoring), prompter (prompt optimization), review (security-focused), debug (root cause analysis) |

### 2.3 Skill Collections

| # | Repository | URL | Skills | What's There |
|---|-----------|-----|--------|-------------|
| 1 | hoodini/ai-agents-skills | https://github.com/hoodini/ai-agents-skills | 23+ | Cross-platform (Claude Code, Copilot, Cursor, Windsurf). copilot-sdk, honest-agent (non-sycophantic), aws-agentcore, langchain, vercel, cloudflare, figma, owasp-security, web-accessibility, mermaid-diagrams, local-llm-router |
| 2 | gocallum/nextjs16-agent-skills | https://github.com/gocallum/nextjs16-agent-skills | 11+ | Next.js 16, Prisma ORM v7, AI SDK v6. Prevents outdated code generation for newer frameworks with breaking changes |
| 3 | stefanstranger/agentinstructions | https://github.com/stefanstranger/agentinstructions | varies | Python project setup skill with supporting scripts. PowerShell/Python focused |
| 4 | johnlokerse/azure-bicep-custom-chat-modes | https://github.com/johnlokerse/azure-bicep-custom-chat-modes | 1+ | Azure Bicep-specific. Skill for running Bicep snippets in console including User-Defined Functions |

### 2.4 Additional Resources

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | raffertyuy/github-copilot-prompts | https://github.com/raffertyuy/github-copilot-prompts | Personal collection organized by persona (app-dev, test-engineer, data-engineer, infra-engineer, ai-engineer). Prefix convention: `editor-*`, `chat-*`, `edits-*`, `agent-*`. GitHub Action to push prompts to target repos |
| 2 | fielding/copilot-instructions | https://github.com/fielding/copilot-instructions | Instructions organized by language (Python, JavaScript+React). Creative Commons |
| 3 | heilcheng/awesome-agent-skills | https://github.com/heilcheng/awesome-agent-skills | Index/catalog of skills for Claude Code, Copilot, Cursor, VS Code. Multi-language (EN, ES, JA, KO, ZH-CN, ZH-TW) |
| 4 | agentsmd/agents.md | https://github.com/agentsmd/agents.md | Official AGENTS.md specification. 60K+ adopters. Linux Foundation / Agentic AI Foundation |

---

## 3. Production System Prompts in Source Code

24 production tools with actual prompt text hardcoded in source files — what the LLM actually receives during operation.

### 3.1 Coding Agents

| # | Tool | URL | Prompt Location | Key Prompt Content |
|---|------|-----|----------------|-------------------|
| 1 | Aider | https://github.com/Aider-AI/aider | `aider/coders/editblock_prompts.py` | "Act as an expert software developer." SEARCH/REPLACE block syntax. "ONLY EVER RETURN CODE IN A SEARCH/REPLACE BLOCK!" |
| 2 | Bolt.new | https://github.com/stackblitz/bolt.new | `app/lib/.server/llm/prompts.ts` | "You are Bolt, an expert AI assistant." Documents WebContainer limitations (no pip, no C/C++, no git). "ULTRA IMPORTANT: Do NOT be verbose" |
| 3 | Open Interpreter | https://github.com/openinterpreter/open-interpreter | `interpreter/core/default_system_message.py` | "You are Open Interpreter, a world-class programmer." Critical: "try something, print information about it, then continue from there in tiny, informed steps" |
| 4 | GPT-Engineer | https://github.com/AntonOsika/gpt-engineer | `gpt_engineer/preprompts/generate` | "Think step by step." 9 preprompt files. Demands fully functional code, no placeholders. "this concludes a fully working implementation" |
| 5 | OpenHands | https://github.com/All-Hands-AI/OpenHands | `openhands/agenthub/codeact_agent/prompts/system_prompt.j2` | "You are OpenHands agent." Jinja2 template. Exploration -> Analysis -> Testing -> Implementation -> Verification workflow |
| 6 | SWE-agent | https://github.com/SWE-agent/SWE-agent | `config/default.yaml` | 5-step: find/read code, reproduce error, edit source, rerun reproduce, handle edge cases. Minimal changes |
| 7 | Cline | https://github.com/cline/cline | `src/core/prompts/system.ts` | "You are Cline." 9 XML-formatted tools. ~11,747 tokens. "STRICTLY FORBIDDEN from starting messages with 'Great,' 'Certainly,' 'Okay,' 'Sure'" |
| 8 | smol-ai/developer | https://github.com/smol-ai/developer | `smol_dev/prompts.py` | "top tier AI developer." "Do not leave any todos, fully implement every feature" |
| 9 | gptme | https://github.com/ErikBjare/gptme | `gptme/prompts.py` | Terminal-based agent. "always use absolute paths," "prefer applying patches over examples" |

### 3.2 AI Platforms & Applications

| # | Tool | URL | Prompt Location | Key Prompt Content |
|---|------|-----|----------------|-------------------|
| 10 | Dify | https://github.com/langgenius/dify | `api/core/llm_generator/prompts.py` | 114K+ stars. Conversation title generation, Python/JS code generator, suggested questions, QA pair generation, rule config generation, structured JSON output |
| 11 | Khoj | https://github.com/khoj-ai/khoj | `src/khoj/processor/conversation/prompts.py` | Multiple personas: "smart, curious, empathetic" assistant, "talented media artist" (image gen), "program manager" (diagrams), "senior software engineer" (coding) |
| 12 | Fabric | https://github.com/danielmiessler/Fabric | `data/patterns/` (243 patterns) | Each pattern has `system.md`. `extract_wisdom` (16-word items, 25 IDEAS min), `improve_prompt` (6 strategies), `analyze_paper` (A-F score), `create_coding_project` |
| 13 | AgentGPT | https://github.com/reworkd/AgentGPT | `platform/reworkd_platform/web/api/agent/prompts.py` | "task creation AI called AgentGPT." Start, Code, Task creation, Execute, Chat prompts |
| 14 | screenshot-to-code | https://github.com/abi/screenshot-to-code | `backend/prompts/screenshot_system_prompts.py` | Per-stack: "expert Tailwind developer," "expert React/Tailwind developer," "expert Vue/Tailwind developer," "expert at building SVGs" |
| 15 | NextChat | https://github.com/ChatGPTNextWeb/NextChat | `app/constant.ts` | 71K+ stars. Template with `{{ServiceProvider}}`, `{{cutoff}}`, `{{model}}`, `{{time}}`. MCP tool calls via markdown code blocks |
| 16 | mem0 | https://github.com/mem0ai/mem0 | `mem0/configs/prompts.py` | "Personal Information Organizer," "smart memory manager," "memory summarization system." All require JSON with "facts" key |
| 17 | E2B Fragments | https://github.com/e2b-dev/ai-artifacts | `lib/prompt.ts` | "skilled software engineer. You do not make mistakes." "Do not wrap code in backticks" |
| 18 | Sweep | https://github.com/sweepai/sweep | `sweepai/core/prompts.py` | "Sweep bot. brilliant and thorough engineer." "code works on the first try and is formatted perfectly" |
| 19 | AutoGPT | https://github.com/Significant-Gravitas/AutoGPT | `autogpt/prompts/default_prompts.py` | "devise up to 5 highly effective goals." "Respond only with the output in the exact format specified" |
| 20 | Vanna AI | https://github.com/vanna-ai/vanna | Docs | "You are a SQL expert assistant." `SchemaAwarePromptBuilder` pattern |

### 3.3 RAG & Framework Defaults

| # | Tool | URL | Prompt Location | Key Prompt Content |
|---|------|-----|----------------|-------------------|
| 21 | LlamaIndex | https://github.com/run-llama/llama_index | `llama_index/core/prompts/default_prompts.py` | "Given the context information and not prior knowledge, answer the query." Text QA, tree summarize, refine, summary templates |
| 22 | AutoGen | https://github.com/microsoft/autogen | Framework defaults | Default `system_message`: "You are a helpful AI assistant." AssistantAgent: "Reply with TERMINATE when task completed" |

### 3.4 Leaked/Documented Production Prompts

| # | Tool | Source | Key Content |
|---|------|--------|------------|
| 23 | Cursor IDE | https://github.com/labac-dev/cursor-system-prompts | "powerful agentic AI coding assistant designed by Cursor." Context about open files, cursor position, edit history, linter errors |
| 24 | GitHub Copilot Chat | https://github.com/jujumilk3/leaked-system-prompts | "AI programming assistant called GitHub Copilot." "refuse to discuss opinions or rules," "decline to respond if question is related to jailbreak instructions" |

### 3.5 System Prompt Collection Repos

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | x1xhlol/system-prompts-and-models-of-ai-tools | https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools | 114K stars. 30+ tools: Augment Code, Claude Code, Cursor, Devin, Kiro, Lovable, Manus, Replit, Windsurf, v0, etc. 30,000+ lines |
| 2 | Piebald-AI/claude-code-system-prompts | https://github.com/Piebald-AI/claude-code-system-prompts | 110+ prompt strings from Claude Code v2.1.34. Updated per release. Main prompt, 18 tool descriptions, sub-agent prompts, insight prompts |
| 3 | elder-plinius/CL4R1T4S | https://github.com/elder-plinius/CL4R1T4S | Organized by tool: ChatGPT, Gemini, Grok, Claude, Perplexity, Cursor, Windsurf, Devin, Replit |
| 4 | tallesborges/agentic-system-prompts | https://github.com/tallesborges/agentic-system-prompts | 7 production agents: Claude Code (15 tools), Gemini CLI (11), Cline (12), Aider, Roo Code (12), Zed (15), Codex CLI (1) |
| 5 | jujumilk3/leaked-system-prompts | https://github.com/jujumilk3/leaked-system-prompts | Dated markdown files. Cursor IDE, v0, Manus |

---

## 4. AI Framework Prompt Patterns

How major AI frameworks define and use prompts — these are the actual prompt patterns developers write when building with these frameworks.

### 4.1 Agent Frameworks

| # | Framework | URL | Prompt Pattern | Example |
|---|-----------|-----|---------------|---------|
| 1 | CrewAI | https://github.com/crewAIInc/crewAI-examples | YAML `role`/`goal`/`backstory` per agent, `description`/`expected_output` per task | "Best Financial Analyst" with goal: "Impress all customers with your financial data and market trends analysis" |
| 2 | AutoGen/AG2 | https://github.com/ag2ai/build-with-ag2 | `system_message` parameter on agents | `system_message="You are a Python developer. Write short Python scripts."` |
| 3 | LangGraph | https://github.com/langchain-ai/langgraph | `SystemMessage(content=template)` in graph nodes | `system_prompt="You are Alice, an addition expert."` |
| 4 | DSPy | https://github.com/stanfordnlp/dspy | Declarative signatures auto-generate prompts | `"question -> answer"` or `class BasicQA(dspy.Signature): """Answer questions with short factoid answers."""` |
| 5 | Semantic Kernel | https://github.com/microsoft/semantic-kernel | `skprompt.txt` + `config.json` or unified YAML | "WRITE EXACTLY ONE JOKE... G RATED... WORKPLACE/FAMILY SAFE" |
| 6 | Pydantic AI | https://github.com/pydantic/pydantic-ai | Static `system_prompt` or dynamic `@agent.system_prompt` decorator | `Agent('openai:gpt-4', system_prompt='Providing a weather forecast...')` |
| 7 | Marvin | https://github.com/PrefectHQ/marvin | `@marvin.fn` decorator turns function signatures + docstrings into prompts | `Agent(instructions="Write clear, engaging content")` |
| 8 | Instructor | https://github.com/567-labs/instructor | Pydantic model definitions serve as prompt engineering | `class User(BaseModel): name: str; age: int` — field names guide LLM output |

### 4.2 Prompt Registries & Libraries

| # | Framework | URL | Format | What's There |
|---|-----------|-----|--------|-------------|
| 1 | LangChain Hub | https://github.com/hwchase17/langchain-hub | Text templates | `api/`, `conversation/`, `llm_bash/`, `llm_math/`, `pal/`, `qa/`, `qa_with_sources/`, `sql_query/`, `summarize/`, `vector_db_qa/` |
| 2 | Haystack PromptHub | https://github.com/deepset-ai/prompthub | Versioned YAML | `deepset/question-answering`: "Given the context please answer the question. Context: {join(documents)}" |
| 3 | Promptify | https://github.com/promptslab/Promptify | Jinja templates | NER, classification, QA, relation extraction. Zero/one/few-shot patterns |
| 4 | Microsoft Prompty | https://github.com/microsoft/prompty | `.prompty` format | Standardized prompt asset format for creating, managing, debugging, evaluating |

### 4.3 Production App Prompts

| # | App | URL | Prompt Location | What's There |
|---|-----|-----|----------------|-------------|
| 1 | Vercel AI Chatbot | https://github.com/vercel/ai-chatbot | `lib/ai/prompts.ts` | `regularPrompt`: "friendly assistant." `codePrompt`: Python rules (self-contained, <15 lines). `sheetPrompt`: CSV format. `artifactsPrompt`: "DO NOT UPDATE DOCUMENTS IMMEDIATELY AFTER CREATING THEM" |
| 2 | v0 (leaked) | https://github.com/2-fly-4-ai/V0-system-prompt | extracted | "v0 is an advanced AI coding assistant created by Vercel." "ALWAYS WRITES COMPLETE CODE without any placeholders." kebab-case, Tailwind CSS, Next.js App Router, Server Components |
| 3 | Brex prompt patterns | https://github.com/brexhq/prompt-engineering | `README.md` | Travel booking with embedded policy tables. "Proxy Natural Language Processor" translating user requests to JSON commands |
| 4 | danielrosehill/System-Prompt-Library | https://github.com/danielrosehill/System-Prompt-Library | `system-prompts/json/` | 1,290 system prompts. Categories: autonomous agents, structured output, image generation, writing, data analysis, character/roleplay, technical domains |

---

## 5. CI/CD & GitHub Actions Prompts

34 repos where prompts are sent to LLMs automatically in CI/CD pipelines.

### 5.1 PR Review Actions

| # | Repository | URL | Stars | Prompt Summary |
|---|-----------|-----|-------|---------------|
| 1 | anc95/ChatGPT-CodeReview | https://github.com/anc95/ChatGPT-CodeReview | 4,200 | Bot comments on PRs. Supports ChatGPT/Claude. Configurable review scope, language, model. Filters via `INCLUDE/EXCLUDE_PATTERNS` |
| 2 | freeedcom/ai-codereviewer | https://github.com/freeedcom/ai-codereviewer | 995 | "Your task is to review pull requests." JSON output `{reviews: [{lineNumber, reviewComment}]}`. "Do not give positive comments." "NEVER suggest adding comments to the code" |
| 3 | mattzcarey/shippie | https://github.com/mattzcarey/shippie | 2,300 | Extendable code review agent. MCP-based tool integration. Identifies exposed secrets, inefficient code, bugs |
| 4 | Nikita-Filonov/ai-review | https://github.com/Nikita-Filonov/ai-review | 241 | Multi-platform: GitHub, GitLab, Bitbucket, Azure DevOps, Gitea. Context/summary/inline prompts. Python and Go prompt templates in "light" and "strict" modes |
| 5 | Nayjest/Gito | https://github.com/Nayjest/Gito | 158 | Two-layer config: environment (.env) + project (.gito/config.toml). Parallelized LLM processing |
| 6 | codedog-ai/codedog | https://github.com/codedog-ai/codedog | 190 | PR categorization, file summaries, scoring system for correctness/readability/maintainability |
| 7 | sturdy-dev/codeball-action | https://github.com/sturdy-dev/codeball-action | 323 | Deep learning model (not LLM). Trained on 1M+ PRs. 0-1 safety score for auto-approving |

### 5.2 Build & Commit Automation

| # | Repository | URL | Stars | Prompt Summary |
|---|-----------|-----|-------|---------------|
| 1 | appleboy/CodeGPT | https://github.com/appleboy/CodeGPT | 1,500 | Git hook (prepare-commit-msg). Templates in `$HOME/.config/codegpt/prompt/`. Conventional commits. Supports 7+ providers |
| 2 | salehhashemi1992/ai-commit-message | https://github.com/salehhashemi1992/ai-commit-message | 33 | Triggered by `[ai]` in commit title. Analyzes changes, generates meaningful title and description |
| 3 | YotpoLtd/cADR | https://github.com/YotpoLtd/cADR | 11 | AI-powered Architectural Decision Records in MADR format. Detects architecturally significant changes |
| 4 | itlackey/changeish | https://github.com/itlackey/changeish | low | Bash script collecting commit messages + diffs, sends to LLM for changelog entries |
| 5 | nyaomaru/changelog-bot | https://github.com/nyaomaru/changelog-bot | low | "Tone-aware summaries" of git history. Falls back to heuristic without API key |

### 5.3 Continuous AI (Autonomous Development in CI)

| # | Repository | URL | Stars | Prompt Summary |
|---|-----------|-----|-------|---------------|
| 1 | AnandChowdhary/continuous-claude | https://github.com/AnandChowdhary/continuous-claude | 1,200 | Runs Claude Code in continuous loop in CI. "you don't need to complete the entire goal in one iteration, just make meaningful progress." SHARED_TASK_NOTES.md as external memory |
| 2 | haesleinhuepf/git-bob | https://github.com/haesleinhuepf/git-bob | 60 | Trigger words in comments: `git-bob comment`, `git-bob solve`, `git-bob review`, `git-bob try`, `git-bob split`, `git-bob deploy`. Supports Jupyter notebooks |
| 3 | ashleywolf/continuous-ai-resolver | https://github.com/ashleywolf/continuous-ai-resolver | 8 | Auto-resolves stale/fixed GitHub issues. Runs Sunday midnight UTC |

### 5.4 Issue Management & Moderation

| # | Repository | URL | Stars | Prompt Summary |
|---|-----------|-----|-------|---------------|
| 1 | github/ai-moderator | https://github.com/github/ai-moderator | 156 | Official GitHub spam/AI-content detection. 3 YAML prompt files in `prompts/`. Custom prompts via `custom-prompt-path`. Uses GitHub Models API |
| 2 | benbalter/ai-community-moderator | https://github.com/benbalter/ai-community-moderator | 22 | Enforces CODE_OF_CONDUCT.md and CONTRIBUTING.md. Rates content 1-10 severity. Posts educational comments |
| 3 | pelikhan/action-genai-issue-labeller | https://github.com/pelikhan/action-genai-issue-labeller | 10 | 5-step: fetch issue + labels, construct prompt, infer, parse INI-style output, apply labels |

### 5.5 Documentation & Translation

| # | Repository | URL | Stars | Prompt Summary |
|---|-----------|-----|-------|---------------|
| 1 | eli64s/readme-ai | https://github.com/eli64s/readme-ai | 2,900 | Generates README.md from repo analysis. Prompts in `readmeai/config/settings/prompts.toml`. Pipeline: earlier outputs inform subsequent generation |
| 2 | pelikhan/action-continuous-comments | https://github.com/pelikhan/action-continuous-comments | low | Auto-generates code documentation comments. AST-GREP for precise code analysis. Optional quality judge |
| 3 | pelikhan/action-continuous-translation | https://github.com/pelikhan/action-continuous-translation | 9 | Incremental markdown translation. Glossary support. Only translates changed content |
| 4 | humanwhocodes/social-changelog | https://github.com/humanwhocodes/social-changelog | 46 | Generates social media posts from release changelogs |
| 5 | pelikhan/action-genai-pull-request-descriptor | https://github.com/pelikhan/action-genai-pull-request-descriptor | 2 | Auto-generates PR descriptions via GenAIScript |

### 5.6 Generic AI Actions & Frameworks

| # | Repository | URL | Stars | Prompt Summary |
|---|-----------|-----|-------|---------------|
| 1 | microsoft/genaiscript | https://github.com/microsoft/genaiscript | 2,900 | Scripting language for LLM prompts. Template-tag syntax: `$\`Write a poem.\`` `def("DATA", file)` for context registration |
| 2 | appleboy/LLM-action | https://github.com/appleboy/LLM-action | 18 | Go template interpolation: `{{.GITHUB_REPOSITORY}}`. Load prompts from inline, files, or URLs. Any OpenAI-compatible API |
| 3 | ultralytics/actions | https://github.com/ultralytics/actions | 94 | AI PR summaries + reviews. Defaults to gpt-5.2 / claude-sonnet-4-5 |
| 4 | ctrf-io/github-test-reporter | https://github.com/ctrf-io/github-test-reporter | 315 | Test reports with AI summaries. Custom system prompts configurable |
| 5 | jenkinsci/explain-error-plugin | https://github.com/jenkinsci/explain-error-plugin | 24 | Jenkins plugin. Analyzes build logs. `explainError()` in post-failure blocks |

### 5.7 Meta-Resource

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | githubnext/awesome-continuous-ai | https://github.com/githubnext/awesome-continuous-ai | GitHub Next curated list. 40+ Continuous AI Actions across: Triage, Documentation, Code Review, Code Commenting, Optimization, Test Improvement, Research, Moderation, AI Engineering |

---

## 6. Autonomous Agent & Workflow Prompts

49 repos organized by architectural pattern. These contain prompts that drive autonomous or semi-autonomous AI development workflows.

### 6.1 Foundational Agent System Prompts

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | Piebald-AI/claude-code-system-prompts | https://github.com/Piebald-AI/claude-code-system-prompts | 110+ prompt strings from Claude Code v2.1.34. Sub-agent prompts: Plan (633 tokens), Explore (516 tokens), Task (294 tokens). Agent creation architect (1,110 tokens) |
| 2 | openai/codex prompt.md | https://github.com/openai/codex/blob/main/codex-rs/core/prompt.md | The actual Codex CLI system prompt |
| 3 | SWE-agent/SWE-agent | https://github.com/SWE-agent/SWE-agent | 5-step issue fixing. Minimal changes to non-test files |
| 4 | All-Hands-AI/OpenHands | https://github.com/All-Hands-AI/OpenHands | Jinja2 template. Exploration -> Analysis -> Testing -> Implementation -> Verification |
| 5 | langchain-ai/open-swe | https://github.com/langchain-ai/open-swe | LangGraph-based SWE agent |
| 6 | augmentcode/augment-swebench-agent | https://github.com/augmentcode/augment-swebench-agent | SWE-bench agent with embedded prompts |

### 6.2 Ralph Wiggum Loop Implementations

The Ralph Wiggum pattern: same prompt fed repeatedly to an agent, codebase changes between iterations via git commits. Memory persists through files + git history.

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | anthropics/claude-code ralph-wiggum | https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum | **Official Anthropic plugin.** `prd-to-tasks` (PRD parsing), `ralph` (autonomous loop), `ralph-with-prd` (combined). "Autonomous implementation agent... implements all unfinished tasks... one task per Claude Code session" |
| 2 | ClaytonFarr/ralph-playbook | https://github.com/ClaytonFarr/ralph-playbook | **Definitive Ralph reference.** Two-prompt architecture: development prompt + completion-check prompt. Loop: prompt -> code -> check -> repeat/exit. PRD -> Implementation Plan -> Task Queue -> Autonomous Execution |
| 3 | frankbria/ralph-claude-code | https://github.com/frankbria/ralph-claude-code | v0.11.4, 484 tests at 100% pass. Dual-condition exit gate. Rate limiting (100 calls/hour), circuit breaker, session persistence with 24-hour expiration |
| 4 | michaelshimeles/ralphy | https://github.com/michaelshimeles/ralphy | Multi-agent Ralph supporting 6 AI engines: Claude Code, OpenCode, Cursor, Codex, Qwen-Code, Factory Droid. Sandbox mode, webhook notifications |
| 5 | Th0rgal/open-ralph-wiggum | https://github.com/Th0rgal/open-ralph-wiggum | Agent-agnostic. "The AI doesn't talk to itself between iterations -- it sees the same prompt each time, but the codebase has changed" |
| 6 | syuya2036/ralph-loop | https://github.com/syuya2036/ralph-loop | Supports local models (Ollama/Qwen). Claude, Codex, Gemini |
| 7 | vercel-labs/ralph-loop-agent | https://github.com/vercel-labs/ralph-loop-agent | Vercel Labs. AI SDK `generateText` in Ralph loop. Flexible stop conditions (iterations, tokens, cost) |
| 8 | iannuttall/ralph | https://github.com/iannuttall/ralph | Minimalist. Files + git as memory. Handles stalled stories with configurable STALE_SECONDS |
| 9 | snwfdhmp/awesome-ralph | https://github.com/snwfdhmp/awesome-ralph | Meta-resource. Case studies include Claude running in loop for 3 months building CURSED programming language |

### 6.3 Spec-Driven Development Frameworks

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | Wirasm/PRPs-agentic-eng | https://github.com/Wirasm/PRPs-agentic-eng | Product Requirement Prompts (PRP). PRP = PRD + codebase intelligence + agent/runbook. Commands: `/prp-prd`, `/prp-plan`, `/prp-implement`, `/prp-ralph` (iterative loop) |
| 2 | Fission-AI/OpenSpec | https://github.com/Fission-AI/OpenSpec | SDD for 20+ AI assistants. `/opsx:new`, `/opsx:ff`, `/opsx:apply`, `/opsx:archive`. Tool-agnostic |
| 3 | gotalab/cc-sdd | https://github.com/gotalab/cc-sdd | Kiro-style commands: `/kiro:steering`, `/kiro:spec-init`, `/kiro:spec-requirements`, `/kiro:spec-design`, `/kiro:spec-tasks`, `/kiro:spec-impl`. Validation gates |
| 4 | jasonkneen/kiro | https://github.com/jasonkneen/kiro | Complete Amazon Kiro IDE system prompts. 7 skills. MCP server for prompts. EARS format requirements |
| 5 | wirelessr/kiro-workflow-prompts | https://github.com/wirelessr/kiro-workflow-prompts | Four-phase: requirements -> blueprint -> task hierarchy -> development. Linus Torvalds Development Guidelines |
| 6 | merllinsbeard/ralph-speckit | https://github.com/merllinsbeard/ralph-speckit | Bridge between GitHub Spec Kit and Ralph loops. SPEC-KIT phase (human) -> Ralph phase (autonomous) |
| 7 | tzachbon/smart-ralph | https://github.com/tzachbon/smart-ralph | Combines Ralph + spec-driven + smart compaction. Fresh context per task prevents context pollution |

### 6.4 Multi-Agent Orchestration Systems

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | wshobson/agents | https://github.com/wshobson/agents | 112 specialized agents, 16 workflow orchestrators, 146 skills, 79 tools in 73 plugins. 5 built-in workflows: git, full-stack, TDD, Conductor, Agent Teams |
| 2 | automazeio/ccpm | https://github.com/automazeio/ccpm | Claude Code Project Management. 5-phase: brainstorming -> documentation -> planning -> execution -> tracking. GitHub Issues as source of truth |
| 3 | disler/infinite-agentic-loop | https://github.com/disler/infinite-agentic-loop | Two-prompt system: orchestrator + sub-agents. 4 modes: single, batch (5), large batch (20), infinite with wave coordination |
| 4 | VoltAgent/awesome-claude-code-subagents | https://github.com/VoltAgent/awesome-claude-code-subagents | 100+ specialized subagent prompts. Categories: core-development, language-specialists, infrastructure, quality-security, data-ai, meta-orchestration |
| 5 | alfredolopez80/multi-agent-ralph-loop | https://github.com/alfredolopez80/multi-agent-ralph-loop | Swarm mode. 67 hooks. Memory system with parallel search across semantic/episodic/procedural memory. 3x-6x faster on parallel tasks |
| 6 | nwiizo/ccswarm | https://github.com/nwiizo/ccswarm | Rust-based. Per-agent workspaces in isolated git worktrees. LLM Quality Judge with multi-dimensional scoring |

### 6.5 Context Engineering & Methodology

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | humanlayer/advanced-context-engineering-for-coding-agents | https://github.com/humanlayer/advanced-context-engineering-for-coding-agents | **Coined "context engineering."** Frequent Intentional Compaction (FIC). Research -> Planning -> Implementation. "Write everything we did so far to progress.md." Handled 300K LOC Rust codebases |
| 2 | coleam00/context-engineering-intro | https://github.com/coleam00/context-engineering-intro | Template. CLAUDE.md, PRP templates, `/generate-prp` and `/execute-prp` commands |
| 3 | bmad-code-org/BMAD-METHOD | https://github.com/bmad-code-org/BMAD-METHOD | 21 agent prompts (Analyst, PM, Architect, Scrum Master, PO, Developer, QA). 50+ guided workflows. Two-phase: Agentic Planning + Scrum Master decomposition |
| 4 | mitsuhiko/agent-prompts | https://github.com/mitsuhiko/agent-prompts | **By Flask/Sentry creator Armin Ronacher.** Three directories: `poc-engineering/` (Software Architect + subagents), `research/` (Research Lead + Citations), `lang-engineer/` (Language Architect + Lexer/Parser/Compiler engineers). Backend-first approach |

### 6.6 Parallel Development with Worktrees

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | stravu/crystal | https://github.com/stravu/crystal | Electron desktop app for parallel AI sessions in git worktrees. Auto naming, branch management, rebase/squash with diff visualization |
| 2 | forrestchang/worktree-workflow | https://github.com/forrestchang/worktree-workflow | `claude-wt` bash script. Worktree Skill, `/pr` and `/done` commands |

### 6.7 Production Development Environments

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | maxritter/claude-pilot | https://github.com/maxritter/claude-pilot | `/setup` -> `/plan` -> `/implement` -> `/verify`. TDD enforcement via pre-edit hooks. Language-specific quality hooks |
| 2 | jwadow/agentic-prompts | https://github.com/jwadow/agentic-prompts | Roo Code agent personas: orchestrator, technical leader, expert developer |
| 3 | feiskyer/codex-settings | https://github.com/feiskyer/codex-settings | OpenAI Codex CLI. Multi-instance orchestration skill. Kiro-style and Spec-Kit integration skills |
| 4 | disler/indydevtools | https://github.com/disler/indydevtools | "Prompts as fundamental unit of programming." Simple Prompt System (SPS) for defining and reusing templates |
| 5 | MarioGiancini/ralph-loop-setup | https://github.com/MarioGiancini/ralph-loop-setup | Plugin for installing Ralph loops into any project. Visual screenshots via Playwright MCP |

### 6.8 Hidden Features & Reverse Engineering

| # | Source | URL | What's There |
|---|--------|-----|-------------|
| 1 | kieranklaassen (gists) | https://gist.github.com/kieranklaassen/d2b35569be2c7f1412c64861a219d51f | TeammateTool extracted from compiled Claude Code binary. 13 operations. Feature-gated behind `I9() && qFB()` |

---

## 7. Personal Dotfiles & Configs with Prompts

30 personal dotfiles repos where developers store their AI tool configurations. These are authentic daily-driver setups.

### 7.1 Most Extensive Personal Configs

| # | Developer | URL | Scale | Key Features |
|---|-----------|-----|-------|-------------|
| 1 | zircote | https://github.com/zircote/.claude | 100+ agents, 60+ skills | 10 agent categories. `/cr` (parallel agents for review), `/deep-research` (multi-phase), claude-spec plugin with project lifecycle |
| 2 | affaan-m | https://github.com/affaan-m/everything-claude-code | 30+ commands, 12 agents, 30+ skills | Anthropic hackathon winner. Instinct-based learning. `/evolve` for self-improving config. 10+ months daily use |
| 3 | danielmiessler | https://github.com/danielmiessler/Personal_AI_Infrastructure | Full "Personal AI OS" | Installation wizard. 5 core primitives: Roster, Voice, Structure, Briefing, Gate. Meta-prompting with Handlebars. 14 hooks. Continuous learning with rating capture |
| 4 | fcakyon | https://github.com/fcakyon/claude-codex-settings | 16 plugins, 20+ commands | Plugin ecosystem. Alternative configs for Z.ai (85% cost reduction), Kimi K2. Usage tracking via ccusage |
| 5 | feiskyer | https://github.com/feiskyer/claude-code-settings | 10+ commands, 7 agents | 1.2K+ stars. Escalating thinking: `/think-harder` -> `/think-ultra` -> `/eureka`. 10+ model providers |

### 7.2 Notable Personal Configs

| # | Developer | URL | Key Features |
|---|-----------|-----|-------------|
| 1 | ZacheryGlass | https://github.com/ZacheryGlass/.claude | 541 stars. Safety hooks, `skill-creator` meta-skill, PowerShell statusline showing active model |
| 2 | centminmod | https://github.com/centminmod/my-claude-code-setup | Memory bank: CLAUDE-activeContext.md, patterns.md, decisions.md, troubleshooting.md. "Ralph Wiggum" and "Safety Net" plugins. Worktree functions `cx()`/`clx()` |
| 3 | 0xBigBoss | https://github.com/0xBigBoss/claude-code | `/handoff` for session context transfer. Axe iOS simulator skill. Tilt integration |
| 4 | cotdp (Michael Cutler) | https://github.com/cotdp/dotfiles | `/plan` -> `/cook` -> `/continue` -> `/release` lifecycle. Modular Cursor rules. Blog post claims 50-70% productivity gains |
| 5 | jarrodwatts | https://github.com/jarrodwatts/claude-code-config | `media-interpreter` (PDF/image extraction), `open-source-librarian` (OSS research with citations), `keyword-detector.py` hook |
| 6 | sumchattering | https://github.com/sumchattering/claude-config | "Dotfiles for the AI age." Bootstrap script for global/per-repo deployment. Credential templates for Slack, Jira, Iterable, Slab |
| 7 | atxtechbro | https://github.com/atxtechbro/dotfiles | "Harness-agnostic." Unified `.agent-config.yml` across Claude Code, Amazon Q, Codex. `knowledge/procedures/` auto-loaded |
| 8 | ronilaukkarinen | https://github.com/ronilaukkarinen/dotfiles | Gamification: 1 XP per AI-written line, Code::Stats integration, `gamify.nvim`. Conversation archiving as searchable markdown |

### 7.3 Multi-AI-Tool Configs

| # | Developer | URL | Tools Configured |
|---|-----------|-----|-----------------|
| 1 | alepeh | https://github.com/alepeh/ai-dotfiles | Unified generator for Claude Code, Cursor, Continue.dev. "Define once, generate everywhere" |
| 2 | johnlindquist/dotagent | https://github.com/johnlindquist/dotagent | Universal config parser/converter. `.agent/` with YAML frontmatter. Import/export: Claude, Cursor, Cline, Windsurf, Zed, Codex, Aider, Gemini, VS Code Copilot. Private rules (`.agent/private/`) |
| 3 | fredrikaverpil | https://github.com/fredrikaverpil/dotfiles | Triple: `CLAUDE.md`, `GEMINI.md`, `AGENTS.md` all as symlinks. Nix-based reproducibility |
| 4 | 1natsu172 | https://github.com/1natsu172/dotfiles | Triple: `.claude/`, `.gemini/`, `.agents/`. GPG signing, Age+SOPS encryption |

### 7.4 Cross-Tool Rule Collections

| # | Developer | URL | What's There |
|---|-----------|-----|-------------|
| 1 | chand1012/cursorrules | https://github.com/chand1012/cursorrules | Three-phase creation (Research -> Generate -> Implement). Go, JS, Python, Rust, Docker, Solidity, Godot. OpenHands conversion |
| 2 | AndreRatzenberger/cursor-rules | https://github.com/AndreRatzenberger/cursor-rules | 8 rule files. Specification-first development. Learning capture in `.cursor/learnings/`. Auto README validation |
| 3 | Bhartendu-Kumar/rules_template | https://github.com/Bhartendu-Kumar/rules_template | Universal rules for CLINE/RooCode/Cursor/Windsurf. Dual-pillar: SE best practices + project documentation |
| 4 | nicksp | https://github.com/nicksp/dotfiles | `/blog-fix-grammar`, `/blog-fix-wording`, `/explain`, `/review`, `/security-review`. Dual Cursor/Amp support |

---

## 8. SE Activity-Specific Prompt Repos

40+ repos organized by software engineering activity, containing prompts specifically designed for that activity.

### 8.1 Code Review

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | fluidfocuschannel/ai-code-review-prompts | https://github.com/fluidfocuschannel/ai-code-review-prompts | Prompts for asking AI to review code with specific focus areas |
| 2 | sanyuan0704/code-review-expert | https://github.com/sanyuan0704/code-review-expert | Structured review prompts with expertise levels |
| 3 | masoncl/review-prompts | https://github.com/masoncl/review-prompts | Prompts derived from Linux kernel code review practices |

### 8.2 Testing & TDD

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | allenheltondev/tdd-ai | https://github.com/allenheltondev/tdd-ai | Generates code from unit tests. If tests fail, feeds failures back in a loop. True test-first AI |
| 2 | microsoft/promptpex | https://github.com/microsoft/promptpex | Microsoft research. Generates tests for prompts. Exports to OpenAI Evals API |
| 3 | mosofsky/spec-then-code | https://github.com/mosofsky/spec-then-code | TDD methodology with spec creation, test-first development, completeness checks |

### 8.3 Refactoring

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | craftvscruft/chatgpt-refactoring-prompts | https://github.com/craftvscruft/chatgpt-refactoring-prompts | By Ray Myers (Craft vs Cruft). "RefactorGPT" — grades code, lists smells by name, recommends IDE refactoring steps without changing functionality |
| 2 | Alexanderdunlop/ai-architecture-prompts | https://github.com/Alexanderdunlop/ai-architecture-prompts | Modular systems based on Eskil Steenberg's lecture. Refactoring complex DOM bugs into clean interfaces |

### 8.4 Documentation

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | kamilstanuch/codebase-digest | https://github.com/kamilstanuch/codebase-digest | 60+ coding prompts in `prompt_library/`. Quality analysis, learning, evolution, business alignment, documentation generation |
| 2 | fynnfluegge/doc-comments-ai | https://github.com/fynnfluegge/doc-comments-ai | Generates documentation comment blocks for all methods using LLMs |

### 8.5 Architecture & Design

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | mikaelvesavuori/chatgpt-architecture-coach | https://github.com/mikaelvesavuori/chatgpt-architecture-coach | 5 prompt files: architecture-coach, performance-coach, assess-diagram, code-review-with-policy, tests-from-api-schema |
| 2 | justinlietz93/Perfect_Prompts | https://github.com/justinlietz93/Perfect_Prompts | Architecture standards for Clean, Hexagonal, Microservices, Event-Driven, Serverless. Language-specific for Go, Rust, Python, TypeScript |
| 3 | microsoft-partner-solutions-ai/ai-prompt-book | https://github.com/microsoft-partner-solutions-ai/ai-prompt-book | 5 categories: Discovery/Prototyping, Architecture Design, Webinar Planning, App Modernization, Copilot Integration. Azure architecture diagrams |

### 8.6 Security Audit

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | Alexanderdunlop/OWASP-AI-Security-Prompts | https://github.com/Alexanderdunlop/OWASP-AI-Security-Prompts | OWASP Top 10:2021. Real vulnerability examples with fixes |
| 2 | mrwadams/stride-gpt | https://github.com/mrwadams/stride-gpt | STRIDE threat modeling. DREAD risk scoring, attack trees, mitigation suggestions, Gherkin test cases. Supports 5 providers |

### 8.7 Database & SQL

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | iloveitaly/sql-ai-prompt-generator | https://github.com/iloveitaly/sql-ai-prompt-generator | Takes database URL + table name, generates schema snapshot + sample rows as prompt context |
| 2 | travistangvh/ChatGPT-Data-Science-Prompts | https://github.com/travistangvh/ChatGPT-Data-Science-Prompts | 60 prompts: Write Python, Explain code, Optimize, Format, Translate, Write SQL, Troubleshoot |

### 8.8 DevOps & Infrastructure

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | ahmadsheikhi89/devops-ai-prompts | https://github.com/ahmadsheikhi89/devops-ai-prompts | 12 production-tested prompts. Terraform, bash, systemd, Prometheus, Dockerfile, Kubernetes, CI/CD, Docker Compose, Helm |
| 2 | gofireflyio/aiac | https://github.com/gofireflyio/aiac | CLI generating IaC. "get terraform for AWS EC2." Supports Terraform, Dockerfiles, K8s manifests, Helm charts |
| 3 | collabnix/chatgpt-prompts-devops | https://github.com/collabnix/chatgpt-prompts-devops | Community-curated. Docker, Kubernetes, Terraform, Jenkins, Ansible, AWS |

### 8.9 Git & Version Control

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | theorib/git-commit-message-ai-prompt | https://github.com/theorib/git-commit-message-ai-prompt | Detailed Conventional Commits 1.0.0 prompt. Supports Gitmoji. Designed for Gemini (large context for diffs) |
| 2 | di-sukharev/opencommit | https://github.com/di-sukharev/opencommit | Top-rated. Generates commit messages in 1 second. Any LLM provider + Ollama |
| 3 | Nutlope/aicommits | https://github.com/Nutlope/aicommits | CLI that writes git commit messages with AI |
| 4 | pmusolino/AI-Git-Narrator | https://github.com/pmusolino/AI-Git-Narrator | Both commit messages AND PR descriptions from diffs |

### 8.10 Onboarding & Learning

| # | Repository | URL | What's There |
|---|-----------|-----|-------------|
| 1 | bitovi/ai-enablement-prompts | https://github.com/bitovi/ai-enablement-prompts | Multi-step prompt chains. `/understanding-code` builds cumulative context. Used by Bitovi consultancy |
| 2 | The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge | https://github.com/The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge | Analyzes repos and creates beginner-friendly tutorials |
| 3 | OpenBMB/RepoAgent | https://github.com/OpenBMB/RepoAgent | LLM-powered repo documentation and understanding |

### 8.11 Domain-Specific Skills

| # | Repository | URL | Domain | Scale |
|---|-----------|-----|--------|-------|
| 1 | VoltAgent/awesome-agent-skills | https://github.com/VoltAgent/awesome-agent-skills | Cross-domain | 200+ skills. Official skills from Anthropic, Google Labs, Vercel, Stripe, Cloudflare, Trail of Bits, Sentry, Expo, Hugging Face |
| 2 | Orchestra-Research/AI-Research-SKILLs | https://github.com/Orchestra-Research/AI-research-SKILLs | ML/AI Engineering | 83 skills across 18 categories. Architecture, Tokenization, Fine-Tuning, Interpretability, Safety, Distributed Training, RAG, MLOps |
| 3 | callstackincubator/agent-skills | https://github.com/callstackincubator/agent-skills | React Native | Performance skills: memoization, React Compiler, atomic state, JS thread offloading, native profiling, bundle optimization |
| 4 | XeroAPI/xero-prompt-library | https://github.com/XeroAPI/xero-prompt-library | API Integration | Official Xero API prompts for building integrations across languages/frameworks |

### 8.12 Comprehensive Multi-Category Repos

| # | Repository | URL | Scope |
|---|-----------|-----|-------|
| 1 | qdhenry/Claude-Command-Suite | https://github.com/qdhenry/Claude-Command-Suite | 148+ commands + 54 agents covering debugging, review, testing, security, architecture, deployment |
| 2 | alirezarezvani/claude-skills | https://github.com/alirezarezvani/claude-skills | 18 engineering skills + PM/marketing bundles |
| 3 | aymalkhalid/AI-Prompt-Library-for-Software-Development | https://github.com/aymalkhalid/AI-Prompt-Library-for-Software-Development | 13 prompts: Code Review, Testing, Refactoring, Documentation, Architecture, Project Management |
| 4 | keploy/engineering-prompts | https://github.com/keploy/engineering-prompts | By Keploy (API testing). DevOps, Backend, Frontend, Testing, Debugging, Documentation |
| 5 | thibaultyou/prompt-library | https://github.com/thibaultyou/prompt-library | Dynamic CLI. Auto-generates metadata. Execute prompts in CI or local workflows |
| 6 | ai-driven-dev/prompts | https://github.com/ai-driven-dev/prompts | Planning, code audit, feature development, user stories, project management. Espanso text expander |

---

## 9. Updated Summary Statistics

Combined with Wave 1, the total catalog now covers:

| Category | Wave 1 | Wave 2 | Total | Most Verbatim? |
|----------|--------|--------|-------|---------------|
| Slash commands (Claude Code) | ~700+ across 9 repos | ~500+ across 64 repos | **~1,200+ across 73 repos** | **YES** |
| Skills (Claude Code) | ~150+ across 6 repos | ~200+ across 10+ repos | **~350+ across 16+ repos** | Semi |
| Copilot prompt/agent/chatmode files | ~160+ across 5 repos | ~200+ across 18 repos | **~360+ across 23 repos** | **YES** |
| System prompts in code | 8 repos | 24 repos | **32 repos** | **YES** |
| CI/CD workflow prompts | 6 repos | 34 repos | **40 repos** | **YES** |
| Agent loop prompts (Ralph Wiggum) | 3 repos | 9+ repos | **12+ repos** | **YES** |
| Spec-driven prompts | 2 repos | 7 repos | **9 repos** | **YES** |
| Multi-agent orchestration | 2 repos | 6 repos | **8 repos** | **YES** |
| Context engineering | — | 4 repos | **4 repos** | Methodology |
| Hooks | 30+ across 5 repos | (included in configs) | **30+ across 5+ repos** | Automated |
| AI framework prompt patterns | — | 16 frameworks | **16 frameworks** | Patterns |
| Production system prompt collections | — | 5 repos | **5 repos** | Reference |
| SE activity-specific prompt repos | — | 40+ repos | **40+ repos** | **YES** |
| Personal dotfiles with prompts | — | 30 repos | **30 repos** | Authentic daily use |
| CLAUDE.md files | 42 files | (included in dotfiles) | **42+ files** | Configuration |
| AGENTS.md files | 4 files | (spec repo added) | **5+ files** | Configuration |
| .cursorrules / .cursor/rules | 56+ entries | 4+ in dotfiles | **60+ entries** | Configuration |
| Collection/aggregation repos | 8+ repos | 8+ repos | **16+ repos** | Meta |

### Highest-Priority Items for Deep Dive (Updated)

Based on focus on **actual prompts developers type**, these are the richest sources across both waves:

**Slash Command Collections:**
1. **danielrosehill/Claude-Slash-Commands** (357 commands) — Largest single collection
2. **davepoon/buildwithclaude** (175 commands) — Aggregated across 22 categories
3. **qdhenry/Claude-Command-Suite** (148 commands) — Full SDLC
4. **levnikolaevich/claude-code-skills** (85 skills) — Full delivery pipeline
5. **Comfy-Org/comfy-claude-prompt-library** (80+ commands) — Real production team
6. **wshobson/commands** + **wshobson/agents** (57+112) — Production-ready workflows + agents
7. **rohitg00/awesome-claude-code-toolkit** (42 commands) — Plus 135 agents
8. **avifenesh/awesome-slash** (11 plugins) — Cross-platform
9. **SuperClaude-Org/SuperClaude_Framework** (30 commands) — Namespaced with cognitive personas

**System Prompts in Production Code:**
10. **Fabric** (243 patterns) — Largest task-specific prompt collection
11. **x1xhlol/system-prompts-and-models-of-ai-tools** (30+ tools) — 30,000+ lines of production prompts
12. **Piebald-AI/claude-code-system-prompts** (110+ strings) — Complete Claude Code prompt set
13. **danielrosehill/System-Prompt-Library** (1,290 prompts) — Categorized system prompts

**Autonomous Workflows:**
14. **ClaytonFarr/ralph-playbook** — Definitive Ralph Wiggum reference
15. **bmad-code-org/BMAD-METHOD** (21 agents + 50 workflows) — Most comprehensive methodology
16. **mitsuhiko/agent-prompts** — From Flask/Sentry creator Armin Ronacher
17. **humanlayer/advanced-context-engineering-for-coding-agents** — Coined "context engineering"

**CI/CD Prompts:**
18. **microsoft/genaiscript** — Scripting language for LLM prompts in CI
19. **AnandChowdhary/continuous-claude** — Autonomous loop in GitHub Actions
20. **baz-scm/awesome-reviewers** (3,000+ review prompts) — From real open-source reviews

---

## Source Agent Attribution

This catalog was compiled from 8 parallel search agents (Wave 2):

1. **a4301b5** — Additional Claude Code command repos (64 new repos)
2. **a025e2b** — Copilot ecosystem expansion (18 repos)
3. **a4e938b** — System prompts embedded in source code (24 tools)
4. **a53fee2** — AI framework prompt patterns (16 frameworks)
5. **a19399f** — CI/CD and GitHub Actions AI prompts (34 repos)
6. **a21ccb8** — Autonomous agent and agentic workflow prompts (49 repos)
7. **ab45c8c** — Personal dotfiles and configs (30 repos)
8. **ade8cb1** — SE activity-specific prompt repos (40+ repos)
