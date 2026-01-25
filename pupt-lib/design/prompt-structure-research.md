# Prompt Structure Research

Research compilation on prompt engineering best practices, structural components, and formatting guidelines from academic papers, vendor documentation, and community sources.

---

## Table of Contents

1. [Academic Research](#academic-research)
2. [Prompt Engineering Frameworks](#prompt-engineering-frameworks)
3. [Component Taxonomy](#component-taxonomy)
4. [Formatting Guidelines](#formatting-guidelines)
5. [Advanced Techniques](#advanced-techniques)
6. [Vendor-Specific Recommendations](#vendor-specific-recommendations)
7. [Sources](#sources)

---

## Academic Research

### arXiv: "From Prompts to Templates" (2024)

This systematic analysis of real-world LLM application templates identified **seven core components** with their usage frequencies:

| Component | Usage % | Description |
|-----------|---------|-------------|
| **Directive** | 86.7% | The core intent of the prompt, often in the form of an instruction or a question |
| **Context** | 56.2% | Background information helping the model understand task requirements |
| **Output Format/Style** | 39.7% | The type, format, or style of the output |
| **Constraints** | 35.7% | Restrictions guiding what the model must adhere to when generating responses |
| **Profile/Role** | 28.4% | Who or what the model is acting as |
| **Workflow** | 27.5% | Steps and processes the model should follow to complete tasks |
| **Examples** | 19.9% | Sample responses demonstrating expected output appearance |

**Key Insights:**
- Directive components dominate because they establish the task's fundamental purpose
- Profile/Role and Directive typically appear first in templates
- Examples typically conclude templates
- Context and Workflow form one common pair
- Output Format/Style and Constraints form another flexible pair
- For production applications, developers emphasize Output Format/Style and Constraints because downstream applications require predictable, structured outputs

Source: https://arxiv.org/html/2504.02052v2

---

### arXiv: "The Prompt Report" - Systematic Survey (2024)

This comprehensive survey categorizes prompt components and techniques:

#### Core Prompt Components

1. **Directive** - The core instruction or task description
2. **Examples** - Demonstrations provided to guide the model
3. **Output Formatting** - Specifications for how responses should be structured
4. **Style Instructions** - Guidance on tone, voice, or presentation manner
5. **Role** - Assignment of a persona or perspective for the model
6. **Additional Information** - Contextual details supporting the main request

#### Prompting Technique Categories

**In-Context Learning (ICL):**
- Few-shot prompting with design decisions around exemplar quantity, ordering, and label distribution
- K-Nearest Neighbor (KNN) selection methods
- Self-Generated In-Context Learning (SG-ICL)
- Zero-shot techniques including Role Prompting, Style Prompting, and Emotion Prompting

**Thought Generation:**
- Chain-of-Thought (CoT) prompting
- Zero-Shot-CoT variants like Step-Back Prompting
- Analogical Prompting and Thread-of-Thought (ThoT)
- Few-shot CoT with Contrastive, Uncertainty-Routed, and Complexity-based variants

**Decomposition Techniques:**
- Least-to-Most Prompting
- Plan-and-Solve Prompting
- Tree-of-Thought (ToT)
- Program-of-Thoughts and Skeleton-of-Thought

**Ensembling Methods:**
- Self-Consistency
- Universal Self-Consistency
- Prompt Paraphrasing

**Self-Criticism Approaches:**
- Self-Calibration and Self-Refine
- Chain-of-Verification (CoVe)
- Reversing Chain-of-Thought (RCoT)

#### Answer Engineering

- **Answer Shape** - Specifying output structure
- **Answer Space** - Constraining possible responses
- **Answer Extractors** - Verbalizers, regex patterns, or separate LLM-based extraction

Source: https://arxiv.org/html/2406.06608v6

---

### arXiv: "The Prompt Canvas" (2024)

A literature-based practitioner guide identifying four primary canvas sections:

1. **Persona/Role and Target Audience**
   - Defining a specific persona or role helps in tailoring the language model's perspective

2. **Task/Intent and Step-by-Step**
   - Clearly articulating the goal provides the language model with a specific objective
   - Breaking down the goal into step-by-step instructions guides the model through complex tasks

3. **Context and References**
   - Providing context and relevant references equips the language model with necessary background information

4. **Output/Format and Tonality**
   - Specifying the desired format and tone ensures that the response meets stylistic and structural expectations

#### Enhancement Techniques Identified

- Iterative Optimization
- Placeholders and Delimiters
- Prompt Generator
- Chain-of-Thought Reasoning
- Tree-of-Thoughts Exploration
- Emotion Prompting
- Rephrase and Respond/Re-Reading
- Hyperparameter Adjustment

#### Meta-Dimensions (From Braun et al.)

- Interaction type (human-in-the-loop vs. computer-in-the-loop)
- Learning mode (Zero-shot, One-shot, Few-shot)
- Style and behavior adaptation
- Information space (internal vs. external context)

Source: https://arxiv.org/html/2412.05127v1

---

### arXiv: "Does Prompt Formatting Have Any Impact on LLM Performance?" (2024)

Study examining format impact using plain text, markdown, YAML, and JSON.

**Five Components Tested:**
1. Persona
2. Task instructions
3. Examples
4. Output format instructions
5. User ask

**Key Finding:** Prompt format can significantly impact model performance, contrary to the assumption that it remains stable across different templates. Format choices lead to substantial performance variations.

Source: https://arxiv.org/html/2411.10541v1

---

### arXiv: "A Prompt Pattern Catalog" - Jules White et al. (2023)

Catalog of prompt engineering techniques presented in pattern form.

#### Pattern Structure Components

Each pattern includes:
- **Name and Classification** - Unique identifier and category
- **Context and Intent** - Purpose the pattern achieves
- **Motivation** - Why the pattern is useful
- **Structure and Key Ideas** - Core components
- **Example Implementation** - Concrete usage
- **Consequences** - Considerations for usage

#### Pattern Categories

1. **Input Semantics** - Meta Language Creation Pattern
2. **Output Customization** - Output Automater, Persona, Visualization Generator, Recipe, Template
3. **Error Identification** - Fact Check List, Reflection
4. **Prompt Improvement** - Question Refinement, Alternative Approaches, Cognitive Verifier, Refusal Breaker
5. **Interaction** - Flipped Interaction, Game Play, Infinite Generation
6. **Context Control** - Context Manager

#### Key Patterns

**Meta Language Pattern:**
Define custom syntax for specialized inputs (e.g., "a → b" for graphs)

**Flipped Interaction Pattern:**
LLM asks questions to obtain information needed for tasks

**Fact Check List Pattern:**
LLM outputs a list of facts that should be verified

**Cognitive Verifier Pattern:**
LLM generates sub-questions to better answer the main question

**Reflection Pattern:**
LLM explains its reasoning and identifies potential errors

Source: https://arxiv.org/abs/2302.11382

---

### arXiv: "Chain-of-Thought Prompting Elicits Reasoning" - Wei et al. (2022)

Foundational paper on Chain-of-Thought prompting.

**Core Concept:** A chain of thought is a series of intermediate natural language reasoning steps that lead to the final output.

**Prompt Structure:** Triples of ⟨input, chain of thought, output⟩

**Key Finding:** CoT prompting is an emergent ability that appears as model size scales up. Large LLMs perform better because they've learned more nuanced reasoning patterns.

Source: https://arxiv.org/abs/2201.11903

---

## Prompt Engineering Frameworks

### CO-STAR Framework

Winner of Singapore's first GPT-4 Prompt Engineering competition. Developed by data scientist Sheila Teo.

| Component | Description |
|-----------|-------------|
| **C - Context** | Situational details (customer history, product names, timestamps) |
| **O - Objective** | The specific format and result desired |
| **S - Style** | Formatting specifications (paragraphs, bullet points, JSON) |
| **T - Tone** | Communication style (formal, casual, empathetic, assertive) |
| **A - Audience** | Target recipient - shapes vocabulary, structure, and depth |
| **R - Response** | Output expectations (format requirements, word limits, factual constraints) |

**Why It Works:** Treats prompt writing as a full-stack design challenge. Builds a blueprint for what the model should know, say, and sound like.

Source: https://www.parloa.com/knowledge-hub/prompt-engineering-frameworks/

---

### RISEN Framework

| Component | Description |
|-----------|-------------|
| **R - Role** | Define the role (e.g., "copywriter for a tech startup") |
| **I - Instruction** | What you want done (e.g., "Highlight 3 unique features in 50 words") |
| **S - Structure** | The format (e.g., "Bullet points + a closing CTA") |
| **E - Examples** | Provide example inputs/outputs |
| **N - Nuance** | Specify audience and tone (e.g., "Audience: Young professionals. Tone: Sleek and innovative") |

**Strength:** Balances detail and flexibility - detailed enough for accuracy, flexible enough for any use case.

Source: https://medium.com/@tahirbalarabe2/prompt-engineering-made-simple-with-the-risen-framework-038d98319574

---

### CRISPE Framework

Originally developed as an internal framework by OpenAI.

| Component | Description |
|-----------|-------------|
| **C - Capacity/Role** | Sets the model's role or capability (e.g., expert analyst) |
| **R - Insight** | Focuses on surfacing a core idea |
| **I - Statement** | Frames the core output |
| **S - Personality** | Adds tone control |
| **P - Experiment** | Encourages multiple responses or examples for selection |

**Strength:** Balances structured analytical thinking with exploratory experimentation.

Source: https://sourcingdenis.medium.com/crispe-prompt-engineering-framework-e47eaaf83611

---

### CRAFT Framework

| Component | Description |
|-----------|-------------|
| **C - Context** | Think "Persona Audience Tone" (PAT) |
| **R - Request** | The core ask |
| **A - Actions** | Specific steps to take |
| **F - Frame** | Boundaries and constraints |
| **T - Template** | Output structure |

Source: https://blog.alexanderfyoung.com/how-to-craft-the-perfect-prompt/

---

### RTF Framework

Simple, focused framework for quick prompts.

| Component | Description |
|-----------|-------------|
| **R - Role** | AI's perspective or expertise level |
| **T - Task** | The objective or goal |
| **F - Format** | Structure of the output |

Source: https://www.godofprompt.ai/blog/prompt-structures-for-chatgpt-basics

---

### RACE Framework

| Component | Description |
|-----------|-------------|
| **R - Role** | Expert persona assignment |
| **A - Action** | The specific task |
| **C - Context** | Grounding information |
| **E - Expectation** | Output target definition |

Source: https://www.parloa.com/knowledge-hub/prompt-engineering-frameworks/

---

### AUTOMAT Framework

| Component | Description |
|-----------|-------------|
| **A - AI's role** | Identity and expertise |
| **U - User/audience** | Who it's interacting with |
| **T - Task/goal** | The goal of the interaction |
| **O - Output info** | What information to provide |
| **M - Manner** | How to communicate |
| **A - Anomaly handling** | How to handle edge cases |
| **T - Topics** | What topics are relevant (scope) |

**Unique Feature:** Explicitly includes anomaly/edge case handling.

Source: https://dextralabs.com/blog/prompt-engineering-templates/

---

### Before-After-Bridge (BAB) Framework

| Component | Description |
|-----------|-------------|
| **Before** | Establishes the user's pain point |
| **After** | Describes the desired resolution |
| **Bridge** | Explains the transition between states |

Source: https://www.parloa.com/knowledge-hub/prompt-engineering-frameworks/

---

### Five S Model

| Component | Description |
|-----------|-------------|
| **Set the Scene** | Establish context |
| **Specify Task** | Define what to do |
| **Simplify Language** | Use clear language |
| **Structure Response** | Define output format |
| **Share Feedback** | Provide examples or corrections |

Source: https://www.parloa.com/knowledge-hub/prompt-engineering-frameworks/

---

### 10-Step Prompt Structure Guide

Organized into three layers:

#### Foundation Layer (Steps 1-3)

**Step 1: Task Context**
- Your role
- Audience
- Specific project goals
- What success looks like
- Format: "I'm [role] working on [project]. My audience is [who/needs]. This task needs to [primary objective] while [secondary objectives]. Success looks like [outcome]."

**Step 2: Tone Context**
- Communication style (formal/casual)
- Emotional approach (excited/measured)
- Reader relationship (how you want to connect)

**Step 3: Background Data**
- Situational context (your role and constraints)
- Reference materials (documents and guidelines)
- Existing assets (previous attempts, brand guidelines)

#### Structure Layer (Steps 4-6)

**Step 4: Task Definition**
**Step 5: Examples**
**Step 6: Conversation History**

#### Execution Layer (Steps 7-10)

**Step 7: Output Guidance**
**Step 8: Quality Control**
**Step 9: Formatting**
**Step 10: Final Instructions**

Source: https://aimaker.substack.com/p/the-10-step-system-prompt-structure-guide-anthropic-claude

---

## Component Taxonomy

### Comprehensive List of Prompt Components

Based on all research, here is a comprehensive taxonomy of prompt components:

#### Identity & Persona

| Component | Description | Usage |
|-----------|-------------|-------|
| **Role/Persona** | Who the model is acting as | Very common (28-87%) |
| **Expertise Level** | Skill/knowledge level to assume | Common |
| **Capabilities** | What the model can do | System prompts |
| **Limitations** | What the model cannot/should not do | System prompts |

#### Task Definition

| Component | Description | Usage |
|-----------|-------------|-------|
| **Directive/Instruction** | Core task or question | Most common (86.7%) |
| **Objective/Goal** | What success looks like | Common |
| **Scope/Boundaries** | What's in/out of scope | Recommended |
| **Termination Conditions** | When to stop | Jules White patterns |

#### Context & Background

| Component | Description | Usage |
|-----------|-------------|-------|
| **Context** | Background information | Very common (56.2%) |
| **Input Data** | Actual data to process | Common |
| **References/Citations** | Source materials | Recommended |
| **Conversation History** | Prior exchange context | Multi-turn |
| **Assumptions** | Explicit assumptions | Recommended |

#### Output Specification

| Component | Description | Usage |
|-----------|-------------|-------|
| **Output Format** | Structure (JSON, markdown, etc.) | Common (39.7%) |
| **Style** | Writing style (concise, academic) | Common |
| **Tone** | Emotional quality (formal, friendly) | Common |
| **Length/Verbosity** | How much to write | Common |

#### Audience & Communication

| Component | Description | Usage |
|-----------|-------------|-------|
| **Audience/Target** | Who output is for | CO-STAR, RISEN |
| **Reader Relationship** | How to connect | 10-step guide |
| **Technical Level** | Complexity of explanation | Recommended |

#### Process & Workflow

| Component | Description | Usage |
|-----------|-------------|-------|
| **Workflow/Steps** | Process to follow | Common (27.5%) |
| **Chain-of-Thought** | Reasoning instructions | Advanced |
| **Decomposition** | How to break down task | Advanced |

#### Examples & Demonstrations

| Component | Description | Usage |
|-----------|-------------|-------|
| **Positive Examples** | Good input/output pairs | Common (19.9%) |
| **Negative Examples** | What NOT to do | Recommended |
| **Edge Cases** | Unusual situations | Production |

#### Constraints & Guardrails

| Component | Description | Usage |
|-----------|-------------|-------|
| **Constraints** | Rules to follow | Common (35.7%) |
| **Guardrails/Safety** | Prohibited actions | Production |
| **Input Validation** | What inputs to reject | Production |
| **Output Validation** | Quality checks | Production |

#### Error Handling & Uncertainty

| Component | Description | Usage |
|-----------|-------------|-------|
| **Edge Case Handling** | Unusual situations | AUTOMAT |
| **Fallback Behavior** | Default when uncertain | Production |
| **Uncertainty Handling** | "I don't know" permission | Anthropic |
| **Clarification Request** | When to ask for more info | Recommended |

#### Quality & Verification

| Component | Description | Usage |
|-----------|-------------|-------|
| **Success Criteria** | How to evaluate output | Recommended |
| **Verification Steps** | Fact-checking instructions | Chain of Verification |
| **Self-Critique** | Review own response | Self-criticism |
| **Quality Control** | Standards to meet | 10-step guide |

---

## Formatting Guidelines

### XML Tags (Recommended by All Major Vendors)

XML tags provide multi-line certainty with delimiters that mark where items begin and end, reducing ambiguity and potentially increasing response accuracy.

```xml
<role>
You are an expert software architect with 15 years of experience.
</role>

<context>
The user is building a microservices architecture for an e-commerce platform.
</context>

<task>
Review the proposed architecture and identify potential scalability issues.
</task>

<constraints>
- Focus on database and API design
- Consider traffic spikes during sales events
- Assume AWS as the cloud provider
</constraints>

<output_format>
Provide your analysis as:
1. Executive summary (2-3 sentences)
2. Detailed findings (bullet points)
3. Recommendations (prioritized list)
</output_format>

<examples>
<example>
<input>Monolithic architecture with single database</input>
<output>Critical scalability concern: Single point of failure...</output>
</example>
</examples>
```

**Why XML:**
- All models from Anthropic, Google, and OpenAI encourage XML
- Tokenization causes problems with whitespace and indentation
- XML provides unambiguous boundaries
- Subsequent tokens can check if tags are closed

Source: https://www.robertodiasduarte.com.br/en/markdown-vs-xml-em-prompts-para-llms-uma-analise-comparativa/

---

### Markdown (Alternative)

For cost-sensitive applications with simple prompts:

```markdown
# Role
You are an expert software architect.

## Context
Building a microservices architecture for e-commerce.

## Task
Review the architecture for scalability issues.

## Constraints
- Focus on database and API design
- Consider traffic spikes
- Assume AWS

## Output Format
1. Executive summary
2. Detailed findings
3. Recommendations
```

**Trade-off:** Lower token consumption but potentially less precise adherence.

---

### Structural Ordering (Best Practices)

Based on research findings:

1. **First:** Profile/Role and Directive
2. **Middle:** Context and Workflow
3. **Flexible:** Output Format and Constraints (can be paired)
4. **Last:** Examples

**Rationale:** Establishing identity and task intent first helps the model frame subsequent information correctly.

---

### Delimiters

Use consistent delimiters to separate sections:

| Delimiter Type | Example | Best For |
|---------------|---------|----------|
| XML tags | `<context>...</context>` | Complex prompts, high accuracy |
| Markdown headers | `## Context` | Simple prompts, readability |
| Triple quotes | `"""..."""` | Code blocks, data |
| Triple backticks | `` ``` `` | Code, preserving formatting |
| Dashes | `---` | Section breaks |

---

## Advanced Techniques

### Self-Critique Pattern

Four-step process for improved accuracy:

1. **Initial Task** - Ask the LLM to solve a problem
2. **Self-Review** - Prompt: "List three ways your answer could be improved"
3. **Feedback Analysis** - LLM generates criticisms/suggestions
4. **Refinement** - Instruct LLM to revise based on self-critique

**Best Practice:** Treat self-critique as a separate, distinct step. Integrating it in the same prompt dilutes quality.

**Benefits:**
- Improved accuracy (catches own errors)
- Enhanced creativity (rethinking responses)
- Acknowledges knowledge limits

**Limitations:**
- Time-intensive (multiple iterations)
- Risk of overcomplication
- Less effective with weaker models

Source: https://promptengineering.org/llms-learn-humility-how-self-critique-improves-logic-and-reasoning-in-llms-like-chatgpt/

---

### Chain of Verification (CoVe)

Five-step verification process:

1. **Generate initial response**
2. **Self-questioning** - Generate verification questions
3. **Fact-checking** - Answer verification questions
4. **Resolve inconsistencies** - Address conflicts
5. **Synthesize validated response** - Produce final output

Source: https://www.analyticsvidhya.com/blog/2024/07/chain-of-verification/

---

### Few-Shot Best Practices

**Quantity:**
- Generally 3-5 examples is ideal
- Research shows performance improves with up to 50 examples (Llama 2 70b)
- Balance pattern clarity vs. token cost

**Quality:**
- Use diverse, representative examples
- Cover different edge cases
- Keep structure identical across examples
- Use both positive AND negative examples

**Ordering:**
- Be aware of recency bias (model favors last examples)
- If last examples are negative, model may predict negative

**Labels:**
- Format plays a key role even with random labels
- Using random labels is much better than no labels

Source: https://www.promptingguide.ai/techniques/fewshot

---

### Guardrails Implementation

#### Input Guardrails
Applied before processing:
- Validate incoming inputs
- Check for safety/appropriateness
- Return default message if unsafe

#### Output Guardrails
Applied after generation:
- Evaluate for vulnerabilities
- Check for hallucinations, bias, toxicity
- Retry generation if issues detected

#### Implementation Methods

1. **Pre-prompt Controls** - Define role, include disclaimers
2. **Post-response Filters** - Block toxicity, detect hallucinations
3. **Function Calling & JSON Schemas** - Restrict to specific formats
4. **RAG** - Ground responses in verified sources

#### Common Vulnerabilities to Guard Against

- Data Leakage (PII exposure)
- Prompt Injection (malicious manipulation)
- Jailbreaking (bypassing safety)
- Bias (gender, racial, political)
- Toxicity (harmful language)
- Privacy violations

Source: https://www.datadoghq.com/blog/llm-guardrails-best-practices/

---

### Uncertainty Handling

From Anthropic best practices:

> "By explicitly giving Claude permission to acknowledge when it's unsure or lacks sufficient information, it's less likely to generate inaccurate responses."

**Implementation:**
```xml
<uncertainty_handling>
If you are unsure or don't have enough information to provide a confident answer,
simply say "I don't know" or ask for clarification. Do not guess or make up information.
</uncertainty_handling>
```

Source: https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices

---

### Edge Case Handling

From AUTOMAT framework and production guides:

**Template Structure:**
```xml
<edge_cases>
If the input is missing required data: [behavior]
If the request is outside your expertise: [behavior]
If the user asks something ambiguous: [behavior]
If multiple valid interpretations exist: [behavior]
</edge_cases>
```

**Best Practice:** Show the model how to handle outliers - missing data, off-topic questions, or rogue users.

Source: https://dextralabs.com/blog/prompt-engineering-templates/

---

## Vendor-Specific Recommendations

### Anthropic (Claude)

- **XML Tags:** Claude was trained with XML tags. Use them to clearly separate sections.
- **Semantic Clarity:** Benefits from semantic clarity more than full wording
- **Long Reasoning:** Claude 3/4 excels at long, careful reasoning
- **Include:** Assumptions, safety considerations, critique steps
- **Uncertainty:** Explicitly permit "I don't know" responses
- **Prefilling:** Can prefill Claude's response to control format

Key tags: `<task>`, `<context>`, `<example>`, `<document>`

Source: https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices

---

### OpenAI (GPT)

- **Structured Prompts:** Benefits from explicit role + formatting
- **Delimiters:** Use markdown, XML tags, or section headings
- **Code/Structured Output:** Excels at code and structured outputs
- **Reasoning Models (o1/o3):** Benefit from high-level guidance, not precise instructions
- **Testing:** Instruct model to test changes with unit tests

Recommended structure: Role and Objective, Instructions, Reasoning Steps, Output Format, Examples, Context, Final instructions

Source: https://platform.openai.com/docs/guides/prompt-engineering

---

### Google (Gemini)

- **Directness:** Favors directness over persuasion, logic over verbosity
- **Concise Input:** Responds best to direct, clear instructions
- **Less Verbose:** By default, prioritizes direct and efficient answers
- **Temperature:** Keep at default 1.0 (optimized for this)
- **Avoid Negatives:** "Do not infer" can cause over-indexing
- **Long Context:** Place instructions at END after data context

**Caution:** Open-ended instructions like "do not guess" may cause failures. Use explicit positive instructions instead.

Source: https://ai.google.dev/gemini-api/docs/prompting-strategies

---

### General Research Finding

> "Larger models actually perform worse on negated instructions, struggling more than smaller models to process negative framing."

**Implication:** Tell the model what TO DO, not what NOT to do.

Source: https://www.lakera.ai/blog/prompt-engineering-guide (citing KAIST research)

---

## Sources

### Academic Papers

| Paper | Year | Link |
|-------|------|------|
| From Prompts to Templates: Systematic Analysis | 2024 | https://arxiv.org/html/2504.02052v2 |
| The Prompt Report: Systematic Survey | 2024 | https://arxiv.org/html/2406.06608v6 |
| The Prompt Canvas: Practitioner Guide | 2024 | https://arxiv.org/html/2412.05127v1 |
| Does Prompt Formatting Have Impact? | 2024 | https://arxiv.org/html/2411.10541v1 |
| A Prompt Pattern Catalog | 2023 | https://arxiv.org/abs/2302.11382 |
| Chain-of-Thought Prompting | 2022 | https://arxiv.org/abs/2201.11903 |
| Survey of Automatic Prompt Engineering | 2025 | https://arxiv.org/abs/2502.11560 |
| Systematic Survey of Prompt Engineering | 2024 | https://arxiv.org/html/2402.07927v2 |

### Vendor Documentation

| Vendor | Resource | Link |
|--------|----------|------|
| Anthropic | Claude Best Practices | https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices |
| Anthropic | Interactive Tutorial | https://github.com/anthropics/prompt-eng-interactive-tutorial |
| OpenAI | Prompt Engineering Guide | https://platform.openai.com/docs/guides/prompt-engineering |
| OpenAI | ChatGPT Best Practices | https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt |
| Google | Gemini Prompting Strategies | https://ai.google.dev/gemini-api/docs/prompting-strategies |
| Google | Gemini 3 Prompting Guide | https://docs.cloud.google.com/vertex-ai/generative-ai/docs/start/gemini-3-prompting-guide |

### Framework References

| Framework | Source | Link |
|-----------|--------|------|
| CO-STAR | Parloa | https://www.parloa.com/knowledge-hub/prompt-engineering-frameworks/ |
| RISEN | Medium | https://medium.com/@tahirbalarabe2/prompt-engineering-made-simple-with-the-risen-framework-038d98319574 |
| CRISPE | Medium | https://sourcingdenis.medium.com/crispe-prompt-engineering-framework-e47eaaf83611 |
| CRAFT | Alexander Young | https://blog.alexanderfyoung.com/how-to-craft-the-perfect-prompt/ |
| RTF | God of Prompt | https://www.godofprompt.ai/blog/prompt-structures-for-chatgpt-basics |
| AUTOMAT | Dextralabs | https://dextralabs.com/blog/prompt-engineering-templates/ |

### Additional Resources

| Topic | Source | Link |
|-------|--------|------|
| Markdown vs XML | Roberto Dias Duarte | https://www.robertodiasduarte.com.br/en/markdown-vs-xml-em-prompts-para-llms-uma-analise-comparativa/ |
| LLM Guardrails | Datadog | https://www.datadoghq.com/blog/llm-guardrails-best-practices/ |
| Self-Criticism Prompting | Prompt Engineering | https://promptengineering.org/llms-learn-humility-how-self-critique-improves-logic-and-reasoning-in-llms-like-chatgpt/ |
| Chain of Verification | Analytics Vidhya | https://www.analyticsvidhya.com/blog/2024/07/chain-of-verification/ |
| Few-Shot Prompting | Prompting Guide | https://www.promptingguide.ai/techniques/fewshot |
| Prompt Engineering Guide | DAIR.AI | https://www.promptingguide.ai/ |
| 10-Step Structure Guide | AI Maker | https://aimaker.substack.com/p/the-10-step-system-prompt-structure-guide-anthropic-claude |
| System Prompt Writing | System Prompt Master | https://systempromptmaster.com/learning/system-prompt-writing-guide |

---

## Summary: Essential Components for pupt-lib

Based on this research, the following components should be considered for the pupt-lib component library:

### Core Components (High Priority)

1. **Directive/Task** - The fundamental instruction (86.7% usage)
2. **Role/Persona** - Identity and expertise
3. **Context** - Background information (56.2% usage)
4. **Output Format** - Structure specification (39.7% usage)
5. **Constraints** - Rules and boundaries (35.7% usage)
6. **Examples** - Input/output demonstrations (19.9% usage)

### Important Components (Medium Priority)

7. **Workflow/Steps** - Process to follow (27.5% usage)
8. **Audience/Target** - Who output is for
9. **Tone** - Emotional quality of output
10. **Style** - Writing style
11. **Success Criteria** - How to evaluate output
12. **Objective/Goal** - Explicit success definition

### Advanced Components (Production Priority)

13. **Guardrails/Safety** - Prohibited actions
14. **Edge Case Handling** - Unusual situations
15. **Uncertainty Handling** - "I don't know" permission
16. **Fallback Behavior** - Default responses
17. **Negative Examples** - What NOT to do
18. **Self-Critique/Verification** - Quality checking
19. **Input Data** - Distinct data section
20. **References/Citations** - Source materials

### Formatting Components

21. **Section/Delimiter** - XML tags or markdown headers
22. **Chain-of-Thought** - Reasoning instructions
23. **Decomposition** - Task breakdown structure
