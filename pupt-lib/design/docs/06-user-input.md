# User Input Abstraction

[← Back to Index](00-index.md) | [Previous: Components](05-components.md) | [Next: API](07-api.md)

---

## Design Philosophy

pupt-lib is **UI-agnostic**. The library defines what inputs are needed and validates them, but does NOT render any UI. Higher-level programs (CLIs, web apps, mobile apps) handle the actual user interaction.

This enables:
- Same prompts work in CLI, web, mobile, or AI agent contexts
- UI framework choice is decoupled from prompt logic
- Input requirements can be serialized for remote collection

---

## Input Component Types

All user input components are namespaced under `Ask.*`:

| Component | Purpose | Example |
|-----------|---------|---------|
| `Ask.Text` | Single-line text input | Name, email, simple values |
| `Ask.Editor` | Multi-line text editor | Code, long descriptions |
| `Ask.Select` | Single choice from options | Framework selection |
| `Ask.MultiSelect` | Multiple choices | Features to enable |
| `Ask.Confirm` | Yes/no question | Confirmation dialogs |
| `Ask.File` | File path input | Config file location |
| `Ask.Path` | Directory path input | Output directory |
| `Ask.Number` | Numeric input | Count, percentage |
| `Ask.Date` | Date selection | Deadline, start date |
| `Ask.Secret` | Masked input | API keys, passwords |
| `Ask.Choice` | Binary choice with labels | Agree/Disagree |
| `Ask.Rating` | Numeric scale | Satisfaction (1-5) |
| `Ask.ReviewFile` | File + post-execution review | Generated file review |

---

## Option Child Elements

`Ask.Select` and `Ask.MultiSelect` support two syntaxes for defining options:

### Child Element Syntax (Simple)

For non-technical users, use `<Option>` children:

```tsx
<Ask.Select name="framework" label="Which framework?">
  <Option value="react" label="React (recommended)">React</Option>
  <Option value="vue" label="Vue.js">Vue</Option>
  <Option value="angular" label="Angular">Angular</Option>
</Ask.Select>
```

### Option Props

| Attribute | Purpose | Required |
|-----------|---------|----------|
| `value` | Internal value stored when selected | Yes |
| `label` | What the user sees during input collection (defaults to children text) | No |
| Children | Text rendered inline in the prompt (defaults to value) | No |

Example with all attributes:

```tsx
<Option value="high" label="High (urgent, needs immediate attention)">high priority</Option>
```

- **Internal value**: `"high"` (stored in `inputs.get("name")`)
- **User sees**: "High (urgent, needs immediate attention)"
- **Prompt renders**: "high priority"

### JS Attribute Syntax (Dynamic)

For dynamic data or power users, use the `options` prop:

```tsx
<Ask.Select
  name="framework"
  options={frameworks.map(f => ({
    value: f.id,
    label: f.displayName,
    text: f.name
  }))}
/>
```

### Combining Both

When both `options` prop and `<Option>` children are provided, they are merged (children first):

```tsx
<Ask.Select name="choice" options={dynamicOptions}>
  <Option value="custom">Custom Option</Option>
  {/* dynamicOptions are appended after */}
</Ask.Select>
```

---

## Input Requirement Interface

When inputs are collected, each `Ask.*` component produces an `InputRequirement`:

```typescript
export interface InputRequirement {
  /** Unique identifier for this input */
  name: string;

  /** Input type for UI rendering hints */
  type: 'text' | 'editor' | 'select' | 'multiselect' | 'confirm' |
        'file' | 'path' | 'number' | 'date' | 'secret' | 'choice' | 'rating';

  /** Human-readable label */
  label: string;

  /** Optional description/help text */
  description?: string;

  /** Whether input is required */
  required: boolean;

  /** Default value */
  default?: unknown;

  /** Options for select/multiselect */
  options?: Array<{
    value: string;
    label: string;
    text?: string;  // Rendered text (defaults to label if not specified)
  }>;

  /** Validation rules */
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    mustExist?: boolean;        // File must exist
    mustBeDirectory?: boolean;  // Path must be directory
    validateHostname?: boolean; // Hostname must resolve
    validateUrl?: boolean;      // URL must be reachable
  };

  /** Custom validator name (registered at iterator creation) */
  validator?: string;

  /** Tree position (for grouping in UI) */
  path: string[];
  depth: number;
  section?: string;
}
```

