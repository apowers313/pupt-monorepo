# pupt-react

A headless React component library for integrating [pupt-lib](https://github.com/apowers313/pupt-lib) into web applications. Provides hooks and render-prop components for prompt transformation, rendering, and user input collection.

## Features

- **Headless Components**: Full UI flexibility with render-prop patterns
- **React Hooks**: Access pupt-lib functionality with idiomatic React APIs
- **Ask System Integration**: Collect and validate user inputs with type-safe forms
- **Search Support**: Built-in prompt search functionality
- **Post-Actions**: Handle post-execution actions from prompts
- **TypeScript**: Full type definitions included

## Installation

```bash
npm install pupt-react pupt-lib react react-dom
```

## Quick Start

### Basic Setup

Wrap your application with `PuptProvider` to enable pupt-lib integration:

```tsx
import { PuptProvider, PromptRenderer } from "pupt-react";

function App() {
  return (
    <PuptProvider>
      <MyPromptComponent />
    </PuptProvider>
  );
}
```

### Rendering a Prompt

Use `PromptRenderer` with the render-prop pattern for full control over rendering:

```tsx
import { PromptRenderer } from "pupt-react";

function MyPromptComponent() {
  const source = `<Prompt name="greeting">
  <Task>Say hello to the user.</Task>
</Prompt>`;

  return (
    <PromptRenderer source={source} autoRender>
      {({ output, error, isRendering, copyToClipboard }) => (
        <div>
          {isRendering ? (
            <p>Rendering...</p>
          ) : error ? (
            <p>Error: {error.message}</p>
          ) : (
            <>
              <pre>{output}</pre>
              <button onClick={copyToClipboard}>Copy</button>
            </>
          )}
        </div>
      )}
    </PromptRenderer>
  );
}
```

### Using Hooks Directly

For more control, use the hooks directly:

```tsx
import { usePupt, usePromptRender } from "pupt-react";

function MyComponent() {
  const { transformer, registry } = usePupt();
  const { output, render, isRendering, error } = usePromptRender({
    source: { type: "source", value: "<Prompt><Task>Hello</Task></Prompt>" },
    autoRender: true,
  });

  return <div>{output}</div>;
}
```

## Components

### PuptProvider

Context provider that initializes pupt-lib and provides configuration to child components.

```tsx
<PuptProvider
  registry={customRegistry}  // Optional custom ComponentRegistry
  searchEngine={searchEngine} // Optional SearchEngine instance
>
  {children}
</PuptProvider>
```

### PromptRenderer

Headless component for transforming and rendering prompts.

```tsx
<PromptRenderer
  source={source}           // Prompt source string
  inputs={inputsMap}        // Map of user input values
  autoRender={true}         // Auto-render when source changes
>
  {(props) => (
    // props: output, error, isRendering, pendingInputs, copyToClipboard, isCopied
  )}
</PromptRenderer>
```

### PromptEditor

Headless component for editing prompt source with transformation preview.

```tsx
<PromptEditor
  defaultValue={source}
  onChange={handleChange}
  debounce={300}
>
  {({ inputProps, value, error, isTransforming }) => (
    <textarea {...inputProps} />
  )}
</PromptEditor>
```

### AskHandler

Headless component for handling Ask input requirements.

```tsx
<AskHandler
  element={element}
  onComplete={(inputs) => console.log(inputs)}
>
  {({ requirements, current, progress, getInputProps, next, previous }) => (
    // Render your custom form UI
  )}
</AskHandler>
```

## Hooks

### usePupt

Access the PuptProvider context:

```tsx
const { transformer, registry, searchEngine, isLoading, error } = usePupt();
```

### usePromptRender

Transform and render prompts:

```tsx
const {
  source,
  setSource,
  element,
  output,
  error,
  isTransforming,
  isRendering,
  inputRequirements,
  render,
  transform,
} = usePromptRender({
  source: { type: "source", value: promptString },
  inputs: inputsMap,
  autoRender: true,
});
```

### useAskIterator

Iterate through Ask inputs and collect validated responses:

```tsx
const {
  current,
  currentIndex,
  totalInputs,
  inputs,
  isDone,
  submit,
  next,
  previous,
  reset,
  getValue,
  setValue,
} = useAskIterator({
  element,
  onComplete: (inputs) => console.log("All inputs collected", inputs),
});
```

### usePromptSearch

Search through available prompts:

```tsx
const { query, setQuery, results, isSearching, clear } = usePromptSearch({
  debounce: 300,
  limit: 10,
});
```

### usePostActions

Handle post-execution actions:

```tsx
const { pendingActions, executedActions, execute, executeAll, dismiss } =
  usePostActions({
    actions,
    handlers: {
      openUrl: (url) => window.open(url),
    },
  });
```

## Demo

A demo website showcasing pupt-react capabilities is included. To run locally:

```bash
npm run dev:demo
```

Or build for production:

```bash
npm run build:demo
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build library
npm run build

# Build demo
npm run build:demo
```

## Requirements

- React 18.0.0 or later
- pupt-lib (peer dependency)

## License

MIT
