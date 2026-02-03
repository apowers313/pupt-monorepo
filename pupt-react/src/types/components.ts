/**
 * Component type definitions for pupt-react headless components
 */

import type {
  PuptElement,
  InputRequirement,
  PostExecutionAction,
  ValidationResult,
  RenderOptions,
  EnvironmentContext,
} from "pupt-lib";
import type { PromptSource } from "./hooks";

/**
 * Render props provided by PromptEditor
 */
export interface PromptEditorRenderProps {
  /** Props to spread onto the textarea/input element */
  inputProps: {
    value: string;
    onChange: (
      e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
    ) => void;
  };

  /** The current source value */
  value: string;

  /** Set the source value directly */
  setValue: (value: string) => void;

  /** The transformed PuptElement (null if transformation failed or pending) */
  element: PuptElement | null;

  /** Transformation error */
  error: Error | null;

  /** Whether transformation is in progress */
  isTransforming: boolean;
}

/**
 * Props for PromptEditor component
 */
export interface PromptEditorProps {
  /** Render function receiving editor state */
  children: (props: PromptEditorRenderProps) => React.ReactNode;

  /** Default source value */
  defaultValue?: string;

  /** Called when the source value changes */
  onChange?: (value: string) => void;

  /** Debounce delay for transformation in ms (default: 300) */
  debounce?: number;
}

/**
 * Render props provided by PromptRenderer
 */
export interface PromptRendererRenderProps {
  /** The rendered text output */
  output: string | null;

  /** Whether the prompt is ready (has output and no pending inputs) */
  isReady: boolean;

  /** Whether rendering is in progress */
  isLoading: boolean;

  /** Rendering error */
  error: Error | null;

  /** Input requirements from Ask components */
  pendingInputs: InputRequirement[];

  /** Post-execution actions from the rendered prompt */
  postActions: PostExecutionAction[];

  /** Copy the rendered output to the clipboard */
  copyToClipboard: () => Promise<void>;

  /** Whether the output was recently copied */
  isCopied: boolean;

  /** Manually trigger a re-render */
  render: () => Promise<void>;
}

/**
 * Props for PromptRenderer component
 */
export interface PromptRendererProps {
  /** Render function receiving renderer state */
  children: (props: PromptRendererRenderProps) => React.ReactNode;

  /** Prompt source (string or element) */
  source: PromptSource | string;

  /** Whether to automatically render when source changes (default: true) */
  autoRender?: boolean;

  /** Input values for Ask components */
  inputs?: Map<string, unknown>;

  /** Render options */
  renderOptions?: Partial<RenderOptions>;

  /** Environment context */
  environment?: Partial<EnvironmentContext>;
}

/**
 * Input props helper returned by AskHandler.getInputProps
 */
export interface AskInputProps {
  /** Props to spread onto an input element */
  inputProps: {
    id: string;
    name: string;
    type: string;
    required: boolean;
    "aria-label": string;
  };

  /** The input requirement metadata */
  requirement: InputRequirement;

  /** The current value for this input */
  value: unknown;

  /** Set the value for this input */
  setValue: (value: unknown) => void;

  /** Validation errors for this input */
  errors: string[];
}

/**
 * Render props provided by AskHandler
 */
export interface AskHandlerRenderProps {
  /** All input requirements */
  requirements: InputRequirement[];

  /** The current input requirement being collected */
  current: InputRequirement | null;

  /** Current step index */
  currentIndex: number;

  /** Total number of inputs */
  totalInputs: number;

  /** Progress as a percentage (0-100) */
  progress: number;

  /** Whether all inputs have been collected */
  isDone: boolean;

  /** Whether the handler is initializing */
  isLoading: boolean;

  /** All collected values */
  values: Map<string, unknown>;

  /** Submit a value for the current input */
  submit: (value: unknown) => Promise<ValidationResult>;

  /** Go to the previous input */
  previous: () => void;

  /** Go to a specific input by index */
  goTo: (index: number) => void;

  /** Reset all inputs */
  reset: () => void;

  /** Get input props for a specific field by name */
  getInputProps: (name: string) => AskInputProps;
}

/**
 * Props for AskHandler component
 */
export interface AskHandlerProps {
  /** Render function receiving handler state */
  children: (props: AskHandlerRenderProps) => React.ReactNode;

  /** The PuptElement containing Ask components */
  element: PuptElement | null;

  /** Called when all inputs have been collected */
  onComplete?: (values: Map<string, unknown>) => void;

  /** Pre-supplied initial values */
  initialValues?: Map<string, unknown>;
}
