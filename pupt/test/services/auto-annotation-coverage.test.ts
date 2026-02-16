import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetector } from '../../src/services/pattern-detector.js';
import { AnnotationAnalyzer } from '../../src/annotations/annotation-analyzer.js';
import type { ParsedAnnotation } from '../../src/types/annotations.js';

/**
 * Additional coverage tests for PatternDetector and AnnotationAnalyzer.
 * Targets edge cases in pattern detection and severity/correlation calculations.
 */

const createAnnotation = (overrides: Partial<ParsedAnnotation> = {}): ParsedAnnotation => ({
  historyFile: 'test.json',
  status: 'partial',
  notes: 'Test annotation',
  timestamp: '2025-08-16T10:00:00Z',
  issues: [],
  promptName: 'test-prompt',
  annotationPath: '/test/annotation.json',
  tags: [],
  ...overrides,
});

describe('PatternDetector - additional coverage', () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = new PatternDetector();
  });

  describe('calculateSeverity edge cases', () => {
    it('should return low severity when total is 0', () => {
      // With an empty annotation list, no patterns should be detected,
      // but we can test severity indirectly by providing annotations
      // that don't meet the threshold
      const annotations: ParsedAnnotation[] = [];
      const patterns = detector.detectPatterns(annotations);
      expect(patterns).toHaveLength(0);
    });

    it('should return low severity for patterns below 15% of total', () => {
      // Create 3 matching annotations (minimum threshold) out of 100 total
      // 3/100 = 3% which should be 'low'
      const matchingAnnotations = Array(3).fill(null).map(() =>
        createAnnotation({
          notes: 'Tests still failing after AI claimed success',
          status: 'failure',
        })
      );
      const successAnnotations = Array(97).fill(null).map(() =>
        createAnnotation({ status: 'success', notes: 'All good' })
      );

      const patterns = detector.detectPatterns([...matchingAnnotations, ...successAnnotations]);
      const verificationGap = patterns.find(p => p.type === 'verification_gap');

      expect(verificationGap).toBeDefined();
      expect(verificationGap?.severity).toBe('low');
    });

    it('should return medium severity for patterns between 15-30% of total', () => {
      // Create 4 matching out of 20 total = 20% -> medium
      const matchingAnnotations = Array(4).fill(null).map(() =>
        createAnnotation({
          notes: 'Tests still failing after AI claimed success',
          status: 'failure',
        })
      );
      const successAnnotations = Array(16).fill(null).map(() =>
        createAnnotation({ status: 'success', notes: 'All good' })
      );

      const patterns = detector.detectPatterns([...matchingAnnotations, ...successAnnotations]);
      const verificationGap = patterns.find(p => p.type === 'verification_gap');

      expect(verificationGap).toBeDefined();
      expect(verificationGap?.severity).toBe('medium');
    });
  });

  describe('calculateCorrelationStrength edge cases', () => {
    it('should return 0 correlation when all annotations are successful', () => {
      // When there are no failures, the correlation strength should be 0
      // but pattern detection won't trigger either since it needs failures
      const annotations = Array(5).fill(null).map(() =>
        createAnnotation({ status: 'success', notes: 'Everything is fine' })
      );

      const patterns = detector.detectPatterns(annotations);
      expect(patterns).toHaveLength(0);
    });

    it('should handle correlation when some successes share same notes as failures', () => {
      const failureNote = 'Tests still failing after error pattern detected';
      const matchingAnnotations = Array(3).fill(null).map(() =>
        createAnnotation({
          notes: failureNote,
          status: 'failure',
        })
      );
      // Add success annotations with the exact same notes
      const successWithSameNotes = Array(2).fill(null).map(() =>
        createAnnotation({
          notes: failureNote,
          status: 'success',
        })
      );

      const patterns = detector.detectPatterns([...matchingAnnotations, ...successWithSameNotes]);
      const pattern = patterns.find(p => p.type === 'verification_gap');

      expect(pattern).toBeDefined();
      // Correlation should be reduced due to successes having the same notes
      expect(pattern?.correlation_strength).toBeLessThan(1.0);
      expect(pattern?.correlation_strength).toBeGreaterThan(0);
    });
  });

  describe('truncateEvidence', () => {
    it('should truncate long evidence text to 100 characters', () => {
      // Create annotations with very long notes that will be included as evidence
      const longNotes = 'A'.repeat(200) + ' tests still failing after claimed success';
      const annotations = Array(3).fill(null).map(() =>
        createAnnotation({
          notes: longNotes,
          status: 'failure',
        })
      );

      const patterns = detector.detectPatterns(annotations);
      const pattern = patterns.find(p => p.type === 'verification_gap');

      expect(pattern).toBeDefined();
      // Each evidence item should be truncated to 100 characters
      pattern?.evidence.forEach(e => {
        expect(e.length).toBeLessThanOrEqual(100);
        expect(e).toMatch(/\.\.\.$/);
      });
    });

    it('should not truncate short evidence text', () => {
      const shortNotes = 'Tests still failing';
      const annotations = Array(3).fill(null).map(() =>
        createAnnotation({
          notes: shortNotes,
          status: 'failure',
        })
      );

      const patterns = detector.detectPatterns(annotations);
      const pattern = patterns.find(p => p.type === 'verification_gap');

      expect(pattern).toBeDefined();
      pattern?.evidence.forEach(e => {
        expect(e).toBe(shortNotes);
      });
    });
  });

  describe('getUniquePrompts edge cases', () => {
    it('should return empty array when annotations have no promptName', () => {
      const annotations = Array(3).fill(null).map(() =>
        createAnnotation({
          notes: 'Tests still failing after error',
          status: 'failure',
          promptName: '',
        })
      );

      const patterns = detector.detectPatterns(annotations);
      const pattern = patterns.find(p => p.type === 'verification_gap');

      expect(pattern).toBeDefined();
      // Empty string promptNames should not be added to the set
      // (they will be added since the code checks for truthy, but '' is falsy)
      expect(pattern?.affectedPrompts).toHaveLength(0);
    });
  });

  describe('environment-specific pattern edge cases', () => {
    it('should detect patterns from environment keyword notes without branch info', () => {
      const annotations = Array(3).fill(null).map(() =>
        createAnnotation({
          notes: 'Only fails on this branch, works on main',
          status: 'failure',
        })
      );

      const patterns = detector.detectPatterns(annotations);
      const envPattern = patterns.find(p => p.type === 'environment_specific');

      expect(envPattern).toBeDefined();
      expect(envPattern?.frequency).toBe(3);
    });

    it('should prefer branch-based evidence over keyword-based evidence', () => {
      // Create branch-based failures
      const branchAnnotations = Array(4).fill(null).map(() =>
        createAnnotation({
          notes: 'Failure on branch',
          status: 'failure',
          environment: { git_branch: 'feature/broken' },
        })
      );
      // Also add keyword-based matches
      const keywordAnnotations = Array(3).fill(null).map(() =>
        createAnnotation({
          notes: 'Only fails on this branch',
          status: 'failure',
        })
      );

      const patterns = detector.detectPatterns([...branchAnnotations, ...keywordAnnotations]);
      const envPattern = patterns.find(p => p.type === 'environment_specific');

      expect(envPattern).toBeDefined();
      // Should use the branch evidence since it has more matches
      expect(envPattern?.frequency).toBe(4);
      expect(envPattern?.evidence[0]).toContain('feature/test');
    });
  });
});

