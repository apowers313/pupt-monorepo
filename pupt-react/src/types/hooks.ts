/**
 * Hook type definitions for pupt-react
 */

import type {
    DiscoveredPromptWithMethods,
    EnvironmentContext,
    InputRequirement,
    ModuleEntry,
    OnMissingDefaultStrategy,
    PostExecutionAction,
    PuptElement,
    RenderError,
    RenderOptions,
    SearchEngineConfig,
    SearchResult,
    ValidationResult,
} from "@pupt/lib";

/**
 * Source for prompt rendering - either raw source code or pre-parsed element
 */
export type PromptSource = { type: "source"; value: string } | { type: "element"; value: PuptElement };

/**
 * Options for usePromptRender hook
 */
export interface UsePromptRenderOptions {
    /** Initial source to transform/render */
    source?: PromptSource;

    /** Input values to pass to the prompt during rendering */
    inputs?: Map<string, unknown>;

    /** Environment context for rendering */
    environment?: Partial<EnvironmentContext>;

    /** Render options to pass to pupt-lib */
    renderOptions?: Partial<RenderOptions>;

    /** Whether to automatically render after transformation (default: false) */
    autoRender?: boolean;

    /** Filename hint for source transformation (e.g. "prompt.prompt" or "prompt.tsx").
     *  Controls whether pupt-lib auto-injects imports for built-in components.
     *  Defaults to "prompt.tsx". Use "prompt.prompt" for raw JSX without imports. */
    filename?: string;
}

/**
 * Return value of usePromptRender hook
 */
export interface UsePromptRenderReturn {
    /** Current source being rendered */
    source: PromptSource | null;

    /** Set a new source to transform */
    setSource: (source: PromptSource) => void;

    /** The transformed PuptElement */
    element: PuptElement | null;

    /** The rendered text output */
    output: string | null;

    /** Error that occurred during transformation or rendering */
    error: Error | null;

    /** Detailed render errors from component validation/runtime failures */
    renderErrors: RenderError[];

    /** Whether transformation is in progress */
    isTransforming: boolean;

    /** Whether rendering is in progress */
    isRendering: boolean;

    /** Combined loading state (transforming or rendering) */
    isLoading: boolean;

    /** Input requirements extracted from Ask components */
    inputRequirements: InputRequirement[];

    /** Post-execution actions extracted from the prompt */
    postActions: PostExecutionAction[];

    /** Manually trigger rendering with current element and inputs */
    render: () => Promise<void>;

    /** Manually trigger transformation of source code */
    transform: (sourceCode?: string) => Promise<PuptElement | null>;
}

/**
 * Options for useAskIterator hook
 */
export interface UseAskIteratorOptions {
    /** The PuptElement to extract Ask components from */
    element: PuptElement | null;

    /** Callback when all inputs have been collected */
    onComplete?: (values: Map<string, unknown>) => void;

    /** Pre-supplied initial values for inputs */
    initialValues?: Map<string, unknown>;

    /** Pre-supply values that skip interactive iteration */
    preSuppliedValues?: Record<string, unknown>;

    /** Enable non-interactive mode to auto-fill with defaults */
    nonInteractive?: boolean;

    /** Strategy when required input has no default in non-interactive mode */
    onMissingDefault?: OnMissingDefaultStrategy;
}

/**
 * Return value of useAskIterator hook
 */
export interface UseAskIteratorReturn {
    /** All input requirements extracted from the element */
    requirements: InputRequirement[];

    /** The current input requirement being collected */
    current: InputRequirement | null;

    /** Index of the current requirement */
    currentIndex: number;

    /** Total number of input requirements */
    totalInputs: number;

    /** Whether all inputs have been collected */
    isDone: boolean;

    /** Whether the iterator is initializing */
    isLoading: boolean;

    /** All collected input values */
    inputs: Map<string, unknown>;

    /** Submit a value for the current input, returns validation result */
    submit: (value: unknown) => Promise<ValidationResult>;

    /** Navigate to the previous input */
    previous: () => void;

    /** Navigate to a specific input index */
    goTo: (index: number) => void;

