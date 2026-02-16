# Persona Component Design

## Status

**Draft** - Ready for review

## Problem Statement

Users want to define reusable AI personas that encapsulate role, tone, communication style, personality traits, interaction methodology, and behavioral constraints into a single composable unit. Currently, each prompt must manually configure `<Role>`, `<Tone>`, `<Style>`, and other components individually, leading to duplication when the same "character" is used across multiple prompts.

Beyond just bundling existing components, research shows that personas are most effective when presented as a **unified identity frame** rather than disconnected attributes. A persona is a superset of role and tone — it includes professional identity and communication style but extends to methodology, values, personality traits, and boundaries.

## Research Summary: Personas in LLM Prompt Engineering

### What is a persona?

A persona in LLM prompt engineering is a multi-dimensional characterization assigned to the model that shapes how it reasons, what knowledge it draws on, and how it communicates. The term is used somewhat interchangeably with "role prompting" in the literature, but "persona" connotes a richer characterization than a simple role label.

The hierarchy is:

| Concept | Scope | What It Controls |
|---------|-------|------------------|
| **Tone** | Narrowest — style only | Voice, register, emotional quality |
| **Role** | Medium — professional identity | Knowledge domain, reasoning approach, vocabulary |
| **Persona** | Broadest — full characterization | All of the above PLUS personality traits, interaction methodology, values, and behavioral constraints |

### Key dimensions of a persona

Based on research (ExpertPrompting, DeepPersona, PLoP 2024 Pattern Language, CO-STAR/RISEN/CRISPE frameworks):

**Core Identity:**
1. Professional role / occupation
2. Expertise domain and level
3. Background and experience

**Communication:**
4. Communication style (concise vs. verbose, technical vs. accessible, uses analogies, etc.)
5. Tone / register (warm, authoritative, casual, etc.)
6. Vocabulary and terminology level