### Tree Position Fields

The `path`, `depth`, and `section` fields help UIs organize and group inputs:

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string[]` | Array of parent component names from root to this input |
| `depth` | `number` | Nesting level (0 = top-level, 1 = inside one container, etc.) |
| `section` | `string?` | Name of the containing `<Section>` component, if any |

**Example tree traversal:**

```tsx
<Prompt>                           // path: [], depth: 0
  <Section name="user-info">       // path: ["Prompt"], depth: 1
    <Ask.Text name="name" />       // path: ["Prompt", "user-info"], depth: 2, section: "user-info"
    <If when={showEmail}>          // path: ["Prompt", "user-info"], depth: 2
      <Ask.Text name="email" />    // path: ["Prompt", "user-info", "Conditional"], depth: 3, section: "user-info"
    </If>
  </Section>
  <Ask.Text name="notes" />        // path: ["Prompt"], depth: 1, section: undefined
</Prompt>
```

**UI usage:** UIs can use these fields to:
- Group inputs by section (e.g., show "User Info" header before related inputs)
- Show breadcrumbs for nested inputs
- Indent or visually nest deeply-nested inputs

---

## Condition Input Access

When using `<If>` or other conditional components with collected inputs, you access input values using natural property syntax:

```tsx
// Natural property access - recommended
<If when={inputs.userType === "admin"}>
  <Ask.Text name="adminCode" label="Admin code" />
</If>

// Complex conditions work too
<If when={inputs.items?.length > 5 && inputs.userType === "admin"}>
  <Ask.Text name="specialCode" label="Special code" />
</If>
```

### How It Works

Internally, collected inputs are stored in a `Map<string, unknown>`. To enable natural property access (`inputs.userType` instead of `inputs.get("userType")`), the inputs are wrapped in a Proxy:

```typescript
function createInputsProxy(values: Map<string, unknown>): Record<string, unknown> {
  return new Proxy({} as Record<string, unknown>, {
    get(_, prop: string) {
      return values.get(prop);
    },
    has(_, prop: string) {
      return values.has(prop);
    },
    ownKeys() {
      return Array.from(values.keys());
    },
  });
}
```

### Why Proxy?

| Approach | Issue |
|----------|-------|
| Raw Map | `inputs.userType` returns `undefined` (Map has no `.userType` property) |
| `.get()` syntax | Verbose: `inputs.get("userType")` is easy to forget |
| Proxy wrapper | Natural syntax that translates to Map lookups internally |

Benefits:
- Natural syntax users expect (`inputs.userType`)
- No silent failures from undefined property access
- TypeScript can type the proxy appropriately
- Backwards compatible with `.get()` if preferred

---

## Input Iterator Interface

The `InputIterator` provides depth-first input collection with async validation.

### State Machine

The iterator has explicit states and transitions. Invalid transitions throw errors.

```
┌─────────────┐
│ NOT_STARTED │
└──────┬──────┘
       │ start()
       ▼
┌─────────────┐  advance() ┌──────┐
│  ITERATING  │───────────►│ DONE │
│ (has current)│            └──────┘
└──────┬──────┘
       │ submit() → valid
       ▼
┌─────────────┐
│  SUBMITTED  │
│(ready to    │
│ advance)    │
└─────────────┘
```

**Invalid Transitions (throw errors):**

| Method | Invalid When | Error |
|--------|--------------|-------|
| `current()` | `NOT_STARTED` | `"Iterator not started. Call start() first."` |
| `submit(value)` | `NOT_STARTED` | `"Iterator not started. Call start() first."` |
| `submit(value)` | `DONE` | `"Iterator is done. No current requirement."` |
| `advance()` | `NOT_STARTED` | `"Iterator not started. Call start() first."` |
| `advance()` | `ITERATING` (not submitted) | `"Current requirement not submitted. Call submit() first."` |
| `advance()` | `DONE` | `"Iterator is done. Nothing to advance."` |
| `start()` | Not `NOT_STARTED` | `"Iterator already started."` |

### Why Depth-First?

Prompts can have conditional questions that depend on previous answers:

```tsx
<Ask.Select name="userType" options={[...]} />
<If when={inputs.userType === "admin"}>
  <Ask.Text name="adminCode" />  {/* Only ask if admin */}
