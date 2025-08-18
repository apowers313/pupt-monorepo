# Review Command Implementation Plan

## Overview

This plan implements the `pt review` command and supporting infrastructure for AI-assisted prompt improvement based on usage history and patterns. The implementation follows test-driven design with small, verifiable phases.

## Key Design Principles

1. **Test-First Development**: Write tests before implementation
2. **Incremental Delivery**: Each phase delivers working functionality
3. **Reuse Existing Code**: Leverage current modules and patterns
4. **Isolation & Mocking**: Ensure tests are independent from environment
5. **Human Verifiable**: Each phase produces observable results

## Reusable Components & Libraries

### Existing Modules to Reuse:
- **HistoryManager**: Extend for enhanced metadata storage
- **ConfigManager**: Add output capture configuration
- **SearchEngine**: Adapt for pattern matching in annotations
- **Command structure**: Follow existing command patterns
- **Error handling**: Use consistent error system
- **Date utilities**: Leverage existing DateFormats

### New Libraries to Install:
- **node-pty**: For transparent output capture with PTY support
- **strip-ansi**: For cleaning ANSI codes from captured output
- **json-schema**: For validating annotation structures
- **micromatch**: For pattern matching in analysis

### New Modules to Create:
- **OutputCaptureService**: Manages transparent output capture
- **AnnotationAnalyzer**: Analyzes annotations for patterns
- **PatternDetector**: Identifies common failure patterns
- **ReviewDataBuilder**: Builds comprehensive review data
- **AutoAnnotationService**: Automatic annotation generation

## Implementation Phases

### Phase 1: Enhanced History with Execution Metadata
**Goal**: Capture execution context and environment data with each prompt run

#### Tests First:
```typescript
// test/history/enhanced-history.test.ts
describe('Enhanced History', () => {
  it('should capture execution environment metadata');
  it('should track execution duration');
  it('should store git branch and commit info');
  it('should handle missing git info gracefully');
});

// test/types/enhanced-history.test.ts
describe('Enhanced History Types', () => {
  it('should validate enhanced history entry schema');
  it('should maintain backward compatibility');
});
```

#### Implementation:
1. Extend `HistoryEntry` interface with execution metadata
2. Update `HistoryManager.savePrompt()` to capture environment
3. Add git info collection utilities
4. Ensure backward compatibility with existing history

#### Human Verification:
- Run `pt run` with a prompt
- Check history file contains environment data
- Verify git info is captured correctly

### Phase 2: Output Capture Infrastructure
**Goal**: Transparently capture command output while maintaining interactivity

#### Tests First:
```typescript
// test/services/output-capture.test.ts
describe('OutputCaptureService', () => {
  it('should capture output without breaking interactivity');
  it('should strip ANSI codes from captured output');
  it('should handle large outputs with size limits');
  it('should create output files in configured directory');
});

// test/integration/output-capture-integration.test.ts
describe('Output Capture Integration', () => {
  it('should capture claude session output');
  it('should preserve terminal colors for user');
  it('should link output file in history entry');
});
```

#### Implementation:
1. Create `OutputCaptureService` using node-pty
2. Integrate with `runCommand` to capture when enabled
3. Add output file linking to history entries
4. Implement size limits and cleanup

#### Human Verification:
- Enable output capture in config
- Run interactive `claude` session
- Verify normal interaction works
- Check output file is created and contains session

### Phase 3: Annotation System Enhancement
**Goal**: Add structured annotation format with automatic pattern detection

#### Tests First:
```typescript
// test/annotations/annotation-analyzer.test.ts
describe('AnnotationAnalyzer', () => {
  it('should parse existing annotations');
  it('should extract patterns from annotation text');
  it('should categorize issues by type');
  it('should calculate pattern frequency');
});

// test/commands/annotate-enhanced.test.ts
describe('Enhanced Annotate Command', () => {
  it('should support structured outcome data');
  it('should validate annotation schema');
  it('should maintain backward compatibility');
});
```

#### Implementation:
1. Create `AnnotationAnalyzer` for parsing annotations
2. Enhance annotation format with structured data
3. Add pattern extraction from user notes
4. Implement frequency analysis

#### Human Verification:
- Create annotations with new format
- Run pattern analysis manually
- Verify patterns are correctly identified

### Phase 4: Review Command Core
**Goal**: Implement basic `pt review` command with JSON export