**Behavioral:**
7. Interaction methodology (Socratic questioning, step-by-step, collaborative, etc.)
8. Personality traits (patience, curiosity, skepticism, etc.)
9. Values and priorities (accuracy, simplicity, creativity, etc.)
10. Boundaries (what they won't do, when they defer)

**Contextual:**
11. Audience awareness
12. Motivations

### What the research says about effectiveness

**Personas work well for:**
- Open-ended creative writing and stylistic tasks
- Tone and communication style calibration
- Multi-perspective analysis
- Establishing behavioral guardrails
- Complex reasoning (multi-persona debate)

**Personas show limited benefit for:**
- Straightforward factual accuracy tasks
- Classification and multiple-choice tasks
- Tasks where frontier models already perform well without scaffolding

**Best practices:**
- Detailed, task-specific personas outperform generic ones ("You are a mathematician" is weak; a multi-sentence description of specific expertise is strong)
- Use "You are..." framing, not "Imagine you are..."
- Establish persona first, then pose the task (two-stage approach)
- Match persona expertise to the task domain (mismatches can degrade performance by up to 30%)
- Combine persona with explicit task instructions and output constraints — persona alone is insufficient

**Sources:** ExpertPrompting (Xu et al., 2023), PLoP 2024 Pattern Language (Schreiber, White, Schmidt), PromptHub effectiveness analysis, SSRN 2025 study on expert personas, Town Hall Debate Prompting.

### Common high-value persona archetypes

**Analytical/Reasoning:**
- Expert / Domain Specialist — authoritative analysis in a specific field
- Critic / Reviewer — evaluates and identifies weaknesses
- Devil's Advocate — challenges assumptions, stress-tests ideas
- Analyst — systematic, data-driven decomposition

**Educational:**
- Socratic Teacher — guides through questions, not answers
- Coach / Mentor — motivational, practical guidance
- Explainer / Simplifier — analogies, progressive disclosure

**Creative:**
- Storyteller — explains through narratives
- Creative Director — originality and audience engagement

**Professional:**
- Strategic Advisor — frameworks-based thinking, tradeoff analysis
- Judge — distills complex information into clear conclusions

**Multi-Agent:**
- Panel of Experts — multiple personas debate from different angles
- Red Team — adversarial flaw-finding

## Design Decisions

### Decision 1: Persona is a primitive component, not a preset lookup

**Decision:** `<Persona>` is a primitive component that takes explicit props (role, tone, traits, methodology, etc.) and renders a unified persona text block. It does NOT have an `id` prop for looking up built-in presets.

**Rationale:** The component equality principle requires that built-in components must not have special treatment that third-party components cannot replicate. A built-in preset lookup table (`<Persona id="socratic-teacher">`) would give pupt-lib's bundled presets privileged access that third-party packages cannot match — third parties cannot add entries to pupt-lib's internal preset table. This violates component equality.

Instead, reusable personas are regular components that compose the `<Persona>` primitive (see Decision 2). Both built-in and third-party persona components use the exact same public API.

**What we rejected:**
- `<Persona id="...">` with internal preset registry — violates component equality
- `<Persona>` with both presets and an "escape hatch" for custom components — creates two tiers of citizenship (preset-based built-ins get convenient syntax; third-party components need wrapper classes)

### Decision 2: Reusable personas are components that compose `<Persona>`

**Decision:** Each reusable persona (e.g., `SocraticTeacher`, `CodeReviewer`) is a standalone component class that renders `<Persona>` with specific props. Built-in personas live in `components/personas/` and use the same public API as third-party persona components.

**Rationale:**

The alternative is treating personas as pure data (preset configs). We chose components because:

1. **Type safety.** Each persona component defines its own typed props. `<SoftwareEngineer language="TypeScript">` gets compile-time validation. A generic `<Persona>` with a params bag cannot type-check persona-specific props.

2. **Encapsulation.** Complex personas can contain logic — e.g., a `CodeReviewer` persona might adjust its constraints based on the `language` prop. Data presets cannot express conditional behavior.

3. **Standard distribution.** Third-party persona packages are standard npm packages that export component classes. No registration mechanism, no side-effectful imports, no runtime configuration. Just `import { Oncologist } from '@medical-ai/pupt-personas'`.

4. **Component equality.** Built-in personas in `components/personas/` use the same pattern as third-party ones — they import from `pupt-lib` and compose `<Persona>`. The framework gives no special treatment to built-in personas.

5. **Existing infrastructure.** Components get auto-imported in `.prompt`/`.pupt` files, discovered by the Pupt API, indexed by MiniSearch. Personas inherit all of this for free.

**What we considered and rejected:**
- Personas as data presets in `components/presets/persona-presets.ts` — gives built-in presets special status, loose typing for persona-specific params, third parties need registration mechanism
- Hybrid (presets for built-in, components for third-party) — still two tiers of citizenship; built-in presets get privileged `id="..."` syntax

**Example — built-in persona:**
```tsx
// components/personas/SocraticTeacher.tsx
import { Component, Persona } from 'pupt-lib';

interface SocraticTeacherProps {
  subject?: string;
  difficulty?: 'introductory' | 'intermediate' | 'advanced' | 'graduate';
}

export class SocraticTeacher extends Component<SocraticTeacherProps> {
  render(props: SocraticTeacherProps) {
    return (
      <Persona
        role="Patient educator"
        expertise={props.subject ? [props.subject] : undefined}
        tone="encouraging"
        methodology="Guides through questions rather than direct answers; builds understanding incrementally"
        traits={['patient', 'curious', 'rigorous']}
        values={['deep understanding over surface answers', 'learner autonomy']}
      />
    );
  }
}
```

**Example — third-party persona (identical pattern):**
```tsx
// @medical-ai/pupt-personas
import { Component, Persona } from 'pupt-lib';

interface OncologistProps {
  specialty?: string;
  treatmentPhilosophy?: 'aggressive' | 'conservative' | 'balanced';
}

export class Oncologist extends Component<OncologistProps> {
  render(props: OncologistProps) {
    return (
      <Persona
        role="Board-certified oncologist"
        expertise={['oncology', props.specialty].filter(Boolean)}
        tone="empathetic"
        traits={['compassionate', 'thorough', 'evidence-based']}
      />
    );
  }
}
```

### Decision 3: No `.persona` file extension — use `.prompt` / `.pupt`

**Decision:** Persona definitions use the existing `.prompt` or `.pupt` file extensions. No new file type is created.

**Rationale:** The syntactic sugar provided by `.prompt` files (auto-imports, no `export default` boilerplate) applies equally to persona definitions. The reasons for creating a `.prompt` extension — hiding JavaScript complexity from non-technical users — are the same reasons a `.persona` extension would exist. Creating `.persona` sets a precedent that demands `.constraint`, `.example`, `.guardrail`, and other per-component-type extensions, leading to file type proliferation for no real gain.

Instead, the root element of a `.prompt`/`.pupt` file determines what the file defines:
- Root `<Prompt>` → a renderable prompt
- Root `<Persona>` → a reusable persona definition

The `.pupt` extension is a generic alternative to `.prompt` that is not semantically locked to "prompt" as a concept. Both extensions receive identical preprocessing (auto-imports, JSX wrapping).

**Non-technical persona authoring example:**
```
<!-- personas/professor.prompt -->
<Persona name="bob-the-professor">
  <Role>University professor of physics with 20 years experience</Role>
  <Tone type="academic" warmth="warm" />
  <Specialization areas="quantum mechanics, particle physics" />

  You guide learning through Socratic questioning. Rather than giving
  direct answers, you ask probing questions that lead students to
  discover the answer themselves. You start with fundamentals and
  build toward complexity. You never dismiss confusion.
</Persona>
```

This requires no JavaScript knowledge — it's the same HTML-like syntax non-technical users already write for `.prompt` files.

**Open question:** The mechanism for one `.prompt`/`.pupt` file to reference a persona defined in another file needs design. This is a general "reusable fragments" feature (not persona-specific) that would use `<Uses>` or a `src` prop. See Open Questions section.

### Decision 4: `<Persona>` renders as a unified text block

**Decision:** The `<Persona>` component renders a single, cohesive persona description rather than emitting separate `<role>`, `<tone>`, `<style>` XML sections.

**Rationale:** Research consistently shows that personas work best as a unified identity frame. The two-stage approach (establish identity, then pose task) is recommended because the LLM treats a cohesive persona description as a single behavioral context. Emitting separate disconnected sections (`<role>You are...</role>` then later `<tone>Use academic tone</tone>`) fragments the identity and loses the coherence benefit.

**Example rendered output:**
```
<persona>
You are a patient educator who guides learning through Socratic questioning.
You have deep expertise in quantum mechanics and particle physics with 20 years of teaching experience.
Your approach: Rather than giving direct answers, you ask probing questions that lead the learner to discover the answer themselves. You build understanding incrementally, celebrate progress, and adapt your complexity to the learner's level.
You are patient, curious, and rigorous.
You prioritize deep understanding over surface-level answers and learner autonomy.
Communication style: encouraging, academic, semi-formal.
</persona>
```

### Decision 5: Persona naming convention — no suffix

**Decision:** Built-in persona components use descriptive names without a `Persona` suffix: `SocraticTeacher`, `CodeReviewer`, `DevilsAdvocate` — not `SocraticTeacherPersona`.

**Rationale:** No other component type in pupt-lib uses type suffixes (`IfConstraint`, `FormatSection` do not exist). Adding a suffix creates an inconsistency. The component's location in `components/personas/` and its rendering of `<Persona>` make its purpose clear. Name collisions with other component types are unlikely since persona names are distinctive (there's no structural component called `SocraticTeacher`).

