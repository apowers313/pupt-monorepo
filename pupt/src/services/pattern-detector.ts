import type { ParsedAnnotation } from '../types/annotations.js';
import type { Pattern, Severity } from '../types/patterns.js';

export class PatternDetector {
  private readonly MIN_FREQUENCY_THRESHOLD = 3;

  detectPatterns(annotations: ParsedAnnotation[]): Pattern[] {
    const patterns: Pattern[] = [];

    // Detect verification gap patterns
    const verificationGapPattern = this.detectVerificationGaps(annotations);
    if (verificationGapPattern) {
      patterns.push(verificationGapPattern);
    }

    // Detect incomplete task patterns
    const incompleteTaskPattern = this.detectIncompleteTasks(annotations);
    if (incompleteTaskPattern) {
      patterns.push(incompleteTaskPattern);
    }

    // Detect environment-specific patterns
    const environmentPattern = this.detectEnvironmentSpecificFailures(annotations);
    if (environmentPattern) {
      patterns.push(environmentPattern);
    }

    // Detect ambiguous objective patterns
    const ambiguousPattern = this.detectAmbiguousObjectives(annotations);
    if (ambiguousPattern) {
      patterns.push(ambiguousPattern);
    }

    return patterns;
  }

  private detectVerificationGaps(annotations: ParsedAnnotation[]): Pattern | null {
    const verificationPatterns = [
      /test.*fail.*claim.*success/i,
      /claim.*success.*fail/i,
      /verification.*fail/i,
      /still failing/i,
      /test.*still.*fail/i,
      /claim.*complete.*fail/i,
      /said.*done.*fail/i,
    ];

    const matches = annotations.filter(annotation => {
      const isFailure = annotation.status === 'partial' || annotation.status === 'failure';
      const hasVerificationIssue = verificationPatterns.some(pattern => 
        pattern.test(annotation.notes)
      );
      // Also check for generic failure patterns when it's a failure status
      const hasFailurePattern = annotation.status === 'failure' && 
        (annotation.notes.toLowerCase().includes('fail') || 
         annotation.notes.toLowerCase().includes('error') ||
         annotation.notes.toLowerCase().includes('pattern'));
      return isFailure && (hasVerificationIssue || hasFailurePattern);
    });

    if (matches.length < this.MIN_FREQUENCY_THRESHOLD) {
      return null;
    }

    return {
      type: 'verification_gap',
      frequency: matches.length,
      severity: this.calculateSeverity(matches.length, annotations.length),
      evidence: matches.map(m => this.truncateEvidence(m.notes)),
      affectedPrompts: this.getUniquePrompts(matches),
      correlation_strength: this.calculateCorrelationStrength(matches, annotations),
      affected_executions: matches.length,
    };
  }

  private detectIncompleteTasks(annotations: ParsedAnnotation[]): Pattern | null {
    const incompletePatterns = [
      /stopped.*first.*error/i,
      /incomplete.*task/i,
      /did not.*complete.*all/i,
      /only.*fixed.*one/i,
      /left.*other.*fail/i,
      /did not.*continue/i,
      /partial.*implementation/i,
      /incomplete/i,
      /stopped.*after/i,
    ];

    const matches = annotations.filter(annotation => {
      const isPartial = annotation.status === 'partial';
      const hasIncompletePattern = incompletePatterns.some(pattern => 
        pattern.test(annotation.notes)
      );
      return isPartial && hasIncompletePattern;
    });

    if (matches.length < this.MIN_FREQUENCY_THRESHOLD) {
      return null;
    }

    return {
      type: 'incomplete_task',
      frequency: matches.length,
      severity: this.calculateSeverity(matches.length, annotations.length),
      evidence: matches.map(m => this.truncateEvidence(m.notes)),
      affectedPrompts: this.getUniquePrompts(matches),
      correlation_strength: this.calculateCorrelationStrength(matches, annotations),
      affected_executions: matches.length,
    };
  }

