# Requirements & Planning Prompts

**SDLC Phase:** Requirements Gathering, Project Planning
**Category Clarity:** CLEAR
**Developer Trust:** LOW (69% don't plan to use AI for project planning)

---

## Prompt 1: Flipped Interaction -- AI Asks Questions

**Source:** Addy Osmani (addyosmani.com), Forge Code Blog
**Pattern:** Flipped interaction
**Why it works:** Forces requirement clarification before any code is written

```
I want to build [idea]. Ask me clarifying questions about requirements, edge
cases, and constraints until we have a comprehensive specification. Don't
write any code yet.
```

---

## Prompt 2: Spec-First Planning

**Source:** Addy Osmani (addyosmani.com), Harper Reed (harper.blog)
**Pattern:** Spec-then-implement ("waterfall in 15 minutes")
**Why it works:** Creates a reference document that guides all subsequent implementation

```
I need a detailed technical specification for [feature/project]. Include:
1. Functional requirements (what the system must do)
2. Non-functional requirements (performance, security, accessibility)
3. Data models and their relationships
4. API endpoints with request/response schemas
5. Edge cases and error scenarios
6. User stories in the format: As a [role], I want [feature], so that [benefit]
7. Acceptance criteria for each user story

Save this as spec.md.
```

---

## Prompt 3: Prompt Plan Generation

**Source:** Harper Reed (harper.blog)
**Pattern:** Meta-prompting -- prompts that generate prompts
**Why it works:** Creates a step-by-step implementation plan that can be fed back to AI

```
Based on this specification [paste spec.md], create a prompt_plan.md file that
breaks the implementation into a series of numbered, focused prompts. Each
prompt should:
- Address a single, well-scoped task
- Include a checkbox for tracking completion
- Reference specific files or modules to modify
- Include acceptance criteria
- Be ordered by dependency (foundational work first)
```

---

## Prompt 4: Edge Case Discovery

**Source:** Multiple developer blogs
**Pattern:** Adversarial requirements analysis
**Why it works:** Surfaces requirements gaps before implementation begins

```
Here are the requirements for [feature]: [paste requirements]

Act as a QA engineer and product manager combined. Identify:
1. Ambiguous requirements that could be interpreted multiple ways
2. Missing requirements that users would expect
3. Edge cases not addressed by the requirements
4. Potential conflicts between requirements
5. Security implications not mentioned
6. Accessibility requirements not specified

For each issue, suggest a clarifying question to ask the product owner.
```

---

## Prompt 5: Requirements Negotiation

**Source:** Hacker News discussion (item 46866481)
**Pattern:** AI as product owner
**Why it works:** Helps solo developers or teams without strong PO get requirements clarity

```
Act as a product owner for a [type of application]. I'm going to describe
what I want to build, and I want you to push back on scope, ask about
priorities, and help me identify the minimum viable feature set.

My idea: [describe the product/feature]

For each feature I mention, classify it as:
- Must-have (launch blocker)
- Should-have (next iteration)
- Nice-to-have (future backlog)

Challenge me if I'm trying to do too much in the first release.
```

---

## Prompt 6: User Story Generation

**Source:** Dev.to, multiple prompt collections
**Pattern:** Structured requirements output
**Why it works:** Produces standardized, testable requirements

```
Given this feature description: "[high-level feature description]"

Generate user stories covering:
- The primary happy path
- Error/failure scenarios
- Edge cases (empty states, boundary values, concurrent access)
- Admin/power user variations

Format each as:
**As a** [role]
**I want** [capability]
**So that** [benefit]

**Acceptance Criteria:**
- Given [context], when [action], then [expected result]
```