If collision does occur in the future, it can be resolved the same way any namespace collision is resolved — with the `as` prop on `<Uses>`.

## Architecture

### Component Hierarchy

```
<Persona>                          ← Primitive: takes explicit props, renders unified text
  ↑ composed by
<SocraticTeacher>                  ← Built-in reusable persona (components/personas/)
<CodeReviewer>                     ← Built-in reusable persona
<DevilsAdvocate>                   ← Built-in reusable persona
...
<Oncologist>                       ← Third-party reusable persona (npm package)
```

### File Layout

```
components/
├── structural/
│   ├── Persona.tsx                ← The primitive component
│   └── ... (existing components)
├── personas/                      ← Built-in reusable personas
│   ├── SocraticTeacher.tsx
│   ├── CodeReviewer.tsx
│   ├── DevilsAdvocate.tsx
│   ├── DomainExpert.tsx
│   ├── FriendlyAssistant.tsx
│   ├── TechnicalWriter.tsx
│   ├── StrategicAdvisor.tsx
│   ├── Eli5Explainer.tsx
│   └── index.ts
├── presets/
│   └── ... (existing presets — NO persona-presets.ts)
└── index.ts
```

### `<Persona>` Primitive Props

```typescript
interface PersonaProps {
  // Identity
  name?: string;                    // Persona name (for identification/discovery)
  role?: string;                    // Professional role / occupation
  expertise?: string | string[];    // Areas of expertise
  experience?: 'junior' | 'mid' | 'senior' | 'expert' | 'principal';
  domain?: string;                  // Specialization domain

  // Communication
  tone?: 'professional' | 'casual' | 'friendly' | 'academic'
       | 'authoritative' | 'empathetic' | 'enthusiastic'
       | 'neutral' | 'humorous' | 'serious';
  formality?: 'formal' | 'semi-formal' | 'informal';
  style?: 'concise' | 'detailed' | 'academic' | 'casual' | 'technical' | 'simple';
  verbosity?: 'minimal' | 'moderate' | 'verbose';

  // Behavioral
  methodology?: string;             // How they approach problems
  traits?: string[];                // Personality traits
  values?: string[];                // What they optimize for
  boundaries?: string[];            // What they won't do

  // Standard
  delimiter?: 'xml' | 'markdown' | 'none';
  children?: PuptNode;              // Free-form text (methodology, personality narrative)
}
```

