# YAML as Alternative Input Syntax

## Status

**Draft** - Early exploration. Will revisit later.

## Problem Statement

Non-technical users can author `.prompt`/`.pupt` files using HTML-like JSX syntax, but some use cases are primarily declarative data (key-value attributes, lists, prose text) where JSX syntax adds unnecessary noise. Angle brackets, self-closing tags (`/>`), and especially array prop syntax (`expertise={["quantum mechanics", "particle physics"]}`) are barriers for users unfamiliar with markup languages.

YAML is a widely understood data format (used by Hugo, Jekyll, Obsidian, GitHub Actions, Docker Compose, Kubernetes, etc.) that could serve as an alternative input syntax for the same JSX element tree — not replacing `.prompt`/`.pupt` files, but offering a parallel authoring format for data-heavy definitions.

## Core Idea

YAML files would be a general-purpose alternative input format that gets translated to JSX elements at load time. The same rendering pipeline processes the result regardless of whether the source was YAML or JSX.

```
YAML file → parse → PuptElement tree → render (same pipeline) → text output
                                          ↑
.prompt file → preprocess → transform → PuptElement tree
```

This is analogous to how React supports both JSX (`<Button color="red" />`) and `React.createElement('button', {color: 'red'})` — different syntax, same output.

## Mapping Rules (Draft)

### Basic mapping

YAML keys that match known component names become child elements. Other keys become props on the parent element.

```yaml
# Input
Persona:
  name: bob-the-professor
  Role: University professor of physics
  Tone:
    type: academic
    warmth: warm
  Specialization:
    areas:
      - quantum mechanics
      - particle physics
```

```tsx
// Equivalent JSX
<Persona name="bob-the-professor">
  <Role>University professor of physics</Role>
  <Tone type="academic" warmth="warm" />
  <Specialization areas={["quantum mechanics", "particle physics"]} />
</Persona>
```

### Proposed rules

1. **Top-level key** → root element type
2. **Keys matching component names** → child elements
3. **Other keys** → props on the parent element
4. **String value on a component key** → text children of that component
5. **Object value on a component key** → props on that child element
6. **Array of strings on a component key** → multiple child elements with text content
7. **`text` or `content` key** → free-form text children (prose)
8. **`children` key** → ordered list of child elements (preserves order, allows mixing types)

### Full prompt example

```yaml
Prompt:
  name: explain-topic
  Persona:
    src: ./personas/professor.yaml
  Task: Explain quantum entanglement to a first-year student
  Constraints:
    - Use simple language and avoid jargon
    - Include at least one analogy from everyday life
    - Keep the explanation under 500 words
  Format: |
    Start with a one-sentence summary, then provide the full explanation.
    End with a "test your understanding" question.
```

```tsx
// Equivalent JSX
<Prompt name="explain-topic">
  <Persona src="./personas/professor.yaml" />
  <Task>Explain quantum entanglement to a first-year student</Task>
  <Constraints>
    <Constraint>Use simple language and avoid jargon</Constraint>
    <Constraint>Include at least one analogy from everyday life</Constraint>
    <Constraint>Keep the explanation under 500 words</Constraint>
  </Constraints>
  <Format>
    Start with a one-sentence summary, then provide the full explanation.
    End with a "test your understanding" question.
  </Format>
</Prompt>
```

### Frontmatter + prose variant

For files that are primarily a structured header plus free-form text (personas, examples), YAML frontmatter with a prose body is natural:

```yaml
---
name: Bob the Professor
role: University professor of physics
expertise:
  - quantum mechanics
  - particle physics
tone: academic
warmth: warm
traits:
  - patient
  - rigorous
  - encouraging
---

You guide learning through Socratic questioning. Rather than giving
direct answers, you ask probing questions that lead students to
discover the answer themselves.

You start with fundamentals and build toward complexity. You never
dismiss confusion — you treat it as a learning opportunity.
```

The `---` delimited header is parsed as YAML props; the body becomes `children` text. This is the same frontmatter convention used by static site generators, Obsidian, and many other tools.

## Where YAML Works Well

- **Personas** — primarily key-value attributes plus narrative text
- **Examples** — input/output pairs with metadata
- **Simple prompts** — role + task + constraints (the most common pattern)
- **Presets / configuration** — pure data definitions
- **Batch definitions** — multiple items in a single file (YAML supports documents)