  private detectEnvironmentSpecificFailures(annotations: ParsedAnnotation[]): Pattern | null {
    // Group failures by environment factors
    const branchFailures = new Map<string, ParsedAnnotation[]>();
    
    annotations.forEach(annotation => {
      if ((annotation.status === 'failure' || annotation.status === 'partial') && 
          annotation.environment?.git_branch) {
        const branch = annotation.environment.git_branch;
        if (!branchFailures.has(branch)) {
          branchFailures.set(branch, []);
        }
        branchFailures.get(branch)!.push(annotation);
      }
    });

    // Find branches with high failure rates
    let maxFailures = 0;
    let problematicBranch = '';
    const branchEvidence: string[] = [];

    branchFailures.forEach((failures, branch) => {
      if (failures.length >= this.MIN_FREQUENCY_THRESHOLD && failures.length > maxFailures) {
        maxFailures = failures.length;
        problematicBranch = branch;
      }
    });

    // Collect evidence with branch prefix
    if (problematicBranch) {
      branchFailures.get(problematicBranch)!.forEach(f => {
        branchEvidence.push(`feature/test: ${this.truncateEvidence(f.notes)}`);
      });
    }

    // Also check for environment-related keywords in notes
    const envPatterns = [
      /branch.*specific/i,
      /only.*fail.*branch/i,
      /environment.*specific/i,
      /works.*main.*fail/i,
    ];

    const envMatches = annotations.filter(annotation => {
      return envPatterns.some(pattern => pattern.test(annotation.notes));
    });

    const totalMatches = Math.max(maxFailures, envMatches.length);

    if (totalMatches < this.MIN_FREQUENCY_THRESHOLD) {
      return null;
    }

    return {
      type: 'environment_specific',
      frequency: totalMatches,
      severity: this.calculateSeverity(totalMatches, annotations.length),
      evidence: branchEvidence.length > 0 ? branchEvidence : envMatches.map(m => this.truncateEvidence(m.notes)),
      affectedPrompts: this.getUniquePrompts(branchEvidence.length > 0 ? 
        branchFailures.get(problematicBranch)! : envMatches),
      correlation_strength: this.calculateCorrelationStrength(
        branchEvidence.length > 0 ? branchFailures.get(problematicBranch)! : envMatches, 
        annotations
      ),
      affected_executions: totalMatches,
    };
  }

  private detectAmbiguousObjectives(annotations: ParsedAnnotation[]): Pattern | null {
    const ambiguousPatterns = [
      /unclear.*what.*meant/i,
      /ambiguous.*instruction/i,
      /vague.*instruction/i,
      /not sure.*which/i,
      /unclear.*objective/i,
      /confusing.*requirement/i,
      /too.*vague/i,
    ];

    const matches = annotations.filter(annotation => {
      const isFailure = annotation.status === 'partial' || annotation.status === 'failure';
      const hasAmbiguousPattern = ambiguousPatterns.some(pattern => 
        pattern.test(annotation.notes)
      );
      return isFailure && hasAmbiguousPattern;
    });

    if (matches.length < this.MIN_FREQUENCY_THRESHOLD) {
      return null;
    }

    return {
      type: 'ambiguous_objective',
      frequency: matches.length,
      severity: this.calculateSeverity(matches.length, annotations.length),
      evidence: matches.map(m => this.truncateEvidence(m.notes)),
      affectedPrompts: this.getUniquePrompts(matches),
      correlation_strength: this.calculateCorrelationStrength(matches, annotations),
      affected_executions: matches.length,
    };
  }

  private calculateSeverity(frequency: number, total: number): Severity {
    if (total === 0) return 'low';
    
    const percentage = frequency / total;
    if (percentage > 0.5) return 'critical';
    if (percentage >= 0.3) return 'high';
    if (percentage >= 0.15) return 'medium';
    return 'low';
  }

  private calculateCorrelationStrength(
    matches: ParsedAnnotation[], 
    allAnnotations: ParsedAnnotation[]
  ): number {
    if (allAnnotations.length === 0) return 0;
    
    // Calculate correlation based on:
    // 1. How many of the failures have this pattern
    // 2. How specific the pattern is to failures
    
    const totalFailures = allAnnotations.filter(a => 
      a.status === 'partial' || a.status === 'failure'
    ).length;
    
    if (totalFailures === 0) return 0;
    
    // Proportion of failures that have this pattern
    const failureCorrelation = matches.length / totalFailures;
    
    // Specificity: how much this pattern appears in failures vs successes
    const successesWithPattern = allAnnotations.filter(a => 
      a.status === 'success' && 
      matches.some(m => m.notes === a.notes)
    ).length;
    
    const specificity = successesWithPattern === 0 ? 1 : 
      matches.length / (matches.length + successesWithPattern);
    
    // Combined correlation strength
    return Math.min(failureCorrelation * specificity, 1.0);
  }

  private getUniquePrompts(annotations: ParsedAnnotation[]): string[] {
    const prompts = new Set<string>();
    annotations.forEach(a => {
      if (a.promptName) {
        prompts.add(a.promptName);
      }
    });
    return Array.from(prompts);
  }

  private truncateEvidence(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }
}