The `children` prop allows free-form prose that becomes part of the persona narrative. This is where the most effective persona content goes — the methodology and personality description that research shows is more impactful than structured fields alone.

### `<Persona>` Children-Based Authoring

For non-technical users writing `.prompt`/`.pupt` files, the `<Persona>` primitive also accepts child components to configure individual dimensions:

```
<Persona name="my-persona">
  <Role>University professor of physics</Role>
  <Tone type="academic" warmth="warm" />
  <Specialization areas="quantum mechanics, particle physics" />

  Free-form methodology and personality text goes here.
</Persona>
```

When `<Persona>` encounters child components like `<Role>`, `<Tone>`, `<Specialization>`, it extracts their configuration and incorporates it into the unified persona text block. The child components are NOT rendered as separate sections — they are consumed as structured input to the persona narrative.

This means the same `<Persona>` primitive supports two authoring styles:
1. **Props-based** (TypeScript developers): `<Persona role="..." tone="..." />`
2. **Children-based** (non-technical `.prompt` authors): `<Persona><Role>...</Role><Tone .../></Persona>`

Both produce identical output.

## Interaction with Existing Components

### `<Prompt>` Integration

**Detection:** `<Prompt>` uses `findChildrenOfType()` to detect child types. It will detect `<Persona>` children the same way it detects `<Role>` children. When a `<Persona>` is present, `<Prompt>` suppresses auto-generation of its default role section.

**Resolution:** If both `<Persona>` and `<Role>` appear as direct children of `<Prompt>`, the `<Persona>` takes precedence. The standalone `<Role>` is ignored with a console warning. Rationale: a persona is a superset of a role — having both is contradictory.

**Implementation:** Add `Persona` to the list of child types that `<Prompt>` detects:
```typescript
const hasPersona = findChildrenOfType(childArray, Persona).length > 0;
// If hasPersona, skip auto-generated role
const includeRole = !hasPersona && config.includeRole && !hasRole;
```

Note: `findChildrenOfType` uses exact type matching. Since reusable persona components (e.g., `SocraticTeacher`) render `<Persona>` internally, `<Prompt>` detects the `<Persona>` element in the rendered tree, not the source component. This means detection works for both built-in and third-party persona components without any special registration.

### `<Role>` — Direct overlap

If `<Persona>` and `<Role>` coexist as children of `<Prompt>`:
- `<Persona>` wins; `<Role>` is ignored with a warning
- Rationale: a persona is a superset of role; having both is contradictory

If `<Role>` appears as a child of `<Persona>` (children-based authoring):
- `<Role>` is consumed as input to the persona narrative, not rendered separately

### `<Tone>` — Same overlap pattern

Same behavior as `<Role>`: if both `<Persona>` and standalone `<Tone>` are children of `<Prompt>`, persona wins with a warning. If `<Tone>` is a child of `<Persona>`, it's consumed as persona input.

### `<Style>`, `<Audience>`, `<Specialization>` — Complementary

These components can coexist with `<Persona>` as siblings in `<Prompt>`. When both exist:
- The persona provides defaults for these dimensions
- Explicit standalone components override the persona's defaults for that dimension
- No warning needed — this is intentional fine-tuning

### `<Constraints>` / `<Guardrails>` — Additive

Persona components may contribute constraints or guardrails (e.g., `CodeReviewer` adds "flag security issues"). These should merge with explicit `<Constraints>` using the existing `extend` mechanism:
- Persona adds its constraints as defaults
- `<Constraints extend>` adds on top
- `<Constraints>` (without extend) replaces entirely

