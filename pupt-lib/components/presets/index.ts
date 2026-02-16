// Component preset data
// These are pure data files used by built-in components.
// They live in components/ because they are component-specific, not framework code.

export { ROLE_PRESETS } from './role-presets';
export type { RolePresetConfig } from './role-presets';

export { TASK_PRESETS } from './task-presets';
export type { TaskPresetConfig } from './task-presets';

export { CONSTRAINT_PRESETS } from './constraint-presets';
export type { ConstraintPresetConfig } from './constraint-presets';

export { DEFAULT_CONSTRAINTS } from './default-constraints';

export { STEPS_PRESETS } from './steps-presets';
export type { StepsPresetConfig } from './steps-presets';

export { PROVIDER_ADAPTATIONS, LANGUAGE_CONVENTIONS } from './provider-adaptations';
export type { ProviderAdaptations } from './provider-adaptations';

export { STANDARD_GUARDRAILS, EDGE_CASE_PRESETS, FALLBACK_PRESETS } from './guardrail-presets';
