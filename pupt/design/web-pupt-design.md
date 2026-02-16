# Feature Design: Browser-Compatible PUPT Library (pupt-lib)

## Overview
- **User Value**: Run PUPT prompts in browser environments (aiforge) with React-based UI for input collection, enabling a seamless prompt management experience across CLI and web interfaces.
- **Technical Value**: Clean separation of concerns enabling reuse across environments, proper API surface for programmatic access, foundation for future integrations (Electron, VS Code extensions, etc.).

## Requirements

### Primary Requirements
1. **Library Extraction**: Refactor PUPT so core functionality can be used as a library without Inquirer.js dependency
2. **Programmatic Input Collection**: Allow external callers to:
   - Discover what inputs/prompts are needed for a given prompt template
   - Provide input values programmatically after gathering them via custom UI
   - Receive the fully rendered prompt text
3. **Prompt Listing API**: Provide a way to list available prompts with their metadata
4. **CLI Compatibility**: Maintain full backward compatibility with current CLI behavior using Inquirer.js
5. **Future Package Separation**: Design with eventual `pupt-lib` npm package extraction in mind

### Secondary Requirements
- Proper TypeScript types for library consumers
- Comprehensive API documentation
- Testing strategy for both library core and CLI adapter

### Scope Clarifications
- **File System**: Assume Node.js filesystem access. Browser implementations (like aiforge) will handle their own file access via APIs - this is NOT part of pupt-lib.
- **Browser Code**: pupt-lib and pupt will contain NO browser-specific code. The library enables browser usage but doesn't implement it.
- **History**: History tracking remains in the CLI (pupt). Browser applications like aiforge will implement their own history if needed.
- **Package Name**: `pupt-lib`

## Current Architecture Analysis

### Library-Ready Components (No Changes Needed)
| Component | File | Notes |
|-----------|------|-------|
| ConfigManager | `src/config/config-manager.ts` | Pure config loading/validation |
| PromptManager | `src/prompts/prompt-manager.ts` | Pure file discovery/parsing |
| SearchEngine | `src/search/search-engine.ts` | MiniSearch wrapper |
| TemplateContext | `src/template/template-context.ts` | Pure value management |
| Static Helpers | `src/template/helpers/index.ts` | `date`, `time`, `uuid`, etc. |

### Components Requiring Abstraction
| Component | Issue | Solution |
|-----------|-------|----------|
| InteractiveSearch | Hardcoded Inquirer | Extract to `IPromptSelector` interface |
| Input Helpers | Hardcoded Inquirer | Extract to `IInputProvider` interface |
| File Search Prompt | Hardcoded Inquirer | Adapter pattern |
| Review File Prompt | Hardcoded Inquirer | Adapter pattern |
| CLI Commands | Scattered Inquirer imports | Centralize through UI abstraction |

### Coupling Points Identified
- **11 files** with direct `@inquirer/prompts` imports
- Input collection hardcoded in template helper closures
- No abstraction layer between template engine and UI framework

## Proposed Solution

### Option A: Interface Injection Pattern (Recommended)

Define interfaces for input collection and inject implementations at runtime.

**Pros:**
- Clean separation of concerns
- Easy to test with mock implementations
- Minimal changes to existing code flow
- Natural fit for dependency injection
- Browser code never sees Inquirer

**Cons:**
- Requires passing provider through multiple layers
- Slightly more complex initialization

### Option B: Event/Callback Pattern

Template engine emits events when input is needed, caller provides callbacks.

**Pros:**
- Very flexible
- Good for async UI flows
- Natural for React state management

**Cons:**
- More complex control flow
- Harder to reason about execution order
- Requires significant template engine changes

### Option C: Two-Phase Processing

First phase extracts required inputs, second phase renders with provided values.

**Pros:**
- Very explicit API
- Easy to understand
- Good for web forms (collect all inputs at once)

**Cons:**
- Doesn't support conditional inputs well (inputs that depend on previous answers)
- Major refactor to template processing
- Loses dynamic prompt capabilities

### Recommended Approach: Option A with Two-Phase Enhancement

Combine Option A's clean interfaces with a "dry-run" capability from Option C for web UIs that need to pre-render forms.

