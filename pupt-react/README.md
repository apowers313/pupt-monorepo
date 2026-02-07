# pupt-react

Headless React components and hooks for rendering [pupt-lib](https://github.com/apowers313/pupt-lib) prompts.

## Features

- **Headless render-prop components** — full UI flexibility, zero styling opinions
- **Five React hooks** — `usePromptRender`, `useAskIterator`, `usePromptSearch`, `usePostActions`, `usePupt`
- **Ask system** — collect and validate user inputs with type-safe forms
- **Environment context** — adapt prompts to model, language, runtime, and output format
- **Post-execution actions** — manage follow-up actions (open URLs, review files, run commands)
- **Prompt search** — debounced full-text search across prompt libraries
- **Full TypeScript types** — all props, render props, and return values are typed

## Installation

```bash
npm install pupt-react pupt-lib react react-dom
```

**Peer dependencies:** React 18+ or 19+, pupt-lib ^1.2.1

## Quick Start

### Minimal — render a prompt

```tsx
import { PuptProvider, PromptRenderer } from "pupt-react";

function App() {
  const source = `<Prompt name="greeting">
  <Task>Say hello to the user.</Task>
</Prompt>`;

  return (
    <PuptProvider>
      <PromptRenderer source={source}>
        {({ output, isLoading, error }) => (
          <div>
            {isLoading && <p>Rendering...</p>}
            {error && <p>Error: {error.message}</p>}
            {output && <pre>{output}</pre>}
          </div>
        )}
      </PromptRenderer>
    </PuptProvider>
  );
}
```

`PromptRenderer` auto-renders by default (`autoRender={true}`), so the prompt is rendered as soon as it transforms.

### With clipboard

```tsx
<PromptRenderer source={source}>
  {({ output, isReady, copyToClipboard, isCopied }) => (
    <div>
      {isReady && (
        <>
          <pre>{output}</pre>
          <button onClick={copyToClipboard}>
            {isCopied ? "Copied!" : "Copy"}
          </button>
        </>
      )}
    </div>
  )}
</PromptRenderer>
```

`isReady` is `true` when there is output and no pending inputs remain.

### With user inputs

Prompts can request user input via `<Ask.*>` components. When they do, `pendingInputs` lists what's needed:

```tsx
import { useState } from "react";
import { PromptRenderer } from "pupt-react";

function PromptWithInputs() {
  const [inputs, setInputs] = useState<Map<string, unknown>>(new Map());

  const source = `<Prompt name="coder">
  <Ask.Text name="language" label="Language" description="Programming language" />
  <Task>Write a hello world program in {language}.</Task>
</Prompt>`;

  return (
    <PromptRenderer source={source} inputs={inputs}>
      {({ output, isReady, pendingInputs }) => (
        <div>
          {pendingInputs.map((input) => (
            <label key={input.name}>
              {input.label}
              <input
                type="text"
                onChange={(e) =>
                  setInputs(new Map(inputs).set(input.name, e.target.value))
                }
              />
            </label>
          ))}
          {isReady && <pre>{output}</pre>}
        </div>
      )}
    </PromptRenderer>
  );
}
```

---

## Guide: Core Concepts

### Headless render-prop pattern

Every component in pupt-react is headless: it manages state and logic, then passes everything to your render function. You control all markup and styling.

```tsx
<PromptRenderer source={source}>
  {(props) => {
    // props contains: output, isLoading, isReady, error, pendingInputs,
    //                 postActions, copyToClipboard, isCopied, render
    return <YourCustomUI {...props} />;
  }}
</PromptRenderer>
```

### The prompt pipeline

Prompts go through two phases:

1. **Transform** — source code (JSX string) is parsed into a `PuptElement` tree
2. **Render** — the element tree is rendered to text output, resolving inputs and environment context

`PromptRenderer` handles both phases. For lower-level control, use `usePromptRender` which exposes `transform()` and `render()` separately.

### Environment context

Environment context lets prompts adapt to the current model, output format, language, and runtime. Set defaults on the provider and override per-component:

```tsx
<PuptProvider
  environment={{
    llm: { model: "claude-sonnet-4-5-20250929", provider: "anthropic" },
    output: { format: "markdown" },
  }}
>
  {/* All prompts inherit these defaults */}
  <PromptRenderer
    source={source}
    environment={{ output: { format: "xml" } }}
  >
    {/* This prompt renders as XML */}
    {(props) => <div>{props.output}</div>}
  </PromptRenderer>
</PuptProvider>
```

The full `EnvironmentContext` shape:

```ts
interface EnvironmentContext {
  llm: {
    model: string;
    provider: "anthropic" | "openai" | "google" | "meta" | "mistral"
            | "deepseek" | "xai" | "cohere" | "unspecified";
    maxTokens?: number;
    temperature?: number;
  };
  output: {
    format: "xml" | "markdown" | "json" | "text" | "unspecified";
    trim: boolean;
    indent: string;
  };
  code: {
    language: string;
    highlight?: boolean;
  };
  user: {
    editor: string;
  };
  runtime: {
    hostname?: string;
    username?: string;
    cwd?: string;
    platform?: string;
    os?: string;
    locale?: string;
    timestamp?: number;
    date?: string;
    time?: string;
    uuid?: string;
  };
}
```

### The Ask system

pupt-lib prompts can declare inputs with `<Ask.*>` components (e.g., `<Ask.Text>`, `<Ask.Number>`, `<Ask.Select>`). These surface as `InputRequirement` objects that you can collect via:

- **`PromptRenderer`** — `pendingInputs` render prop + `inputs` prop for values
- **`AskHandler`** — wizard-style step-through with validation
- **`useAskIterator`** — hook for custom input collection flows

Each `InputRequirement` includes `name`, `label`, `description`, `type`, `required`, optional `default`, `min`, `max`, `options`, and a `schema` for validation.

---

## Guide: Component Examples

### PromptRenderer

The primary component for rendering prompts. Accepts a source string or `PromptSource` object and provides all render state:

```tsx
<PromptRenderer
  source={source}
  inputs={inputs}
  autoRender={true}
  renderOptions={{ format: "markdown", trim: true }}
  environment={{ llm: { model: "claude-sonnet-4-5-20250929" } }}
>
  {({
    output,
    isReady,
    isLoading,
    error,
    pendingInputs,
    postActions,
    copyToClipboard,
    isCopied,
    render,
  }) => (
    <div>
      {isLoading && <Spinner />}
      {error && <ErrorBanner message={error.message} />}
      {pendingInputs.length > 0 && <InputForm inputs={pendingInputs} />}
      {isReady && (
        <>
          <pre>{output}</pre>
          <button onClick={copyToClipboard}>
            {isCopied ? "Copied!" : "Copy"}
          </button>
          <button onClick={render}>Re-render</button>
          {postActions.map((action) => (
            <PostActionButton key={action.type} action={action} />
          ))}
        </>
      )}
    </div>
  )}
</PromptRenderer>
```

### PromptEditor

A headless editor component that transforms source on the fly with debouncing. Pair it with `PromptRenderer` by passing the `element`:

```tsx
<PromptEditor defaultValue={initialSource} debounce={300}>
  {({ inputProps, element, error, isTransforming }) => (
    <div>
      <textarea {...inputProps} rows={10} />
      {isTransforming && <p>Parsing...</p>}
      {error && <p>Syntax error: {error.message}</p>}

      {element && (
        <PromptRenderer source={{ type: "element", value: element }}>
          {({ output, isLoading }) => (
            <div>
              <h3>Preview</h3>
              {isLoading ? <Spinner /> : <pre>{output}</pre>}
            </div>
          )}
        </PromptRenderer>
      )}
    </div>
  )}
</PromptEditor>
```

### AskHandler

Wizard-style input collection with validation, progress tracking, and navigation. `submit` validates the value and auto-advances to the next input on success:

```tsx
<AskHandler
  element={element}
  onComplete={(values) => console.log("Collected:", values)}
  initialValues={new Map()}
>
  {({
    current,
    currentIndex,
    totalInputs,
    progress,
    isDone,
    isLoading,
    values,
    submit,
    previous,
    goTo,
    reset,
    getInputProps,
  }) => {
    if (isLoading) return <Spinner />;
    if (isDone) return <p>All inputs collected!</p>;
    if (!current) return null;

    const { inputProps, value, setValue, errors } = getInputProps(current.name);

    return (
      <div>
        <progress value={progress} max={100} />
        <p>Step {currentIndex + 1} of {totalInputs}</p>

        <label htmlFor={inputProps.id}>{current.label}</label>
        <p>{current.description}</p>
        <input
          {...inputProps}
          value={String(value ?? "")}
          onChange={(e) => setValue(e.target.value)}
        />
        {errors.map((err) => (
          <p key={err} style={{ color: "red" }}>{err}</p>
        ))}

        <button onClick={previous} disabled={currentIndex === 0}>Back</button>
        <button onClick={() => submit(value)}>Next</button>
        <button onClick={reset}>Reset</button>
      </div>
    );
  }}
</AskHandler>
```

---

## Guide: Hook Examples

### usePromptRender

Lower-level hook for when you need direct control over transformation and rendering. Unlike `PromptRenderer`, `autoRender` defaults to `false` and the source must be a `PromptSource` object (not a plain string):

```tsx
import { usePromptRender } from "pupt-react";

function CustomRenderer() {
  const {
    source,
    setSource,
    element,
    output,
    error,
    renderErrors,
    isTransforming,
    isRendering,
    isLoading,
    inputRequirements,
    postActions,
    render,
    transform,
  } = usePromptRender({
    source: { type: "source", value: "<Prompt><Task>Hello</Task></Prompt>" },
    inputs: new Map(),
    autoRender: true,
    environment: { llm: { model: "claude-sonnet-4-5-20250929" } },
  });

  return (
    <div>
      {isLoading && <p>Working...</p>}
      {output && <pre>{output}</pre>}
      <button onClick={render}>Re-render</button>
    </div>
  );
}
```

### useAskIterator

Hook for custom input collection flows outside `AskHandler`:

```tsx
import { useAskIterator } from "pupt-react";

function CustomInputCollector({ element }) {
  const {
    requirements,
    current,
    currentIndex,
    totalInputs,
    isDone,
    isLoading,
    inputs,
    submit,
    previous,
    goTo,
    reset,
    setValue,
    getValue,
  } = useAskIterator({
    element,
    onComplete: (inputs) => console.log("Done:", inputs),
    initialValues: new Map(),
  });

  if (isDone) return <p>All {totalInputs} inputs collected.</p>;
  // Render your custom UI...
}
```

### usePromptSearch

Build search UIs for prompt libraries. Requires `PuptProvider` to be configured with `prompts`:

```tsx
import { PuptProvider, usePromptSearch } from "pupt-react";

function App() {
  return (
    <PuptProvider prompts={myPromptLibrary}>
      <PromptSearchUI />
    </PuptProvider>
  );
}

function PromptSearchUI() {
  const { query, setQuery, results, isSearching, allTags, clear } =
    usePromptSearch({ debounce: 200, limit: 10 });

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search prompts..."
      />
      <button onClick={clear}>Clear</button>

      {isSearching && <p>Searching...</p>}

      <div>
        {allTags.map((tag) => (
          <button key={tag} onClick={() => setQuery(tag)}>{tag}</button>
        ))}
      </div>

      <ul>
        {results.map((result) => (
          <li key={result.prompt.name}>
            <strong>{result.prompt.name}</strong>
            <span> — {result.prompt.description}</span>
            <span> (score: {result.score.toFixed(2)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### usePostActions

Manage post-execution actions with custom handlers:

```tsx
import { usePostActions } from "pupt-react";

function PostActionPanel({ actions }) {
  const {
    pendingActions,
    executedActions,
    dismissedActions,
    allDone,
    execute,
    dismiss,
    executeAll,
    dismissAll,
    reset,
  } = usePostActions({
    actions,
    handlers: {
      openUrl: (action) => window.open(action.url),
      reviewFile: (action) => openInEditor(action.file),
      runCommand: (action) => runInTerminal(action.command),
    },
  });

  return (
    <div>
      <h3>Actions ({pendingActions.length} pending)</h3>
      {pendingActions.map((action) => (
        <div key={`${action.type}-${JSON.stringify(action)}`}>
          <span>{action.type}</span>
          <button onClick={() => execute(action)}>Execute</button>
          <button onClick={() => dismiss(action)}>Dismiss</button>
        </div>
      ))}
      {!allDone && (
        <>
          <button onClick={executeAll}>Execute All</button>
          <button onClick={dismissAll}>Dismiss All</button>
        </>
      )}
      {allDone && <p>All actions handled.</p>}
    </div>
  );
}
```

### usePupt

Access the `PuptProvider` context directly. Most commonly used internally by other hooks, but useful when you need the search engine or shared configuration:

```tsx
import { usePupt } from "pupt-react";

function DebugPanel() {
  const { searchEngine, renderOptions, environment, isLoading, error } =
    usePupt();

  if (isLoading) return <p>Initializing...</p>;
  if (error) return <p>Init error: {error.message}</p>;

  return (
    <pre>{JSON.stringify({ renderOptions, environment }, null, 2)}</pre>
  );
}
```

---

## API Reference

### Components

#### PuptProvider

Context provider that initializes pupt-lib and provides shared configuration.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | required | Child components |
| `prompts` | `SearchablePrompt[]` | `undefined` | Prompts to index for search |
| `renderOptions` | `Partial<RenderOptions>` | `{}` | Default render options for all renders |
| `environment` | `Partial<EnvironmentContext>` | `{}` | Default environment context |

#### PromptRenderer

Headless component for transforming and rendering prompts.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `(props: PromptRendererRenderProps) => ReactNode` | required | Render function |
| `source` | `string \| PromptSource` | required | Prompt source code or pre-parsed source |
| `autoRender` | `boolean` | `true` | Auto-render when source/inputs change |
| `inputs` | `Map<string, unknown>` | `undefined` | Values for Ask components |
| `renderOptions` | `Partial<RenderOptions>` | `undefined` | Render options (merged with provider defaults) |
| `environment` | `Partial<EnvironmentContext>` | `undefined` | Environment overrides (merged with provider defaults) |

**Render props:**

| Prop | Type | Description |
|------|------|-------------|
| `output` | `string \| null` | Rendered text output |
| `isReady` | `boolean` | `true` when output exists and no pending inputs remain |
| `isLoading` | `boolean` | `true` while transforming or rendering |
| `error` | `Error \| null` | Transformation or rendering error |
| `pendingInputs` | `InputRequirement[]` | Unsatisfied input requirements from Ask components |
| `postActions` | `PostExecutionAction[]` | Post-execution actions from the prompt |
| `copyToClipboard` | `() => Promise<void>` | Copy output to clipboard |
| `isCopied` | `boolean` | `true` briefly after a successful copy |
| `render` | `() => Promise<void>` | Manually trigger re-render |

#### PromptEditor

Headless component for editing prompt source with live transformation preview.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `(props: PromptEditorRenderProps) => ReactNode` | required | Render function |
| `defaultValue` | `string` | `undefined` | Initial source value |
| `onChange` | `(value: string) => void` | `undefined` | Called when value changes |
| `debounce` | `number` | `300` | Debounce delay for transformation (ms) |

**Render props:**

| Prop | Type | Description |
|------|------|-------------|
| `inputProps` | `{ value, onChange }` | Props to spread onto a textarea/input |
| `value` | `string` | Current source value |
| `setValue` | `(value: string) => void` | Set source value directly |
| `element` | `PuptElement \| null` | Transformed element (null if pending/failed) |
| `error` | `Error \| null` | Transformation error |
| `isTransforming` | `boolean` | `true` while transformation is in progress |

#### AskHandler

Headless component for wizard-style input collection with validation.

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `(props: AskHandlerRenderProps) => ReactNode` | required | Render function |
| `element` | `PuptElement \| null` | required | Element containing Ask components |
| `onComplete` | `(values: Map<string, unknown>) => void` | `undefined` | Called when all inputs are collected |
| `initialValues` | `Map<string, unknown>` | `undefined` | Pre-supplied input values |

**Render props:**

| Prop | Type | Description |
|------|------|-------------|
| `requirements` | `InputRequirement[]` | All input requirements |
| `current` | `InputRequirement \| null` | Current requirement being collected |
| `currentIndex` | `number` | Current step index |
| `totalInputs` | `number` | Total number of inputs |
| `progress` | `number` | Progress percentage (0–100) |
| `isDone` | `boolean` | `true` when all inputs are collected |
| `isLoading` | `boolean` | `true` while initializing |
| `values` | `Map<string, unknown>` | All collected values |
| `submit` | `(value: unknown) => Promise<ValidationResult>` | Submit value for current input (auto-advances on success) |
| `previous` | `() => void` | Go to previous input |
| `goTo` | `(index: number) => void` | Go to specific input by index |
| `reset` | `() => void` | Reset all inputs |
| `getInputProps` | `(name: string) => AskInputProps` | Get props helper for a specific input |

**AskInputProps** (returned by `getInputProps`):

| Prop | Type | Description |
|------|------|-------------|
| `inputProps` | `{ id, name, type, required, "aria-label" }` | Props to spread onto an input element |
| `requirement` | `InputRequirement` | The input requirement metadata |
| `value` | `unknown` | Current value for this input |
| `setValue` | `(value: unknown) => void` | Set the value |
| `errors` | `string[]` | Validation errors |

### Hooks

#### usePupt

Access the PuptProvider context.

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `searchEngine` | `SearchEngine \| null` | Search engine (null if no prompts provided) |
| `renderOptions` | `Partial<RenderOptions>` | Default render options |
| `environment` | `Partial<EnvironmentContext>` | Default environment context |
| `isLoading` | `boolean` | `true` during initialization |
| `error` | `Error \| null` | Initialization error |

#### usePromptRender

Transform and render prompts with full control.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `source` | `PromptSource` | `undefined` | Initial source (`{ type: "source" \| "element", value }`) |
| `inputs` | `Map<string, unknown>` | `undefined` | Input values for Ask components |
| `environment` | `Partial<EnvironmentContext>` | `undefined` | Environment context |
| `renderOptions` | `Partial<RenderOptions>` | `undefined` | Render options |
| `autoRender` | `boolean` | `false` | Auto-render after transformation |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `source` | `PromptSource \| null` | Current source |
| `setSource` | `(source: PromptSource) => void` | Set a new source |
| `element` | `PuptElement \| null` | Transformed element |
| `output` | `string \| null` | Rendered text output |
| `error` | `Error \| null` | Transformation or rendering error |
| `renderErrors` | `RenderError[]` | Detailed render errors |
| `isTransforming` | `boolean` | `true` during transformation |
| `isRendering` | `boolean` | `true` during rendering |
| `isLoading` | `boolean` | `true` during transformation or rendering |
| `inputRequirements` | `InputRequirement[]` | Input requirements from Ask components |
| `postActions` | `PostExecutionAction[]` | Post-execution actions |
| `render` | `() => Promise<void>` | Trigger rendering |
| `transform` | `(sourceCode?: string) => Promise<PuptElement \| null>` | Trigger transformation |

#### useAskIterator

Iterate through Ask inputs and collect validated responses.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `element` | `PuptElement \| null` | required | Element containing Ask components |
| `onComplete` | `(values: Map<string, unknown>) => void` | `undefined` | Callback when all inputs collected |
| `initialValues` | `Map<string, unknown>` | `undefined` | Pre-supplied values |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `requirements` | `InputRequirement[]` | All input requirements |
| `current` | `InputRequirement \| null` | Current requirement |
| `currentIndex` | `number` | Current index |
| `totalInputs` | `number` | Total count |
| `isDone` | `boolean` | `true` when all collected |
| `isLoading` | `boolean` | `true` while initializing |
| `inputs` | `Map<string, unknown>` | Collected values |
| `submit` | `(value: unknown) => Promise<ValidationResult>` | Submit and validate |
| `previous` | `() => void` | Go back |
| `goTo` | `(index: number) => void` | Jump to index |
| `reset` | `() => void` | Reset all |
| `setValue` | `(name: string, value: unknown) => void` | Set value by name |
| `getValue` | `(name: string) => unknown` | Get value by name |

#### usePromptSearch

Search through prompts indexed by PuptProvider.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debounce` | `number` | `200` | Debounce delay (ms) |
| `limit` | `number` | `undefined` | Max results |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `query` | `string` | Current query |
| `setQuery` | `(query: string) => void` | Set query |
| `results` | `SearchResult[]` | Search results |
| `isSearching` | `boolean` | `true` while searching |
| `allTags` | `string[]` | All tags from indexed prompts |
| `clear` | `() => void` | Clear query and results |

#### usePostActions

Manage post-execution actions.

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `actions` | `PostExecutionAction[]` | required | Actions to manage |
| `handlers` | `Partial<Record<PostExecutionAction["type"], PostActionHandler>>` | `undefined` | Custom handlers by action type |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `pendingActions` | `PostExecutionAction[]` | Not yet handled |
| `executedActions` | `PostExecutionAction[]` | Successfully executed |
| `dismissedActions` | `PostExecutionAction[]` | Dismissed without executing |
| `allDone` | `boolean` | `true` when none pending |
| `execute` | `(action: PostExecutionAction) => Promise<void>` | Execute one action |
| `dismiss` | `(action: PostExecutionAction) => void` | Dismiss one action |
| `executeAll` | `() => Promise<void>` | Execute all pending |
| `dismissAll` | `() => void` | Dismiss all pending |
| `reset` | `() => void` | Reset all to pending |

### Types

All types are exported from the package entry point. Key types re-exported from pupt-lib:

| Type | Description |
|------|-------------|
| `PuptElement` | Parsed prompt element tree |
| `PromptSource` | `{ type: "source" \| "element"; value: string \| PuptElement }` |
| `InputRequirement` | Describes a user input required by an Ask component |
| `ValidationResult` | Result of validating a user input (`{ valid, errors, warnings }`) |
| `PostExecutionAction` | Union of `ReviewFileAction \| OpenUrlAction \| RunCommandAction` |
| `SearchablePrompt` | Prompt metadata for indexing (`{ name, description?, tags, library, content? }`) |
| `SearchResult` | Search hit (`{ prompt, score, matches }`) |
| `RenderOptions` | Options for rendering (`{ format?, trim?, indent?, maxDepth?, inputs?, env? }`) |
| `RenderResult` | Discriminated union: `RenderSuccess \| RenderFailure` |
| `RenderError` | Validation/runtime error during rendering |
| `EnvironmentContext` | Full environment configuration (see [Environment context](#environment-context)) |

## Browser Usage

When using pupt-lib in the browser (e.g., for a demo app), an import map is required for dynamic ES module evaluation:

```html
<script type="importmap">
  {
    "imports": {
      "pupt-lib": "https://unpkg.com/pupt-lib@VERSION/dist/index.js",
      "pupt-lib/jsx-runtime": "https://unpkg.com/pupt-lib@VERSION/dist/jsx-runtime/index.js",
      "zod": "https://unpkg.com/zod@3.24.2/lib/index.mjs",
      "minisearch": "https://unpkg.com/minisearch@7.1.1/dist/es/index.js"
    }
  }
</script>
```

Replace `VERSION` with the pupt-lib version you are using.

## Development

```bash
npm run build        # Build the library (outputs to dist/)
npm run build:demo   # Build the demo website (outputs to dist-demo/)
npm run dev:demo     # Start demo dev server
npm run lint         # ESLint + TypeScript type checking
npm run lint:fix     # Auto-fix linting issues
npm run test         # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Run tests with coverage
```

## License

MIT
