export interface TestPromptOptions {
  /** Inputs to pass when rendering the prompt. */
  inputs: Record<string, unknown>;

  /**
   * Strings expected to appear in the rendered output.
   * Typically structural section tags like "<role>", "<task>".
   * Default: ["<role>", "<task>"]
   */
  expectedSections?: string[];

  /**
   * Whether to run snapshot comparison.
   * Default: true
   */
  snapshot?: boolean;

  /**
   * Whether to check that string input values appear in rendered output.
   * Default: true
   */
  interpolation?: boolean;

  /**
   * Pin the date for deterministic output.
   * Set to false to disable fake timers.
   * Default: "2025-01-15T12:00:00Z"
   */
  fakeTime?: string | false;
}

export interface TestAllPromptsOptions {
  /**
   * Map of filename to inputs. Each .prompt file that needs
   * non-empty inputs must have an entry here.
   * Files not listed receive empty inputs ({}).
   */
  inputs?: Record<string, Record<string, unknown>>;

  /**
   * Strings expected in all prompts.
   * Default: ["<role>", "<task>"]
   */
  expectedSections?: string[];

  /** Default snapshot behavior for all prompts. Default: true */
  snapshot?: boolean;

  /** Default interpolation behavior for all prompts. Default: true */
  interpolation?: boolean;

  /** Pin the date for deterministic output. Default: "2025-01-15T12:00:00Z" */
  fakeTime?: string | false;

  /**
   * Whether to run the import detection regression guard.
   * Default: true
   */
  importDetection?: boolean;
}
