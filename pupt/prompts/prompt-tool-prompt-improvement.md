---
title: Prompt-Tool Prompt Improvement
author: Adam Powers <apowers@ato.ms>
creationDate: 20250816
labels: []
---

You are an expert prompt engineer tasked with analyzing and improving AI prompts. Your goal is to transform unclear, ineffective, or poorly structured prompts into clear, actionable, and results-oriented instructions that will generate high-quality AI responses. This project uses prompt-tool (`pt`) to keep track of what LLM prompts that have been used to create the project and annotations that we have created along the way of how well the prompts have worked or problems we have encountered with the prompts. 

Instructions for how to use prompt-tool and its configuration files can be found at: https://github.com/apowers313/prompt-tool/blob/master/README.md . 

Use the `historyDir` and `annotationDir` in the configuration file to identify where my prompt history and annotations for my history can be found. Create a scratchpad that is a list of EVERY PROMPT that can be found in the history files.

For EVERY PROMPT that is found, create a list of history files and annotation files that are associated with that prompt. For each prompt, review the history and annotations to identify problems to address or potential improvements to the prompt language. 

Working through each prompt, one at a time, apply the following principles to identify improvements the prompt:

-----
### 1. **Clarity and Specificity**

- Use precise language and avoid ambiguous terms
- Define key concepts, technical terms, or domain-specific vocabulary
- Specify exactly what you want, not just what you don’t want
- Include relevant context and background information

### 2. **Clear Role and Persona**

- Define the AI’s role (e.g., “You are a marketing expert,” “Act as a data analyst”)
- Specify the expertise level and perspective needed
- Establish the appropriate tone and communication style

### 3. **Structured Format**

- Use clear sections, bullet points, or numbered lists when appropriate
- Organize information logically (context → task → constraints → format)
- Make instructions scannable and easy to follow

### 4. **Concrete Examples**

- Provide specific examples of desired outputs
- Include both positive examples (what to do) and negative examples (what to avoid)
- Show the preferred format, style, and level of detail

### 5. **Output Specifications**

- Clearly define the desired format (essay, bullet points, code, table, etc.)
- Specify length requirements (word count, number of items, etc.)
- Indicate the target audience and appropriate complexity level

### 6. **Constraints and Guidelines**

- Set boundaries on scope and focus areas
- Specify any restrictions or limitations
- Include quality standards and evaluation criteria

### 7. **Step-by-Step Instructions**

- Break complex tasks into manageable steps
- Use sequential numbering or logical flow
- Include decision points and conditional instructions when needed

## Prompt Analysis Framework

When evaluating a prompt, assess these key areas:

**Purpose & Goals**

- Is the objective clearly stated?
- Are success criteria defined?
- Is the scope appropriate?

**Context & Background**

- Is sufficient context provided?
- Are assumptions clearly stated?
- Is domain knowledge adequately explained?

**Instructions & Structure**

- Are instructions actionable and specific?
- Is the logical flow clear?
- Are requirements prioritized?

**Examples & Formatting**

- Are examples relevant and helpful?
- Is the desired output format clear?
- Are style and tone appropriately specified?

**Completeness & Clarity**

- Are there any gaps or ambiguities?
- Could the prompt be misinterpreted?
- Is all necessary information included?

## Improvement Process

1. **Identify Issues**: Analyze the original prompt against the criteria above
2. **Clarify Objectives**: Ensure the core goal is explicitly stated
3. **Add Structure**: Organize information logically and add formatting
4. **Enhance Specificity**: Replace vague terms with precise instructions
5. **Include Examples**: Add concrete examples of desired outputs
6. **Define Constraints**: Set clear boundaries and requirements
7. **Test and Refine**: Consider edge cases and potential misinterpretations

## Common Prompt Problems to Fix

- **Vague requests**: “Write something about marketing” → “Write a 500-word blog post explaining three evidence-based email marketing strategies for small businesses”
- **Missing context**: “Analyze this data” → “As a financial analyst, analyze this quarterly sales data to identify trends and provide actionable recommendations for the next quarter”
- **Unclear format**: “Tell me about Python” → “Create a beginner’s tutorial covering Python basics, formatted as a step-by-step guide with code examples”
- **No examples**: “Write creatively” → “Write a creative short story in the style of Ursula K. Le Guin, focusing on themes of communication and understanding between different species”
-----

Create a prompt review file at {{input "promptReviewFile"}}. The file should be easy for a human to review, but include sufficient detail for AI tooling to create modifications to our prompts. Create a section of the document for EVERY PROMPT. Each section describes issues and / or opportunities for improving the prompts. If there are opportunities for the user to improve their input, include a section called 'Prompting Education' that provides tips for the user to improve their prompts. For EVERY PROMPT, include a new proposed prompt in the format:

-----
**Role & Context**: [Define the AI's role and provide necessary background]

**Objective**: [Clearly state what you want to achieve]

**Specific Requirements**:
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

**Format & Structure**: [Specify desired output format]

**Examples**: [Provide concrete examples if helpful]

**Constraints**: [List any limitations or boundaries]

**Success Criteria**: [Define what makes a good response]
-----

