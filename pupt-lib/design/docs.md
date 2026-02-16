# pupt-lib Documentation Plan

## Audience-First Principle

The docs serve two audiences in order of priority:
1. **Prompt authors** — non-technical users who write .prompt files
2. **Developers** — programmers who build tools, components, and modules with pupt-lib

The Guide and Components sections are for everyone. The Developers section is for programmers only.
Avoid jargon like "JSX", "TypeScript", "Node.js", "runtime" in user-facing sections.
Use "tags" instead of "components" or "elements" when speaking to non-technical users.
Use "properties" instead of "props" in user-facing content.

## Style Guide

- **Tone**: Friendly, direct, Astro-like. Use "you", explain "why" before "how", don't assume expertise.
- **Voice**: Second person, active voice, present tense.
- **Sentences**: Short. Split at commas when possible.
- **Code examples**: Complete, copy-pasteable, with rendered output shown. No ellipses.
- **Structure model**: Vue.js (progressive disclosure), Tailwind (scannable reference pages), Stripe (runnable examples).
- **Jargon**: Define on first use. Link to other pages liberally.
- **Benefits first**: Lead with what the user gains, not how it's implemented.

## Site Structure

```
Guide (for everyone)
  What is Pupt?           — benefits, problem/solution, syntax intro
  Getting Started          — install pt, write a prompt, run it
  Writing Your First Prompt — all structural tags, presets, composition
  Variables & Inputs       — Ask tags, collecting input, using variables
  Conditional Logic        — If, ForEach, formulas, When/Fallback
  Environment & Context    — provider adaptation, configuration

Components (reference for everyone)
  Overview                 — categories at a glance
  Structural               — Prompt, Role, Task, Context, Constraint, etc.
  Ask (Inputs)             — Text, Select, Confirm, etc.
  Control Flow             — If, ForEach
  Data                     — Code, File, Json, Xml
  Examples & Reasoning     — Examples, Steps, ChainOfThought
  Post-Execution           — ReviewFile, OpenUrl, RunCommand
  Utility                  — UUID, Timestamp, DateTime, etc.
  Presets                  — all preset tables

Sharing (for everyone)
  Using Modules            — <Uses> directive, importing
  Publishing               — sharing .prompt files and packages

Developers (technical)
  Writing Components       — function/class components, props, render
  Writing Modules          — exporting, module structure
  Creating Modules         — npm packages, build, publish
  API Reference            — render, createPrompt, types
  Variables Reference      — resolve/render pattern, internals
  Environment Reference    — full config tables, provider inference
  Conditionals Reference   — formula functions, HyperFormula
  Browser Support          — CDN, import maps, bundlers
```

## Page Templates

### Tutorial pages (Guide section)
1. One-sentence description of what the reader will learn
2. Prerequisites / what you need (keep minimal)
3. Step-by-step walkthrough with code examples
4. Each example shows input (tags) and output (rendered text)
5. "Next steps" linking to the next logical page

### Reference pages (Components section)
1. One-sentence description of the tag
2. Properties table (name, type, default, description)
3. Stack of examples from simple to complex
4. Edge cases or gotchas in a tip/warning block
5. Related tags linked at bottom

### Explanation pages (What is Pupt?)
1. Problem statement — what pain point this solves
2. How pupt approaches it — benefits, not implementation
3. Key concepts with brief examples
4. Links into the Guide

## Phases

### Phase 1 — Establish the template (3 pages) ✅
- [x] `guide/what-is-pupt.md` (explanation style)
- [x] `guide/getting-started.md` (tutorial style)
- [x] `components/structural.md` (reference style)

### Phase 2 — Complete the Guide (4 pages) ✅
Sequential, since they form a narrative arc.
- [x] `guide/first-prompt.md`
- [x] `guide/variables-and-inputs.md`
- [x] `guide/conditional-logic.md`
- [x] `guide/environment.md`

### Phase 3 — Complete Components + Sharing (10 pages) ✅
Formulaic reference pages. Can use subagents since pages are independent.
- [x] `components/index.md`
- [x] `components/ask.md`
- [x] `components/control-flow.md`
- [x] `components/data.md`
- [x] `components/examples-reasoning.md`
- [x] `components/post-execution.md`
- [x] `components/utility.md`
- [x] `components/presets.md`
- [x] `modules/using-modules.md`
- [x] `modules/publishing.md`

### Phase 4 — Developers (8 pages) ✅
Technical content for programmers.
- [x] `developers/first-component.md`
- [x] `developers/first-module.md`
- [x] `developers/creating-modules.md`
- [x] `developers/api.md`
- [x] `developers/variables.md`
- [x] `developers/environment.md`
- [x] `developers/conditionals.md`
- [x] `developers/browser.md`

## Source Material

Existing docs in `docs/` serve as source content:
- `docs/COMPONENTS.md` → `components/*.md`
- `docs/VARIABLES.md` → `developers/variables.md`, `guide/variables-and-inputs.md`
- `docs/ask-components.md` → `components/ask.md`
- `docs/MODULES.md` → `modules/*.md`, `developers/creating-modules.md`
- `docs/API.md` → `developers/api.md`
- `docs/conditionals.md` → `components/control-flow.md`, `developers/conditionals.md`
- `docs/environment.md` → `developers/environment.md`, `guide/environment.md`
