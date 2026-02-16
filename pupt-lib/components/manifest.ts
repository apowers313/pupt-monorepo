// Component manifest — the single source of truth for built-in component names.
//
// When you add or remove a component, update this file AND the relevant index.ts.
// A test verifies these lists stay in sync with actual exports.

/**
 * All built-in component names (excluding Ask components).
 * Used by the preprocessor to auto-inject imports for .prompt files.
 */
export const BUILTIN_COMPONENTS = [
  // Base class for custom components
  'Component',
  // Structural
  'Prompt',
  'Section',
  'Role',
  'Task',
  'Context',
  'Constraint',
  'Format',
  'Audience',
  'Tone',
  'SuccessCriteria',
  'Criterion',
  'Constraints',
  'Contexts',
  'Objective',
  'Style',
  'WhenUncertain',
  'Specialization',
  'Guardrails',
  'EdgeCases',
  'When',
  'Fallback',
  'Fallbacks',
  'References',
  'Reference',
  // Utility
  'UUID',
  'Timestamp',
  'DateTime',
  'Hostname',
  'Username',
  'Cwd',
  // Meta
  'Uses',
  // Control flow
  'If',
  'ForEach',
  // Examples
  'Example',
  'Examples',
  'ExampleInput',
  'ExampleOutput',
  'NegativeExample',
  // Reasoning
  'Steps',
  'Step',
  'ChainOfThought',
  // Data
  'Code',
  'Data',
  'File',
  'Json',
  'Xml',
  // Post-execution
  'PostExecution',
  'ReviewFile',
  'OpenUrl',
  'RunCommand',
] as const;

/**
 * Ask component names (Ask namespace + individual AskX exports).
 */
export const ASK_COMPONENTS = [
  'Ask',
  'AskOption',
  'AskLabel',
  'AskText',
  'AskNumber',
  'AskSelect',
  'AskConfirm',
  'AskEditor',
  'AskMultiSelect',
  'AskFile',
  'AskPath',
  'AskDate',
  'AskSecret',
  'AskChoice',
  'AskRating',
  'AskReviewFile',
] as const;

/**
 * Structural component names whose `name` prop is for identification,
 * not variable creation. The name-hoisting Babel plugin skips these.
 */
export const STRUCTURAL_COMPONENTS = [
  // Structural
  'Prompt', 'Section', 'Role', 'Task', 'Context', 'Constraint', 'Format',
  'Audience', 'Tone', 'SuccessCriteria', 'Criterion', 'Constraints',
  'Contexts', 'Objective', 'Style', 'WhenUncertain', 'Specialization',
  'Guardrails', 'EdgeCases', 'When', 'Fallback', 'Fallbacks',
  'References', 'Reference',
  // Utility (no meaningful `name` prop, included for completeness)
  'UUID', 'Timestamp', 'DateTime', 'Hostname', 'Username', 'Cwd',
  // Control
  'If', 'ForEach',
  // Examples
  'Example', 'Examples', 'ExampleInput', 'ExampleOutput', 'NegativeExample',
  // Reasoning (no meaningful `name` prop, included for completeness)
  'Steps', 'Step', 'ChainOfThought',
  // Data (File excluded — its `name` prop creates variables)
  'Code', 'Data', 'Json', 'Xml',
  // Post-execution (ReviewFile excluded — its `name` prop creates variables)
  'PostExecution', 'OpenUrl', 'RunCommand',
  // Meta
  'Uses',
  // JSX built-in
  'Fragment',
] as const;
