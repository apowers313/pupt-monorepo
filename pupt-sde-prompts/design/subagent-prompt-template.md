# Subagent Prompt Template for Creating pupt-sde Prompts

## Overview

This document contains the template prompt that will be passed to 11 parallel subagents,
one per flagship prompt. Each subagent will:
1. Research best practices for its domain from first principles
2. Study existing prompts from our 9,224-file sample collection
3. Write a `.prompt` file using pupt-lib's full component system

## Framework Decisions

### Inter-Prompt Relationships

The 11 prompts operate **independently**. Each collects its own inputs via `<Ask.*>`
components. They do NOT programmatically pass data to each other. However, they produce
compatible output formats so developers can chain them manually:

```
Requirements → Design → Implementation Plan → Test Generation
                                               ↓
PR Description ← Refactor ← Code Review + Security Audit + Performance Analysis
                              ↑
              Debug/Root Cause    Documentation (any phase)
```

### Environment Adaptation Strategy

Each prompt adapts to the runtime environment:
1. **LLM Provider** — `<If provider="anthropic">` for Claude-specific, `<If provider="openai">`
   for GPT-specific. Provider-aware constraint framing via `positive` prop.
2. **Programming Language** — Adapt guidance, tooling, conventions to `code.language`
3. **Output Format** — Components auto-select delimiter style based on provider preferences
4. **Reasoning Models** — o1/o3 models have built-in CoT and perform worse with prescriptive
   step-by-step instructions. Use `<If>` to detect and emit high-level goals instead.
5. **OS/Platform** — Where relevant (debug, implementation), adapt command suggestions to
   `runtime.os` (bash vs PowerShell, path separators)

### Modularity Strategy

Users extend prompts via:
- `<Constraints extend>` — add domain-specific constraints without losing defaults
- `<Steps extend>` — add custom workflow steps to preset phases
- `<Guardrails extend>` — add project-specific guardrails
- `<EdgeCases extend>` — add domain-specific edge cases
- Rich `<Ask.*>` inputs for runtime customization

---

## The Template

Variables in `{{BRACKETS}}` are replaced per-prompt.

---

You are creating a flagship prompt for pupt-lib, a JSX-based prompt engineering library.
This prompt will be one of 11 prompts in the `pupt-sde` package for software engineers.
These are the FIRST prompts ever created for pupt-lib — they serve as both functional
tools AND demonstrations of pupt-lib's capabilities for future prompt developers.

## Your Assignment