---

## Technical Architecture

### Core Interfaces

```typescript
// src/lib/interfaces/input-provider.ts

/**
 * Defines the contract for collecting user input.
 * Implementations: InquirerInputProvider (CLI), ReactInputProvider (web), MockInputProvider (testing)
 */
export interface IInputProvider {
  // Basic input types
  text(config: TextInputConfig): Promise<string>;
  select<T>(config: SelectInputConfig<T>): Promise<T>;
  multiSelect<T>(config: MultiSelectInputConfig<T>): Promise<T[]>;
  confirm(config: ConfirmInputConfig): Promise<boolean>;
  password(config: PasswordInputConfig): Promise<string>;
  editor(config: EditorInputConfig): Promise<string>;

  // File-based inputs
  fileSearch(config: FileSearchConfig): Promise<string>;
  reviewFile(config: ReviewFileConfig): Promise<string>;
}

export interface TextInputConfig {
  name: string;
  message: string;
  default?: string;
  validate?: (value: string) => boolean | string;
}

export interface SelectInputConfig<T> {
  name: string;
  message: string;
  choices: Array<{ value: T; label: string; description?: string }>;
  default?: T;
}

// ... additional config types
```

```typescript
// src/lib/interfaces/prompt-selector.ts

/**
 * Defines the contract for selecting a prompt from available options.
 */
export interface IPromptSelector {
  selectPrompt(prompts: Prompt[], searchQuery?: string): Promise<Prompt>;
}
```

### Library Core Structure

```
src/lib/
├── index.ts                    # Main library entry point
├── interfaces/
│   ├── input-provider.ts       # IInputProvider interface
│   ├── prompt-selector.ts      # IPromptSelector interface
│   └── index.ts                # Re-exports
├── core/
│   ├── pupt-core.ts            # Main library class (PuptLib)
│   ├── prompt-analyzer.ts      # Extract required inputs from prompt
│   └── template-processor.ts   # Process template with provided values
├── providers/
│   ├── inquirer-input-provider.ts    # Inquirer.js implementation
│   └── inquirer-prompt-selector.ts   # Inquirer.js implementation
└── types/
    └── index.ts                # Public type definitions
```

### Main Library API

```typescript
// src/lib/core/pupt-core.ts

export interface PuptLibOptions {
  promptDirs: string[];
  inputProvider?: IInputProvider;  // Optional for headless mode
  config?: Partial<Config>;
}

export interface PromptRequirements {
  promptId: string;
  title: string;
  description?: string;
  variables: VariableRequirement[];
  conditionalVariables?: ConditionalVariable[];  // Variables that depend on other values
}

export interface VariableRequirement {
  name: string;
  type: 'text' | 'select' | 'multiselect' | 'confirm' | 'password' | 'editor' | 'file' | 'reviewFile';
  message: string;
  required: boolean;
  default?: unknown;
  choices?: Array<{ value: unknown; label: string }>;  // For select types
  validation?: string;  // Validation pattern/description
}

export interface RenderResult {
  prompt: string;
  metadata: {
    promptId: string;
    variables: Record<string, unknown>;
    maskedVariables: string[];
    renderTime: number;
  };
}

export class PuptLib {
  constructor(options: PuptLibOptions);

  /**
   * List all available prompts
   */
  async listPrompts(): Promise<PromptSummary[]>;

  /**
   * Get detailed info about a specific prompt
   */
  async getPrompt(promptId: string): Promise<Prompt | null>;

  /**
   * Search prompts by query
   */
  async searchPrompts(query: string): Promise<PromptSummary[]>;

  /**
   * Analyze a prompt to determine what inputs are required.
   * Use this for "dry-run" mode to build a form UI.
   */
  async analyzePrompt(promptId: string): Promise<PromptRequirements>;

  /**
   * Render a prompt with provided variable values.
   * @param promptId - The prompt to render
   * @param variables - Pre-collected variable values
   */
  async renderPrompt(promptId: string, variables: Record<string, unknown>): Promise<RenderResult>;

  /**
   * Interactive mode: process prompt with input provider.
   * Requires inputProvider to be set in options.
   */
  async processPromptInteractive(promptId: string): Promise<RenderResult>;
}
```

