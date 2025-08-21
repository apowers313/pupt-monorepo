export type PatternType = 
  | 'verification_gap' 
  | 'incomplete_task' 
  | 'environment_specific' 
  | 'ambiguous_objective';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Pattern {
  type: PatternType;
  frequency: number;
  severity: Severity;
  evidence: string[];
  affectedPrompts: string[];
  correlation_strength: number;
  affected_executions: number;
}

export interface Suggestion {
  pattern_type: PatternType;
  priority: Severity;
  improvement: string;
  specific_changes: string[];
  evidence_cited: string[];
  affected_prompts: string[];
  impact_score: number;
  expected_improvement: string;
  prompt_specific_fixes?: Record<string, string>;
  implementation_example?: string;
}