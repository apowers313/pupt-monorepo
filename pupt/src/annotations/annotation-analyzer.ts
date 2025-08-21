import { 
  AnnotationMetadata, 
  ParsedAnnotation, 
  IssueIdentified,
  AnnotationAnalysisSummary 
} from '../types/annotations.js';

interface RawAnnotation extends AnnotationMetadata {
  notes?: string;
}

export class AnnotationAnalyzer {
  private patternRules = {
    verification_gap: [
      /test.*fail.*(?:after|despite).*(?:claim|said).*(?:success|complete|done)/i,
      /(?:claim|said).*(?:success|complete|done).*but.*test.*fail/i,
      /test.*still.*fail/i,
      /AI.*(?:said|claimed).*(?:success|complete|done).*but.*(?:test|build).*fail/i,
      /(?:claim|said).*complet.*but.*error.*remain/i,
      /test.*(?:were|was).*fail.*despite.*(?:success|completion).*claim/i,
      /test.*fail.*despite.*complet.*claim/i
    ],
    incomplete_task: [
      /stopped?\s+at\s+first\s+error/i,
      /only\s+(?:fixed|completed|did)\s+(?:one|1|part)/i,
      /incomplete\s+implementation/i,
      /partial(?:ly)?\s+complet/i,
      /did\s+not\s+finish\s+all/i,
      /(?:fixed|completed)\s+\d+\s+(?:of|out\s+of)\s+\d+/i,
      /left\s+(?:some|other)\s+(?:error|issue|task)/i
    ],
    ambiguous_instruction: [
      /unclear\s+(?:what|requirement|instruction|expectation)/i,
      /ambiguous\s+(?:requirement|instruction|prompt)/i,
      /prompt\s+(?:was|is)\s+(?:not\s+)?(?:specific|clear)/i,
      /instruction.*vague/i,
      /confusing\s+prompt/i,
      /(?:not|wasn't)\s+(?:sure|clear)\s+what\s+(?:to|was\s+expected)/i
    ],
    missing_constraint: [
      /(?:no|missing)\s+(?:requirement|constraint|specification)\s+(?:for|about)/i,
      /(?:didn't|did\s+not)\s+(?:specify|mention)\s+(?:requirement|constraint)/i,
      /(?:forgot|missed)\s+to\s+(?:include|specify|mention)/i,
      /(?:performance|security|error\s+handling).*(?:not\s+specified|missing)/i
    ]
  };

  parseAnnotations(annotations: RawAnnotation[]): ParsedAnnotation[] {
    return annotations.map(ann => {
      const parsed: ParsedAnnotation = {
        historyFile: ann.historyFile,
        timestamp: ann.timestamp,
        status: ann.status,
        tags: ann.tags || [],
        notes: ann.notes || '',
        promptName: this.extractPromptName(ann.historyFile)
      };

      if (ann.structured_outcome) {
        parsed.structured_outcome = ann.structured_outcome;
      }

      if (ann.issues_identified) {
        parsed.issues_identified = ann.issues_identified;
      }

      if (ann.auto_detected !== undefined) {
        parsed.auto_detected = ann.auto_detected;
      }

      return parsed;
    });
  }

  extractPatterns(annotations: ParsedAnnotation[]): string[] {
    const patterns = new Set<string>();

    annotations.forEach(ann => {
      // Extract from structured issues
      if (ann.issues_identified) {
        ann.issues_identified.forEach(issue => {
          patterns.add(issue.category);
        });
      }

      // Extract from notes text
      const textPatterns = this.detectPatternsInText(ann.notes);
      textPatterns.forEach(p => patterns.add(p));
    });

    return Array.from(patterns);
  }

  categorizeIssues(annotations: ParsedAnnotation[]): Record<string, IssueIdentified[]> {
    const categorized: Record<string, IssueIdentified[]> = {};

    annotations.forEach(ann => {
      if (ann.issues_identified) {
        ann.issues_identified.forEach(issue => {
          if (!categorized[issue.category]) {
            categorized[issue.category] = [];
          }
          categorized[issue.category].push(issue);
        });
      }
    });

    return categorized;
  }

  calculatePatternFrequency(annotations: ParsedAnnotation[]): Record<string, number> {
    const frequency: Record<string, number> = {};

    annotations.forEach(ann => {
      // Count from structured issues
      if (ann.issues_identified) {
        ann.issues_identified.forEach(issue => {
          frequency[issue.category] = (frequency[issue.category] || 0) + 1;
        });
      }

      // Count from text patterns
      const textPatterns = this.detectPatternsInText(ann.notes);
      textPatterns.forEach(pattern => {
        frequency[pattern] = (frequency[pattern] || 0) + 1;
      });
    });

    return frequency;
  }

  getAnalysisSummary(annotations: ParsedAnnotation[]): AnnotationAnalysisSummary {
    const statusDistribution = {
      success: 0,
      partial: 0,
      failure: 0
    };

    const tagCounts: Record<string, number> = {};

    annotations.forEach(ann => {
      statusDistribution[ann.status]++;
      
      ann.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const commonTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);

    return {
      totalAnnotations: annotations.length,
      statusDistribution,
      patternFrequency: this.calculatePatternFrequency(annotations),
      commonTags,
      issuesByCategory: this.categorizeIssues(annotations)
    };
  }

  private detectPatternsInText(text: string): string[] {
    const detected: string[] = [];

    Object.entries(this.patternRules).forEach(([pattern, rules]) => {
      if (rules.some(rule => rule.test(text))) {
        detected.push(pattern);
      }
    });

    return detected;
  }

  private extractPromptName(_historyFile: string): string {
    // Extract prompt name from history filename pattern
    // For now, use a placeholder since we don't have the actual prompt name in the filename
    return 'unknown';
  }
}