### Usage Examples

#### Headless/Programmatic Usage (for aiforge or other integrations)

```typescript
import { PuptLib } from 'pupt-lib';

// Initialize without input provider for headless mode
const pupt = new PuptLib({
  promptDirs: ['/path/to/prompts'],
});

// 1. List available prompts
const prompts = await pupt.listPrompts();
// Returns: [{ id: 'code-review', title: 'Code Review', tags: ['review'] }, ...]

// 2. Analyze what inputs are needed for a specific prompt
const requirements = await pupt.analyzePrompt('code-review');
// Returns: { variables: [{ name: 'file', type: 'file', message: 'Select file to review' }, ...] }

// 3. Collect inputs via your own UI (React form, API, etc.)
const userInputs = { file: '/src/app.ts', reviewType: 'security' };

// 4. Render the final prompt with provided values
const result = await pupt.renderPrompt('code-review', userInputs);
console.log(result.prompt);  // Fully rendered prompt text
```

#### Interactive CLI Usage (backward compatible)

```typescript
import { PuptLib, InquirerInputProvider } from 'pupt-lib';

const pupt = new PuptLib({
  promptDirs: config.promptDirs,
  inputProvider: new InquirerInputProvider(),
});

// Interactive mode - uses Inquirer for input collection
const result = await pupt.processPromptInteractive('code-review');
```

### Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                      PUPT Library (pupt-lib)                │
├─────────────────────────────────────────────────────────────┤
│  Public API Layer                                           │
│  ├─ PuptLib (main class)                                   │
│  ├─ listPrompts(), searchPrompts()                         │
│  ├─ analyzePrompt() - extract required variables           │
│  └─ renderPrompt() - with pre-collected values             │
├─────────────────────────────────────────────────────────────┤
│  Core Components (refactored for injection)                 │
│  ├─ ConfigManager                                          │
│  ├─ PromptManager                                          │
│  ├─ TemplateEngine (accepts IInputProvider)                │
│  ├─ TemplateContext                                        │
│  └─ SearchEngine                                           │
├─────────────────────────────────────────────────────────────┤
│  Abstraction Interfaces                                     │
│  ├─ IInputProvider                                         │
│  └─ IPromptSelector                                        │
├─────────────────────────────────────────────────────────────┤
│  Inquirer Implementation (for CLI)                          │
│  ├─ InquirerInputProvider                                  │
│  └─ InquirerPromptSelector                                 │
└─────────────────────────────────────────────────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────┐      ┌─────────────────────────────┐
│   CLI Package       │      │   External Integrations      │
│   (pupt)            │      │   (aiforge, etc.)            │
├─────────────────────┤      ├─────────────────────────────┤
│ Uses pupt-lib with  │      │ Uses pupt-lib headless API   │
│ InquirerInputProvider│      │ Provides own UI for inputs   │
│ CLI commands         │      │ Calls renderPrompt() with    │
│ History management   │      │   collected values           │
└─────────────────────┘      └─────────────────────────────┘
```

### Data Model Changes

#### New Types

```typescript
// Prompt summary for listing
export interface PromptSummary {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  path: string;
  lastModified?: Date;
}

// Variable requirement for form generation
export interface VariableRequirement {
  name: string;
  type: InputType;
  message: string;
  required: boolean;
  default?: unknown;
  choices?: ChoiceOption[];
  validation?: ValidationRule;
  dependsOn?: string[];  // Other variables this depends on
}

// Conditional variable (shown based on other values)
export interface ConditionalVariable extends VariableRequirement {
  condition: {
    variable: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'matches';
    value: unknown;
  };
}
```

---

## Validation System

### Current State (Limitations)

Currently, validation in pupt is **always regex-based**:

```yaml
# Current: regex string only
variables:
  - name: componentName
    validate: "^[A-Z][a-zA-Z0-9]*$"
