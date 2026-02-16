# Documentation Prompts

**SDLC Phase:** Documentation, Knowledge Management
**Category Clarity:** CLEAR
**Developer Trust:** MEDIUM-HIGH (most consistently praised AI use case)

---

## Prompt 1: API Documentation Generation

**Source:** Dev.to prompt collections, developer workflows
**Pattern:** Structured API docs from code
**Why it works:** Tedious but well-defined task that AI handles reliably

```
Generate comprehensive API documentation for the following endpoints.

[paste route definitions or controller code]

For each endpoint include:
- HTTP method and URL pattern
- Brief description of purpose
- Request headers (especially authentication)
- Request body schema with types, required/optional, and validation rules
- Response body schema with example JSON
- Error responses (status codes, error body format, when each occurs)
- Rate limiting information
- Usage example (curl or fetch)

Format as Markdown. Group endpoints by resource.
```

---

## Prompt 2: Code Explanation (Onboarding)

**Source:** Multiple sources, learning-focused prompts
**Pattern:** Explain for a specific audience level
**Why it works:** AI excels at explanation; audience level prevents over/under-simplification

```
Explain the following code to a developer who is:
- Experienced in [language they know] but new to [language of this code]
- Familiar with [concepts they know] but unfamiliar with [concepts in this code]

[paste code]

For each section:
1. What it does (in plain English)
2. Why it does it that way (the design choice)
3. How it connects to the rest of the system
4. Any non-obvious behavior or gotchas

Don't explain basic syntax -- focus on the domain logic and architecture.
```

---

## Prompt 3: JSDoc / Docstring Generation

**Source:** Dev.to, developer blogs
**Pattern:** Type-aware documentation
**Why it works:** Mechanical task with clear rules; AI is reliable here

```
Add [JSDoc/docstring/rustdoc] comments to the following functions.

[paste code]

For each function include:
- One-sentence summary of purpose
- Description of each parameter with type, constraints, and defaults
- Return type and what it represents
- Exceptions/errors that can be thrown and when
- A usage example
- Any important side effects

Do NOT add comments to obvious getters/setters or trivial utility functions.
Only document functions where the name alone doesn't make the behavior clear.
```

---

## Prompt 4: README Generation

**Source:** Developer prompt collections
**Pattern:** Project README from codebase analysis
**Why it works:** Standardized format with project-specific content

```
Generate a README.md for this project based on the codebase.

Key information:
- Project name: [name]
- Purpose: [one-line description]
- Tech stack: [list technologies]

Include sections:
1. Overview (what the project does and why)
2. Prerequisites (required tools and versions)
3. Getting Started (clone, install, configure, run)
4. Project Structure (key directories and their purpose)
5. Available Scripts (build, test, lint, deploy commands)
6. Configuration (environment variables and their purpose)
7. Contributing (how to submit changes)

Keep it concise -- developers want to get started quickly, not read an essay.
```

---

## Prompt 5: Architecture Documentation

**Source:** Architecture documentation workflows
**Pattern:** Generate docs from code structure
**Why it works:** Captures the current state of the system, not the intended state

```
Based on the codebase structure and these key files:

[paste or reference key files]

Generate architecture documentation covering:

1. **System Overview**: What the system does at a high level
2. **Component Diagram**: Key modules and their relationships (as Mermaid)
3. **Data Flow**: How data moves through the system for the main use case
4. **Key Design Decisions**: Patterns used and why (infer from the code)
5. **Dependencies**: External services, databases, APIs the system relies on
6. **Deployment**: How the system is packaged and deployed (from config files)

Mark anything you're inferring vs. stating from code evidence.
```
