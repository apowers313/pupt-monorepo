# Component Reference

Complete reference for all pupt-lib built-in components.

All components accept `children` as content. Props marked with `?` are optional. Default values are shown after `=`.

---

## Structural Components

Components for organizing prompt structure. Most structural components accept a `delimiter` prop (`'xml'` | `'markdown'` | `'none'`, default `'xml'`) that controls how content is wrapped.

### Prompt

Root container for a complete prompt. Auto-generates default Role, Format, and Constraint sections unless disabled.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | — | Prompt identifier (required) |
| `description?` | `string` | — | Human-readable description |
| `version?` | `string` | — | Semantic version |
| `tags?` | `string[]` | — | Tags for categorization/search |
| `bare?` | `boolean` | `false` | Disable all auto-generated sections |
| `defaults?` | `object \| 'none'` | — | Fine-grained control: `{ role?, format?, constraints?, successCriteria?, guardrails? }` (each boolean) |
| `noRole?` | `boolean` | — | Shorthand for `defaults: { role: false }` |
| `noFormat?` | `boolean` | — | Shorthand for `defaults: { format: false }` |
| `noConstraints?` | `boolean` | — | Shorthand for `defaults: { constraints: false }` |
| `noSuccessCriteria?` | `boolean` | — | Shorthand for `defaults: { successCriteria: false }` |
| `noGuardrails?` | `boolean` | — | Shorthand for `defaults: { guardrails: false }` |
| `role?` | `string` | — | Preset key for the default role (e.g., `"engineer"`) |
| `expertise?` | `string` | — | Expertise for the default role |
| `format?` | `string` | — | Output format hint |
| `audience?` | `string` | — | Target audience hint |
| `tone?` | `string` | — | Tone hint |
| `slots?` | `object` | — | Replace default sections: `{ role?, format?, constraints?, successCriteria?, guardrails? }` (each a component class) |

### Section

Creates a labeled section with delimiters.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name?` | `string` | — | Section heading/tag name |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` if `name` is set, `'none'` otherwise | Delimiter style |

### Role