```

**Limitations:**
- Only regex patterns supported
- Error message hardcoded as `'Invalid format'`
- `required` field exists but isn't enforced
- No numeric validation (min/max)
- No length validation
- No built-in common patterns (email, URL, etc.)

### Proposed Validation Design

#### Frontmatter Schema (Backward Compatible)

```typescript
interface VariableDefinition {
  name: string;
  type: InputType;
  message?: string;
  default?: unknown;
  required?: boolean;          // Now enforced!

  // Validation - string (legacy) or object (new)
  validate?: string | ValidationConfig;

  // ...other fields
}

interface ValidationConfig {
  // String/regex validation
  pattern?: string;           // Regex pattern
  message?: string;           // Custom error message

  // Length validation (strings)
  minLength?: number;
  maxLength?: number;

  // Numeric validation (after parsing)
  min?: number;
  max?: number;

  // Common presets (shortcuts)
  preset?: ValidationPreset;
}

type ValidationPreset = 'email' | 'url' | 'semver' | 'uuid' | 'path' | 'slug';
```

#### Built-in Validation Presets

| Preset | Pattern | Use Case |
|--------|---------|----------|
| `email` | RFC 5322 compliant | Email addresses |
| `url` | Valid URL with protocol | Web URLs |
| `semver` | `v?X.Y.Z(-prerelease)?` | Version numbers |
| `uuid` | UUID v4 format | Identifiers |
| `path` | Valid file path chars | File paths |
| `slug` | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | URL slugs |

```typescript
const VALIDATION_PRESETS: Record<ValidationPreset, { pattern: string; message: string }> = {
  email: {
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
    message: 'Must be a valid email address',
  },
  url: {
    pattern: '^https?:\\/\\/[^\\s/$.?#].[^\\s]*$',
    message: 'Must be a valid URL',
  },
  semver: {
    pattern: '^v?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(-[a-zA-Z0-9.-]+)?(\\+[a-zA-Z0-9.-]+)?$',
    message: 'Must be a valid semantic version (e.g., 1.2.3)',
  },
  uuid: {
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    message: 'Must be a valid UUID',
  },
  path: {
    pattern: '^[^<>:"|?*\\x00-\\x1f]+$',
    message: 'Must be a valid file path',
  },
  slug: {
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    message: 'Must be a URL-friendly slug (lowercase, hyphens)',
  },
};
```

#### Example Usage in Frontmatter

```yaml
---
title: Create User
variables:
  - name: username
    type: input
    message: "Username:"
    required: true
    validate:
      minLength: 3
      maxLength: 20
      pattern: "^[a-z0-9_]+$"
      message: "3-20 chars: lowercase, numbers, underscores"

  - name: email
    type: input
    message: "Email:"
    required: true
    validate:
      preset: email

  - name: age
    type: input
    message: "Age:"
    validate:
      min: 13
      max: 120
      message: "Must be between 13 and 120"

  - name: website
    type: input
    message: "Website (optional):"
    validate:
      preset: url

  # Legacy format still works
  - name: legacyField
    type: input
    validate: "^[A-Z]+$"
