# Implementation Plan for pupt-react

## Overview

pupt-react is a headless React component library for integrating pupt-lib into web applications. It provides hooks and render-prop components for prompt searching, transformation, rendering, and user input collection through the Ask system. A Mantine-based demo website showcases the library capabilities.

The implementation is divided into 9 phases, each building incrementally on the previous and delivering testable, verifiable functionality.

---

## Phase Breakdown

### Phase 1: Project Setup & Core Infrastructure

**Objective**: Establish the project foundation with build tools, testing infrastructure, and CI pipeline.

**Duration**: 1-2 days

**Tests to Write First**:
- `test/setup.ts`: Test setup file with React testing utilities
- `test/unit/smoke.test.ts`: Basic smoke test to verify testing infrastructure
  ```typescript
  // Verify test infrastructure works
  describe('smoke test', () => {
    it('should run tests', () => {
      expect(true).toBe(true);
    });

    it('should import React', async () => {
      const React = await import('react');
      expect(React).toBeDefined();
    });
  });
  ```

**Implementation**:
- `package.json`: Initialize with dependencies, scripts, peer dependencies
  ```typescript
  // Key structure:
  // - peerDependencies: react ^18.0.0, react-dom ^18.0.0
  // - dependencies: pupt-lib
  // - devDependencies: vite, vitest, typescript, eslint, etc.
  ```
- `tsconfig.json`: TypeScript configuration for library
- `vite.config.ts`: Vite build configuration for library output
- `vitest.config.ts`: Vitest configuration with jsdom and browser projects
- `eslint.config.mjs`: ESLint flat config with React rules
- `knip.json`: Unused code detection configuration
- `.github/workflows/ci.yml`: Basic CI pipeline (lint, build, test)
- `src/index.ts`: Empty entry point
- `src/types/index.ts`: Empty types export

**Dependencies**:
- External: vite, typescript, vitest, @testing-library/react, jsdom, eslint, react (dev)
- Internal: None (first phase)

**Verification**:
1. Run: `npm install` - Dependencies install without errors
2. Run: `npm run lint` - Linting passes (may have no files to lint)
3. Run: `npm run build` - Build completes, creates `dist/` folder
4. Run: `npm test` - Smoke tests pass
5. Check GitHub Actions CI runs successfully on push

---

### Phase 2: PuptProvider & Core Context

**Objective**: Implement the context provider and primary hook for accessing pupt-lib functionality.

**Duration**: 2-3 days

**Tests to Write First**:
- `test/unit/context/PuptContext.test.tsx`: Context creation and value tests
  ```typescript
  describe('PuptContext', () => {
    it('should create context with default values', () => {
      const { result } = renderHook(() => useContext(PuptContext));
      expect(result.current).toBeDefined();
      expect(result.current.pupt).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
  ```
- `test/unit/components/PuptProvider.test.tsx`: Provider initialization tests
  ```typescript
  describe('PuptProvider', () => {
    it('should initialize pupt-lib instance', async () => {
      const { result } = renderHook(() => usePupt(), {
        wrapper: ({ children }) => <PuptProvider>{children}</PuptProvider>,
      });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.pupt).toBeDefined();
    });

    it('should accept custom registry', async () => {
      const customRegistry = new ComponentRegistry();
      const { result } = renderHook(() => usePupt(), {
        wrapper: ({ children }) => (
          <PuptProvider registry={customRegistry}>{children}</PuptProvider>
        ),
      });
      await waitFor(() => expect(result.current.registry).toBe(customRegistry));
    });

    it('should handle initialization errors', async () => {
      // Test with invalid configuration
    });
  });
  ```
- `test/unit/hooks/usePupt.test.tsx`: Hook behavior tests
  ```typescript
  describe('usePupt', () => {
    it('should throw when used outside provider', () => {
      const { result } = renderHook(() => usePupt());
      expect(result.error).toBeDefined();
    });

    it('should return context value when inside provider', () => {
      const { result } = renderHook(() => usePupt(), {
        wrapper: PuptProvider,
      });
      expect(result.current.transformer).toBeDefined();
    });
  });
  ```

**Implementation**:
- `src/types/context.ts`: Context type definitions
  ```typescript
  interface PuptContextValue {
    pupt: Pupt | null;
    registry: ComponentRegistry;
    transformer: Transformer;
    searchEngine: SearchEngine | null;
    isLoading: boolean;
    error: Error | null;
  }
  ```
- `src/context/PuptContext.tsx`: Context definition and default value
- `src/context/index.ts`: Context exports
- `src/components/PuptProvider.tsx`: Provider component with pupt-lib initialization
- `src/components/index.ts`: Component exports
- `src/hooks/usePupt.ts`: Hook to access context
- `src/hooks/index.ts`: Hook exports
- `src/index.ts`: Update main exports

**Dependencies**:
- External: pupt-lib, react
- Internal: Types from Phase 1

