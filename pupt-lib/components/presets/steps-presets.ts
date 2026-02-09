/**
 * Steps preset configurations for the Steps component.
 * Each preset defines a reasoning style and named phases.
 */

export interface StepsPresetConfig {
  name: string;
  style: 'step-by-step' | 'think-aloud' | 'structured' | 'minimal' | 'least-to-most';
  phases?: string[];
  showReasoning: boolean;
}

export const STEPS_PRESETS: Record<string, StepsPresetConfig> = {
  'analysis': {
    name: 'analysis',
    style: 'structured',
    phases: ['Understand', 'Analyze', 'Conclude'],
    showReasoning: true,
  },
  'problem-solving': {
    name: 'problem-solving',
    style: 'step-by-step',
    phases: ['Define', 'Explore', 'Solve', 'Verify'],
    showReasoning: true,
  },
  'code-generation': {
    name: 'code-generation',
    style: 'structured',
    phases: ['Understand requirements', 'Design approach', 'Implement', 'Test'],
    showReasoning: false,
  },
  'debugging': {
    name: 'debugging',
    style: 'step-by-step',
    phases: ['Reproduce', 'Isolate', 'Fix', 'Verify'],
    showReasoning: true,
  },
  'research': {
    name: 'research',
    style: 'structured',
    phases: ['Define scope', 'Gather information', 'Analyze findings', 'Synthesize'],
    showReasoning: true,
  },
};