---
```

### Validation Execution

#### When Validation Runs

| Mode | When | Who Validates |
|------|------|---------------|
| **Interactive** (`processPromptInteractive`) | After each input | Inquirer via `IInputProvider` |
| **Headless** (`renderPrompt`) | Before rendering | pupt-lib core |

#### Core Validation Function

```typescript
function validateValue(
  value: unknown,
  varDef: VariableDefinition
): { valid: boolean; error?: string } {
  const val = value as string | undefined;

  // 1. Required check
  if (varDef.required && (val === undefined || val === '')) {
    return { valid: false, error: `${varDef.name} is required` };
  }

  // Skip other validations if empty and not required
  if (val === undefined || val === '') {
    return { valid: true };
  }

  // 2. Parse validation config
  const config = typeof varDef.validate === 'string'
    ? { pattern: varDef.validate, message: 'Invalid format' }
    : varDef.validate ?? {};

  // 3. Apply preset if specified
  if (config.preset && VALIDATION_PRESETS[config.preset]) {
    const preset = VALIDATION_PRESETS[config.preset];
    config.pattern = config.pattern ?? preset.pattern;
    config.message = config.message ?? preset.message;
  }

  // 4. Length validation
  if (config.minLength !== undefined && val.length < config.minLength) {
    return {
      valid: false,
      error: config.message ?? `Must be at least ${config.minLength} characters`
    };
  }
  if (config.maxLength !== undefined && val.length > config.maxLength) {
    return {
      valid: false,
      error: config.message ?? `Must be at most ${config.maxLength} characters`
    };
  }

  // 5. Numeric validation
  if (config.min !== undefined || config.max !== undefined) {
    const num = Number(val);
    if (isNaN(num)) {
      return { valid: false, error: config.message ?? 'Must be a number' };
    }
    if (config.min !== undefined && num < config.min) {
      return { valid: false, error: config.message ?? `Must be at least ${config.min}` };
    }
    if (config.max !== undefined && num > config.max) {
      return { valid: false, error: config.message ?? `Must be at most ${config.max}` };
    }
  }

  // 6. Pattern validation
  if (config.pattern) {
    const regex = new RegExp(config.pattern);
    if (!regex.test(val)) {
      return { valid: false, error: config.message ?? 'Invalid format' };
    }
  }

  return { valid: true };
}
```

#### Headless Mode: `renderPrompt()` Validates

```typescript
async renderPrompt(
  promptId: string,
  variables: Record<string, unknown>,
  options?: { skipValidation?: boolean }
): Promise<RenderResult> {
  const prompt = await this.getPrompt(promptId);

  // Validate provided values (unless explicitly skipped)
  if (!options?.skipValidation) {
    const validation = this.validateVariables(prompt, variables);
    if (!validation.valid) {
      throw new ValidationError(validation.errors);
    }
  }

  // Proceed with rendering...
}
```

#### What `analyzePrompt()` Returns for Validation

```typescript
interface VariableRequirement {
  name: string;
  type: InputType;
  message: string;
  required: boolean;
  default?: unknown;

  // Full validation config for UI implementation
  validation?: {
    pattern?: string;
    message?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    preset?: string;
  };

  choices?: ChoiceOption[];
}
```

Browser implementations receive the full validation config and can:
1. Use HTML5 validation attributes (`required`, `pattern`, `minLength`, `maxLength`, `min`, `max`)
2. Implement custom validation matching pupt-lib's logic
3. Show appropriate error messages

### Validation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Prompt Frontmatter                          │
│  variables:                                                         │
│    - name: email                                                    │
│      validate:                                                      │
│        preset: email                                                │
│      required: true                                                 │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     pupt-lib analyzePrompt()                        │
│  Returns: { validation: { pattern: "...", message: "...",          │
│                           preset: "email" }, required: true }       │
└─────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
       ┌────────────────────────┐    ┌────────────────────────────────┐
       │   Interactive Mode     │    │      Headless Mode             │
       │   (CLI with Inquirer)  │    │      (renderPrompt)            │
       ├────────────────────────┤    ├────────────────────────────────┤
       │ InquirerInputProvider  │    │ pupt-lib validates internally  │
       │ builds validator func  │    │ before rendering               │
       │ Inquirer prompts user  │    │                                │
       │ Shows error if invalid │    │ Throws ValidationError if bad  │
       └────────────────────────┘    └────────────────────────────────┘
                                                   │
                                                   ▼
                                     ┌────────────────────────────────┐
                                     │     External Caller (aiforge)  │
                                     ├────────────────────────────────┤
                                     │ 1. Client validates via UI     │
                                     │ 2. Server validates on submit  │
                                     │ 3. Returns 400 if invalid      │
                                     └────────────────────────────────┘
```

### Why No Custom Functions?

| Consideration | Issue |
|---------------|-------|
| **Serialization** | Can't put functions in YAML/JSON |
| **Security** | Executing arbitrary code is dangerous |
| **Browser parity** | Browser can't run Node functions |
| **Complexity** | Hard to reason about |

If complex validation is needed, options are:
1. Use a Handlebars extension (custom helper with validation)
2. Validate in the consuming application
3. Request a new preset be added to pupt-lib

---

## Implementation Approach