    /** Reset all collected inputs and go back to the first */
    reset: () => void;

    /** Set a value for a specific input by name */
    setValue: (name: string, value: unknown) => void;

    /** Get the value for a specific input by name */
    getValue: (name: string) => unknown;

    /** Run all inputs non-interactively using defaults and pre-supplied values */
    runNonInteractive: () => Promise<Map<string, unknown>>;
}

/**
 * Options for usePromptSearch hook
 */
export interface UsePromptSearchOptions {
    /** Debounce delay in milliseconds (default: 200) */
    debounce?: number;

    /** Maximum number of results to return */
    limit?: number;
}

/**
 * Return value of usePromptSearch hook
 */
export interface UsePromptSearchReturn {
    /** Current search query */
    query: string;

    /** Set the search query */
    setQuery: (query: string) => void;

    /** Search results */
    results: SearchResult[];

    /** Whether a search is in progress */
    isSearching: boolean;

    /** All available tags from indexed prompts */
    allTags: string[];

    /** Clear the search query and results */
    clear: () => void;
}

/**
 * Handler function for a post-execution action
 */
export type PostActionHandler = (action: PostExecutionAction) => void | Promise<void>;

/**
 * Options for usePostActions hook
 */
export interface UsePostActionsOptions {
    /** Post-execution actions to manage */
    actions: PostExecutionAction[];

    /** Custom handlers by action type */
    handlers?: Partial<Record<PostExecutionAction["type"], PostActionHandler>>;
}

/**
 * Return value of usePostActions hook
 */
export interface UsePostActionsReturn {
    /** Actions that have not yet been executed or dismissed */
    pendingActions: PostExecutionAction[];

    /** Actions that have been executed */
    executedActions: PostExecutionAction[];

    /** Actions that have been dismissed */
    dismissedActions: PostExecutionAction[];

    /** Whether all actions have been handled (executed or dismissed) */
    allDone: boolean;

    /** Execute a specific action */
    execute: (action: PostExecutionAction) => Promise<void>;

    /** Dismiss a specific action without executing */
    dismiss: (action: PostExecutionAction) => void;

    /** Execute all remaining pending actions */
    executeAll: () => Promise<void>;

    /** Dismiss all remaining pending actions */
    dismissAll: () => void;

    /** Reset all actions back to pending */
    reset: () => void;
}

/**
 * Options for useFormula hook
 */
export interface UseFormulaOptions {
    /** Formula string (e.g., "=count>5", "=AND(a>1, b<10)") */
    formula: string;
    /** Input values for formula variables */
    inputs: Map<string, unknown>;
}

/**
 * Return value of useFormula hook
 */
export interface UseFormulaReturn {
    /** Boolean result of formula evaluation */
    result: boolean;
    /** Error if evaluation failed */
    error: Error | null;
}

/**
 * Options for usePuptLibrary hook
 */
export interface UsePuptLibraryOptions {
    /** Module entries to load prompts from */
    modules?: ModuleEntry[];
    /** Configuration for the search engine */
    searchConfig?: SearchEngineConfig;
}

/**
 * Return value of usePuptLibrary hook
 */
export interface UsePuptLibraryReturn {
    /** Whether the library is loading/initializing */
    isLoading: boolean;
    /** Error that occurred during initialization */
    error: Error | null;
    /** All discovered prompts from loaded modules */
    prompts: DiscoveredPromptWithMethods[];
    /** All unique tags from discovered prompts */
    tags: string[];
    /** Get a specific prompt by name */
    getPrompt: (name: string) => DiscoveredPromptWithMethods | undefined;
    /** Get all prompts with a specific tag */
    getPromptsByTag: (tag: string) => DiscoveredPromptWithMethods[];
    /** Add a module entry */
    addModule: (source: ModuleEntry) => void;
    /** Remove a module entry */
    removeModule: (source: ModuleEntry) => void;
    /** Currently loaded module entries */
    modules: ModuleEntry[];
}

// Re-export types that are needed by consumers
export type { InputRequirement, PostExecutionAction, RenderError, SearchResult, ValidationResult };