**Verification**:
1. Run: `npm test` - All context and provider tests pass
2. Run: `npm run build` - Build succeeds with type definitions generated
3. Create a minimal test app:
   ```tsx
   // In a test file or playground
   function TestApp() {
     return (
       <PuptProvider>
         <TestConsumer />
       </PuptProvider>
     );
   }
   function TestConsumer() {
     const { pupt, isLoading } = usePupt();
     return <div>{isLoading ? 'Loading...' : pupt ? 'Ready' : 'Error'}</div>;
   }
   ```
4. Verify console shows no React warnings about context

---

### Phase 3: usePromptRender Hook

**Objective**: Implement the core hook for transforming JSX/prompt source into rendered text output.

**Duration**: 2-3 days

**Tests to Write First**:
- `test/unit/hooks/usePromptRender.test.tsx`: Rendering hook tests
  ```typescript
  describe('usePromptRender', () => {
    it('should transform source text to element', async () => {
      const source = '<Prompt name="test"><Task>Hello</Task></Prompt>';
      const { result } = renderHook(
        () => usePromptRender({ source: { type: 'source', value: source } }),
        { wrapper: PuptProvider }
      );
      await waitFor(() => expect(result.current.element).not.toBeNull());
      expect(result.current.element?.type).toBe('Prompt');
    });

    it('should render element to text output', async () => {
      const source = '<Prompt name="test"><Task>Say hello</Task></Prompt>';
      const { result } = renderHook(
        () => usePromptRender({
          source: { type: 'source', value: source },
          autoRender: true
        }),
        { wrapper: PuptProvider }
      );
      await waitFor(() => expect(result.current.output).not.toBeNull());
      expect(result.current.output).toContain('Say hello');
    });

    it('should extract input requirements from Ask components', async () => {
      const source = `
        <Prompt name="test">
          <Ask.Text name="userName" label="Your name" />
        </Prompt>
      `;
      const { result } = renderHook(
        () => usePromptRender({ source: { type: 'source', value: source } }),
        { wrapper: PuptProvider }
      );
      await waitFor(() => expect(result.current.inputRequirements.length).toBe(1));
      expect(result.current.inputRequirements[0].name).toBe('userName');
    });

    it('should re-render when inputs change', async () => {
      const source = '<Prompt><Ask.Text name="name" /></Prompt>';
      const { result, rerender } = renderHook(
        ({ inputs }) => usePromptRender({
          source: { type: 'source', value: source },
          inputs,
          autoRender: true
        }),
        {
          wrapper: PuptProvider,
          initialProps: { inputs: new Map() }
        }
      );

      const newInputs = new Map([['name', 'Alice']]);
      rerender({ inputs: newInputs });
      await waitFor(() => expect(result.current.output).toContain('Alice'));
    });

    it('should handle transformation errors gracefully', async () => {
      const invalidSource = '<Prompt><InvalidJSX</Prompt>';
      const { result } = renderHook(
        () => usePromptRender({ source: { type: 'source', value: invalidSource } }),
        { wrapper: PuptProvider }
      );
      await waitFor(() => expect(result.current.error).not.toBeNull());
      expect(result.current.element).toBeNull();
    });

    it('should expose manual render trigger', async () => {
      const source = '<Prompt><Task>Manual test</Task></Prompt>';
      const { result } = renderHook(
        () => usePromptRender({ source: { type: 'source', value: source }, autoRender: false }),
        { wrapper: PuptProvider }
      );

      expect(result.current.output).toBeNull();
      await act(async () => {
        await result.current.render();
      });
      expect(result.current.output).toContain('Manual test');
    });
  });
  ```

**Implementation**:
- `src/types/hooks.ts`: Hook return types and options
  ```typescript
  type PromptSource =
    | { type: 'source'; value: string }
    | { type: 'element'; value: PuptElement };

  interface UsePromptRenderOptions {
    source?: PromptSource;
    inputs?: Map<string, unknown>;
    environment?: Partial<EnvironmentContext>;
    autoRender?: boolean;
  }

  interface UsePromptRenderReturn {
    source: PromptSource | null;
    setSource: (source: PromptSource) => void;
    element: PuptElement | null;
    output: string | null;
    error: Error | null;
    isTransforming: boolean;
    isRendering: boolean;
    isLoading: boolean;
    inputRequirements: InputRequirement[];
    postActions: PostAction[];
    render: () => Promise<void>;
    transform: () => Promise<PuptElement | null>;
  }
  ```
- `src/hooks/usePromptRender.ts`: Main rendering hook implementation
- `src/utils/transform.ts`: Utility functions for transformation/parsing
- `src/utils/index.ts`: Utility exports
- Update `src/hooks/index.ts`: Add usePromptRender export

**Dependencies**:
- External: pupt-lib (Transformer, ComponentRegistry)
- Internal: PuptContext, usePupt

**Verification**:
1. Run: `npm test -- --grep usePromptRender` - All hook tests pass
2. Create integration test:
   ```tsx
   function RenderDemo() {
     const { output, error, isLoading } = usePromptRender({
       source: { type: 'source', value: '<Prompt><Task>Hello World</Task></Prompt>' },
       autoRender: true,
     });
     if (isLoading) return <div>Loading...</div>;
     if (error) return <div>Error: {error.message}</div>;
     return <pre>{output}</pre>;
   }
   ```
