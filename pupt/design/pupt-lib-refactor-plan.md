# pupt-lib Refactoring Plan

## Executive Summary

This document outlines a comprehensive plan to refactor pupt (Powerful Universal Prompt Tool) to use pupt-lib as its underlying prompt rendering library. This is a major refactor that changes the template format from Handlebars to JSX and fundamentally alters how prompts are discovered, processed, and rendered.

> **Reference:** See the [pupt-lib design documentation](../../pupt-lib/design/docs/00-index.md) for complete API details.

### Key Changes

| Aspect | Current (pupt) | New (pupt-lib) | Design Reference |
|--------|----------------|----------------|------------------|
| Template Format | Markdown + Handlebars | JSX (`.tsx`/`.jsx` or `.prompt`) | [Simple Prompts](../../pupt-lib/design/docs/09-simple-prompt-format.md) |
| Metadata | YAML Frontmatter | `<Prompt>` props | [Components §Prompt](../../pupt-lib/design/docs/05-components.md#prompt-container-component) |
| Variables | `{{input name}}` helpers | `<Ask.Text name="..."/>` | [User Input](../../pupt-lib/design/docs/06-user-input.md) |
| Component System | Handlebars helpers | Class-based `extends Component` | [JSX Runtime §Component](../../pupt-lib/design/docs/04-jsx-runtime.md#component-interface) |
| Extensions | `Handlebars.registerHelper()` | `class extends Component` | [Workflows](../../pupt-lib/design/docs/10-workflows.md#module-author-workflow) |
| Library Discovery | Git clone | npm packages, URLs, local paths | [Module Loading](../../pupt-lib/design/docs/08-module-loading.md) |
| Input Collection | Async queue | `start()`/`current()`/`submit()`/`advance()` iterator | [User Input §Iterator](../../pupt-lib/design/docs/06-user-input.md#input-iterator-interface) |
| Render Output | String | `RenderResult { text, postExecution }` | [API §RenderResult](../../pupt-lib/design/docs/07-api.md#render) |
| Post-Execution | `reviewFile` input type | `<PostExecution>` component | [Components §PostExecution](../../pupt-lib/design/docs/05-components.md#post-execution-components) |
| Conditionals | Handlebars `{{#if}}` | JSX: `<If when={condition}>` | [Components §Control Flow](../../pupt-lib/design/docs/05-components.md#control-flow-components) |

---

## Part 1: Current pupt Architecture

### Core Components to Refactor

1. **TemplateEngine** (`src/template/template-engine.ts`)
   - 4-phase Handlebars processing pipeline
   - Manages TemplateContext for variable collection
   - Loads handlebars extensions from config
   - **Will be replaced by**: pupt-lib's `Pupt` class + `InputIterator`

2. **TemplateContext** (`src/template/template-context.ts`)
   - Stores collected variable values
   - Queues async input operations
   - Tracks variable types for masking
   - **Will be replaced by**: pupt-lib's `InputIterator.getValues()`

3. **Handlebars Helpers** (`src/template/helpers/`)
   - Input helpers: `input`, `select`, `multiselect`, `confirm`, `editor`, `password`, `file`, `reviewFile`
   - Static helpers: `date`, `time`, `datetime`, `timestamp`, `uuid`, `hostname`, `username`
   - **Will be replaced by**: pupt-lib's built-in components (see [Components](../../pupt-lib/design/docs/05-components.md))

4. **PromptManager** (`src/prompts/prompt-manager.ts`)
   - Discovers .md files in prompt directories
   - Parses YAML frontmatter with gray-matter
   - Extracts VariableDefinition from frontmatter
   - **Will be replaced by**: pupt-lib's `Pupt.getPrompts()`

5. **ConfigManager** (`src/config/config-manager.ts`)
   - Loads config from .pt-config.{json,yaml,js}
   - Expands paths with `~` and `${projectRoot}`
   - Handles version migrations
   - **Will be kept**: pupt-specific config, constructs `PuptConfig` for pupt-lib

6. **SearchEngine** (`src/search/search-engine.ts`)
   - MiniSearch-based fuzzy prompt search
   - **Will be replaced by**: pupt-lib's `SearchEngine` (see [Search](../../pupt-lib/design/docs/11-search.md))

### Components to Preserve

1. **CLI Layer** (`src/cli.ts`) - Keep command structure
2. **HistoryManager** (`src/history/`) - Adapt to new prompt structure
3. **OutputCaptureService** - Keep as-is
4. **AutoAnnotationService** - Keep as-is
5. **InteractiveSearch UI** (`src/ui/`) - Adapt to pupt-lib's search results
6. **FileSearchEngine** - Use pupt-lib's `FileSearchEngine` (replaces pupt's)

---

## Part 2: pupt-lib Integration Points

### 2.1 Prompt Discovery via Pupt Class

> **Reference:** [API §Pupt Class](../../pupt-lib/design/docs/07-api.md#pupt-class)

**Current pupt flow:**
```
ConfigManager.load() → promptDirs[]
PromptManager.discoverPrompts(promptDirs) → Prompt[]
```

**New pupt-lib flow using `Pupt` class:**
```typescript
import { Pupt } from "pupt-lib";

// Load pupt's file-based config
const config = await configManager.load();

// Construct pupt-lib config from pupt config
const pupt = new Pupt({
  modules: [
    ...(config.libraries ?? []),      // npm packages: ["@acme/prompts"]
    ...(config.promptDirs ?? []),     // local dirs: ["./prompts"]
  ],
  // Note: env is passed to render(), not constructor
});

// Initialize (loads modules, resolves dependencies, deduplicates)
await pupt.init();

// Get all prompts
const prompts = pupt.getPrompts();

// Search prompts
const results = pupt.searchPrompts("code review");

// Get by tag
const codePrompts = pupt.getPromptsByTag("code");
```

### 2.2 Input Collection with Explicit Control Flow

> **Reference:** [User Input §Iterator Interface](../../pupt-lib/design/docs/06-user-input.md#input-iterator-interface)

**Current pupt flow:**
```
TemplateEngine.processTemplate(template)
  → Phase 2: Queue async operations for each helper
  → Phase 3: processAsyncOperations() - sequential Inquirer prompts
  → Return fully rendered string
```

**New pupt-lib flow using `start()`/`current()`/`submit()`/`advance()` pattern:**

```typescript
import { createInputIterator, type InputRequirement, type ValidationResult } from "pupt-lib";

const iterator = createInputIterator(element, { validateOnSubmit: true });
iterator.start();

while (!iterator.isDone()) {
  const req = iterator.current();
  if (!req) break;

  let result: ValidationResult;

  // Retry loop for validation
  do {
    const answer = await askUser(req, result?.errors?.[0]?.message);
    result = await iterator.submit(answer);  // Async validation
  } while (!result.valid);

  iterator.advance();  // Move to next question (re-collects requirements for conditionals)
}

const values = iterator.getValues();
```

**Why this pattern?** (from [Design Decisions §Input Validation](../../pupt-lib/design/docs/02-design-decisions.md#input-validation))
- `current()` returns the same object until `advance()` - UI knows it's the same question during validation retry
- Validation is async - supports file existence checks, network calls, etc.
- Conditionals only see valid data - `advance()` re-collects requirements with new values

**Alternative: Using DiscoveredPrompt's convenience method**

```typescript
// Get iterator from discovered prompt
const prompt = pupt.getPrompt("my-prompt");
const iterator = prompt.getInputIterator();
iterator.start();
// ... same pattern as above
```

**Pre-supplied values:**
```typescript
// Collect inputs, then render with values
const values = iterator.getValues();

// Add any pre-supplied values
values.set("projectName", "my-project");

// Render with all values
const result = prompt.render({ inputs: values });
```

### 2.3 Render Result and PostExecution

> **Reference:** [API §RenderResult](../../pupt-lib/design/docs/07-api.md#render), [Components §PostExecution](../../pupt-lib/design/docs/05-components.md#post-execution-components)

pupt-lib's `render()` returns a structured result:

```typescript
interface RenderResult {
  /** The rendered prompt text */
  text: string;

  /** Optional metadata about rendering */
  metadata?: RenderMetadata;

  /** Actions to perform after prompt execution */
  postExecution: PostExecutionAction[];
}

type PostExecutionAction =
  | { type: "reviewFile"; file: string }
  | { type: "openUrl"; url: string }
  | { type: "runCommand"; command: string };
```

**Integration in pupt:**
```typescript
// Render the prompt
const result = prompt.render({ inputs, env });

// Send prompt text to LLM
await executeTool(result.text);

// Handle post-execution actions
for (const action of result.postExecution) {
  switch (action.type) {
    case "reviewFile":
      await openInEditor(action.file);
      break;
    case "openUrl":
      await openBrowser(action.url);
      break;
    case "runCommand":
      await exec(action.command);
      break;
  }
}
```

### 2.4 Search System

> **Reference:** [Search](../../pupt-lib/design/docs/11-search.md)

**Remove pupt's SearchEngine** - use pupt-lib's instead:

```typescript
// Via Pupt class (recommended)
const results = pupt.searchPrompts("code review", { limit: 10 });
const codePrompts = pupt.getPromptsByTag("security");
const allTags = pupt.getTags();

// Or standalone
import { createSearchEngine } from "pupt-lib";

const search = createSearchEngine({
  weights: { name: 2.0, description: 1.5, tags: 1.0, content: 0.5 },
  fuzzy: true,
});

search.index(prompts);
const results = search.search("review");
```

**Content Search:** To search prompt content (not just metadata), pupt can render prompts with empty/default inputs and index the resulting text:

```typescript
function getSearchableContent(prompt: DiscoveredPrompt): string {
  try {
    const result = prompt.render({ inputs: {} });
    return result.text;
  } catch {
    return "";  // Prompts with required inputs won't render
  }
}
```

### 2.5 History Tracking

**Current:** Stores `templatePath`, `templateContent`, `variables`, `finalPrompt`

**Adaptations needed:**
```typescript
interface EnhancedHistoryEntry {
  // Changed fields
  promptId: string;           // e.g., "@acme/prompts:code-review"
  promptSource: string;       // e.g., "@acme/prompts" or "./prompts"
  promptFilePath?: string;    // File path if local

  // Keep these
  variables: Record<string, unknown>;
  finalPrompt: string;

  // Remove (no longer relevant)
  // templateContent: string;  // Can't serialize JSX

  // New
  promptVersion?: string;     // From <Prompt version="...">
  promptTags?: string[];      // From <Prompt tags={[...]}>
}
```

### 2.6 Environment Context

> **Reference:** [JSX Runtime §Environment Context](../../pupt-lib/design/docs/04-jsx-runtime.md#environment-context)

pupt-lib uses `EnvironmentContext` for LLM-specific output optimization:

```typescript
import { createEnvironment, DEFAULT_ENVIRONMENT } from "pupt-lib";

// Create environment with custom settings
const env = createEnvironment({
  llm: { model: "claude-3-sonnet", provider: "anthropic" },
  output: { format: "xml", trim: true, indent: "  " },
  code: { language: "typescript" },
});

// Or use defaults and override specific values
const env = createEnvironment({
  llm: { ...DEFAULT_ENVIRONMENT.llm, model: "gpt-4" },
  output: { ...DEFAULT_ENVIRONMENT.output, format: "markdown" },
});

// Render with environment
const result = prompt.render({ inputs: values, env });
```

### 2.7 Prompt Format Support

> **Reference:** [Simple Prompt Format](../../pupt-lib/design/docs/09-simple-prompt-format.md)

pupt-lib supports JSX in two variants:

| Variant | Extension | How It Works |
|---------|-----------|--------------|
| **Build-time JSX** | `.tsx`, `.jsx` | Pre-compiled, imported as modules |
| **Runtime JSX** | `.prompt` | Loaded via `createPromptFromSource()` |

Both are JSX - `.prompt` files are read as text and transformed at runtime:

```typescript
import { createPromptFromSource } from "pupt-lib";

// Read .prompt file and parse at runtime
const source = await fs.readFile("./prompts/support.prompt", "utf-8");
const element = await createPromptFromSource(source, "support.prompt");
```

**pupt should support both JSX variants plus legacy Handlebars:**
```typescript
function detectPromptFormat(filePath: string): "handlebars" | "jsx" | "jsx-runtime" {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) {
    return "jsx";  // Import as module
  }
  if (filePath.endsWith(".prompt")) {
    return "jsx-runtime";  // Use createPromptFromSource()
  }
  return "handlebars";  // Legacy Handlebars
}
```

---

## Part 3: Configuration Separation

### pupt Config (CLI-specific, file-based)

**Purpose:** CLI behavior and user preferences

```json
{
  "version": "5.0.0",
  "promptDirs": ["./prompts", "~/my-prompts"],
  "libraries": ["@company/prompts"],
  "historyDir": "~/.pt-history",
  "defaultCmd": "claude",
  "defaultCmdArgs": ["--print"],
  "targetLlm": "claude",
  "outputCapture": { "enabled": true },
  "autoAnnotate": { "enabled": true }
}
```

### pupt-lib Config (programmatic)

> **Reference:** [API §Pupt Configuration](../../pupt-lib/design/docs/07-api.md#pupt-configuration)

**Purpose:** Library loading and rendering

```typescript
interface PuptConfig {
  modules?: string[];                    // npm, URL, git, local paths
  prompts?: string[];                    // glob patterns for .prompt files
  env?: Partial<EnvironmentContext>;     // LLM/output settings
}
```

### How They Work Together

```typescript
// pupt reads its file-based config
const config = await configManager.load();

// Constructs pupt-lib config from pupt config
const pupt = new Pupt({
  modules: [
    ...(config.libraries ?? []),
    ...(config.promptDirs ?? []),
  ],
});

// env is passed when rendering
const env = createEnvironment({
  llm: { model: config.targetLlm ?? "claude-3-sonnet", provider: "anthropic" },
});
const result = prompt.render({ inputs, env });
```

---

## Part 4: pupt-Specific Implementation Tasks

These tasks are pupt's responsibility and do not require changes to pupt-lib.

### 4.1 Handlebars → JSX Migration Tool

pupt will provide a migration tool to convert existing Handlebars prompts to JSX:

```typescript
// src/utils/migration.ts
export async function convertHandlebarsToJsx(
  handlebarsMarkdown: string,
  options?: {
    customHelperMapping?: Record<string, string>;
  }
): Promise<string>;
```

**Conversion rules:**

| Handlebars | JSX | Notes |
|------------|-----|-------|
| `{{input name "message"}}` | `<Ask.Text name="name" label="message"/>` | |
| `{{select name choices=[...]}}` | `<Ask.Select name="name" options={[...]}/>` | |
| `{{reviewFile name "message"}}` | `<Ask.ReviewFile name="name" label="message"/>` | Auto-adds PostExecution |
| `{{#if condition}}...{{/if}}` | `<If when={condition}>...</If>` | |
| `{{date}}` | `<DateTime/>` | Built-in component |
| `{{uuid}}` | `<UUID/>` | Built-in component |
| `{{hostname}}` | `<Hostname/>` | Built-in component |
| `{{username}}` | `<Username/>` | Built-in component |
| `{{#raw}}...{{/raw}}` | `{\`literal text\`}` | JSX doesn't process `{{}}` |
| YAML frontmatter | `<Prompt>` props | `title` → `name`, etc. |

### 4.2 Content Search Indexing

To enable searching prompt content (not just metadata):

```typescript
// Render with empty/default inputs for search indexing
function getSearchableContent(prompt: DiscoveredPrompt): string {
  try {
    const result = prompt.render({ inputs: {} });
    return result.text;
  } catch {
    return "";  // Prompts with required inputs won't render
  }
}
```

### 4.3 Input Adapter for Inquirer

> **Reference:** [User Input §InputRequirement](../../pupt-lib/design/docs/06-user-input.md#input-requirement-interface)

```typescript
// src/services/input-adapter.ts
import type { InputRequirement, ValidationResult } from "pupt-lib";
import { FileSearchEngine } from "pupt-lib";
import inquirer from "inquirer";

export async function askUser(
  req: InputRequirement,
  error?: string
): Promise<unknown> {
  // Show previous validation error
  if (error) {
    console.log(`Error: ${error}`);
  }

  switch (req.type) {
    case "text":
      return askText(req);
    case "editor":
      return askEditor(req);
    case "select":
      return askSelect(req);
    case "multiselect":
      return askMultiSelect(req);
    case "confirm":
      return askConfirm(req);
    case "secret":
      return askPassword(req);
    case "file":
    case "path":
      return askFile(req);
    case "number":
      return askNumber(req);
    case "date":
      return askDate(req);
    case "rating":
      return askRating(req);
    case "choice":
      return askChoice(req);
    default:
      throw new Error(`Unsupported input type: ${req.type}`);
  }
}

async function askFile(req: InputRequirement): Promise<string> {
  const fileSearch = new FileSearchEngine();

  const { answer } = await inquirer.prompt([{
    type: "autocomplete",
    name: "answer",
    message: req.label,
    source: async (_, input) => {
      const files = await fileSearch.search(input || "", {
        basePath: req.validation?.basePath,
      });
      return files.map(f => ({ name: f.display, value: f.path }));
    },
  }]);

  return answer;
}
```

---

## Part 5: Migration Strategy

### Phase 0: Preparation

1. **Create migration tool** (in pupt repo)
   - Parse Handlebars templates
   - Generate equivalent JSX or `.prompt` files
   - Handle frontmatter → `<Prompt>` props conversion

2. **Update pupt documentation**
   - Announce migration path
   - Provide side-by-side examples
   - Document breaking changes

### Phase 1: Add pupt-lib Support (Non-Breaking)

**Goal:** Support all prompt formats simultaneously:
- **Handlebars** (`.md`) - Legacy format, will be deprecated
- **JSX** (`.tsx`/`.jsx`) - Build-time compilation, imported as modules
- **JSX** (`.prompt`) - Runtime parsing via `createPromptFromSource()`

1. **Add pupt-lib dependency**
   ```bash
   npm install pupt-lib
   ```

2. **Update config schema**
   ```typescript
   interface Config {
     // Existing
     promptDirs?: string[];

     // New
     libraries?: string[];  // npm packages
     targetLlm?: string;    // "claude" | "gpt" | "gemini"
   }
   ```

3. **Create prompt format detection**
   ```typescript
   function detectPromptFormat(filePath: string): "handlebars" | "jsx" | "jsx-runtime" {
     // Build-time JSX - import as module
     if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) return "jsx";
     // Runtime JSX - use createPromptFromSource()
     if (filePath.endsWith(".prompt")) return "jsx-runtime";
     // Legacy Handlebars
     return "handlebars";
   }
   ```

4. **Create unified PromptService**
   ```typescript
   class UnifiedPromptService {
     private pupt: Pupt;
     private handlebarsManager: PromptManager;  // Legacy

     async discover(): Promise<UnifiedPrompt[]> {
       // Combine pupt-lib prompts with legacy Handlebars
     }

     async render(prompt: UnifiedPrompt, values: Record<string, unknown>): Promise<RenderResult> {
       if (prompt.format === "jsx" || prompt.format === "simple") {
         return prompt.puptLibPrompt.render({ inputs: values });
       } else {
         // Wrap Handlebars output in RenderResult format
         const text = await this.templateEngine.processTemplate(prompt.content, prompt);
         return { text, postExecution: [] };
       }
     }
   }
   ```

### Phase 2: Feature Parity

1. **Remove pupt's SearchEngine** - use pupt-lib's
2. **Use pupt-lib's FileSearchEngine** - replace pupt's implementation
3. **Adapt InteractiveSearch** - use `Pupt.searchPrompts()`
4. **Update history format** - support both old and new formats
5. **Implement PostExecution handling** - reviewFile, openUrl, runCommand

### Phase 3: Deprecate Handlebars (Breaking)

1. **Remove Handlebars processing**
   - Delete `src/template/` directory
   - Delete `src/prompts/` directory
   - Remove handlebars, gray-matter dependencies

2. **Remove legacy config options**
   - Remove `handlebarsExtensions`
   - Simplify config schema

3. **Update install command**
   - Change from git clone to npm install
   - Update `pt install` to work with npm packages

### Phase 4: Cleanup

1. **Remove deprecated code**
2. **Update all tests**
3. **Update documentation**
4. **Bump major version**

---

## Part 6: Implementation Details

### 6.1 New File Structure

```
pupt/src/
├── cli.ts                          # Keep, update imports
├── commands/
│   ├── init.ts                     # Update for new config format
│   ├── run.ts                      # Major refactor for pupt-lib
│   ├── add.ts                      # Update for JSX/.prompt prompts
│   ├── edit.ts                     # Update for JSX/.prompt prompts
│   ├── install.ts                  # Change to npm install flow
│   ├── list.ts                     # Use Pupt.getPrompts()
│   ├── history.ts                  # Adapt to new history format
│   ├── annotate.ts                 # Minimal changes
│   ├── review.ts                   # Minimal changes
│   └── help.ts                     # Minimal changes
├── config/
│   ├── config-manager.ts           # Add pupt-lib options
│   └── migration.ts                # Add migration for new config version
├── prompts/                        # REMOVE in Phase 3
│   └── ... (Handlebars support)
├── template/                       # REMOVE in Phase 3
│   └── ... (Handlebars engine)
├── services/
│   ├── prompt-service.ts           # Refactor to use Pupt class
│   ├── input-adapter.ts            # NEW: askUser implementation
│   ├── post-execution-handler.ts   # NEW: Handle PostExecution actions
│   ├── output-capture-service.ts   # Keep as-is
│   ├── auto-annotation-service.ts  # Keep as-is
│   └── review-data-builder.ts      # Adapt to new prompt structure
├── search/                         # REMOVE SearchEngine in Phase 2
│   ├── search-engine.ts            # DELETE - use pupt-lib's
│   └── file-search-engine.ts       # DELETE - use pupt-lib's
├── ui/
│   └── interactive-search.ts       # Adapt to Pupt.searchPrompts()
├── history/
│   ├── history-manager.ts          # Update history entry format
│   └── enhanced-history-manager.ts # Update for new structure
├── types/
│   ├── prompt.ts                   # Update to pupt-lib types
│   └── config.ts                   # Add new config options
├── schemas/
│   ├── prompt-schema.ts            # Update for JSX prompt metadata
│   └── config-schema.ts            # Add new config options
└── utils/
    ├── migration.ts                # NEW: Handlebars → JSX conversion
    └── ... (keep existing)
```

### 6.2 Key Type Changes

```typescript
// types/prompt.ts - updated
import type { DiscoveredPrompt, RenderResult } from "pupt-lib";

// Unified prompt interface for transition period
export interface UnifiedPrompt {
  // Common fields
  name: string;
  description?: string;
  tags: string[];
  source: string;
  filePath?: string;

  // Format-specific
  format: "handlebars" | "jsx" | "simple";

  // pupt-lib prompt (Phase 1+)
  puptLibPrompt?: DiscoveredPrompt;

  // Handlebars-specific (deprecated in Phase 3)
  content?: string;
  frontmatter?: Record<string, unknown>;
  variables?: VariableDefinition[];
}

// types/history.ts - updated
export interface HistoryEntry {
  // Changed fields
  promptId: string;           // e.g., "@acme/prompts:code-review"
  promptSource: string;       // npm package or local path
  promptVersion?: string;     // From <Prompt version="...">

  // Keep these
  timestamp: string;
  variables: Record<string, unknown>;
  finalPrompt: string;
  execution?: ExecutionInfo;
  environment?: EnvironmentInfo;
  annotations?: Annotation[];
}
```

### 6.3 Run Command Refactor

```typescript
// commands/run.ts - major refactor
import { Pupt, createEnvironment } from "pupt-lib";
import type { RenderResult, InputRequirement, ValidationResult } from "pupt-lib";
import { askUser } from "../services/input-adapter.js";
import { handlePostExecution } from "../services/post-execution-handler.js";

export async function runCommand(args: string[], options: RunOptions) {
  const config = await configManager.load();

  // Initialize pupt-lib
  const pupt = new Pupt({
    modules: [
      ...(config.libraries ?? []),
      ...(config.promptDirs ?? []),
    ],
  });

  await pupt.init();

  // Select prompt
  const selected = options.promptName
    ? pupt.getPrompt(options.promptName)
    : await interactiveSearch(pupt);

  if (!selected) {
    throw new Error(`Prompt not found: ${options.promptName}`);
  }

  // Collect inputs using iterator from discovered prompt
  const iterator = selected.getInputIterator();
  iterator.start();

  if (!options.noInteractive) {
    // Interactive: ask user for each input
    while (!iterator.isDone()) {
      const req = iterator.current();
      if (!req) break;

      // Skip if pre-supplied via --var flag
      if (options.varValues?.[req.name] !== undefined) {
        await iterator.submit(options.varValues[req.name]);
        iterator.advance();
        continue;
      }

      let result: ValidationResult;
      do {
        const answer = await askUser(req, result?.errors?.[0]?.message);
        result = await iterator.submit(answer);
      } while (!result.valid);

      iterator.advance();
    }
  }

  const inputs = iterator.getValues();

  // Add any remaining pre-supplied values
  if (options.varValues) {
    for (const [key, value] of Object.entries(options.varValues)) {
      if (!inputs.has(key)) {
        inputs.set(key, value);
      }
    }
  }

  // Create environment
  const env = createEnvironment({
    llm: { model: config.targetLlm ?? "claude-3-sonnet", provider: "anthropic" },
  });

  // Render
  const result: RenderResult = selected.render({ inputs, env });

  // Execute tool
  await executeTool(result.text, options);

  // Handle post-execution actions
  await handlePostExecution(result.postExecution, options);

  // Save history...
}
```

### 6.4 Post-Execution Handler

```typescript
// services/post-execution-handler.ts
import type { PostExecutionAction } from "pupt-lib";
import { exec } from "child_process";
import open from "open";

export async function handlePostExecution(
  actions: PostExecutionAction[],
  options: { isAutoRun?: boolean; noInteractive?: boolean }
): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case "reviewFile":
        if (!options.isAutoRun && !options.noInteractive) {
          await openInEditor(action.file);
        }
        break;

      case "openUrl":
        await open(action.url);
        break;

      case "runCommand":
        await execAsync(action.command);
        break;
    }
  }
}

async function openInEditor(filePath: string): Promise<void> {
  const editor = process.env.EDITOR || "code";
  await execAsync(`${editor} "${filePath}"`);
}
```

---

## Part 7: Known Gaps and Workarounds

Minor differences between pupt and pupt-lib that pupt must handle:

### 7.1 Regex Validation on Text Inputs

- **pupt**: Supports `validate: "^[a-z]+$"` regex pattern in frontmatter
- **pupt-lib**: `<Ask.Text>` doesn't expose a `pattern` prop (has `schema?: ZodSchema` internally)

**Workaround**: pupt's input adapter can validate regex patterns after `iterator.submit()`:
```typescript
async function askUser(req: InputRequirement): Promise<unknown> {
  const answer = await inquirerPrompt(req);

  // If migrated prompt had regex validation, check it here
  if (req.pattern && typeof answer === 'string') {
    if (!new RegExp(req.pattern).test(answer)) {
      throw new ValidationError(`Invalid format for ${req.name}`);
    }
  }

  return answer;
}
```

### 7.2 Automatic Sensitive Value Masking

- **pupt**: Auto-detects variable names containing "password", "key", "secret", "token"
- **pupt-lib**: Only `<Ask.Secret>` sets `masked: true`

**Workaround**: pupt keeps this logic in its history manager (unchanged):
```typescript
function shouldMask(name: string): boolean {
  const sensitivePatterns = ['password', 'key', 'secret', 'token', 'apiKey'];
  return sensitivePatterns.some(p => name.toLowerCase().includes(p));
}
```

### 7.3 Non-Interactive Mode

- **pupt**: `--no-input` flag uses defaults, errors if no default
- **pupt-lib**: InputIterator doesn't have explicit non-interactive flag

**Workaround**: pupt pre-populates values from defaults before iterating:
```typescript
if (options.noInteractive) {
  // Skip iterator, use defaults directly
  const defaults = getDefaultsFromPrompt(prompt);
  const result = prompt.render({ inputs: defaults, env });
}
```

---

## Part 8: Risk Assessment

### High Risk

1. **Breaking existing prompts**
   - Mitigation: Phase 1 supports all three formats (Handlebars, JSX, .prompt)
   - Mitigation: Provide migration tool
   - Mitigation: Clear documentation

2. **npm package installation complexity**
   - Mitigation: Provide `pt install` wrapper
   - Mitigation: Support local directories alongside packages

3. **History incompatibility**
   - Mitigation: Support reading old format
   - Mitigation: Migration script

### Medium Risk

1. **Performance regression**
   - JSX compilation vs Handlebars
   - Mitigation: Benchmark before/after
   - Mitigation: `.prompt` files have runtime parsing (no build step)

2. **Learning curve for users**
   - New JSX format
   - Mitigation: `.prompt` format for non-technical users
   - Mitigation: Example prompts

### Low Risk

1. **Test coverage**
   - Existing tests cover behavior
   - Mitigation: Update tests incrementally

2. **CI/CD changes**
   - Minimal changes needed
   - Mitigation: Test in staging first

---

## Part 9: Timeline Estimate

| Phase | Description | Relative Effort |
|-------|-------------|-----------------|
| Phase 0 | Migration tool + docs | Medium |
| Phase 1 | Add pupt-lib support (dual mode) | Large |
| Phase 2 | Feature parity | Medium |
| Phase 3 | Deprecate Handlebars | Medium |
| Phase 4 | Cleanup | Small |

**Dependencies:**
- Phase 0 can start immediately
- Phase 1 requires pupt-lib to be published
- Phase 2 can partially overlap with Phase 1
- Phase 3 requires user migration time (suggest 1-2 major versions)
- Phase 4 can be combined with Phase 3

---

## Appendix A: Example Prompt Conversion

pupt-lib uses JSX for prompts in two variants:

- **`.tsx`/`.jsx`** - Build-time compilation, full TypeScript support
- **`.prompt`** - Runtime-parsed JSX via `createPromptFromSource()`

### Before (Handlebars)

```markdown
---
title: Code Review
tags: [code, review]
summary: Review code for quality issues
variables:
  - name: language
    type: select
    message: "What language?"
    choices: ["TypeScript", "Python", "Go"]
  - name: code
    type: editor
    message: "Paste your code"
  - name: outputFile
    type: reviewFile
    message: "Where to save results?"
---

You are an expert {{language}} developer.

Review the following code:
```{{language}}
{{code}}
```

Save your review to {{outputFile}}.
```

### After (JSX - .tsx)

```tsx
export default (
  <Prompt
    name="code-review"
    version="1.0.0"
    description="Review code for quality issues"
    tags={["code", "review"]}
  >
    <Ask.Select
      name="language"
      label="What language?"
      options={[
        { value: "TypeScript", label: "TypeScript" },
        { value: "Python", label: "Python" },
        { value: "Go", label: "Go" },
      ]}
    />
    <Ask.Editor name="code" label="Paste your code" />
    <Ask.ReviewFile name="outputFile" label="Where to save results?" />

    <Role expertise="senior" domain={inputs.language}>
      You are an expert {inputs.language} developer.
    </Role>

    <Task>Review the following code:</Task>

    <Code language={inputs.language}>{inputs.code}</Code>

    <Constraint>Save your review to {inputs.outputFile}.</Constraint>
  </Prompt>
);
```

### After (JSX - .prompt, runtime parsed)

Same JSX syntax, parsed at runtime via `createPromptFromSource()`:

```jsx
<Prompt name="code-review" description="Review code for quality issues" tags={["code", "review"]}>
  <Ask.Select name="language" label="What language?">
    <Option value="TypeScript">TypeScript</Option>
    <Option value="Python">Python</Option>
    <Option value="Go">Go</Option>
  </Ask.Select>
  <Ask.Editor name="code" label="Paste your code" />
  <Ask.ReviewFile name="outputFile" label="Where to save results?" />

  <Role>You are an expert {inputs.language} developer.</Role>

  <Task>Review the following code:</Task>

  <Code language={inputs.language}>{inputs.code}</Code>

  <Constraint>Save your review to {inputs.outputFile}.</Constraint>
</Prompt>
```

Note: `<Ask.ReviewFile>` automatically adds a PostExecution action.

---

## Appendix B: Configuration Changes

### Current Config (v4.0.0)

```json
{
  "version": "4.0.0",
  "promptDirs": ["./prompts"],
  "historyDir": "~/.pt-history",
  "defaultCmd": "claude",
  "handlebarsExtensions": [
    { "type": "file", "path": "./helpers.js" }
  ],
  "outputCapture": { "enabled": true }
}
```

### New Config (v5.0.0)

```json
{
  "version": "5.0.0",
  "libraries": ["@company/prompts"],
  "promptDirs": ["./prompts"],
  "historyDir": "~/.pt-history",
  "defaultCmd": "claude",
  "targetLlm": "claude",
  "outputCapture": { "enabled": true }
}
```

**Migration:**
- `handlebarsExtensions` → removed (use pupt-lib's class-based components)
- Add `libraries` for npm packages
- Add `targetLlm` for environment context

---

## Appendix C: Design Document References

| Topic | Document |
|-------|----------|
| Overall Design | [00-index.md](../../pupt-lib/design/docs/00-index.md) |
| Design Decisions | [02-design-decisions.md](../../pupt-lib/design/docs/02-design-decisions.md) |
| Architecture | [03-architecture.md](../../pupt-lib/design/docs/03-architecture.md) |
| JSX Runtime | [04-jsx-runtime.md](../../pupt-lib/design/docs/04-jsx-runtime.md) |
| Components | [05-components.md](../../pupt-lib/design/docs/05-components.md) |
| User Input | [06-user-input.md](../../pupt-lib/design/docs/06-user-input.md) |
| API | [07-api.md](../../pupt-lib/design/docs/07-api.md) |
| Module Loading | [08-module-loading.md](../../pupt-lib/design/docs/08-module-loading.md) |
| Simple Prompts | [09-simple-prompt-format.md](../../pupt-lib/design/docs/09-simple-prompt-format.md) |
| Workflows | [10-workflows.md](../../pupt-lib/design/docs/10-workflows.md) |
| Search | [11-search.md](../../pupt-lib/design/docs/11-search.md) |
