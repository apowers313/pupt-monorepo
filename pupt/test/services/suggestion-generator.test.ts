import { describe, it, expect, beforeEach } from 'vitest';
import { SuggestionGenerator } from '../../src/services/suggestion-generator.js';
import type { Pattern } from '../../src/types/patterns.js';

describe('SuggestionGenerator', () => {
  let generator: SuggestionGenerator;

  beforeEach(() => {
    generator = new SuggestionGenerator();
  });

  const createPattern = (overrides: Partial<Pattern> = {}): Pattern => ({
    type: 'verification_gap',
    frequency: 5,
    severity: 'high',
    evidence: ['Test evidence 1', 'Test evidence 2'],
    affectedPrompts: ['prompt-a'],
    correlation_strength: 0.8,
    affected_executions: 5,
    ...overrides,
  });

  describe('verification gap suggestions', () => {
    it('should generate specific fixes for verification gaps', () => {
      const pattern = createPattern({
        type: 'verification_gap',
        evidence: [
          'Tests still failing after AI claimed success',
          'npm test shows 5 failures but AI said complete',
          'Verification was skipped',
        ],
      });

      const suggestions = generator.generateSuggestions([pattern]);
      const suggestion = suggestions[0];

      expect(suggestion.pattern_type).toBe('verification_gap');
      expect(suggestion.improvement).toContain('verification');
      expect(suggestion.improvement.toLowerCase()).toContain('test');
      expect(suggestion.specific_changes).toHaveLength(3);
      expect(suggestion.specific_changes[0]).toContain('Add explicit verification step');
    });

    it('should include evidence in suggestions', () => {
      const pattern = createPattern({
        type: 'verification_gap',
        evidence: ['Specific failure: test/app.test.ts failed'],
      });

      const suggestions = generator.generateSuggestions([pattern]);
      expect(suggestions[0].evidence_cited[0]).toContain('test/app.test.ts');
    });
  });

  describe('incomplete task suggestions', () => {
    it('should generate fixes for incomplete task patterns', () => {
      const pattern = createPattern({
        type: 'incomplete_task',
        evidence: [
          'Stopped at first error',
          'Fixed 1 of 10 test failures',
          'Did not continue after initial fix',
        ],
      });

      const suggestions = generator.generateSuggestions([pattern]);
      const suggestion = suggestions[0];

      expect(suggestion.pattern_type).toBe('incomplete_task');
      expect(suggestion.improvement).toContain('all errors');
      expect(suggestion.specific_changes).toContain('Continue fixing ALL errors until none remain');
    });
  });

  describe('environment-specific suggestions', () => {
    it('should generate fixes for environment-specific patterns', () => {
      const pattern = createPattern({
        type: 'environment_specific',
        evidence: [
          'Failed on branch: feature/test',
          'Works on main but not feature branches',
          'Branch-specific configuration issue',
        ],
      });

      const suggestions = generator.generateSuggestions([pattern]);
      const suggestion = suggestions[0];

      expect(suggestion.pattern_type).toBe('environment_specific');
      expect(suggestion.improvement).toContain('environment');
      expect(suggestion.improvement).toContain('branch');
      expect(suggestion.specific_changes.some(c => c.includes('git branch'))).toBe(true);
    });
  });

  describe('ambiguous objective suggestions', () => {
    it('should generate fixes for ambiguous objectives', () => {
      const pattern = createPattern({
        type: 'ambiguous_objective',
        evidence: [
          'Unclear what "fix the error" meant',
          'Multiple errors but vague instructions',
          'Not sure which task to prioritize',
        ],
      });

      const suggestions = generator.generateSuggestions([pattern]);
      const suggestion = suggestions[0];

      expect(suggestion.pattern_type).toBe('ambiguous_objective');
      expect(suggestion.improvement).toContain('specific');
      expect(suggestion.improvement).toContain('measurable');
      expect(suggestion.specific_changes).toContain('Define clear success criteria');
    });
  });

  describe('prioritization', () => {
    it('should prioritize suggestions by impact', () => {
      const patterns: Pattern[] = [
        createPattern({
          type: 'verification_gap',
          frequency: 10,
          severity: 'critical',
          correlation_strength: 0.9,
        }),
        createPattern({
          type: 'incomplete_task',
          frequency: 5,
          severity: 'medium',
          correlation_strength: 0.5,
        }),
        createPattern({
          type: 'ambiguous_objective',
          frequency: 3,
          severity: 'low',
          correlation_strength: 0.3,
        }),
      ];

      const suggestions = generator.generateSuggestions(patterns);

      // Should be ordered by impact (frequency * severity weight * correlation)
      expect(suggestions[0].pattern_type).toBe('verification_gap');
      expect(suggestions[0].priority).toBe('critical');
      expect(suggestions[1].priority).toBe('medium');
      expect(suggestions[2].priority).toBe('low');
    });

    it('should calculate impact scores correctly', () => {
      const pattern = createPattern({
        frequency: 10,
        severity: 'high',
        correlation_strength: 0.8,
      });

      const suggestions = generator.generateSuggestions([pattern]);
      const suggestion = suggestions[0];

      expect(suggestion.impact_score).toBeDefined();
      expect(suggestion.impact_score).toBeGreaterThan(0);
      expect(suggestion.expected_improvement).toContain('%');
    });
  });

  describe('specific prompt improvements', () => {
    it('should generate prompt-specific improvements', () => {
      const pattern = createPattern({
        type: 'verification_gap',
        affectedPrompts: ['test-runner', 'code-reviewer'],
        evidence: [
          'test-runner: Did not verify all tests pass',
          'code-reviewer: Skipped running tests',
        ],
      });

      const suggestions = generator.generateSuggestions([pattern]);
      const suggestion = suggestions[0];

      expect(suggestion.affected_prompts).toEqual(['test-runner', 'code-reviewer']);
      expect(suggestion.prompt_specific_fixes).toBeDefined();
      expect(suggestion.prompt_specific_fixes?.['test-runner']).toContain('verify');
      expect(suggestion.prompt_specific_fixes?.['code-reviewer']).toContain('test');
    });
  });

  describe('evidence formatting', () => {
    it('should truncate long evidence strings', () => {
      const pattern = createPattern({
        evidence: [
          'This is a very long evidence string that should be truncated to maintain readability in the final report. It contains detailed information about the failure but we only want to show the most relevant part.',
        ],
      });

      const suggestions = generator.generateSuggestions([pattern]);
      const suggestion = suggestions[0];

      expect(suggestion.evidence_cited[0].length).toBeLessThanOrEqual(100);
      expect(suggestion.evidence_cited[0]).toContain('...');
    });
  });

  describe('implementation examples', () => {
    it('should provide concrete implementation examples', () => {
      const pattern = createPattern({
        type: 'verification_gap',
      });

      const suggestions = generator.generateSuggestions([pattern]);
      const suggestion = suggestions[0];

      expect(suggestion.implementation_example).toBeDefined();
      expect(suggestion.implementation_example).toContain('# Verification');
      expect(suggestion.implementation_example).toContain('npm test');
    });
  });
});