3. Verify output contains expected transformed text

---

### Phase 4: useAskIterator Hook & Input Collection

**Objective**: Implement the hook for iterating through Ask questions and collecting validated user input.

**Duration**: 2-3 days

**Tests to Write First**:
- `test/unit/hooks/useAskIterator.test.tsx`: Ask iteration tests
  ```typescript
  describe('useAskIterator', () => {
    const createElementWithAsks = () => {
      // Helper to create a mock PuptElement with Ask components
    };

    it('should extract all input requirements from element', () => {
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: PuptProvider }
      );
      expect(result.current.totalInputs).toBe(3);
    });

    it('should start at first input requirement', () => {
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: PuptProvider }
      );
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.current).not.toBeNull();
    });

    it('should advance to next input after valid submission', async () => {
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: PuptProvider }
      );

      await act(async () => {
        const validation = await result.current.submit('test value');
        expect(validation.valid).toBe(true);
      });
      expect(result.current.currentIndex).toBe(1);
    });

    it('should validate input before accepting', async () => {
      const element = createElementWithAsks(); // with number input
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: PuptProvider }
      );

      await act(async () => {
        const validation = await result.current.submit('not a number');
        expect(validation.valid).toBe(false);
        expect(validation.message).toBeDefined();
      });
      expect(result.current.currentIndex).toBe(0); // Did not advance
    });

    it('should allow navigation to previous input', async () => {
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: PuptProvider }
      );

      await act(async () => {
        await result.current.submit('first');
        await result.current.submit('second');
      });
      expect(result.current.currentIndex).toBe(2);

      act(() => result.current.previous());
      expect(result.current.currentIndex).toBe(1);
    });

    it('should track isDone when all inputs collected', async () => {
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: PuptProvider }
      );

      expect(result.current.isDone).toBe(false);
      // Submit all inputs...
      await waitFor(() => expect(result.current.isDone).toBe(true));
    });

    it('should call onComplete callback when done', async () => {
      const onComplete = vi.fn();
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element, onComplete }),
        { wrapper: PuptProvider }
      );

      // Submit all inputs...
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
      expect(onComplete).toHaveBeenCalledWith(expect.any(Map));
    });

    it('should allow direct value access and setting', async () => {
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: PuptProvider }
      );

      await act(async () => {
        await result.current.setValue('fieldName', 'direct value');
      });
      expect(result.current.getValue('fieldName')).toBe('direct value');
    });

    it('should reset to beginning', async () => {
      const element = createElementWithAsks();
      const { result } = renderHook(
        () => useAskIterator({ element }),
        { wrapper: PuptProvider }
      );

      await act(async () => {
        await result.current.submit('value');
      });
      expect(result.current.currentIndex).toBe(1);

      act(() => result.current.reset());
      expect(result.current.currentIndex).toBe(0);
      expect(result.current.inputs.size).toBe(0);
    });
  });
  ```

**Implementation**:
- `src/types/hooks.ts`: Add UseAskIteratorOptions and UseAskIteratorReturn
  ```typescript
  interface InputRequirement {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'file' | 'path' | 'secret' | 'rating';
    label?: string;
    description?: string;
    required?: boolean;
    placeholder?: string;
    defaultValue?: unknown;
    options?: Array<{ value: string; label?: string }>;
    min?: number;
    max?: number;
    // ... other type-specific properties
  }

  interface ValidationResult {
    valid: boolean;
    message?: string;
    field?: string;
  }
  ```
- `src/hooks/useAskIterator.ts`: Iterator hook implementation
- `src/utils/validation.ts`: Input validation utilities
- Update `src/hooks/index.ts`: Add useAskIterator export

**Dependencies**:
- External: pupt-lib (Ask component types, validation)
- Internal: PuptContext, usePromptRender types

**Verification**:
1. Run: `npm test -- --grep useAskIterator` - All iterator tests pass
2. Create integration test combining render and ask:
   ```tsx
   function AskDemo() {
     const { element } = usePromptRender({
       source: { type: 'source', value: '<Prompt><Ask.Text name="name" label="Name" /></Prompt>' }
     });
     const { current, submit, isDone, inputs } = useAskIterator({ element });

     if (isDone) return <div>Collected: {JSON.stringify([...inputs])}</div>;
     return (
       <div>
         <label>{current?.label}</label>
         <input onChange={(e) => submit(e.target.value)} />
       </div>
     );
   }
   ```
3. Verify inputs are collected and accessible

---

### Phase 5: usePromptSearch & usePostActions Hooks

**Objective**: Implement search functionality and post-execution action handling.

**Duration**: 1-2 days

