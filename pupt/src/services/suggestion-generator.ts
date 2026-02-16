import type { Pattern, Severity,Suggestion } from '../types/patterns.js';

export class SuggestionGenerator {
  generateSuggestions(patterns: Pattern[]): Suggestion[] {
    // Sort patterns by impact score (frequency * severity weight * correlation)
    const sortedPatterns = this.sortPatternsByImpact(patterns);
    
    return sortedPatterns.map(pattern => this.generateSuggestion(pattern));
  }

  private generateSuggestion(pattern: Pattern): Suggestion {
    const baseProps = {
      pattern_type: pattern.type,
      priority: pattern.severity,
      evidence_cited: pattern.evidence.map(e => this.truncateEvidence(e)),
      affected_prompts: pattern.affectedPrompts,
      impact_score: this.calculateImpactScore(pattern),
      expected_improvement: this.calculateExpectedImprovement(pattern),
    };

    switch (pattern.type) {
      case 'verification_gap':
        return {
          ...baseProps,
          improvement: 'Add explicit verification steps to ensure all tests pass before marking tasks complete',
          specific_changes: [
            'Add explicit verification step: "Run \'npm test\' and verify ALL tests pass (0 failing)"',
            'Include requirement: "Do not proceed until all tests are green"',
            'Add checkpoint: "After implementation, verify the solution works by running tests"',
          ],
          prompt_specific_fixes: this.generatePromptSpecificFixes(pattern, 'verification'),
          implementation_example: `# Verification Requirements
After completing the implementation:
1. Run \`npm test\` and ensure output shows "0 failing"
2. If any tests fail, debug and fix ALL failures
3. Run tests again to confirm all pass
4. Only mark complete when ALL tests are green`,
        };

      case 'incomplete_task':
        return {
          ...baseProps,
          improvement: 'Ensure all errors are fixed completely before considering the task done',
          specific_changes: [
            'Replace "fix the error" with "fix ALL errors until none remain"',
            'Add instruction: "Continue debugging until all tests pass and build succeeds"',
            'Continue fixing ALL errors until none remain',
          ],
          prompt_specific_fixes: this.generatePromptSpecificFixes(pattern, 'completion'),
          implementation_example: `# Task Completion Requirements
- Fix ALL errors, not just the first one encountered
- Continue iterating until:
  - All tests pass (0 failures)
  - Build completes successfully
  - No linting errors remain
- Do not stop at partial success`,
        };

      case 'environment_specific':
        return {
          ...baseProps,
          improvement: 'Add environment awareness and branch-specific handling to the prompt',
          specific_changes: [
            'Add environment check: "Note the current git branch with \'git branch\'"',
            'Include branch context: "Consider branch-specific configurations"',
            'Add fallback: "If issues occur on feature branches, check for branch-specific settings"',
          ],
          prompt_specific_fixes: this.generatePromptSpecificFixes(pattern, 'environment'),
          implementation_example: `# Environment Awareness
1. Check current branch: \`git branch --show-current\`
2. Note any branch-specific configurations
3. If on a feature branch, ensure compatibility with main branch
4. Test changes work on both current branch and main`,
        };

      case 'ambiguous_objective':
        return {
          ...baseProps,
          improvement: 'Replace ambiguous instructions with specific, measurable criteria',
          specific_changes: [
            'Define specific error types to fix',
            'Specify exact success criteria (e.g., "all 5 tests pass")',
            'Define clear success criteria',
            'List specific tasks in priority order',
          ],
          prompt_specific_fixes: this.generatePromptSpecificFixes(pattern, 'clarity'),
          implementation_example: `# Clear Objectives
Instead of: "Fix the errors"
Use: "Fix all TypeScript compilation errors (npm run build should succeed with 0 errors)"

Instead of: "Make it work"  
Use: "Ensure all unit tests pass (npm test shows 0 failures) and the feature works as specified"`,
        };

      default:
        return {
          ...baseProps,
          improvement: 'Review and improve prompt clarity',
          specific_changes: ['Add specific success criteria', 'Include verification steps'],
        };
    }
  }

  private sortPatternsByImpact(patterns: Pattern[]): Pattern[] {
    return patterns.sort((a, b) => {
      const scoreA = this.calculateImpactScore(a);
      const scoreB = this.calculateImpactScore(b);
      return scoreB - scoreA;
    });
  }

  private calculateImpactScore(pattern: Pattern): number {
    const severityWeights: Record<Severity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return pattern.frequency * severityWeights[pattern.severity] * pattern.correlation_strength;
  }

  private calculateExpectedImprovement(pattern: Pattern): string {
    // Estimate improvement based on correlation strength and severity
    const baseImprovement = pattern.correlation_strength * 100;
    const severityMultiplier = pattern.severity === 'critical' ? 0.9 : 
                              pattern.severity === 'high' ? 0.7 :
                              pattern.severity === 'medium' ? 0.5 : 0.3;
    
    const improvement = Math.round(baseImprovement * severityMultiplier);
    return `${improvement}% reduction in ${pattern.type.replace(/_/g, ' ')} issues`;
  }

  private generatePromptSpecificFixes(
    pattern: Pattern, 
    fixType: 'verification' | 'completion' | 'environment' | 'clarity'
  ): Record<string, string> {
    const fixes: Record<string, string> = {};

    pattern.affectedPrompts.forEach(promptName => {
      switch (fixType) {
        case 'verification':
          fixes[promptName] = `Add to ${promptName}: "After implementation, run tests and verify 0 failures before proceeding"`;
          break;
        case 'completion':
          fixes[promptName] = `Update ${promptName}: Replace partial fix instructions with "Continue until ALL errors are resolved"`;
          break;
        case 'environment':
          fixes[promptName] = `Enhance ${promptName}: Add git branch awareness and environment checks`;
          break;
        case 'clarity':
          fixes[promptName] = `Clarify ${promptName}: Replace vague objectives with specific, measurable success criteria`;
          break;
      }
    });

    return fixes;
  }

  private truncateEvidence(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.substring(0, maxLength - 3)  }...`;
  }
}