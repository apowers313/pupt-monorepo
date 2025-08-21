import type { ParsedAnnotation } from './annotations.js';

export interface ReviewOptions {
  promptName?: string;
  since?: string;
  format?: 'json' | 'markdown';
  output?: string;
}

export interface UsageStatistics {
  total_runs: number;
  annotated_runs: number;
  success_rate: number;
  avg_duration: string;
  last_used: string;
}

export interface ExecutionOutcomes {
  success: number;
  partial: number;
  failure: number;
}

export interface CapturedOutput {
  execution_id: string;
  output_file_path: string;
  exit_code: number;
  duration: string;
  output_size_bytes: number;
  key_indicators?: {
    error_count: number;
    test_failures: number;
    build_failures: number;
    completion_claimed: boolean;
    verification_attempted: boolean;
  };
}

export interface DetectedPattern {
  pattern_type: 'verification_gap' | 'incomplete_task' | 'environment_specific' | 'ambiguous_objective';
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence_samples: string[];
  correlation_strength: number;
  affected_executions: number;
}

export interface PromptReviewData {
  name: string;
  path: string;
  content: string;
  last_modified: string;
  usage_statistics: UsageStatistics;
  execution_outcomes: ExecutionOutcomes;
  environment_correlations: Record<string, unknown>;
  captured_outputs: CapturedOutput[];
  user_annotations: ParsedAnnotation[];
  detected_patterns: DetectedPattern[];
}

export interface CrossPromptPattern {
  pattern: string;
  affected_prompts: string[];
  total_occurrences: number;
  impact_assessment: string;
}

export interface DataCompleteness {
  with_annotations: number;
  with_output_capture: number;
  with_environment_data: number;
}

export interface ReviewMetadata {
  analysis_period: string;
  total_prompts: number;
  total_executions: number;
  data_completeness: DataCompleteness;
}

export interface ReviewData {
  metadata: ReviewMetadata;
  prompts: PromptReviewData[];
  cross_prompt_patterns: CrossPromptPattern[];
}