# Project Overview

[← Back to Index](00-index.md)

---

**pupt-lib** is a TypeScript library for creating AI prompts as versionable, composable, shareable files using JSX syntax.

## Why pupt-lib?

Prompts are becoming critical software artifacts, yet most are written inline, copy-pasted between projects, and lost when chat sessions end. pupt-lib treats prompts as first-class code:

- **Version controlled** — Prompts live in files, tracked in git, reviewed in PRs
- **Composable** — Build complex prompts from reusable components
- **Shareable** — Publish prompt libraries to npm, consume others' work
- **Mature over time** — Iterate on prompts like any other code artifact

**Why JSX?** JSX provides the best of both worlds:
- Simple prompts look like HTML—accessible to non-developers
- Complex prompts have full TypeScript power—loops, conditionals, type safety
- This pattern has proven successful: AWS CDK over CloudFormation, React over string templates, Gulp over Grunt

---

## Design Goals

| Goal | Description |
|------|-------------|
| **File-Based Prompts** | Prompts are `.tsx` files that can be version controlled, diffed, and improved over time |
| **Code Over Templates** | Uses TypeScript/JSX rather than text templates (Handlebars, Mustache). Code-based approaches consistently win: AWS CDK over CloudFormation, Gulp over Grunt, React over string templating. Full programming language power when you need it. |
| **Accessible to Non-Developers** | Simple prompts look like HTML—just markup with no code required. Non-technical users can author prompts without learning TypeScript. Complexity is opt-in. |
| **Composability** | Build complex prompts from reusable pieces using JSX component model |
| **Shareability** | Publish and consume prompt libraries via npm, URLs, or local files |
| **Clean Syntax** | Prompt files are readable with no boilerplate imports required |
| **UI Agnostic** | Library handles prompt logic; any UI (CLI, web, desktop) can collect inputs |
| **LLM Agnostic** | Target Claude, GPT, Gemini, or others with environment-based output optimization |
| **Research-Backed** | Built-in components encode prompt engineering best practices |
| **Automation-Ready** | Non-interactive mode and pre-supplied values for CI/CD pipelines |

---

## Features

### Core Prompt Authoring
- JSX syntax for prompts (familiar to React/TypeScript developers)
- Built-in structural components: `<Role>`, `<Task>`, `<Context>`, `<Constraints>`, `<Examples>`
- User input components: `<Ask.Text>`, `<Ask.Select>`, `<Ask.File>`, `<Ask.Confirm>`
- Conditional rendering with `<If>`
- Utility components: `<UUID>`, `<Timestamp>`, `<Hostname>`, `<Username>`

### Ecosystem & Sharing
- Third-party prompt libraries loadable via npm, URLs, or local paths
- Library-based scoping prevents namespace conflicts
- `<Scope>` component for explicit disambiguation when needed
- Fuzzy search and tag-based discovery across prompt libraries

### Flexibility & Integration
- Environment context for LLM-specific output optimization
- Post-execution actions: `<ReviewFile>`, `<OpenUrl>`, `<RunCommand>`
- Non-interactive mode for automation and CI/CD
- Pre-supplied values to skip known inputs programmatically

---

## Non-Goals

- This library does NOT render UI for collecting user input
- This library does NOT send prompts to LLMs
- This library does NOT handle system prompts

---

## Target Users

- **Prompt authors** — Write, version, and share reusable prompts
- **Tool builders** — Build CLIs, IDEs, or web apps that use prompts from pupt-lib
- **Teams** — Maintain shared prompt libraries with code review and versioning

---

## Next Steps

- [Design Decisions](02-design-decisions.md) - Understand the architectural choices
- [Architecture](03-architecture.md) - See the high-level system design
- [Components](05-components.md) - Explore the built-in component library