### Phase 1: Create Abstraction Interfaces (Non-Breaking)
1. Define `IInputProvider` interface with all 8 input types
2. Define `IPromptSelector` interface
3. Define public types (`PromptSummary`, `VariableRequirement`, etc.)
4. Create `InquirerInputProvider` implementation
5. Create `InquirerPromptSelector` implementation
6. **No changes to existing code yet** - interfaces are additive

### Phase 2: Refactor Template Engine
1. Modify `TemplateEngine` to accept `IInputProvider` in constructor
2. Update helper registration to use injected provider instead of direct Inquirer imports
3. Add `analyzeTemplate()` method for extracting variable requirements
4. Keep backward compatibility by defaulting to `InquirerInputProvider` if none provided

### Phase 3: Create Library Entry Point
1. Create `src/lib/` directory structure
2. Implement `PuptLib` class wrapping existing components
3. Implement `analyzePrompt()` using new template analysis
4. Implement `renderPrompt()` for headless rendering
5. Re-export public interfaces and types

### Phase 4: Refactor CLI to Use Library
1. Update `cli.ts` to instantiate `PuptLib` with `InquirerInputProvider`
2. Update `run` command to use library API
3. Update `InteractiveSearch` to use `IPromptSelector`
4. Update other commands to use injected input provider

### Phase 5: Package Separation (Future)
1. Move `src/lib/` to separate `pupt-lib` package
2. Update pupt CLI to depend on `pupt-lib`
3. Publish `pupt-lib` to npm
4. Update aiforge to use published package

---

## Acceptance Criteria

### Library API
- [ ] `PuptLib` class can be instantiated without Inquirer dependency
- [ ] `listPrompts()` returns all available prompts with metadata
- [ ] `searchPrompts()` filters prompts by query string
- [ ] `analyzePrompt()` returns all required variables with types and options
- [ ] `renderPrompt()` produces correct output with provided variable values
- [ ] `processPromptInteractive()` works with injected `IInputProvider`

### Backward Compatibility
- [ ] All existing CLI commands work unchanged
- [ ] Existing prompt files work without modification
- [ ] Configuration files work without modification
- [ ] History tracking continues to work

### Programmatic Usage
- [ ] Library can be used without Inquirer.js dependency when providing values directly
- [ ] Clear documentation for programmatic (non-interactive) usage
- [ ] Example code for integrating with external UIs

### Validation
- [ ] Legacy string regex format still works
- [ ] New validation object format works (pattern, message, min/max, minLength/maxLength)
- [ ] Built-in presets work (email, url, semver, uuid, path, slug)
- [ ] `required` field is now enforced
- [ ] `renderPrompt()` validates by default and throws `ValidationError`
- [ ] `renderPrompt()` can skip validation with `{ skipValidation: true }`
- [ ] `analyzePrompt()` returns full validation config for UI implementation
- [ ] `InquirerInputProvider` correctly builds validators from config

### Testing
- [ ] Unit tests for all `IInputProvider` methods
- [ ] Unit tests for `PuptLib` API methods
- [ ] Unit tests for validation logic (all presets, all validation types)
- [ ] Integration tests for CLI using library
- [ ] Mock input provider for testing headless rendering

### Documentation
- [ ] TypeScript types are comprehensive and exported
- [ ] JSDoc comments on all public API methods
- [ ] README with usage examples for both CLI and library modes
- [ ] Migration guide for existing integrations

---

## Technical Considerations

### Performance
- **Impact**: Minimal - abstraction layer adds negligible overhead
- **Mitigation**: Interfaces use async/await consistently, no synchronous blocking

### Security
- **Sensitive Values**: Continue using `TemplateContext` masking for passwords/secrets
- **Input Validation**: Maintain existing validation, expose validation rules in `VariableRequirement`

### Compatibility
- **Node.js Versions**: Maintain current minimum (Node 18+)
- **TypeScript**: Maintain strict mode, export declaration files

### Testing Strategy
1. **Unit Tests**: Each interface implementation tested in isolation
2. **Integration Tests**: Full flow tests with mock providers
3. **CLI Regression Tests**: Ensure existing behavior unchanged
4. **Headless Mode Tests**: Verify `renderPrompt()` works correctly with pre-provided values