</If>
<Ask.Text name="email" />
```

**Depth-first ordering** ensures questions near each other in the tree are asked together:
- Generator asks: `name → adminCode → email`
- Multi-pass would ask: `name → email → adminCode` (disjointed)

### Interface

```typescript
export interface InputIterator {
  /**
   * Start iterating through inputs.
   * @returns First input requirement, or null if no inputs needed
   */
  start(element: PuptElement): Promise<InputRequirement | null>;

  /**
   * Get the current requirement.
   * Returns the SAME object until advance() is called.
   * This allows UIs to know they're showing the same question (for retry).
   */
  current(): InputRequirement | null;

  /**
   * Submit an answer for the current requirement.
   * Runs async validation (may check files, network, APIs, etc.).
   * Does NOT advance to the next requirement.
   *
   * Call repeatedly until valid, then call advance().
   */
  submit(value: unknown): Promise<ValidationResult>;

  /**
   * Advance to the next requirement after a valid submission.
   * Evaluates conditionals using all previously-stored valid answers.
   * Throws if current requirement hasn't been successfully submitted.
   */
  advance(): Promise<InputRequirement | null>;

  /**
   * Get all collected (validated) values.
   */
  getValues(): Map<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function createInputIterator(options?: InputIteratorOptions): InputIterator;
```

### Usage Pattern

```typescript
const iterator = createInputIterator(options);
let req = await iterator.start(element);

while (req) {
  let result: ValidationResult;

  do {
    const answer = await askUser(req, result?.error);
    result = await iterator.submit(answer);
  } while (!result.valid);

  req = await iterator.advance();
}

const values = iterator.getValues();
```

---

## Input Validation

Validation is **async** to support network calls, file system checks, and external APIs.

### Declarative Validation

Validation rules can be declared on `Ask.*` components:

```tsx
// Built-in validation props
<Ask.File name="config" mustExist />
<Ask.Path name="output" mustBeDirectory />
<Ask.Text name="email" pattern="^[^@]+@[^@]+$" />
<Ask.Number name="count" min={1} max={100} />
<Ask.Text name="name" minLength={2} maxLength={50} required />
```

### Custom Validators

Custom validators are registered at iterator creation:

```typescript
const iterator = createInputIterator({
  validators: {
    "server-reachable": async (value) => {
      const ok = await checkServer(value);
      return ok
        ? { valid: true }
        : { valid: false, error: "Server unreachable" };
    },
    "valid-api-key": async (value) => {
      const valid = await validateApiKey(value);
      return valid
        ? { valid: true }
        : { valid: false, error: "Invalid API key" };
    },
  },
});

// Used in prompt
<Ask.Text name="server" validator="server-reachable" />
<Ask.Secret name="apiKey" validator="valid-api-key" />
```

### Validation Execution

```typescript
private async validate(req: InputRequirement, value: unknown): Promise<ValidationResult> {
  // 1. Check required
  if (req.required && (value === undefined || value === null || value === "")) {
    return { valid: false, error: `${req.label} is required` };
  }

  // 2. Run declarative validations
  if (req.validation) {
    const v = req.validation;

    if (v.pattern && typeof value === "string") {
      if (!new RegExp(v.pattern).test(value)) {
        return { valid: false, error: `Does not match required pattern` };
      }
    }

    if (v.mustExist && typeof value === "string") {
      const exists = await this.checkFileExists(value);
      if (!exists) {
        return { valid: false, error: `File not found: ${value}` };
      }
    }

    // ... more validations
  }

  // 3. Run custom validator
  if (req.validator && this.validators[req.validator]) {
    return await this.validators[req.validator](value);
  }

  return { valid: true };
}
```

---

## Non-Interactive Mode

For automation, CI/CD, or scripting where user interaction isn't possible:

```typescript
// Non-interactive: use defaults, error if required question has no default
const iterator = createInputIterator({ nonInteractive: true });

// Pre-supply some values, ask user for the rest
const iterator = createInputIterator({
  values: {
    projectName: "my-project",
    framework: "react",
  },
});

// Combine: pre-supply values, use defaults for rest, error if still missing
const iterator = createInputIterator({
  values: { projectName: "my-project" },
  nonInteractive: true,
});
```

### onMissingDefault Strategy

When an input has no default and no pre-supplied value in non-interactive mode, you can control the behavior:

```typescript
// Default: throw error if required input has no default
const iterator = createInputIterator({
  nonInteractive: true,
  onMissingDefault: "error",  // Default behavior
});

// Skip inputs without defaults (use with caution)
const iterator = createInputIterator({
  nonInteractive: true,
  onMissingDefault: "skip",  // Skip inputs that can't be auto-filled
});
```

| Strategy | Behavior |
|----------|----------|
| `"error"` | Throw an error if a required input has no default (default) |
| `"skip"` | Skip inputs without defaults, leaving them undefined |

### Pre-Supplied Values

When values are pre-supplied, those questions are skipped entirely:

```typescript
// Prompt has: name, email, projectType
const iterator = createInputIterator({
  values: { name: "Alice", projectType: "web" },
});

let req = await iterator.start(element);
while (req) {
  console.log(req.name);  // Only prints "email" - others were pre-supplied
  await iterator.submit("alice@example.com");
  req = await iterator.advance();
}
```

---

## Input Collector (Convenience Wrapper)

A higher-level API that handles the iteration loop:

```typescript
export interface InputCollector {
  /**
   * Collect all inputs, calling the handler for each.
   * Handles retry loop on validation failure.
   */
  collectAll(
    element: PuptElement,
    onInput: (req: InputRequirement, error?: string) => Promise<unknown>
  ): Promise<Map<string, unknown>>;
}

export function createInputCollector(options?: InputIteratorOptions): InputCollector;
```

### Usage

```typescript
const collector = createInputCollector();

const values = await collector.collectAll(element, async (req, error) => {
  if (error) {
    console.log(`Error: ${error}`);
  }
  return await promptUser(req.label, req.type);
});
```

---

## Example Usage by Higher-Level Program

### CLI Example

```typescript
import { createInputIterator, createPrompt, render } from "pupt-lib";
import * as readline from "readline";

async function main() {
  const element = await createPrompt("./my-prompt.tsx");
  const iterator = createInputIterator();

  let req = await iterator.start(element);

  while (req) {
    let result;
    do {
      // Show error from previous attempt
      if (result?.error) {
        console.log(`Error: ${result.error}`);
      }

      // Collect input from user
      const answer = await askCli(req.label, req.type);
      result = await iterator.submit(answer);
    } while (!result.valid);

    req = await iterator.advance();
  }

  // Render with collected values
  const output = render(element, { inputs: iterator.getValues() });
  console.log(output.text);
}
```

### React/Web UI Example

```tsx
function PromptForm({ element }) {
  const [iterator] = useState(() => createInputIterator());
  const [currentReq, setCurrentReq] = useState(null);
  const [error, setError] = useState(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    iterator.start(element).then(setCurrentReq);
  }, [element]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await iterator.submit(value);

    if (result.valid) {
      setError(null);
      setValue("");
      const next = await iterator.advance();
      setCurrentReq(next);
    } else {
      // Same component, same key - just update error state
      setError(result.error);
    }
  };

  if (!currentReq) {
    return <div>All inputs collected!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* key stays the same during validation retry - component persists */}
      <InputField
        key={currentReq.name}
        requirement={currentReq}
        value={value}
        onChange={setValue}
        error={error}
      />
      <button type="submit">Next</button>
    </form>
  );
}
```

---

## Advanced: Manual Iterator Control

For custom UX like progress display or specialized retry handling:

```typescript
const iterator = createInputIterator();
let req = await iterator.start(element);
let totalAsked = 0;

while (req) {
  totalAsked++;
  console.log(`Question ${totalAsked}: ${req.label}`);

  let attempts = 0;
  let result;

  do {
    attempts++;
    if (attempts > 1) {
      console.log(`  Attempt ${attempts}: ${result.error}`);
    }

    const answer = await askUser(req);
    result = await iterator.submit(answer);
  } while (!result.valid && attempts < 3);

  if (!result.valid) {
    console.log("Too many failed attempts, using default");
    await iterator.submit(req.default);
  }

  req = await iterator.advance();
}
```

---

## Next Steps

- [Components](05-components.md) - See the `Ask.*` component definitions
- [API](07-api.md) - Learn about the public API
- [Workflows](10-workflows.md) - How to author prompts
