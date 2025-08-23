# Prompts

This section describes all the prompts available in the PUPT project. Each prompt is designed for specific tasks in software development workflows.

## General Purpose Prompts

### Ad Hoc
**Purpose**: A versatile prompt for handling various technical and non-technical tasks. This is the most frequently used prompt for general requests.

**Inputs**:
- `prompt` (input): The specific task or question you want help with

**Usage**: Best for quick questions, simple tasks, or when you need a flexible assistant for various requests.

### Ad Hoc (Long)
**Purpose**: Handles complex, multi-part requests that require detailed analysis, planning, or implementation. Use this when your request is too comprehensive for the standard ad-hoc prompt.

**Inputs**:
- `prompt` (editor): A detailed, multi-part request or complex task description

**Usage**: Ideal for tasks that involve multiple steps, require extensive analysis, or need comprehensive solutions.

## Development Workflow Prompts

### New Project
**Purpose**: Creates a comprehensive design for a new software project, including scaffolding for building, linting, testing, and code coverage.

**Inputs**:
- `projectName` (input): Name of the new project
- `programmingLanguage` (input): Primary programming language for the project
- `projectPurpose` (input): Brief description of what the project does
- `requirements` (editor): Detailed requirements and specifications
- `preferredTools` (input): Your preferred development tools (e.g., "vite, vitest, eslint")
- `designFile` (input): Output file path for the design document

**Usage**: Use when starting a new project from scratch and need a complete architectural design.

### New Feature
**Purpose**: Designs new features that align with existing system architecture. Creates comprehensive design documents for feature additions.

**Inputs**:
- `requirements` (editor): Detailed requirements for the new feature

**Output**: A complete feature design document including user value, technical architecture, implementation approach, and acceptance criteria.

### Update Design
**Purpose**: Updates existing design documents with new requirements while maintaining system coherence and backward compatibility.

**Inputs**:
- `designFile` (file): Path to the existing design document to update
- `requirements` (editor): New requirements to integrate into the design

**Usage**: Use when requirements change or expand and you need to update your design documentation.

## Implementation Prompts

### Implementation Plan
**Purpose**: Creates detailed, phased implementation plans from design documents. Breaks work into logical phases with test-driven development approach.

**Inputs**:
- `designFile` (file): Path to the design document to create a plan from
- `planFile` (reviewFile): Output path for the implementation plan

**Output**: A comprehensive implementation plan with 3-7 phases, each including objectives, tests to write, implementation details, and verification steps.

### Implementation Phase
**Purpose**: Implements a specific phase from an implementation plan, following TDD practices and ensuring all tests pass.

**Inputs**:
- `phase` (input): Phase number to implement (e.g., "1", "2", etc.)
- `implementationFile` (file): Path to the implementation plan file

**Usage**: Use this prompt for each phase of your implementation plan to ensure systematic, tested development.

### One Shot Change
**Purpose**: Makes specific, focused changes to a project with minimal code modifications. Automatically runs tests, lint, and build after changes.

**Inputs**:
- `changes` (editor): Description of the specific changes to make

**Usage**: Best for small, well-defined changes that don't require extensive planning.

## Quality Assurance Prompts

### Code Review
**Purpose**: Performs comprehensive multi-pass code reviews, identifying security issues, code quality problems, and LLM-specific coding mistakes.

**Inputs**:
- `codeReviewConcerns` (editor): Specific areas of concern to focus on during the review

**Output**: A detailed code review report with issues categorized by priority (Critical, High, Medium, Low) and specific fixes for each issue.

### Fix Test Errors
**Purpose**: Systematically identifies and fixes all build, lint, and test errors in the codebase. Never skips tests or suppresses errors.

**Usage**: Run this when you have failing tests or build errors. It will run `npm run build`, `npm run lint`, and `npm test` in order and fix all issues.

### Debugging Error Message
**Purpose**: Diagnoses and fixes specific errors that occur under certain conditions. Uses systematic debugging process to find root causes.

**Inputs**:
- `errorCondition` (input): Description of when the error occurs (e.g., "running npm test")
- `errorText` (editor): The complete error message and stack trace

**Usage**: Use when you have a specific, reproducible error that needs investigation.

## CI/CD Prompts

### Fix GitHub Actions
**Purpose**: Analyzes and fixes failing GitHub Actions workflow jobs, ensuring reliable CI/CD pipeline operation.

**Usage**: Automatically uses GitHub CLI to find and fix the latest workflow run failures. Considers cross-platform compatibility.

## Documentation Prompts

### Update Documentation
**Purpose**: Comprehensively updates project documentation by reviewing all files and ensuring README.md is complete and accurate.

**Usage**: Run periodically to keep documentation in sync with code changes.

## Prompt Management

### PUPT Prompt Improvement
**Purpose**: Analyzes prompt usage data using `pt review` to identify failure patterns and generate evidence-based improvements.

**Inputs**:
- `reviewDataFile` (input): Output file for review data (default: "review.json")
- `timeframe` (input): Analysis period (default: "30d")
- `promptReviewFile` (input): Output file for analysis report (default: "design/prompt-review-{date}.md")

**Usage**: Run periodically to improve prompt effectiveness based on actual usage patterns and user feedback.

### Add Summary
**Purpose**: Adds or updates the summary field in prompt files for better display in `pt history`.

**Inputs**:
- `prompt` (file): The prompt file to update (filtered to *.md files)

**Usage**: Use to improve how prompts appear in history by adding concise, variable-aware summaries.

## Input Types

The prompts use various input types:

- **input**: Single-line text input
- **editor**: Multi-line text input (opens an editor)
- **file**: File selection from the project
- **reviewFile**: File path for creating review/output files
- **select**: Selection from predefined options

## Best Practices

1. **Choose the right prompt**: Use specialized prompts (like `fix-test-errors`) instead of general ones when possible
2. **Provide complete information**: Fill in all requested inputs thoroughly
3. **Use `ad-hoc` for simple tasks**: Don't overcomplicate simple requests
4. **Follow the workflow**: Design → Implementation Plan → Implementation Phases for new features
5. **Review and iterate**: Use `code-review` after significant changes and `pupt-prompt-improvement` to enhance prompts