Defines the AI persona/role. Supports presets and custom content.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset?` | `string` | — | Role preset key (see [Role Presets](#role-presets)) |
| `title?` | `string` | — | Custom role title |
| `expertise?` | `string \| string[]` | — | Areas of expertise |
| `experience?` | `'junior' \| 'mid' \| 'senior' \| 'expert' \| 'principal'` | — | Experience level |
| `traits?` | `string[]` | — | Personality traits |
| `domain?` | `string` | — | Domain specialization |
| `style?` | `'professional' \| 'casual' \| 'academic' \| 'friendly'` | — | Communication style |
| `extend?` | `boolean` | — | Extend preset with additional props |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Task

Defines what the AI should do.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset?` | `string` | — | Task preset key (see [Task Presets](#task-presets)) |
| `verb?` | `string` | — | Action verb (e.g., "Summarize") |
| `subject?` | `string` | — | Subject of the task |
| `objective?` | `string` | — | Detailed objective |
| `scope?` | `'narrow' \| 'broad' \| 'comprehensive'` | — | Task scope |
| `complexity?` | `'simple' \| 'moderate' \| 'complex'` | — | Complexity hint |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Context

Provides background information to the AI.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type?` | `'background' \| 'situational' \| 'domain' \| 'data' \| 'historical' \| 'reference' \| 'constraints' \| 'user'` | — | Context category |
| `label?` | `string` | — | Label for the context section |
| `source?` | `string` | — | Source attribution |
| `priority?` | `'critical' \| 'important' \| 'helpful' \| 'optional'` | — | Importance level |
| `relevance?` | `string` | — | Relevance description |
| `truncate?` | `boolean` | — | Allow truncation of long content |
| `maxTokens?` | `number` | — | Maximum token count |
| `preserveFormatting?` | `boolean` | — | Preserve original formatting |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Constraint

Adds rules and boundaries.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset?` | `string` | — | Constraint preset key (see [Constraint Presets](#constraint-presets)) |
| `type?` | `'must' \| 'should' \| 'must-not' \| 'may' \| 'should-not'` | — | Constraint strength |
| `category?` | `'content' \| 'format' \| 'tone' \| 'scope' \| 'accuracy' \| 'safety' \| 'performance'` | — | Category |
| `positive?` | `string` | — | Positive alternative for negative constraints |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Constraints

Container for grouping `<Constraint>` children. Supports composition with `<Prompt>` defaults.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `extend?` | `boolean` | — | Add to (rather than replace) default constraints |
| `exclude?` | `string[]` | — | Default constraint texts to exclude when extending |
| `presets?` | `string[]` | — | Constraint preset keys to include |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Format

Specifies output format requirements.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type?` | `'json' \| 'markdown' \| 'xml' \| 'text' \| 'code' \| 'yaml' \| 'csv' \| 'list' \| 'table'` | — | Output format |
| `language?` | `string` | — | Programming language (for code format) |
| `schema?` | `string \| Record<string, unknown>` | — | Schema definition or example |
| `template?` | `string` | — | Output template |
| `example?` | `string` | — | Example output |
| `strict?` | `boolean` | — | Enforce strict adherence |
| `validate?` | `boolean` | — | Request self-validation |
| `maxLength?` | `string \| number` | — | Maximum output length |
| `minLength?` | `string \| number` | — | Minimum output length |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Audience

Describes who the output is for.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `level?` | `'beginner' \| 'intermediate' \| 'advanced' \| 'expert' \| 'mixed'` | — | Expertise level |
| `type?` | `'technical' \| 'business' \| 'academic' \| 'general' \| 'children'` | — | Audience category |
| `description?` | `string` | — | Free-form audience description |
| `knowledgeLevel?` | `string` | — | Specific knowledge level |
| `goals?` | `string[]` | — | Audience goals |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Tone

Sets the emotional quality and style of output.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type?` | `'professional' \| 'casual' \| 'friendly' \| 'academic' \| 'authoritative' \| 'empathetic' \| 'enthusiastic' \| 'neutral' \| 'humorous' \| 'serious'` | — | Tone type |
| `formality?` | `'formal' \| 'semi-formal' \| 'informal'` | — | Formality level |
| `energy?` | `'calm' \| 'measured' \| 'energetic'` | — | Energy level |
| `warmth?` | `'warm' \| 'neutral' \| 'distant'` | — | Warmth level |
| `brandVoice?` | `string` | — | Brand voice description |
| `avoidTones?` | `string[]` | — | Tones to avoid |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### SuccessCriteria

Container for `<Criterion>` children.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `presets?` | `string[]` | — | Preset criteria to include |
| `extend?` | `boolean` | — | Extend defaults |
| `metrics?` | `Array<{ name: string; threshold: string }>` | — | Measurable metrics |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Criterion

Individual success criterion.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `category?` | `'accuracy' \| 'completeness' \| 'relevance' \| 'clarity' \| 'format' \| 'tone' \| 'efficiency'` | — | Category |
| `metric?` | `string` | — | Measurable metric |
| `weight?` | `'critical' \| 'important' \| 'nice-to-have'` | — | Importance weight |

### Objective

Defines primary and secondary objectives.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `primary` | `string` | — | Primary objective (required) |
| `secondary?` | `string[]` | — | Secondary objectives |
| `metrics?` | `string[]` | — | Success metrics |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Style

Controls writing style.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type?` | `'concise' \| 'detailed' \| 'academic' \| 'casual' \| 'technical' \| 'simple'` | — | Style type |
| `verbosity?` | `'minimal' \| 'moderate' \| 'verbose'` | — | Verbosity level |
| `formality?` | `'formal' \| 'semi-formal' \| 'informal'` | — | Formality |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### WhenUncertain

Instructs behavior when the AI is uncertain.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `action?` | `'acknowledge' \| 'ask' \| 'decline' \| 'estimate'` | — | Uncertainty action |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Specialization

Declares areas of specialization.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `areas` | `string \| string[]` | — | Specialization areas (required) |
| `level?` | `'familiar' \| 'proficient' \| 'expert' \| 'authority'` | — | Depth of specialization |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Guardrails

Safety constraints container.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset?` | `'standard' \| 'strict' \| 'minimal'` | — | Guardrail preset |
| `extend?` | `boolean` | — | Extend defaults |
| `exclude?` | `string[]` | — | Guardrail texts to exclude |
| `prohibit?` | `string[]` | — | Prohibited behaviors |
| `require?` | `string[]` | — | Required behaviors |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### EdgeCases

Defines edge case handling.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset?` | `'standard' \| 'minimal'` | — | Edge case preset |
| `extend?` | `boolean` | — | Extend defaults |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

Children should be `<When>` elements.

### When

Defines a condition-action pair for edge case handling.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `condition` | `string` | — | The condition (required) |
| `then?` | `string` | — | Action to take (or use children) |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Fallbacks

Container for fallback behaviors.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset?` | `'standard'` | — | Fallback preset |
| `extend?` | `boolean` | — | Extend defaults |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

Children should be `<Fallback>` elements.

### Fallback

Individual fallback behavior.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `when` | `string` | — | Trigger condition (required) |
| `then` | `string` | — | Fallback action (required) |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Contexts

Container for grouping `<Context>` children.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `extend?` | `boolean` | — | Extend defaults |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### References

Container for source references.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `extend?` | `boolean` | — | Extend defaults |
| `sources?` | `Array<{ title: string; url?: string; description?: string }>` | — | Inline source definitions |
| `style?` | `'inline' \| 'footnote' \| 'bibliography'` | — | Citation style |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

Children should be `<Reference>` elements.

### Reference

Individual source reference.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | — | Reference title (required) |
| `url?` | `string` | — | Source URL |
| `description?` | `string` | — | Description |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

---

## Ask Components (User Input)

Components for collecting user input. All Ask components share these base props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | — | Input identifier (required) |
| `label` | `string` | — | Display label (required) |
| `description?` | `string` | — | Help text |
| `required?` | `boolean` | — | Whether input is required |
| `silent?` | `boolean` | — | If true, input value is collected but not rendered |

Used via the `Ask` namespace: `<Ask.Text>`, `<Ask.Number>`, etc.

### Ask.Text

Single-line text input.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string` | — | Default value |
| `placeholder?` | `string` | — | Placeholder text |

### Ask.Number

Numeric input with optional range.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `number` | — | Default value |
| `min?` | `number` | — | Minimum value |
| `max?` | `number` | — | Maximum value |

### Ask.Select

Single choice from a list of options.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string` | — | Default selected value |
| `options?` | `Array<{ value: string; label?: string }>` | — | Options (or use `<Option>` children) |

### Ask.MultiSelect

Multiple choices from a list of options.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string[]` | — | Default selected values |
| `options?` | `Array<{ value: string; label?: string }>` | — | Options (or use `<Option>` children) |
| `min?` | `number` | — | Minimum selections |
| `max?` | `number` | — | Maximum selections |

### Ask.Confirm

Yes/no question. Defaults to `false` if no explicit default is provided.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `boolean` | — | Default value |

### Ask.Choice

Binary choice with custom labels (exactly 2 options required).

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string` | — | Default selected value |
| `options` | `Array<{ value: string; label: string; description?: string }>` | — | Exactly 2 options (required) |

### Ask.Editor

Multi-line text editor.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string` | — | Default content |
| `language?` | `string` | — | Syntax highlighting language |

### Ask.File

File path input.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string \| string[]` | — | Default file path(s) |
| `extensions?` | `string[]` | — | Allowed file extensions (e.g., `['.ts', '.js']`) |
| `multiple?` | `boolean` | — | Allow multiple files |
| `mustExist?` | `boolean` | — | Validate file exists (Node.js only) |
| `includeContents?` | `boolean` | — | Include file contents in prompt |

### Ask.Path

Directory path input.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string` | — | Default path |
| `mustExist?` | `boolean` | — | Validate path exists (Node.js only) |
| `mustBeDirectory?` | `boolean` | — | Validate path is a directory |

### Ask.Date

Date selection.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string` | — | Default date (ISO format) |
| `includeTime?` | `boolean` | — | Include time selection |
| `minDate?` | `string` | — | Minimum date (ISO or `'today'`) |
| `maxDate?` | `string` | — | Maximum date (ISO or `'today'`) |

### Ask.Secret

Masked input for sensitive values.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string` | — | Default value |
| `validator?` | `string` | — | Validation pattern |

### Ask.Rating

Numeric scale input.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `number` | — | Default rating |
| `min?` | `number` | — | Minimum value |
| `max?` | `number` | — | Maximum value |
| `labels?` | `Record<string, string>` | — | Labels for scale values (or use `<Label>` children) |

### Ask.ReviewFile

File input with automatic post-execution review.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `default?` | `string` | — | Default file path |
| `extensions?` | `string[]` | — | Allowed file extensions |
| `editor?` | `string` | — | Editor to open file in |

### Option

Used as a child of `<Ask.Select>` or `<Ask.MultiSelect>`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Option value (required) |

Children are used as the display label.

### Label

Used as a child of `<Ask.Rating>` to label scale values.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| string` | — | Scale value to label (required) |

Children are used as the label text.

---

## Control Flow Components

### If

Conditional rendering.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `when?` | `boolean \| string` | — | Condition: boolean or Excel-style formula (prefixed with `=`) |
| `provider?` | `LlmProvider \| LlmProvider[]` | — | Render only for these providers |
| `notProvider?` | `LlmProvider \| LlmProvider[]` | — | Render for all providers except these |

LlmProvider values: `'anthropic'`, `'openai'`, `'google'`, `'meta'`, `'mistral'`, `'deepseek'`, `'xai'`, `'cohere'`, `'unspecified'`.

```tsx
<If when={isVerbose}>
  <Context>Extra details here.</Context>
</If>

<If when='=count>5'>
  <Constraint type="must">Summarize the items.</Constraint>
</If>

<If provider="anthropic">
  <Context>You are Claude.</Context>
</If>
```

### ForEach

Iterate over an array, rendering children for each item.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `unknown[]` | — | Array to iterate (required) |
| `as` | `string` | — | Variable name for current item (required) |

```tsx
<ForEach items={['step 1', 'step 2', 'step 3']} as="step">
  <Step>{step}</Step>
</ForEach>
```

---

## Data Components

Components for embedding structured data.

### Code

Embeds code with language hint and fenced code block formatting.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `language?` | `string` | — | Programming language |
| `filename?` | `string` | — | Filename for context |

### Data

Embeds data with optional formatting.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `string` | — | Data section name (required) |
| `format?` | `'json' \| 'xml' \| 'text' \| 'csv'` | — | Data format |

### File

Reads and embeds file contents. In `.prompt` files, the `name` prop creates a variable for referencing the file value.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `path` | `string` | — | File path (required) |
| `language?` | `string` | — | Language for syntax highlighting |
| `encoding?` | `string` | — | File encoding |

### Json

Renders children as formatted JSON.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `indent?` | `number` | — | Indentation spaces |

### Xml

Renders children wrapped in XML tags.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `root?` | `string` | — | Root element name |

---

## Example Components

Components for providing input/output examples (few-shot prompting).

### Examples

Container for `<Example>` children. Renders a labeled examples section.

No specific props (accepts `children`).

### Example

Single example with input/output pair.

No specific props. Should contain `<ExampleInput>` and `<ExampleOutput>` children.

### ExampleInput

Input portion of an example.

No specific props (accepts `children`).

### ExampleOutput

Expected output of an example.

No specific props (accepts `children`).

### NegativeExample

Example of what NOT to do, with an optional explanation.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `reason?` | `string` | — | Why this is a bad example |

---

## Reasoning Components

Components for structured reasoning and chain-of-thought prompting.

### Steps

Encourages step-by-step thinking. Can use presets for common reasoning patterns.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `preset?` | `string` | — | Steps preset key (see [Steps Presets](#steps-presets)) |
| `style?` | `'step-by-step' \| 'think-aloud' \| 'structured' \| 'minimal' \| 'least-to-most'` | — | Reasoning style |
| `showReasoning?` | `boolean` | — | Show reasoning process |
| `verify?` | `boolean` | — | Add verification step |
| `selfCritique?` | `boolean` | — | Add self-critique step |
| `extend?` | `boolean` | — | Extend preset steps |
| `numbered?` | `boolean` | — | Number the steps |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

### Step

Individual step in a reasoning chain.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `number?` | `number` | — | Step number |

### ChainOfThought

Wraps content with chain-of-thought reasoning instructions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `style?` | `'step-by-step' \| 'think-aloud' \| 'structured' \| 'minimal'` | — | Reasoning style |
| `showReasoning?` | `boolean` | — | Show reasoning process |
| `delimiter?` | `'xml' \| 'markdown' \| 'none'` | `'xml'` | Delimiter style |

---

## Post-Execution Components

Components that register actions to perform after the LLM response.

### PostExecution

Container for post-execution actions. Children should be `<ReviewFile>`, `<OpenUrl>`, or `<RunCommand>`.

No specific props.

### ReviewFile (post-execution)

Register a file for review after prompt execution.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `file` | `string` | — | File path (required) |
| `editor?` | `string` | — | Editor to open the file in |

### OpenUrl

Open a URL in a browser after prompt execution.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | — | URL to open (required) |
| `browser?` | `string` | — | Preferred browser |

### RunCommand

Execute a shell command after prompt execution.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `command` | `string` | — | Command to execute (required) |
| `cwd?` | `string` | — | Working directory |
| `env?` | `Record<string, string>` | — | Environment variables |

---

## Utility Components

Components that inject runtime values.

### UUID

Generates a random v4 UUID. No props.

### Timestamp

Outputs the current Unix timestamp (seconds). No props.

### DateTime

Outputs the current date/time.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `format?` | `string` | — | Format string: `YYYY`, `MM`, `DD`, `HH`, `mm`, `ss`. Defaults to ISO 8601. |

### Hostname

Outputs the current machine hostname. No props.

### Username

Outputs the current system username. No props.

### Cwd

Outputs the current working directory. No props.

---

## Meta Components

### Uses

Declares dependencies on external components. Transformed into import statements by the Babel plugin at compile time.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `component?` | `string` | — | Named export(s) to import (comma-separated for multiple) |
| `default?` | `string` | — | Import the default export with this name |
| `as?` | `string` | — | Alias for the imported component (single component only) |
| `from` | `string` | — | Module specifier: npm package, URL, or local path (required) |

```xml
<Uses component="CustomCard" from="my-components" />
<Uses component="A, B, C" from="my-components" />
<Uses default="Layout" from="./layout" />
<Uses component="Card" as="MyCard" from="my-components" />
```

---

## Preset Reference

### Role Presets

Used with `<Role preset="...">`.

| Key | Title | Expertise | Style |
|-----|-------|-----------|-------|
| `assistant` | Assistant | general help | friendly |
| `support` | Support Agent | customer support | friendly |
| `advisor` | Advisor | expert advice | professional |
| `guide` | Guide | navigation, explanation | friendly |
| `concierge` | Concierge | personalized service | friendly |
| `engineer` | Software Engineer | software development, programming, system design | professional |
| `developer` | Software Developer | application development | professional |
| `architect` | Software Architect | system design | professional |
| `devops` | DevOps Engineer | CI/CD, infrastructure | professional |
| `security` | Security Specialist | cybersecurity | professional |
| `data-scientist` | Data Scientist | analytics, ML | professional |
| `frontend` | Frontend Developer | UI development | professional |
| `backend` | Backend Developer | server-side development | professional |
| `qa-engineer` | QA Engineer | testing, quality | professional |
| `writer` | Writer | content creation, storytelling, communication | professional |
| `copywriter` | Copywriter | marketing copy | professional |
| `editor` | Editor | content editing | professional |
| `journalist` | Journalist | news, reporting | professional |
| `analyst` | Business Analyst | analysis, requirements | professional |
| `consultant` | Consultant | advisory | professional |
| `marketer` | Marketing Specialist | marketing strategy | professional |
| `pm` | Product Manager | product strategy | professional |
| `strategist` | Strategist | business strategy | professional |
| `teacher` | Teacher | education | friendly |
| `tutor` | Tutor | one-on-one instruction | friendly |
| `mentor` | Mentor | guidance | friendly |
| `coach` | Coach | performance coaching | friendly |
| `professor` | Professor | academic expertise | academic |
| `legal` | Legal Expert | law, compliance | professional |
| `medical` | Medical Professional | healthcare | professional |
| `designer` | Designer | design | professional |
| `scientist` | Scientist | scientific research | academic |
| `translator` | Translator | language translation | professional |

### Task Presets

Used with `<Task preset="...">`.

| Key | Type | Default Format |
|-----|------|----------------|
| `summarize` | transformation | text |
| `code-review` | analysis | markdown |
| `translate` | transformation | text |
| `explain` | analysis | text |
| `generate-code` | coding | code |
| `debug` | coding | code |
| `refactor` | coding | code |
| `classify` | classification | json |
| `extract` | extraction | json |
| `plan` | planning | markdown |

### Constraint Presets

Used with `<Constraint preset="...">`.

| Key | Level | Text |
|-----|-------|------|
| `be-concise` | should | Keep responses concise and focused |
| `cite-sources` | must | Cite sources for factual claims |
| `no-opinions` | must-not | Do not include personal opinions |
| `acknowledge-uncertainty` | must | Acknowledge when you are uncertain or lack information |
| `professional-tone` | must | Maintain a professional and respectful tone |
| `no-hallucination` | must-not | Do not fabricate information or sources |
| `stay-on-topic` | must | Stay focused on the requested topic |
| `include-examples` | should | Include relevant examples where helpful |

### Steps Presets

Used with `<Steps preset="...">`.

| Key | Style | Phases |
|-----|-------|--------|
| `analysis` | structured | Understand, Analyze, Conclude |
| `problem-solving` | step-by-step | Define, Explore, Solve, Verify |
| `code-generation` | structured | Understand requirements, Design approach, Implement, Test |
| `debugging` | step-by-step | Reproduce, Isolate, Fix, Verify |
| `research` | structured | Define scope, Gather information, Analyze findings, Synthesize |

### Guardrail Presets

Used with `<Guardrails preset="...">`.

| Key | Content |
|-----|---------|
| `standard` | 4 guardrails: no harmful content, no system prompt leaks, no impersonation, acknowledge uncertainty |
| `strict` | 8 guardrails: all of standard + no deception, no dangerous instructions, refuse unethical requests, verify claims |
| `minimal` | 2 guardrails: no harmful content, acknowledge uncertainty |

### Edge Case Presets

Used with `<EdgeCases preset="...">`.

| Key | Content |
|-----|---------|
| `standard` | 3 cases: missing data, outside expertise, ambiguous input |
| `minimal` | 1 case: unclear input |

### Fallback Presets

Used with `<Fallbacks preset="...">`.

| Key | Content |
|-----|---------|
| `standard` | 3 fallbacks: unable to complete, missing info, encountering error |