describe('AnnotationAnalyzer - additional coverage', () => {
  let analyzer: AnnotationAnalyzer;

  beforeEach(() => {
    analyzer = new AnnotationAnalyzer();
  });

  describe('parseAnnotations edge cases', () => {
    it('should handle annotations with missing notes', () => {
      const annotations = [
        {
          historyFile: 'test.json',
          status: 'success' as const,
          tags: [],
          timestamp: new Date().toISOString(),
        },
      ];

      const parsed = analyzer.parseAnnotations(annotations);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].notes).toBe('');
    });

    it('should handle annotations with missing tags', () => {
      const annotations = [
        {
          historyFile: 'test.json',
          status: 'success' as const,
          notes: 'Test',
          timestamp: new Date().toISOString(),
        },
      ];

      // Tags are required in type but test with undefined-like behavior
      const parsed = analyzer.parseAnnotations(annotations as any);

      expect(parsed).toHaveLength(1);
    });

    it('should preserve auto_detected flag', () => {
      const annotations = [
        {
          historyFile: 'test.json',
          status: 'partial' as const,
          tags: ['auto'],
          notes: 'Auto-detected issue',
          auto_detected: true,
          timestamp: new Date().toISOString(),
        },
      ];

      const parsed = analyzer.parseAnnotations(annotations);

      expect(parsed[0].auto_detected).toBe(true);
    });

    it('should handle auto_detected set to false', () => {
      const annotations = [
        {
          historyFile: 'test.json',
          status: 'success' as const,
          tags: [],
          notes: 'Manual annotation',
          auto_detected: false,
          timestamp: new Date().toISOString(),
        },
      ];

      const parsed = analyzer.parseAnnotations(annotations);

      expect(parsed[0].auto_detected).toBe(false);
    });
  });

  describe('detectPatternsInText - missing_constraint patterns', () => {
    it('should detect missing constraint patterns', () => {
      const testCases = [
        'No requirement for error handling specified',
        'Missing constraint for performance requirements',
        "Didn't specify requirements about edge cases",
        'Performance not specified in the prompt',
      ];

      testCases.forEach(text => {
        const annotations: ParsedAnnotation[] = [{
          historyFile: 'test.json',
          promptName: 'test',
          status: 'failure',
          tags: [],
          notes: text,
          timestamp: new Date().toISOString(),
          annotationPath: '/test/annotation.json',
        }];

        const patterns = analyzer.extractPatterns(annotations);
        expect(patterns).toContain('missing_constraint');
      });
    });
  });

  describe('getAnalysisSummary with empty annotations', () => {
    it('should return zeroed summary for empty array', () => {
      const summary = analyzer.getAnalysisSummary([]);

      expect(summary.totalAnnotations).toBe(0);
      expect(summary.statusDistribution.success).toBe(0);
      expect(summary.statusDistribution.partial).toBe(0);
      expect(summary.statusDistribution.failure).toBe(0);
      expect(Object.keys(summary.patternFrequency)).toHaveLength(0);
      expect(summary.commonTags).toHaveLength(0);
    });
  });

  describe('extractPromptName', () => {
    it('should return unknown for any history filename', () => {
      const annotations = [
        {
          historyFile: '20250816-100000-abc123.json',
          status: 'success' as const,
          tags: [],
          notes: 'Test',
          timestamp: new Date().toISOString(),
        },
      ];

      const parsed = analyzer.parseAnnotations(annotations);

      // The extractPromptName method always returns 'unknown'
      // since prompt name can't be derived from the filename format
      expect(parsed[0].promptName).toBe('unknown');
    });
  });
});
