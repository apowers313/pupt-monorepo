/**
 * Task preset configurations for the Task component.
 * Each preset defines a task type, action verbs, and suggested output format.
 */

export interface TaskPresetConfig {
  name: string;
  type: 'generation' | 'transformation' | 'analysis' | 'extraction' | 'classification' | 'qa' | 'reasoning' | 'planning' | 'coding' | 'conversation';
  verbs: string[];
  defaultFormat?: string;
  requiresContext?: boolean;
  supportsExamples?: boolean;
}

export const TASK_PRESETS: Record<string, TaskPresetConfig> = {
  'summarize': {
    name: 'summarize',
    type: 'transformation',
    verbs: ['Summarize', 'Condense', 'Brief'],
    defaultFormat: 'text',
    requiresContext: true,
  },
  'code-review': {
    name: 'code-review',
    type: 'analysis',
    verbs: ['Review', 'Analyze', 'Evaluate'],
    defaultFormat: 'markdown',
    requiresContext: true,
    supportsExamples: true,
  },
  'translate': {
    name: 'translate',
    type: 'transformation',
    verbs: ['Translate', 'Convert'],
    defaultFormat: 'text',
    requiresContext: true,
  },
  'explain': {
    name: 'explain',
    type: 'analysis',
    verbs: ['Explain', 'Describe', 'Clarify'],
    defaultFormat: 'text',
    supportsExamples: true,
  },
  'generate-code': {
    name: 'generate-code',
    type: 'coding',
    verbs: ['Write', 'Implement', 'Create'],
    defaultFormat: 'code',
    supportsExamples: true,
  },
  'debug': {
    name: 'debug',
    type: 'coding',
    verbs: ['Debug', 'Fix', 'Troubleshoot'],
    defaultFormat: 'code',
    requiresContext: true,
  },
  'refactor': {
    name: 'refactor',
    type: 'coding',
    verbs: ['Refactor', 'Improve', 'Optimize'],
    defaultFormat: 'code',
    requiresContext: true,
  },
  'classify': {
    name: 'classify',
    type: 'classification',
    verbs: ['Classify', 'Categorize', 'Label'],
    defaultFormat: 'json',
    supportsExamples: true,
  },
  'extract': {
    name: 'extract',
    type: 'extraction',
    verbs: ['Extract', 'Identify', 'Find'],
    defaultFormat: 'json',
    requiresContext: true,
  },
  'plan': {
    name: 'plan',
    type: 'planning',
    verbs: ['Plan', 'Design', 'Outline'],
    defaultFormat: 'markdown',
  },
};