### File System
pupt-lib assumes Node.js filesystem access via `fs-extra`. Browser implementations must handle file access themselves (e.g., via server APIs). This is intentionally outside pupt-lib's scope.

---

## Risks and Mitigation

### Risk: Conditional Variables Complexity
Variables that depend on previous answers (e.g., "Select framework" → "Select framework-specific options") require careful handling in the two-phase analyze/render approach.

**Current Implementation**: PUPT currently handles conditionals via standard Handlebars `{{#if}}` blocks. The template engine processes inputs sequentially as it encounters them. When it hits a conditional block:
1. The condition is evaluated
2. If true, the inner content is processed (including any `{{input}}` helpers inside)
3. Inputs are collected one-by-one via the async operation queue

This works naturally in CLI because processing is sequential and interactive.

**Limitation for Form-Based UIs**: The `analyzePrompt()` method can only return "static" variables upfront - those defined in frontmatter or not inside conditionals. Variables inside `{{#if}}` blocks cannot be discovered without first knowing the condition values.

**Mitigation Options**:
1. **Frontmatter declaration**: Require prompts to declare all possible variables in frontmatter (including conditional ones) with their conditions
2. **Multiple analysis passes**: After initial values collected, re-analyze with those values to discover newly-visible conditional variables
3. **Incremental rendering**: Process partial values, return next required input, repeat until complete

**Recommendation**: Keep the current sequential behavior. For aiforge's form-based UI, if they need all variables upfront, prompt authors should declare all variables in frontmatter. Document this as a best practice for web-compatible prompts.

### Risk: Breaking Changes During Refactor
Refactoring helper registration and template engine could introduce subtle bugs.

**Mitigation**:
- Comprehensive test coverage before refactoring
- Refactor incrementally with tests passing at each step
- Keep old code paths available behind feature flag initially

### Risk: Static Helpers with Node.js Dependencies
Some static helpers use Node.js APIs (e.g., `os.hostname()`, `os.userInfo()`).

**Mitigation**:
- Document which helpers require Node.js
- Consider making these optional or providing fallbacks for programmatic use
- Most prompts don't rely on these helpers

---

## Future Enhancements

### Near-term
1. **WebSocket Support**: Real-time prompt updates in browser
2. **Prompt Versioning**: Track prompt changes over time
3. **Shared Prompt Libraries**: npm packages of prompt collections

### Medium-term
1. **VS Code Extension**: Use pupt-lib for IDE integration
2. **Prompt Marketplace**: Share prompts between users/teams
3. **Analytics Dashboard**: Usage patterns visualization

### Long-term
1. **AI-Assisted Prompt Creation**: Generate prompts from descriptions
2. **Multi-Model Support**: Different renderers for different AI models
3. **Collaborative Editing**: Real-time prompt collaboration

---

## Resolved Questions

1. **File System**: ✅ Assume Node.js filesystem access. Browser implementations handle their own file access.

2. **Conditional Variables**: ✅ Keep current sequential behavior. `analyzePrompt()` returns only static/frontmatter variables. Document that web-compatible prompts should declare all variables in frontmatter.

3. **Config in Browser**: ✅ Not pupt-lib's concern. Browser apps like aiforge will handle configuration.

4. **Package Naming**: ✅ `pupt-lib`

5. **History**: ✅ History stays in pupt CLI. Browser apps implement their own.

6. **Validation in Headless Mode**: ✅ `renderPrompt()` validates by default, throws `ValidationError` if invalid. Can be skipped with `{ skipValidation: true }` option. See [Validation System](#validation-system) section.

## Open Questions

1. **Streaming Render**: For very long prompts, should `renderPrompt()` support streaming output? (Probably not needed initially)

---

## Implementation Estimate

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Create abstraction interfaces | 1-2 days |
| 2 | Refactor template engine | 2-3 days |
| 3 | Create library entry point | 2-3 days |
| 4 | Refactor CLI to use library | 2-3 days |
| 5 | Package separation (future) | 1-2 days |
| - | Testing & documentation | 3-4 days |
| **Total** | | **11-17 days** |

Note: Phases 1-4 are required for the initial aiforge integration. Phase 5 can be deferred until the API is stable.
