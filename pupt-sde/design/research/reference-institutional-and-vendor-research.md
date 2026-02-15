# Reference: Institutional, Vendor, and Survey Research

**Date:** 2026-02-07
**Purpose:** This file preserves research from non-individual-developer sources (vendor studies, industry surveys, academic meta-research, prescriptive guides, and marketing content). This content was separated from the primary research to focus the project on real prompts from individual human developers.

**Why this was separated:** A critical analysis found that ~50% of the original research sources came from companies selling AI tools, and the prompt catalog contained polished templates rather than actual prompts used by real developers. This reference file preserves that content for background context.

---

## Source Triage

### Files Reviewed

The following files were systematically reviewed and their content categorized:

1. `ai-prompts-reddit-research.md` — Predominantly aggregated from Reddit communities and SEO content farms. Prompt examples are prescriptive templates, not real prompts. Some individual developer quotes are valuable.
2. `ai-coding-tools-research.md` — Predominantly vendor documentation, company blog posts, and industry surveys. Some individual developer blog posts mixed in.
3. `../real-world-prompt-review.md` — Synthesis document blending vendor data, surveys, prescriptive advice, and academic research. Almost entirely institutional.
4. `../prompt-catalog/01-11` — 73 polished prompt templates. Prescriptive, not descriptive. No evidence these reflect actual developer behavior.

### Content Classification

#### Vendor/Company Research (conflict of interest noted)

| Source | Company | What They Sell | Claims |
|--------|---------|---------------|--------|
| GitHub Copilot studies | Microsoft | Copilot ($10-39/mo) | 55% faster, 46% code generated |
| Anthropic internal data | Anthropic | Claude | 50% productivity gains, 200K transcripts analyzed |
| Veracode GenAI Security Report | Veracode | Security scanning tools | 45% of AI code fails security tests |
| CodeRabbit AI vs Human Report | CodeRabbit | AI code review | 1.7x more defects in AI code |
| Qodo State of AI Code Quality | Qodo | AI testing tools | 1.75x more logic errors |
| Fastly Senior Developer Survey | Fastly | Edge cloud platform | Senior devs ship 2.5x more AI code |
| GetDX/Jellyfish metrics | GetDX/Jellyfish | Engineering metrics platforms | AI adoption and productivity metrics |
| Augment Code guides | Augment Code | AI coding assistant | Various feature/debugging guides |
| Arize CLAUDE.md study | Arize | AI observability | 5-10% accuracy gains from CLAUDE.md |

#### Industry Surveys (self-selection bias noted)

| Survey | Sample | Key Limitation |
|--------|--------|---------------|
| Stack Overflow Developer Survey 2025 | 49K respondents | AI questions answered by only ~33% of respondents; recruited through SO channels |
| JetBrains Developer Ecosystem 2025 | 24.5K developers | Acknowledged JetBrains user bias; ad hoc 10% correction |
| GitHub Octoverse 2025 | 12K developers + 4M repos | Only GitHub users; methodology not fully disclosed |
| Fastly survey | 791 US developers, 4 days | Tiny sample, no methodology disclosed, vendor interest |

#### Academic/Independent Research

| Study | What It Is | Limitation |
|-------|-----------|-----------|
| METR RCT (July 2025) | 16 devs, 246 tasks, randomized | N=16; CI [-40%, -2%]; "just enough" statistical power |
| GitClear code quality (211M lines) | Code quality metrics over time | Correlation, not causation |
| Bain & Company AI coding report | "Unremarkable" real-world savings | Consulting firm report, not peer-reviewed |
| BlueOptima (218K developers) | ~4% productivity gain, 88% rework | Limited public methodology |
| Stanford employment study | 20% decline for ages 22-25 | Correlation with AI adoption, not proven causation |

#### Prescriptive Guides (advice about how to prompt, not observations of real prompting)

- Addy Osmani's Prompt Engineering Playbook (Google employee)
- Addy Osmani's LLM Coding Workflow 2026 (Google employee)
- GitHub Copilot official best practices
- Claude Code official documentation and workflows
- Anthropic prompt engineering guides
- OpenAI GPT-4.1 prompting guide
- Graphite prompt engineering guide
- Forge Code best practices
- Various "Top N prompts" listicles

#### SEO Content Farms (not research; marketing content)

- aitooldiscovery.com — AI tool recommendation/affiliate site
- reelmind.ai — AI video tool promoting product with "best prompts" content
- byteiota.com — Tech news aggregator rewriting other sources
- altersquare.io — Content marketing site for an AI company
- wpreset.com — WordPress plugin company publishing SEO blog content
- getpanto.ai — AI product publishing "statistics" content

---

## Preserved Statistics (use with noted caveats)

### Adoption Numbers (all from self-selected surveys)
- 80% of developers use AI tools (Stack Overflow 2025, active use)
- 84% use or plan to use AI tools (Stack Overflow 2025, including planned)
- 85% regularly use AI tools (JetBrains 2025, known IDE-user bias)
- 90% use AI in workflows (Fastly, 791 US devs only)

### Trust Numbers (declining trend)
- 29% trust AI output (Stack Overflow 2025, down from 40%)
- 46% actively distrust (Stack Overflow 2025, up from 31%)
- 3.1% highly trust (Stack Overflow 2025)
- 96% don't fully trust (Clutch.co survey)

### Productivity Numbers (contradictory)
- 55% faster (GitHub vendor study, 35 devs, 1 synthetic task)
- 22% faster for seniors, 4% for juniors (GitHub internal)
- 19% slower (METR RCT, 16 devs, 246 real tasks)
- ~4% faster (BlueOptima, 218K devs)
- "Unremarkable" (Bain & Company)