**Tests to Write First**:
- `test/unit/hooks/usePromptSearch.test.tsx`: Search hook tests
  ```typescript
  describe('usePromptSearch', () => {
    const searchablePrompts = [
      { name: 'greeting', content: '<Prompt>Say hello</Prompt>', tags: ['simple'] },
      { name: 'code-review', content: '<Prompt>Review code</Prompt>', tags: ['dev'] },
    ];

    it('should return empty results initially', () => {
      const { result } = renderHook(
        () => usePromptSearch(),
        { wrapper: createProviderWithPrompts(searchablePrompts) }
      );
      expect(result.current.results).toEqual([]);
      expect(result.current.query).toBe('');
    });

    it('should search prompts by name', async () => {
      const { result } = renderHook(
        () => usePromptSearch(),
        { wrapper: createProviderWithPrompts(searchablePrompts) }
      );

      act(() => result.current.setQuery('greeting'));
      await waitFor(() => expect(result.current.results.length).toBeGreaterThan(0));
      expect(result.current.results[0].name).toBe('greeting');
    });

    it('should debounce search queries', async () => {
      const { result } = renderHook(
        () => usePromptSearch({ debounce: 100 }),
        { wrapper: createProviderWithPrompts(searchablePrompts) }
      );

      act(() => {
        result.current.setQuery('g');
        result.current.setQuery('gr');
        result.current.setQuery('gre');
      });

      // Should only trigger one search after debounce
      await waitFor(() => expect(result.current.isSearching).toBe(false));
    });

    it('should respect limit option', async () => {
      const { result } = renderHook(
        () => usePromptSearch({ limit: 1 }),
        { wrapper: createProviderWithPrompts(searchablePrompts) }
      );

      act(() => result.current.setQuery('prompt'));
      await waitFor(() => expect(result.current.results.length).toBeLessThanOrEqual(1));
    });

    it('should clear search', async () => {
      const { result } = renderHook(
        () => usePromptSearch(),
        { wrapper: createProviderWithPrompts(searchablePrompts) }
      );

      act(() => result.current.setQuery('test'));
      await waitFor(() => expect(result.current.query).toBe('test'));

      act(() => result.current.clear());
      expect(result.current.query).toBe('');
      expect(result.current.results).toEqual([]);
    });
  });
  ```
- `test/unit/hooks/usePostActions.test.tsx`: Post-action hook tests
  ```typescript
  describe('usePostActions', () => {
    const mockActions: PostAction[] = [
      { type: 'openUrl', payload: { url: 'https://example.com' } },
      { type: 'runCommand', payload: { command: 'echo', args: ['hello'] } },
    ];

    it('should track pending actions', () => {
      const { result } = renderHook(
        () => usePostActions({ actions: mockActions })
      );
      expect(result.current.pendingActions).toEqual(mockActions);
      expect(result.current.executedActions).toEqual([]);
    });

    it('should execute action and move to executed', async () => {
      const { result } = renderHook(
        () => usePostActions({ actions: mockActions })
      );

      await act(async () => {
        await result.current.execute(mockActions[0]);
      });

      expect(result.current.pendingActions).not.toContain(mockActions[0]);
      expect(result.current.executedActions).toContain(mockActions[0]);
    });

    it('should use custom handlers when provided', async () => {
      const customHandler = vi.fn();
      const { result } = renderHook(
        () => usePostActions({
          actions: mockActions,
          handlers: { openUrl: customHandler }
        })
      );

      await act(async () => {
        await result.current.execute(mockActions[0]);
      });

      expect(customHandler).toHaveBeenCalledWith('https://example.com');
    });

    it('should dismiss action without executing', () => {
      const { result } = renderHook(
        () => usePostActions({ actions: mockActions })
      );

      act(() => result.current.dismiss(mockActions[0]));

      expect(result.current.pendingActions).not.toContain(mockActions[0]);
      expect(result.current.executedActions).not.toContain(mockActions[0]);
    });

    it('should execute all pending actions', async () => {
      const { result } = renderHook(
        () => usePostActions({ actions: mockActions })
      );

      await act(async () => {
        await result.current.executeAll();
      });

      expect(result.current.pendingActions).toEqual([]);
      expect(result.current.executedActions.length).toBe(mockActions.length);
    });
  });
  ```

**Implementation**:
- `src/hooks/usePromptSearch.ts`: Search hook with debouncing
- `src/hooks/usePostActions.ts`: Post-action management hook
- `src/types/hooks.ts`: Add PostAction and related types
- Update `src/hooks/index.ts`: Add new hook exports

**Dependencies**:
- External: pupt-lib (SearchEngine)
- Internal: PuptContext

**Verification**:
1. Run: `npm test -- --grep "usePromptSearch|usePostActions"` - All tests pass
2. Create integration test:
   ```tsx
   function SearchDemo() {
     const { query, setQuery, results, isSearching } = usePromptSearch();
     return (
       <div>
         <input value={query} onChange={(e) => setQuery(e.target.value)} />
         {isSearching ? <span>Searching...</span> : null}
         <ul>{results.map(r => <li key={r.name}>{r.name}</li>)}</ul>
       </div>
     );
   }
   ```
3. Verify search returns results and debouncing works

---

### Phase 6: Headless Components

**Objective**: Implement the headless render-prop components for maximum UI flexibility.

**Duration**: 2-3 days

