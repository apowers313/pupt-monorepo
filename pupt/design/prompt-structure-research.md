# Prompt Structure Research: A Comprehensive Analysis

> **Purpose**: This document consolidates academic research and practitioner insights on prompt structure, effectiveness factors, anti-patterns, and software development use cases. The goal is to establish a solid foundation for building a programmatic prompt definition system for pupt.
>
> **Date**: December 2025
>
> **Status**: Research

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [What Makes Prompts Successful](#what-makes-prompts-successful)
   - [Key Success Factors](#key-success-factors)
   - [Mechanisms Explaining Effectiveness](#mechanisms-explaining-effectiveness)
3. [What Causes Prompts to Fail](#what-causes-prompts-to-fail)
   - [Prompt Defects Taxonomy](#prompt-defects-taxonomy)
   - [Common Anti-Patterns](#common-anti-patterns)
   - [Security Vulnerabilities](#security-vulnerabilities)
4. [Prompting Techniques Taxonomy](#prompting-techniques-taxonomy)
   - [Zero-Shot Techniques](#zero-shot-techniques)
   - [Few-Shot Techniques](#few-shot-techniques)
   - [Reasoning Techniques](#reasoning-techniques)
   - [Advanced Techniques](#advanced-techniques)
5. [Software Development Prompt Types](#software-development-prompt-types)
   - [Code Generation](#code-generation)
   - [Code Review](#code-review)
   - [Debugging](#debugging)
   - [Testing](#testing)
   - [Documentation](#documentation)
   - [Refactoring](#refactoring)
6. [Prompt Structure: Sections and Components](#prompt-structure-sections-and-components)
   - [Core Components](#core-components)
   - [Section Types](#section-types)
   - [Section Relationships](#section-relationships)
   - [Section Attributes](#section-attributes)
7. [Formatting and Syntax](#formatting-and-syntax)
   - [XML vs Markdown vs Plain Text](#xml-vs-markdown-vs-plain-text)
   - [Delimiters and Structure](#delimiters-and-structure)
8. [Framework and Mental Model](#framework-and-mental-model)
   - [The Prompt Canvas](#the-prompt-canvas)
   - [CO-STAR Framework](#co-star-framework)
   - [Proposed Pupt Framework](#proposed-pupt-framework)
9. [Recommendations for Pupt](#recommendations-for-pupt)
10. [Advanced Prompting Concepts](#advanced-prompting-concepts)
    - [Meta-Prompting](#meta-prompting)
    - [Reflection and Reflexion](#reflection-and-reflexion)
    - [Prompt Chaining and Decomposition](#prompt-chaining-and-decomposition)
    - [Prompt Compression](#prompt-compression)
    - [Knowledge Injection Techniques](#knowledge-injection-techniques)
    - [Additional Reasoning Techniques](#additional-reasoning-techniques)
    - [Enhancement Techniques](#enhancement-techniques)
11. [Detailed Section Specifications](#detailed-section-specifications)
    - [Role/Persona Section: Detailed Specification](#rolepersona-section-detailed-specification)
    - [Examples Section: Detailed Specification](#examples-section-detailed-specification)
    - [Output Format Section: Detailed Specification](#output-format-section-detailed-specification)
    - [Context Section: Detailed Specification](#context-section-detailed-specification)
    - [Task/Instruction Section: Detailed Specification](#taskinstruction-section-detailed-specification)
    - [Constraints Section: Detailed Specification](#constraints-section-detailed-specification)
    - [Modular and Reusable Prompt Composition](#modular-and-reusable-prompt-composition)
12. [LLM-Specific Configuration](#llm-specific-configuration)
    - [Model-Specific Format Preferences](#model-specific-format-preferences)
    - [Why Model-Specific Configuration Matters](#why-model-specific-configuration-matters)
    - [Complete ModelConfig Interface](#complete-modelconfig-interface)
    - [Pre-defined Model Configurations](#pre-defined-model-configurations)
    - [Model-Aware Rendering](#model-aware-rendering)
13. [Environment and Platform Context](#environment-and-platform-context)
    - [Why Environment Context Matters](#why-environment-context-matters)
    - [Complete EnvironmentContext Interface](#complete-environmentcontext-interface)
    - [Pre-defined Environment Presets](#pre-defined-environment-presets)
    - [Environment-Aware Code Generation](#environment-aware-code-generation)
    - [Injecting Environment Context into Prompts](#injecting-environment-context-into-prompts)
14. [Abstraction Hierarchy and Composition Patterns](#abstraction-hierarchy-and-composition-patterns)
    - [The Abstraction Hierarchy](#the-abstraction-hierarchy)
    - [Level 1: Section Fragments](#level-1-section-fragments-atomic-components)
    - [Level 2: Section Presets](#level-2-section-presets-composed-sections)
    - [Level 3: Prompt Templates](#level-3-prompt-templates-full-prompts)
    - [Level 4: Prompt Groups and Pipelines](#level-4-prompt-groups-and-pipelines)
    - [Level 5: Signatures (DSPy-style)](#level-5-signatures-dspy-style)
    - [Using the Abstraction Hierarchy](#using-the-abstraction-hierarchy)
15. [References](#references)

---

## Executive Summary

This research synthesizes findings from academic papers (2023-2025), official documentation from OpenAI and Anthropic, and practitioner insights from GitHub, Medium, and development communities.

### Key Findings

1. **Prompt structure matters more than clever wording**: Research in 2025 consistently shows that clarity, context, and specificity are the most predictive factors for high-quality results.

2. **Six core components exist in effective prompts**: Role/Persona, Task/Instruction, Context, Examples, Constraints, and Output Format.

3. **Not all sections are needed for all prompts**: The required sections depend on task complexity, desired output format, and the specific use case.

4. **Position effects are real**: LLMs exhibit primacy and recency biases—important information should be placed at the beginning or end, not in the middle ("lost in the middle" effect).

5. **Negative instructions are problematic**: "Don't do X" is less effective than "Do Y instead"—positive framing works better.

6. **Software development prompts follow patterns**: Code review, generation, debugging, testing, and documentation each have distinct structural requirements.

---

## What Makes Prompts Successful

### Key Success Factors

Based on research from "The Prompt Report" (arXiv:2406.06608), practitioner guides, and official documentation:

#### 1. Clarity and Specificity

> "The quality of the AI's output depends largely on the quality of the prompt you provide. A poorly phrased request can yield irrelevant or generic answers, while a well-crafted prompt can produce thoughtful, accurate, and even creative solutions."
> — [GitHub Blog: A developer's guide to prompt engineering](https://github.blog/ai-and-ml/generative-ai/prompt-engineering-guide-generative-ai-llms/)

**What works:**
- Explicit task definitions with clear boundaries
- Specific numeric constraints ("3 bullets," "under 50 words")
- Concrete formatting requirements

**Example:**
```
BAD:  "Write a Python function"
GOOD: "Write a Python function that takes a list of numbers and returns
       a sorted list using the quicksort algorithm. Include type hints
       and a docstring."
```

#### 2. Structured Context

> "Using delimiters and breaking up your prompt to be more structured is not only a great way to get better outputs but also makes it easier for your team to understand what the prompt is doing."
> — [PromptHub: Prompt Engineering Principles](https://www.prompthub.us/blog/prompt-engineering-principles-for-2024)

**Research finding:** A well-structured prompt reduces noise and boosts reproducibility by up to 40%, according to JetBrains' 2025 AI Tooling Survey.

#### 3. Appropriate Examples (Few-Shot)

> "The use of Few-shot can increase the accuracy of the output compared to Zero-shot."
> — [The Prompt Canvas (arXiv:2412.05127)](https://arxiv.org/abs/2412.05127)

**However, examples aren't always necessary:**
- Statistical analysis reveals fewer than 20% of real-world LLM applications incorporate few-shot examples
- Well-defined prompt templates often work without examples
- For modern strong LLMs, zero-shot CoT is often sufficient for reasoning tasks

#### 4. Role/Persona Alignment

> "If the model's role is thematically aligned with the task, its performance can increase."
> — [Zheng et al., 2023](https://arxiv.org/html/2311.10054v3)

**Best practices for personas:**
- Be specific and detailed, not generic ("expert TypeScript developer with 10 years in security" vs. "developer")
- Align persona with the task domain
- LLM-generated personas often outperform human-written ones
- Gender-neutral terms generally lead to better performance

#### 5. Explicit Output Format

> "GPT performs well with crisp numeric constraints and formatting hints."
> — [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)

**Techniques:**
- Specify output format explicitly (JSON, Markdown, bullet points)
- Use JSON Schema or Pydantic models for structured output
- Include output examples when format is complex

### Mechanisms Explaining Effectiveness

#### Why Structure Works: Attention Focusing

> "Chain-of-Thought prompting is effective because it helps focus the attention mechanism of the LLM. The decomposition of the reasoning process makes the model focus its attention on one part of the problem at a time."
> — [DataCamp: Chain-of-Thought Prompting](https://www.datacamp.com/tutorial/chain-of-thought-prompting)

#### Why Examples Work: Pattern Recognition

LLMs are trained on vast amounts of text and excel at pattern recognition. Examples provide:
- Implicit formatting templates
- Demonstration of expected reasoning
- Output alignment cues (recent research suggests examples primarily enforce format rather than increase reasoning ability)

#### Why Roles Work: Contextual Priming

Personas activate relevant knowledge clusters in the model's parameters, biasing token generation toward domain-appropriate vocabulary and reasoning patterns.

#### Why XML Tags Work: Clear Boundaries

> "Tokenization causes all sorts of problems when you rely on whitespace or indentation. XML tags provide multi-line certainty with delimiters that mark where items begin and end."
> — [Steve Campbell: Better LLM Prompts Using XML](https://www.aecyberpro.com/blog/general/2024-10-20-Better-LLM-Prompts-Using-XML/)

Claude was specifically trained with XML tags in training data, making them particularly effective for Anthropic models.

---

## What Causes Prompts to Fail

### Prompt Defects Taxonomy

According to "A Taxonomy of Prompt Defects in LLM Systems" (arXiv:2509.14404), prompt defects are organized along six dimensions:

| Dimension | Description | Examples |
|-----------|-------------|----------|
| **Specification and Intent** | Mismatch between user intent and prompt expression | Ambiguous instructions, unclear goals |
| **Input and Content** | Issues with the data provided to the prompt | Missing context, incorrect formatting |
| **Structure and Formatting** | Problems with prompt organization | Poor delimiter usage, inconsistent structure |
| **Context and Memory** | Context window and history issues | Lost in the middle, context overflow |
| **Performance and Efficiency** | Cost and latency problems | Overly verbose prompts, redundant tokens |
| **Maintainability and Engineering** | Long-term prompt management issues | Hard-coded values, lack of modularity |

### Common Anti-Patterns

#### 1. Vague or Subjective Language

> "Using subjective or imprecise language like 'make it more professional' leads to non-deterministic, inconsistent outputs."
> — [GoInsight: 10 Common LLM Prompt Mistakes](https://www.goinsight.ai/blog/llm-prompt-mistake/)

**Anti-pattern:**
```
Improve this code.
```

**Better:**
```
Refactor this code to:
1. Extract the validation logic into a separate function
2. Add error handling for null inputs
3. Use early returns instead of nested if statements
```

#### 2. Overloaded Prompts

> "Trying to make one prompt perform multiple distinct tasks leads to degraded performance on all tasks."
> — [GoInsight](https://www.goinsight.ai/blog/llm-prompt-mistake/)

**Anti-pattern:** Combining code review, documentation, and refactoring in a single prompt.

**Better:** Use separate, focused prompts for each task.

#### 3. Negative Instructions (The Pink Elephant Problem)

> "Telling a model what NOT to do can paradoxically draw its attention to the very thing you want to avoid."
> — [16x.engineer: The Pink Elephant Problem](https://eval.16x.engineer/blog/the-pink-elephant-negative-instructions-llms-effectiveness-analysis)

**Anti-pattern:**
```
Do not use deprecated APIs.
Do not add console.log statements.
Do not include comments.
```

**Better:**
```
Use only current, non-deprecated APIs from the latest documentation.
Remove all debugging statements before submitting.
Write self-documenting code without inline comments.
```

**When negative instructions work:** Use them for hard boundaries ("NEVER expose API keys"), not preferences.

#### 4. Underspecification

> "LLM+Prompts are less likely to implement a requirement when unspecified (-22.6% on average, up to -93.1%)."
> — [What Prompts Don't Say (arXiv:2505.13360)](https://arxiv.org/abs/2505.13360)

However, adding too many requirements is also an anti-pattern:
> "Adding as many requirements as possible leads to over-complicated prompts and does not scale due to LLMs' limited instruction-following capabilities."

**Balance:** Include essential requirements explicitly; trust the model for obvious/standard behaviors.

#### 5. Middle-Position Important Information

> "LLMs tend to weigh the beginning and end of the prompt more heavily: this is known as primacy and recency bias."
> — [Agenta: Top Techniques to Manage Context Length](https://agenta.ai/blog/top-6-techniques-to-manage-context-length-in-llms)

**The "Lost in the Middle" effect:** Important information placed in the middle of long prompts is often ignored.

**Solution:** Place critical instructions at the beginning or end of prompts.

#### 6. Inconsistent Few-Shot Examples

> "Simply changing the ordering of examples in few-shot prompting can lead to almost random accuracy on sentiment analysis tasks."
> — [What Did I Do Wrong? (arXiv:2406.12334)](https://arxiv.org/abs/2406.12334)

**Best practices:**
- Use diverse, representative examples
- Maintain consistent formatting across examples
- Consider example order effects

### Security Vulnerabilities

#### Prompt Injection

> "A Prompt Injection Vulnerability occurs when user prompts alter the LLM's behavior or output in unintended ways."
> — [OWASP: LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)

**Vulnerable pattern:**
```javascript
// DANGEROUS: Direct concatenation
const prompt = systemPrompt + "\n\nUser: " + userInput;
```

**Types of attacks:**
- **Direct injection:** "Ignore previous instructions..."
- **RAG poisoning:** Malicious content in vector databases
- **Jailbreaking:** Role-playing and hypothetical scenarios (DAN prompts)
- **Encoding attacks:** Base64 or emoji-encoded malicious instructions

**Mitigation:** Use structured prompt templates, validate inputs, implement output filtering.

---

## Prompting Techniques Taxonomy

Based on "The Prompt Report" (arXiv:2406.06608), which documents 58 LLM prompting techniques:

### Zero-Shot Techniques

| Technique | Description | Best For |
|-----------|-------------|----------|
| **Direct Prompting** | Simple instruction without examples | Simple, unambiguous tasks |
| **Role Prompting** | Assign persona ("Act as...") | Domain-specific tasks, style control |
| **Style Prompting** | Specify output style/tone | Writing, documentation |
| **Zero-Shot CoT** | "Let's think step by step" | Reasoning, math, logic |
| **Plan-and-Solve** | "Let's first understand the problem..." | Complex multi-step problems |

### Few-Shot Techniques

| Technique | Description | Best For |
|-----------|-------------|----------|
| **One-Shot** | Single example | Format demonstration |
| **Few-Shot** | 2-5 examples | Classification, formatting |
| **Many-Shot** | Dozens to hundreds of examples | Complex patterns, overcoming biases |
| **Few-Shot CoT** | Examples with reasoning chains | Math, logic puzzles |
| **Self-Ask** | Break questions into sub-questions | Multi-hop reasoning |

### Reasoning Techniques

| Technique | Description | Best For |
|-----------|-------------|----------|
| **Chain-of-Thought (CoT)** | Step-by-step reasoning | Math, logic, analysis |
| **Tree of Thoughts (ToT)** | Explore multiple reasoning paths | Complex problem-solving |
| **Graph of Thoughts (GoT)** | Interconnected thought nodes | Non-linear reasoning |
| **Self-Consistency** | Multiple solutions, majority vote | Reducing errors |
| **Least-to-Most** | Decompose and solve incrementally | Complex multi-step |

### Advanced Techniques

| Technique | Description | Best For |
|-----------|-------------|----------|
| **RAG (Retrieval-Augmented)** | Retrieve context before generating | Factual accuracy |
| **ReAct** | Reasoning + Acting (tool use) | Agentic workflows |
| **Reflexion** | Self-reflection and correction | Iterative improvement |
| **Contrastive CoT** | Compare correct vs. noisy rationales | Reducing errors |

### Technique Selection Guide

```
Task Type                           Recommended Technique
─────────────────────────────────────────────────────────
Simple classification           →   Zero-shot or few-shot
Format-specific output          →   Few-shot with examples
Complex reasoning/math          →   Zero-shot CoT or Plan-and-Solve
Code generation                 →   Role + few-shot + constraints
Code review                     →   Role + context + checklist
Multi-step problems             →   ToT or Self-Ask
Fact-dependent tasks            →   RAG
Agentic/tool-using tasks        →   ReAct
```

---

## Software Development Prompt Types

### Code Generation

**Purpose:** Generate new code from natural language descriptions.

**Key sections:**
- **Role:** "Senior [language] developer"
- **Context:** Existing codebase patterns, dependencies, constraints
- **Task:** Specific functionality to implement
- **Constraints:** Style guide, performance requirements, no-use list
- **Output format:** Complete function/module with tests

**Example structure:**
```markdown
<role>
You are a senior TypeScript developer specializing in React applications.
</role>

<context>
The codebase uses:
- React 18 with hooks
- TypeScript strict mode
- Tailwind CSS for styling
- React Query for data fetching

Existing pattern for components:
[example component code]
</context>

<task>
Create a UserProfile component that displays user information
and allows editing the bio field.
</task>

<constraints>
- Follow existing naming conventions
- Use functional components with hooks
- Include proper TypeScript types
- Handle loading and error states
</constraints>

<output_format>
Provide the complete component file with:
1. Type definitions
2. Component implementation
3. Export statement
</output_format>
```

**Research insight:**
> "Providing clear instructions and specifying the expected output format helps AI models generate more accurate results."
> — [Keploy: Prompt Engineering for Python Code Generation](https://medium.com/@keployio/prompt-engineering-for-python-code-generation-techniques-and-best-practices-c41d2b8d31f9)

---

### Code Review

**Purpose:** Analyze code for bugs, security issues, and improvements.

**Key sections:**
- **Role:** "Senior code reviewer" / "Security expert"
- **Context:** Code to review, project standards
- **Focus areas:** Specific concerns (security, performance, style)
- **Output format:** Structured feedback with line references

**Example structure (from GitHub's awesome-copilot):**
```markdown
<role>
You are a senior software engineer conducting a thorough code review.
You should provide constructive, actionable feedback.
</role>

<focus_areas>
- Security vulnerabilities
- Performance issues
- Code style and readability
- Error handling
- Test coverage gaps
</focus_areas>

<code>
[code to review]
</code>

<output_format>
For each issue found:
- Location: file:line
- Severity: Critical | High | Medium | Low
- Issue: Description
- Suggestion: How to fix
</output_format>
```

**Research insight:**
> "LLMs for code review automation should be fine-tuned to achieve the highest performance; when data is not sufficient, few-shot learning without a persona should be used."
> — [Fine-tuning and Prompt Engineering for Code Review (arXiv:2402.00905)](https://arxiv.org/pdf/2402.00905)

---

### Debugging

**Purpose:** Identify and fix bugs in existing code.

**Key sections:**
- **Role:** "Debugging expert"
- **Context:** Buggy code, error messages, expected behavior
- **Task:** Diagnose and fix the issue
- **Constraints:** Minimal changes, maintain existing behavior

**Example structure:**
```markdown
<role>
You are an expert debugger helping diagnose and fix code issues.
</role>

<context>
## Error Message
[error output]

## Expected Behavior
[what should happen]

## Actual Behavior
[what is happening]

## Code
[relevant code]
</context>

<task>
1. Identify the root cause of the bug
2. Explain why it occurs
3. Provide a minimal fix
4. Suggest how to prevent similar issues
</task>
```

**Research insight:**
> "For error debugging, simulating human behaviors to learn from test failures is effective. Adding the failed code and error log to the prompt helps the LLM generate correct code by learning from its own mistakes."
> — [Tests as Prompt (arXiv:2505.09027)](https://arxiv.org/abs/2505.09027)

---

### Testing

**Purpose:** Generate test cases for existing code.

**Key sections:**
- **Role:** "QA engineer" / "Testing specialist"
- **Context:** Code under test, testing framework, existing patterns
- **Task:** Generate comprehensive test cases
- **Constraints:** Framework requirements, coverage goals

**Example structure:**
```markdown
<role>
You are a QA engineer specializing in unit testing with extensive
experience in test-driven development.
</role>

<context>
Testing framework: Vitest
Existing test pattern:
[example test]

Code to test:
[function/module]
</context>

<task>
Generate comprehensive unit tests covering:
1. Happy path scenarios
2. Edge cases (empty input, null, boundaries)
3. Error conditions
4. Type edge cases for TypeScript
</task>

<output_format>
Provide tests in a single test file following the existing pattern.
Include descriptive test names using "should..." format.
</output_format>
```

**Research insight:**
> "Unit test generation is one of the most widely studied LLM applications, where models are prompted with source code or method descriptions and return compilable test cases."
> — [A Survey on Code Generation with LLM-based Agents (arXiv:2508.00083)](https://arxiv.org/abs/2508.00083)

---

### Documentation

**Purpose:** Generate or improve code documentation.

**Key sections:**
- **Role:** "Technical writer"
- **Context:** Code to document, audience, existing style
- **Task:** Specific documentation type (README, API docs, comments)
- **Constraints:** Format requirements, length limits

**Example structure:**
```markdown
<role>
You are a technical writer creating clear, concise documentation
for a developer audience.
</role>

<context>
Code:
[code to document]

Documentation style: JSDoc format
Audience: Intermediate developers
</context>

<task>
Write documentation including:
1. Brief description of purpose
2. Parameter descriptions with types
3. Return value description
4. Usage example
5. Any important notes or caveats
</task>
```

---

### Refactoring

**Purpose:** Improve existing code without changing behavior.

**Key sections:**
- **Role:** "Senior architect" / "Refactoring specialist"
- **Context:** Current code, pain points, target patterns
- **Task:** Specific refactoring goals
- **Constraints:** Preserve behavior, maintain tests, phased approach

**Example structure:**
```markdown
<role>
You are a senior architect specializing in code quality and
refactoring legacy systems.
</role>

<context>
Current code:
[code to refactor]

Pain points:
- Function is too long (150 lines)
- Mixed concerns (validation + business logic + persistence)
- Difficult to test
</context>

<task>
Refactor following these principles:
1. Extract validation into separate pure function
2. Separate business logic from side effects
3. Use early returns instead of nested conditionals
4. Make functions testable in isolation
</task>

<constraints>
- Preserve all existing behavior
- Maintain backward compatibility
- Keep changes minimal and focused
- Do not add new dependencies
</constraints>

<output_format>
Provide refactored code with:
1. Brief explanation of changes
2. Before/after comparison for key sections
</output_format>
```

**Research insight - Phased approach:**
> "Phase 1 (Safe/Mechanical): auto-fixable lint, dead code removal, naming, small function extraction. Phase 2 (Moderate): module splits, boundary enforcement. Phase 3 (Higher risk): directory re-org, public API adjustments."
> — [LLM Prompt for Refactoring](https://imrecsige.dev/snippets/llm-prompt-for-refactoring-your-codebase-using-best-practices/)

---

## Prompt Structure: Sections and Components

### Core Components

Based on research from multiple sources including "The Prompt Report," OpenAI's guide, and Anthropic's documentation, effective prompts contain these core components:

```
┌─────────────────────────────────────────────────────────────┐
│                      PROMPT STRUCTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐                                        │
│  │  SYSTEM PROMPT  │  (Optional, model-dependent)           │
│  └────────┬────────┘                                        │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │      ROLE       │  Who the LLM should be                 │
│  └────────┬────────┘                                        │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │    CONTEXT      │  Background information                │
│  └────────┬────────┘                                        │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │     TASK        │  What to do (instruction)              │
│  └────────┬────────┘                                        │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │   CONSTRAINTS   │  Rules and limitations                 │
│  └────────┬────────┘                                        │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │    EXAMPLES     │  Few-shot demonstrations               │
│  └────────┬────────┘                                        │
│           │                                                  │
│  ┌────────▼────────┐                                        │
│  │  OUTPUT FORMAT  │  Expected response structure           │
│  └─────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Section Types

#### 1. Role/Persona Section

**Purpose:** Define who the LLM should be, activating relevant knowledge and behavioral patterns.

**Attributes:**
| Attribute | Description | Example |
|-----------|-------------|---------|
| `expertise` | Domain specialization | "TypeScript security expert" |
| `experience` | Level of seniority | "10 years of experience" |
| `perspective` | Viewpoint to adopt | "as a code reviewer" |
| `style` | Communication approach | "mentor teaching a junior developer" |

**When required:**
- Complex domain-specific tasks
- When specific expertise affects output quality
- When tone/style matters

**When optional:**
- Simple factual queries
- Format conversions
- Straightforward transformations

#### 2. Context Section

**Purpose:** Provide background information the LLM needs to understand the task.

**Sub-types:**
| Sub-type | Description | Example |
|----------|-------------|---------|
| `project_context` | Project-level information | Tech stack, conventions |
| `code_context` | Relevant code | Files, functions, types |
| `domain_context` | Domain knowledge | Business rules, terminology |
| `history_context` | Previous interactions | Conversation history |
| `environment_context` | Runtime environment | OS, versions, config |

**Attributes:**
| Attribute | Description |
|-----------|-------------|
| `source` | Where context comes from (file, URL, inline) |
| `relevance` | Why this context matters |
| `priority` | Importance for the task (high/medium/low) |

#### 3. Task/Instruction Section

**Purpose:** Define the specific action the LLM should take.

**Attributes:**
| Attribute | Description | Example |
|-----------|-------------|---------|
| `action` | Primary verb | "Review," "Generate," "Fix" |
| `target` | What to act on | "the authentication module" |
| `scope` | Boundaries of the task | "only the login function" |
| `success_criteria` | How to know when done | "all tests pass" |

**Best practices:**
- Start with action verbs
- Be specific about scope
- Define done criteria
- Break complex tasks into steps

#### 4. Constraints Section

**Purpose:** Define rules, limitations, and requirements.

**Sub-types:**
| Sub-type | Description | Example |
|----------|-------------|---------|
| `must` | Required behaviors | "Must use TypeScript strict mode" |
| `must_not` | Prohibited behaviors | "Must not use deprecated APIs" |
| `should` | Preferences | "Should prefer composition over inheritance" |
| `format` | Output format rules | "Return valid JSON" |

**Attributes:**
| Attribute | Description |
|-----------|-------------|
| `priority` | How strictly to enforce |
| `rationale` | Why this constraint exists |

#### 5. Examples Section

**Purpose:** Demonstrate expected input-output patterns.

**Attributes:**
| Attribute | Description |
|-----------|-------------|
| `input` | Example input |
| `output` | Expected output |
| `reasoning` | (Optional) Why this output (for CoT) |
| `label` | (Optional) Category for the example |

**Best practices:**
- Use diverse examples covering different cases
- Match example complexity to task complexity
- Include edge cases when relevant
- Keep examples consistent in format

#### 6. Output Format Section

**Purpose:** Specify the structure and format of the expected response.

**Attributes:**
| Attribute | Description | Example |
|-----------|-------------|---------|
| `format` | Output type | "JSON", "Markdown", "code" |
| `schema` | Structure definition | JSON Schema, TypeScript type |
| `length` | Size constraints | "under 200 words", "3 bullet points" |
| `sections` | Expected sections | ["summary", "details", "recommendations"] |
| `language` | Programming/natural language | "TypeScript", "English" |

### Section Relationships

#### Required vs. Optional by Task Type

| Task Type | Role | Context | Task | Constraints | Examples | Output |
|-----------|------|---------|------|-------------|----------|--------|
| Code Generation | ✓ | ✓ | ✓ | ✓ | ○ | ✓ |
| Code Review | ✓ | ✓ | ○ | ○ | ○ | ✓ |
| Debugging | ○ | ✓ | ✓ | ○ | ○ | ○ |
| Testing | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Documentation | ○ | ✓ | ✓ | ○ | ○ | ✓ |
| Refactoring | ✓ | ✓ | ✓ | ✓ | ○ | ○ |
| Q&A / Explanation | ○ | ○ | ✓ | ○ | ○ | ○ |

✓ = Recommended, ○ = Optional

#### Section Dependencies

```
Role ──────────────► affects interpretation of Task
   │
   └──────────────► affects style of Output

Context ───────────► required for Task understanding
   │
   └──────────────► Examples should match Context style

Constraints ───────► filter possible Outputs
   │
   └──────────────► may conflict with Examples (validate!)

Examples ─────────► demonstrate expected Output format
   │
   └──────────────► should align with Task scope
```

#### Position Guidelines

Based on research on primacy/recency effects:

```
BEGINNING (High attention)
├── Role/Persona
├── Critical constraints
├── Output format requirements
│
MIDDLE (Lower attention - "lost in the middle")
├── Context (can be extensive)
├── Examples
├── Supplementary information
│
END (High attention)
├── Main task/instruction
├── Final reminders
└── Call to action
```

### Section Attributes

#### Common Attributes Across All Sections

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique identifier for the section |
| `type` | enum | Section type (role, context, task, etc.) |
| `priority` | enum | high \| medium \| low |
| `conditional` | boolean | Whether section is conditionally included |
| `condition` | expression | When to include (if conditional) |

#### Variable/Placeholder Support

| Syntax | Description | Example |
|--------|-------------|---------|
| `{variable}` | Simple substitution | `{language}`, `{file_path}` |
| `{variable\|default}` | With default value | `{style\|professional}` |
| `{variable:type}` | Typed variable | `{count:number}` |
| `{{expression}}` | Computed value | `{{files.length}}` |

---

## Formatting and Syntax

### XML vs Markdown vs Plain Text

Based on convergent guidance from OpenAI, Anthropic, and research:

#### Recommendation: XML Tags for Structure

> "XML tags are the best way to structure prompts and separate sections for an LLM. It is the only format that all models from Anthropic, Google and OpenAI encourage."
> — [SSW Rules: AI Prompt XML](https://www.ssw.com.au/rules/ai-prompt-xml)

**Why XML works:**
1. Clear, unambiguous boundaries
2. Hierarchical nesting support
3. Self-documenting structure
4. Consistent tokenization across models

#### Comparison

| Format | Pros | Cons | Best For |
|--------|------|------|----------|
| **XML** | Clear boundaries, nesting, model-trained | More tokens, verbose | Complex structured prompts |
| **Markdown** | Human-readable, familiar | Ambiguous boundaries | Documentation, readable prompts |
| **Plain text** | Minimal tokens, simple | No structure | Simple queries |
| **JSON** | Precise structure | Escape issues, verbose | Data-heavy contexts |
| **YAML** | Readable, less verbose | Indentation-sensitive | Configuration-like prompts |

#### Practical Recommendation

Use **XML for section boundaries** with **Markdown for content**:

```xml
<role>
You are a senior TypeScript developer.
</role>

<context>
## Project Structure
- `src/` - Source code
- `test/` - Test files

## Current File
```typescript
// code here
```
</context>

<task>
Review the code above for security vulnerabilities.
</task>

<output_format>
Return findings as a markdown list with:
- **Location**: file:line
- **Issue**: description
- **Fix**: recommendation
</output_format>
```

### Delimiters and Structure

#### Effective Delimiter Strategies

| Strategy | Syntax | Use Case |
|----------|--------|----------|
| XML tags | `<section>...</section>` | Main section boundaries |
| Triple backticks | ` ``` ` | Code blocks |
| Markdown headers | `## Section` | Within-section organization |
| Horizontal rules | `---` | Visual separation |
| Numbered lists | `1. 2. 3.` | Sequential steps |
| Bullet points | `- item` | Unordered lists |

#### Claude-Specific Guidance

> "Claude follows instructions in the human messages better than those in the system message. Use the system message mainly for high-level scene setting, and put most instructions in the human prompts."
> — [Anthropic Engineering](https://www.anthropic.com/engineering/claude-code-best-practices)

---

## Framework and Mental Model

### The Prompt Canvas

The Prompt Canvas (arXiv:2412.05127) synthesizes prompt engineering literature into a unified framework:

```
┌────────────────────────────────────────────────────────────────┐
│                      THE PROMPT CANVAS                          │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FOUNDATION LAYER                                               │
│  ├── Role/Persona Definition                                   │
│  ├── Context & Background                                       │
│  └── Tone & Style Guidelines                                    │
│                                                                 │
│  TECHNIQUE LAYER                                                │
│  ├── Few-Shot Examples (optional)                              │
│  ├── Chain-of-Thought Triggers (optional)                      │
│  └── Self-Consistency Patterns (optional)                      │
│                                                                 │
│  INSTRUCTION LAYER                                              │
│  ├── Primary Task/Objective                                     │
│  ├── Constraints & Rules                                        │
│  └── Success Criteria                                           │
│                                                                 │
│  OUTPUT LAYER                                                   │
│  ├── Format Specification                                       │
│  ├── Structure Requirements                                     │
│  └── Quality Indicators                                         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### CO-STAR Framework

Winner of Singapore's GPT-4 prompt engineering competition:

| Component | Description | Example |
|-----------|-------------|---------|
| **C**ontext | Background information | "This is a legacy codebase..." |
| **O**bjective | Task to accomplish | "Review for security issues" |
| **S**tyle | Writing/output style | "Technical but accessible" |
| **T**one | Attitude of response | "Constructive and helpful" |
| **A**udience | Who will read output | "Senior developers" |
| **R**esponse | Output format | "Markdown with code blocks" |

### Proposed Pupt Framework

Based on this research, here is the recommended mental model for pupt's programmatic prompt system:

#### Section Hierarchy

```typescript
interface PromptStructure {
  // Identity Layer - Who is the LLM?
  role?: RoleSection;

  // Input Layer - What does the LLM know?
  context?: ContextSection[];
  examples?: ExampleSection[];

  // Directive Layer - What should the LLM do?
  task: TaskSection;          // Required
  constraints?: ConstraintSection[];

  // Output Layer - How should the LLM respond?
  output: OutputSection;      // Required (at minimum, implicit)

  // Meta Layer - How should the prompt be processed?
  technique?: TechniqueConfig;
}
```

#### Section Type Definitions

```typescript
interface RoleSection {
  type: 'role';
  persona: string;              // "senior TypeScript developer"
  expertise?: string[];         // ["security", "React", "Node.js"]
  experience?: string;          // "10 years"
  perspective?: string;         // "as a code reviewer"
}

interface ContextSection {
  type: 'context';
  subtype: 'project' | 'code' | 'domain' | 'history' | 'environment';
  content: string | FileReference | URLReference;
  priority?: 'high' | 'medium' | 'low';
}

interface ExampleSection {
  type: 'example';
  input: string;
  output: string;
  reasoning?: string;          // For CoT examples
  label?: string;              // "positive", "edge-case", etc.
}

interface TaskSection {
  type: 'task';
  action: string;              // "Review", "Generate", "Fix"
  target: string;              // What to act on
  scope?: string;              // Boundaries
  steps?: string[];            // Decomposed sub-tasks
  success_criteria?: string;
}

interface ConstraintSection {
  type: 'constraint';
  subtype: 'must' | 'must_not' | 'should' | 'format';
  rule: string;
  priority?: 'hard' | 'soft';
  rationale?: string;
}

interface OutputSection {
  type: 'output';
  format: 'json' | 'markdown' | 'code' | 'text' | 'structured';
  schema?: JSONSchema | ZodSchema;
  sections?: string[];
  length?: LengthConstraint;
}

interface TechniqueConfig {
  approach: 'zero-shot' | 'few-shot' | 'cot' | 'plan-solve' | 'react';
  reasoning?: boolean;         // Include "think step by step"
  self_consistency?: number;   // Number of samples for voting
}
```

#### Rendering Rules

1. **Position-aware rendering:**
   - Role → first
   - Context → after role
   - Examples → middle (if used)
   - Task → near end
   - Output → last

2. **Conditional inclusion:**
   - Sections with `priority: 'low'` can be dropped if context too long
   - Examples excluded for zero-shot

3. **Format-aware rendering:**
   - Use XML tags for section boundaries
   - Use Markdown within sections
   - Code blocks with language hints

---

## Recommendations for Pupt

### 1. Define a Section Type System

Create TypeScript interfaces for each section type with:
- Required vs. optional fields
- Type safety for attributes
- Validation rules

### 2. Implement Composable Sections

Allow sections to be:
- Defined separately and combined
- Inherited/extended from base templates
- Conditionally included based on runtime conditions

### 3. Support Multiple Rendering Strategies

```typescript
const prompt = new Prompt()
  .role("senior developer")
  .context(projectInfo)
  .task("review code")
  .render({
    format: 'xml',           // XML tags for structure
    technique: 'zero-shot',  // No examples
    model: 'claude-4'        // Model-specific optimizations
  });
```

### 4. Build Position-Aware Rendering

Implement automatic positioning based on:
- Research-backed position effects
- Model-specific preferences (Claude vs. GPT)
- Context length management

### 5. Create Task-Specific Templates

Pre-built templates for common software development tasks:
- `CodeReviewPrompt`
- `CodeGenerationPrompt`
- `DebuggingPrompt`
- `TestGenerationPrompt`
- `DocumentationPrompt`
- `RefactoringPrompt`

### 6. Implement Validation

Validate prompts for:
- Missing required sections
- Conflicting constraints
- Example format consistency
- Context length limits
- Anti-pattern detection

### 7. Support Prompt Testing

Enable testing prompts with:
- Deterministic outputs (for format testing)
- Multiple runs (for consistency testing)
- Regression detection

---

## Advanced Prompting Concepts

The following concepts were identified as gaps in the initial research and are critical for a comprehensive understanding of prompt structure.

### Meta-Prompting

> "Meta prompting is a technique where one Language Model (LLM) is used to generate or optimize prompts for another Language Model."
> — [PromptHub: Complete Guide to Meta Prompting](https://www.prompthub.us/blog/a-complete-guide-to-meta-prompting)

**Core concept:** Using LLMs to write prompts for LLMs, or using prompts to create other prompts.

#### Types of Meta-Prompting

| Type | Description | Use Case |
|------|-------------|----------|
| **Prompt Generation** | LLM generates prompts for tasks | Automating prompt creation |
| **Prompt Optimization** | LLM refines existing prompts | Improving performance |
| **Recursive Meta-Prompting (RMP)** | Self-improvement loop where LLM refines its own prompts | Automated prompt engineering |
| **Task-Agnostic Scaffolding** | Structural templates without content-specific examples | Zero-shot with structure |

#### Research Findings

From "Meta Prompting for AI Systems" (arXiv:2311.11482):
- A Qwen-72B model with a single meta-prompt achieved 46.3% on MATH, surpassing GPT-4's 42.5%
- Meta-prompting avoids biases inherent in few-shot examples
- 100% success rate on Game of 24 by generating a single Python program

#### Relevance to Pupt Structure

Meta-prompting suggests prompts should have:
- **Structural templates** that can be filled programmatically
- **Self-describing metadata** that another LLM could use to optimize
- **Modular sections** that can be individually refined

```typescript
interface MetaPromptableSection {
  type: string;
  content: string;
  optimization_hints?: string[];  // Hints for meta-optimization
  alternatives?: string[];        // Alternative phrasings to try
}
```

---

### Reflection and Reflexion

> "Reflection is a prompting strategy used to improve the quality and success rate of agents and similar AI systems. It involves prompting an LLM to reflect on and critique its past actions."
> — [LangChain: Reflection Agents](https://blog.langchain.com/reflection-agents/)

**Core concept:** Having the LLM evaluate and improve its own outputs through self-critique.

#### Reflection Architectures

```
┌─────────────────────────────────────────────────────────────┐
│                    REFLEXION FRAMEWORK                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────┐    ┌───────────┐    ┌──────────────────┐     │
│   │  Actor  │───►│ Evaluator │───►│ Self-Reflection  │     │
│   └────▲────┘    └───────────┘    └────────┬─────────┘     │
│        │                                    │               │
│        │         ┌─────────────┐            │               │
│        └─────────│   Memory    │◄───────────┘               │
│                  └─────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Components:**
- **Actor**: Generates text/actions based on observations
- **Evaluator**: Scores Actor outputs
- **Self-Reflection**: Generates verbal feedback for improvement
- **Memory**: Stores reflections for future episodes

#### Reflection Techniques

| Technique | Description | Implementation |
|-----------|-------------|----------------|
| **Output Reevaluation** | Feed output back with "Was this correct?" | Single prompt append |
| **Dual-Agent Critique** | Separate generator and critic agents | Multi-agent system |
| **Memory-Enhanced** | Store what worked/failed for future reference | Persistent memory |
| **Reflexion Loop** | Iterate until evaluator approves | While loop with exit condition |

#### Research Findings

- Self-reflection can significantly improve problem-solving (p < 0.001)
- Dual-loop reflection inspired by metacognition shows promise
- Works best for code generation where outputs can be validated

#### Relevance to Pupt Structure

Reflection suggests prompts should support:
- **Critique sections**: "After generating, evaluate your response for..."
- **Improvement instructions**: "If the output doesn't meet X, revise to..."
- **Memory references**: "Based on previous attempts..."

```typescript
interface ReflectivePrompt extends PromptStructure {
  reflection?: {
    self_critique_instructions: string;
    evaluation_criteria: string[];
    max_iterations?: number;
    memory_context?: string;
  };
}
```

---

### Prompt Chaining and Decomposition

> "Prompt chaining is a method where the output of one LLM prompt is used as the input for the next prompt in a sequence."
> — [DataCamp: Prompt Chaining Tutorial](https://www.datacamp.com/tutorial/prompt-chaining-llm)

**Core concept:** Breaking complex tasks into subtasks, each handled by a separate prompt.

#### Chain Types

| Type | Description | Example |
|------|-------------|---------|
| **Sequential** | Linear A → B → C | Analyze → Plan → Implement |
| **Conditional** | Branching based on output | If error → Debug else → Continue |
| **Parallel** | Multiple prompts simultaneously | Security + Performance + Style review |
| **Recursive** | Same prompt applied to parts | Review each file in a list |

#### Benefits

- **Transparency**: Each step is observable
- **Controllability**: Can intervene between steps
- **Reliability**: Validate outputs incrementally
- **Modularity**: Reuse chain components

#### Research Findings

- Prompt chaining consistently outperforms monolithic prompts
- Value increases with more advanced models
- Trade-off: More API calls = higher cost and latency

#### Relevance to Pupt Structure

Prompts should support:
- **Chain position awareness**: "This is step 2 of 4..."
- **Input/output contracts**: Define what each step receives/produces
- **Handoff context**: What to pass to the next step

```typescript
interface ChainablePrompt extends PromptStructure {
  chain?: {
    position?: number;           // Step in chain
    total_steps?: number;
    input_from_previous?: string;
    output_for_next?: string;
    exit_condition?: string;     // When to stop chaining
  };
}
```

---

### Prompt Compression

> "LLMLingua achieves up to 20x compression with minimal performance loss."
> — [Microsoft Research: LLMLingua](https://www.microsoft.com/en-us/research/blog/llmlingua-innovating-llm-efficiency-with-prompt-compression/)

**Core concept:** Reducing prompt length while preserving essential information.

#### Compression Methods

| Method | Approach | Trade-off |
|--------|----------|-----------|
| **Filtering** | Remove low-information tokens | Fast, may lose nuance |
| **Summarization** | Condense verbose sections | Semantic, lossy |
| **Encoding** | Learn compressed representations | Requires training |
| **Chunking** | Process in segments | Loses cross-chunk context |

#### Key Techniques

- **LLMLingua-2**: Token classification to retain essential tokens (3-6x faster than v1)
- **LongLLMLingua**: Mitigates "lost in the middle" for long contexts
- **Meta-tokens**: Placeholders that dynamically represent subsequences (lossless)

#### Relevance to Pupt Structure

Prompts should indicate:
- **Priority levels**: Which sections can be compressed/dropped
- **Compressibility hints**: Mark verbose vs. essential content
- **Minimum viable prompt**: Core sections that cannot be removed

```typescript
interface CompressibleSection {
  type: string;
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  compressible: boolean;
  minimum_tokens?: number;  // Never compress below this
}
```

---

### Knowledge Injection Techniques

#### Generated Knowledge Prompting

> "Generated Knowledge Prompting first prompts the LLM to generate useful knowledge related to the task, then incorporates that knowledge into the prompt."
> — [Prompt Engineering Guide](https://www.promptingguide.ai/techniques/knowledge)

**Two-step process:**
1. Generate relevant facts/knowledge
2. Use generated knowledge as context for the main task

**Performance:** 14-20% improvement on commonsense reasoning tasks

#### RAG vs Generated Knowledge

| Aspect | RAG | Generated Knowledge |
|--------|-----|---------------------|
| Source | External database | LLM's internal knowledge |
| Infrastructure | Vector DB, embeddings | None required |
| Freshness | Can be updated | Limited to training data |
| Best for | Factual, domain-specific | Commonsense, general reasoning |

#### Relevance to Pupt Structure

```typescript
interface KnowledgeAugmentedPrompt extends PromptStructure {
  knowledge_generation?: {
    enabled: boolean;
    knowledge_prompt: string;    // How to generate knowledge
    integration_strategy: 'prepend' | 'context_section' | 'inline';
  };
  rag?: {
    enabled: boolean;
    retrieval_query?: string;
    max_chunks?: number;
  };
}
```

---

### Additional Reasoning Techniques

#### Least-to-Most Prompting

**Concept:** Decompose complex problems into simpler subproblems, solve sequentially, using previous answers as input.

**Key difference from CoT:** Each step builds on previous outputs, not independent.

**Performance:** 6% → 76% on SCAN benchmark (compositional generalization)

**Structure implications:**
```xml
<decomposition>
  <subproblem order="1">First, identify...</subproblem>
  <subproblem order="2">Using the above, determine...</subproblem>
  <subproblem order="3">Finally, based on steps 1-2...</subproblem>
</decomposition>
```

#### Step-Back Prompting

**Concept:** Before diving into details, first derive high-level principles and concepts.

**Performance:** Up to 36% improvement over CoT (DeepMind study)

**Structure implications:**
```xml
<step_back>
  First, identify the general principles that apply to this problem.
</step_back>
<task>
  Now, using those principles, solve the specific problem.
</task>
```

#### Analogical Prompting

**Concept:** LLM self-generates relevant examples before solving the problem.

**Key insight:** 3-5 self-generated examples is optimal.

**Advantages:**
- No need for labeled examples
- Examples tailored to specific problem
- Works across domains

**Structure implications:**
```xml
<analogical_reasoning>
  Before solving, recall or generate 3 similar problems you've seen before,
  along with their solutions. Then apply those patterns to this problem.
</analogical_reasoning>
```

#### Program of Thoughts (PoT)

**Concept:** Generate reasoning as code, execute externally for computation.

**Performance:** ~12% average gain over CoT; ~20% on financial QA with large numbers

**Structure implications:**
```xml
<reasoning_mode>program_of_thoughts</reasoning_mode>
<execution_environment>python</execution_environment>
<task>
  Express your reasoning as Python code. The code will be executed
  to produce the final answer.
</task>
```

---

### Enhancement Techniques

#### Directional Stimulus Prompting (NeurIPS 2023)

**Concept:** Use a small tunable model to generate instance-specific hints that guide the LLM.

**Performance:** 41.4% improvement on ChatGPT with only 80 training dialogues

**Structure implications:** Prompts can include dynamically generated hints:
```xml
<directional_stimulus>
  [Instance-specific hint generated by policy model]
</directional_stimulus>
```

#### Emotion Prompting (EmotionPrompt)

**Concept:** Add emotional appeal to prompts to improve performance.

**Performance:** Up to 115% improvement on BIG-Bench

**Example emotional stimuli:**
- "This is very important to my career."
- "Take a deep breath and work on this step by step."
- "Embrace challenges as opportunities for growth."

**Structure implications:**
```typescript
interface EmotionalPrompt extends PromptStructure {
  emotional_framing?: {
    importance: string;      // "This is critical because..."
    encouragement: string;   // "You're capable of..."
    stakes: string;          // "The outcome will affect..."
  };
}
```

#### Rephrase and Respond (RaR)

**Concept:** Have LLM rephrase the question before answering to improve understanding.

**Performance:** Near 100% accuracy on previously challenging tasks for GPT-4

**Implementation:** Simply append "Rephrase and expand the question, and respond."

**Structure implications:**
```xml
<preprocessing>rephrase_and_respond</preprocessing>
```

---

### Technique Selection Matrix

| Task Type | Recommended Techniques |
|-----------|----------------------|
| **Simple Q&A** | Zero-shot, RaR |
| **Math/Calculation** | PoT, CoT, Self-Consistency |
| **Complex Reasoning** | Least-to-Most, Step-Back, ToT |
| **Code Generation** | PoT, Few-shot, Reflection |
| **Code Review** | Role + Checklist, Reflection |
| **Creative Tasks** | Emotion Prompting, Analogical |
| **Factual Tasks** | RAG, Generated Knowledge |
| **Multi-Step Tasks** | Prompt Chaining, Least-to-Most |

---

### Implications for Prompt Structure

Based on these advanced concepts, a comprehensive prompt structure should support:

```typescript
interface AdvancedPromptStructure {
  // Core sections (from original research)
  role?: RoleSection;
  context?: ContextSection[];
  task: TaskSection;
  constraints?: ConstraintSection[];
  examples?: ExampleSection[];
  output: OutputSection;

  // Advanced technique configuration
  technique?: {
    type: 'zero-shot' | 'few-shot' | 'cot' | 'pot' | 'least-to-most' |
          'step-back' | 'analogical' | 'react' | 'reflexion';

    // Reasoning configuration
    reasoning?: {
      enabled: boolean;
      style: 'step-by-step' | 'program' | 'abstract-first' | 'analogical';
    };

    // Reflection configuration
    reflection?: {
      enabled: boolean;
      critique_prompt: string;
      max_iterations: number;
    };

    // Knowledge augmentation
    knowledge?: {
      type: 'generated' | 'rag' | 'none';
      generation_prompt?: string;
    };
  };

  // Chaining support
  chain?: {
    position: number;
    input_schema?: JSONSchema;
    output_schema?: JSONSchema;
  };

  // Compression hints
  compression?: {
    strategy: 'none' | 'filter' | 'summarize';
    priority_map: Record<string, 'critical' | 'high' | 'medium' | 'low'>;
  };

  // Meta-prompting support
  meta?: {
    optimization_enabled: boolean;
    alternative_phrasings?: Record<string, string[]>;
  };

  // Enhancement flags
  enhancements?: {
    emotional_framing?: string;
    rephrase_first?: boolean;
    directional_stimulus?: string;
  };
}
```

---

## References

### Academic Papers

1. **"The Prompt Report: A Systematic Survey of Prompting Techniques"** (2024)
   - arXiv: [2406.06608](https://arxiv.org/abs/2406.06608)
   - Key: Taxonomy of 58 prompting techniques, 33 vocabulary terms

2. **"A Taxonomy of Prompt Defects in LLM Systems"** (2025)
   - arXiv: [2509.14404](https://arxiv.org/abs/2509.14404)
   - Key: Six-dimension taxonomy of prompt failures

3. **"The Prompt Canvas: A Literature-Based Practitioner Guide"** (2024)
   - arXiv: [2412.05127](https://arxiv.org/abs/2412.05127)
   - Key: Unified framework for prompt engineering

4. **"From Prompts to Templates: A Systematic Prompt Template Analysis"** (2025)
   - arXiv: [2504.02052](https://arxiv.org/abs/2504.02052)
   - Key: Real-world template analysis, component patterns

5. **"A Systematic Survey of Prompt Engineering in Large Language Models"** (2024)
   - arXiv: [2402.07927](https://arxiv.org/abs/2402.07927)
   - Key: Comprehensive technique overview

6. **"Serial Position Effects of Large Language Models"** (2024)
   - arXiv: [2406.15981](https://arxiv.org/abs/2406.15981)
   - Key: Primacy/recency effects in prompts

7. **"What Prompts Don't Say: Understanding Underspecification"** (2025)
   - arXiv: [2505.13360](https://arxiv.org/abs/2505.13360)
   - Key: Effects of underspecification

8. **"Chain-of-Thought Prompting Elicits Reasoning"** (Wei et al., 2022)
   - arXiv: [2201.11903](https://arxiv.org/abs/2201.11903)
   - Key: Foundational CoT paper

9. **"A Survey on Code Generation with LLM-based Agents"** (2025)
   - arXiv: [2508.00083](https://arxiv.org/abs/2508.00083)
   - Key: Software development with LLMs

10. **"The Impact of Role Design in In-Context Learning"** (2025)
    - arXiv: [2509.23501](https://arxiv.org/abs/2509.23501)
    - Key: System/user/assistant role analysis

11. **"Meta Prompting for AI Systems"** (Zhang et al., 2024)
    - arXiv: [2311.11482](https://arxiv.org/abs/2311.11482)
    - Key: Category theory formalization, Recursive Meta-Prompting

12. **"Reflexion: Language Agents with Verbal Reinforcement Learning"** (Shinn et al., 2023)
    - arXiv: [2303.11366](https://arxiv.org/abs/2303.11366)
    - Key: Self-reflection framework for LLM agents

13. **"Least-to-Most Prompting Enables Complex Reasoning"** (Zhou et al., 2022)
    - arXiv: [2205.10625](https://arxiv.org/abs/2205.10625)
    - Key: Compositional generalization via decomposition

14. **"Take a Step Back: Evoking Reasoning via Abstraction"** (Zheng et al., 2023)
    - arXiv: [2310.06117](https://arxiv.org/abs/2310.06117)
    - Key: Step-back prompting, 36% improvement over CoT

15. **"Large Language Models as Analogical Reasoners"** (Yasunaga et al., 2023)
    - arXiv: [2310.01714](https://arxiv.org/abs/2310.01714)
    - Key: Self-generated examples, analogical reasoning

16. **"Program of Thoughts Prompting"** (Chen et al., 2022)
    - arXiv: [2211.12588](https://arxiv.org/abs/2211.12588)
    - Key: Disentangling computation from reasoning

17. **"Guiding Large Language Models via Directional Stimulus Prompting"** (Li et al., 2023)
    - arXiv: [2302.11520](https://arxiv.org/abs/2302.11520)
    - Key: NeurIPS 2023, instance-specific hints

18. **"Large Language Models Understand and Can be Enhanced by Emotional Stimuli"** (Li et al., 2023)
    - arXiv: [2307.11760](https://arxiv.org/abs/2307.11760)
    - Key: EmotionPrompt, 115% improvement on BIG-Bench

19. **"Rephrase and Respond: Let Large Language Models Ask Better Questions"** (Deng et al., 2023)
    - arXiv: [2311.04205](https://arxiv.org/abs/2311.04205)
    - Key: RaR technique, near 100% on challenging tasks

20. **"Prompt Compression for Large Language Models: A Survey"** (2024)
    - arXiv: [2410.12388](https://arxiv.org/abs/2410.12388)
    - Key: Comprehensive survey of compression techniques

### Official Documentation

- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic Claude 4 Best Practices](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Anthropic Context Engineering for Agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [GitHub Copilot Custom Instructions](https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions)
- [OWASP LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html)

### Practitioner Resources

- [Prompt Engineering Guide](https://www.promptingguide.ai/) - Comprehensive guide
- [Learn Prompting](https://learnprompting.org/) - Tutorials and techniques
- [The Prompt Engineering Playbook for Programmers](https://addyo.substack.com/p/the-prompt-engineering-playbook-for)
- [GitHub: awesome-reviewers](https://github.com/baz-scm/awesome-reviewers) - Code review prompts
- [GitHub: awesome-copilot](https://github.com/github/awesome-copilot) - Copilot prompts
- [Martin Fowler: An example of LLM prompting for programming](https://martinfowler.com/articles/2023-chatgpt-xu-hao.html)

### Tools and Frameworks

- [LangChain LCEL](https://python.langchain.com/docs/concepts/lcel/)
- [DSPy](https://dspy.ai/)
- [LMQL](https://lmql.ai/)
- [Microsoft Guidance](https://github.com/guidance-ai/guidance)
- [Outlines](https://github.com/dottxt-ai/outlines)

---

## Appendix: Quick Reference

### Prompt Checklist

```
□ Clear task definition with specific action verb
□ Appropriate role/persona (if domain-specific)
□ Relevant context provided
□ Explicit output format specified
□ Constraints stated positively when possible
□ Important information at beginning or end (not middle)
□ Examples provided (if format demonstration needed)
□ No conflicting instructions
□ Appropriate length (not overloaded)
```

### Section Template

```xml
<role>
[Persona with expertise, experience, and perspective]
</role>

<context>
[Background information, code, project details]
</context>

<examples>
<example>
<input>[Example input]</input>
<output>[Expected output]</output>
</example>
</examples>

<task>
[Clear instruction with action, target, and scope]
</task>

<constraints>
- [Must: required behaviors]
- [Should: preferences]
</constraints>

<output_format>
[Format specification with structure requirements]
</output_format>
```

### Anti-Pattern Quick Reference

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Vague instructions | Inconsistent output | Be specific with examples |
| Negative instructions | Model focuses on forbidden | Use positive framing |
| Overloaded prompts | Degraded performance | Split into focused prompts |
| Middle-positioned info | Gets ignored | Put important info at edges |
| Inconsistent examples | Confuses model | Standardize example format |
| No output format | Unpredictable structure | Specify format explicitly |

---

## Detailed Section Specifications

This section provides comprehensive structural specifications for each prompt section, including what makes each section effective, all possible attributes/variables, and patterns for modular composition.

### Role/Persona Section: Detailed Specification

#### What Makes an Effective Role

Research from [PromptHub](https://www.prompthub.us/blog/role-prompting-does-adding-personas-to-your-prompts-really-make-a-difference) and [Emergent Mind](https://www.emergentmind.com/topics/expert-persona-prompting) identifies the key factors that make role definitions effective:

**1. Expertise Alignment with Task**

The role must be thematically aligned with the task domain. A math-related persona improves math performance; a coding persona improves code quality.

| Alignment Level | Description | Example |
|-----------------|-------------|---------|
| **Strong** | Expertise directly matches task | "TypeScript security expert" for security review |
| **Moderate** | Related but not exact | "Software architect" for code review |
| **Weak** | Tangentially related | "Problem solver" for debugging |
| **Misaligned** | Unrelated to task | "Marketing expert" for code generation |

**Research finding:** A study in March 2024 showed a 10 percentage point improvement (53% to 63%) on math datasets when using persona prompting with aligned expertise.

**2. Specificity Spectrum**

Roles exist on a spectrum from generic to highly specific:

```
Generic ────────────────────────────────────────────────► Specific

"assistant"  →  "developer"  →  "senior developer"  →  "senior TypeScript developer
                                                         with 10 years in fintech,
                                                         specializing in security"
```

**Research finding:** More specific personas outperform generic ones, but irrelevant details can harm performance. Include only expertise attributes relevant to the task.

**3. Core Role Attributes**

| Attribute | Type | Description | Impact on Output |
|-----------|------|-------------|------------------|
| `persona` | string | Primary role identity | Sets baseline behavior |
| `expertise` | string[] | Domain specializations | Activates domain vocabulary |
| `experience_level` | 'junior' \| 'mid' \| 'senior' \| 'principal' | Seniority level | Affects depth/nuance |
| `years_experience` | number | Numeric experience | Quantifies expertise |
| `perspective` | string | Viewpoint to adopt | Frames analysis |
| `style` | string | Communication approach | Affects tone/format |
| `personality` | string | Character traits | Adds consistency |
| `constraints` | string[] | Role-specific limits | Bounded behavior |
| `likes` | string[] | Preferences | Biases toward patterns |
| `dislikes` | string[] | Aversions | Biases away from patterns |

**4. Role Anti-Patterns**

| Anti-Pattern | Problem | Better Approach |
|--------------|---------|-----------------|
| Too generic | No domain activation | Add specific expertise |
| Irrelevant details | Noise, potential harm | Only task-relevant attributes |
| Conflicting traits | Inconsistent output | Coherent persona |
| Gendered assumptions | Potential bias | Use gender-neutral terms |
| Fictional characters | Unpredictable behavior | Professional personas |

#### Complete RoleSection Interface

```typescript
interface RoleSection {
  type: 'role';

  // Primary identity
  persona: string;                    // "senior software architect"

  // Expertise specification
  expertise?: {
    domains: string[];               // ["TypeScript", "React", "Node.js"]
    specializations?: string[];      // ["security", "performance optimization"]
    certifications?: string[];       // ["AWS Solutions Architect"]
  };

  // Experience level
  experience?: {
    level: 'junior' | 'mid' | 'senior' | 'principal' | 'expert';
    years?: number;                  // 10
    notable_projects?: string[];     // ["led migration of 1M LOC to TypeScript"]
  };

  // Perspective and framing
  perspective?: {
    role: string;                    // "as a code reviewer"
    audience_relationship?: string;  // "mentoring a junior developer"
    goal?: string;                   // "ensuring production readiness"
  };

  // Communication style
  style?: {
    tone: 'professional' | 'casual' | 'academic' | 'friendly';
    formality: 'formal' | 'semiformal' | 'informal';
    verbosity: 'concise' | 'moderate' | 'detailed';
    approach?: string;               // "socratic", "direct", "collaborative"
  };

  // Behavioral traits
  traits?: {
    personality?: string[];          // ["methodical", "thorough", "pragmatic"]
    priorities?: string[];           // ["security", "maintainability", "performance"]
    preferences?: string[];          // ["functional style", "immutability"]
    aversions?: string[];            // ["magic strings", "any types"]
  };

  // Role-specific constraints
  role_constraints?: string[];       // ["always cite sources", "never skip validation"]

  // Meta attributes for optimization
  meta?: {
    optimization_enabled?: boolean;
    alternative_phrasings?: string[];
  };
}
```

#### Role Composition Patterns

**Pattern 1: Layered Expertise**
```typescript
const securityReviewer = new Role()
  .persona("senior software engineer")
  .addExpertise("TypeScript", "Node.js")
  .specialize("application security", "OWASP Top 10")
  .perspective("as a security auditor")
  .style({ tone: "professional", verbosity: "detailed" });
```

**Pattern 2: Role Inheritance**
```typescript
class CodeReviewerRole extends BaseRole {
  constructor() {
    super("senior developer");
    this.perspective = "as a code reviewer";
    this.priorities = ["correctness", "maintainability", "readability"];
  }
}

class SecurityReviewerRole extends CodeReviewerRole {
  constructor() {
    super();
    this.addSpecialization("security");
    this.priorities.unshift("security vulnerabilities");
  }
}
```

**Pattern 3: Composable Traits**
```typescript
const role = new Role()
  .use(ExpertTraits.thorough)
  .use(ExpertTraits.security_focused)
  .use(StyleTraits.mentoring)
  .customize({ years_experience: 10 });
```

---

### Examples Section: Detailed Specification

#### What Makes Effective Examples

Research from [arXiv:2402.07927](https://arxiv.org/abs/2402.07927) and ECHO framework studies identifies the key factors for effective few-shot examples:

**1. Selection Criteria**

| Criterion | Description | Impact |
|-----------|-------------|--------|
| **Diversity** | Cover different cases/patterns | Prevents overfitting to single pattern |
| **Relevance** | Similar to target task | Better pattern transfer |
| **Complexity match** | Appropriate difficulty level | Not too simple, not overwhelming |
| **Quality** | Correct, well-formed outputs | Bad examples degrade performance |
| **Consistency** | Same format across examples | Clear output expectations |

**Research finding:** The ECHO framework retains performance with 50% fewer examples by unifying diverse reasoning paths into a coherent pattern.

**2. Optimal Number of Examples**

| Task Type | Recommended Count | Reasoning |
|-----------|-------------------|-----------|
| Format demonstration | 1-2 | Shows structure only |
| Classification | 3-5 | Covers class distribution |
| Complex reasoning | 3-5 | Diverse reasoning patterns |
| Many-shot (biases) | 100+ | Overcomes inherent biases |

**Warning: Over-prompting degrades performance.** More examples ≠ better results. After a threshold, additional examples add noise.

**3. Example Order Effects**

Position significantly affects how models use examples:

| Effect | Description | Mitigation |
|--------|-------------|------------|
| **Recency bias** | Model repeats last example's pattern | Put most critical example last |
| **Primacy effect** | First example sets expectations | Ensure first example is representative |
| **Majority label bias** | Leans toward most frequent label | Balance label distribution |

**Research finding:** Reordering examples can shift accuracy by >40%.

**4. Example Quality Metrics**

| Metric | Definition | How to Measure |
|--------|------------|----------------|
| **Correctness** | Output is accurate | Manual verification |
| **Completeness** | Covers all requirements | Checklist against spec |
| **Consistency** | Format matches others | Structural comparison |
| **Complexity** | Appropriate difficulty | Token count, step count |
| **Relevance** | Related to test case | Semantic similarity |
| **Reasoning quality** | Clear thought process | CoT evaluation |

**5. Example Clustering for Diversity**

The Auto-CoT approach uses clustering to select diverse examples:

1. Embed all candidate examples using Sentence-BERT
2. Cluster embeddings using k-means
3. Select one representative from each cluster
4. Choose the most complex example from each cluster (longest reasoning chain)

#### Complete ExampleSection Interface

```typescript
interface ExampleSection {
  type: 'example';

  // Core content
  input: string | StructuredInput;
  output: string | StructuredOutput;

  // Reasoning (for Chain-of-Thought)
  reasoning?: {
    steps?: string[];               // Step-by-step thought process
    explanation?: string;           // Why this output is correct
    alternatives_considered?: string[]; // Other options rejected
  };

  // Metadata
  metadata?: {
    label?: string;                 // "positive", "negative", "edge-case"
    category?: string;              // "error-handling", "happy-path"
    difficulty?: 'simple' | 'moderate' | 'complex';
    source?: string;                // Where example came from
  };

  // Quality attributes
  quality?: {
    verified?: boolean;             // Human-verified correct
    confidence?: number;            // 0-1 confidence score
    last_validated?: Date;
  };

  // Selection hints
  selection?: {
    priority?: number;              // Order preference (higher = more important)
    cluster_id?: string;            // For diversity-based selection
    embedding_vector?: number[];    // Pre-computed embedding
    semantic_similarity?: number;   // Similarity to target task
  };

  // Format specification
  format?: {
    input_delimiter?: string;       // "Input:" or "Question:"
    output_delimiter?: string;      // "Output:" or "Answer:"
    reasoning_delimiter?: string;   // "Reasoning:" or "Let's think step by step:"
  };
}

interface StructuredInput {
  content: string;
  context?: string;
  variables?: Record<string, unknown>;
}

interface StructuredOutput {
  content: string;
  format?: 'text' | 'json' | 'code' | 'markdown';
  schema?: JSONSchema;
}
```

#### Example Composition Patterns

**Pattern 1: Example Builder with Validation**
```typescript
const example = new Example()
  .input("Review this function for security issues: [code]")
  .output({
    format: "structured",
    issues: [
      { line: 5, severity: "high", issue: "SQL injection" }
    ]
  })
  .withReasoning([
    "First, I identify all user inputs",
    "Then, I trace how inputs flow through the code",
    "I find that userInput is concatenated into SQL query"
  ])
  .label("sql-injection")
  .verify(); // Validates output matches expected format
```

**Pattern 2: Example Sets with Automatic Diversity**
```typescript
const exampleSet = new ExampleSet()
  .addAll(candidateExamples)
  .cluster(5)                        // Create 5 clusters
  .selectMostComplex()               // One per cluster
  .orderByRelevance(targetTask);     // Order by similarity to task
```

**Pattern 3: Dynamic Example Selection**
```typescript
const examples = new ExampleSelector()
  .fromRepository(exampleRepo)
  .filterByCategory("security-review")
  .selectBySimilarity(targetCode, 3)  // 3 most similar
  .ensureDiversity(0.3);              // Min 0.3 cosine distance
```

**Pattern 4: CoT Example Template**
```typescript
const cotExample = new ChainOfThoughtExample()
  .question("Is this code vulnerable to injection?")
  .thought("Let me trace the data flow...")
  .thought("User input comes from req.query.id...")
  .thought("This is passed directly to the SQL query...")
  .conclusion("Yes, vulnerable to SQL injection at line 15");
```

---

### Output Format Section: Detailed Specification

#### What Makes Effective Output Formats

Research from [Pydantic documentation](https://pydantic.dev/articles/llm-intro) and OpenAI's structured output feature (August 2024) identifies key factors:

**1. Format Selection Criteria**

| Format | Best For | Pros | Cons |
|--------|----------|------|------|
| **JSON** | Structured data, APIs | Parseable, type-safe | Escape issues, verbose |
| **Markdown** | Documentation, readable | Human-friendly, flexible | Less structure |
| **Code** | Implementation | Executable, precise | Language-specific |
| **Plain text** | Conversational | Natural, flexible | Hard to parse |
| **XML** | Nested structures | Clear boundaries | Very verbose |
| **YAML** | Configuration | Readable, less verbose | Indentation-sensitive |

**2. Structured Output Best Practices**

From [OpenAI Community](https://community.openai.com/t/structured-output-precision-accuracy-pydantic-vs-a-schema/1054410):

| Practice | Description | Impact |
|----------|-------------|--------|
| **Use JSON Schema** | Define structure explicitly | 35% → 100% compliance (with strict mode) |
| **Enable strict mode** | Reject non-conforming outputs | Guaranteed schema adherence |
| **Keep schemas lean** | Don't overload with fields | Faster, more reliable |
| **Add descriptions** | Describe each field's purpose | Better field interpretation |
| **Implement retry** | Re-prompt on validation failure | Higher success rate |

**3. Length and Scope Specifications**

| Constraint Type | Example | Effect |
|-----------------|---------|--------|
| **Word count** | "under 200 words" | Hard length limit |
| **Item count** | "3 bullet points" | Structural limit |
| **Section count** | "2 paragraphs" | Organizational limit |
| **Token estimate** | "approximately 500 tokens" | Soft guidance |
| **Relative** | "brief summary" | Implicit limit |

**4. Quality Indicators in Output Specs**

| Indicator | Description | Example |
|-----------|-------------|---------|
| **Completeness** | All required fields | "Include all found issues" |
| **Accuracy** | Correctness criteria | "All code must compile" |
| **Formatting** | Style requirements | "Use proper indentation" |
| **Ordering** | Sequence rules | "Sort by severity" |
| **References** | Citation requirements | "Include line numbers" |

#### Complete OutputSection Interface

```typescript
interface OutputSection {
  type: 'output';

  // Format specification
  format: {
    type: 'json' | 'markdown' | 'code' | 'text' | 'xml' | 'yaml' | 'structured';
    mime_type?: string;              // "application/json"
    encoding?: string;               // "utf-8"
  };

  // Schema definition (for structured output)
  schema?: {
    json_schema?: JSONSchema;        // Standard JSON Schema
    pydantic_model?: string;         // Reference to Pydantic model
    zod_schema?: string;             // Reference to Zod schema
    typescript_type?: string;        // TypeScript type definition
    example?: unknown;               // Example conforming output
  };

  // Structure specification
  structure?: {
    sections?: SectionSpec[];        // Expected sections
    ordering?: 'fixed' | 'flexible'; // Must follow order?
    required_fields?: string[];      // Fields that must appear
    optional_fields?: string[];      // Fields that may appear
  };

  // Length constraints
  length?: {
    type: 'words' | 'characters' | 'tokens' | 'items' | 'lines';
    min?: number;
    max?: number;
    target?: number;                 // Ideal length
    strict?: boolean;                // Hard vs soft limit
  };

  // Quality requirements
  quality?: {
    completeness?: string;           // "Cover all edge cases"
    accuracy?: string;               // "All code must be syntactically valid"
    verification?: string;           // "Include test cases to verify"
  };

  // Code-specific options
  code?: {
    language: string;                // "typescript"
    include_imports?: boolean;
    include_types?: boolean;
    style_guide?: string;            // "prettier", "airbnb"
    runnable?: boolean;              // Must be directly executable
  };

  // Markdown-specific options
  markdown?: {
    heading_level_start?: number;    // Start at h2
    include_toc?: boolean;
    code_block_language?: string;
    link_style?: 'inline' | 'reference';
  };

  // Response wrapper (for multi-part outputs)
  wrapper?: {
    prefix?: string;                 // "Here's my analysis:"
    suffix?: string;                 // "Let me know if you need clarification."
    suppress_preamble?: boolean;     // No intro text
    suppress_postamble?: boolean;    // No closing text
  };

  // Validation rules
  validation?: {
    must_match_schema?: boolean;
    custom_validators?: string[];    // "no_placeholder_text", "valid_json"
    retry_on_failure?: boolean;
    max_retries?: number;
  };
}

interface SectionSpec {
  name: string;                      // "Summary"
  required: boolean;
  order?: number;
  format?: string;                   // "bullet-list", "paragraph"
  max_items?: number;
}
```

#### JSON Schema Integration

```typescript
// Example: Defining structured output with JSON Schema
const codeReviewOutputSchema: JSONSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "Brief overall assessment of the code"
    },
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "File path and line number (e.g., 'src/auth.ts:42')"
          },
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low", "info"],
            description: "How urgent is this issue?"
          },
          category: {
            type: "string",
            enum: ["security", "performance", "style", "bug", "maintainability"],
            description: "Type of issue"
          },
          issue: {
            type: "string",
            description: "What the problem is"
          },
          suggestion: {
            type: "string",
            description: "How to fix it"
          },
          code_before: {
            type: "string",
            description: "The problematic code snippet"
          },
          code_after: {
            type: "string",
            description: "The suggested fix"
          }
        },
        required: ["location", "severity", "category", "issue", "suggestion"]
      }
    },
    recommendations: {
      type: "array",
      items: { type: "string" },
      description: "General improvement suggestions"
    }
  },
  required: ["summary", "issues"]
};
```

#### Output Format Composition Patterns

**Pattern 1: Schema Builder**
```typescript
const output = new OutputFormat()
  .json()
  .schema(CodeReviewSchema)
  .maxItems("issues", 20)
  .require("summary", "issues")
  .optional("recommendations")
  .strictMode();
```

**Pattern 2: Markdown Template**
```typescript
const output = new OutputFormat()
  .markdown()
  .sections([
    { name: "Summary", format: "paragraph", required: true },
    { name: "Issues Found", format: "numbered-list", required: true },
    { name: "Recommendations", format: "bullet-list", required: false }
  ])
  .codeBlocks("typescript")
  .maxLength({ type: "words", max: 500 });
```

**Pattern 3: Code Output**
```typescript
const output = new OutputFormat()
  .code("typescript")
  .includeTypes()
  .includeImports()
  .styleGuide("prettier")
  .runnable()
  .noPlaceholders();  // Must be complete, executable code
```

---

### Context Section: Detailed Specification

#### What Makes Effective Context

Research from [The New Stack](https://thenewstack.io/context-engineering-going-beyond-prompt-engineering-and-rag/) on context engineering:

**1. Context Types and Their Purposes**

| Type | Description | When to Include | Priority |
|------|-------------|-----------------|----------|
| **Project** | Tech stack, conventions | Always for code tasks | High |
| **Code** | Files, functions, types | When referencing code | Critical |
| **Domain** | Business rules, terminology | Domain-specific tasks | High |
| **History** | Previous interactions | Multi-turn conversations | Medium |
| **Environment** | OS, versions, config | Debugging, deployment | Medium |
| **Retrieved (RAG)** | External knowledge | Factual/current info | Varies |

**2. Context Placement Rules**

| Placement | Best For | Reasoning |
|-----------|----------|-----------|
| **Before task** | Reference material | Available when processing task |
| **After role** | Sets scene | Role interprets context |
| **Chunked throughout** | Very long context | Reduces "lost in middle" |
| **End (before task)** | Most critical info | Recency effect |

**3. Context Quality Factors**

| Factor | Description | How to Achieve |
|--------|-------------|----------------|
| **Relevance** | Only task-related info | Filter aggressively |
| **Freshness** | Up-to-date information | Timestamp, refresh |
| **Completeness** | All needed info | Check dependencies |
| **Conciseness** | No redundancy | Deduplicate, summarize |
| **Structure** | Clear organization | Use delimiters, headers |

**4. Context Compression Strategies**

From [Microsoft Research on LLMLingua](https://www.microsoft.com/en-us/research/blog/llmlingua-innovating-llm-efficiency-with-prompt-compression/):

| Strategy | Compression | Fidelity | Best For |
|----------|-------------|----------|----------|
| **Token filtering** | High (20x) | Good | Large contexts |
| **Summarization** | Medium (5x) | Moderate | Narrative content |
| **Chunking** | None | Perfect | Sequential processing |
| **Priority-based** | Variable | High | Mixed-priority content |

#### Complete ContextSection Interface

```typescript
interface ContextSection {
  type: 'context';

  // Context type classification
  subtype: 'project' | 'code' | 'domain' | 'history' | 'environment' | 'retrieved';

  // Content specification
  content: {
    inline?: string;                 // Direct content
    file?: FileReference;            // File to include
    url?: URLReference;              // URL to fetch
    query?: RAGQuery;                // Retrieval query
    computed?: () => string;         // Dynamic content
  };

  // Metadata
  metadata?: {
    source?: string;                 // Where content came from
    timestamp?: Date;                // When content was captured
    version?: string;                // Version of source
    author?: string;                 // Who created content
  };

  // Priority and handling
  priority: 'critical' | 'high' | 'medium' | 'low';

  // Compression hints
  compression?: {
    compressible: boolean;
    strategy?: 'filter' | 'summarize' | 'chunk' | 'none';
    minimum_tokens?: number;         // Never compress below this
    summary_prompt?: string;         // How to summarize if needed
  };

  // Relevance specification
  relevance?: {
    why_included: string;            // "Contains the function to review"
    related_sections?: string[];     // IDs of related context
    scope?: string;                  // "authentication module"
  };

  // Format specification
  format?: {
    type: 'code' | 'text' | 'json' | 'markdown' | 'mixed';
    language?: string;               // For code: "typescript"
    delimiter?: string;              // Custom delimiter
    max_tokens?: number;             // Truncate if over
  };

  // RAG-specific options
  retrieval?: {
    query: string;
    max_chunks: number;
    similarity_threshold?: number;
    source_filter?: string[];        // Only from these sources
    treat_as_untrusted?: boolean;    // Security: indirect injection risk
  };

  // Conditional inclusion
  condition?: {
    include_if?: string;             // Expression to evaluate
    exclude_if?: string;
    fallback?: string;               // If condition not met
  };
}

interface FileReference {
  path: string;
  line_start?: number;
  line_end?: number;
  highlight_lines?: number[];
  transform?: 'none' | 'strip_comments' | 'minify' | 'summarize';
}

interface URLReference {
  url: string;
  selector?: string;                 // CSS selector for extraction
  cache_ttl?: number;                // Cache duration in seconds
  fallback_content?: string;         // If fetch fails
}

interface RAGQuery {
  query: string;
  collection: string;
  max_results: number;
  filters?: Record<string, unknown>;
}
```

---

### Task/Instruction Section: Detailed Specification

#### What Makes Effective Tasks

Research from [PromptLayer](https://www.promptlayer.com/glossary/prompt-decomposition) and [Lakera](https://www.lakera.ai/blog/prompt-engineering-guide):

**1. Task Decomposition Principles**

| Principle | Description | Example |
|-----------|-------------|---------|
| **Atomic actions** | Each step is single action | "Identify X" not "Identify and fix X" |
| **Clear dependencies** | Explicit step ordering | "Using step 1's output, ..." |
| **Measurable criteria** | Verifiable completion | "...until all tests pass" |
| **Scoped boundaries** | Clear what's in/out | "Only the login function" |

**2. Action Verb Categories**

| Category | Verbs | Task Type |
|----------|-------|-----------|
| **Analysis** | Analyze, Review, Evaluate, Assess, Examine | Understanding existing code |
| **Generation** | Create, Generate, Write, Implement, Build | Producing new code |
| **Modification** | Refactor, Fix, Update, Improve, Optimize | Changing existing code |
| **Explanation** | Explain, Describe, Document, Summarize | Producing documentation |
| **Validation** | Test, Verify, Check, Validate, Confirm | Ensuring correctness |

**3. Task Clarity Indicators**

| Indicator | Good Example | Bad Example |
|-----------|--------------|-------------|
| **Specific action** | "Review for SQL injection" | "Review the code" |
| **Clear scope** | "in the auth module" | "in the codebase" |
| **Success criteria** | "until all tests pass" | "when it's good" |
| **Quantity** | "find up to 5 issues" | "find issues" |

#### Complete TaskSection Interface

```typescript
interface TaskSection {
  type: 'task';

  // Primary instruction
  instruction: {
    action: string;                  // "Review", "Generate", "Fix"
    verb_category?: 'analysis' | 'generation' | 'modification' | 'explanation' | 'validation';
    target: string;                  // What to act on
    purpose?: string;                // Why this action
  };

  // Scope definition
  scope?: {
    includes: string[];              // What's in scope
    excludes?: string[];             // Explicitly out of scope
    boundaries?: string;             // "Only the login function"
    depth?: 'surface' | 'moderate' | 'deep' | 'exhaustive';
  };

  // Decomposition (for complex tasks)
  decomposition?: {
    strategy: 'sequential' | 'parallel' | 'hierarchical';
    steps: TaskStep[];
    dependencies?: StepDependency[];
  };

  // Success criteria
  success_criteria?: {
    completion_conditions: string[]; // "All tests pass"
    quality_standards?: string[];    // "No TypeScript errors"
    output_requirements?: string[];  // "Includes types"
    negative_criteria?: string[];    // "No console.log statements"
  };

  // Quantity/limits
  limits?: {
    max_items?: number;              // "Find up to 5 issues"
    max_depth?: number;              // Recursion/nesting limit
    time_box?: string;               // "Focus on quick wins"
    priority?: string;               // "Most critical first"
  };

  // Reasoning mode
  reasoning?: {
    required: boolean;
    style: 'step-by-step' | 'tree' | 'program' | 'abstract-first';
    show_work: boolean;              // Show reasoning in output
  };

  // Error handling
  error_handling?: {
    on_ambiguity: 'ask' | 'assume' | 'skip' | 'note';
    on_incomplete_context: 'proceed' | 'request' | 'note';
    on_conflict: 'prioritize_first' | 'prioritize_last' | 'note_all';
  };
}

interface TaskStep {
  id: string;
  order: number;
  instruction: string;
  input_from?: string[];             // IDs of previous steps
  output_to?: string[];              // IDs of next steps
  optional?: boolean;
  condition?: string;
}

interface StepDependency {
  from: string;                      // Step ID
  to: string;                        // Step ID
  type: 'requires' | 'enables' | 'informs';
}
```

---

### Constraints Section: Detailed Specification

#### What Makes Effective Constraints

**1. Constraint Types and Enforcement**

| Type | Description | Enforcement | Example |
|------|-------------|-------------|---------|
| **Must** | Absolute requirements | Hard, fail if violated | "Must use TypeScript" |
| **Must Not** | Absolute prohibitions | Hard, fail if violated | "Must not expose secrets" |
| **Should** | Strong preferences | Soft, note if violated | "Should prefer const" |
| **Should Not** | Discouraged patterns | Soft, note if violated | "Should not use any" |
| **May** | Optional permissions | None | "May add helper functions" |

**2. Positive vs Negative Framing**

Research shows positive framing is more effective:

| Negative (Avoid) | Positive (Prefer) | Why Better |
|------------------|-------------------|------------|
| "Don't use var" | "Use const or let" | Clear direction |
| "Don't add comments" | "Write self-documenting code" | Positive goal |
| "Don't catch generic errors" | "Catch specific error types" | Actionable |

**Exception:** Hard security boundaries benefit from negative framing: "NEVER expose API keys"

**3. Constraint Categories**

| Category | Examples |
|----------|----------|
| **Style** | Naming conventions, formatting |
| **Technical** | Language features, APIs to use |
| **Security** | Input validation, data handling |
| **Performance** | Complexity limits, resource usage |
| **Compatibility** | Browser support, Node version |
| **Behavioral** | Error handling, logging |

#### Complete ConstraintSection Interface

```typescript
interface ConstraintSection {
  type: 'constraint';

  // Constraint classification
  category: 'style' | 'technical' | 'security' | 'performance' | 'compatibility' | 'behavioral';
  subtype: 'must' | 'must_not' | 'should' | 'should_not' | 'may';

  // The constraint itself
  rule: {
    statement: string;               // The constraint text
    positive_framing?: string;       // Positive version if originally negative
    examples?: string[];             // Examples of compliance
    counter_examples?: string[];     // Examples of violation
  };

  // Priority and enforcement
  priority: 'critical' | 'high' | 'medium' | 'low';
  enforcement: 'hard' | 'soft';

  // Rationale (helps LLM understand importance)
  rationale?: {
    why: string;                     // "Prevents SQL injection"
    consequence?: string;            // "Could lead to data breach"
    reference?: string;              // Link to documentation
  };

  // Scope limitation
  scope?: {
    applies_to: string[];            // "all functions", "public APIs"
    exceptions?: string[];           // "except in tests"
    conditions?: string[];           // "when handling user input"
  };

  // Conflict resolution
  conflicts_with?: string[];         // IDs of potentially conflicting constraints
  precedence?: number;               // Higher wins in conflicts

  // Validation
  validation?: {
    automated?: boolean;             // Can be checked automatically
    check_command?: string;          // Command to verify
    pattern?: RegExp;                // Pattern to match/avoid
  };
}
```

---

### Modular and Reusable Prompt Composition

#### Composition Patterns

**Pattern 1: Prompt Builder with Fluent API**

```typescript
class PromptBuilder {
  private sections: Map<string, Section> = new Map();

  role(config: RoleConfig): this {
    this.sections.set('role', new RoleSection(config));
    return this;
  }

  context(...contexts: ContextConfig[]): this {
    this.sections.set('context', contexts.map(c => new ContextSection(c)));
    return this;
  }

  task(config: TaskConfig): this {
    this.sections.set('task', new TaskSection(config));
    return this;
  }

  constrain(...constraints: ConstraintConfig[]): this {
    this.sections.set('constraints', constraints.map(c => new ConstraintSection(c)));
    return this;
  }

  examples(...examples: ExampleConfig[]): this {
    this.sections.set('examples', examples.map(e => new ExampleSection(e)));
    return this;
  }

  outputFormat(config: OutputConfig): this {
    this.sections.set('output', new OutputSection(config));
    return this;
  }

  // Composition from existing prompts
  extend(base: PromptBuilder): this {
    for (const [key, section] of base.sections) {
      if (!this.sections.has(key)) {
        this.sections.set(key, section);
      }
    }
    return this;
  }

  // Override specific sections
  override(key: string, section: Section): this {
    this.sections.set(key, section);
    return this;
  }

  build(): Prompt {
    return new Prompt(this.sections);
  }
}

// Usage
const codeReviewPrompt = new PromptBuilder()
  .role({ persona: "senior developer", expertise: ["TypeScript", "security"] })
  .context({ subtype: "code", content: { file: { path: "./src/auth.ts" } } })
  .task({ action: "Review", target: "authentication logic" })
  .constrain(
    { rule: "Focus on security vulnerabilities", priority: "high" },
    { rule: "Note any type safety issues", priority: "medium" }
  )
  .outputFormat({ type: "json", schema: CodeReviewSchema })
  .build();
```

**Pattern 2: Template Inheritance**

```typescript
// Base template for all code tasks
abstract class CodeTaskTemplate extends PromptTemplate {
  constructor() {
    super();
    this.role({ persona: "software developer" });
    this.constrain({ rule: "Write idiomatic code" });
  }
}

// Specialized template for code review
class CodeReviewTemplate extends CodeTaskTemplate {
  constructor() {
    super();
    this.role({
      persona: "senior code reviewer",
      perspective: "as a thorough reviewer"
    });
    this.outputFormat({
      type: "structured",
      schema: CodeReviewOutputSchema
    });
  }

  forSecurityReview(): this {
    this.constrain({
      rule: "Prioritize security vulnerabilities",
      category: "security"
    });
    return this;
  }

  forPerformanceReview(): this {
    this.constrain({
      rule: "Focus on performance bottlenecks",
      category: "performance"
    });
    return this;
  }
}

// Usage
const securityReview = new CodeReviewTemplate()
  .forSecurityReview()
  .context({ subtype: "code", content: sourceCode })
  .task({ action: "Review", target: "the authentication module" })
  .build();
```

**Pattern 3: Section Libraries (Reusable Components)**

```typescript
// Reusable role definitions
const Roles = {
  seniorTypeScriptDev: new RoleSection({
    persona: "senior TypeScript developer",
    expertise: { domains: ["TypeScript", "Node.js", "React"] },
    experience: { level: "senior", years: 10 }
  }),

  securityExpert: new RoleSection({
    persona: "application security expert",
    expertise: {
      domains: ["security"],
      specializations: ["OWASP Top 10", "secure coding"]
    }
  }),

  codeReviewer: new RoleSection({
    persona: "senior software engineer",
    perspective: { role: "as a code reviewer" }
  })
};

// Reusable constraint sets
const ConstraintSets = {
  typescript: [
    { rule: "Use TypeScript strict mode", category: "technical" },
    { rule: "Prefer explicit types over inference for public APIs", category: "style" },
    { rule: "Use unknown instead of any", category: "technical" }
  ],

  security: [
    { rule: "Validate all user inputs", category: "security", priority: "critical" },
    { rule: "Use parameterized queries", category: "security", priority: "critical" },
    { rule: "Sanitize output to prevent XSS", category: "security", priority: "high" }
  ],

  performance: [
    { rule: "Avoid N+1 queries", category: "performance" },
    { rule: "Use lazy loading for large datasets", category: "performance" },
    { rule: "Cache expensive computations", category: "performance" }
  ]
};

// Reusable output formats
const OutputFormats = {
  codeReview: new OutputSection({
    format: { type: "json" },
    schema: { json_schema: CodeReviewSchema },
    validation: { must_match_schema: true }
  }),

  explanation: new OutputSection({
    format: { type: "markdown" },
    structure: {
      sections: [
        { name: "Summary", required: true },
        { name: "Details", required: true },
        { name: "Examples", required: false }
      ]
    }
  }),

  codeGeneration: new OutputSection({
    format: { type: "code" },
    code: {
      language: "typescript",
      include_types: true,
      runnable: true
    }
  })
};

// Compose from library
const prompt = new PromptBuilder()
  .use(Roles.securityExpert)
  .useConstraints(ConstraintSets.security)
  .useOutput(OutputFormats.codeReview)
  .context({ subtype: "code", content: fileContent })
  .task({ action: "Review", target: "the API endpoints" })
  .build();
```

**Pattern 4: Prompt Pipelines (Chaining)**

```typescript
class PromptPipeline {
  private steps: PipelineStep[] = [];

  add(prompt: Prompt, config?: StepConfig): this {
    this.steps.push({ prompt, config });
    return this;
  }

  // Output of step N becomes context for step N+1
  chain(): this {
    for (let i = 1; i < this.steps.length; i++) {
      this.steps[i].prompt.addContext({
        subtype: "history",
        content: { computed: () => this.steps[i-1].output }
      });
    }
    return this;
  }

  // Run steps in parallel and aggregate
  parallel(aggregator: Aggregator): this {
    // Implementation
    return this;
  }

  build(): ExecutablePipeline {
    return new ExecutablePipeline(this.steps);
  }
}

// Usage: Sequential pipeline
const reviewPipeline = new PromptPipeline()
  .add(analyzeCodePrompt)           // Step 1: Analyze structure
  .add(securityReviewPrompt)        // Step 2: Security review
  .add(recommendationsPrompt)       // Step 3: Generate recommendations
  .chain()                          // Each step sees previous output
  .build();

// Usage: Parallel pipeline with aggregation
const comprehensiveReview = new PromptPipeline()
  .add(securityReviewPrompt)
  .add(performanceReviewPrompt)
  .add(styleReviewPrompt)
  .parallel(AggregationStrategies.mergeIssues)
  .build();
```

**Pattern 5: Dynamic Prompt Assembly**

```typescript
class DynamicPromptFactory {
  createForTask(task: TaskType, context: DynamicContext): Prompt {
    const builder = new PromptBuilder();

    // Select role based on task
    builder.use(this.selectRole(task));

    // Add relevant context
    for (const ctx of context.relevantFiles) {
      builder.context({
        subtype: "code",
        content: { file: { path: ctx.path } },
        priority: ctx.relevance > 0.8 ? "high" : "medium"
      });
    }

    // Select constraints based on project config
    if (context.projectConfig.strict_typescript) {
      builder.useConstraints(ConstraintSets.typescript);
    }
    if (context.projectConfig.security_focused) {
      builder.useConstraints(ConstraintSets.security);
    }

    // Select examples based on similarity
    const examples = this.exampleSelector.select(
      task,
      context,
      { count: 3, diversity: 0.3 }
    );
    builder.examples(...examples);

    // Set output format based on integration
    builder.useOutput(
      context.outputIntegration === 'api'
        ? OutputFormats.json
        : OutputFormats.markdown
    );

    return builder.build();
  }

  private selectRole(task: TaskType): RoleSection {
    const roleMap: Record<TaskType, RoleSection> = {
      'code-review': Roles.codeReviewer,
      'security-audit': Roles.securityExpert,
      'code-generation': Roles.seniorTypeScriptDev,
      // ...
    };
    return roleMap[task];
  }
}
```

---

### Summary: Class Variable Reference

#### Quick Reference Table

| Section | Required Variables | Optional Variables |
|---------|-------------------|-------------------|
| **Role** | `persona` | `expertise`, `experience`, `perspective`, `style`, `traits` |
| **Context** | `subtype`, `content`, `priority` | `metadata`, `compression`, `relevance`, `format`, `retrieval`, `condition` |
| **Task** | `instruction.action`, `instruction.target` | `scope`, `decomposition`, `success_criteria`, `limits`, `reasoning`, `error_handling` |
| **Constraints** | `rule.statement`, `category`, `subtype`, `priority`, `enforcement` | `rationale`, `scope`, `conflicts_with`, `validation` |
| **Examples** | `input`, `output` | `reasoning`, `metadata`, `quality`, `selection`, `format` |
| **Output** | `format.type` | `schema`, `structure`, `length`, `quality`, `code`, `markdown`, `wrapper`, `validation` |

---

### Sources

- [PromptHub: Role-Prompting](https://www.prompthub.us/blog/role-prompting-does-adding-personas-to-your-prompts-really-make-a-difference)
- [Emergent Mind: Expert Persona Prompting](https://www.emergentmind.com/topics/expert-persona-prompting)
- [Pydantic: LLM Intro](https://pydantic.dev/articles/llm-intro)
- [arXiv: Systematic Survey of Prompt Engineering (2402.07927)](https://arxiv.org/abs/2402.07927)
- [MIT Sloan: Prompt Templates](https://mitsloan.mit.edu/ideas-made-to-matter/prompt-engineering-so-2024-try-these-prompt-templates-instead)
- [Vanderbilt: Prompt Pattern Catalog](https://www.dre.vanderbilt.edu/~schmidt/PDF/prompt-patterns.pdf)
- [Microsoft Research: LLMLingua](https://www.microsoft.com/en-us/research/blog/llmlingua-innovating-llm-efficiency-with-prompt-compression/)
- [Lakera: Prompt Engineering Guide](https://www.lakera.ai/blog/prompt-engineering-guide)
- [PromptLayer: Prompt Decomposition](https://www.promptlayer.com/glossary/prompt-decomposition)
- [The New Stack: Context Engineering](https://thenewstack.io/context-engineering-going-beyond-prompt-engineering-and-rag/)
- [OpenAI: Structured Outputs](https://community.openai.com/t/structured-output-precision-accuracy-pydantic-vs-a-schema/1054410)

---

## LLM-Specific Configuration

Different LLMs have significantly different optimal prompting strategies. Research from [CodeSignal](https://codesignal.com/learn/courses/prompting-foundations/lessons/model-specific-formatting-adapting-prompts-for-different-llms), [DataUnboxed](https://www.dataunboxed.io/blog/prompt-engineering-best-practices-complete-comparison-matrix), and [MediaTech Group](https://mediatech.group/prompt-engineering/llm-provider-prompt-comparison-openai-vs-anthropic-vs-google-guide/) reveals these differences are significant enough to warrant model-specific configuration.

### Model-Specific Format Preferences

| Model | Preferred Format | Special Tokens/Patterns | Long Context Placement |
|-------|------------------|------------------------|------------------------|
| **Claude (Anthropic)** | XML tags (`<section>`) | `\n\nHuman:` / `\n\nAssistant:`, `<example></example>` | Documents at top |
| **GPT (OpenAI)** | Markdown, `###` delimiters | ChatCompletion messages (system/user/assistant) | Instructions at top AND below documents |
| **Gemini (Google)** | Structured templates (~21 words optimal) | Built-in CoT ("thinking model") | Experiment with both positions |
| **Llama/Mistral (Meta)** | `### Instruction` / `### Response` | Similar to Llama template format | Varies by fine-tune |

### Why Model-Specific Configuration Matters

> "When Claude 3.5 hit the scene, Anthropic used XML in their system prompt. Claude was trained with a lot of XML in its training data and so it's sort of seen more of that than it's seen of other formats, so it just works a little bit better."
> — Zack Witten, Anthropic Engineer, via [Algorithm Unmasked](https://algorithmunmasked.com/2025/05/14/mastering-claude-prompts-xml-vs-markdown-formatting-for-optimal-results/)

> "GPT-4.1 follows instructions with surgical precision. It uses hierarchical instruction processing, where GPT-4.1 resolves conflicting instructions by prioritizing those closer to the end of the prompt."
> — [DataUnboxed](https://www.dataunboxed.io/blog/prompt-engineering-best-practices-complete-comparison-matrix)

> "Google's research shows prompts averaging 21 words with relevant context significantly outperform both shorter and longer variants."
> — [PromptLayer: Google Prompt Engineering Paper](https://blog.promptlayer.com/learnings-from-the-google-prompt-engineering-paper-and-others/)

### Complete ModelConfig Interface

```typescript
interface ModelConfig {
  // Model identification
  provider: 'anthropic' | 'openai' | 'google' | 'meta' | 'mistral' | 'cohere' | 'custom';
  model_id: string;                    // "claude-sonnet-4-20250514", "gpt-4.1"
  model_family?: string;               // "claude-4", "gpt-4", "gemini-2"

  // Format preferences
  format: {
    section_delimiter: 'xml' | 'markdown' | 'triple_hash' | 'custom';
    custom_delimiter?: string;
    code_fence_style: 'backticks' | 'indentation';
    supports_nested_xml: boolean;      // Claude: true, GPT: partial
  };

  // Special tokens (model-specific)
  tokens?: {
    human_prefix?: string;             // Claude: "\n\nHuman:"
    assistant_prefix?: string;         // Claude: "\n\nAssistant:"
    example_tags?: [string, string];   // Claude: ["<example>", "</example>"]
    instruction_delimiter?: string;    // GPT: "###"
    system_token?: string;             // Some models use special system tokens
  };

  // Context handling strategy
  context_strategy: {
    long_document_position: 'top' | 'bottom' | 'split' | 'dynamic';
    instruction_position: 'top' | 'bottom' | 'both';
    max_context_tokens: number;
    supports_system_message: boolean;
    system_vs_user_preference: 'system' | 'user' | 'balanced';
  };

  // Model capabilities
  capabilities: {
    structured_output: boolean;        // OpenAI: strict mode, Claude: partial
    json_mode: boolean;                // Guaranteed valid JSON
    thinking_mode: boolean;            // Gemini 2.5, Claude extended thinking
    tool_use: boolean;
    vision: boolean;
    max_output_tokens: number;
    context_window: number;
  };

  // Instruction following characteristics
  instruction_style: {
    verbosity_preference: 'concise' | 'detailed' | 'flexible';
    responds_to_emphasis: boolean;     // ALL CAPS, **bold**
    follows_negative_instructions: 'well' | 'poorly' | 'avoid';
    conflict_resolution: 'first' | 'last' | 'most_specific';
  };

  // Rendering hints
  rendering: {
    suppress_preamble_supported: boolean;
    prefill_supported: boolean;        // Claude: can prefill assistant response
    json_schema_enforcement: 'strict' | 'best_effort' | 'none';
  };
}
```

### Pre-defined Model Configurations

```typescript
const ModelConfigs = {
  claude_4: {
    provider: 'anthropic',
    model_family: 'claude-4',
    format: {
      section_delimiter: 'xml',
      code_fence_style: 'backticks',
      supports_nested_xml: true
    },
    tokens: {
      human_prefix: '\n\nHuman:',
      assistant_prefix: '\n\nAssistant:',
      example_tags: ['<example>', '</example>']
    },
    context_strategy: {
      long_document_position: 'top',
      instruction_position: 'bottom',
      max_context_tokens: 200000,
      supports_system_message: true,
      system_vs_user_preference: 'user'  // Claude follows user instructions better
    },
    capabilities: {
      structured_output: true,
      json_mode: false,
      thinking_mode: true,
      tool_use: true,
      vision: true,
      max_output_tokens: 8192,
      context_window: 200000
    },
    instruction_style: {
      verbosity_preference: 'detailed',
      responds_to_emphasis: true,
      follows_negative_instructions: 'poorly',
      conflict_resolution: 'last'
    },
    rendering: {
      suppress_preamble_supported: true,
      prefill_supported: true,
      json_schema_enforcement: 'best_effort'
    }
  },

  gpt_4: {
    provider: 'openai',
    model_family: 'gpt-4',
    format: {
      section_delimiter: 'markdown',
      code_fence_style: 'backticks',
      supports_nested_xml: false
    },
    tokens: {
      instruction_delimiter: '###'
    },
    context_strategy: {
      long_document_position: 'split',  // Instructions above and below
      instruction_position: 'both',
      max_context_tokens: 128000,
      supports_system_message: true,
      system_vs_user_preference: 'system'
    },
    capabilities: {
      structured_output: true,
      json_mode: true,                   // Guaranteed valid JSON
      thinking_mode: false,
      tool_use: true,
      vision: true,
      max_output_tokens: 16384,
      context_window: 128000
    },
    instruction_style: {
      verbosity_preference: 'flexible',
      responds_to_emphasis: true,
      follows_negative_instructions: 'well',
      conflict_resolution: 'last'        // Recency bias
    },
    rendering: {
      suppress_preamble_supported: true,
      prefill_supported: false,
      json_schema_enforcement: 'strict'
    }
  },

  gemini_2: {
    provider: 'google',
    model_family: 'gemini-2',
    format: {
      section_delimiter: 'markdown',
      code_fence_style: 'backticks',
      supports_nested_xml: true
    },
    context_strategy: {
      long_document_position: 'dynamic',  // Experiment with position
      instruction_position: 'top',
      max_context_tokens: 1000000,        // 1M context window
      supports_system_message: true,
      system_vs_user_preference: 'balanced'
    },
    capabilities: {
      structured_output: true,
      json_mode: true,
      thinking_mode: true,               // Built-in CoT
      tool_use: true,
      vision: true,
      max_output_tokens: 8192,
      context_window: 1000000
    },
    instruction_style: {
      verbosity_preference: 'concise',   // ~21 words optimal
      responds_to_emphasis: true,
      follows_negative_instructions: 'well',
      conflict_resolution: 'most_specific'
    },
    rendering: {
      suppress_preamble_supported: true,
      prefill_supported: false,
      json_schema_enforcement: 'best_effort'
    }
  },

  llama_3: {
    provider: 'meta',
    model_family: 'llama-3',
    format: {
      section_delimiter: 'triple_hash',
      code_fence_style: 'backticks',
      supports_nested_xml: false
    },
    tokens: {
      instruction_delimiter: '### Instruction',
      // Llama uses specific template format
    },
    context_strategy: {
      long_document_position: 'top',
      instruction_position: 'top',
      max_context_tokens: 128000,
      supports_system_message: true,
      system_vs_user_preference: 'system'
    },
    capabilities: {
      structured_output: false,
      json_mode: false,
      thinking_mode: false,
      tool_use: true,
      vision: true,
      max_output_tokens: 4096,
      context_window: 128000
    },
    instruction_style: {
      verbosity_preference: 'detailed',
      responds_to_emphasis: false,
      follows_negative_instructions: 'poorly',
      conflict_resolution: 'first'
    },
    rendering: {
      suppress_preamble_supported: false,
      prefill_supported: false,
      json_schema_enforcement: 'none'
    }
  }
};
```

### Model-Aware Rendering

```typescript
class ModelAwareRenderer {
  constructor(private config: ModelConfig) {}

  renderSection(section: Section): string {
    switch (this.config.format.section_delimiter) {
      case 'xml':
        return `<${section.type}>\n${section.content}\n</${section.type}>`;
      case 'markdown':
        return `## ${section.type.toUpperCase()}\n\n${section.content}`;
      case 'triple_hash':
        return `### ${section.type}\n${section.content}`;
      default:
        return section.content;
    }
  }

  orderSections(sections: Section[]): Section[] {
    const { long_document_position, instruction_position } = this.config.context_strategy;

    // Reorder based on model preferences
    // Claude: documents first, instructions last
    // GPT: instructions at top AND bottom
    // ...
  }

  wrapExamples(examples: ExampleSection[]): string {
    const tags = this.config.tokens?.example_tags;
    if (tags) {
      return examples.map(e => `${tags[0]}\n${this.renderExample(e)}\n${tags[1]}`).join('\n\n');
    }
    return examples.map(e => this.renderExample(e)).join('\n\n');
  }
}
```

---

## Environment and Platform Context

To be useful across all programming languages, environments, operating systems, cloud providers, and build systems, prompts need environmental awareness. Research from [AWS Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-engineering-guidelines.html) and [LangChain](https://www.comet.com/site/blog/introduction-to-prompt-templates-in-langchain/) shows that context-aware prompts significantly outperform generic ones.

### Why Environment Context Matters

Different environments require fundamentally different patterns:

| Aspect | TypeScript/Node | Python | Rust | Go |
|--------|-----------------|--------|------|-----|
| **Error handling** | try/catch, async/await | try/except | Result<T, E>, ? operator | error as return value |
| **Type system** | Static (gradual) | Dynamic (gradual with hints) | Static, strict | Static |
| **Package manager** | npm/pnpm/yarn | pip/poetry/conda | cargo | go modules |
| **Testing** | vitest/jest | pytest | cargo test | go test |
| **Async model** | Promises, async/await | asyncio, await | async/await, tokio | goroutines, channels |

### Complete EnvironmentContext Interface

```typescript
interface EnvironmentContext {
  // Programming language
  language: {
    name: string;                      // "typescript", "python", "rust", "go"
    version?: string;                  // "5.0", "3.12", "1.75"
    dialect?: string;                  // "node", "deno", "bun" for JS; "cpython", "pypy" for Python
    type_system: 'static' | 'dynamic' | 'gradual';
    paradigms: ('oop' | 'functional' | 'procedural' | 'reactive')[];
    key_features?: string[];           // ["generics", "traits", "async/await"]
  };

  // Runtime environment
  runtime: {
    type: 'browser' | 'server' | 'edge' | 'embedded' | 'desktop' | 'mobile' | 'cli';
    platform?: string;                 // "node", "deno", "browser", "electron", "tauri"
    version?: string;
    constraints?: string[];            // ["no-filesystem", "memory-limited"]
  };

  // Operating system
  os: {
    type: 'linux' | 'macos' | 'windows' | 'bsd' | 'wasm' | 'unknown';
    distribution?: string;             // "ubuntu", "alpine", "debian"
    version?: string;
    shell?: 'bash' | 'zsh' | 'fish' | 'powershell' | 'cmd';
    path_separator?: '/' | '\\';
  };

  // Cloud provider context
  cloud?: {
    provider: 'aws' | 'azure' | 'gcp' | 'vercel' | 'cloudflare' | 'digitalocean' | 'self-hosted';
    services?: string[];               // ["lambda", "s3", "dynamodb"]
    region?: string;
    deployment_type: 'serverless' | 'container' | 'vm' | 'kubernetes' | 'bare_metal';
    iac_tool?: string;                 // "terraform", "pulumi", "cdk", "cloudformation"
  };

  // Build system
  build: {
    tool: string;                      // "vite", "webpack", "esbuild", "cargo", "gradle"
    package_manager: string;           // "npm", "pnpm", "yarn", "pip", "cargo", "maven"
    package_manager_version?: string;
    monorepo?: boolean;
    monorepo_tool?: string;            // "turborepo", "nx", "lerna", "pnpm workspaces"
    bundler?: string;                  // "rollup", "esbuild", "swc"
  };

  // Framework context
  framework?: {
    name: string;                      // "react", "nextjs", "django", "actix", "gin"
    version?: string;
    type: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop';
    meta_framework?: string;           // "nextjs" for react, "nuxt" for vue
    state_management?: string;         // "redux", "zustand", "pinia"
    styling?: string;                  // "tailwind", "styled-components", "css-modules"
  };

  // Testing configuration
  testing: {
    unit_framework: string;            // "vitest", "jest", "pytest", "cargo test", "go test"
    integration_framework?: string;
    e2e_framework?: string;            // "playwright", "cypress", "selenium"
    coverage_tool?: string;            // "c8", "istanbul", "coverage.py"
    mocking_library?: string;          // "vitest", "jest", "unittest.mock", "mockall"
  };

  // Database context
  database?: {
    type: 'sql' | 'nosql' | 'graph' | 'vector' | 'kv' | 'time-series';
    engine: string;                    // "postgres", "mysql", "mongodb", "redis", "neo4j"
    version?: string;
    orm?: string;                      // "prisma", "drizzle", "sqlalchemy", "diesel"
    migration_tool?: string;           // "prisma migrate", "alembic", "diesel migrations"
  };

  // API context
  api?: {
    style: 'rest' | 'graphql' | 'grpc' | 'trpc' | 'websocket';
    framework?: string;                // "express", "fastapi", "actix-web", "gin"
    documentation?: string;            // "openapi", "graphql-schema"
    authentication?: string;           // "jwt", "oauth2", "api-key", "session"
  };

  // CI/CD context
  ci?: {
    platform: string;                  // "github-actions", "gitlab-ci", "jenkins", "circle-ci"
    container_registry?: string;       // "docker-hub", "ghcr", "ecr"
    deployment_target?: string;        // "kubernetes", "ecs", "lambda"
  };

  // Code style and conventions
  style: {
    linter: string;                    // "eslint", "ruff", "clippy", "golangci-lint"
    formatter: string;                 // "prettier", "black", "rustfmt", "gofmt"
    style_guide?: string;              // "airbnb", "google", "standard"
    naming_convention?: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case';
  };
}
```

### Pre-defined Environment Presets

```typescript
const EnvironmentPresets = {
  typescript_node: {
    language: {
      name: "typescript",
      type_system: "static",
      paradigms: ["oop", "functional"]
    },
    runtime: { type: "server", platform: "node" },
    build: { tool: "vite", package_manager: "pnpm" },
    testing: { unit_framework: "vitest", e2e_framework: "playwright" },
    style: { linter: "eslint", formatter: "prettier" }
  },

  python_fastapi: {
    language: {
      name: "python",
      type_system: "gradual",
      paradigms: ["oop", "functional"]
    },
    runtime: { type: "server", platform: "cpython" },
    build: { tool: "pip", package_manager: "poetry" },
    framework: { name: "fastapi", type: "backend" },
    testing: { unit_framework: "pytest", coverage_tool: "coverage.py" },
    style: { linter: "ruff", formatter: "black" }
  },

  rust_actix: {
    language: {
      name: "rust",
      type_system: "static",
      paradigms: ["functional", "oop"]
    },
    runtime: { type: "server" },
    build: { tool: "cargo", package_manager: "cargo" },
    framework: { name: "actix-web", type: "backend" },
    testing: { unit_framework: "cargo test" },
    style: { linter: "clippy", formatter: "rustfmt" }
  },

  react_nextjs: {
    language: {
      name: "typescript",
      type_system: "static",
      paradigms: ["functional", "reactive"]
    },
    runtime: { type: "browser", platform: "browser" },
    build: { tool: "next", package_manager: "pnpm" },
    framework: {
      name: "react",
      type: "fullstack",
      meta_framework: "nextjs",
      styling: "tailwind"
    },
    testing: { unit_framework: "vitest", e2e_framework: "playwright" },
    style: { linter: "eslint", formatter: "prettier" }
  }
};
```

### Environment-Aware Code Generation

```typescript
class EnvironmentAwareGenerator {
  constructor(private env: EnvironmentContext) {}

  getErrorHandlingPattern(): string {
    switch (this.env.language.name) {
      case 'typescript':
        return 'Use try/catch with typed errors. For async code, use async/await with try/catch.';
      case 'python':
        return 'Use try/except with specific exception types. Avoid bare except clauses.';
      case 'rust':
        return 'Use Result<T, E> and the ? operator for propagation. Define custom error types.';
      case 'go':
        return 'Return error as the last return value. Check err != nil immediately after calls.';
      default:
        return 'Handle errors appropriately for your language.';
    }
  }

  getTestingPattern(): string {
    const { unit_framework } = this.env.testing;
    const patterns: Record<string, string> = {
      'vitest': 'Use describe/it blocks with expect().toBe() assertions',
      'jest': 'Use describe/it blocks with expect().toBe() assertions',
      'pytest': 'Use def test_* functions with assert statements',
      'cargo test': 'Use #[test] attribute with assert! and assert_eq! macros',
      'go test': 'Use func Test* with t.Error() and t.Fatal()'
    };
    return patterns[unit_framework] || 'Write tests following your framework conventions.';
  }

  getImportStyle(): string {
    switch (this.env.language.name) {
      case 'typescript':
        return 'import { x } from "module"';
      case 'python':
        return 'from module import x';
      case 'rust':
        return 'use module::x;';
      case 'go':
        return 'import "module"';
      default:
        return '';
    }
  }

  getAsyncPattern(): string {
    switch (this.env.language.name) {
      case 'typescript':
        return 'async/await with Promise';
      case 'python':
        return 'async/await with asyncio';
      case 'rust':
        return 'async/await with tokio runtime';
      case 'go':
        return 'goroutines with channels';
      default:
        return '';
    }
  }
}
```

### Injecting Environment Context into Prompts

```typescript
function buildEnvironmentContextSection(env: EnvironmentContext): ContextSection {
  return {
    type: 'context',
    subtype: 'environment',
    content: {
      inline: `
## Development Environment

**Language**: ${env.language.name} ${env.language.version || ''}
**Type System**: ${env.language.type_system}
**Runtime**: ${env.runtime.platform || env.runtime.type}
**Package Manager**: ${env.build.package_manager}
**Build Tool**: ${env.build.tool}
**Test Framework**: ${env.testing.unit_framework}
**Linter**: ${env.style.linter}
**Formatter**: ${env.style.formatter}
${env.framework ? `**Framework**: ${env.framework.name} ${env.framework.version || ''}` : ''}
${env.database ? `**Database**: ${env.database.engine} (ORM: ${env.database.orm || 'none'})` : ''}
${env.cloud ? `**Cloud**: ${env.cloud.provider} (${env.cloud.deployment_type})` : ''}
`
    },
    priority: 'high'
  };
}
```

---

## Abstraction Hierarchy and Composition Patterns

Research from [DSPy](https://dspy.ai/learn/programming/signatures/), [Prompt-Layered Architecture](https://ijsrm.net/index.php/ijsrm/article/view/5670/3951), and [MIT Sloan](https://mitsloan.mit.edu/ideas-made-to-matter/prompt-engineering-so-2024-try-these-prompt-templates-instead) identifies multiple levels of abstraction for prompt composition.

### The Abstraction Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│  Level 5: Signatures (DSPy-style)                                   │
│  "question -> answer"                                               │
│  Input/output only, prompt auto-generated                           │
├─────────────────────────────────────────────────────────────────────┤
│  Level 4: Prompt Groups / Pipelines                                 │
│  Multiple prompts orchestrated together                             │
│  Sequential, parallel, conditional execution                        │
├─────────────────────────────────────────────────────────────────────┤
│  Level 3: Prompt Templates                                          │
│  Complete prompts for common tasks                                  │
│  CodeReviewPrompt, SecurityAuditPrompt, etc.                       │
├─────────────────────────────────────────────────────────────────────┤
│  Level 2: Section Presets                                           │
│  Pre-composed sections (RolePresets, ConstraintSets)               │
│  Reusable across multiple templates                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Level 1: Section Fragments                                         │
│  Atomic values (Expertise.typescript, Constraints.no_any)          │
│  Smallest reusable units                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Level 1: Section Fragments (Atomic Components)

The smallest reusable units—individual values that can be mixed into sections:

```typescript
// Expertise fragments - atomic domain knowledge identifiers
const Expertise = {
  // Languages
  typescript: ["TypeScript", "type systems", "generics", "decorators"],
  python: ["Python", "asyncio", "type hints", "dataclasses"],
  rust: ["Rust", "ownership", "lifetimes", "traits", "async"],
  go: ["Go", "goroutines", "channels", "interfaces"],

  // Domains
  security: ["OWASP Top 10", "secure coding", "threat modeling", "cryptography"],
  performance: ["profiling", "optimization", "caching", "algorithms"],
  testing: ["TDD", "unit testing", "integration testing", "mocking"],
  architecture: ["design patterns", "SOLID", "DDD", "microservices"],

  // Frameworks
  react: ["React", "hooks", "component patterns", "state management"],
  node: ["Node.js", "Express", "async I/O", "streams"],
  databases: ["SQL", "query optimization", "indexing", "transactions"]
};

// Constraint fragments - atomic rules
const ConstraintFragments = {
  // Type safety
  no_any: {
    rule: { statement: "Use 'unknown' instead of 'any'" },
    category: "technical",
    subtype: "must_not",
    priority: "high",
    enforcement: "hard"
  },
  explicit_types: {
    rule: { statement: "Use explicit return types for public functions" },
    category: "style",
    subtype: "should",
    priority: "medium",
    enforcement: "soft"
  },

  // Security
  validate_inputs: {
    rule: { statement: "Validate all external inputs at system boundaries" },
    category: "security",
    subtype: "must",
    priority: "critical",
    enforcement: "hard"
  },
  no_secrets_in_code: {
    rule: { statement: "NEVER hardcode secrets, API keys, or credentials" },
    category: "security",
    subtype: "must_not",
    priority: "critical",
    enforcement: "hard"
  },
  parameterized_queries: {
    rule: { statement: "Use parameterized queries for all database operations" },
    category: "security",
    subtype: "must",
    priority: "critical",
    enforcement: "hard"
  },

  // Code quality
  single_responsibility: {
    rule: { statement: "Functions should do one thing well" },
    category: "style",
    subtype: "should",
    priority: "medium",
    enforcement: "soft"
  },
  pure_functions: {
    rule: { statement: "Prefer pure functions without side effects" },
    category: "style",
    subtype: "should",
    priority: "medium",
    enforcement: "soft"
  },
  meaningful_names: {
    rule: { statement: "Use descriptive, meaningful variable and function names" },
    category: "style",
    subtype: "must",
    priority: "high",
    enforcement: "soft"
  }
};

// Output format fragments
const OutputFragments = {
  json_strict: {
    format: { type: "json" as const },
    validation: { must_match_schema: true, retry_on_failure: true }
  },
  markdown_structured: {
    format: { type: "markdown" as const },
    structure: { ordering: "fixed" as const }
  },
  code_runnable: {
    format: { type: "code" as const },
    code: { runnable: true, include_types: true, include_imports: true }
  },
  code_snippet: {
    format: { type: "code" as const },
    code: { runnable: false, include_types: true }
  }
};
```

### Level 2: Section Presets (Composed Sections)

Pre-built sections combining multiple fragments:

```typescript
// Role presets - complete role configurations
const RolePresets = {
  seniorTypeScriptDev: {
    type: 'role' as const,
    persona: "senior software engineer",
    expertise: {
      domains: [...Expertise.typescript, ...Expertise.node],
      specializations: ["full-stack development", "API design"]
    },
    experience: { level: "senior" as const, years: 10 },
    traits: {
      priorities: ["type safety", "maintainability", "testability"],
      preferences: ["functional patterns", "immutability"]
    }
  },

  securityAuditor: {
    type: 'role' as const,
    persona: "application security specialist",
    expertise: {
      domains: Expertise.security,
      specializations: ["penetration testing", "code review", "threat modeling"]
    },
    perspective: {
      role: "as a security auditor",
      goal: "identifying vulnerabilities before attackers do"
    },
    traits: {
      priorities: ["security", "data protection", "compliance"],
      personality: ["thorough", "skeptical", "systematic"]
    }
  },

  codeReviewer: {
    type: 'role' as const,
    persona: "senior developer",
    perspective: {
      role: "as a thorough code reviewer",
      audience_relationship: "helping a colleague improve their code"
    },
    style: {
      tone: "constructive" as const,
      verbosity: "detailed" as const,
      approach: "collaborative"
    },
    traits: {
      priorities: ["correctness", "maintainability", "readability", "performance"]
    }
  },

  technicalWriter: {
    type: 'role' as const,
    persona: "technical documentation specialist",
    expertise: {
      domains: ["technical writing", "API documentation", "developer experience"]
    },
    style: {
      tone: "professional" as const,
      verbosity: "concise" as const
    },
    traits: {
      priorities: ["clarity", "accuracy", "completeness"]
    }
  },

  debuggingExpert: {
    type: 'role' as const,
    persona: "senior debugging specialist",
    expertise: {
      domains: ["debugging", "profiling", "root cause analysis"]
    },
    perspective: {
      role: "as a systematic debugger",
      goal: "finding the root cause, not just symptoms"
    },
    traits: {
      personality: ["methodical", "patient", "thorough"]
    }
  }
};

// Constraint sets - grouped constraints for specific purposes
const ConstraintSets = {
  typescript_strict: [
    ConstraintFragments.no_any,
    ConstraintFragments.explicit_types,
    {
      rule: { statement: "Enable strict mode in tsconfig" },
      category: "technical",
      subtype: "must",
      priority: "high",
      enforcement: "hard"
    },
    {
      rule: { statement: "Use readonly for immutable data" },
      category: "style",
      subtype: "should",
      priority: "medium",
      enforcement: "soft"
    }
  ],

  security_comprehensive: [
    ConstraintFragments.validate_inputs,
    ConstraintFragments.no_secrets_in_code,
    ConstraintFragments.parameterized_queries,
    {
      rule: { statement: "Sanitize all output to prevent XSS" },
      category: "security",
      subtype: "must",
      priority: "critical",
      enforcement: "hard"
    },
    {
      rule: { statement: "Use HTTPS for all external communications" },
      category: "security",
      subtype: "must",
      priority: "high",
      enforcement: "hard"
    },
    {
      rule: { statement: "Implement rate limiting on public endpoints" },
      category: "security",
      subtype: "should",
      priority: "high",
      enforcement: "soft"
    }
  ],

  clean_code: [
    ConstraintFragments.single_responsibility,
    ConstraintFragments.pure_functions,
    ConstraintFragments.meaningful_names,
    {
      rule: { statement: "Keep functions under 20 lines" },
      category: "style",
      subtype: "should",
      priority: "medium",
      enforcement: "soft"
    },
    {
      rule: { statement: "Maximum 3 parameters per function" },
      category: "style",
      subtype: "should",
      priority: "low",
      enforcement: "soft"
    }
  ],

  performance_focused: [
    {
      rule: { statement: "Avoid N+1 query patterns" },
      category: "performance",
      subtype: "must_not",
      priority: "high",
      enforcement: "hard"
    },
    {
      rule: { statement: "Use lazy loading for large datasets" },
      category: "performance",
      subtype: "should",
      priority: "medium",
      enforcement: "soft"
    },
    {
      rule: { statement: "Cache expensive computations" },
      category: "performance",
      subtype: "should",
      priority: "medium",
      enforcement: "soft"
    },
    {
      rule: { statement: "Profile before optimizing" },
      category: "performance",
      subtype: "should",
      priority: "high",
      enforcement: "soft"
    }
  ],

  testing_required: [
    {
      rule: { statement: "Include unit tests for all new functions" },
      category: "technical",
      subtype: "must",
      priority: "high",
      enforcement: "hard"
    },
    {
      rule: { statement: "Test edge cases and error conditions" },
      category: "technical",
      subtype: "must",
      priority: "high",
      enforcement: "hard"
    },
    {
      rule: { statement: "Use descriptive test names" },
      category: "style",
      subtype: "should",
      priority: "medium",
      enforcement: "soft"
    }
  ]
};

// Output presets - complete output configurations
const OutputPresets = {
  code_review_json: {
    type: 'output' as const,
    format: { type: "json" as const },
    schema: {
      json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                location: { type: "string" },
                severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                category: { type: "string" },
                issue: { type: "string" },
                suggestion: { type: "string" }
              },
              required: ["location", "severity", "issue", "suggestion"]
            }
          },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["summary", "issues"]
      }
    },
    validation: { must_match_schema: true, retry_on_failure: true, max_retries: 2 }
  },

  implementation_typescript: {
    type: 'output' as const,
    format: { type: "code" as const },
    code: {
      language: "typescript",
      include_types: true,
      include_imports: true,
      runnable: true,
      style_guide: "prettier"
    },
    wrapper: { suppress_preamble: true, suppress_postamble: true }
  },

  explanation_markdown: {
    type: 'output' as const,
    format: { type: "markdown" as const },
    structure: {
      sections: [
        { name: "Summary", required: true, format: "paragraph" },
        { name: "Details", required: true, format: "mixed" },
        { name: "Examples", required: false, format: "code-blocks" }
      ],
      ordering: "fixed" as const
    },
    markdown: { heading_level_start: 2, code_block_language: "typescript" }
  },

  test_code: {
    type: 'output' as const,
    format: { type: "code" as const },
    code: {
      language: "typescript",
      include_types: true,
      include_imports: true,
      runnable: true
    },
    quality: {
      completeness: "Cover happy path, edge cases, and error conditions"
    }
  }
};
```

### Level 3: Prompt Templates (Full Prompts)

Complete prompt structures for common tasks:

```typescript
interface PromptTemplate {
  name: string;
  description: string;
  role: RoleSection;
  constraints: ConstraintSection[];
  output: OutputSection;
  task: Partial<TaskSection>;  // target filled at runtime
  examples?: ExampleSection[];
  technique?: TechniqueConfig;
}

const PromptTemplates: Record<string, PromptTemplate> = {
  codeReview: {
    name: "code-review",
    description: "Review code for issues, bugs, and improvements",
    role: RolePresets.codeReviewer,
    constraints: [...ConstraintSets.clean_code],
    output: OutputPresets.code_review_json,
    task: {
      instruction: {
        action: "Review",
        verb_category: "analysis",
        purpose: "identify issues and suggest improvements"
      },
      success_criteria: {
        completion_conditions: ["All significant issues identified"],
        quality_standards: ["Actionable suggestions for each issue"]
      }
    }
  },

  securityAudit: {
    name: "security-audit",
    description: "Audit code for security vulnerabilities",
    role: RolePresets.securityAuditor,
    constraints: [...ConstraintSets.security_comprehensive],
    output: OutputPresets.code_review_json,
    task: {
      instruction: {
        action: "Audit",
        verb_category: "analysis",
        purpose: "identify security vulnerabilities"
      },
      scope: { depth: "exhaustive" as const },
      success_criteria: {
        completion_conditions: ["All OWASP Top 10 categories checked"],
        quality_standards: ["Severity ratings for all findings"]
      }
    }
  },

  implementation: {
    name: "implementation",
    description: "Implement a feature or function",
    role: RolePresets.seniorTypeScriptDev,
    constraints: [...ConstraintSets.typescript_strict, ...ConstraintSets.clean_code],
    output: OutputPresets.implementation_typescript,
    task: {
      instruction: {
        action: "Implement",
        verb_category: "generation"
      },
      success_criteria: {
        completion_conditions: ["Feature fully implemented"],
        quality_standards: ["Type-safe", "Well-documented"]
      }
    }
  },

  testGeneration: {
    name: "test-generation",
    description: "Generate comprehensive tests for code",
    role: {
      ...RolePresets.seniorTypeScriptDev,
      perspective: { role: "as a QA engineer" }
    },
    constraints: [...ConstraintSets.testing_required],
    output: OutputPresets.test_code,
    task: {
      instruction: {
        action: "Generate tests",
        verb_category: "generation"
      },
      success_criteria: {
        completion_conditions: ["All public functions have tests"],
        quality_standards: ["Edge cases covered", "Error conditions tested"]
      }
    }
  },

  debugging: {
    name: "debugging",
    description: "Debug and fix an issue in code",
    role: RolePresets.debuggingExpert,
    constraints: [
      {
        type: 'constraint',
        rule: { statement: "Make minimal changes to fix the issue" },
        category: "style",
        subtype: "must",
        priority: "high",
        enforcement: "hard"
      }
    ],
    output: OutputPresets.explanation_markdown,
    task: {
      instruction: {
        action: "Debug",
        verb_category: "analysis"
      },
      decomposition: {
        strategy: "sequential" as const,
        steps: [
          { id: "1", order: 1, instruction: "Identify the root cause" },
          { id: "2", order: 2, instruction: "Explain why the bug occurs" },
          { id: "3", order: 3, instruction: "Provide a minimal fix" },
          { id: "4", order: 4, instruction: "Suggest prevention strategies" }
        ]
      }
    }
  },

  documentation: {
    name: "documentation",
    description: "Generate documentation for code",
    role: RolePresets.technicalWriter,
    constraints: [],
    output: OutputPresets.explanation_markdown,
    task: {
      instruction: {
        action: "Document",
        verb_category: "explanation"
      }
    }
  },

  refactoring: {
    name: "refactoring",
    description: "Refactor code to improve quality",
    role: {
      ...RolePresets.seniorTypeScriptDev,
      perspective: { role: "as a refactoring specialist" }
    },
    constraints: [
      ...ConstraintSets.clean_code,
      {
        type: 'constraint',
        rule: { statement: "Preserve all existing behavior" },
        category: "technical",
        subtype: "must",
        priority: "critical",
        enforcement: "hard"
      }
    ],
    output: OutputPresets.implementation_typescript,
    task: {
      instruction: {
        action: "Refactor",
        verb_category: "modification"
      }
    }
  }
};
```

### Level 4: Prompt Groups and Pipelines

Multiple prompts orchestrated together:

```typescript
interface PromptPipeline {
  name: string;
  description: string;
  steps: PipelineStep[];
  shared_context?: ContextSection[];
  shared_constraints?: ConstraintSection[];
  error_handling?: {
    on_step_failure: 'abort' | 'skip' | 'retry';
    max_retries?: number;
  };
}

interface PipelineStep {
  id: string;
  template: string | PromptTemplate;
  input_from?: string[];              // IDs of steps to take input from
  output_to?: string[];               // IDs of steps to send output to
  parallel_with?: string[];           // IDs of steps to run in parallel with
  condition?: string;                 // Condition to run this step
  transform?: (input: unknown) => unknown;  // Transform input before this step
}

interface PromptGroup {
  name: string;
  description: string;
  prompts: PromptGroupMember[];
  execution: 'sequential' | 'parallel' | 'conditional';
  aggregation?: AggregationConfig;
}

interface PromptGroupMember {
  template: string;
  weight?: number;                    // For weighted aggregation
  condition?: string;                 // Conditional inclusion
}

interface AggregationConfig {
  strategy: 'merge' | 'weighted_merge' | 'vote' | 'first_success' | 'custom';
  conflict_resolution?: 'highest_severity' | 'first' | 'last' | 'merge_all';
  deduplicate?: boolean;
  custom_aggregator?: (results: unknown[]) => unknown;
}

// Example pipelines
const Pipelines: Record<string, PromptPipeline> = {
  comprehensiveCodeReview: {
    name: "comprehensive-code-review",
    description: "Multi-aspect code review with aggregated results",
    steps: [
      {
        id: "initial-review",
        template: "codeReview",
        output_to: ["security", "performance"]
      },
      {
        id: "security",
        template: "securityAudit",
        input_from: ["initial-review"],
        parallel_with: ["performance"]
      },
      {
        id: "performance",
        template: {
          ...PromptTemplates.codeReview,
          constraints: ConstraintSets.performance_focused
        },
        input_from: ["initial-review"],
        parallel_with: ["security"]
      },
      {
        id: "aggregate",
        template: "aggregate",  // Special aggregation step
        input_from: ["security", "performance"],
        transform: (results) => ({
          // Merge and deduplicate issues from both reviews
          issues: deduplicateIssues([...results[0].issues, ...results[1].issues]),
          recommendations: [...results[0].recommendations, ...results[1].recommendations]
        })
      }
    ],
    shared_constraints: ConstraintSets.typescript_strict
  },

  implementWithTests: {
    name: "implement-with-tests",
    description: "Implement feature and generate tests",
    steps: [
      {
        id: "implement",
        template: "implementation",
        output_to: ["test"]
      },
      {
        id: "test",
        template: "testGeneration",
        input_from: ["implement"]
      },
      {
        id: "review",
        template: "codeReview",
        input_from: ["implement", "test"],
        condition: "config.include_review === true"
      }
    ]
  },

  debugAndFix: {
    name: "debug-and-fix",
    description: "Debug issue, fix it, and verify",
    steps: [
      {
        id: "debug",
        template: "debugging",
        output_to: ["fix"]
      },
      {
        id: "fix",
        template: "implementation",
        input_from: ["debug"],
        output_to: ["verify"]
      },
      {
        id: "verify",
        template: "testGeneration",
        input_from: ["fix"],
        condition: "config.include_verification === true"
      }
    ],
    error_handling: {
      on_step_failure: 'retry',
      max_retries: 2
    }
  }
};

// Example groups
const Groups: Record<string, PromptGroup> = {
  multiAspectReview: {
    name: "multi-aspect-review",
    description: "Review code from multiple perspectives simultaneously",
    prompts: [
      { template: "securityAudit", weight: 1.0 },
      { template: "codeReview", weight: 0.8 },
      {
        template: "performance-review",
        weight: 0.6,
        condition: "config.include_performance === true"
      }
    ],
    execution: "parallel",
    aggregation: {
      strategy: "weighted_merge",
      conflict_resolution: "highest_severity",
      deduplicate: true
    }
  }
};
```

### Level 5: Signatures (DSPy-style)

The highest abstraction—just define input/output, let the system figure out the prompt:

```typescript
interface Signature {
  name: string;
  description?: string;
  inputs: SignatureField[];
  outputs: SignatureField[];
}

interface SignatureField {
  name: string;
  type: string;                       // TypeScript-style type
  description?: string;
  optional?: boolean;
}

// Example signatures - maximum abstraction
const Signatures: Record<string, Signature> = {
  codeReview: {
    name: "CodeReview",
    description: "Review code for issues and suggest improvements",
    inputs: [
      { name: "code", type: "string", description: "Source code to review" },
      { name: "focus_areas", type: "string[]", description: "Areas to focus on", optional: true }
    ],
    outputs: [
      { name: "issues", type: "Issue[]", description: "Found issues with severity and suggestions" },
      { name: "summary", type: "string", description: "Brief overall assessment" }
    ]
  },

  explainCode: {
    name: "ExplainCode",
    description: "Explain what code does in plain language",
    inputs: [
      { name: "code", type: "string" },
      { name: "audience", type: "'beginner' | 'intermediate' | 'expert'", optional: true }
    ],
    outputs: [
      { name: "explanation", type: "string" }
    ]
  },

  generateFunction: {
    name: "GenerateFunction",
    description: "Generate a function from description",
    inputs: [
      { name: "description", type: "string", description: "What the function should do" },
      { name: "signature", type: "string", description: "Function signature", optional: true }
    ],
    outputs: [
      { name: "code", type: "string" },
      { name: "tests", type: "string", optional: true }
    ]
  },

  fixBug: {
    name: "FixBug",
    description: "Fix a bug in code",
    inputs: [
      { name: "code", type: "string" },
      { name: "error", type: "string", description: "Error message or bug description" },
      { name: "expected", type: "string", description: "Expected behavior", optional: true }
    ],
    outputs: [
      { name: "fixed_code", type: "string" },
      { name: "explanation", type: "string" }
    ]
  }
};

// Signature compiler - converts signature to full prompt
class SignatureCompiler {
  constructor(
    private modelConfig: ModelConfig,
    private environmentContext: EnvironmentContext,
    private defaults: {
      rolePresets: typeof RolePresets;
      constraintSets: typeof ConstraintSets;
      outputPresets: typeof OutputPresets;
    }
  ) {}

  compile(signature: Signature): Prompt {
    // Infer role from signature name and description
    const role = this.inferRole(signature);

    // Infer constraints from input/output types
    const constraints = this.inferConstraints(signature);

    // Build output format from output fields
    const output = this.buildOutputFormat(signature.outputs);

    // Build task from signature
    const task = this.buildTask(signature);

    return new Prompt({
      role,
      constraints,
      output,
      task,
      model: this.modelConfig,
      environment: this.environmentContext
    });
  }

  private inferRole(signature: Signature): RoleSection {
    // Map signature patterns to appropriate roles
    if (signature.name.includes('Review')) {
      return this.defaults.rolePresets.codeReviewer;
    }
    if (signature.name.includes('Security') || signature.name.includes('Audit')) {
      return this.defaults.rolePresets.securityAuditor;
    }
    if (signature.name.includes('Generate') || signature.name.includes('Fix')) {
      return this.defaults.rolePresets.seniorTypeScriptDev;
    }
    if (signature.name.includes('Explain') || signature.name.includes('Document')) {
      return this.defaults.rolePresets.technicalWriter;
    }
    return this.defaults.rolePresets.seniorTypeScriptDev;
  }

  private inferConstraints(signature: Signature): ConstraintSection[] {
    const constraints: ConstraintSection[] = [];

    // If outputs include code, add code quality constraints
    if (signature.outputs.some(o => o.type.includes('code') || o.name === 'code')) {
      constraints.push(...this.defaults.constraintSets.clean_code);
    }

    // If security-related, add security constraints
    if (signature.name.toLowerCase().includes('security')) {
      constraints.push(...this.defaults.constraintSets.security_comprehensive);
    }

    // Add language-specific constraints based on environment
    if (this.environmentContext.language.name === 'typescript') {
      constraints.push(...this.defaults.constraintSets.typescript_strict);
    }

    return constraints;
  }

  private buildOutputFormat(outputs: SignatureField[]): OutputSection {
    // Build JSON schema from output fields
    const schema = {
      type: "object" as const,
      properties: Object.fromEntries(
        outputs.map(o => [o.name, this.typeToJsonSchema(o.type)])
      ),
      required: outputs.filter(o => !o.optional).map(o => o.name)
    };

    return {
      type: 'output',
      format: { type: 'json' },
      schema: { json_schema: schema },
      validation: { must_match_schema: true }
    };
  }

  private typeToJsonSchema(type: string): object {
    if (type === 'string') return { type: 'string' };
    if (type === 'number') return { type: 'number' };
    if (type === 'boolean') return { type: 'boolean' };
    if (type.endsWith('[]')) {
      return { type: 'array', items: this.typeToJsonSchema(type.slice(0, -2)) };
    }
    return { type: 'object' };
  }

  private buildTask(signature: Signature): TaskSection {
    return {
      type: 'task',
      instruction: {
        action: signature.name.replace(/([A-Z])/g, ' $1').trim(),
        target: signature.inputs[0]?.name || 'input',
        purpose: signature.description
      }
    };
  }
}
```

### Using the Abstraction Hierarchy

```typescript
// Example: Using different abstraction levels

// Level 1: Fragment composition
const myConstraints = [
  ConstraintFragments.no_any,
  ConstraintFragments.validate_inputs,
  ConstraintFragments.meaningful_names
];

// Level 2: Preset usage
const prompt1 = new PromptBuilder()
  .use(RolePresets.securityAuditor)
  .useConstraints(ConstraintSets.security_comprehensive)
  .useOutput(OutputPresets.code_review_json)
  .task({ action: "Audit", target: "authentication module" })
  .build();

// Level 3: Template usage
const prompt2 = PromptTemplates.securityAudit
  .withContext({ subtype: "code", content: sourceCode })
  .withTarget("the payment processing module")
  .build();

// Level 4: Pipeline execution
const results = await Pipelines.comprehensiveCodeReview
  .execute({ code: sourceCode, config: { include_performance: true } });

// Level 5: Signature compilation
const compiler = new SignatureCompiler(ModelConfigs.claude_4, myEnvironment, defaults);
const prompt5 = compiler.compile(Signatures.codeReview);
const result = await prompt5.execute({ code: sourceCode });
```

### Summary: Abstraction Levels Quick Reference

| Level | Abstraction | Use Case | Example |
|-------|-------------|----------|---------|
| **1** | Fragments | Fine-grained control | `ConstraintFragments.no_any` |
| **2** | Presets | Reusable section configs | `RolePresets.securityAuditor` |
| **3** | Templates | Complete task prompts | `PromptTemplates.codeReview` |
| **4** | Pipelines | Multi-step workflows | `Pipelines.comprehensiveCodeReview` |
| **5** | Signatures | Maximum abstraction | `"code -> review"` |

### Sources

- [CodeSignal: Model-Specific Formatting](https://codesignal.com/learn/courses/prompting-foundations/lessons/model-specific-formatting-adapting-prompts-for-different-llms)
- [Algorithm Unmasked: Claude XML vs Markdown](https://algorithmunmasked.com/2025/05/14/mastering-claude-prompts-xml-vs-markdown-formatting-for-optimal-results/)
- [DataUnboxed: Prompt Engineering Best Practices](https://www.dataunboxed.io/blog/prompt-engineering-best-practices-complete-comparison-matrix)
- [MediaTech Group: LLM Provider Comparison](https://mediatech.group/prompt-engineering/llm-provider-prompt-comparison-openai-vs-anthropic-vs-google-guide/)
- [DSPy: Signatures](https://dspy.ai/learn/programming/signatures/)
- [DSPy: The Power of Good Abstractions](https://thedataquarry.com/blog/learning-dspy-1-the-power-of-good-abstractions/)
- [Prompt-Layered Architecture Paper](https://ijsrm.net/index.php/ijsrm/article/view/5670/3951)
- [MIT Sloan: Prompt Templates](https://mitsloan.mit.edu/ideas-made-to-matter/prompt-engineering-so-2024-try-these-prompt-templates-instead)
- [Anthropic: Claude 4 Best Practices](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [AWS Bedrock: Prompt Engineering](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-engineering-guidelines.html)
- [LangChain: Prompt Templates](https://www.comet.com/site/blog/introduction-to-prompt-templates-in-langchain/)
- [Model Context Protocol: Prompts](https://modelcontextprotocol.io/docs/concepts/prompts)