Create the **{{PROMPT_NAME}}** prompt (prompt #{{PROMPT_NUMBER}} of 11).

**SDLC Phase:** {{SDLC_PHASE}}
**Input:** {{PROMPT_INPUT}}
**Output:** {{PROMPT_OUTPUT}}

## Task Overview

You have three phases:
1. **Research best practices** for {{DOMAIN_TOPIC}} from first principles and from the web
2. **Study existing prompts** in our sample collection for inspiration (good and bad ideas)
3. **Write the .prompt file** using pupt-lib's JSX component system

## Phase 1: Research Best Practices

Research what makes an excellent {{DOMAIN_TOPIC}} process. Search the web for:
- Industry standards and best practices for {{RESEARCH_QUERIES}}
- Common mistakes and anti-patterns
- Checklists and frameworks used by experts
- What separates a thorough {{DOMAIN_TOPIC}} from a superficial one

Be epistemologically grounded: distinguish between well-established practices (supported
by evidence, expert consensus, post-mortems) and speculative or vendor-marketed claims.

Produce a structured list of:
- The essential phases/steps of a thorough {{DOMAIN_TOPIC}}
- The key dimensions/criteria to evaluate
- Common pitfalls that the prompt should help avoid
- Language-specific or technology-specific considerations

## Phase 2: Study Existing Prompts

Read the following sample prompt files from our collection. These are real prompts that
developers have created for similar tasks. Study them critically — identify good ideas
to adopt and bad patterns to avoid.

**Files to read** (read at least 8-12, prioritizing variety across repos):

{{SAMPLE_FILES}}

When studying these, note:
- **Good ideas**: Structural patterns, useful checklists, clever use of context, effective phasing
- **Bad ideas**: Over-specification, hardcoded assumptions, missing modularity, walls of unstructured text
- **Gaps**: What do these prompts miss that your research says matters?

## Phase 3: Write the Prompt

Create the file at: `/home/apowers/Projects/pupt-sde/src/prompts/{{FILE_NAME}}.prompt`

First, create the directory if it doesn't exist:
```
mkdir -p /home/apowers/Projects/pupt-sde/src/prompts
```

### pupt-lib Component System — Full Reference

The `.prompt` file uses JSX syntax. All built-in components are auto-imported. Here is
the COMPLETE component reference — use these features extensively to showcase pupt-lib:

#### Root Container

```jsx
<Prompt
  name="{{PROMPT_ID}}"
  description="..."
  version="1.0.0"
  tags={["sde", "{{TAG}}", ...]}
  noRole                          // We provide our own Role
  noFormat                        // We provide our own Format
>
  ...children...
</Prompt>
```

`<Prompt>` auto-generates default Role, Format, Constraints sections. Use `bare` to
disable all, or `noRole`/`noFormat`/`noConstraints`/`noSuccessCriteria`/`noGuardrails`
for fine-grained control. When you provide your own `<Role>`, use `noRole` to prevent
the auto-generated one from conflicting.

#### Interactive Input (Ask Components)

Collect information from the user at runtime. These are critical — they make prompts
interactive and customizable.

```jsx
// Text input
<Ask.Text name="varName" label="Prompt text" description="Help text" required />

// Select (single choice)
<Ask.Select name="varName" label="Choose:" required>
  <Option value="opt1">Option 1</Option>
  <Option value="opt2">Option 2</Option>
</Ask.Select>

// Multi-select (multiple choices)
<Ask.MultiSelect name="varName" label="Choose multiple:">
  <Option value="opt1">Option 1</Option>
  <Option value="opt2">Option 2</Option>
</Ask.MultiSelect>

// Confirm (yes/no)
<Ask.Confirm name="varName" label="Include X?" />

// Editor (multi-line text/code)
<Ask.Editor name="varName" label="Paste code:" language="typescript" />

// File input (with optional content embedding)
<Ask.File name="varName" label="Select file:" extensions={[".ts", ".js"]}
  multiple includeContents />
```

Input values are available in `<If when="...">` conditions and as `{varName}` in text.

#### Role System (with Presets)

```jsx
// Using a preset (30+ available: engineer, architect, security, qa-engineer, etc.)
<Role preset="engineer" experience="senior" expertise={["TypeScript", "React"]}
  traits={["analytical", "thorough"]} />

// Custom role with specialization
<Role preset="security" experience="expert" domain="application security">
  <Specialization areas={["OWASP", "SAST", "threat modeling"]} level="authority" />
</Role>

// Fully custom
<Role>
  You are a senior software architect with 15 years of experience...
</Role>
```

Available presets: `assistant`, `engineer`, `developer`, `architect`, `devops`,
`security`, `data-scientist`, `frontend`, `backend`, `qa-engineer`, `writer`,
`analyst`, `consultant`, `pm`, `mentor`, `coach`, `professor`, `legal`, `designer`,
`scientist`, `translator`.

#### Task (with Presets)

```jsx
<Task preset="code-review" scope="comprehensive" complexity="complex" />
<Task verb="Analyze" subject="the codebase" objective="identify security vulnerabilities" />
<Task>Full custom task description here</Task>
```

Available presets: `summarize`, `code-review`, `translate`, `explain`, `generate-code`,
`debug`, `refactor`, `classify`, `extract`, `plan`.

#### Context (Rich Metadata)

```jsx
<Context type="data" label="Code to Review" priority="critical" preserveFormatting>
  {userCode}
</Context>

<Context type="domain" label="Project Architecture" priority="important"
  relevance="affects review scope">
  {architectureDescription}
</Context>

<Context type="reference" source="OWASP Top 10" priority="helpful">
  Reference material...
</Context>
```

Types: `background`, `situational`, `domain`, `data`, `historical`, `reference`,
`constraints`, `user`.
Priority: `critical`, `important`, `helpful`, `optional`.

#### Constraint System (Composable)

```jsx
// Individual constraints with RFC 2119 severity
<Constraint type="must" category="accuracy">Be factually accurate</Constraint>
<Constraint type="should" category="format">Use bullet points for lists</Constraint>
<Constraint type="must-not" category="scope"
  positive="Focus only on the requested topic">Go off-topic</Constraint>

// Preset constraints
<Constraint preset="acknowledge-uncertainty" />
<Constraint preset="be-concise" />
<Constraint preset="no-hallucination" />

// Container with composition
<Constraints extend presets={["cite-sources", "professional-tone"]}>
  <Constraint type="must">Include specific line references</Constraint>
  <Constraint type="should">Suggest fixes, not just identify problems</Constraint>
</Constraints>
```

Types: `must`, `should`, `may`, `must-not`, `should-not`.
Categories: `content`, `format`, `tone`, `scope`, `accuracy`, `safety`, `performance`.
Presets: `be-concise`, `cite-sources`, `no-opinions`, `acknowledge-uncertainty`,
`professional-tone`, `no-hallucination`, `stay-on-topic`, `include-examples`.

#### Format (Rich Output Specification)

```jsx
<Format type="markdown" template={`
## Summary
[Brief summary]

## Findings
### Critical
- Finding 1
### Warning
- Finding 2
`} strict />

<Format type="json" schema={{
  type: "object",
  properties: {
    findings: { type: "array" },
    summary: { type: "string" }
  }
}} />

<Format type="code" language="typescript" />
```

Types: `json`, `markdown`, `xml`, `text`, `code`, `yaml`, `csv`, `list`, `table`.

#### Steps / Workflow (with Presets)

```jsx
// Preset-based (analysis, problem-solving, code-generation, debugging, research)
<Steps preset="debugging" verify selfCritique />

// Custom steps
<Steps style="structured" numbered showReasoning>
  <Step>Understand the requirements and constraints</Step>
  <Step>Analyze the existing code structure</Step>
  <Step>Identify issues and improvement opportunities</Step>
  <Step>Propose solutions with trade-offs</Step>
  <Step>Verify recommendations against requirements</Step>
</Steps>

// Extend a preset with additional steps
<Steps preset="code-generation" extend verify>
  <Step>Document the implementation decisions</Step>
</Steps>
```

Presets: `analysis` (Understand/Analyze/Conclude), `problem-solving`
(Define/Explore/Solve/Verify), `code-generation` (Understand/Design/Implement/Test),
`debugging` (Reproduce/Isolate/Fix/Verify), `research` (Define/Gather/Analyze/Synthesize).

#### Objective

```jsx
<Objective
  primary="Identify all security vulnerabilities in the provided code"
  secondary={[
    "Assess severity of each finding",
    "Provide actionable remediation guidance"
  ]}
  metrics={[
    "All OWASP Top 10 categories checked",
    "Each finding includes CWE classification"
  ]}
/>
```

#### Success Criteria

```jsx
<SuccessCriteria extend>
  <Criterion category="completeness" weight="critical">
    All requested areas are covered
  </Criterion>
  <Criterion category="accuracy" weight="critical">
    Findings are technically accurate
  </Criterion>
  <Criterion category="clarity" weight="important">
    Each finding is actionable
  </Criterion>
</SuccessCriteria>
```

Categories: `accuracy`, `completeness`, `relevance`, `clarity`, `format`, `tone`, `efficiency`.
Weights: `critical`, `important`, `nice-to-have`.

#### Audience & Tone

```jsx
<Audience level="advanced" type="technical"
  knowledgeLevel="professional software developers"
  goals={["improve code quality", "learn best practices"]} />

<Tone type="professional" formality="semi-formal" energy="measured" />

<Style type="technical" verbosity="moderate" />
```

#### Guardrails (Safety)

```jsx
<Guardrails preset="standard" extend
  prohibit={["suggesting quick fixes that mask bugs"]}
  require={["explain the reasoning behind each recommendation"]}
/>
```

Presets: `standard` (4 guardrails), `strict` (8 guardrails), `minimal` (2 guardrails).

#### Edge Cases & Fallbacks

```jsx
<EdgeCases preset="standard" extend>
  <When condition="code is in an unfamiliar language"
    then="Focus on language-agnostic patterns and note language-specific items as uncertain" />
  <When condition="code snippet is incomplete"
    then="Note assumptions and request missing context" />
</EdgeCases>

<Fallbacks preset="standard" extend>
  <Fallback when="unable to determine intent of code"
    then="describe what the code appears to do and ask for clarification" />
</Fallbacks>
```

#### Uncertainty Handling

```jsx
<WhenUncertain action="acknowledge">
  If unsure about a finding's severity, state your confidence level
  and recommend further investigation.
</WhenUncertain>
```

Actions: `acknowledge`, `ask`, `decline`, `estimate`.

#### Examples (Few-Shot)

```jsx
<Examples>
  <Example>
    <ExampleInput>
      function login(user, pass) {
        const query = "SELECT * FROM users WHERE name='" + user + "'";
        return db.query(query);
      }
    </ExampleInput>
    <ExampleOutput>
      ## Critical: SQL Injection (CWE-89)
      **Line 2**: String concatenation in SQL query.
      **Impact**: Full database compromise.
      **Fix**: Use parameterized queries: `db.query("SELECT * FROM users WHERE name=$1", [user])`
    </ExampleOutput>
  </Example>

  <NegativeExample reason="Too vague, no specific line references, no fix suggested">
    "The code has some security issues that should be fixed."
  </NegativeExample>
</Examples>
```

#### Chain of Thought

```jsx
<ChainOfThought style="structured" showReasoning />
```

#### Conditional Rendering

```jsx
// Based on user input
<If when={includePerformance}>
  <Section name="performance-considerations">...</Section>
</If>

// Based on LLM provider
<If provider="anthropic">
  <Context>Use XML-structured analysis sections.</Context>
</If>
<If provider="openai">
  <Context>Use markdown-structured analysis sections.</Context>
</If>
```

#### References

```jsx
<References sources={[
  { title: "OWASP Top 10", url: "https://owasp.org/www-project-top-10/" },
  { title: "CWE Database", url: "https://cwe.mitre.org/" }
]} />
```

#### Data / Code Embedding

```jsx
<Code language="typescript" filename="example.ts">...</Code>
<Data name="config" format="json">...</Data>
<File path="./reference.md" />
```

### Design Requirements

1. **Showcase pupt-lib's full component system.** This is a flagship prompt. Use:
   - `<Ask.*>` components for interactive inputs (see input design rules below)
   - `<Role>` with `preset`, `experience`, `expertise`, and `<Specialization>`
   - `<Task>` with rich props OR detailed children
   - `<Objective>` with primary, secondary, and metrics
   - `<Context>` with type, label, and priority
   - `<Steps>` with preset and/or custom steps, `verify`, `selfCritique`
   - `<Constraints extend>` with both presets and custom constraints
   - `<Format>` with template showing expected output structure
   - `<SuccessCriteria>` with categorized, weighted criteria
   - `<Guardrails>` with preset and extensions
   - `<EdgeCases>` with preset and domain-specific cases
   - `<Fallbacks>` with preset and domain-specific fallbacks
   - `<WhenUncertain>` with appropriate action
   - `<Audience>` and `<Tone>` with rich props
   - `<Style>` for writing style
   - At least one `<Example>` and one `<NegativeExample>`
   - `<If when={...}>` for conditional sections based on user inputs
   - `<If provider="...">` for at least one provider-specific adaptation
   - `<References>` for authoritative sources relevant to the domain
   - `<ChainOfThought>` for structured reasoning

2. **Input design: respect the user's time.** The `<Ask.*>` inputs are the user's
   first experience with this prompt. Every question is a cost — it slows the user
   down and creates friction. Design inputs with these rules:

   **The essential input rule:** Each prompt should have exactly ONE primary input
   that captures the core material (the code to review, the requirements to clarify,
   the bug to debug). This is typically an `<Ask.Editor>` or `<Ask.File>`. This is the
   only input that should be `required`.

   **The context-enrichment rule:** After the primary input, include 2-4 OPTIONAL
   inputs that meaningfully improve output quality when provided. These should have
   sensible defaults so the prompt produces good output even if the user skips them.
   Examples: programming language (can often be inferred), focus areas (defaults to
   "comprehensive"), project context (defaults to none).

   **The anti-harassment rule:** Do NOT ask questions where:
   - The answer is almost always the same (bake it into the prompt instead)
   - The prompt can infer the answer from the primary input
   - The question is about preferences that don't meaningfully change the output
   - You're asking just to demonstrate a component type

   **Target: 2-5 total inputs per prompt.** 1 required primary input + 1-4 optional
   enrichment inputs. If you find yourself wanting more than 5, you're probably
   over-configuring — make the prompt smarter with better defaults instead.

   **Use the right input type:** `<Ask.Editor>` for code/text paste (the most common
   primary input), `<Ask.Select>` for constrained choices, `<Ask.Confirm>` for
   toggling optional sections, `<Ask.Text>` for short free-form context. Don't use
   `<Ask.Text>` when `<Ask.Select>` would be clearer.

3. **Encode methodology in Steps.** The steps should reflect your Phase 1 research —
   a systematic methodology that produces better results than ad-hoc prompting.

4. **Make constraints actionable.** Use the RFC 2119 severity levels meaningfully.
   `must` for non-negotiable requirements, `should` for strong recommendations,
   `must-not` (with `positive` alternative) for prohibited patterns.

5. **Provider-aware adaptation.** Use `<If provider="...">` where it genuinely matters.
   For negative constraints, provide `positive` alternatives (Claude/Gemini respond
   better to positive framing).

6. **Think about edge cases.** What happens with minimal input? Unusual languages?
   Very large or very small codebases?

7. **Keep it modular.** A developer should be able to read this prompt and understand
   how to extend it — adding constraints, steps, or inputs for their specific needs.

### Component Order

Follow this order in the .prompt file:
1. Ask inputs (collected before rendering)
2. Prompt wrapper (with noRole, noFormat, noConstraints, noSuccessCriteria, noGuardrails)
3. Role + Specialization
4. Objective
5. Task
6. Context sections
7. Steps
8. Format
9. Constraints
10. Guardrails
11. EdgeCases + Fallbacks + WhenUncertain
12. Examples + NegativeExample
13. Audience + Tone + Style
14. SuccessCriteria
15. References
16. ChainOfThought

### Quality Bar

This is a flagship prompt. It should:
- Be **comprehensive** enough that using it produces clearly better results than ad-hoc prompting
- Be **structured** enough that the methodology is visible and educational
- Be **flexible** enough to work across languages, frameworks, and project sizes
- **Demonstrate pupt-lib's capabilities** — use the component system extensively
- Be a **reference implementation** that future prompt developers can learn from

### Output

Write the complete `.prompt` file. After writing it, explain your key design decisions:
1. What inputs you chose to collect and why
2. What methodology/steps you encoded and why (reference your research)
3. What constraints and guardrails you included and why
4. What you learned from the sample prompts (good ideas adopted, bad patterns avoided)
5. Key design trade-offs you made

---

## Per-Prompt Instantiation Data

### Prompt 1: Requirements Clarification
```
PROMPT_NAME: Requirements Clarification
PROMPT_NUMBER: 1
SDLC_PHASE: Requirements
PROMPT_INPUT: Vague feature request, bug report, or stakeholder ask
PROMPT_OUTPUT: Clarified requirements with acceptance criteria, ambiguities, out-of-scope items, dependencies, open questions
DOMAIN_TOPIC: requirements elicitation and analysis
RESEARCH_QUERIES: "requirements elicitation techniques", "writing good acceptance criteria", "INVEST criteria for user stories", "requirements ambiguity detection", "stakeholder analysis"
FILE_NAME: requirements-clarification
PROMPT_ID: sde-requirements-clarification
TAG: requirements
SAMPLE_FILES:
  - Code-and-Sorts-awesome-copilot-agents:agents/ai-development-mode/prd-creation.agent.md
  - PlagueHO-github-copilot-assets-library:chatmodes/implementation-plan.chatmode.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/agents/requirements-analyst.md
  - TheSethRose-Copilot-Kit:.github/chatmodes/planner.chatmode.md
  - Yeachan-Heo-oh-my-claudecode:agents/planner.md
  - affaan-m-everything-claude-code:agents/planner.md
  - avifenesh-awesome-slash:plugins/drift-detect/agents/plan-synthesizer.md
  - davepoon-buildwithclaude:plugins/all-commands/commands/create-prd.md
  - doggy8088-github-copilot-configs:.github/agents/atlassian-requirements-to-jira.agent.md
  - obra-superpowers:skills/executing-plans/SKILL.md
  - obra-superpowers:skills/writing-plans/SKILL.md
  - rohitg00-awesome-claude-code-toolkit:plugins/plan/commands/plan.md
  - trailofbits-skills:plugins/audit-context-building/skills/audit-context-building/resources/OUTPUT_REQUIREMENTS.md
  - vshishth-claude-custom-commands:commands/productivity/project-plan.md
  - PlagueHO-github-copilot-assets-library:chatmodes/prd.chatmode.md
  - doggy8088-github-copilot-configs:.github/agents/prd.agent.md
```

### Prompt 2: Design / Architecture
```
PROMPT_NAME: Design / Architecture
PROMPT_NUMBER: 2
SDLC_PHASE: Design
PROMPT_INPUT: Clarified requirements (or feature request)
PROMPT_OUTPUT: Architecture decisions with trade-offs, component boundaries, data model, API surface, technology choices with rationale
DOMAIN_TOPIC: software architecture and system design
RESEARCH_QUERIES: "software architecture decision records", "system design best practices", "architecture trade-off analysis", "component boundary design", "API design principles", "C4 model"
FILE_NAME: design-architecture
PROMPT_ID: sde-design-architecture
TAG: architecture
SAMPLE_FILES:
  - Code-and-Sorts-awesome-copilot-agents:agents/ai-development-mode/architect.agent.md
  - PlagueHO-github-copilot-assets-library:prompts/architecture-blueprint-generator.prompt.md
  - PlagueHO-github-copilot-assets-library:prompts/technology-stack-blueprint-generator.prompt.md
  - PlagueHO-github-copilot-assets-library:prompts/create-architectural-decision-record.prompt.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/agents/system-architect.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/agents/backend-architect.md
  - Yeachan-Heo-oh-my-claudecode:agents/architect.md
  - affaan-m-everything-claude-code:agents/architect.md
  - davepoon-buildwithclaude:plugins/agents-development-architecture/agents/backend-architect.md
  - doggy8088-github-copilot-configs:.github/agents/api-architect.agent.md
  - kamilstanuch-codebase-digest:prompt_library/architecture_design_pattern_identification.md
  - kamilstanuch-codebase-digest:prompt_library/architecture_coupling_cohesion_analysis.md
  - kamilstanuch-codebase-digest:prompt_library/architecture_diagram_generation.md
  - qdhenry-Claude-Command-Suite:.claude/agents/architecture-auditor.md
  - rohitg00-awesome-claude-code-toolkit:commands/architecture/design-review.md
  - vshishth-claude-custom-commands:commands/development/architecture.md
```

### Prompt 3: Implementation Plan
```
PROMPT_NAME: Implementation Plan
PROMPT_NUMBER: 3
SDLC_PHASE: Planning
PROMPT_INPUT: Architecture decisions (or feature requirements)
PROMPT_OUTPUT: Concrete file list, API surface details, dependencies, edge cases, test strategy, rollback considerations
DOMAIN_TOPIC: implementation planning and task decomposition
RESEARCH_QUERIES: "implementation planning best practices", "task decomposition for software", "work breakdown structure", "risk identification for implementation", "dependency analysis"
FILE_NAME: implementation-plan
PROMPT_ID: sde-implementation-plan
TAG: planning
SAMPLE_FILES:
  - PlagueHO-github-copilot-assets-library:chatmodes/implementation-plan.chatmode.md
  - PlagueHO-github-copilot-assets-library:prompts/create-implementation-plan.prompt.md
  - PlagueHO-github-copilot-assets-library:prompts/breakdown-plan.prompt.md
  - doggy8088-github-copilot-configs:.github/agents/implementation-plan.agent.md
  - doggy8088-github-copilot-configs:.github/agents/plan.agent.md
  - doggy8088-github-copilot-configs:.github/prompts/create-implementation-plan.prompt.md
  - obra-superpowers:skills/writing-plans/SKILL.md
  - obra-superpowers:skills/executing-plans/SKILL.md
  - Yeachan-Heo-oh-my-claudecode:agents/planner.md
  - Yeachan-Heo-oh-my-claudecode:commands/plan.md
  - affaan-m-everything-claude-code:agents/planner.md
  - affaan-m-everything-claude-code:commands/plan.md
  - avifenesh-awesome-slash:plugins/next-task/agents/planning-agent.md
  - rohitg00-awesome-claude-code-toolkit:plugins/plan/commands/plan.md
  - vshishth-claude-custom-commands:commands/productivity/project-plan.md
  - davepoon-buildwithclaude:plugins/all-commands/commands/sprint-planning.md
```

### Prompt 4: Test Generation
```
PROMPT_NAME: Test Generation
PROMPT_NUMBER: 4
SDLC_PHASE: Testing
PROMPT_INPUT: Code to test, requirements, or specification
PROMPT_OUTPUT: Test files with unit/integration tests, edge case coverage, test descriptions
DOMAIN_TOPIC: software testing and test-driven development
RESEARCH_QUERIES: "test-driven development best practices", "unit test design patterns", "test coverage strategies", "property-based testing", "edge case identification", "testing pyramid"
FILE_NAME: test-generation
PROMPT_ID: sde-test-generation
TAG: testing
SAMPLE_FILES:
  - Matt-Dionis-claude-code-configs:configurations/frameworks/nextjs-15/.claude/agents/nextjs-testing.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/commands/spec-panel.md
  - Yeachan-Heo-oh-my-claudecode:agents/qa-tester.md
  - affaan-m-everything-claude-code:agents/e2e-runner.md
  - avifenesh-awesome-slash:plugins/next-task/agents/test-coverage-checker.md
  - brennercruvinel-CCPlugins:commands/test.md
  - david-t-martel-claude-commands:tools/test-harness.md
  - fcakyon-claude-codex-settings:plugins/playwright-tools/agents/responsive-tester.md
  - feiskyer-claude-code-settings:plugins/kiro-skill/commands/kiro/spec.md
  - justinlietz93-Perfect_Prompts:STANDARDS_REPOSITORY/prompt-templates/Builder-Prompts/decomposed/testing/PHASE-1_SETUP_v0.0.1.md
  - kamilstanuch-codebase-digest:prompt_library/quality_code_documentation_coverage_analysis.md
  - levnikolaevich-claude-code-skills:ln-140-test-docs-creator/SKILL.md
  - obra-superpowers:skills/subagent-driven-development/spec-reviewer-prompt.md
  - PlagueHO-github-copilot-assets-library:chatmodes/specification.chatmode.md
  - trailofbits-skills:plugins/spec-to-code-compliance/skills/spec-to-code-compliance/resources/OUTPUT_REQUIREMENTS.md
  - doggy8088-github-copilot-configs:.github/agents/aem-frontend-specialist.agent.md
```

### Prompt 5: Code Review
```
PROMPT_NAME: Code Review
PROMPT_NUMBER: 5
SDLC_PHASE: Review
PROMPT_INPUT: Code diff or file(s) to review
PROMPT_OUTPUT: Categorized findings (bugs, style, performance, maintainability), severity ratings, line references, suggested fixes
DOMAIN_TOPIC: code review methodology
RESEARCH_QUERIES: "code review checklist best practices", "effective code review process", "code review categories and severity", "what to look for in code review", "Google code review guidelines"
FILE_NAME: code-review
PROMPT_ID: sde-code-review
TAG: review
SAMPLE_FILES:
  - PlagueHO-github-copilot-assets-library:instructions/gilfoyle-code-review.instructions.md
  - Yeachan-Heo-oh-my-claudecode:commands/code-review.md
  - Yeachan-Heo-oh-my-claudecode:skills/code-review/SKILL.md
  - affaan-m-everything-claude-code:commands/code-review.md
  - davepoon-buildwithclaude:plugins/all-commands/commands/code-review.md
  - doggy8088-github-copilot-configs:.github/instructions/code-review-generic.instructions.md
  - doggy8088-github-copilot-configs:.github/instructions/gilfoyle-code-review.instructions.md
  - fcakyon-claude-codex-settings:plugins/github-dev/commands/review-pr.md
  - feiskyer-claude-code-settings:commands/gh/review-pr.md
  - kamilstanuch-codebase-digest:prompt_library/learning_code_review_checklist.md
  - kamilstanuch-codebase-digest:prompt_library/learning_socratic_dialogue_code_review.md
  - levnikolaevich-claude-code-skills:shared/agents/prompt_templates/code_review.md
  - obra-superpowers:skills/receiving-code-review/SKILL.md
  - qdhenry-Claude-Command-Suite:.claude/commands/dev/code-review.md
  - rohitg00-awesome-claude-code-toolkit:commands/git/pr-review.md
  - vshishth-claude-custom-commands:commands/development/code-review.md
```

### Prompt 6: Security Audit
```
PROMPT_NAME: Security Audit
PROMPT_NUMBER: 6
SDLC_PHASE: Review
PROMPT_INPUT: Code to audit, with optional architecture context
PROMPT_OUTPUT: Categorized vulnerabilities (OWASP/CWE), severity ratings, attack scenarios, remediation guidance
DOMAIN_TOPIC: application security auditing
RESEARCH_QUERIES: "OWASP top 10 audit checklist", "code security review methodology", "SAST manual review techniques", "common vulnerability patterns by language", "CWE classification", "CVSS scoring"
FILE_NAME: security-audit
PROMPT_ID: sde-security-audit
TAG: security
SAMPLE_FILES:
  - Matt-Dionis-claude-code-configs:configurations/frameworks/nextjs-15/.claude/agents/nextjs-security.md
  - PlagueHO-github-copilot-assets-library:instructions/security-and-owasp.instructions.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/agents/security-engineer.md
  - TheSethRose-Copilot-Kit:.github/instructions/security-and-owasp.instructions.md
  - Yeachan-Heo-oh-my-claudecode:agents/security-reviewer.md
  - affaan-m-everything-claude-code:agents/security-reviewer.md
  - brennercruvinel-CCPlugins:commands/security-scan.md
  - davepoon-buildwithclaude:plugins/agents-quality-security/agents/api-security-audit.md
  - david-t-martel-claude-commands:tools/security-scan.md
  - doggy8088-github-copilot-configs:.github/agents/se-security-reviewer.agent.md
  - justinlietz93-Perfect_Prompts:STANDARDS_REPOSITORY/prompt-templates/Builder-Prompts/decomposed/security/PHASE-1_SETUP_v0.0.1.md
  - kamilstanuch-codebase-digest:prompt_library/security_vulnerability_analysis.md
  - levnikolaevich-claude-code-skills:ln-621-security-auditor/SKILL.md
  - qdhenry-Claude-Command-Suite:.claude/agents/external/lst97/security/security-auditor.md
  - rohitg00-awesome-claude-code-toolkit:agents/infrastructure/security-engineer.md
  - trailofbits-skills:plugins/building-secure-contracts/skills/algorand-vulnerability-scanner/SKILL.md
  - vshishth-claude-custom-commands:commands/analysis/security-audit.md
```

### Prompt 7: Performance Analysis
```
PROMPT_NAME: Performance Analysis
PROMPT_NUMBER: 7
SDLC_PHASE: Review
PROMPT_INPUT: Code to analyze, with optional profiling data or performance requirements
PROMPT_OUTPUT: Identified bottlenecks, complexity analysis, optimization recommendations with expected impact, measurement suggestions
DOMAIN_TOPIC: software performance analysis and optimization
RESEARCH_QUERIES: "performance analysis methodology", "big-O complexity analysis", "common performance anti-patterns", "performance optimization checklist", "profiling best practices", "Amdahl's law"
FILE_NAME: performance-analysis
PROMPT_ID: sde-performance-analysis
TAG: performance
SAMPLE_FILES:
  - Matt-Dionis-claude-code-configs:configurations/frameworks/nextjs-15/.claude/agents/nextjs-performance.md
  - Matt-Dionis-claude-code-configs:configurations/frameworks/nextjs-15/.claude/commands/analyze-performance.md
  - PlagueHO-github-copilot-assets-library:instructions/performance-optimization.instructions.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/agents/performance-engineer.md
  - TheSethRose-Copilot-Kit:.github/instructions/performance-optimization.instructions.md
  - Yeachan-Heo-oh-my-claudecode:agents/performance-reviewer.md
  - avifenesh-awesome-slash:plugins/perf/skills/perf-benchmarker/SKILL.md
  - davepoon-buildwithclaude:plugins/agents-development-architecture/agents/react-performance-optimization.md
  - david-t-martel-claude-commands:tools/cost-optimize.md
  - doggy8088-github-copilot-configs:.github/agents/mongodb-performance-advisor.agent.md
  - kamilstanuch-codebase-digest:prompt_library/performance_bottleneck_identification.md
  - levnikolaevich-claude-code-skills:ln-650-persistence-performance-auditor/SKILL.md
  - qdhenry-Claude-Command-Suite:.claude/agents/data-ai/database-optimizer.md
  - rohitg00-awesome-claude-code-toolkit:agents/data-ai/database-optimizer.md
  - vshishth-claude-custom-commands:commands/analysis/performance-analysis.md
  - wshobson-commands:tools/cost-optimize.md
```

### Prompt 8: Refactor
```
PROMPT_NAME: Refactor
PROMPT_NUMBER: 8
SDLC_PHASE: Maintenance
PROMPT_INPUT: Code to refactor, with optional goals (readability, performance, modularity)
PROMPT_OUTPUT: Refactored code with explanation, before/after comparison, risk assessment
DOMAIN_TOPIC: code refactoring methodology
RESEARCH_QUERIES: "refactoring catalog Martin Fowler", "code smell identification", "refactoring patterns and techniques", "safe refactoring practices", "when to refactor vs rewrite"
FILE_NAME: refactor
PROMPT_ID: sde-refactor
TAG: refactoring
SAMPLE_FILES:
  - Code-and-Sorts-awesome-copilot-agents:agents/ai-development-mode/clean-code.agent.md
  - PlagueHO-github-copilot-assets-library:prompts/java-refactoring-extract-method.prompt.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/agents/refactoring-expert.md
  - TheSethRose-Copilot-Kit:.github/prompts/clean.prompt.md
  - affaan-m-everything-claude-code:agents/refactor-cleaner.md
  - brennercruvinel-CCPlugins:commands/cleanproject.md
  - david-t-martel-claude-commands:tools/refactor-clean.md
  - justinlietz93-Perfect_Prompts:STANDARDS_REPOSITORY/architecture_standards/CLEAN_ARCHITECTURE_STANDARDS.md
  - kamilstanuch-codebase-digest:prompt_library/architecture_refactoring_for_design_patterns.md
  - levnikolaevich-claude-code-skills:ln-200-scope-decomposer/SKILL.md
  - qdhenry-Claude-Command-Suite:.claude/agents/task-decomposer.md
  - rohitg00-awesome-claude-code-toolkit:agents/developer-experience/refactoring-specialist.md
  - doggy8088-github-copilot-configs:.github/agents/launchdarkly-flag-cleanup.agent.md
  - fcakyon-claude-codex-settings:plugins/github-dev/commands/clean-gone-branches.md
  - vshishth-claude-custom-commands:commands/development/code-review.md
  - danielmiessler-Fabric:clean_text/system.md
```

### Prompt 9: Debug / Root Cause Analysis
```
PROMPT_NAME: Debug / Root Cause Analysis
PROMPT_NUMBER: 9
SDLC_PHASE: Maintenance
PROMPT_INPUT: Bug description, error messages, logs, reproduction steps, relevant code
PROMPT_OUTPUT: Root cause identification, failure chain explanation, fix recommendation, prevention strategy
DOMAIN_TOPIC: debugging and root cause analysis
RESEARCH_QUERIES: "root cause analysis techniques software", "systematic debugging methodology", "5 whys analysis software bugs", "fault tree analysis", "debugging heuristics", "postmortem best practices"
FILE_NAME: debug-root-cause
PROMPT_ID: sde-debug-root-cause
TAG: debugging
SAMPLE_FILES:
  - Code-and-Sorts-awesome-copilot-agents:agents/ai-development-mode/debugger.agent.md
  - Matt-Dionis-claude-code-configs:configurations/frameworks/nextjs-15/.claude/agents/nextjs-debugging.md
  - PlagueHO-github-copilot-assets-library:chatmodes/debug.chatmode.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/agents/root-cause-analyst.md
  - TheSethRose-Copilot-Kit:.github/chatmodes/debug.chatmode.md
  - Yeachan-Heo-oh-my-claudecode:agents/build-fixer.md
  - affaan-m-everything-claude-code:agents/build-error-resolver.md
  - avifenesh-awesome-slash:plugins/next-task/agents/ci-fixer.md
  - davepoon-buildwithclaude:plugins/agents-infrastructure-operations/agents/devops-troubleshooter.md
  - david-t-martel-claude-commands:tools/debug-trace.md
  - doggy8088-github-copilot-configs:.github/agents/debug.agent.md
  - feiskyer-claude-code-settings:agents/github-issue-fixer.md
  - kamilstanuch-codebase-digest:prompt_library/quality_error_analysis.md
  - levnikolaevich-claude-code-skills:ln-772-error-handler-setup/SKILL.md
  - obra-superpowers:skills/systematic-debugging/CREATION-LOG.md
  - brennercruvinel-CCPlugins:commands/fix-imports.md
```

### Prompt 10: Documentation
```
PROMPT_NAME: Documentation
PROMPT_NUMBER: 10
SDLC_PHASE: Any (cross-cutting)
PROMPT_INPUT: Code, API, or system to document
PROMPT_OUTPUT: Documentation in the appropriate format (API reference, README, architecture doc, inline comments)
DOMAIN_TOPIC: technical documentation
RESEARCH_QUERIES: "technical documentation best practices", "API documentation standards", "README best practices", "Divio documentation framework", "documentation types software", "docs-as-code"
FILE_NAME: documentation
PROMPT_ID: sde-documentation
TAG: documentation
SAMPLE_FILES:
  - PlagueHO-github-copilot-assets-library:prompts/create-readme.prompt.md
  - PlagueHO-github-copilot-assets-library:prompts/documentation-writer.prompt.md
  - SuperClaude-Org-SuperClaude_Framework:plugins/superclaude/commands/document.md
  - TheSethRose-Copilot-Kit:.github/prompts/document-project.prompt.md
  - danielrosehill-Claude-Slash-Commands:commands/claude-code/context-md/context-to-readme-and-claude.md
  - davepoon-buildwithclaude:plugins/agents-specialized-domains/agents/api-documenter.md
  - davepoon-buildwithclaude:plugins/all-agents/agents/api-documenter.md
  - doggy8088-github-copilot-configs:.github/prompts/create-readme.prompt.md
  - fcakyon-claude-codex-settings:plugins/plugin-dev/skills/command-development/references/documentation-patterns.md
  - feiskyer-claude-code-settings:agents/insight-documenter.md
  - kamilstanuch-codebase-digest:prompt_library/architecture_database_schema_documentation.md
  - levnikolaevich-claude-code-skills:ln-100-documents-pipeline/SKILL.md
  - qdhenry-Claude-Command-Suite:.claude/agents/skill-builder/skill-documenter-agent.md
  - rohitg00-awesome-claude-code-toolkit:agents/developer-experience/api-documentation.md
  - vshishth-claude-custom-commands:commands/writing/documentation.md
  - doggy8088-github-copilot-configs:.github/agents/octopus-deploy-release-notes-mcp.agent.md
```

### Prompt 11: PR Description
```
PROMPT_NAME: PR Description
PROMPT_NUMBER: 11
SDLC_PHASE: Review/Deploy
PROMPT_INPUT: Git diff, commit messages, related issue/ticket
PROMPT_OUTPUT: PR title, summary, change breakdown, testing notes, reviewer guidance
DOMAIN_TOPIC: pull request documentation and communication
RESEARCH_QUERIES: "pull request description best practices", "code change documentation", "PR review communication", "conventional commits", "changelog generation"
FILE_NAME: pr-description
PROMPT_ID: sde-pr-description
TAG: pr
SAMPLE_FILES:
  - TheSethRose-Copilot-Kit:.github/prompts/commit.prompt.md
  - brennercruvinel-CCPlugins:commands/commit.md
  - danielrosehill-Claude-Slash-Commands:commands/development/github/claude-commit-message.md
  - davepoon-buildwithclaude:plugins/all-commands/commands/commit.md
  - davepoon-buildwithclaude:plugins/all-commands/commands/commit-fast.md
  - davepoon-buildwithclaude:plugins/all-commands/commands/pr-review.md
  - doggy8088-github-copilot-configs:.github/prompts/conventional-commit.prompt.md
  - fcakyon-claude-codex-settings:plugins/github-dev/agents/commit-creator.md
  - fcakyon-claude-codex-settings:plugins/github-dev/commands/commit-staged.md
  - fcakyon-claude-codex-settings:plugins/github-dev/commands/review-pr.md
  - fcakyon-claude-codex-settings:plugins/github-dev/skills/commit-workflow/SKILL.md
  - justinlietz93-Perfect_Prompts:STANDARDS_REPOSITORY/prompt-templates/Commit-Messages/COMMIT_TEMPLATE_v0.0.1.md
  - qdhenry-Claude-Command-Suite:.claude/commands/orchestration/commit.md
  - rohitg00-awesome-claude-code-toolkit:commands/git/commit.md
  - rohitg00-awesome-claude-code-toolkit:commands/git/pr-review.md
  - vshishth-claude-custom-commands:commands/productivity/git-commit.md
```
