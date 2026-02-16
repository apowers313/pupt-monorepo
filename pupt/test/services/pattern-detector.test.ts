import { describe, it, expect, beforeEach } from 'vitest';
import { PatternDetector } from '../../src/services/pattern-detector.js';
import type { ParsedAnnotation } from '../../src/types/annotations.js';

describe('PatternDetector', () => {
  let detector: PatternDetector;

  beforeEach(() => {
    detector = new PatternDetector();
  });

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

  describe('verification gap detection', () => {
    it('should identify verification gap patterns', () => {
      const annotations: ParsedAnnotation[] = [
        createAnnotation({
          notes: 'Tests still failing after AI claimed success',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Claude said it was done but npm test shows failures',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Implementation incomplete - tests still failing',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Claimed success but verification failed',
          status: 'failure',
        }),
        // Add some success cases to make it 4/10 = 40% (high severity)
        createAnnotation({ status: 'success' }),
        createAnnotation({ status: 'success' }),
        createAnnotation({ status: 'success' }),
        createAnnotation({ status: 'success' }),
        createAnnotation({ status: 'success' }),
        createAnnotation({ status: 'success' }),
      ];

      const patterns = detector.detectPatterns(annotations);
      const verificationGap = patterns.find(p => p.type === 'verification_gap');

      expect(verificationGap).toBeDefined();
      expect(verificationGap?.frequency).toBe(4);
      expect(verificationGap?.severity).toBe('high');
      expect(verificationGap?.evidence).toHaveLength(4);
    });

    it('should not detect pattern with fewer than 3 occurrences', () => {
      const annotations: ParsedAnnotation[] = [
        createAnnotation({
          notes: 'Tests failing',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Another issue',
          status: 'success',
        }),
      ];

      const patterns = detector.detectPatterns(annotations);
      expect(patterns).toHaveLength(0);
    });
  });

  describe('incomplete task detection', () => {
    it('should detect incomplete task patterns', () => {
      const annotations: ParsedAnnotation[] = [
        createAnnotation({
          notes: 'Stopped at first error, did not fix remaining issues',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Only fixed one test, left 10 others failing',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Incomplete - stopped after fixing first issue',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Did not complete all requested tasks',
          status: 'partial',
        }),
      ];

      const patterns = detector.detectPatterns(annotations);
      const incompleteTask = patterns.find(p => p.type === 'incomplete_task');

      expect(incompleteTask).toBeDefined();
      expect(incompleteTask?.frequency).toBe(4);
      expect(incompleteTask?.evidence).toHaveLength(4);
    });
  });

  describe('environment-specific patterns', () => {
    it('should detect environment-specific failure patterns', () => {
      const annotations: ParsedAnnotation[] = [
        createAnnotation({
          notes: 'Works on main branch but fails on feature branch',
          status: 'failure',
          environment: { git_branch: 'feature/test' },
        }),
        createAnnotation({
          notes: 'Branch-specific failure',
          status: 'failure',
          environment: { git_branch: 'feature/test' },
        }),
        createAnnotation({
          notes: 'Only fails on this branch',
          status: 'failure',
          environment: { git_branch: 'feature/test' },
        }),
        createAnnotation({
          notes: 'Success on main',
          status: 'success',
          environment: { git_branch: 'main' },
        }),
      ];

      const patterns = detector.detectPatterns(annotations);
      const envPattern = patterns.find(p => p.type === 'environment_specific');

      expect(envPattern).toBeDefined();
      expect(envPattern?.frequency).toBe(3);
      expect(envPattern?.evidence.some(e => e.includes('feature/test'))).toBe(true);
    });
  });

  describe('ambiguous objective patterns', () => {
    it('should detect ambiguous objective patterns', () => {
      const annotations: ParsedAnnotation[] = [
        createAnnotation({
          notes: 'Unclear what "fix the error" meant - there were many errors',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Ambiguous instructions led to incomplete implementation',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Not sure which error to fix first',
          status: 'partial',
        }),
        createAnnotation({
          notes: 'Instructions were too vague',
          status: 'failure',
        }),
      ];

      const patterns = detector.detectPatterns(annotations);
      const ambiguousPattern = patterns.find(p => p.type === 'ambiguous_objective');

      expect(ambiguousPattern).toBeDefined();
      expect(ambiguousPattern?.frequency).toBe(4);
    });
  });

  describe('pattern ranking and severity', () => {
    it('should rank patterns by severity based on frequency and total annotations', () => {
      const annotations: ParsedAnnotation[] = [
        // 6 verification gaps (60% of total)
        ...Array(6).fill(null).map(() => createAnnotation({
          notes: 'Tests failing after claimed success',
          status: 'partial',
        })),
        // 3 incomplete tasks (30% of total)
        ...Array(3).fill(null).map(() => createAnnotation({
          notes: 'Stopped at first error',
          status: 'partial',
        })),
        // 1 success
        createAnnotation({ status: 'success' }),
      ];

      const patterns = detector.detectPatterns(annotations);
      const verificationGap = patterns.find(p => p.type === 'verification_gap');
      const incompleteTask = patterns.find(p => p.type === 'incomplete_task');

      expect(verificationGap?.severity).toBe('critical'); // >50% of annotations
      expect(incompleteTask?.severity).toBe('high'); // 30% of annotations
    });

    it('should calculate severity levels correctly', () => {
      const annotations: ParsedAnnotation[] = Array(100).fill(null).map((_, i) => {
        if (i < 60) {
          // 60% - critical (verification gap pattern)
          return createAnnotation({
            notes: 'Tests still failing after completion',
            status: 'failure',
          });
        } else if (i < 75) {
          // 15% - medium (incomplete task pattern)
          return createAnnotation({
            notes: 'Stopped at first error - incomplete',
            status: 'partial',
          });
        } else {
          return createAnnotation({ status: 'success' });
        }
      });

      const patterns = detector.detectPatterns(annotations);
      
      // Should have one critical pattern (60%)
      expect(patterns.some(p => p.severity === 'critical')).toBe(true);
      
      // Should have one medium pattern (15%)
      expect(patterns.some(p => p.severity === 'medium')).toBe(true);
    });
  });

  describe('pattern evidence and affected prompts', () => {
    it('should track evidence and affected prompts', () => {
      const annotations: ParsedAnnotation[] = [
        createAnnotation({
          notes: 'Verification failed for prompt A',
          status: 'partial',
          promptName: 'prompt-a',
        }),
        createAnnotation({
          notes: 'Tests still failing for prompt B',
          status: 'partial',
          promptName: 'prompt-b',
        }),
        createAnnotation({
          notes: 'Claimed success but failed for prompt A again',
          status: 'partial',
          promptName: 'prompt-a',
        }),
      ];

      const patterns = detector.detectPatterns(annotations);
      const pattern = patterns[0];

      expect(pattern.evidence).toHaveLength(3);
      expect(pattern.evidence[0]).toContain('Verification failed');
      expect(pattern.affectedPrompts).toContain('prompt-a');
      expect(pattern.affectedPrompts).toContain('prompt-b');
      expect(pattern.affectedPrompts).toHaveLength(2); // unique prompts
    });
  });

  describe('correlation with outcomes', () => {
    it('should correlate patterns with execution outcomes', () => {
      const annotations: ParsedAnnotation[] = [
        createAnnotation({
          notes: 'Tests still failing after claimed success',
          status: 'partial',
          outcome: {
            tasks_completed: 1,
            tasks_total: 3,
            tests_passed: 0,
            tests_failed: 5,
          },
        }),
        createAnnotation({
          notes: 'Verification failed - tests still failing',
          status: 'partial',
          outcome: {
            tasks_completed: 2,
            tasks_total: 3,
            tests_passed: 2,
            tests_failed: 3,
          },
        }),
        createAnnotation({
          notes: 'All tests still failing despite completion claim',
          status: 'failure',
          outcome: {
            tasks_completed: 0,
            tasks_total: 1,
            tests_passed: 0,
            tests_failed: 10,
          },
        }),
      ];

      const patterns = detector.detectPatterns(annotations);
      
      expect(patterns.length).toBeGreaterThan(0);
      const pattern = patterns[0];

      expect(pattern.affected_executions).toBe(3);
      expect(pattern.correlation_strength).toBeGreaterThan(0);
    });
  });
});