### `<SuccessCriteria>` / `<Criterion>` — Not modified

Personas do NOT automatically inject success criteria. The persona shapes the LLM's interpretation of criteria, not their text. Success criteria remain explicitly authored by the prompt writer.

### `<Format>` — Not modified

Format is about output structure (JSON, markdown, etc.), which is orthogonal to persona. Personas do not affect format rendering.

### `<Context>` — Not modified

Context is user-provided information. Personas do not inject or modify context.

## Built-in Personas (Initial Set)

Based on research into the most commonly used and effective persona archetypes:

### Tier 1: Broadly Useful

| Component | Role | Key Characteristics | Custom Props |
|-----------|------|---------------------|--------------|
| `SocraticTeacher` | Patient educator | Guides through questions, builds understanding incrementally, encourages autonomy | `subject?`, `difficulty?` |
| `DomainExpert` | Senior specialist | Authoritative answers with reasoning, flags edge cases, intellectually honest about uncertainty | `domain`, `experienceYears?` |
| `DevilsAdvocate` | Critical thinker | Challenges assumptions, presents counter-arguments, stress-tests ideas | `focus?` (e.g., "technical", "business") |
| `FriendlyAssistant` | Helpful generalist | Conversational, checks understanding, offers follow-ups proactively | `enthusiasm?` |

### Tier 2: Specialized

| Component | Role | Key Characteristics | Custom Props |
|-----------|------|---------------------|--------------|
| `CodeReviewer` | Principal engineer | Points out issues with severity, suggests fixes, acknowledges good patterns | `language?`, `focus?` |
| `TechnicalWriter` | Documentation specialist | Progressive disclosure, defines terms before use, consistent structure | `audience?` |
| `StrategicAdvisor` | Executive consultant | Frameworks-based, weighs tradeoffs, identifies second-order effects | `domain?` |
| `Eli5Explainer` | Science communicator | Everyday analogies, avoids jargon, builds from familiar concepts | `targetAge?` |

### Tier 3: Future Consideration

- `RedTeam` — adversarial security persona
- `Interviewer` — structured requirements gathering
- `Coach` — motivational mentoring
- `Storyteller` — narrative explanation style

## Provider Adaptation

The `<Persona>` component should use `PROVIDER_ADAPTATIONS` (from `components/presets/provider-adaptations.ts`) to adapt rendering per LLM provider, following the same pattern as `<Role>`. Key adaptations:

- **Role prefix:** "You are " vs. "Your role: " depending on provider
- **Instruction style:** More detailed descriptions for smaller models; more concise for frontier models
- **Format preference:** XML vs. markdown delimiters

## Open Questions

### 1. Reusable fragment loading

How does one `.prompt`/`.pupt` file reference a persona defined in another file? Current options:

**Option A: `src` prop on `<Persona>`**
```
<Persona src="./personas/professor.prompt" />
```

**Option B: `<Uses>` component**
```
<Uses component="BobTheProfessor" from="./personas/professor.prompt" />
<BobTheProfessor />
```

This is a general "reusable fragments" feature, not persona-specific. The solution should work for any component defined in a `.prompt`/`.pupt` file.

### 2. Parameterized file-based personas

If a non-technical user defines a persona in a `.prompt` file, can the consuming prompt pass parameters to it?

```
<!-- Usage -->
<Persona src="./personas/professor.prompt" subject="quantum physics" />
```

This requires some form of parameter passing to file-based components. It may be deferred to a later design iteration.

### 3. `<Prompt>` `persona` prop

Should `<Prompt>` gain a `persona` prop (like the existing `role` prop) as shorthand?

```
<Prompt name="foo" persona={SocraticTeacher}>
```

This would be convenient but may not be necessary if persona components are easy to use as children.

### 4. Persona + provider adaptation depth

Should persona rendering adapt more significantly per provider (e.g., much more detailed for smaller models, minimal for frontier models)? Research suggests persona effectiveness varies by model capability. This could be a future optimization.

### 5. `.pupt` extension support

The `.pupt` extension needs to be added to the preprocessor alongside `.prompt`. In `src/services/preprocessor.ts`, `isPromptFile()` currently checks for `.prompt` only. This should be updated to also recognize `.pupt`. This is a small change but is a prerequisite for persona files using the `.pupt` extension.