## Where YAML Breaks Down

### Mixed inline content

JSX naturally interleaves text and elements:
```tsx
<Task>
  Analyze the following <Code language="python">{sourceCode}</Code> and
  identify performance bottlenecks.
</Task>
```

YAML cannot express inline element interpolation within text. You'd need a workaround like template syntax (`Analyze the following {{Code language=python}}...`) which is a significant new feature.

### Expressions and dynamic content

```tsx
<If when={userIsAdmin}>
  <Task>Include admin-level diagnostics</Task>
</If>
```

YAML is static data — it cannot express runtime conditions, expressions, or variable references without inventing an expression language.

### Deeply nested composition

Complex trees with multiple levels of nesting and mixed children types become awkward in YAML. The `children` key helps but is verbose compared to JSX's natural nesting.

### Ordering ambiguity

YAML objects are unordered by specification (though most parsers preserve insertion order). If child element ordering matters, the `children` array is needed, which is more verbose than JSX.

## Open Issues

### 1. Component name resolution

The mapping rule "keys matching component names become child elements" requires knowing which names are components at parse time. Options:
- Use the component registry / component discovery to resolve names
- Use a naming convention (e.g., PascalCase keys are components, camelCase are props)
- Require explicit declaration of which keys are components

### 2. File extension

What extension do YAML-based pupt files use?
- `.yaml` / `.yml` — standard but doesn't signal pupt-lib usage
- `.pupt.yaml` — compound extension, clear purpose
- `.pupt` — same extension as JSX files, detected by content (YAML vs JSX)
- New extension — adds to proliferation

### 3. Ambiguity between props and children

When a component key has an object value, how do we distinguish "these are props on the child element" from "these are children of the child element"?

```yaml
Role:
  title: Software Engineer        # Is this a prop or...?
  expertise: [TypeScript, React]  # ...a child element?
```

Possible resolutions:
- Use the component's Zod schema to determine which keys are valid props
- Use a convention (`_text` for text children, everything else is props)
- Require explicit `props:` and `children:` keys when ambiguous

### 4. YAML type coercion gotchas

YAML has well-known implicit type coercion issues:
- `no` and `yes` become booleans
- `1.0` becomes a float
- Country codes like `NO` (Norway) become `false`
- Unquoted strings that look like numbers become numbers

This can cause subtle bugs. Options:
- Use a strict YAML parser (StrictYAML) that treats everything as strings by default
- Document the gotchas prominently
- Post-process parsed values with schema validation

### 5. Interaction with preprocessing

Currently, `.prompt` files go through a preprocessor that adds auto-imports and `export default` wrapping. YAML files would skip this entirely — they go through a YAML parser instead. The two paths converge at the PuptElement tree level.

This means YAML files cannot use `<Uses>` for importing external components (since `<Uses>` is a JSX construct transformed by a Babel plugin). An alternative mechanism for declaring dependencies in YAML is needed (possibly an `imports:` key in the YAML structure).

### 6. Scope of initial implementation

Should YAML support launch as:
- **Full general-purpose** — any component tree can be expressed in YAML
- **Limited to flat structures** — only personas, examples, and simple prompts (explicitly not supporting deeply nested trees or dynamic content)
- **Frontmatter-only** — just the `---` frontmatter + prose body format for data-heavy definitions

Starting with frontmatter-only is the most pragmatic and covers the primary use cases (personas, examples) without solving the hard problems (mixed content, expressions, deep nesting).

### 7. Bidirectional conversion

Should there be tooling to convert between YAML and JSX formats? This would help users start with YAML and "graduate" to JSX when they need more power, and would validate that the mapping rules are lossless for the supported subset.

## Dependencies

- YAML parser library (e.g., `yaml` npm package, or `js-yaml`)
- Component discovery (to resolve component names in YAML keys)
- Schema validation (to disambiguate props from children)

## Relationship to Other Features

- **Persona design** — YAML is a natural authoring format for personas but is not required. Personas can be fully authored in `.prompt`/`.pupt` JSX syntax. YAML support would be additive.
- **Reusable fragments** — YAML files that define components (personas, examples) need the same cross-file referencing mechanism as `.prompt` files.
- **`.pupt` extension** — if `.pupt` is used for YAML files, the loader needs to detect format (YAML vs JSX) by content inspection.