**Tests to Write First**:
- `test/unit/components/PromptEditor.test.tsx`: Editor component tests
  ```typescript
  describe('PromptEditor', () => {
    it('should render with default value', () => {
      const { getByRole } = render(
        <PuptProvider>
          <PromptEditor defaultValue="<Prompt>Test</Prompt>">
            {({ inputProps }) => <textarea {...inputProps} />}
          </PromptEditor>
        </PuptProvider>
      );
      expect(getByRole('textbox')).toHaveValue('<Prompt>Test</Prompt>');
    });

    it('should call onChange when value changes', async () => {
      const onChange = vi.fn();
      const { getByRole } = render(
        <PuptProvider>
          <PromptEditor onChange={onChange}>
            {({ inputProps }) => <textarea {...inputProps} />}
          </PromptEditor>
        </PuptProvider>
      );

      await userEvent.type(getByRole('textbox'), 'new text');
      expect(onChange).toHaveBeenCalled();
    });

    it('should expose transformation state', async () => {
      let renderProps: PromptEditorRenderProps;
      render(
        <PuptProvider>
          <PromptEditor defaultValue="<InvalidJSX">
            {(props) => {
              renderProps = props;
              return <textarea {...props.inputProps} />;
            }}
          </PromptEditor>
        </PuptProvider>
      );

      await waitFor(() => expect(renderProps.error).not.toBeNull());
    });

    it('should debounce transformation', async () => {
      // Verify rapid typing doesn't trigger multiple transformations
    });
  });
  ```
- `test/unit/components/PromptRenderer.test.tsx`: Renderer component tests
  ```typescript
  describe('PromptRenderer', () => {
    it('should render output when ready', async () => {
      const source = '<Prompt><Task>Hello</Task></Prompt>';
      let renderProps: PromptRendererRenderProps;

      render(
        <PuptProvider>
          <PromptRenderer source={source} autoRender>
            {(props) => {
              renderProps = props;
              return <pre>{props.output}</pre>;
            }}
          </PromptRenderer>
        </PuptProvider>
      );

      await waitFor(() => expect(renderProps.output).not.toBeNull());
      expect(renderProps.isReady).toBe(true);
    });

    it('should expose pending inputs when Ask components present', async () => {
      const source = '<Prompt><Ask.Text name="name" /></Prompt>';
      let renderProps: PromptRendererRenderProps;

      render(
        <PuptProvider>
          <PromptRenderer source={source}>
            {(props) => {
              renderProps = props;
              return <div>{props.pendingInputs.length} inputs needed</div>;
            }}
          </PromptRenderer>
        </PuptProvider>
      );

      await waitFor(() => expect(renderProps.pendingInputs.length).toBe(1));
      expect(renderProps.isReady).toBe(false);
    });

    it('should provide clipboard copy functionality', async () => {
      const source = '<Prompt><Task>Copy me</Task></Prompt>';
      let renderProps: PromptRendererRenderProps;

      render(
        <PuptProvider>
          <PromptRenderer source={source} autoRender>
            {(props) => {
              renderProps = props;
              return <button onClick={props.copyToClipboard}>Copy</button>;
            }}
          </PromptRenderer>
        </PuptProvider>
      );

      await waitFor(() => expect(renderProps.output).not.toBeNull());
      await userEvent.click(screen.getByRole('button'));
      expect(renderProps.isCopied).toBe(true);
    });
  });
  ```
- `test/unit/components/AskHandler.test.tsx`: Ask handler component tests
  ```typescript
  describe('AskHandler', () => {
    it('should provide all input requirements', () => {
      const element = createElementWithAsks();
      let renderProps: AskHandlerRenderProps;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              renderProps = props;
              return <div>{props.requirements.length} inputs</div>;
            }}
          </AskHandler>
        </PuptProvider>
      );

      expect(renderProps.requirements.length).toBeGreaterThan(0);
    });

    it('should track progress through inputs', async () => {
      const element = createElementWithAsks();
      let renderProps: AskHandlerRenderProps;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              renderProps = props;
              return (
                <div>
                  Progress: {props.progress}%
                  <button onClick={props.next}>Next</button>
                </div>
              );
            }}
          </AskHandler>
        </PuptProvider>
      );

      expect(renderProps.progress).toBe(0);
      // Fill in value and advance...
      await waitFor(() => expect(renderProps.progress).toBeGreaterThan(0));
    });

    it('should provide input props for each requirement', () => {
      const element = createElementWithAsks();
      let renderProps: AskHandlerRenderProps;

      render(
        <PuptProvider>
          <AskHandler element={element}>
            {(props) => {
              renderProps = props;
              const inputProps = props.getInputProps('fieldName');
              return <input {...inputProps.inputProps} />;
            }}
          </AskHandler>
        </PuptProvider>
      );

      const inputProps = renderProps.getInputProps('fieldName');
      expect(inputProps.inputProps.id).toBeDefined();
      expect(inputProps.inputProps.name).toBe('fieldName');
    });

    it('should call onComplete when all inputs filled', async () => {
      const onComplete = vi.fn();
      const element = createElementWithAsks();

      // Render and fill all inputs...
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
    });
  });
  ```