#### Tests First:
```typescript
// test/commands/review.test.ts
describe('Review Command', () => {
  it('should aggregate history and annotation data');
  it('should export JSON format');
  it('should support time filtering');
  it('should handle missing annotations gracefully');
});

// test/services/review-data-builder.test.ts
describe('ReviewDataBuilder', () => {
  it('should build comprehensive review data structure');
  it('should calculate usage statistics');
  it('should identify patterns across prompts');
});
```

#### Implementation:
1. Create `review` command following existing patterns
2. Implement `ReviewDataBuilder` service
3. Add JSON export functionality
4. Support filtering options (--since, specific prompts)

#### Human Verification:
- Run `pt review --format json`
- Verify JSON structure matches spec
- Check statistics are calculated correctly
- Test time filtering works

### Phase 5: Pattern Detection Engine
**Goal**: Identify common patterns and generate improvement suggestions

#### Tests First:
```typescript
// test/services/pattern-detector.test.ts
describe('PatternDetector', () => {
  it('should identify verification gap patterns');
  it('should detect incomplete task patterns');
  it('should correlate failures with environment');
  it('should rank patterns by severity');
});

// test/services/suggestion-generator.test.ts
describe('SuggestionGenerator', () => {
  it('should generate specific fixes for patterns');
  it('should prioritize by impact');
  it('should include evidence in suggestions');
});
```

#### Implementation:
1. Create `PatternDetector` with rule-based detection
2. Implement pattern correlation algorithms
3. Add `SuggestionGenerator` for improvements
4. Include pattern evidence and frequency

#### Human Verification:
- Create test annotations with known patterns
- Run review to see pattern detection
- Verify suggestions are relevant and specific

### Phase 6: Auto-Annotation System
**Goal**: Automatically analyze execution output and create annotations

#### Tests First:
```typescript
// test/services/auto-annotation.test.ts
describe('AutoAnnotationService', () => {
  it('should run analysis prompt after execution');
  it('should parse JSON response from AI');
  it('should fall back to pattern rules on failure');
  it('should create annotation files automatically');
});

// test/integration/auto-annotation-flow.test.ts
describe('Auto-Annotation Flow', () => {
  it('should trigger after configured prompts');
  it('should pass output file to analysis prompt');
  it('should handle analysis failures gracefully');
});
```

#### Implementation:
1. Create `AutoAnnotationService`
2. Integrate with `runCommand` post-execution
3. Implement fallback pattern matching
4. Add analysis prompt execution

#### Human Verification:
- Configure auto-annotation in config
- Run a prompt with known failures
- Verify annotation is created automatically
- Check annotation contains detected issues

### Phase 7: Configuration & Integration
**Goal**: Add configuration options and integrate all components

#### Tests First:
```typescript
// test/config/output-capture-config.test.ts
describe('Output Capture Configuration', () => {
  it('should validate output capture settings');
  it('should merge with existing config');
  it('should handle migration from v3 to v4');
});

// test/integration/full-review-flow.test.ts
describe('Full Review Flow', () => {
  it('should capture output, annotate, and review');
  it('should work with AI analysis prompt');
  it('should produce actionable recommendations');
});
```

#### Implementation:
1. Update config schema for v4.0.0
2. Add output capture configuration
3. Add auto-annotation configuration
4. Implement config migration

#### Human Verification:
- Update config with new settings
- Run full workflow: execute → annotate → review
- Verify all components work together

## Test Helpers & Utilities

### Mock Factories:
```typescript
// test/test-utils/factories.ts
export const createMockHistoryEntry = (overrides = {}) => ({
  timestamp: '2025-08-16T10:00:00Z',
  templatePath: 'prompts/test.md',
  // ... other defaults
  ...overrides
});

export const createMockAnnotation = (overrides = {}) => ({
  historyFile: 'test.json',
  status: 'success',
  // ... other defaults
  ...overrides
});
```

