export interface StructuredOutcome {
  tasks_completed: number;
  tasks_total: number;
  tests_run: number;
  tests_passed: number;
  tests_failed: number;
  verification_passed: boolean;
  execution_time: string;
}

export interface IssueIdentified {
  category: 'verification_gap' | 'incomplete_task' | 'ambiguous_instruction' | 'missing_constraint';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
}

export interface AnnotationMetadata {
  historyFile: string;
  timestamp: string;
  status: 'success' | 'failure' | 'partial';
  tags: string[];
  structured_outcome?: StructuredOutcome;
  issues_identified?: IssueIdentified[];
  auto_detected?: boolean;
}

export interface ParsedAnnotation extends AnnotationMetadata {
  promptName: string;
  notes: string;
  auto_detected?: boolean;
}

export interface AnnotationAnalysisSummary {
  totalAnnotations: number;
  statusDistribution: {
    success: number;
    partial: number;
    failure: number;
  };
  patternFrequency: Record<string, number>;
  commonTags: string[];
  issuesByCategory?: Record<string, IssueIdentified[]>;
}