**Implementation**:
- `src/types/components.ts`: Component prop types
- `src/components/PromptEditor.tsx`: Headless editor component
- `src/components/PromptRenderer.tsx`: Headless renderer component
- `src/components/AskHandler.tsx`: Headless ask handler component
- Update `src/components/index.ts`: Add component exports
- Update `src/index.ts`: Export all components

**Dependencies**:
- External: react
- Internal: All hooks from previous phases

**Verification**:
1. Run: `npm test -- --grep "PromptEditor|PromptRenderer|AskHandler"` - All tests pass
2. Run: `npm run build` - Build succeeds with all component types exported
3. Create combined demo:
   ```tsx
   function HeadlessDemo() {
     return (
       <PuptProvider>
         <PromptEditor>
           {({ value, onChange, inputProps }) => (
             <textarea {...inputProps} />
           )}
         </PromptEditor>
         <PromptRenderer source={value} autoRender>
           {({ output, copyToClipboard }) => (
             <div>
               <pre>{output}</pre>
               <button onClick={copyToClipboard}>Copy</button>
             </div>
           )}
         </PromptRenderer>
       </PuptProvider>
     );
   }
   ```
4. Verify render props pattern works correctly

---

### Phase 7: Demo Website - Foundation & Layout

**Objective**: Set up the demo website with Mantine, basic layout, and navigation structure.

**Duration**: 1-2 days

**Tests to Write First**:
- `test/integration/demo/Layout.test.tsx`: Layout component tests
  ```typescript
  describe('Demo Layout', () => {
    it('should render header with title', () => {
      render(<App />);
      expect(screen.getByText('pupt-react Demo')).toBeInTheDocument();
    });

    it('should render two-column layout', () => {
      render(<App />);
      expect(screen.getByTestId('left-panel')).toBeInTheDocument();
      expect(screen.getByTestId('right-panel')).toBeInTheDocument();
    });

    it('should include GitHub link in header', () => {
      render(<App />);
      const link = screen.getByRole('link', { name: /github/i });
      expect(link).toHaveAttribute('href', expect.stringContaining('github.com'));
    });
  });
  ```

**Implementation**:
- `demo/index.html`: HTML entry point
- `demo/vite.config.ts`: Vite config for demo with base path for GitHub Pages
  ```typescript
  export default defineConfig({
    base: '/pupt-react/',
    plugins: [react()],
    // ...
  });
  ```
