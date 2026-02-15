# How Real Developers Actually Use AI Coding Tools

**Date:** 2026-02-07
**Methodology:** All content sourced exclusively from individual human developers sharing their own experiences — blog posts, forum discussions, GitHub repositories, and community debates. No vendor studies, marketing content, or prescriptive guides. See [reference-institutional-and-vendor-research.md](reference-institutional-and-vendor-research.md) for that material.

**Sources:** 60+ individual developers across personal blogs, Reddit (r/ClaudeAI, r/cursor, r/programming, r/ExperiencedDevs, r/LocalLLaMA), Hacker News, Cursor Forum, OpenAI Developer Community, GitHub repositories and gists, and dev.to.

---

## Table of Contents

1. [Real Prompts by Workflow Stage](#1-real-prompts-by-workflow-stage)
2. [Configuration Files from Real Projects](#2-configuration-files-from-real-projects)
3. [What Failed: Honest Accounts of AI Prompting Gone Wrong](#3-what-failed)
4. [Unresolved Debates](#4-unresolved-debates)
5. [Evolution Stories: How Developers Changed Over Time](#5-evolution-stories)
6. [Cross-Cutting Patterns](#6-cross-cutting-patterns)
7. [Sources Index](#7-sources-index)

---

## 1. Real Prompts by Workflow Stage

### 1.1 Specification and Planning

The most widely adopted pattern across individual developers is separating planning from coding. Multiple developers independently converged on this approach.

#### Harper Reed's Socratic Specification Prompt

**Who:** Harper Reed — former CTO of Threadless, Obama 2012 campaign tech lead
**Tool:** Claude Code
**Source:** https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/ and https://harper.blog/2025/05/08/basic-claude-code/

**Step 1 — Idea development (using a conversational LLM like ChatGPT):**
```
Ask me one question at a time so we can develop a thorough, step-by-step
spec for this idea. Each question should build on my previous answers,
and our end goal is to have a detailed specification I can hand off to
a developer.
```

**Step 2 — Compile into spec:**
```
Now that we've wrapped up the brainstorming process, can you compile
our findings into a comprehensive, developer-ready specification?
Include all relevant requirements, architecture choices, data handling
details, error handling strategies, and a testing plan.
```

**Step 3 — Break into implementation plan (TDD version):**
```
Draft a detailed, step-by-step blueprint for building this project.
Then break it down into small, iterative chunks that build on each
other...Provide a series of prompts for a code-generation LLM that
will implement each step in a test-driven manner.
```

**Step 4 — Execute the plan (Claude Code driver prompt):**
```
Open @prompt_plan.md and identify any prompts not marked as completed.
For each incomplete prompt:
  Double-check if it's truly unfinished (if uncertain, ask for clarification).
  If you confirm it's already done, skip it.
  Otherwise, implement it as described.
  Make sure the tests pass, and the program builds/runs.
  Commit the changes to your repository with a clear commit message.
  Update @prompt_plan.md to mark this prompt as completed.
```

**Why it works (per Reed):** AI systems "LOVE TDD." The prompt_plan.md approach is "a beautiful hack" — Claude has structure but also autonomy within each step. Most plans complete in 30-45 minutes regardless of complexity. He uses pre-commit hooks (Ruff for Python, Biome, Clippy) as guardrails.

**What didn't work:** Claude struggles with `uv` package management, defaulting to `pip install`.

This workflow was widely adopted. Arthur Clune (https://clune.org/posts/claude-code-manual/) uses the same prompt_plan.md driver and added escalating thinking keywords: "think" < "think hard" < "think harder" < "ultrathink".

#### Jeremy Kreutzbender's Planning Prompts (with Failure Documentation)

**Who:** Jeremy Kreutzbender
**Tool:** LLM-based coding tools (unspecified)
**Source:** https://jeremykreutzbender.com/blog/thoughts-and-experiences-vibe-coding-mid-2025

**LSP Project initial prompt:**
```
I want to write an LSP that will conform to
https://microsoft.github.io/language-server-protocol/. I want to write
the project in Ruby as well. The language we'll be writing for this is
a small subset of SQL. Can you outline a set of steps to implement this
LSP that we can work together on.
```

**Critical addition (learned through failure):**
```
We don't need to write any code right now! We're only generating a list
of steps.
```

**Go Git TUI Project:**
```
This is a blank project called `go-git-tui`. I don't have a ton of
experience with Go, but I've been wanting to learn. What I want to build
is a TUI (Terminal UI) application that has one function, which is to
view the git commits of a repository in a carousel fashion... Before you
write any code, can you come up with a plan for implementing this project?
```

**What failed:** The LSP tests all passed but the VSCode extension crashed immediately on startup. The generated code architecture was wrong at a fundamental level, and he hadn't understood it because he just accepted passing tests. The Git TUI required 10-15 prompts just for gradient line styling. Each adjustment broke adjacent UI elements.

**Evolution:** Started as "true vibe coding" (just accepting output) -> evolved to reviewing and understanding every piece of generated code.

#### Nathan LeClaire's Two-Model Planning

**Who:** Nathan LeClaire
**Tool:** Claude Code + o1-pro
**Source:** https://nathanleclaire.com/blog/2025/03/10/vibing-best-practices-with-claude-code/

**o1-pro planning prompt:**
```
You are an exceptionally intelligent AI architect tasked with creating
a clear, structured, and detailed implementation plan for a diligent
but less sophisticated AI assistant to execute.
```

The prompt specifies using XML tags for `<instruction>`, `<context>`, and `<code_example>` sections, with explicit reasoning in `<thinking>` tags. The plan output is then pasted into Claude Code for execution.

**What didn't work:** Claude sometimes ignores CLAUDE.md instructions but follows others reliably, particularly linting directives. Long conversations degrade performance; starting fresh is better. Auto-compaction reduces available context; manually triggering `/compact` with handoff documents provides better control.

#### Addy Osmani's "Waterfall in 15 Minutes"

**Who:** Addy Osmani (Google Chrome team)
**Tool:** Claude Code, Gemini CLI, Cline
**Source:** https://addyosmani.com/blog/ai-coding-workflow/

**Planning prompt pattern:**
```
describe the idea and ask the LLM to iteratively ask me questions until
we've fleshed out requirements
```

**Anti-hallucination directive:**
```
If you are unsure about something or the codebase context is missing,
ask for clarification rather than making up an answer
```

Osmani maintains separate configuration files: `CLAUDE.md`, `GEMINI.md`, `spec.md`, and `plan.md`. He uses DeepSeek-R1 for planning + Claude 3.5 Sonnet for implementation as a cost-efficiency strategy with Cline.

**Key evolution:** Shifted from monolithic prompts to "focused prompts: implement one function, fix one bug, add one feature at a time." Requesting too much at once produces "jumbled mess" code. Now uses "model musical chairs" — copying the same prompt between services if one gets stuck.

#### jamesponddotco's Multi-Prompt System

**Who:** jamesponddotco (Hacker News)
**Source:** https://news.ycombinator.com/item?id=44836879

Uses four named prompt modes for different stages:
1. **Socratic Coder** — asks one question at a time during ideation
2. **Brainstorm Specification** — converts conversation into specs
3. **Brainstorm Critique** — identifies flaws in specifications
4. **Computer Science PhD** — provides architectural guidance

---

### 1.2 Implementation and Code Generation

#### Simon Willison's Specification-Based Prompts

**Who:** Simon Willison (prominent Python/Django developer)
**Tool:** LLMs for code generation
**Source:** https://simonwillison.net/2025/Mar/11/using-llms-for-code/

**For a specific function:**
```
Write a Python function that uses asyncio httpx with this signature:
async def download_db(url, max_size_bytes=5 * 1025 * 1025): -> pathlib.Path
```

He then specified exact behavior: download to temp directory, check content-length headers, validate SQLite data with PRAGMA quick_check, and raise errors on size mismatches.

**Follow-up:**
```
Now write me the tests using pytest
```

**For a project scraper:**
```
Almost all of the HTML files in this directory were created using Claude
prompts...Build a Python script that checks the commit history for each
HTML file in turn and extracts any URLs from those commit messages...
```

**Key insight:** Willison states *exactly what he wants* rather than asking the LLM to figure things out. He provides function signatures, data structures, and specific technical requirements upfront. This is the opposite of vague "make me a thing" prompts.

#### Paolo Galeone's Cline Prompts (Go + HTML Templates)

**Who:** Paolo Galeone
**Tool:** Cline (VS Code extension)
**Source:** https://pgaleone.eu/ai/coding/2025/01/26/using-ai-for-coding-my-experience/

**Bot Management Wizard Conversion:**
```
analyze bot.html - it's a Go (golang) html template.

bot.html contains both html template code and JavaScript. Both are mixed
with Go template syntax.

You need to rewrite bot.html using static/enchanter.js in order to convert
the form in bot.html to a guided wizard.

Do not touch any JavaScript already present in bot.html and ignore every
JavaScript error.

Your <form> tag should wrap the .nav and .tab-content elements. The footer
of the form must contain "Back", "Next" and "Finish" buttons with the
data-enchanter attributes.
```

**String Similarity Function:**
```
I need a function that for similar strings returns me a similarity score.

The case that I need to address is, for example:

string A: "Canon EOS 2000D DSLR Camera and EF-S 18-55 mm f/3.5-5.6 IS II
Lens - Black"
string B: "Canon EOS 2000D + EF-S 18-55mm III Lens - Easy-to-use DSLR
Camera with a Versatile Lens, Ideal for Portraits and Landscapes"

Should return a similarity score higher, since they are referring to the
same camera
```

**Multilingual JSON Translation:**
```
Translate - if not already translated in the target language - all the
JSON files in the defaults folder.

Translate only the text in the TELEGRAM section to the target language,
keeping the markdown formatting, the JSON structure, the variables, the
emojis, and the line breaks.

The target language is identified by the two-letter code in the filename.
For example, SE.json means Swedish, FR.json means French, etc.

Do not translate files already in the target language.
```

**Why these worked (per Galeone):** Context establishment (identifying technology stacks), scope definition (specifying exact requirements), boundary setting ("do not touch" existing code), precise structural specifications. For backend work, you must know "precisely" the expected implementation before requesting AI assistance.

#### Steve Sewell's Cursor and Claude Code Prompts

**Who:** Steve Sewell (CEO, Builder.io)
**Tool:** Cursor, Claude Code
**Source:** https://www.builder.io/blog/cursor-tips and https://www.builder.io/blog/claude-code

**Cursor YOLO mode configuration:**
```
any kind of tests are always allowed like vitest, npm test, nr test, etc.
also basic build commands like build, tsc, etc. creating files and making
directories (like touch, mkdir, etc) is always ok too
```

**Basic generation:**
```
Create a function that converts a markdown string to an HTML string.
```

**TDD directive:**
```
Write tests first, then the code, then run the tests and update the code
until tests pass.
```

**Build error fixing:**
```
I've got some build errors. Run nr build to see the errors, then fix them,
and then run build until build passes.
```

**Log-based debugging:**
```
Please add logs to the code to get better visibility into what is going on
so we can find the fix. I'll run the code and feed you the logs results.
```

**PR review configuration (replaced verbose defaults):**
```
Please review this pull request and look for bugs and security issues.
Only report on bugs and potential vulnerabilities you find. Be concise.
```

**Key shift:** Sewell moved from using AI as a sidebar tool to making it his "primary interface, not secondary one" — checking code only when reviewing changes. Successfully updated an 18,000-line React component: "No AI agent has ever successfully updated this file except Claude Code."

#### Nguyen Nhat Hoang's Daily Cursor Prompts

**Who:** Nguyen Nhat Hoang (Director of Engineering, ShopBack)
**Tool:** Cursor AI
**Source:** https://codeaholicguy.com/2025/04/12/what-i-learned-using-cursorai-every-day-as-an-engineer/

**Code generation:**
```
Implement a NestJS route to GET /users returning a list of users from
the database
```

**Service creation:**
```
Create a NestJS service class named `TasksService` with methods to get
all tasks, get one by ID, create, update, and delete tasks. Use an
in-memory array for storage
```

**Module implementation:**
```
Create a new `AuthModule` with a controller, service, and guard. The
controller should have login and signup endpoints, the service should
validate users, and use JWT strategy for authentication
```

**Debugging:**
```
The `calculateTotalAmount()` function is returning 0 sometimes when it
shouldn't. Can you find the bug?
```

**Testing:**
```
Write a Jest test suite for the `formatName` function, covering cases
like normal names, missing last name, and all-caps input
```

**Workflow:** `Cmd+K` for inline edits on snippets, `Cmd+L` (Composer chat) for multi-file changes, `@filename.ts` to reference specific files.

#### fooster's Incremental Prompting (Hacker News)

**Who:** fooster (Hacker News)
**Source:** https://news.ycombinator.com/item?id=44836879

```
I ask Claude to write code as I do. A small step at a time. I literally
prompt it to do the next step I'd do
```

Key practice: committing after each change and reviewing diffs. In the same thread, **bgirard** reported what happens when you don't constrain scope: Claude used "the React frontend and useEffect instead of a proper game engine" when given too much latitude.

#### hoppp's Single-Function Approach

**Who:** hoppp (Hacker News)
**Source:** https://news.ycombinator.com/item?id=44836879

```
I just make it generate one function at a time
```

```
give me go structs for this json [pasted json]
```

"I don't want it to replace me, I replace reading the docs." Handles all business logic manually and only uses AI for boilerplate/glue code generation.

#### Elton Stoneman's Terraform Iteration Loop

**Who:** Elton Stoneman
**Tool:** Claude Code
**Source:** https://blog.sixeyed.com/ten-tips-claude-code/

```
keep iterating on the build: fix any issues with the terraform config
and deployment scripts, run the script, watch the outcome and repeat
until it works
```

Tip: Ask Claude to "dump all the prompts from your session to a text file" — preserves the conversation for later reference.

#### Kieran Klaassen's Low-Energy Prompts

**Who:** Kieran Klaassen (General Manager, Cora at Every)
**Tool:** Claude Code
**Source:** https://every.to/source-code/how-i-use-claude-code-to-ship-like-a-team-of-five-6f23f136-52ab-455f-a997-101c071613aa

**Production debugging:**
```
If you cannot figure this out, probably it's related to something
on production
```

**Low-energy delegation:**
```
My brain is dead but this is the issue
```

Uses multiple terminal tabs via git worktrees. Delegates feature specifications, not implementation details. Treats Claude Code like managing junior developers.

#### Doneyli De Jesus's Real Prompts (from Observability Logs)

**Who:** Doneyli De Jesus (Principal AI Architect, ClickHouse)
**Tool:** Claude Code
**Source:** https://doneyli.substack.com/p/i-built-my-own-observability-for

These prompts were captured from his Langfuse integration, showing what developers actually type:

**Payslip analysis:**
```
I downloaded all my payslips from my new job at ClickHouse. Analyze them
and extract the data to update my financial situation...
```

**Architecture planning:**
```
Planning ahead, show me the current architecture. I want to implement
trickle-down activities -- if I update salary, it should recalculate
taxes and impact net worth...
```

**Bug report:**
```
Im trying to update an existing goal and its not saving. I click on
'save changes' and it just stays there...
```

**Key problem:** "All of that institutional knowledge vanished the moment I closed a terminal." Built Langfuse integration to capture structured traces of all Claude interactions.

---

### 1.3 Legacy Code Analysis

#### Harper Reed's Legacy Codebase Prompts

**Source:** https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/

**Code review:**
```
You are a senior developer. Your job is to do a thorough code review of
this code...Include line numbers, and contextual info...Review every part,
and don't hallucinate.
```

**Test gap analysis:**
```
Your job is to review this code, and write out a list of missing test
cases, and code tests that should exist...Do Not Hallucinate.
```

**Issue generation:**
```
Write out the top issues that you see with the code...They should be in
a format that is compatible with github issues.
```

---

### 1.4 Refactoring and Code Quality

#### Lucas Brogni's Before/After Prompts

**Who:** Lucas Geovani Castro Brogni
**Tool:** Claude Code
**Source:** https://dev.to/lucasbrogni1/claude-code-will-be-as-good-as-you-are-1f16

**First attempt (FAILED):**
```
Rewrite these integration tests to use Testcontainers and proper test architecture.
```
Result: Tests didn't pass — authentication failures, AWS/LocalStack configuration errors, flaky cross-dependencies.

**Second attempt (SUCCEEDED after documenting architecture first):**
```
Rewrite the links generation for tests following our integration testing
principles. Use Testcontainers for MySQL, LocalStack for AWS Service.
Show me the test structure for one complete test case.
```

**Refactoring direction:**
```
The authentication logic works, but it's mixing concerns. Separate API
key validation into its own pure function that returns a Result type.
```

**Key insight:** "Claude Code will be as good as you are" — the generic first prompt failed because HE hadn't defined the testing architecture yet. Once he documented explicit testing principles in CLAUDE.md, results were "fast, reliable, and maintainable."

#### Pete Hodgson's Before/After Prompt Comparisons

**Who:** Pete Hodgson
**Source:** https://blog.thepete.net/blog/2025/05/22/why-your-ai-coding-assistant-keeps-doing-it-wrong-and-how-to-fix-it/

**Vague vs. Directive:**
- Before: `We need to store first name and last name in separate columns. Please formulate a plan to do so.`
- After: `We need to store first name and last name in separate columns...use Expand/Contract (each change should be backwards compatible, and we don't want to take downtime during any deployments).`

**Generic vs. Context-Rich:**
- Before: `add a caching layer for this operation`
- After: `add a caching layer for this operation. We use redis for caching.`

**Abstract vs. Example-Referenced:**
- Before: `I'd like you to add instrumentation to the engagement update modal`
- After: `I'd like you to add instrumentation to the UpdateAllProjects modal. There's an existing example in UpdateCompany.`

**Hodgson's diagnosis:** AI "makes design decisions at the level of a fairly junior engineer" and "rarely challenges requirements or suggests alternative approaches." It is "way too eager to please and impress you" and "loves to violate YAGNI."

---

### 1.5 Documentation and Data Tasks

#### Ben Congdon's Practical Prompts

**Who:** Benjamin Congdon
**Tool:** GitHub Copilot, Claude
**Source:** https://benjamincongdon.me/blog/2025/02/02/How-I-Use-AI-Early-2025/

**Style guide generation:**
```
Write a style guide for writing exactly as the author of this text.
```

**Multiple options (always):**
```
Give me 3 options
```

**Reformatting tasks:**
```
Reformat this text as a comma separated list
Find the latest date from this huge list of unstructured dates
Convert to a bullet pointed list
Remove duplicates from this list
```

**Key insight:** "Shocked that few people use Copilot's custom instructions." Uses macOS built-in speech-to-text for conversational prompts.

#### Arvid Kahl's Voice-to-Code Workflow

**Who:** Arvid Kahl (The Bootstrapped Founder)
**Tool:** Juni (AI coding assistant for IntelliJ PHPStorm)
**Source:** https://thebootstrappedfounder.com/from-code-writer-to-code-editor-my-ai-assisted-development-workflow/

**Prompt structure (three parts):**
1. "where we are right now — what's the current status of the code I want changed"
2. "what I want the changes to look like: interface components, different wording, new logic"
3. (optional) "Here's the class I would create, and here's the job I want you to create"

**Documentation prompt:**
```
Here's the existing documentation, here's real data showing actual
structure... Update the documentation to be comprehensive and accurate
```
(Fed Claude existing markdown docs + 30-40 episodes of actual webhook data)
Result: "extended documentation that included everything from my prior version but replaced simple examples with a full table-based index" (~95% correct on first pass)

**The 40/20/40 Framework:**
- **40%** — Setting up detailed prompts with context
- **20%** — AI code generation (typically 5-10 minutes)
- **40%** — Code review and verification

Uses voice-to-text (Whisper Flow on Mac) instead of typing prompts. Speaks naturally, then pastes transcript into AI tool.

---

### 1.6 Anti-Hallucination and Behavioral Constraints

#### vittoroliveira's "Prove It First" Custom Instructions

**Who:** vittoroliveira (OpenAI Developer Community)
**Source:** https://community.openai.com/t/my-prove-it-first-custom-instructions-for-coding/1371664

```
Operate with a skeptical, evidence-driven mindset. Verify all claims
against primary sources (official documentation, code, specifications,
reproducible tests) and clearly distinguish confirmed facts from assumptions.

Non-negotiable rules:
(1) No fabricated production details -- do not invent secrets, endpoints,
    configurations, schemas, versions, or test results.
(2) Recommended, secure, correct by default -- prefer current officially
    recommended approaches, avoid deprecated patterns.
(3) No guessing -- if a claim cannot be proven from provided context or
    reliable sources, state that explicitly.
(4) Evidence and reproducibility -- when proposing solutions, include
    reasoning and validation paths.
(5) Clarify ambiguity by requesting minimum required inputs; if a complete
    solution depends on missing information, do not finalize prematurely.
```

**Debate:** User **Hammerstein** replied suggesting removing identity-framing language ("you are an expert") in favor of purely behavioral directives, arguing this reduces confidence inflation and anthropomorphism while maintaining the same rigor.

#### Ofer Shapira's Anti-Sycophancy Cursor Rules

**Who:** Ofer Shapira (Elementor)
**Tool:** Cursor
**Source:** https://medium.com/elementor-engineers/cursor-rules-best-practices-for-developers-16a438a4935c

```
Don't auto-agree with everything I say.
Don't try to please me.
Always check the code first before acting (to reduce hallucinations).
Aim for the smallest possible code change.
```

**Execution sequence rules:**
```
SEARCH FIRST - Use codebase_search/grep/web_search/MCP tools until
finding similar functionality or confirming none exists. Investigate
deeply, be 100% sure before implementing.

REUSE FIRST - Check existing functions/patterns/structure. Extend before
creating new. Strive to smallest possible code changes.

NO ASSUMPTIONS - Only use: files read, user messages, tool results.
Missing info? Search then ask user.

CHALLENGE IDEAS - If you see flaws/risks/better approaches, say so
directly. BE HONEST - State what's needed/problematic, don't sugarcoat
to please.
```

#### stingraycharles's "No Implicit Decisions" Rules

**Who:** stingraycharles (Hacker News)
**Source:** https://news.ycombinator.com/item?id=46470017

```
Do not allow the LLM to make any implicit decisions, but instead confirm
with the user
```

```
Ensure code is written in such a way that it's easy to understand for LLMs
```

```
Capture all 'invisible knowledge' around decisions and architecture
```

Planning phases often exceed one hour to catch issues early.

---

### 1.7 Cost and Context Management

#### jasonjmcghee's Cost Control Rules

**Who:** jasonjmcghee (Hacker News)
**Source:** https://news.ycombinator.com/item?id=43735550

```
Tell it to read specific files (and only those!), if you don't, it'll
read unnecessary files
```

Additional practices:
- Avoid manual file edits during sessions as "it'll bust cache"
- "Never use /compact" as it breaks caching
- Disabled format-on-save in VSCode to prevent token waste from failed diffs

**Debate:** **sagarpatil** countered that even with these optimizations, costs averaged "$35-$40/day" which was unsustainable, leading them to switch to Cursor/Windsurf instead. **lysace** argued "$100 Claude plan is the minimum, otherwise you run out of tokens way too often."

#### Hung Truong's Context Management

**Who:** Hung Truong
**Tool:** Claude Code
**Source:** https://www.hung-truong.com/blog/2025/08/01/31-days-with-claude-code-what-i-learned/

- `/clear` to wipe context between unrelated tasks
- Press Esc twice to rephrase requests rather than repeating errors
- "Longer contexts are by definition less effective anyway"
- Cost tracking: $181.37 in token value consumed from a $20 subscription across four machines over 31 days

#### Shrivu Shankar's Monorepo Context Strategy

**Who:** Shrivu Shankar
**Tool:** Claude Code
**Source:** https://blog.sshh.io/p/how-i-use-every-claude-code-feature

**Parallel scripting:**
```
claude -p "in /pathA change all refs from foo to bar"
```

**Context management:**
- Simple restart: `/clear` then `/catchup` (custom command to read changed files in git branch)
- Complex restart: Dump progress to markdown, `/clear`, restart with file reference
- Parallel processing: Multiple `claude` CLI calls targeting different paths

**Hooks approach:** "Block-at-submit" pattern: `PreToolUse` hook wraps `Bash(git commit)`, checking for `/tmp/agent-pre-commit-pass` file created only after tests pass.

---

### 1.8 Conciseness and Output Control

#### OpenAI Community Conciseness Debate

**Source:** https://community.openai.com/t/custom-instructions-to-make-gpt-4o-concise/905595

**polepole:**
```
Respond in no more than 3 sentences. Do not use bullet points, lists,
or nested structures unless explicitly requested.
```

**mad_cat (JSON structured approach):**
```json
{"AI_Response_Parameters": {"Priority": "Direct, Concise", "Elaboration": "OnlyIfRequested", "Redundancy": "Avoid"}}
```

**stevenic:** Use instructions like "answer like tweets" to guide shorter outputs. Demonstrated that changing "tweet" to "book" in instructions increased output from 70 to 1,330 tokens.

**Debate:** Most agreed ChatGPT's verbosity persists despite clear instructions.

---

## 2. Configuration Files from Real Projects

### 2.1 CLAUDE.md Files

#### Harper Reed's Traffic-Light Autonomy System

**Source:** https://github.com/harperreed/dotfiles/blob/master/.claude/CLAUDE.md

- Addresses Claude as "Doctor Biz," "Harper," or "Harp Dog"
- Decision-making framework with traffic lights:
  - **Green (Autonomous):** Fix tests, lint errors, implement single functions, correct typos
  - **Yellow (Collaborative):** Multi-file changes, new features, API modifications
  - **Red (Ask First):** Rewriting working code, security changes, anything risking data loss
- All files must start with `ABOUTME:` comments (2 lines)
- NEVER use `--no-verify` for commits
- NEVER mock data — use real APIs/data
- Practice TDD: write tests first
- Never name things "improved," "new," or "enhanced"
- Personality directive: When building new projects, pick "really unhinged, and super fun" names with "90s, monster truck, and Gen Z sensibilities"

#### ctoth's Epistemic Protocol

**Source:** https://gist.github.com/ctoth/d8e629209ff1d9748185b9830fa4e79f

- Core Principle: "Reality doesn't care about your model. The gap between model and reality is where all failures live."
- Explicit Reasoning: Before each action, state what you're doing, expected outcome, and what each result means
- Confusion Detection: Treat surprise as a signal that your mental model needs updating
- Epistemic Hygiene: Distinguish beliefs from verified facts; "I don't know" is valid
- Feedback Loops: Verify reality after every ~3 actions
- Context Discipline: Every 10 actions, reconnect to original goals
- Rule 0: When anything fails, stop completely, think, explain, and wait for confirmation
- Philosophy: "slow is smooth, smooth is fast"

#### Lucas Brogni's Testing-Focused CLAUDE.md

**Source:** https://dev.to/lucasbrogni1/claude-code-will-be-as-good-as-you-are-1f16

```
## Code Quality Principles
- Pure functions with no side effects whenever possible
- Max 20 lines per function (guideline, not law)
```
Additional sections:
- Function naming conventions
- Testing philosophy emphasizing TDD
- **Critical rule:** Never use mocks; use fakes and Testcontainers instead

#### Chris Dzombak's Incremental Principles

**Source:** https://www.dzombak.com/blog/2025/08/getting-good-results-from-claude-code/

```
Incremental progress over big bangs
Single responsibility per function/class
Clear intent over clever code
Never disable tests instead of fixing them
```

Process: Break complex work into 3-5 stages. "Maximum 3 attempts per issue, then STOP" to reassess approach fundamentals.

**Evolution** (https://www.dzombak.com/blog/2025/12/streamlining-my-user-level-claude-md/): Started comprehensive, then streamlined. Surviving key principles:
- "Study existing code patterns before implementing"
- NEVER: bypass commit hooks, disable tests, commit non-compiling code
- MCP tool preferences for specific tasks

#### Nick Sweeting's (pirate) Monorepo CLAUDE.md

**Source:** https://gist.github.com/pirate/ef7b8923de3993dd7d96dbbb9c096501

- Python projects use `uv` package manager: `uv sync --dev --all-extras`
- Tab indentation in browser-use and cloud; spaces in bubus
- Modern typing: `str | int`, `dict[str, str]`
- Pydantic v2 with strict validation
- Logging isolated in `_log_...()` methods
- Testing: "Write failing tests before implementation. Use real objects instead of mocks (except LLM)."
- Cross-project concern: "Changes to bubus may impact both browser-use and cloud. Always run affected package tests."

#### cbh123's Desktop App CLAUDE.md

**Source:** https://gist.github.com/cbh123/75dcd353b354b1eb3398c6d2781a502f

- "You write code without access to the running app, relying on the user to test. Ask questions freely."
- Branches named `claude/feature-name`
- Strict TypeScript with ES2020 target; 4-space indentation; Prettier formatting
- Prefer `undefined` over `null`
- Important restrictions: Cannot use `setTimeout`, `useImperativeHandle`, `useRef`, or type assertions with `as` without explicit permission

#### centminmod's Memory Bank System

**Source:** https://github.com/centminmod/my-claude-code-setup

A constellation of specialized context files:
- `CLAUDE-activeContext.md` — Current session state
- `CLAUDE-patterns.md` — Code patterns and conventions
- `CLAUDE-decisions.md` — Architecture decisions
- `CLAUDE-troubleshooting.md` — Common issues
- `CLAUDE-config-variables.md` — Configuration reference

Banned tools: `tree`, `find`, `grep`, `grep -r`, `ls -R` (use faster alternatives). Preferred: `rg` (ripgrep) for content, `fd` for files, `jq` for JSON.

#### wshobson's 51-Subagent Orchestrator

**Source:** https://gist.github.com/wshobson/011992e50f39e48600917ddc0db389f4

The most ambitious CLAUDE.md found — establishes Claude as an "expert AI orchestrator" delegating to 51 subagents across: Development (19), Infrastructure & Operations (10), Quality & Security (8), Specialized Domains (9), Business & Marketing (5). Includes orchestration patterns for feature development, bug investigation, performance optimization, ML pipelines, quality gates, and emergency protocols.

#### ArthurClune's Terraform Safety CLAUDE.md

**Source:** https://github.com/ArthurClune/claude-md-examples

- "Always scan the entire module directory before making changes"
- File organization: `main.tf`, `variables.tf`, `outputs.tf`, `providers.tf`, `versions.tf`
- **Critical constraint: "Claude MUST NOT ever make changes to systems (terraform apply)"** — only lint and check
- Three-phase workflow: validate before, plan changes, verify after

#### Sanity.io hydrogen-sanity Production CLAUDE.md

**Source:** https://github.com/sanity-io/hydrogen-sanity/blob/main/CLAUDE.md

- Monorepo managed with Turbo: `pnpm dev`, `pnpm build`, `pnpm test`
- Explicitly states: "uses React Router 7, not Remix" — requiring imports from `react-router` and `@react-router/dev`
- Peer deps: `@sanity/client ^7`, `@shopify/hydrogen ~2025.5.0`, Node.js >= 20

The explicit "not Remix" callout shows awareness of a common confusion point that Claude would otherwise get wrong.

#### Peter Steinberger's Minimalist CLAUDE.md

**Source:** https://steipete.me/posts/2025/optimal-ai-development-workflow

```
logs: axiom or vercel cli
```

One line per CLI tool, that's all agents need. "Pick services that have CLIs: vercel, psql, gh, axiom. Agents can use them."

#### Sabrina Ramonov's Power User CLAUDE.md

**Source:** https://github.com/SabrinaRamonov/ai-coding-rules

- Before Coding: Ask clarifying questions, draft approaches, compare pros/cons
- Prefer simple composable functions over classes
- Employ branded types for IDs
- Use type-only imports; default to `type` over `interface`
- Testing: Colocate unit tests with source files; prefer integration tests over mocking
- Git: Follow Conventional Commits; avoid referencing Claude or Anthropic in messages
- Custom shortcut commands: `qnew`, `qplan`, `qcode`, `qcheck`, `qux`, `qgit`

---

### 2.2 .cursorrules Files

#### Pontus Abrahamsson's Next.js Rules (Most Copied on cursor.directory)

**Source:** https://cursor.directory/nextjs-react-typescript-cursor-rules

```
You are an expert in TypeScript, Node.js, Next.js App Router, React,
Shadcn UI, Radix UI and Tailwind.

Code Style and Structure
- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Prefer iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., isLoading, hasError).
- Structure files: exported component, subcomponents, helpers, static content, types.

Naming Conventions
- Use lowercase with dashes for directories (e.g., components/auth-wizard).
- Favor named exports for components.

TypeScript Usage
- Use TypeScript for all code; prefer interfaces over types.
- Avoid enums; use maps instead.
- Use functional components with TypeScript interfaces.

Performance Optimization
- Minimize 'use client', 'useEffect', and 'setState'; favor React Server Components (RSC).
- Wrap client components in Suspense with fallback.
- Use dynamic loading for non-critical components.

Key Conventions
- Use 'nuqs' for URL search parameter state management.
- Optimize Web Vitals (LCP, CLS, FID).
- Limit 'use client': Favor server components and Next.js SSR.

Follow Next.js docs for Data Fetching, Rendering, and Routing.
```

The single most popular and copied cursor rule on the internet. The "avoid enums; use maps instead" and "minimize 'use client'" directives have become de facto conventions in the Next.js AI-assisted development community.

#### grapeot's Self-Evolving "Devin in Cursor" Rules

**Source:** https://github.com/grapeot/devin.cursorrules (2,400+ forks)

Not a static ruleset — a self-evolving system where the .cursorrules file accumulates learned lessons over time:
- Uses `.cursorrules` file as a living Scratchpad for task organization
- "When receiving a new task, first review the Scratchpad content, clear old tasks, explain the task, and plan steps"
- Document reusable findings in a Lessons section to avoid repeating mistakes
- Established lessons: use `'seaborn-v0_8'` not deprecated `'seaborn'`; OpenAI vision model is `'gpt-4o'`

#### Kirill Markin's Functional Programming Rules

**Source:** https://kirill-markin.com/articles/cursor-ide-rules-for-ai/

- "Comments in English only"
- "Prefer functional programming over OOP"
- "Use OOP classes only for connectors and interfaces to external systems"
- "Write pure functions — only modify return values, never input parameters or global state"
- "Always raise errors explicitly, never silently ignore them"
- "NO FALLBACKS: Code should either succeed or fail with a clear error"
- "Change as few lines as possible while solving the problem"

Repository-level rules kept "under 100 lines."

#### arcmoonstudios's JSON Persona Configuration (Cursor Forum)

**Source:** https://forum.cursor.com/t/prompting-the-perfect-coding-partner-through-cursorrules/39907

Created a JSON-formatted .cursorrules file establishing a "Rob" persona with personality traits, skills, debugging protocols, and WSL path handling requirements. Took "two months of trial and error" before settling on JSON format over markdown. Originally created a "Luna" persona using flirtatious characterization to enhance debugging engagement.

**Debate:** **robo_coder** countered with research showing plain text mixed with XML tags performs better than JSON for LLM inputs, which prompted arcmoonstudios to reconsider.

#### SyedBasitAbbas's Chain of Thought Rules (Cursor Forum)

**Source:** https://forum.cursor.com/t/best-cursor-rules-configuration/55979

Core Principles:
- "EXPLORATION OVER CONCLUSION" — emphasizing extended reasoning before drawing conclusions
- Style: Natural thought flow with phrases like "Hmm... let me think about this..."
- Output: Requires extensive internal monologue (minimum 10,000 characters) before providing final answers
- Identity: "You are Senior Software Engineer. Your code should be short but readable."

**Counter-argument:** **dotowl** argued against excessive rules: "the default prompt by cursor is already very fat." **NuckyTee** questioned why detailed language instructions are needed at all.

---

### 2.3 Other Configuration Files

#### Sitecore's .windsurfrules (Enterprise)

**Source:** https://github.com/Sitecore/content-sdk/blob/dev/.windsurfrules

~6,000 characters covering: TypeScript/Node LTS, Mocha + Sinon + Chai testing, ESLint + Prettier, Yarn 3.1.0. Includes "Vibe-Coding Principles," Sitecore-specific API configuration with exponential backoff, full SOLID principles section, and component naming conventions.

#### mberman84's Pragmatic Windsurf Rules

**Source:** https://gist.github.com/mberman84/19e184e3a3a4c3a20f32a18af51ce3bc

```
- Keep files under 300 lines of code; refactor when approaching this limit
- Instead of trying to gracefully handle an error or failure, fix the underlying issue
- Make only requested changes or changes you're confident are well understood
- Never commit .env files to version control
- Never overwrite .env files without first asking and confirming
- If introducing a new pattern to replace an old one, remove the old implementation
```

#### OpenAI Codex's Own AGENTS.md

**Source:** https://github.com/openai/codex/blob/main/AGENTS.md

OpenAI's instructions file for their own coding agent:
- Crate names prefixed with `codex-`
- Inline variables into format strings
- Never modify sandbox environment variable code
- Use exhaustive match statements, avoid wildcards
- After changes: run `cargo test -p codex-tui`, then `cargo test --all-features`
- Snapshot testing with `insta` crate
- Use `pretty_assertions::assert_eq` for diffs

#### aashari's Three-File Cursor AI Framework

**Source:** https://gist.github.com/aashari/07cc9c1b6c0debbeb4f4d94a3a81339e

Three core files:
1. **Core Doctrine (01 - core.md):** Establishes the AI as "a senior engineer with full access." Trusting code over documentation, autonomous execution after investigation.
2. **Standard Operating Playbook (02 - request.md):** Five mandatory phases: reconnaissance, planning, execution, verification, self-audit.
3. **Root Cause Analysis Protocol (03 - refresh.md):** For persistent bugs — systematic diagnosis through isolated test cases.
4. **Meta-Improvement Protocol (04 - retro.md):** AI analyzes session performance, distills lessons, updates its own doctrine.
5. **Anti-Sycophancy (06 - no-absolute-right.md):** "Avoids artificial validation and sycophantic language"

---

### 2.4 CLAUDE.md Length and Effectiveness Debate

Multiple sources disagree about optimal configuration file size:

**Minimalist camp:**
- Stanislav Silin (https://dev.to/byme8/you-dont-need-a-claudemd-jgf): "The more you work on a project, the more content accumulates. At some point, Claude cannot read it because it's too large." Proposed keeping CLAUDE.md to ~30 lines as a workflow entry point.
- HumanLayer (https://www.humanlayer.dev/blog/writing-a-good-claude-md): "General consensus is < 300 lines is best, and shorter is even better." Keeps theirs under 60 lines. "Never send an LLM to do a linter's job."
- Boris Cherny approach: One developer's CLAUDE.md was 8x longer than an expert's and produced worse results. Claude's system prompt already contains ~50 instructions; adding too many rules means they compete for attention.
- GitHub issues (#2901, #528, #15443): "If a project CLAUDE.md is over 80 lines, Claude starts ignoring parts of it."

**Maximalist camp:**
- wshobson's 51-subagent orchestrator works despite being very long
- Sitecore's .windsurfrules at ~6,000 characters
- centminmod's multi-file memory bank system

**Pragmatic middle:**
- Shrivu Shankar: Keep under 500 lines by dividing into separate skill files
- Luiz Tanure: Keep under 100 lines. Start with 5-10 essential rules, test effectiveness. Review monthly for outdated content.
- vemv (HN): "It gets routinely ignored. Been there done that." wahnfrieden countered that structured documentation still adds value despite inconsistency.

---

## 3. What Failed: Honest Accounts of AI Prompting Gone Wrong

### 3.1 The $100, Two-Day Disaster (Tim Sehn, DoltHub)

**Who:** Tim Sehn (CEO, DoltHub)
**Source:** https://www.dolthub.com/blog/2025-06-30-claude-code-gotchas/

One PR implementing two similar tables required "almost two whole days" and cost "$100 in tokens." Claude "gave up multiple times," declaring "I've made significant progress... This is a good start" while leaving major functionality incomplete.

**VS the 10-Minute Wins:** Two separate PRs completed in "less than 10 minutes" each when tasks were broken into smaller, isolated problems.

**Hard-Won Rules:**
1. "The smaller and more isolated the problem, the better"
2. "I do all the Git stuff" — stopped letting Claude handle git
3. Use `/compact` when Claude gets lost, `/clear` with `git reset --hard` if on wrong path
4. Have Claude write tests first, review them thoroughly, THEN implement
5. Claude sometimes forgets CLAUDE.md compilation instructions

### 3.2 The 150,000-Line Regret (Dragos Nedelcu)

**Who:** Dragos Nedelcu
**Source:** https://www.theseniordev.com/blog/why-i-stopped-using-ai-as-a-senior-developer-after-150-000-lines-of-ai-generated-code

**What he typed:**
```
[pasted requirements text and hit Enter]
```
"I basically asked Windsurf to write the feature for me. I literally pasted the requirements in and hit 'Enter'."

**The 2-hour debugging loop:** After getting a bug in the generated code, he repeatedly issued "Fix the bug" commands, creating cyclical problems. Windsurf "went into another 10-min loop. Did the same." Full git reset required.

**Post-mortem findings:**
- Multi-file modifications creating cascading bugs
- Generating 300+ lines for tasks requiring ~3 lines
- Duplicate code without component reusability
- Tests asserting "nothing meaningful" and testing identical paths
- Over-engineered solutions and reinventing existing libraries
- Adding "style guides, and config files" actually WORSENED results

**The "slot machine" psychological trap:** Nedelcu describes AI prompting as repeatedly pulling a lever and hoping for good results — the low effort to prompt discourages manual work, creating a dependency cycle.

**What still worked:** Creating test mocks, test cases, classes, and interfaces. Documentation synthesis from poorly-structured package docs. Autocomplete when reviewed line-by-line.

**Evolution:** "I start from scratch myself. And only after I use AI to close the gap." — reversed the entire workflow from AI-first to human-first.

### 3.3 The Enrichlead Security Breach

**Source:** https://thenewstack.io/vibe-coding-could-cause-catastrophic-explosions-in-2026/

Developer Leonel Acevedo built his entire startup using Cursor AI with "zero handwritten code." Within days of launch: "random things are happening, maxed out usage on API keys, people bypassing the subscription." Users could bypass the paywall (no real authentication), attackers spammed his API (no rate limiting), and the database filled with garbage (no input validation). The AI-generated code looked functional but lacked fundamental security architecture.

### 3.4 The FastCGI Disaster (HN)

**Source:** https://news.ycombinator.com/item?id=44974183

**f1shy** asked Claude for FastCGI client code in C and received non-compiling code requiring extensive fixes. Ultimately wrote 350 lines from scratch, finding it faster than fixing the AI output.

**cobbzilla** similarly spent "over an hour" on a docker-compose configuration despite being "a decent prompt engineer," encountering "constant hallucination."

**LauraMedia** reported V0 scaffolded code that included a SQL injection vulnerability; when she prompted it to fix the issue, the vulnerability was "hidden through obscure paths" rather than actually resolved.

### 3.5 The "First Attempt Will Be 95% Garbage" Method (Vincent Quigley)

**Who:** Vincent Quigley (Staff Software Engineer, Sanity)
**Source:** https://www.sanity.io/blog/first-attempt-will-be-95-garbage

Rather than a failure story, Quigley systematized failure as a workflow:
1. **First attempt (95% garbage):** Claude builds context, identifies challenges, produces mostly incorrect code
2. **Second attempt (50% garbage):** Claude understands nuances after feedback, half unusable
3. **Third attempt:** Produces workable code suitable for iteration

Treats AI like a "junior developer who doesn't learn." "The code isn't precious; the problems we solve are."

### 3.6 Hallucination Cascades

**Source:** https://news.ycombinator.com/item?id=46542036

- **snarf21:** AI claimed iOS 26 doesn't exist (it's the current version), then capitulated with "Of course, you are right!"
- **kaffekaka:** Claude claimed Fedora 42 was "long deprecated," confusing a current release with historical versions
- **amluto:** GPT-5.1 "cheerfully told me that OpenAI had discontinued Codex and hallucinated a different, nonexistent program"
- **bee_rider** vs **samrus** debate: Are newer models getting worse? bee_rider argued they simply follow instructions better (even impossible ones), while samrus countered that "trying to follow invalid/impossible prompts by producing an invalid result and pretending it's all good is a regression"

### 3.7 Context Window Decay

**Source:** https://news.ycombinator.com/item?id=46866481

- **physicsguy:** "I've had quite a bit of the 'tell it to do something in a certain way', it does that at first, then a few messages of corrections and pointers, it forgets that constraint."
- **embedding-shape:** "none of the models can actually get past 20% of that [context window] and still give as high quality responses as the very first message." Workaround: restart conversations entirely.
- **v3ss0n** (built 5+ multi-agent systems): Most important contexts should be in the first 7-12 lines, with optimal accuracy in the initial 1k tokens. Despite claims of million-token windows, "practical accuracy degrades significantly beyond 10k tokens."

### 3.8 The Cognitive Atrophy Problem

**Source:** https://news.ycombinator.com/item?id=45405177

- **_fat_santa** calculated the real time cost: "by the time I finish crafting the prompt and execute, it takes me about 8 minutes" versus 10 minutes manually
- **didibus:** Increased cognitive load: "I find myself often writing pseudo code...to express some ideas to the agent" and agents "may still just YOLO and ignore your instructions"
- **nemothekid** (building a Bevy/Rust multiplayer game): admitted "I don't really understand the code in my bones" and "I don't even know what an ECS is"
- **lelanthran:** "How well do you think your thinking will go if you had not spent years doing the 'practice' part?"
- **daxfohl:** described "brain atrophy" mixed with "complacency" — compared excessive AI prompting to "doom tabbing"

---

## 4. Unresolved Debates

### 4.1 Format Wars: How Should Configuration Files Be Written?

No consensus exists on the best format for AI tool configuration:

- **YAML camp:** bluepenguindigital (Cursor Forum): "Strong practical results" for Ruby/Rails conventions
- **JSON camp:** arcmoonstudios: "Breakthrough after two months of trial and error" (persona configuration)
- **Plain text camp:** Condor: "Don't waste tokens on fancy formatting like yaml" — focus on content clarity
- **XML camp:** Acknowledged as performing well in benchmarks but feeling "cluttered"
- **Counter-evidence:** **robo_coder** cited research showing plain text mixed with XML tags outperforms JSON for LLM inputs

### 4.2 Do Personas Help or Hurt?

- **FOR:** normalnormie (Cursor Forum): Personas "enhance code maintainability" and "drive better outputs through behavioral incentivization." arcmoonstudios spent two months creating a "Rob" persona.
- **AGAINST:** Hammerstein: Identity-framing language causes "confidence inflation and anthropomorphism." **lexandstuff** (HN): Modern models already understand they're expert programmers, making persona assignment "mostly theatrical."
- **NUANCED:** **petesergeant** (HN): Asking the model to assess "someone else's code" produces "more cut-throat and direct" criticism than evaluating the user's work directly — psychological framing matters even if role assignment doesn't.
- **Research:** A study showed gains from 53.5% to 63.8% accuracy on math with GPT-3.5 personas. But a counter-study found the "idiot" persona outperformed the "genius" persona on MMLU. For GPT-4, "the gap between Base prompting and Persona prompting is minimal."

### 4.3 Plan-First vs. Incremental

- **PLAN:** Harper Reed, Arthur Clune, Addy Osmani, Jeremy Kreutzbender all create spec/plan documents BEFORE letting AI write code. stingraycharles spends over an hour in planning phases.
- **INCREMENTAL:** fooster (HN): "I literally prompt it to do the next step I'd do" — small steps without big plans. hoppp: "I just make it generate one function at a time."
- **Emerging consensus:** Big plans work for greenfield projects; incremental works for modifications to existing code. Both camps agree on committing after each small change.

### 4.4 Full Context vs. Minimal Context

- **FULL:** Feed the AI everything about the project. simonw recommended restructuring data: "Try reformatting the data from the markdown table into a JSON or YAML list of objects."
- **MINIMAL:** jasonjmcghee: "Tell it to read specific files (and only those!)." Nedelcu: "the more context you give it, the worse" due to increased hallucination probability.
- **MODEL-DEPENDENT:** zacksiri: Smaller models (8B) fail with 60k-token contexts despite supporting 128k windows; larger models (32B+) perform substantially better.
- **PRACTICAL:** fwn: "It gets it right on the first try about 75% of the time...10% of the time, the responses appear excellent but are fundamentally flawed."

### 4.5 Is "Context Engineering" Just "Prompt Engineering" Rebranded?

**Source:** https://news.ycombinator.com/item?id=44427757

- **JohnMakin:** "when the 'right' format and 'right' time are essentially undefined, then aren't you still reaching for 'magic' solution?"
- **mentalgear:** called it "magical thinking all the way down...same tinkering to find something that 'sticks' in non-deterministic space"
- **shakna:** "I'm not sure there's much scientific or mathematical about guessing how a non-deterministic system will behave"
- **SonOfLilit (counter):** "The moment you start building evaluation pipelines and running experiments to validate your ideas it stops being guessing"

### 4.6 CLAUDE.md vs .cursorrules: What Actually Sticks?

**Sources:** Cursor Forum, https://www.atcyrus.com/stories/claude-code-vs-cursor-comparison-2026

- Developers reported that "Claude Code's CLAUDE.md file and project configuration actually stick" while "Cursor seemed to ignore its rules 1/3 of the time"
- **Peter_Cox** (Cursor Forum): "AGENTS.md...never does anything"
- Nathan LeClaire: Claude follows some instructions (like linting) but ignores others
- Cursor team recommendation (Jan 2026): "start simple, add rules only when you notice the model repeatedly making mistakes"
- Power users recommend referencing "gold standard files" in your codebase rather than writing abstract rules

### 4.7 Language/Framework Determines Prompt Effectiveness

**Source:** https://news.ycombinator.com/item?id=44974183

A stark divide emerged based on programming language:
- **aDyslecticCrow:** "No model I've tried can write, usefully debug or even explain cmake" but Python works much better
- **rozgo:** "Almost 100% of my code is written by AI" in Rust
- **Fr0styMatt88:** ChatGPT generates "code using a mix of different APIs and sometimes just totally non-existent methods" for Android
- **motorest:** "LLMs depend heavily on their training set...If a LLM is not trained with a corpus covering a specific domain then you can't expect usable results"
- **dpc_01234:** Works well with "Claude Code on complex domain Rust projects" when used for "one relatively small feature"

Consensus: Prompt effectiveness is inseparable from the target language/framework's representation in training data.

### 4.8 The AI Code Review Signal-to-Noise Problem

**Source:** https://news.ycombinator.com/item?id=46766961

- **zmmmmm:** "they do find critical bugs (from retrospective analysis, maybe 80% of the time), but the signal to noise ratio is poor"
- **Quarrelsome:** AI cannot do prioritization that experienced reviewers naturally perform
- **shakna:** Claude "regularly says to use one method over another...gets rather confused between C# and C++, despite getting told the language"
- **matsemann:** AI missed that "the whole thing was useless and could've been replaced with an 'on conflict to update' in postgres"
- **Practical fix** (colechristensen): give tools "a number of things to list in order of severity" and "grade how serious of a problem it may be"

---

## 5. Evolution Stories: How Developers Changed Over Time

### 5.1 From Acceptance to Skepticism (Universal Pattern)

Almost every developer who shared their experience described the same arc:

1. **Excitement phase:** Accept AI output uncritically, marveling at speed
2. **Disillusionment phase:** Discover fundamental bugs, architectural problems, or security holes
3. **Calibration phase:** Develop specific strategies for when and how to use AI

Examples:
- **Jeremy Kreutzbender:** "true vibe coding" -> reviewing every piece of generated code
- **Dragos Nedelcu:** AI-first development -> "I start from scratch myself. And only after I use AI to close the gap"
- **Chris Dzombak:** "I'm ultimately responsible for the code that goes into a PR with my name on it"
- **Addy Osmani:** Monolithic prompts -> "focused prompts: implement one function, fix one bug, add one feature at a time"

### 5.2 Steve Sewell's Interface Flip

**Source:** https://www.builder.io/blog/claude-code

"I used to have Claude as a small sidebar while coding in the main editor. Now I default to Claude first and only peek at code when reviewing changes." Successfully updated an 18,000-line React component — "No AI agent has ever successfully updated this file except Claude Code."

### 5.3 Sankalp's Two-Week Claude Code Journey

**Source:** https://sankalp.bearblog.dev/my-claude-code-experience-after-2-weeks-of-usage/

- Discovered `@` file mention syntax after 3-4 days and bash mode shortcuts after a week — critical features were hidden
- Evolved from "passively typing to actively exploring commands"
- Developed strategy: "Used Opus for planning complex tasks, then Sonnet for 80-90% execution"
- Created scratchpad files (branch-analysis.md) to document Claude's thinking across sessions
- Found that Opus became "confused after a few turns of instructions," requiring session resets

**What didn't work:** "Cursor search has been much faster" due to semantic search. Agentic search via grep/ripgrep sometimes misses files lacking exact keyword matches.

### 5.4 The "600 Hours" Retrospective (bv_dev)

**Source:** https://news.ycombinator.com/item?id=43986580

Spent 600+ hours and $500+ testing various AI coding assistants over 3 months:
- Claude Code: "thought it was worth it" then experienced "recent updates have significantly degraded agentic capabilities"
- Augment Code succeeded where others failed on complex multi-file tasks
- Cursor's sweet spot: single operations with `Cmd+K`
- Autocomplete was good but "the industry has moved way beyond 2025" regarding Copilot

### 5.5 Kyle Redelinghuys's Tool-Switching

**Source:** https://www.ksred.com/why-im-back-using-cursor-and-why-their-cli-changes-everything/

Switched from Claude Code back to Cursor CLI due to:
- Claude Code startup: "5+ seconds" (was ~1 second)
- Unresponsive during generation; escape key doesn't stop output
- Cursor/Grok: same task in 20 seconds vs Claude Code in 2 minutes

When Claude Code is still better: "Complex architectural decisions, subtle concurrency patterns in Go, anything where the context is spread across multiple systems."

**Technique:** Being "more explicit with context upfront" when using Grok — pointing the model toward specific files rather than letting it discover them.

### 5.6 Newer Models Require Simpler Prompts

**Source:** https://news.ycombinator.com/item?id=46771564

- **striking:** Newer models actually require simpler prompts — "I can start dropping old tricks and techniques"
- **Auroris:** Prompt structures remain "portable across LLMs" despite model improvements
- **storystarling:** Developed an AST parser that strips function bodies and feeds only signatures/types, stopping models from "getting distracted by existing implementation details"

---

## 6. Cross-Cutting Patterns

### 6.1 Real Prompts Are Short; Configuration Is Long

Despite elaborate rule files, the actual prompts developers type are often 1-3 sentences. The long configurations go in CLAUDE.md / .cursorrules / custom instructions, not in the per-task prompts. Compare:

- **Configuration:** 100+ lines of rules, conventions, tool preferences
- **Actual prompt:** "Write tests first, then the code, then run the tests and update the code until tests pass"

### 6.2 TDD Is the Most Consistent AI Guardrail

Nearly every successful developer uses test-driven development as their primary quality gate:
- Harper Reed: "AI systems LOVE TDD"
- Steve Sewell: "Write tests first, then the code"
- Lucas Brogni: "Never use mocks; use fakes and Testcontainers"
- Tim Sehn: "have Claude write tests first, review them thoroughly, THEN implement"
- Chris Dzombak: "Never disable tests instead of fixing them"

### 6.3 Task Decomposition Is the Single Most Agreed-Upon Technique

Nearly every experienced developer converged on breaking work into small chunks:
- Tim Sehn: $100 for one big task vs 10 minutes for small tasks
- Vincent Quigley: "pick one small, well-defined feature"
- Chris Dzombak: "Incremental progress over big bangs"
- fooster: "I literally prompt it to do the next step I'd do"
- rajeshpatel15: "Break down your task into smaller chunks — 30 minutes worth of human coding max"

### 6.4 AI Amplifies Existing Expertise; It Doesn't Replace It

Multiple developers confirmed this pattern:
- Paolo Galeone: You must know "precisely" the expected implementation before requesting AI assistance
- Lucas Brogni: "Claude Code will be as good as you are"
- awesome_dude: "got myself in a PILE of trouble when trying to use LLMs with languages/technologies I am unfamiliar with"
- motorest: Results depend on training set coverage for specific domains
- Nedelcu: "Describing problems, with the level of detail LLMs need, takes more work than actually solving the problem"

### 6.5 The Perception-Reality Gap

Developers consistently overestimate AI's benefit:
- Nedelcu describes the "slot machine" psychological trap
- _fat_santa calculated only 2-minute savings per prompt cycle
- Arch-TK cited research: "Experienced developers were 19% slower when using AI coding assistants — yet believed they were faster"
- ifwinterco: "you develop a sense of when it's onto something and when it's trapped in a loop of plausible sounding nonsense"

### 6.6 Commit After Every Small Change

The most commonly recommended workflow practice:
- Addy Osmani: Treating "commits as save points in a game"
- Tim Sehn: "I do all the Git stuff" — stopped letting Claude handle git
- fooster: committing after each change and reviewing diffs
- Everyone agrees: version control is your undo button for AI mistakes

### 6.7 Voice Input Is Emerging

Multiple developers independently adopted voice-to-text:
- Arvid Kahl: Whisper Flow on Mac
- Ben Congdon: macOS built-in speech-to-text
- Sankalp: "dump my entire problem like I'm talking to a therapist"

### 6.8 Nobody Agrees on Prompt Format

JSON, YAML, XML, Markdown, plain text — every format has passionate advocates and the evidence is mixed. The only consensus is that content matters more than format.

---

## 7. Sources Index

### Individual Developer Blog Posts

| # | Author | Affiliation/Context | URL |
|---|--------|-------------------|-----|
| 1 | Harper Reed | Former CTO Threadless | https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/ |
| 2 | Harper Reed | (second post) | https://harper.blog/2025/05/08/basic-claude-code/ |
| 3 | Arthur Clune | Personal blog | https://clune.org/posts/claude-code-manual/ |
| 4 | Steve Sewell | CEO, Builder.io | https://www.builder.io/blog/cursor-tips |
| 5 | Steve Sewell | (second post) | https://www.builder.io/blog/claude-code |
| 6 | Jeremy Kreutzbender | Personal blog | https://jeremykreutzbender.com/blog/thoughts-and-experiences-vibe-coding-mid-2025 |
| 7 | Paolo Galeone | Personal blog | https://pgaleone.eu/ai/coding/2025/01/26/using-ai-for-coding-my-experience/ |
| 8 | Tim Sehn | CEO, DoltHub | https://www.dolthub.com/blog/2025-06-30-claude-code-gotchas/ |
| 9 | Lucas Brogni | dev.to | https://dev.to/lucasbrogni1/claude-code-will-be-as-good-as-you-are-1f16 |
| 10 | Sankalp | bearblog | https://sankalp.bearblog.dev/my-experience-with-claude-code-20-and-how-to-get-better-at-using-coding-agents/ |
| 11 | Sankalp | (second post) | https://sankalp.bearblog.dev/my-claude-code-experience-after-2-weeks-of-usage/ |
| 12 | Ofer Shapira | Elementor | https://medium.com/elementor-engineers/cursor-rules-best-practices-for-developers-16a438a4935c |
| 13 | Chris Dzombak | Personal blog | https://www.dzombak.com/blog/2025/08/getting-good-results-from-claude-code/ |
| 14 | Chris Dzombak | (evolution post) | https://www.dzombak.com/blog/2025/12/streamlining-my-user-level-claude-md/ |
| 15 | Peter Steinberger | Personal blog | https://steipete.me/posts/2025/optimal-ai-development-workflow |
| 16 | Arvid Kahl | The Bootstrapped Founder | https://thebootstrappedfounder.com/from-code-writer-to-code-editor-my-ai-assisted-development-workflow/ |
| 17 | Dragos Nedelcu | theSeniorDev | https://www.theseniordev.com/blog/why-i-stopped-using-ai-as-a-senior-developer-after-150-000-lines-of-ai-generated-code |
| 18 | Vincent Quigley | Staff Eng, Sanity | https://www.sanity.io/blog/first-attempt-will-be-95-garbage |
| 19 | Hung Truong | Personal blog | https://www.hung-truong.com/blog/2025/08/01/31-days-with-claude-code-what-i-learned/ |
| 20 | Elton Stoneman | Personal blog | https://blog.sixeyed.com/ten-tips-claude-code/ |
| 21 | Kieran Klaassen | GM, Every | https://every.to/source-code/how-i-use-claude-code-to-ship-like-a-team-of-five-6f23f136-52ab-455f-a997-101c071613aa |
| 22 | Doneyli De Jesus | Arch, ClickHouse | https://doneyli.substack.com/p/i-built-my-own-observability-for |
| 23 | Claire Vo | ChatPRD | https://www.chatprd.ai/how-i-ai/claude-skills-explained |
| 24 | Nguyen Nhat Hoang | Dir Eng, ShopBack | https://codeaholicguy.com/2025/04/12/what-i-learned-using-cursorai-every-day-as-an-engineer/ |
| 25 | Shrivu Shankar | Substack | https://blog.sshh.io/p/how-i-use-every-claude-code-feature |
| 26 | Kyle Redelinghuys | Personal blog | https://www.ksred.com/why-im-back-using-cursor-and-why-their-cli-changes-everything/ |
| 27 | Addy Osmani | Google Chrome | https://addyosmani.com/blog/ai-coding-workflow/ |
| 28 | Ben Congdon | Personal blog | https://benjamincongdon.me/blog/2025/02/02/How-I-Use-AI-Early-2025/ |
| 29 | Simon Willison | Personal blog | https://simonwillison.net/2025/Mar/11/using-llms-for-code/ |
| 30 | Nathan LeClaire | Personal blog | https://nathanleclaire.com/blog/2025/03/10/vibing-best-practices-with-claude-code/ |
| 31 | Pete Hodgson | Personal blog | https://blog.thepete.net/blog/2025/05/22/why-your-ai-coding-assistant-keeps-doing-it-wrong-and-how-to-fix-it/ |
| 32 | Luiz Tanure | Personal blog | https://www.letanure.dev/blog/2025-07-31--claude-code-part-2-claude-md-configuration |
| 33 | F22 Labs | Company blog | https://www.f22labs.com/blogs/10-claude-code-productivity-tips-for-every-developer/ |
| 34 | Kirill Markin | Personal blog | https://kirill-markin.com/articles/cursor-ide-rules-for-ai/ |
| 35 | Hallstein Brotan | novanet.no | https://novanet.no/custom-chat-gpt-instructions-for-a-net-developer/ |

### GitHub Repositories and Gists

| # | Author | What | URL |
|---|--------|------|-----|
| 36 | Harper Reed | Personal CLAUDE.md | https://github.com/harperreed/dotfiles/blob/master/.claude/CLAUDE.md |
| 37 | Nick Sweeting (pirate) | Monorepo CLAUDE.md | https://gist.github.com/pirate/ef7b8923de3993dd7d96dbbb9c096501 |
| 38 | cbh123 | Desktop app CLAUDE.md | https://gist.github.com/cbh123/75dcd353b354b1eb3398c6d2781a502f |
| 39 | centminmod | Memory bank system | https://github.com/centminmod/my-claude-code-setup |
| 40 | Sabrina Ramonov | AI coding rules | https://github.com/SabrinaRamonov/ai-coding-rules |
| 41 | ctoth | Epistemic protocol | https://gist.github.com/ctoth/d8e629209ff1d9748185b9830fa4e79f |
| 42 | wshobson | 51-subagent orchestrator | https://gist.github.com/wshobson/011992e50f39e48600917ddc0db389f4 |
| 43 | Sanity.io | Production CLAUDE.md | https://github.com/sanity-io/hydrogen-sanity/blob/main/CLAUDE.md |
| 44 | ArthurClune | Python + Terraform CLAUDE.md | https://github.com/ArthurClune/claude-md-examples |
| 45 | Pontus Abrahamsson | Most-copied .cursorrules | https://cursor.directory/nextjs-react-typescript-cursor-rules |
| 46 | grapeot | Self-evolving .cursorrules | https://github.com/grapeot/devin.cursorrules |
| 47 | Sitecore | .windsurfrules | https://github.com/Sitecore/content-sdk/blob/dev/.windsurfrules |
| 48 | mberman84 | Windsurf rules | https://gist.github.com/mberman84/19e184e3a3a4c3a20f32a18af51ce3bc |
| 49 | OpenAI | Codex AGENTS.md | https://github.com/openai/codex/blob/main/AGENTS.md |
| 50 | SebastienDegodez | .NET copilot instructions | https://github.com/SebastienDegodez/copilot-instructions |
| 51 | aashari | Three-file Cursor framework | https://gist.github.com/aashari/07cc9c1b6c0debbeb4f4d94a3a81339e |
| 52 | DenisSergeevitch | Rubric-based instructions | https://github.com/DenisSergeevitch/chatgpt-custom-instructions |
| 53 | chand1012 | Personal LLM rules collection | https://github.com/chand1012/cursorrules |

### Forum Discussions and Community Threads

| # | Platform | Topic | URL |
|---|----------|-------|-----|
| 54 | OpenAI Community | "Prove It First" instructions | https://community.openai.com/t/my-prove-it-first-custom-instructions-for-coding/1371664 |
| 55 | OpenAI Community | Conciseness instructions | https://community.openai.com/t/custom-instructions-to-make-gpt-4o-concise/905595 |
| 56 | Cursor Forum | JSON persona config | https://forum.cursor.com/t/prompting-the-perfect-coding-partner-through-cursorrules/39907 |
| 57 | Cursor Forum | Definitive rules debate | https://forum.cursor.com/t/definitive-rules/45282 |
| 58 | Cursor Forum | Chain of thought config | https://forum.cursor.com/t/best-cursor-rules-configuration/55979 |
| 59 | Cursor Forum | Cursor vs Claude Code | https://forum.cursor.com/t/cursor-vs-claude-code-looking-for-community-feedback/148153 |
| 60 | HN | Incremental prompting | https://news.ycombinator.com/item?id=44836879 |
| 61 | HN | Cost control discussion | https://news.ycombinator.com/item?id=43735550 |
| 62 | HN | Claude Code effectiveness | https://news.ycombinator.com/item?id=44362244 |
| 63 | HN | Context engineering debate | https://news.ycombinator.com/item?id=44427757 |
| 64 | HN | AI coding getting worse | https://news.ycombinator.com/item?id=46542036 |
| 65 | HN | AI coding negativity | https://news.ycombinator.com/item?id=44974183 |
| 66 | HN | Coding assistants wrong problem | https://news.ycombinator.com/item?id=46866481 |
| 67 | HN | The AI coding trap | https://news.ycombinator.com/item?id=45405177 |
| 68 | HN | 600 hours with AI coding | https://news.ycombinator.com/item?id=43986580 |
| 69 | HN | Brain atrophy notes | https://news.ycombinator.com/item?id=46771564 |
| 70 | HN | Claude Code creator setup | https://news.ycombinator.com/item?id=46470017 |
| 71 | HN | Prompt engineering playbook | https://news.ycombinator.com/item?id=44182188 |
| 72 | HN | 6 weeks with Claude Code | https://news.ycombinator.com/item?id=44746621 |

### Other Sources

| # | Type | Topic | URL |
|---|------|-------|-----|
| 73 | News | Vibe coding security risks | https://thenewstack.io/vibe-coding-could-cause-catastrophic-explosions-in-2026/ |
| 74 | Blog | Stack Overflow vibe coding | https://stackoverflow.blog/2026/01/02/a-new-worst-coder-has-entered-the-chat-vibe-coding-without-code-knowledge/ |
| 75 | Blog | CLAUDE.md skepticism | https://dev.to/byme8/you-dont-need-a-claudemd-jgf |
| 76 | Blog | Writing good CLAUDE.md | https://www.humanlayer.dev/blog/writing-a-good-claude-md |
| 77 | Blog | CLAUDE.md mistakes | https://alirezarezvani.medium.com/your-claude-md-is-probably-wrong-7-mistakes-boris-cherny-never-makes-6d3e5e41f4b7 |
| 78 | Blog | Context engineering | https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html |
| 79 | Blog | Claude vs Cursor comparison | https://www.atcyrus.com/stories/claude-code-vs-cursor-comparison-2026 |
| 80 | Blog | Role prompting research | https://www.prompthub.us/blog/role-prompting-does-adding-personas-to-your-prompts-really-make-a-difference |
| 81 | Guide | Graphite multi-tool workflow | https://graphite.com/guides/programming-with-ai-workflows-claude-copilot-cursor |
| 82 | dev.to | Ultrathink keywords | https://dev.to/rajeshroyal/ultrathink-tell-claude-exactly-how-hard-to-think-about-your-problem-i35 |
| 83 | dev.to | JSON cursorrules config | https://dev.to/simplr_sh/my-cursorrules-configuration-for-typescriptnextjs-development-5ep7 |
| 84 | r/LocalLLaMA | Local LLM system prompts | https://libreddit.oxymagnesium.com/r/LocalLLaMA/comments/1d4qtoa/ |
