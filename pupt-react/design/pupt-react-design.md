# pupt-react Design Document

A headless React component library for using pupt-lib in web applications, with a demo website.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Development Tools & Scaffolding](#development-tools--scaffolding)
3. [Project Structure](#project-structure)
4. [Core Library Design](#core-library-design)
5. [Demo Website Design](#demo-website-design)
6. [CI/CD & Deployment](#cicd--deployment)
7. [Implementation Notes](#implementation-notes)

---

## Project Overview

### Purpose

pupt-react provides a reusable, headless React component for integrating pupt-lib into websites. It transforms JSX/prompt text into rendered prompt strings while handling user input collection through the Ask system.

### Key Features

- **Prompt Search**: Search for prompts using pupt-lib's search engine
- **Prompt Conversion**: Transform `.prompt` or `.tsx` format prompts to plain text
- **Ask Question Support**: Interactive UI for collecting user inputs required by prompts
- **Post-render Actions**: Support for post-execution actions (URLs, commands, file review)
- **Headless Architecture**: No required UI library - bring your own components
- **Demo Website**: Mantine-based demonstration site deployable to GitHub Pages

### Package Information

| Field | Value |
|-------|-------|
| Package Name | `pupt-react` |
| Repository | `github.com/apowers313/pupt-react` |
| License | MIT |
| Node Version | `>=20.0.0` |
| React Version | `>=18.0.0` |

---

## Development Tools & Scaffolding

All tools mirror the pupt-lib project for consistency.

### Build & Bundle

| Tool | Version | Purpose |
|------|---------|---------|
| **Vite** | ^6.0.0 | ES module bundler and dev server |
| **vite-plugin-dts** | ^4.5.0 | TypeScript declaration generation |
| **TypeScript** | ^5.7.0 | Type checking and compilation |

### Testing

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | ^3.0.0 | Unit and integration testing |
| **@vitest/browser** | ^3.0.0 | Browser-based testing |
| **@vitest/coverage-v8** | ^3.0.0 | Code coverage |
| **Playwright** | ^1.50.0 | Browser automation for tests |
| **@testing-library/react** | ^16.0.0 | React component testing |
| **jsdom** | ^26.0.0 | DOM environment for tests |

### Linting & Code Quality

| Tool | Version | Purpose |
|------|---------|---------|
| **ESLint** | ^9.19.0 | JavaScript/TypeScript linting |
| **typescript-eslint** | ^8.22.0 | TypeScript ESLint rules |
| **@stylistic/eslint-plugin** | ^2.13.0 | Code style enforcement |
| **eslint-plugin-react** | ^7.37.0 | React-specific lint rules |
| **eslint-plugin-react-hooks** | ^5.0.0 | React hooks lint rules |
| **Knip** | ^5.44.0 | Unused code detection |

### Git Hooks & Commits

| Tool | Version | Purpose |
|------|---------|---------|
| **Husky** | ^9.1.0 | Git hooks management |
| **Commitlint** | ^19.7.0 | Commit message validation |
| **@commitlint/cli** | ^19.7.0 | Commitlint CLI |
| **@commitlint/config-conventional** | ^19.7.0 | Conventional commit config |
| **Commitizen** | ^4.3.0 | Interactive commit interface |
| **cz-conventional-changelog** | ^3.3.0 | Commitizen adapter |

### Release & Publishing

| Tool | Version | Purpose |
|------|---------|---------|
| **semantic-release** | ^25.0.0 | Automated versioning and publishing |
| **@semantic-release/changelog** | ^6.0.0 | Changelog generation |
| **@semantic-release/git** | ^10.0.0 | Git commits for releases |
| **@semantic-release/github** | ^11.0.0 | GitHub release creation |
| **@semantic-release/npm** | ^12.0.0 | NPM publishing |
| **@semantic-release/commit-analyzer** | ^13.0.0 | Commit analysis |
| **@semantic-release/release-notes-generator** | ^14.0.0 | Release notes |
| **conventional-changelog-conventionalcommits** | ^9.1.0 | Changelog format |

### Runtime Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| **pupt-lib** | ^latest | Core prompt library |
| **react** | ^18.0.0 (peer) | React framework |
| **react-dom** | ^18.0.0 (peer) | React DOM rendering |

### Demo Website Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| **@mantine/core** | ^7.15.0 | UI component library |
| **@mantine/hooks** | ^7.15.0 | React hooks utilities |
| **@mantine/code-highlight** | ^7.15.0 | Code syntax highlighting |
| **@tabler/icons-react** | ^3.30.0 | Icon library |
| **@monaco-editor/react** | ^4.7.0 | Code editor component |

---

## Project Structure

```
pupt-react/
├── src/                              # Library source code
│   ├── index.ts                      # Main entry point
│   ├── components/                   # React components
│   │   ├── PuptProvider.tsx          # Context provider
│   │   ├── PromptEditor.tsx          # Headless prompt input component
│   │   ├── PromptRenderer.tsx        # Headless prompt output component
│   │   ├── AskHandler.tsx            # Headless Ask input handler
│   │   └── index.ts                  # Component exports
│   ├── hooks/                        # React hooks
│   │   ├── usePupt.ts                # Main pupt-lib hook
│   │   ├── usePromptSearch.ts        # Prompt search hook
│   │   ├── usePromptRender.ts        # Prompt rendering hook
│   │   ├── useAskIterator.ts         # Ask question iterator hook
│   │   ├── usePostActions.ts         # Post-render actions hook
│   │   └── index.ts                  # Hook exports
│   ├── context/                      # React context
│   │   ├── PuptContext.tsx           # Context definition
│   │   └── index.ts                  # Context exports
│   ├── types/                        # TypeScript types
│   │   ├── index.ts                  # Type exports
│   │   ├── components.ts             # Component prop types
│   │   ├── hooks.ts                  # Hook return types
│   │   └── context.ts                # Context types
│   └── utils/                        # Utility functions
│       ├── transform.ts              # Prompt transformation utilities
│       └── index.ts                  # Utility exports
│
├── demo/                             # Demo website
│   ├── src/                          # Demo source code
│   │   ├── main.tsx                  # Entry point
│   │   ├── App.tsx                   # Root component
│   │   ├── components/               # Demo UI components
│   │   │   ├── Layout.tsx            # Page layout
│   │   │   ├── PromptInput.tsx       # Left panel - prompt editor
│   │   │   ├── PromptOutput.tsx      # Right panel - rendered output
│   │   │   ├── AskInputs.tsx         # Ask question UI
│   │   │   ├── CopyButton.tsx        # Copy to clipboard
│   │   │   └── index.ts              # Component exports
│   │   ├── theme/                    # Mantine theme configuration
│   │   │   └── index.ts              # Theme exports
│   │   └── styles/                   # CSS/styles
│   │       └── global.css            # Global styles
│   ├── index.html                    # HTML entry point
│   └── vite.config.ts                # Vite config for demo
│
├── test/                             # Test files
│   ├── unit/                         # Unit tests
│   │   ├── hooks/                    # Hook tests
│   │   └── components/               # Component tests
│   ├── integration/                  # Integration tests
│   ├── browser/                      # Browser-specific tests
│   └── setup.ts                      # Test setup
│
├── .github/                          # GitHub configuration
│   └── workflows/                    # GitHub Actions
│       ├── ci.yml                    # CI pipeline
│       └── deploy.yml                # GitHub Pages deployment
│
├── .husky/                           # Git hooks
│   ├── commit-msg                    # Commitlint
│   ├── pre-push                      # Lint + test
│   └── prepare-commit-msg            # Commitizen
│
├── dist/                             # Built library output
├── coverage/                         # Coverage reports
├── design/                           # Design documents
│   └── pupt-react-design.md          # This file
│
├── package.json                      # Package manifest
├── tsconfig.json                     # TypeScript config (library)
├── tsconfig.demo.json                # TypeScript config (demo)
├── vite.config.ts                    # Vite config (library)
├── vitest.config.ts                  # Vitest configuration
├── eslint.config.mjs                 # ESLint configuration
├── commitlint.config.js              # Commitlint configuration
├── .releaserc                        # Semantic release config
├── knip.json                         # Knip configuration
├── README.md                         # Documentation
├── CHANGELOG.md                      # Version history
└── LICENSE                           # MIT license
```

---

## Core Library Design

### Architecture Overview

The library follows a headless component pattern, providing logic and state management without prescribing UI. Consumers can use the provided hooks and render props to build custom interfaces.

```
┌─────────────────────────────────────────────────────────────────┐
│                         PuptProvider                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                      PuptContext                             ││
│  │  - Pupt instance                                             ││
│  │  - Registry                                                  ││
│  │  - Transformer                                               ││
│  │  - Search engine                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│              ┌───────────────┼───────────────┐                   │
│              │               │               │                   │
│              ▼               ▼               ▼                   │
│     ┌────────────┐   ┌────────────┐   ┌────────────┐            │
│     │ usePupt    │   │usePrompt   │   │useAsk      │            │
│     │            │   │Render      │   │Iterator    │            │
│     └────────────┘   └────────────┘   └────────────┘            │
│              │               │               │                   │
│              └───────────────┼───────────────┘                   │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                           │
│                    │ Consumer UI     │                           │
│                    │ (Headless)      │                           │
│                    └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

### Context Provider

#### PuptProvider

The root provider that initializes pupt-lib and provides context to child components.

```tsx
interface PuptProviderProps {
  children: React.ReactNode;

  /** Custom component registry */
  registry?: ComponentRegistry;

  /** Custom scope for component resolution */
  scope?: Scope;

  /** Environment configuration */
  environment?: Partial<EnvironmentContext>;

  /** Initial prompts to index for search */
  prompts?: SearchablePrompt[];
}

function PuptProvider(props: PuptProviderProps): React.ReactElement;
```

#### PuptContext

```tsx
interface PuptContextValue {
  /** pupt-lib Pupt instance */
  pupt: Pupt | null;

  /** Component registry */
  registry: ComponentRegistry;

  /** JSX transformer */
  transformer: Transformer;

  /** Search engine (if prompts provided) */
  searchEngine: SearchEngine | null;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;
}
```

### Hooks

#### usePupt

Main hook for accessing the pupt-lib context.

```tsx
interface UsePuptReturn {
  /** pupt-lib instance */
  pupt: Pupt | null;

  /** Component registry */
  registry: ComponentRegistry;

  /** JSX transformer */
  transformer: Transformer;

  /** Loading state */
  isLoading: boolean;

  /** Error state */
  error: Error | null;
}

function usePupt(): UsePuptReturn;
```

#### usePromptSearch

Hook for searching prompts.

```tsx
interface UsePromptSearchOptions {
  /** Debounce delay in ms (default: 300) */
  debounce?: number;

  /** Maximum results (default: 10) */
  limit?: number;

  /** Minimum score threshold (default: 0.3) */
  threshold?: number;
}

interface UsePromptSearchReturn {
  /** Current search query */
  query: string;

  /** Update search query */
  setQuery: (query: string) => void;

  /** Search results */
  results: SearchResult[];

  /** Loading state */
  isSearching: boolean;

  /** Clear search */
  clear: () => void;
}

function usePromptSearch(options?: UsePromptSearchOptions): UsePromptSearchReturn;
```

#### usePromptRender

Hook for transforming and rendering prompts.

```tsx
type PromptSource =
  | { type: 'source'; value: string }      // Raw JSX/prompt text
  | { type: 'element'; value: PuptElement } // Pre-parsed element

interface UsePromptRenderOptions {
  /** Initial prompt source */
  source?: PromptSource;

  /** User inputs for Ask components */
  inputs?: Map<string, unknown>;

  /** Environment configuration */
  environment?: Partial<EnvironmentContext>;

  /** Auto-render on source/input change */
  autoRender?: boolean;
}

interface UsePromptRenderReturn {
  /** Current source */
  source: PromptSource | null;

  /** Set prompt source */
  setSource: (source: PromptSource) => void;

  /** Parsed PuptElement (null if not parsed) */
  element: PuptElement | null;

  /** Rendered text output */
  output: string | null;

  /** Render error */
  error: Error | null;

  /** Transformation in progress */
  isTransforming: boolean;

  /** Rendering in progress */
  isRendering: boolean;

  /** Combined loading state */
  isLoading: boolean;

  /** Input requirements from Ask components */
  inputRequirements: InputRequirement[];

  /** Post-execution actions */
  postActions: PostAction[];

  /** Manually trigger render */
  render: () => Promise<void>;

  /** Manually trigger transform only */
  transform: () => Promise<PuptElement | null>;
}

function usePromptRender(options?: UsePromptRenderOptions): UsePromptRenderReturn;
```

#### useAskIterator

Hook for iterating through Ask questions and collecting user input.

```tsx
interface UseAskIteratorOptions {
  /** PuptElement to extract inputs from */
  element: PuptElement | null;

  /** Callback when all inputs collected */
  onComplete?: (inputs: Map<string, unknown>) => void;

  /** Callback on validation error */
  onValidationError?: (error: ValidationResult) => void;
}

interface UseAskIteratorReturn {
  /** Current input requirement (null if done) */
  current: InputRequirement | null;

  /** Current index */
  currentIndex: number;

  /** Total number of inputs */
  totalInputs: number;

  /** Whether iteration is complete */
  isDone: boolean;

  /** Submit answer for current input */
  submit: (value: unknown) => Promise<ValidationResult>;

  /** Go to previous input */
  previous: () => void;

  /** Skip current input (if optional) */
  skip: () => void;

  /** Reset to beginning */
  reset: () => void;

  /** All collected inputs */
  inputs: Map<string, unknown>;

  /** Get value for specific input */
  getValue: (name: string) => unknown;

  /** Set value for specific input */
  setValue: (name: string, value: unknown) => Promise<ValidationResult>;

  /** Validation state for current input */
  validation: ValidationResult | null;

  /** All validation errors */
  errors: Map<string, ValidationResult>;
}

function useAskIterator(options: UseAskIteratorOptions): UseAskIteratorReturn;
```

#### usePostActions

Hook for handling post-execution actions.

```tsx
interface PostAction {
  type: 'openUrl' | 'runCommand' | 'reviewFile';
  payload: {
    url?: string;
    command?: string;
    filePath?: string;
    args?: string[];
  };
}

interface UsePostActionsOptions {
  /** Actions from render result */
  actions: PostAction[];

  /** Auto-execute safe actions (openUrl) */
  autoExecute?: boolean;

  /** Custom action handlers */
  handlers?: {
    openUrl?: (url: string) => void | Promise<void>;
    runCommand?: (cmd: string, args?: string[]) => void | Promise<void>;
    reviewFile?: (path: string) => void | Promise<void>;
  };
}

interface UsePostActionsReturn {
  /** Pending actions */
  pendingActions: PostAction[];

  /** Executed actions */
  executedActions: PostAction[];

  /** Execute specific action */
  execute: (action: PostAction) => Promise<void>;

  /** Execute all pending actions */
  executeAll: () => Promise<void>;

  /** Dismiss action without executing */
  dismiss: (action: PostAction) => void;

  /** Dismiss all pending actions */
  dismissAll: () => void;
}

function usePostActions(options: UsePostActionsOptions): UsePostActionsReturn;
```

### Headless Components

These components provide render prop patterns for maximum flexibility.

#### PromptEditor

Headless component for prompt input.

```tsx
interface PromptEditorRenderProps {
  /** Current source text */
  value: string;

  /** Update source text */
  onChange: (value: string) => void;

  /** Parsing error if any */
  error: Error | null;

  /** Currently transforming */
  isTransforming: boolean;

  /** Input element props for textarea/input */
  inputProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  };
}

interface PromptEditorProps {
  /** Initial value */
  defaultValue?: string;

  /** Controlled value */
  value?: string;

  /** Value change callback */
  onChange?: (value: string) => void;

  /** Debounce delay for transformation */
  debounce?: number;

  /** Render function */
  children: (props: PromptEditorRenderProps) => React.ReactNode;
}

function PromptEditor(props: PromptEditorProps): React.ReactElement;
```

#### PromptRenderer

Headless component for displaying rendered output.

```tsx
interface PromptRendererRenderProps {
  /** Rendered output text */
  output: string | null;

  /** Rendering error */
  error: Error | null;

  /** Currently rendering */
  isRendering: boolean;

  /** Input requirements that need values */
  pendingInputs: InputRequirement[];

  /** Whether all inputs are satisfied */
  isReady: boolean;

  /** Copy output to clipboard */
  copyToClipboard: () => Promise<void>;

  /** Clipboard copy state */
  isCopied: boolean;
}

interface PromptRendererProps {
  /** Source to render */
  source: string | PuptElement;

  /** User inputs */
  inputs?: Map<string, unknown>;

  /** Auto-render when inputs change */
  autoRender?: boolean;

  /** Render function */
  children: (props: PromptRendererRenderProps) => React.ReactNode;
}

function PromptRenderer(props: PromptRendererProps): React.ReactElement;
```

#### AskHandler

Headless component for handling Ask inputs.

```tsx
interface AskInputRenderProps {
  /** Input requirement definition */
  requirement: InputRequirement;

  /** Current value */
  value: unknown;

  /** Update value */
  onChange: (value: unknown) => void;

  /** Submit and validate */
  onSubmit: () => Promise<void>;

  /** Validation result */
  validation: ValidationResult | null;

  /** Whether this input has error */
  hasError: boolean;

  /** Error message if any */
  errorMessage: string | null;

  /** Common input props */
  inputProps: {
    id: string;
    name: string;
    required: boolean;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  };
}

interface AskHandlerRenderProps {
  /** All input requirements */
  requirements: InputRequirement[];

  /** Current input being filled */
  currentIndex: number;

  /** Current requirement */
  current: InputRequirement | null;

  /** Whether all inputs are filled */
  isComplete: boolean;

  /** Progress percentage (0-100) */
  progress: number;

  /** Render props for specific input */
  getInputProps: (name: string) => AskInputRenderProps;

  /** Go to next input */
  next: () => void;

  /** Go to previous input */
  previous: () => void;

  /** All collected values */
  values: Map<string, unknown>;
}

interface AskHandlerProps {
  /** Element containing Ask components */
  element: PuptElement;

  /** Initial values */
  initialValues?: Map<string, unknown>;

  /** Called when all inputs complete */
  onComplete?: (values: Map<string, unknown>) => void;

  /** Called on validation error */
  onError?: (error: ValidationResult) => void;

  /** Render function */
  children: (props: AskHandlerRenderProps) => React.ReactNode;
}

function AskHandler(props: AskHandlerProps): React.ReactElement;
```

### Ask Input Type Rendering Guide

The AskHandler provides `requirement.type` for consumers to render appropriate UI:

| Type | UI Component | Notes |
|------|--------------|-------|
| `string` | Text input | Use `placeholder` from requirement |
| `number` | Number input | Use `min`/`max` from requirement |
| `boolean` | Checkbox/Switch | From `Ask.Confirm` |
| `select` | Dropdown/Radio | Use `options` from requirement |
| `multiselect` | Checkbox group | Use `options`, value is array |
| `date` | Date picker | Use `minDate`/`maxDate` |
| `file` | File picker | Use `extensions`, `multiple` |
| `path` | Path input | Use `mustExist`, `mustBeDirectory` |
| `secret` | Password input | Masked by default |
| `rating` | Rating/Slider | Use `min`/`max`, `labels` |

---

## Demo Website Design

### Overview

The demo website showcases the pupt-react library with a split-pane interface using Mantine components.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: pupt-react Demo                              [GitHub]  │
├─────────────────────────────────────────────────────────────────┤
│                           │                                     │
│   Prompt Input            │   Rendered Output                   │
│   ─────────────           │   ───────────────                   │
│                           │                                     │
│   ┌───────────────────┐   │   ┌───────────────────────────────┐│
│   │                   │   │   │                               ││
│   │  Monaco Editor    │   │   │  Rendered Text                ││
│   │                   │   │   │                               ││
│   │  <Prompt>         │   │   │  [Copy]                       ││
│   │    Say hi         │   │   │                               ││
│   │  </Prompt>        │   │   └───────────────────────────────┘│
│   │                   │   │                                     │
│   └───────────────────┘   │   ┌───────────────────────────────┐│
│                           │   │  Ask Inputs (if any)          ││
│   Format: [JSX ▼]         │   │  ─────────────────            ││
│                           │   │                               ││
│   Examples:               │   │  Name: [____________]         ││
│   • Simple greeting       │   │                               ││
│   • With variables        │   │  [Submit]                     ││
│   • Complex prompt        │   └───────────────────────────────┘│
│                           │                                     │
├───────────────────────────┴─────────────────────────────────────┤
│  Status: Ready | Errors: None                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Components

#### App.tsx

Root component with Mantine provider and theme.

```tsx
function App() {
  return (
    <MantineProvider theme={theme}>
      <PuptProvider>
        <Layout>
          <PromptInput />
          <PromptOutput />
        </Layout>
      </PuptProvider>
    </MantineProvider>
  );
}
```

#### Layout.tsx

Split-pane layout using Mantine Grid.

```tsx
interface LayoutProps {
  children: [React.ReactNode, React.ReactNode];
}

function Layout({ children }: LayoutProps) {
  const [left, right] = children;
  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Header />
      </AppShell.Header>
      <AppShell.Main>
        <Grid>
          <Grid.Col span={6}>{left}</Grid.Col>
          <Grid.Col span={6}>{right}</Grid.Col>
        </Grid>
      </AppShell.Main>
    </AppShell>
  );
}
```

#### PromptInput.tsx

Left panel with Monaco editor for prompt input.

```tsx
function PromptInput() {
  const [value, setValue] = useState(DEFAULT_PROMPT);
  const [format, setFormat] = useState<'jsx' | 'prompt'>('jsx');

  return (
    <Stack>
      <Group>
        <Title order={3}>Prompt Input</Title>
        <Select
          value={format}
          onChange={setFormat}
          data={[
            { value: 'jsx', label: 'JSX (.tsx)' },
            { value: 'prompt', label: 'Prompt (.prompt)' },
          ]}
        />
      </Group>

      <MonacoEditor
        value={value}
        onChange={setValue}
        language={format === 'jsx' ? 'typescript' : 'plaintext'}
        height="60vh"
      />

      <ExamplePicker onSelect={setValue} />
    </Stack>
  );
}
```

#### PromptOutput.tsx

Right panel with rendered output and copy button.

```tsx
function PromptOutput() {
  const { output, isRendering, error, copyToClipboard, isCopied } = usePromptRender();
  const { requirements, isComplete, getInputProps } = useAskIterator();

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Rendered Output</Title>
        <CopyButton value={output} />
      </Group>

      {error && (
        <Alert color="red" title="Error">
          {error.message}
        </Alert>
      )}

      {isRendering ? (
        <Loader />
      ) : (
        <CodeHighlight code={output || ''} language="text" />
      )}

      {requirements.length > 0 && (
        <AskInputs requirements={requirements} getInputProps={getInputProps} />
      )}
    </Stack>
  );
}
```

#### AskInputs.tsx

Dynamic form for Ask inputs based on requirement type.

```tsx
interface AskInputsProps {
  requirements: InputRequirement[];
  getInputProps: (name: string) => AskInputRenderProps;
}

function AskInputs({ requirements, getInputProps }: AskInputsProps) {
  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="md">Required Inputs</Title>

      <Stack>
        {requirements.map((req) => {
          const props = getInputProps(req.name);
          return <AskInput key={req.name} {...props} />;
        })}
      </Stack>
    </Paper>
  );
}

function AskInput({ requirement, value, onChange, validation }: AskInputRenderProps) {
  switch (requirement.type) {
    case 'string':
      return (
        <TextInput
          label={requirement.label}
          description={requirement.description}
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          error={validation?.valid === false ? validation.message : undefined}
          required={requirement.required}
        />
      );

    case 'number':
      return (
        <NumberInput
          label={requirement.label}
          description={requirement.description}
          value={value as number}
          onChange={onChange}
          min={requirement.min}
          max={requirement.max}
          error={validation?.valid === false ? validation.message : undefined}
          required={requirement.required}
        />
      );

    case 'select':
      return (
        <Select
          label={requirement.label}
          description={requirement.description}
          value={value as string}
          onChange={onChange}
          data={requirement.options?.map(opt => ({
            value: opt.value,
            label: opt.label || opt.value,
          })) || []}
          error={validation?.valid === false ? validation.message : undefined}
          required={requirement.required}
        />
      );

    case 'multiselect':
      return (
        <MultiSelect
          label={requirement.label}
          description={requirement.description}
          value={value as string[]}
          onChange={onChange}
          data={requirement.options?.map(opt => ({
            value: opt.value,
            label: opt.label || opt.value,
          })) || []}
          error={validation?.valid === false ? validation.message : undefined}
          required={requirement.required}
        />
      );

    case 'boolean':
      return (
        <Switch
          label={requirement.label}
          description={requirement.description}
          checked={value as boolean}
          onChange={(e) => onChange(e.target.checked)}
        />
      );

    case 'date':
      return (
        <DateInput
          label={requirement.label}
          description={requirement.description}
          value={value as Date}
          onChange={onChange}
          minDate={requirement.minDate}
          maxDate={requirement.maxDate}
          error={validation?.valid === false ? validation.message : undefined}
          required={requirement.required}
        />
      );

    case 'secret':
      return (
        <PasswordInput
          label={requirement.label}
          description={requirement.description}
          value={value as string || ''}
          onChange={(e) => onChange(e.target.value)}
          error={validation?.valid === false ? validation.message : undefined}
          required={requirement.required}
        />
      );

    case 'rating':
      return (
        <Stack gap="xs">
          <Text size="sm" fw={500}>{requirement.label}</Text>
          <Rating
            value={value as number}
            onChange={onChange}
            count={requirement.max || 5}
          />
        </Stack>
      );

    case 'file':
      return (
        <FileInput
          label={requirement.label}
          description={requirement.description}
          accept={requirement.extensions?.join(',')}
          multiple={requirement.multiple}
          onChange={onChange}
          error={validation?.valid === false ? validation.message : undefined}
          required={requirement.required}
        />
      );

    default:
      return (
        <TextInput
          label={requirement.label}
          description={requirement.description}
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          error={validation?.valid === false ? validation.message : undefined}
          required={requirement.required}
        />
      );
  }
}
```

#### CopyButton.tsx

Copy to clipboard button with feedback.

```tsx
interface CopyButtonProps {
  value: string | null;
}

function CopyButton({ value }: CopyButtonProps) {
  const clipboard = useClipboard({ timeout: 2000 });

  return (
    <Button
      variant="light"
      leftSection={clipboard.copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
      onClick={() => value && clipboard.copy(value)}
      disabled={!value}
      color={clipboard.copied ? 'teal' : 'blue'}
    >
      {clipboard.copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}
```

### Example Prompts

Built-in examples for the demo:

```tsx
const EXAMPLES = [
  {
    name: 'Simple Greeting',
    source: `<Prompt name="greeting">
  <Task>Say hello to the user</Task>
</Prompt>`,
  },
  {
    name: 'With Variables',
    source: `<Prompt name="personalized">
  <Task>
    Write a greeting for <Ask.Text name="name" label="User's name" />
  </Task>
</Prompt>`,
  },
  {
    name: 'Complex Prompt',
    source: `<Prompt name="code-review">
  <Role>You are an expert code reviewer</Role>
  <Context>
    Review the following code in <Ask.Select name="language" label="Language">
      <Option value="typescript">TypeScript</Option>
      <Option value="python">Python</Option>
      <Option value="rust">Rust</Option>
    </Ask.Select>
  </Context>
  <Task>
    Provide feedback on code quality, best practices, and potential bugs
  </Task>
  <Format>
    Use markdown with sections for:
    - Summary
    - Issues Found
    - Recommendations
  </Format>
</Prompt>`,
  },
  {
    name: 'All Ask Types',
    source: `<Prompt name="all-asks">
  <Task>Demo of all Ask input types</Task>

  <Ask.Text name="text" label="Text Input" placeholder="Enter text..." />
  <Ask.Number name="number" label="Number" min={0} max={100} />
  <Ask.Select name="select" label="Select One">
    <Option value="a">Option A</Option>
    <Option value="b">Option B</Option>
  </Ask.Select>
  <Ask.MultiSelect name="multi" label="Select Multiple" options={[
    { value: '1', label: 'One' },
    { value: '2', label: 'Two' },
    { value: '3', label: 'Three' },
  ]} />
  <Ask.Confirm name="confirm" label="Are you sure?" />
  <Ask.Date name="date" label="Pick a date" />
  <Ask.Secret name="secret" label="Password" />
  <Ask.Rating name="rating" label="Rate this" min={1} max={5} />
</Prompt>`,
  },
];
```

---

## CI/CD & Deployment

### GitHub Actions Workflows

#### CI Pipeline (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  build:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 1

  test-node:
    needs: build
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - run: npm ci
      - run: npm run test:ci:node

  test-browser:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/
      - run: npm ci
      - name: Install Playwright
        run: npx playwright install chromium --with-deps
      - run: npm run test:ci:browser

  coverage:
    needs: [test-node, test-browser]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test:coverage
      - uses: coverallsapp/github-action@v2
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

  release:
    needs: [test-node, test-browser, coverage]
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: true
```

#### GitHub Pages Deployment (`.github/workflows/deploy.yml`)

```yaml
name: Deploy Demo

on:
  push:
    branches: [main, master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build-demo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run build:demo
      - uses: actions/upload-pages-artifact@v3
        with:
          path: demo/dist

  deploy:
    needs: build-demo
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Semantic Release Configuration (`.releaserc`)

```json
{
  "branches": ["main", "master"],
  "plugins": [
    ["@semantic-release/commit-analyzer", {
      "preset": "conventionalcommits"
    }],
    ["@semantic-release/release-notes-generator", {
      "preset": "conventionalcommits"
    }],
    ["@semantic-release/changelog", {
      "changelogFile": "CHANGELOG.md"
    }],
    "@semantic-release/npm",
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]"
    }],
    "@semantic-release/github"
  ]
}
```

### NPM Scripts

```json
{
  "scripts": {
    "build": "vite build",
    "build:demo": "vite build --config demo/vite.config.ts",
    "dev": "vite --config demo/vite.config.ts",
    "lint": "eslint . && tsc --noEmit && knip",
    "lint:fix": "eslint . --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:node": "vitest run --project node",
    "test:browser": "vitest run --project browser",
    "test:ci": "vitest run --reporter=verbose",
    "test:ci:node": "vitest run --project node --reporter=verbose",
    "test:ci:browser": "vitest run --project browser --reporter=verbose",
    "test:coverage": "vitest run --coverage",
    "prepare": "husky",
    "release": "semantic-release"
  }
}
```

---

## Implementation Notes

### Key Implementation Considerations

1. **Browser-Only Library**: Unlike pupt-lib which supports both Node.js and browser, pupt-react is browser-only. File system operations (Ask.File, Ask.Path with mustExist) will show warnings in the browser environment.

2. **JSX Transformation**: The library uses `@babel/standalone` for runtime JSX transformation, matching pupt-lib's browser approach. This allows users to type raw JSX in the editor without pre-compilation.

3. **State Synchronization**: The hooks must carefully manage state synchronization between:
   - Source text changes
   - Element parsing
   - Input collection
   - Rendered output

4. **Validation Flow**: Input validation should happen both:
   - On individual field change (immediate feedback)
   - On render attempt (prevent incomplete rendering)

5. **Debouncing**: Editor changes should be debounced before triggering transformation to prevent excessive re-parsing during typing.

6. **Error Boundaries**: React error boundaries should wrap the transformation/rendering logic to gracefully handle invalid JSX or runtime errors.

7. **TypeScript JSX Config**: The library needs proper JSX configuration:
   ```json
   {
     "compilerOptions": {
       "jsx": "react-jsx",
       "jsxImportSource": "react"
     }
   }
   ```

8. **Peer Dependencies**: React and React-DOM should be peer dependencies to avoid version conflicts:
   ```json
   {
     "peerDependencies": {
       "react": "^18.0.0",
       "react-dom": "^18.0.0"
     }
   }
   ```

9. **Tree Shaking**: Ensure the library is tree-shakeable by using named exports and proper ES module structure.

10. **Demo Base Path**: For GitHub Pages deployment, the demo's Vite config must set the correct base path:
    ```ts
    export default defineConfig({
      base: '/pupt-react/',
      // ...
    });
    ```

### Testing Strategy

1. **Unit Tests**: Test hooks in isolation using `@testing-library/react`'s `renderHook`
2. **Component Tests**: Test headless components with render props
3. **Integration Tests**: Test full flow from source input to rendered output
4. **Browser Tests**: Test actual browser behavior with Playwright

### Accessibility Considerations

1. All Ask inputs should have proper labels and ARIA attributes
2. Error messages should be associated with inputs via `aria-describedby`
3. Focus management during Ask iteration
4. Keyboard navigation support in the demo

### Performance Considerations

1. Memoize transformation results to avoid re-parsing unchanged sources
2. Use `useMemo` and `useCallback` appropriately in hooks
3. Virtualize large output text if needed
4. Consider web workers for heavy transformation if latency becomes an issue

---

## Dependencies Summary

### Library (src/)

```json
{
  "dependencies": {
    "pupt-lib": "^latest"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

### Demo (demo/)

```json
{
  "dependencies": {
    "@mantine/core": "^7.15.0",
    "@mantine/hooks": "^7.15.0",
    "@mantine/code-highlight": "^7.15.0",
    "@mantine/dates": "^7.15.0",
    "@monaco-editor/react": "^4.7.0",
    "@tabler/icons-react": "^3.30.0",
    "dayjs": "^1.11.0"
  }
}
```

### Dev Dependencies

```json
{
  "devDependencies": {
    "@commitlint/cli": "^19.7.0",
    "@commitlint/config-conventional": "^19.7.0",
    "@eslint/js": "^9.19.0",
    "@semantic-release/changelog": "^6.0.0",
    "@semantic-release/git": "^10.0.0",
    "@semantic-release/github": "^11.0.0",
    "@stylistic/eslint-plugin": "^2.13.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@vitest/browser": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "commitizen": "^4.3.0",
    "conventional-changelog-conventionalcommits": "^9.1.0",
    "cz-conventional-changelog": "^3.3.0",
    "eslint": "^9.19.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "husky": "^9.1.0",
    "jsdom": "^26.0.0",
    "knip": "^5.44.0",
    "playwright": "^1.50.0",
    "semantic-release": "^25.0.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.22.0",
    "vite": "^6.0.0",
    "vite-plugin-dts": "^4.5.0",
    "vitest": "^3.0.0"
  }
}
```
