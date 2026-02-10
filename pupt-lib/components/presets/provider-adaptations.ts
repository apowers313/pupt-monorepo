import type { LlmProvider } from 'pupt-lib';

/**
 * Provider-specific adaptation settings that influence how components
 * render their content for different LLM providers.
 */
export interface ProviderAdaptations {
  /** Prefix used when rendering role instructions (e.g., "You are " vs "Your role: ") */
  rolePrefix: string;
  /** How constraints should be framed for this provider */
  constraintStyle: 'positive' | 'negative' | 'balanced';
  /** Preferred output format for structured content */
  formatPreference: 'xml' | 'markdown' | 'json';
  /** How instructions should be structured */
  instructionStyle: 'direct' | 'elaborate' | 'structured';
}

/**
 * Provider adaptation lookup table.
 * Maps each LLM provider to its preferred rendering settings.
 *
 * Covers all values from LLM_PROVIDERS:
 * 'anthropic', 'openai', 'google', 'meta', 'mistral', 'deepseek', 'xai', 'cohere', 'unspecified'
 */
export const PROVIDER_ADAPTATIONS: Record<LlmProvider, ProviderAdaptations> = {
  'anthropic': {
    rolePrefix: 'You are ',
    constraintStyle: 'positive',
    formatPreference: 'xml',
    instructionStyle: 'structured',
  },
  'openai': {
    rolePrefix: 'You are ',
    constraintStyle: 'balanced',
    formatPreference: 'markdown',
    instructionStyle: 'direct',
  },
  'google': {
    rolePrefix: 'Your role: ',
    constraintStyle: 'positive',
    formatPreference: 'markdown',
    instructionStyle: 'direct',
  },
  'meta': {
    rolePrefix: 'You are ',
    constraintStyle: 'balanced',
    formatPreference: 'markdown',
    instructionStyle: 'direct',
  },
  'mistral': {
    rolePrefix: 'You are ',
    constraintStyle: 'balanced',
    formatPreference: 'markdown',
    instructionStyle: 'direct',
  },
  'deepseek': {
    rolePrefix: 'You are ',
    constraintStyle: 'balanced',
    formatPreference: 'markdown',
    instructionStyle: 'structured',
  },
  'xai': {
    rolePrefix: 'You are ',
    constraintStyle: 'balanced',
    formatPreference: 'markdown',
    instructionStyle: 'direct',
  },
  'cohere': {
    rolePrefix: 'You are ',
    constraintStyle: 'balanced',
    formatPreference: 'markdown',
    instructionStyle: 'direct',
  },
  'unspecified': {
    rolePrefix: 'You are ',
    constraintStyle: 'positive',
    formatPreference: 'markdown',
    instructionStyle: 'structured',
  },
};

/**
 * Language-specific coding conventions.
 * Used by components like Role, Format, and Constraint to provide
 * language-appropriate guidance.
 */
export const LANGUAGE_CONVENTIONS: Record<string, string[]> = {
  'typescript': [
    'Use explicit type annotations',
    'Prefer interfaces over type aliases for objects',
    'Use async/await over raw promises',
  ],
  'python': [
    'Follow PEP 8 style guide',
    'Use type hints',
    'Prefer list comprehensions where readable',
  ],
  'rust': [
    'Use idiomatic Rust patterns',
    'Handle errors with Result type',
    'Prefer references over cloning',
  ],
  'go': [
    'Follow effective Go guidelines',
    'Handle errors explicitly',
    'Use short variable names in small scopes',
  ],
  'unspecified': [
    'Follow language best practices',
  ],
};