### Code Quality Numbers (vendor-sourced)
- 1.7x more defects (CodeRabbit, 470 PRs, vendor blog post)
- 1.75x more logic errors (Qodo, vendor report)
- 45% fail security tests (Veracode, adversarial tasks, tested with own product)
- Code duplication 4x increase (GitClear, 211M lines)

### Perception-Reality Gap (METR study)
- Developers predicted: 24% speedup
- Developers perceived: 20% speedup
- Actual measured: 19% slowdown

---

## Preserved Prompt Templates

The 73 prompt templates in `prompt-catalog/01-11` are preserved as-is. They represent prescriptive advice about how to prompt, organized by SDLC phase:

| File | Category | Count |
|------|----------|-------|
| 01-requirements-planning.md | Requirements & Planning | 6 |
| 02-architecture-design.md | Architecture & Design | 6 |
| 03-implementation.md | Implementation & Code Generation | 12 |
| 04-debugging.md | Debugging & Error Resolution | 8 |
| 05-testing.md | Testing & Test Generation | 8 |
| 06-code-review.md | Code Review & Quality | 7 |
| 07-refactoring.md | Refactoring & Modernization | 7 |
| 08-documentation.md | Documentation | 5 |
| 09-devops-cicd.md | DevOps, CI/CD & Infrastructure | 4 |
| 10-security.md | Security | 5 |
| 11-learning-exploration.md | Learning & Exploration | 5 |

**Note:** These templates are aspirational/prescriptive. They do not reflect how developers actually prompt. Real-world telemetry shows ~30% acceptance rate for inline completions, decreasing prompt turns over time, and predominantly short, messy interactions rather than structured multi-paragraph prompts.

---

## Individual Developer Content Identified in Original Research

The following sources from the original research ARE from individual developers sharing real experiences. These may be useful as starting points for the new individual-focused research:

### Blog Posts with Real Workflow Descriptions
- **"The Senior Dev"** — Why I Stopped Using AI After 150K Lines (real experience, lessons learned)
  - https://www.theseniordev.com/blog/why-i-stopped-using-ai-as-a-senior-developer-after-150-000-lines-of-ai-generated-code
- **Benjamin Congdon** — What I Look For in AI-Assisted PRs (real code review experience)
  - https://benjamincongdon.me/blog/2025/12/10/What-I-Look-For-in-AI-Assisted-PRs/
- **Steve Sewell (Builder.io)** — How I Use Cursor + Claude Code (personal workflow, includes real prompts)
  - https://www.builder.io/blog/cursor-tips
  - https://www.builder.io/blog/claude-code
- **blog.sshh.io** — How I Use Every Claude Code Feature (personal experience)
  - https://blog.sshh.io/p/how-i-use-every-claude-code-feature
- **Harper Reed** — Basic Claude Code workflow (personal experience)
  - https://harper.blog/2025/05/08/basic-claude-code/
- **Sankalp** — My Experience with Claude Code 2.0 (personal experience)
  - https://sankalp.bearblog.dev/my-experience-with-claude-code-20-and-how-to-get-better-at-using-coding-agents/
- **The Bootstrapped Founder** — From Code Writer to Code Editor (personal workflow)
  - https://thebootstrappedfounder.com/from-code-writer-to-code-editor-my-ai-assisted-development-workflow/
- **codeaholicguy** — What I Learned Using CursorAI Every Day (personal experience)
  - https://codeaholicguy.com/2025/04/12/what-i-learned-using-cursorai-every-day-as-an-engineer/
- **Jeremy Kreutzbender** — Thoughts on Vibe Coding Mid 2025 (personal experience)
  - https://jeremykreutzbender.com/blog/thoughts-and-experiences-vibe-coding-mid-2025
- **lingodotdev (dev.to)** — 6 AI Coding Anti-Patterns (individual developer)
  - https://dev.to/lingodotdev/ai-coding-anti-patterns-6-things-to-avoid-for-better-ai-coding-f3e
- **PostHog engineering team** — AI Coding Mistakes (team experience, borderline individual/company)
  - https://newsletter.posthog.com/p/avoid-these-ai-coding-mistakes
- **Aider user review (blott.com)** — A Developer's Month with Aider (personal experience)
  - https://www.blott.com/blog/post/aider-review-a-developers-month-with-this-terminal-based-code-assistant

### Reddit Quotes from Individual Developers
(Scattered throughout ai-prompts-reddit-research.md, section 3 and 7)
- "AI is powerful, but blind trust in it without critical thinking is a problem."
- "Be careful, Copilot can make you lazy, verify everything it suggests."
- "Don't risk your job, always get approval first"
- "I switched to Claude yesterday and it helped me make an entire phone app."
- "Claude smokes GPT4 for Python"
- "Feels like a coding partner that just gets me"
- "Like having a Stack Overflow genie that actually edits my source code"
- "Codeium is best free alternative. Period."

### Hacker News Discussions (aggregated individual voices)
- 600 Hours with AI Coding: https://news.ycombinator.com/item?id=43986580
- AI Coding Getting Worse: https://news.ycombinator.com/item?id=46542036
- Coding Assistants Wrong Problem: https://news.ycombinator.com/item?id=46866481
- AI Code Review Bubble: https://news.ycombinator.com/item?id=46766961

---

## Complete Source URL List

All URLs from the original three research files are preserved here for reference:

### From ai-prompts-reddit-research.md
(40 URLs — see original file, section 8)

### From ai-coding-tools-research.md
(60+ URLs — see original file, Source Index)

### From real-world-prompt-review.md
(70+ URLs — see original file, section 14)

The original files remain in place and can be consulted for the full URL lists and detailed content.