### Test Fixtures:
```typescript
// test/fixtures/output-samples.ts
export const CLAUDE_OUTPUT_WITH_ANSI = `
\x1b[32m✓\x1b[0m Implementation complete
\x1b[31mFAIL\x1b[0m test/example.test.ts
`;

export const CLEAN_OUTPUT = `
✓ Implementation complete
FAIL test/example.test.ts
`;
```

### Environment Mocks:
```typescript
// test/test-utils/environment.ts
export const mockGitEnvironment = () => ({
  branch: 'feature/test',
  commit: 'abc123',
  isDirty: false
});

export const mockExecutionEnvironment = () => ({
  cwd: '/test/project',
  nodeVersion: '18.0.0',
  os: 'darwin'
});
```

## Ideal Prompt-Improvement-Prompt

### The Master Prompt for Prompt Improvement:
```markdown
---
title: Comprehensive Prompt Performance Analysis and Optimization
description: Analyzes prompt usage patterns, execution outcomes, and environmental factors to generate evidence-based improvement recommendations
---

**Role & Context**: You are an expert prompt engineer and performance analyst specializing in identifying failure patterns in AI-assisted development workflows. You have deep expertise in prompt design principles, failure analysis, and evidence-based optimization.

**Objective**: Analyze comprehensive usage data for AI prompts and generate specific, actionable improvements that address documented failure patterns. Your analysis must be grounded in actual usage evidence, not theoretical concerns.

**Input Data Available**:
```json
{
  "metadata": {
    "analysis_period": "{{input "timeframe" default="30d"}}",
    "total_prompts": "number",
    "total_executions": "number",
    "data_completeness": {
      "with_annotations": "percentage",
      "with_output_capture": "percentage",
      "with_environment_data": "percentage"
    }
  },
  "prompts": [
    {
      "name": "string",
      "path": "string", 
      "content": "full prompt text",
      "last_modified": "ISO timestamp",
      "usage_statistics": {
        "total_runs": "number",
        "annotated_runs": "number",
        "success_rate": "0.0-1.0",
        "avg_duration": "duration string",
        "last_used": "ISO timestamp"
      },
      "execution_outcomes": {
        "success": "count",
        "partial": "count", 
        "failure": "count"
      },
      "environment_correlations": {
        "failure_by_git_branch": "object",
        "failure_by_time_of_day": "object",
        "failure_by_working_directory": "object",
        "success_rate_by_duration": "object"
      },
      "captured_outputs": [
        {
          "execution_id": "string",
          "output_file_path": "string",
          "exit_code": "number",
          "duration": "string",
          "output_size_bytes": "number",
          "key_indicators": {
            "error_count": "number",
            "test_failures": "number", 
            "build_failures": "number",
            "completion_claimed": "boolean",
            "verification_attempted": "boolean"
          }
        }
      ],
      "user_annotations": [
        {
          "timestamp": "ISO timestamp",
          "status": "success|partial|failure",
          "structured_outcome": {
            "tasks_completed": "number",
            "tasks_total": "number", 
            "tests_run": "number",
            "tests_passed": "number",
            "tests_failed": "number",
            "verification_passed": "boolean",
            "execution_time": "duration"
          },
          "issues_identified": [
            {
              "category": "verification_gap|incomplete_task|ambiguous_instruction|missing_constraint",
              "severity": "low|medium|high|critical",
              "description": "specific issue description",
              "evidence": "quote from output or annotation"
            }
          ],
          "user_notes": "free-form user feedback",
          "auto_detected": "boolean"
        }
      ],
      "detected_patterns": [
        {
          "pattern_type": "verification_gap|incomplete_task|environment_specific|ambiguous_objective",
          "frequency": "number",
          "severity": "low|medium|high|critical", 
          "evidence_samples": ["array of specific evidence"],
          "correlation_strength": "0.0-1.0",
          "affected_executions": "number"
        }
      ]
    }
  ],
  "cross_prompt_patterns": [
    {
      "pattern": "pattern description",
      "affected_prompts": ["prompt names"],
      "total_occurrences": "number",
      "impact_assessment": "description"
    }
  ]
}
```

**Analysis Framework**:

1. **Evidence-Based Pattern Recognition**:
   - Identify patterns with frequency ≥3 occurrences across multiple executions
   - Correlate failure patterns with environmental factors (branch, time, directory)
   - Distinguish between user-reported issues and auto-detected patterns
   - Prioritize patterns by frequency × severity × correlation strength

2. **Root Cause Analysis**:
   - Map user annotations to specific prompt ambiguities or gaps
   - Identify disconnects between claimed completion and actual verification
   - Analyze output capture data for missed error signals
   - Correlate timing patterns with success rates

3. **Improvement Generation Criteria**:
   - Every recommendation must cite specific evidence (execution IDs, quotes, frequencies)
   - Address documented failure patterns, not theoretical improvements
   - Preserve prompt's core intent and workflow
   - Add verification steps where verification gaps are documented
   - Replace ambiguous terms with specific, measurable criteria

**Output Format**:
Generate a comprehensive analysis report with the following structure:

```markdown
# Prompt Performance Analysis Report
*Generated: {{current_timestamp}}*
*Analysis Period: {{timeframe}}*

## Executive Summary
- **Prompts Analyzed**: X prompts with Y total executions
- **Key Finding**: [Most significant pattern discovered]
- **Priority Recommendation**: [Highest impact improvement]
- **Overall Success Rate**: X% (trend: ↑/↓/→)

## High-Impact Improvements

### 1. [Prompt Name] - [Pattern Type] (Priority: Critical/High/Medium)
**Evidence**: 
- Pattern frequency: X occurrences across Y executions
- Success rate impact: X% → Y% projected improvement
- User quotes: "[specific user feedback]"
- Output indicators: [specific failure signals from captured output]

**Root Cause**: [Specific analysis of why this pattern occurs]

**Current Prompt Issues**:
```
[Quote problematic sections of current prompt]
```

**Improved Prompt**:
```
[Full rewritten prompt with specific improvements]
```

**Expected Impact**: 
- Success rate improvement: X% → Y%
- Reduced verification gaps: X → Y occurrences
- Environmental resilience: [specific improvements]

**Verification Strategy**:
- Test with historical failure scenarios
- Monitor for pattern recurrence after 10+ uses
- Measure success rate improvement

[Repeat for each significant improvement]

## Implementation Priority Matrix
| Prompt | Pattern | Frequency | Impact | Effort | Priority Score |
|--------|---------|-----------|---------|--------|----------------|
| ...    | ...     | ...       | ...     | ...    | ...            |

## Environmental Risk Factors
- **Branch-specific failures**: [analysis of git branch correlations]
- **Time-based patterns**: [analysis of time-of-day success rates]
- **Directory-specific issues**: [analysis of working directory correlations]

## Cross-Prompt Patterns
- **Pattern**: [Description]  
  **Affected**: [Prompt names]  
  **Recommendation**: [Global improvement strategy]

## Monitoring Recommendations
- Track success rates for improved prompts
- Monitor for new pattern emergence
- Focus annotation collection on [specific areas]
```

**Quality Standards**:
- **Specificity**: Every recommendation includes exact evidence and frequency data
- **Measurability**: Success criteria are quantifiable and verifiable  
- **Actionability**: Improvements can be implemented immediately
- **Traceability**: Each suggestion maps to documented failure patterns
- **Impact-Focused**: Prioritize changes with highest frequency × severity scores

**Constraints**:
- Only analyze prompts with ≥5 executions (statistical significance threshold)
- Only recommend changes for patterns with ≥3 documented occurrences
- Maintain original prompt intent and core workflow
- Preserve existing successful elements (don't change what works)
- Ensure backward compatibility with existing template variables

**Success Criteria**:
- Generated improvements address 80%+ of documented high-severity patterns
- Recommendations include specific implementation guidance
- Priority ranking enables focused improvement efforts
- Evidence citations allow verification of analysis accuracy
- Report format enables tracking improvement effectiveness over time

**Example Pattern Analysis**:
```
Pattern: "verification_gap"
Evidence: 12 annotations across 5 prompts mention "tests still failing after AI claimed success"
Root Cause: Prompts lack explicit verification requirements
Fix: Add "After implementation, run 'npm test' and verify output shows '0 failing' before proceeding"
Expected Impact: 85% reduction in verification-related partial failures
```

```
Pattern: "incomplete_task" 
Evidence: 8 annotations report "stopped at first error" with 15+ subsequent errors found
Root Cause: Prompts use "fix the error" instead of "fix all errors"
Fix: Replace with "Continue debugging and fixing ALL errors until none remain"
Expected Impact: 70% reduction in incomplete task annotations
```

This analysis framework ensures prompt improvements are evidence-based, measurable, and directly address documented real-world failure patterns rather than theoretical concerns.
```

### Data Requirements Analysis

#### ✅ **Perfect Alignment - Implementation Provides What Prompt Needs:**

1. **Usage Statistics**: Our implementation captures total runs, success rates, duration
2. **Execution Outcomes**: Success/partial/failure counts match exactly
3. **Environment Data**: Git branch, commit, working directory, timestamps
4. **Output Capture**: Full session outputs with error detection
5. **User Annotations**: Structured status, issues, evidence quotes
6. **Pattern Detection**: Frequency analysis, severity ranking, correlation
7. **Cross-Prompt Analysis**: Global patterns across multiple prompts

#### 🔧 **Enhanced Requirements - Prompt Needs More Than Originally Planned:**

1. **Key Indicators Extraction**: The prompt wants `key_indicators` from captured output:
   - `error_count`, `test_failures`, `build_failures`
   - `completion_claimed`, `verification_attempted`
   
   **Implementation Gap**: Our plan captures raw output but doesn't extract these structured indicators.

2. **Correlation Strength**: The prompt wants `correlation_strength` (0.0-1.0) for patterns
   
   **Implementation Gap**: Our PatternDetector needs statistical correlation calculation.

3. **Data Completeness Metrics**: The prompt wants to know what percentage of executions have annotations, output capture, etc.
   
   **Implementation Gap**: We need to calculate and report data completeness.

#### 📊 **Data We're Collecting That Prompt Doesn't Use:**

1. **Shell Type**: We capture shell info but prompt doesn't need it
2. **Node Version**: Captured but not used in analysis
3. **OS Type**: Available but not part of pattern analysis
4. **File Size**: Output file sizes captured but not analyzed

#### 🎯 **Overall Data Coverage**: 
The implementation plan provides **95%** of what the ideal prompt needs, with minor enhancements required for output analysis and correlation calculation.

## Recommended Implementation Adjustments

### 1. Add Output Analysis Service
**Goal**: Extract structured indicators from captured output for enhanced pattern detection

#### New Service: OutputAnalysisService
```typescript
// src/services/output-analysis-service.ts
export interface OutputIndicators {
  error_count: number;
  test_failures: number;
  build_failures: number;
  completion_claimed: boolean;
  verification_attempted: boolean;
}

export class OutputAnalysisService {
  analyzeOutput(outputContent: string): OutputIndicators {
    return {
      error_count: this.countErrors(outputContent),
      test_failures: this.countTestFailures(outputContent),
      build_failures: this.countBuildFailures(outputContent),
      completion_claimed: this.detectCompletionClaims(outputContent),
      verification_attempted: this.detectVerificationAttempts(outputContent)
    };
  }

  private countErrors(content: string): number {
    const errorPatterns = [
      /Error:/gi,
      /Exception:/gi,
      /Failed:/gi,
      /✗|❌|FAIL/gi
    ];
    return errorPatterns.reduce((count, pattern) => 
      count + (content.match(pattern) || []).length, 0
    );
  }

  private countTestFailures(content: string): number {
    const testFailPatterns = [
      /(\d+)\s+failing/gi,
      /FAIL.*test/gi,
      /✗.*test/gi,
      /Tests:\s+\d+\s+failed/gi
    ];
    // Extract numbers from patterns and sum them
    let total = 0;
    testFailPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const numbers = match.match(/\d+/);
          if (numbers) total += parseInt(numbers[0]);
        });
      }
    });
    return total;
  }

  private countBuildFailures(content: string): number {
    const buildFailPatterns = [
      /build.*failed/gi,
      /compilation.*error/gi,
      /tsc.*error/gi,
      /webpack.*failed/gi
    ];
    return buildFailPatterns.reduce((count, pattern) => 
      count + (content.match(pattern) || []).length, 0
    );
  }

  private detectCompletionClaims(content: string): boolean {
    const completionPatterns = [
      /implementation.*complete/gi,
      /task.*completed/gi,
      /finished.*successfully/gi,
      /done/gi,
      /✓.*complete/gi
    ];
    return completionPatterns.some(pattern => pattern.test(content));
  }

  private detectVerificationAttempts(content: string): boolean {
    const verificationPatterns = [
      /npm test/gi,
      /npm run test/gi,
      /running.*test/gi,
      /npm run build/gi,
      /npm run lint/gi,
      /verifying/gi
    ];
    return verificationPatterns.some(pattern => pattern.test(content));
  }
}
```

#### Integration with Enhanced History:
```typescript
// Update EnhancedHistoryEntry to include output indicators
export interface EnhancedHistoryEntry extends HistoryEntry {
  execution?: {
    // ... existing fields
    output_indicators?: OutputIndicators;
  };
}
```

### 2. Enhance Pattern Detection with Correlation Strength
**Goal**: Add statistical correlation calculation to pattern detection

#### Enhanced Pattern Interface:
```typescript
// src/services/pattern-detector.ts
export interface Pattern {
  type: 'verification_gap' | 'incomplete_task' | 'environment_specific' | 'ambiguous_objective';
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  affectedPrompts: string[];
  correlation_strength: number; // 0.0-1.0
  affected_executions: number;
}

export class EnhancedPatternDetector {
  detectPatterns(
    annotations: ParsedAnnotation[], 
    outputIndicators: OutputIndicators[]
  ): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Verification gap with correlation
    const verificationIssues = this.findVerificationGaps(annotations, outputIndicators);
    if (verificationIssues.length > 3) {
      patterns.push({
        type: 'verification_gap',
        frequency: verificationIssues.length,
        severity: this.calculateSeverity(verificationIssues.length, annotations.length),
        evidence: verificationIssues.map(a => a.notes.substring(0, 100)),
        affectedPrompts: [...new Set(verificationIssues.map(a => a.promptName))],
        correlation_strength: this.calculateCorrelation(verificationIssues, outputIndicators),
        affected_executions: verificationIssues.length
      });
    }
    
    return patterns;
  }

  private calculateCorrelation(
    issues: ParsedAnnotation[], 
    indicators: OutputIndicators[]
  ): number {
    // Calculate correlation between completion claims and actual failures
    const completionClaims = indicators.filter(i => i.completion_claimed).length;
    const actualFailures = issues.filter(i => i.status === 'partial' || i.status === 'failure').length;
    
    if (completionClaims === 0) return 0;
    
    // Correlation strength = proportion of completion claims that had issues
    return Math.min(actualFailures / completionClaims, 1.0);
  }

  private calculateSeverity(frequency: number, total: number): 'low' | 'medium' | 'high' | 'critical' {
    const percentage = frequency / total;
    if (percentage > 0.5) return 'critical';
    if (percentage > 0.3) return 'high';
    if (percentage > 0.1) return 'medium';
    return 'low';
  }
}
```

### 3. Add Data Completeness Reporting
**Goal**: Track and report what percentage of executions have complete data

#### Data Completeness Service:
```typescript
// src/services/data-completeness-service.ts
export interface DataCompleteness {
  with_annotations: number; // percentage 0-100
  with_output_capture: number;
  with_environment_data: number;
  total_executions: number;
}

export class DataCompletenessService {
  calculateCompleteness(historyEntries: EnhancedHistoryEntry[]): DataCompleteness {
    const total = historyEntries.length;
    
    if (total === 0) {
      return {
        with_annotations: 0,
        with_output_capture: 0,
        with_environment_data: 0,
        total_executions: 0
      };
    }

    const withAnnotations = historyEntries.filter(entry => 
      this.hasAnnotation(entry)
    ).length;

    const withOutputCapture = historyEntries.filter(entry => 
      entry.execution?.output_file
    ).length;

    const withEnvironmentData = historyEntries.filter(entry => 
      entry.environment?.git_commit && entry.environment?.working_directory
    ).length;

    return {
      with_annotations: Math.round((withAnnotations / total) * 100),
      with_output_capture: Math.round((withOutputCapture / total) * 100),
      with_environment_data: Math.round((withEnvironmentData / total) * 100),
      total_executions: total
    };
  }

  private hasAnnotation(entry: EnhancedHistoryEntry): boolean {
    // Check if corresponding annotation file exists
    // This would integrate with annotation discovery logic
    return false; // Placeholder
  }
}
```

### 4. Update Review Data Builder
**Goal**: Integrate new services into the review data structure

#### Enhanced ReviewDataBuilder:
```typescript
// src/services/review-data-builder.ts
export class EnhancedReviewDataBuilder extends ReviewDataBuilder {
  constructor(
    config: Config,
    private outputAnalysisService: OutputAnalysisService,
    private enhancedPatternDetector: EnhancedPatternDetector,
    private dataCompletenessService: DataCompletenessService
  ) {
    super(config);
  }

  async buildReviewData(options: ReviewOptions): Promise<ReviewData> {
    const historyEntries = await this.loadHistoryEntries(options);
    const annotations = await this.loadAnnotations(historyEntries);
    
    // Analyze output files and add indicators
    const enhancedEntries = await this.enhanceWithOutputAnalysis(historyEntries);
    
    // Calculate data completeness
    const dataCompleteness = this.dataCompletenessService.calculateCompleteness(enhancedEntries);
    
    // Extract output indicators for pattern detection
    const outputIndicators = enhancedEntries
      .map(entry => entry.execution?.output_indicators)
      .filter(Boolean) as OutputIndicators[];
    
    // Detect patterns with correlation
    const patterns = this.enhancedPatternDetector.detectPatterns(annotations, outputIndicators);
    
    return {
      metadata: {
        analysis_period: options.since || '30d',
        total_prompts: enhancedEntries.length,
        total_executions: enhancedEntries.length,
        data_completeness: dataCompleteness
      },
      prompts: enhancedEntries.map(entry => this.buildPromptData(entry, annotations, patterns)),
      cross_prompt_patterns: this.buildCrossPromptPatterns(patterns)
    };
  }

  private async enhanceWithOutputAnalysis(entries: EnhancedHistoryEntry[]): Promise<EnhancedHistoryEntry[]> {
    return Promise.all(entries.map(async entry => {
      if (entry.execution?.output_file) {
        try {
          const outputContent = await fs.readFile(entry.execution.output_file, 'utf-8');
          const indicators = this.outputAnalysisService.analyzeOutput(outputContent);
          
          return {
            ...entry,
            execution: {
              ...entry.execution,
              output_indicators: indicators
            }
          };
        } catch (error) {
          // File not found or unreadable, return original entry
          return entry;
        }
      }
      return entry;
    }));
  }
}
```

### 5. Phase Integration
**Goal**: Integrate these enhancements into existing implementation phases

#### Update Phase 5: Pattern Detection Engine
- Add correlation strength calculation
- Integrate output indicators analysis
- Enhanced severity calculation based on statistical significance

#### Update Phase 4: Review Command Core
- Add data completeness reporting
- Integrate output analysis service
- Enhanced review data structure

#### New Tests Required:
```typescript
// test/services/output-analysis.test.ts
describe('OutputAnalysisService', () => {
  it('should count errors accurately');
  it('should detect test failures with numbers');
  it('should identify completion claims');
  it('should detect verification attempts');
});

// test/services/data-completeness.test.ts
describe('DataCompletenessService', () => {
  it('should calculate annotation coverage percentage');
  it('should handle empty datasets');
  it('should track environment data completeness');
});

// test/services/enhanced-pattern-detector.test.ts
describe('EnhancedPatternDetector', () => {
  it('should calculate correlation strength');
  it('should rank patterns by statistical significance');
  it('should integrate output indicators in analysis');
});
```

These adjustments ensure the implementation provides exactly what the ideal prompt-improvement-prompt needs for comprehensive, evidence-based analysis.

## Code Examples

### Enhanced History Entry Type:
```typescript
// src/types/history.ts
export interface EnhancedHistoryEntry extends HistoryEntry {
  environment?: {
    working_directory: string;
    git_commit?: string;
    git_branch?: string;
    git_dirty?: boolean;
    node_version?: string;
    os: string;
    shell?: string;
  };
  execution?: {
    start_time: string;
    end_time: string;
    duration: string;
    exit_code: number | null;
    command: string;
    output_file?: string;
    output_size?: number;
  };
}
```

### Output Capture Service:
```typescript
// src/services/output-capture-service.ts
import * as pty from 'node-pty';
import stripAnsi from 'strip-ansi';
import fs from 'fs-extra';

export class OutputCaptureService {
  async captureCommand(
    command: string,
    args: string[],
    prompt: string,
    outputPath: string
  ): Promise<CaptureResult> {
    const writeStream = fs.createWriteStream(outputPath);
    const ptyProcess = pty.spawn(command, args, {
      name: 'xterm-256color',
      env: process.env,
    });

    ptyProcess.onData((data) => {
      // Pass through to terminal
      process.stdout.write(data);
      // Capture clean version
      writeStream.write(stripAnsi(data));
    });

    // Write prompt and handle process
    ptyProcess.write(prompt);
    
    return new Promise((resolve) => {
      ptyProcess.onExit(({ exitCode }) => {
        writeStream.end();
        resolve({
          exitCode,
          outputFile: outputPath,
          outputSize: writeStream.bytesWritten
        });
      });
    });
  }
}
```

### Pattern Detector:
```typescript
// src/services/pattern-detector.ts
export interface Pattern {
  type: 'verification_gap' | 'incomplete_task' | 'environment_specific';
  frequency: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  affectedPrompts: string[];
}

export class PatternDetector {
  detectPatterns(annotations: ParsedAnnotation[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Verification gap detection
    const verificationIssues = annotations.filter(a => 
      a.notes.match(/test.*fail|still failing|claim.*success/i) &&
      a.status === 'partial'
    );
    
    if (verificationIssues.length > 3) {
      patterns.push({
        type: 'verification_gap',
        frequency: verificationIssues.length,
        severity: 'high',
        evidence: verificationIssues.map(a => a.notes.substring(0, 100)),
        affectedPrompts: [...new Set(verificationIssues.map(a => a.promptName))]
      });
    }
    
    return patterns;
  }
}
```

### Review Command:
```typescript
// src/commands/review.ts
import { Command } from 'commander';
import { ReviewDataBuilder } from '../services/review-data-builder.js';
import { ConfigManager } from '../config/config-manager.js';
import chalk from 'chalk';

export interface ReviewOptions {
  format?: 'json' | 'markdown';
  since?: string;
}

export async function reviewCommand(
  promptName?: string,
  options: ReviewOptions = {}
): Promise<void> {
  const config = await ConfigManager.load();
  const builder = new ReviewDataBuilder(config);
  
  const reviewData = await builder.buildReviewData({
    promptName,
    since: options.since,
  });
  
  if (options.format === 'json') {
    console.log(JSON.stringify(reviewData, null, 2));
  } else {
    // Human-readable markdown output
    console.log(formatMarkdownReport(reviewData));
  }
}
```

### Auto-Annotation Integration:
```typescript
// src/services/auto-annotation-service.ts
export class AutoAnnotationService {
  async analyzeExecution(
    historyEntry: EnhancedHistoryEntry,
    outputFile: string
  ): Promise<void> {
    const { analysisPrompt, fallbackRules } = this.config.autoAnnotate;
    
    try {
      // Run AI analysis
      const result = await this.runAnalysisPrompt(
        analysisPrompt,
        outputFile
      );
      
      const annotation = JSON.parse(result);
      await this.saveAnnotation(historyEntry, annotation);
    } catch (error) {
      // Fallback to pattern rules
      const annotation = this.applyFallbackRules(
        outputFile,
        fallbackRules
      );
      await this.saveAnnotation(historyEntry, annotation);
    }
  }
}
```

## Verification Checklist

### Phase 1 Verification:
- [ ] History files contain environment metadata
- [ ] Git information is captured correctly
- [ ] Execution timing is recorded
- [ ] Backward compatibility maintained

### Phase 2 Verification:
- [ ] Interactive sessions work normally
- [ ] Output files are created
- [ ] ANSI codes are stripped
- [ ] Size limits are enforced

### Phase 3 Verification:
- [ ] Annotations support structured format
- [ ] Pattern extraction works
- [ ] Backward compatibility maintained

### Phase 4 Verification:
- [ ] `pt review` command works
- [ ] JSON export matches specification
- [ ] Time filtering works correctly
- [ ] Statistics are accurate

### Phase 5 Verification:
- [ ] Patterns are detected accurately
- [ ] Suggestions are specific and actionable
- [ ] Evidence is included
- [ ] Severity ranking makes sense

### Phase 6 Verification:
- [ ] Auto-annotation triggers correctly
- [ ] Analysis prompt runs successfully
- [ ] Fallback rules work
- [ ] Annotations are saved

### Phase 7 Verification:
- [ ] Configuration validates correctly
- [ ] Full workflow executes end-to-end
- [ ] All components integrate smoothly
- [ ] AI can use the review data effectively

## Success Metrics

1. **Test Coverage**: >90% coverage for new code
2. **Performance**: Review command completes in <2 seconds for 100 history entries
3. **Accuracy**: Pattern detection has >80% precision
4. **Usability**: AI can successfully analyze and improve prompts using review data
5. **Reliability**: No regression in existing functionality

## Risk Mitigation

1. **PTY Compatibility**: Test on multiple platforms (Linux, macOS, Windows)
2. **Large Output Files**: Implement streaming and size limits
3. **AI Analysis Failures**: Robust fallback to pattern matching
4. **Performance**: Implement caching for expensive operations
5. **Migration**: Careful versioning and backward compatibility

This implementation plan provides a clear, test-driven path to implementing the review command with sufficient detail for execution while remaining readable for human review.