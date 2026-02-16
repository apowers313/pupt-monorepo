/**
 * Constraint preset configurations for the Constraint component.
 * Each preset defines a constraint category, level, text, and optional positive alternative.
 */

export interface ConstraintPresetConfig {
  name: string;
  category: 'content' | 'format' | 'tone' | 'scope' | 'accuracy' | 'safety' | 'performance';
  level: 'must' | 'should' | 'may' | 'must-not' | 'should-not';
  text: string;
  positiveAlternative?: string;
}

export const CONSTRAINT_PRESETS: Record<string, ConstraintPresetConfig> = {
  'be-concise': {
    name: 'be-concise',
    category: 'performance',
    level: 'should',
    text: 'Keep responses concise and focused',
  },
  'cite-sources': {
    name: 'cite-sources',
    category: 'accuracy',
    level: 'must',
    text: 'Cite sources for factual claims',
  },
  'no-opinions': {
    name: 'no-opinions',
    category: 'content',
    level: 'must-not',
    text: 'Do not include personal opinions',
    positiveAlternative: 'Remain objective and factual',
  },
  'acknowledge-uncertainty': {
    name: 'acknowledge-uncertainty',
    category: 'accuracy',
    level: 'must',
    text: 'Acknowledge when you are uncertain or lack information',
  },
  'professional-tone': {
    name: 'professional-tone',
    category: 'tone',
    level: 'must',
    text: 'Maintain a professional and respectful tone',
  },
  'no-hallucination': {
    name: 'no-hallucination',
    category: 'accuracy',
    level: 'must-not',
    text: 'Do not fabricate information or sources',
    positiveAlternative: 'Only provide verified and accurate information',
  },
  'stay-on-topic': {
    name: 'stay-on-topic',
    category: 'scope',
    level: 'must',
    text: 'Stay focused on the requested topic',
  },
  'include-examples': {
    name: 'include-examples',
    category: 'content',
    level: 'should',
    text: 'Include relevant examples where helpful',
  },
};
