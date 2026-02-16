# pupt-lib Design Documentation

A TypeScript library that enables programmatic, composable, OOP-empowered AI prompt creation using JSX.

> **Note:** The original monolithic design document is preserved at [`../pupt-lib-design.md`](../pupt-lib-design.md).

---

## Quick Reference

| Topic | Document | Key Info |
|-------|----------|----------|
| How components are defined | [Components](05-components.md#component-interface) | Class extends `Component<Props>`, auto-discovered |
| How components are resolved | [Design Decisions](02-design-decisions.md#component-resolution) | String-based lookup, no imports needed |
| Declaring dependencies | [Components](05-components.md#uses-component) | `<Uses src="@pkg" />` declares module dependencies |
| Loading libraries | [API](07-api.md#module-loading-api) | `Pupt` class for CLI and browser |
| Main API entry point | [API](07-api.md#pupt-class) | `new Pupt({ modules: [...] })` |
| Namespace conflicts | [Design Decisions](02-design-decisions.md#conflict-resolution) | Use `<Scope from="pkg">` wrapper |
| Simple prompt files | [Simple Prompts](09-simple-prompt-format.md) | `.prompt` files with runtime parsing |
| User input collection | [User Input](06-user-input.md#input-iterator-interface) | `start()` / `current()` / `submit()` / `advance()` |
| User input syntax | [Components](05-components.md#user-input-components) | Child elements (simple) or JS attributes (advanced) |
| Conditional rendering | [Components](05-components.md#control-flow-components) | Excel formula syntax: `<If when='=count>5'>` |
| Input validation | [User Input](06-user-input.md#input-validation) | Async validation, custom validators, retry loop |
| Non-interactive mode | [User Input](06-user-input.md#non-interactive-mode) | `InputIteratorOptions.nonInteractive` |
| Post-execution actions | [Components](05-components.md#post-execution-components) | `<PostExecution>`, ReviewFile, OpenUrl, RunCommand |
| Render result type | [API](07-api.md#core-functions) | `{ text, postExecution[] }` |
| Environment/LLM config | [JSX Runtime](04-jsx-runtime.md#environment-context) | Target LLM, output format, runtime values |
| Built-in components | [Components](05-components.md) | Role, Task, Context, Ask.*, etc. |
| Third-party libraries | [Module Loading](08-module-loading.md) | Export Component subclasses, auto-discovered |
| Module author workflow | [Workflows](10-workflows.md#module-author-workflow) | How to publish components |
| Prompt author workflow | [Workflows](10-workflows.md#prompt-author-workflow) | How to publish simple prompts |
| Browser support | [Module Loading](08-module-loading.md#browser-module-loading) | Import maps + deduplication |
| JSX transformation | [JSX Runtime](04-jsx-runtime.md#runtime-jsx-transformation) | Babel config, custom runtime |

---

## Document Index

### Core Concepts

| # | Document | Description |
|---|----------|-------------|
| 01 | [Overview](01-overview.md) | Library purpose, design goals, features, target users |
| 02 | [Design Decisions](02-design-decisions.md) | Architectural choices with rationale and alternatives |
| 03 | [Architecture](03-architecture.md) | System design, high-level architecture, data flow |

### Technical Details

| # | Document | Description |
|---|----------|-------------|
| 04 | [JSX Runtime](04-jsx-runtime.md) | Custom JSX runtime, environment context, Babel config |
| 05 | [Components](05-components.md) | Default component library (Role, Task, Ask.*, etc.) |
| 06 | [User Input](06-user-input.md) | Input collection, validation, iterator interface |
| 07 | [API](07-api.md) | Public API surface, Pupt class, render functions |
| 08 | [Module Loading](08-module-loading.md) | Third-party libraries, scoping, component registry |

### Usage & Configuration

| # | Document | Description |
|---|----------|-------------|
| 09 | [Simple Prompt Format](09-simple-prompt-format.md) | `.prompt` files for non-technical users |
| 10 | [Workflows](10-workflows.md) | Module author and prompt author workflows |
| 11 | [Search](11-search.md) | Fuzzy search and tag-based discovery |
| 12 | [Configuration](12-configuration.md) | File structure, package.json, tsconfig, vite, etc. |

### Development

| # | Document | Description |
|---|----------|-------------|
| 13 | [Implementation](13-implementation.md) | Priority order, testing strategy, tooling |
| 14 | [Future Work](14-future-work.md) | Planned features, resolved design issues |
| 99 | [Design Gaps](99-design-gaps.md) | Gaps between original design and current docs |

---

## Related Documents

Other design documents in the `design/` directory:

- [`prompt-structure-research.md`](../prompt-structure-research.md) - Comprehensive research on prompt engineering
- [`pupt-lib-prfaq.md`](../pupt-lib-prfaq.md) - PR/FAQ document
- [`pupt-lib-faqs.md`](../pupt-lib-faqs.md) - Frequently asked questions
- [`pupt-lib-pr.md`](../pupt-lib-pr.md) - Press release format

---

## Navigation Tips for Claude Code

When exploring this codebase, you can:

1. **Start with the index** - This document provides quick reference for common topics
2. **Use the quick reference table** - Jump directly to the relevant section for your question
3. **Follow document links** - Each document cross-references related sections
4. **Check the original** - The monolithic [`../pupt-lib-design.md`](../pupt-lib-design.md) contains the complete design if you need full context
