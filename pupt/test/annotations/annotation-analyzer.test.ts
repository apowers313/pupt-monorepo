import { beforeEach,describe, expect, it } from 'vitest';

import { AnnotationAnalyzer } from '../../src/annotations/annotation-analyzer.js';
import { IssueIdentified,ParsedAnnotation, StructuredOutcome } from '../../src/types/annotations.js';

describe('AnnotationAnalyzer', () => {
  let analyzer: AnnotationAnalyzer;

  beforeEach(() => {
    analyzer = new AnnotationAnalyzer();
  });

  describe('parseAnnotations', () => {
    it('should parse existing annotations with legacy format', () => {
      const annotations = [
        {
          historyFile: 'test1.json',
          status: 'success' as const,
          tags: ['feature', 'tested'],
          notes: 'Everything worked as expected'
        },
        {
          historyFile: 'test2.json',
          status: 'partial' as const,
          tags: ['bug'],
          notes: 'Tests failed after implementation. Fixed 3 out of 5 errors.'
        }
      ];

      const parsed = analyzer.parseAnnotations(annotations);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].status).toBe('success');
      expect(parsed[0].tags).toEqual(['feature', 'tested']);
      expect(parsed[0].notes).toBe('Everything worked as expected');
    });

    it('should parse enhanced annotations with structured outcome data', () => {
      const annotation = {
        historyFile: 'test.json',
        status: 'partial' as const,
        tags: ['implementation'],
        notes: 'Partial completion with test failures',
        structured_outcome: {
          tasks_completed: 3,
          tasks_total: 5,
          tests_run: 10,
          tests_passed: 7,
          tests_failed: 3,
          verification_passed: false,
          execution_time: '5m32s'
        },
        issues_identified: [
          {
            category: 'verification_gap',
            severity: 'high',
            description: 'AI claimed success but tests still failing',
            evidence: 'Output showed "Implementation complete" but npm test had 3 failures'
          }
        ]
      };

      const parsed = analyzer.parseAnnotations([annotation]);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].structured_outcome).toBeDefined();
      expect(parsed[0].structured_outcome?.tasks_completed).toBe(3);
      expect(parsed[0].issues_identified).toHaveLength(1);
      expect(parsed[0].issues_identified![0].category).toBe('verification_gap');
    });
  });

  describe('extractPatterns', () => {
    it('should extract patterns from annotation text', () => {
      const annotations: ParsedAnnotation[] = [
        {
          historyFile: 'test1.json',
          promptName: 'implement-feature',
          status: 'partial',
          tags: [],
          notes: 'Tests were still failing after AI said it was done',
          timestamp: new Date().toISOString()
        },
        {
          historyFile: 'test2.json',
          promptName: 'fix-bug',
          status: 'partial',
          tags: [],
          notes: 'Incomplete implementation - stopped at first error without fixing others',
          timestamp: new Date().toISOString()
        }
      ];

      const patterns = analyzer.extractPatterns(annotations);

      expect(patterns).toContain('verification_gap');
      expect(patterns).toContain('incomplete_task');
    });

    it('should extract patterns from structured issues', () => {
      const annotations: ParsedAnnotation[] = [
        {
          historyFile: 'test.json',
          promptName: 'test-prompt',
          status: 'failure',
          tags: [],
          notes: '',
          timestamp: new Date().toISOString(),
          issues_identified: [
            {
              category: 'ambiguous_instruction',
              severity: 'medium',
              description: 'Prompt unclear about error handling',
              evidence: 'AI implemented happy path only'
            },
            {
              category: 'missing_constraint',
              severity: 'high',
              description: 'No performance requirements specified',
              evidence: 'Implementation was O(n²) when O(n) was needed'
            }
          ]
        }
      ];

      const patterns = analyzer.extractPatterns(annotations);

      expect(patterns).toContain('ambiguous_instruction');
      expect(patterns).toContain('missing_constraint');
    });
  });

  describe('categorizeIssues', () => {
    it('should categorize issues by type', () => {
      const annotations: ParsedAnnotation[] = [
        {
          historyFile: 'test1.json',
          promptName: 'prompt1',
          status: 'partial',
          tags: [],
          notes: 'Tests failing',
          timestamp: new Date().toISOString(),
          issues_identified: [
            {
              category: 'verification_gap',
              severity: 'high',
              description: 'Issue 1',
              evidence: 'Evidence 1'
            }
          ]
        },
        {
          historyFile: 'test2.json',
          promptName: 'prompt2',
          status: 'partial',
          tags: [],
          notes: 'Incomplete',
          timestamp: new Date().toISOString(),
          issues_identified: [
            {
              category: 'verification_gap',
              severity: 'medium',
              description: 'Issue 2',
              evidence: 'Evidence 2'
            },
            {
              category: 'incomplete_task',
              severity: 'high',
              description: 'Issue 3',
              evidence: 'Evidence 3'
            }
          ]
        }
      ];

      const categorized = analyzer.categorizeIssues(annotations);

      expect(categorized.verification_gap).toHaveLength(2);
      expect(categorized.incomplete_task).toHaveLength(1);
      expect(categorized.verification_gap[0].description).toBe('Issue 1');
    });

    it('should handle annotations without structured issues', () => {
      const annotations: ParsedAnnotation[] = [
        {
          historyFile: 'test.json',
          promptName: 'test',
          status: 'success',
          tags: [],
          notes: 'All good',
          timestamp: new Date().toISOString()
        }
      ];

      const categorized = analyzer.categorizeIssues(annotations);

      expect(Object.keys(categorized)).toHaveLength(0);
    });
  });

  describe('calculatePatternFrequency', () => {
    it('should calculate pattern frequency correctly', () => {
      const annotations: ParsedAnnotation[] = [
        {
          historyFile: 'test1.json',
          promptName: 'prompt1',
          status: 'partial',
          tags: [],
          notes: 'Tests still failing after completion claimed',
          timestamp: new Date().toISOString()
        },
        {
          historyFile: 'test2.json',
          promptName: 'prompt2',
          status: 'partial',
          tags: [],
          notes: 'AI said done but tests were failing',
          timestamp: new Date().toISOString()
        },
        {
          historyFile: 'test3.json',
          promptName: 'prompt3',
          status: 'failure',
          tags: [],
          notes: 'Stopped at first error',
          timestamp: new Date().toISOString()
        }
      ];

      const frequency = analyzer.calculatePatternFrequency(annotations);

      expect(frequency.verification_gap).toBe(2);
      expect(frequency.incomplete_task).toBe(1);
    });

    it('should count patterns from both text and structured issues', () => {
      const annotations: ParsedAnnotation[] = [
        {
          historyFile: 'test1.json',
          promptName: 'prompt1',
          status: 'partial',
          tags: [],
          notes: 'Tests failing despite completion claim',
          timestamp: new Date().toISOString()
        },
        {
          historyFile: 'test2.json',
          promptName: 'prompt2',
          status: 'partial',
          tags: [],
          notes: 'Other issue',
          timestamp: new Date().toISOString(),
          issues_identified: [
            {
              category: 'verification_gap',
              severity: 'high',
              description: 'Structured verification issue',
              evidence: 'Evidence'
            }
          ]
        }
      ];

      const frequency = analyzer.calculatePatternFrequency(annotations);

      expect(frequency.verification_gap).toBe(2);
    });
  });

  describe('pattern detection rules', () => {
    it('should detect verification gap patterns', () => {
      const testCases = [
        'Tests still failing after AI claimed success',
        'Said it was done but tests failed',
        'Claimed completion but errors remain',
        'Tests were failing despite success claim',
        'AI said complete but build failed'
      ];

      testCases.forEach(text => {
        const annotations: ParsedAnnotation[] = [{
          historyFile: 'test.json',
          promptName: 'test',
          status: 'partial',
          tags: [],
          notes: text,
          timestamp: new Date().toISOString()
        }];

        const patterns = analyzer.extractPatterns(annotations);
        expect(patterns).toContain('verification_gap');
      });
    });

    it('should detect incomplete task patterns', () => {
      const testCases = [
        'Stopped at first error',
        'Only fixed one issue',
        'Incomplete implementation',
        'Partial completion',
        'Did not finish all tasks'
      ];

      testCases.forEach(text => {
        const annotations: ParsedAnnotation[] = [{
          historyFile: 'test.json',
          promptName: 'test',
          status: 'partial',
          tags: [],
          notes: text,
          timestamp: new Date().toISOString()
        }];

        const patterns = analyzer.extractPatterns(annotations);
        expect(patterns).toContain('incomplete_task');
      });
    });

    it('should detect ambiguous instruction patterns', () => {
      const testCases = [
        'Unclear what was expected',
        'Ambiguous requirements',
        'Prompt was not specific enough',
        'Instructions were vague',
        'Confusing prompt'
      ];

      testCases.forEach(text => {
        const annotations: ParsedAnnotation[] = [{
          historyFile: 'test.json',
          promptName: 'test',
          status: 'failure',
          tags: [],
          notes: text,
          timestamp: new Date().toISOString()
        }];

        const patterns = analyzer.extractPatterns(annotations);
        expect(patterns).toContain('ambiguous_instruction');
      });
    });
  });

  describe('getAnalysisSummary', () => {
    it('should provide a comprehensive analysis summary', () => {
      const annotations: ParsedAnnotation[] = [
        {
          historyFile: 'test1.json',
          promptName: 'implement-feature',
          status: 'success',
          tags: ['feature'],
          notes: 'Worked perfectly',
          timestamp: new Date().toISOString()
        },
        {
          historyFile: 'test2.json',
          promptName: 'fix-bug',
          status: 'partial',
          tags: ['bug'],
          notes: 'Tests still failing after completion',
          timestamp: new Date().toISOString()
        },
        {
          historyFile: 'test3.json',
          promptName: 'refactor',
          status: 'failure',
          tags: [],
          notes: 'Unclear requirements led to wrong implementation',
          timestamp: new Date().toISOString()
        }
      ];

      const summary = analyzer.getAnalysisSummary(annotations);

      expect(summary.totalAnnotations).toBe(3);
      expect(summary.statusDistribution.success).toBe(1);
      expect(summary.statusDistribution.partial).toBe(1);
      expect(summary.statusDistribution.failure).toBe(1);
      expect(summary.patternFrequency.verification_gap).toBe(1);
      expect(summary.patternFrequency.ambiguous_instruction).toBe(1);
      expect(summary.commonTags).toContain('feature');
      expect(summary.commonTags).toContain('bug');
    });
  });
});