- `demo/src/main.tsx`: React entry point
- `demo/src/App.tsx`: Root component with Mantine and Pupt providers
  ```typescript
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
- `demo/src/theme/index.ts`: Mantine theme configuration
- `demo/src/components/Layout.tsx`: AppShell with header and grid layout
- `demo/src/components/Header.tsx`: Demo header with title and GitHub link
- `demo/src/components/index.ts`: Component exports
- `demo/src/styles/global.css`: Global styles
- `tsconfig.demo.json`: TypeScript config for demo
- Update `package.json`: Add `build:demo` and `dev` scripts

**Dependencies**:
- External: @mantine/core, @mantine/hooks, @tabler/icons-react, react, react-dom
- Internal: pupt-react library (src/)

**Verification**:
1. Run: `npm run dev` - Demo starts on configured port (9000-9099)
2. Open browser to dev server URL
3. Verify header displays "pupt-react Demo"
4. Verify two-column layout is visible
5. Verify GitHub link navigates to repository
6. Run: `npm run build:demo` - Demo builds successfully

---

### Phase 8: Demo Website - Prompt Input Panel

**Objective**: Implement the left panel with Monaco editor, format selection, and example prompts.

**Duration**: 2-3 days

**Tests to Write First**:
- `test/integration/demo/PromptInput.test.tsx`: Input panel tests
  ```typescript
  describe('PromptInput', () => {
    it('should render Monaco editor', async () => {
      render(<App />);
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    it('should have format selector with JSX and Prompt options', () => {
      render(<App />);
      const select = screen.getByRole('combobox', { name: /format/i });
      expect(select).toBeInTheDocument();
    });

    it('should load default example on mount', async () => {
      render(<App />);
      await waitFor(() => {
        // Editor should contain default prompt
        expect(screen.getByText(/Prompt/)).toBeInTheDocument();
      });
    });

    it('should show example picker', () => {
      render(<App />);
      expect(screen.getByText(/examples/i)).toBeInTheDocument();
    });

    it('should load example when clicked', async () => {
      render(<App />);
      const exampleButton = screen.getByRole('button', { name: /simple greeting/i });
      await userEvent.click(exampleButton);
      // Verify editor content changed
    });
  });
  ```

**Implementation**:
- `demo/src/components/PromptInput.tsx`: Left panel component
  ```typescript
  function PromptInput() {
    const [value, setValue] = useState(DEFAULT_PROMPT);
    const [format, setFormat] = useState<'jsx' | 'prompt'>('jsx');

    return (
      <Stack>
        <Group justify="space-between">
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
- `demo/src/components/ExamplePicker.tsx`: Example prompt selector
- `demo/src/data/examples.ts`: Built-in example prompts
  ```typescript
  export const EXAMPLES = [
    {
      name: 'Simple Greeting',
      source: `<Prompt name="greeting">
    <Task>Say hello to the user</Task>
  </Prompt>`,
    },
    // ... more examples
  ];
  ```
- `demo/src/context/DemoContext.tsx`: Shared state between panels (source, inputs)
- Update `demo/src/App.tsx`: Add DemoContext provider

**Dependencies**:
- External: @monaco-editor/react, @mantine/core
- Internal: pupt-react library, DemoContext

**Verification**:
1. Run: `npm run dev` - Demo starts
2. Verify Monaco editor renders and accepts input
3. Verify format dropdown changes editor language highlighting
4. Verify example picker displays all example prompts
5. Click each example and verify editor content updates
6. Type in editor and verify changes persist
7. Use Playwright MCP to screenshot the input panel
8. Ask Nanobanana: "Does the screenshot show a code editor with syntax highlighting?" (YES/NO)

---

### Phase 9: Demo Website - Output Panel & Ask Inputs

**Objective**: Implement the right panel with rendered output, Ask input forms, and copy functionality.

**Duration**: 2-3 days

**Tests to Write First**:
- `test/integration/demo/PromptOutput.test.tsx`: Output panel tests
  ```typescript
  describe('PromptOutput', () => {
    it('should display rendered output', async () => {
      render(<App />);
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId('rendered-output')).not.toBeEmpty();
      });
    });

    it('should show copy button', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
    });

    it('should copy output to clipboard', async () => {
      render(<App />);
      await waitFor(() => screen.getByTestId('rendered-output'));

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await userEvent.click(copyButton);

      expect(screen.getByText(/copied/i)).toBeInTheDocument();
    });

    it('should display error messages', async () => {
      // Enter invalid JSX and verify error shows
    });
  });
  ```
- `test/integration/demo/AskInputs.test.tsx`: Ask inputs UI tests
  ```typescript
  describe('AskInputs', () => {
    it('should render text input for Ask.Text', async () => {
      // Load example with Ask.Text
      render(<App />);
      // Select example with Ask
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
      });
    });

    it('should render select for Ask.Select', async () => {
      // Load example with Ask.Select
    });

    it('should render checkbox for Ask.Confirm', async () => {
      // Load example with Ask.Confirm
    });

    it('should update output when input provided', async () => {
      render(<App />);
      // Load example with Ask.Text
      const input = screen.getByRole('textbox', { name: /name/i });
      await userEvent.type(input, 'Alice');

      await waitFor(() => {
        expect(screen.getByTestId('rendered-output')).toHaveTextContent('Alice');
      });
    });

    it('should show validation errors', async () => {
      // Test with required field left empty
    });
  });
  ```

**Implementation**:
- `demo/src/components/PromptOutput.tsx`: Right panel component
  ```typescript
  function PromptOutput() {
    const { source } = useDemoContext();

    return (
      <PromptRenderer source={source} autoRender>
        {({ output, error, isRendering, pendingInputs, copyToClipboard, isCopied }) => (
          <Stack>
            <Group justify="space-between">
              <Title order={3}>Rendered Output</Title>
              <CopyButton value={output} copied={isCopied} onClick={copyToClipboard} />
            </Group>

            {error && <Alert color="red">{error.message}</Alert>}

            {isRendering ? <Loader /> : <CodeHighlight code={output || ''} />}

            {pendingInputs.length > 0 && (
              <AskInputsPanel requirements={pendingInputs} />
            )}
          </Stack>
        )}
      </PromptRenderer>
    );
  }
  ```
- `demo/src/components/AskInputs.tsx`: Dynamic form for all Ask input types
- `demo/src/components/AskInput.tsx`: Individual input component by type
- `demo/src/components/CopyButton.tsx`: Copy to clipboard button

**Dependencies**:
- External: @mantine/core, @mantine/code-highlight, @mantine/dates
- Internal: pupt-react library, DemoContext

**Verification**:
1. Run: `npm run dev` - Demo starts
2. Verify default prompt renders output in right panel
3. Verify copy button copies text to clipboard
4. Load "With Variables" example - verify text input appears
5. Type in Ask input - verify output updates with value
6. Load "All Ask Types" example - verify all input types render
7. Test validation by submitting invalid values
8. Use Playwright MCP to screenshot the full demo with Ask inputs visible
9. Ask Nanobanana: "Does the screenshot show a two-column layout with a text editor on the left and rendered output with form inputs on the right?" (YES/NO)
10. Run: `npm run build:demo` - Demo builds without errors

---

### Phase 10: CI/CD, Polish & Documentation

**Objective**: Complete CI/CD pipeline, GitHub Pages deployment, final testing, and documentation.

**Duration**: 1-2 days

**Tests to Write First**:
- `test/integration/full-flow.test.tsx`: End-to-end flow tests
  ```typescript
  describe('Full Flow Integration', () => {
    it('should complete full prompt editing and rendering flow', async () => {
      render(<App />);

      // 1. Enter prompt in editor
      // 2. Wait for transformation
      // 3. Fill any Ask inputs
      // 4. Verify rendered output
      // 5. Copy to clipboard
    });

    it('should handle all example prompts without errors', async () => {
      for (const example of EXAMPLES) {
        render(<App />);
        // Load example
        // Verify no errors
        // Verify output renders
      }
    });
  });
  ```
- `test/browser/demo.spec.ts`: Playwright browser tests
  ```typescript
  test.describe('Demo Website', () => {
    test('should load and render', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('pupt-react Demo')).toBeVisible();
    });

    test('should render prompt output', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByTestId('rendered-output')).not.toBeEmpty();
    });

    test('should handle Ask inputs', async ({ page }) => {
      await page.goto('/');
      // Select example with Ask
      // Fill input
      // Verify output updates
    });
  });
  ```

**Implementation**:
- `.github/workflows/ci.yml`: Complete CI pipeline (from design doc)
- `.github/workflows/deploy.yml`: GitHub Pages deployment (from design doc)
- `.releaserc`: Semantic release configuration
- `.husky/commit-msg`: Commitlint hook
- `.husky/pre-push`: Lint + test hook
- `commitlint.config.js`: Commitlint configuration
- `README.md`: Documentation with usage examples
- `LICENSE`: MIT license file
- Update `package.json`: Ensure all scripts are correct
- Final code review and cleanup

**Dependencies**:
- External: husky, commitlint, semantic-release packages
- Internal: All previous phases

**Verification**:
1. Run: `npm run lint` - No linting errors
2. Run: `npm run build` - Library builds successfully
3. Run: `npm run build:demo` - Demo builds successfully
4. Run: `npm test` - All tests pass
5. Run: `npm run test:coverage` - Coverage meets threshold
6. Push to GitHub - CI pipeline runs successfully
7. Verify GitHub Pages deployment (after first push to main)
8. Visit deployed demo URL and verify functionality
9. Run: `npm pack` - Package creates valid tarball
10. Use Playwright MCP to screenshot the deployed demo
11. Ask Nanobanana: "Does the screenshot show a functional web application with a code editor and output panel?" (YES/NO)

---

## Common Utilities Needed

| Utility | Purpose | Used In |
|---------|---------|---------|
| `debounce` | Debounce search queries and editor changes | usePromptSearch, PromptEditor |
| `extractInputRequirements` | Extract Ask components from PuptElement | usePromptRender, useAskIterator |
| `validateInput` | Validate user input against requirement | useAskIterator, AskHandler |
| `copyToClipboard` | Cross-browser clipboard API wrapper | PromptRenderer, CopyButton |

---

## External Libraries Assessment

| Task | Library | Reason |
|------|---------|--------|
| UI Components | @mantine/core | Comprehensive, accessible, well-documented |
| Code Editor | @monaco-editor/react | Industry standard, syntax highlighting, TypeScript support |
| Icons | @tabler/icons-react | Lightweight, Mantine-compatible |
| Date Inputs | @mantine/dates | Integrates with Mantine, handles validation |
| Code Highlighting | @mantine/code-highlight | Mantine-styled, supports many languages |

Consider **not** using these (build in-house):
- Custom debounce utility (simple, avoids lodash dependency)
- Validation utilities (tightly coupled with pupt-lib types)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| pupt-lib API changes | Pin version, add integration tests against pupt-lib |
| Browser JSX transformation performance | Debounce transformations, show loading state |
| Monaco editor bundle size | Lazy load editor, consider lighter alternative for mobile |
| Ask input type coverage | Fallback to text input for unknown types |
| Clipboard API browser support | Use execCommand fallback for older browsers |
| GitHub Pages routing | Configure SPA fallback, use hash routing if needed |
| React version compatibility | Test with React 18.0.0 minimum, document peer dependency |

---

## Phase Dependencies Diagram

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Context & usePupt)
    │
    ├──────────────┐
    ▼              ▼
Phase 3         Phase 5
(usePromptRender)  (usePromptSearch, usePostActions)
    │              │
    ▼              │
Phase 4            │
(useAskIterator)   │
    │              │
    ├──────────────┘
    ▼
Phase 6 (Headless Components)
    │
    ▼
Phase 7 (Demo Layout)
    │
    ├──────────────┐
    ▼              ▼
Phase 8         Phase 9
(Input Panel)   (Output Panel)
    │              │
    ├──────────────┘
    ▼
Phase 10 (CI/CD & Polish)
```

---

## Summary

This implementation plan delivers pupt-react in 10 phases over approximately 15-25 days:

1. **Phases 1-2**: Foundation - project setup and core context
2. **Phases 3-5**: Core hooks - rendering, Ask iteration, search
3. **Phase 6**: Headless components - render prop patterns
4. **Phases 7-9**: Demo website - Mantine UI implementation
5. **Phase 10**: Polish - CI/CD, deployment, documentation

Each phase builds incrementally, maintains backwards compatibility, and delivers verifiable functionality that can be tested both programmatically and manually.
