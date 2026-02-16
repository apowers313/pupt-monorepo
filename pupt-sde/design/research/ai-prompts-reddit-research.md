# Comprehensive Research: How Software Developers Use AI Prompts
## Focused on Reddit Communities and Developer Discussions (2024-2026)

---

## Table of Contents
1. [Research Methodology](#research-methodology)
2. [Key Statistics and Data](#key-statistics-and-data)
3. [Trust and Distrust Patterns](#trust-and-distrust-patterns)
4. [Prompt Categories with Examples](#prompt-categories-with-examples)
5. [What Works vs What Doesn't](#what-works-vs-what-doesnt)
6. [Tool-Specific Findings](#tool-specific-findings)
7. [Developer Sentiment Analysis](#developer-sentiment-analysis)
8. [Sources and URLs](#sources-and-urls)

---

## 1. Research Methodology

This research synthesizes findings from 30+ web searches and 15+ deep article analyses targeting Reddit communities (r/ChatGPT, r/programming, r/webdev, r/LocalLLaMA, r/ExperiencedDevs, r/learnprogramming, r/MachineLearning, r/ArtificialIntelligence, r/ClaudeAI, r/cursor, r/CopilotAI) and adjacent developer communities (DEV.to, Stack Overflow, Hacker News, Medium, Substack).

---

## 2. Key Statistics and Data

### From the 2025 Stack Overflow Developer Survey:
- **80% of developers** now use AI tools in their workflows
- **Trust in AI accuracy fell from 40% to 29%** year-over-year
- **Positive favorability decreased from 72% to 60%**
- **45% cite** "AI solutions that are almost right, but not quite" as their top frustration
- **66% spend more time** fixing "almost-right" AI-generated code than writing it from scratch
- **75% of developers** still prefer asking another person for help when they don't trust AI answers
- **72% said** generating entire applications from prompts is NOT part of their professional work
- **69% report** increased personal productivity from AI agents
- **46% of developers** say they don't trust the accuracy of AI output (up from 31% the prior year)

### From Reddit Community Analysis:
- **78% of Reddit developers** prefer Claude over ChatGPT for coding tasks (based on 500+ thread analysis)
- **Senior developers (10+ years)** ship 2.5x more AI-generated code than juniors (33% vs 13%)
- Only **2.6% of experienced developers** highly trust AI outputs; **20% highly distrust** them
- **76% of developers** use AI tools daily, reporting a **55% productivity boost**

### From Security Research:
- **45% of AI-generated code** failed security tests (Veracode study across 100+ LLMs)
- Up to **30% of packages** suggested by AI tools are hallucinated (don't exist)
- AI included bugs like improper password handling at a **1.5-2x greater rate** than human coders

### Productivity Paradox:
- In a randomized controlled trial, experienced developers using AI took **19% longer** on average to complete tasks
- Microsoft research found prompts with explicit specifications reduced back-and-forth by **68%**
- Frontier models can follow approximately **150-200 instructions** with reasonable consistency

---

## 3. Trust and Distrust Patterns

### The Adoption Paradox
Developers use AI more but trust it less. The most revealing finding: **senior developers use AI the most precisely BECAUSE they trust it the least**. They have the expertise to catch "almost right" errors, use it for acceleration, and treat it as a tool rather than an authority.

### Trust Spectrum by Experience Level:

| Experience | Trust Level | Usage Pattern |
|---|---|---|
| Junior (0-2 yrs) | Medium trust, low usage (13% of shipped code is AI-generated) | Use for learning, often over-rely on output |
| Mid-level (3-7 yrs) | Mixed trust, moderate usage | Use for boilerplate and debugging |
| Senior (10+ yrs) | Low trust, highest usage (33% of shipped code) | Use as accelerator, always verify |

### Common Trust Patterns:
1. **"Trust but verify" is the dominant approach** -- developers treat AI output like a PR from a junior dev
2. **Privacy consciousness** -- multiple Reddit mentions of checking company policies before using AI with proprietary code
3. **Skill development anxiety** -- concern that AI tools can "harm learning when used to avoid thinking"
4. **Context window trust** -- developers trust Claude more for large codebases (200K tokens) vs ChatGPT which "loses context after 500 lines"
5. **Hallucination wariness** -- the #1 fear; AI inventing methods, libraries, or packages that don't exist

### Developer Quotes on Trust (from Reddit discussions):
- "AI is powerful, but blind trust in it without critical thinking is a problem. The overconfidence without comprehension is especially frustrating."
- "Be careful, Copilot can make you lazy, verify everything it suggests."
- "Don't risk your job, always get approval first" (re: proprietary code)
- "AI changed everything" (positive) vs "AI coding sucks" (negative) -- the divide correlates with experience level and prompting skill

---

## 4. Prompt Categories with Examples

### CATEGORY A: Code Generation and Scaffolding

**Effective Prompts:**

1. **Auth System Boilerplate:**
```
Build a basic authentication system in [framework] using [language]. It should
support login, logout, session/token management, and user registration. Use
secure password hashing and include input validation.
```

2. **API Endpoint with Validation:**
```
Write a REST API endpoint using [framework] that accepts a POST request with
[fields]. Validate input, handle errors, and respond with appropriate status
codes.
```

3. **Full CRUD Operations:**
```
Generate the full CRUD logic for managing a [resource] in [framework]. Include
model definition, controller methods, and route setup.
```

4. **React Component:**
```
Create a React component named [ComponentName] that receives props [prop1, prop2],
maintains local state [state1], and updates state based on user input. Include
type annotations if using TypeScript.
```

5. **MVP Boilerplate Generator (copy-paste ready):**
```
You are an expert full-stack developer building an MVP for [DESCRIBE YOUR PRODUCT].
Tech Stack: [LIST YOUR TECHNOLOGIES]
Key Features: [LIST 3-5 CORE FEATURES]
Generate the following:
1. Project folder structure
2. Database schema with relationships
3. API endpoints for core features
```

6. **Feature with Constraints:**
```
Create a React To-Do list with add/remove, no external UI libraries, and explain
each hook.
```

**What Makes These Work:**
- Specific about language, framework, and tech stack
- Clear requirements and constraints
- Defined output format
- Explicit about what to include (validation, error handling, etc.)

**What Doesn't Work:**
- "Create a button" (too vague)
- "Build me a complete social media app" (too broad)
- "Write a function" (no context)
- "Make a webpage" (no specifications)

---

### CATEGORY B: Debugging and Error Resolution

**Effective Prompts:**

1. **Structured Bug Report:**
```
I have a JavaScript function mapUsersById that should convert an array of user
objects into a map keyed by user ID. However, it throws an error when I run it.
For example, when I pass [{id: 1, name: 'Alice'}], I get TypeError: Cannot read
property 'id' of undefined. Here is the function code: [code]. It should return
{'1': {id: 1, name: 'Alice'}}. What is the bug and how can I fix it?
```

2. **Step-by-Step Code Detective (copy-paste ready):**
```
You are an expert debugger helping me solve an issue.
Problem Context:
- Language: [YOUR PROGRAMMING LANGUAGE]
- Expected behavior: [WHAT SHOULD HAPPEN]
Please:
1. Walk through this function line by line
2. Track the value of each variable
```

3. **Line-by-Line Walkthrough:**
```
Walk through this function line by line and track the value of [variable] at
each step. It's not accumulating correctly -- where does the logic go wrong?
```

4. **React Infinite Render Bug (enhanced):**
```
I have a React component that fetches user data, but it's causing infinite
re-renders. Here's my code: [code]. Expected behavior: Should fetch user data
once when userId changes. Actual behavior: Component re-renders infinitely.
Error in console: 'Warning: Maximum update depth exceeded.' What's causing this
infinite loop and how do I fix the dependency array?
```

5. **Symptom-to-Solution (Claude Code specific):**
```
Users are being logged out after 5 minutes even though the session timeout should
be 60 minutes.
```
(Note: This works because it describes the specific discrepancy, not just the symptom)

**Universal Debugging Template:**
```
I have a [language] function that should [expected behavior], but it [actual
behavior/error]. When I pass [example input], I get [actual output]. Here's
the code: [code]. It should return/do [expected output]. What's the bug?
```

**What Doesn't Work:**
- "This doesn't work, fix it" (no context)
- "The code doesn't work" (no specifics)
- "Why isn't my code working?" (too vague)
- "users are getting logged out too fast" (symptom without specifics)

**Key Insight:** "Guiding the LLM toward a solution approach -- not just describing the symptom -- can be the difference between iterating endlessly and solving the problem in one shot."

---

### CATEGORY C: Code Review

**Effective Prompts:**

1. **Senior Engineer Review:**
```
Review this pull request as a senior engineer. Focus on logic errors, edge cases,
and maintainability. Explain why each issue matters and suggest concrete fixes.
Ignore purely stylistic preferences.
```

2. **Readability and Best Practices:**
```
Refactor the following code to be more readable, modular, and aligned with
[language] best practices. Avoid redundant code and suggest naming improvements:
[insert code]
```

3. **Role-Based Review:**
```
Act as a code reviewer. Here's a snippet that isn't working as expected. Review
it and point out any mistakes or bad practices that could be causing issues.
```

4. **Security-Focused Review:**
```
Analyze the following SQL query and identify potential security risks. Suggest
safer alternatives with explanations.
```

5. **General Review Template:**
```
Act as a [level] [language/framework] developer. Review this code for [specific
concerns]: [code]. What improvements would you suggest?
```

**What Doesn't Work:**
- "Review this pull request." (too vague, produces generic inconsistent feedback)
- "Is this code good?" (no direction on what to evaluate)

**Key Insight:** "The difference isn't intelligence, it's direction" -- properly scoped instructions transform AI feedback from noise into actionable insight.

---

### CATEGORY D: Testing

**Effective Prompts:**

1. **Comprehensive Unit Tests:**
```
For the following function [pasted code], generate a complete Jest test suite.
Include:
- Happy path tests with standard inputs
- Tests for edge cases: empty input, null, extreme values
- Tests that verify specific error messages are thrown for invalid arguments
- A test that mocks the axios dependency to simulate a network failure
- Aim for 100% branch coverage
- Structure the tests using describe and it blocks
```

2. **Simple Unit Test Generation:**
```
Write unit tests in [testing framework] for this function: [insert function].
Cover edge cases, invalid input, and normal operation.
```

3. **Manual-to-Automated Testing:**
```
I currently test this manually:
Step 1: Open the app
Step 2: Enter user input
Step 3: Verify result
Convert this into an automated test in [framework].
```

4. **Test Case Brainstorming:**
```
Can you provide a couple of test cases (inputs) that might break this function?
```

5. **Test-First Approach (Cursor-specific):**
```
Write tests first, then the code, then run the tests and update the code until
tests pass.
```

**Key Insight:** "Write tests first, lock them, and generate code until all tests pass" is a powerful pattern. AI-generated tests serve as a specification that the AI then implements against.

---

### CATEGORY E: Refactoring

**Effective Prompts:**

1. **Specific Refactoring Goals:**
```
Refactor the above getCombinedData function to eliminate duplicate code and
improve performance. Specifically:
(1) Avoid repeating the fetch logic for users and orders -- maybe use a helper
    or fetch them together.
(2) Fetch both lists in parallel if possible.
(3) Keep the error handling for each fetch (we want to know which call failed).
(4) Improve the combination of data, possibly by using a more efficient structure
    for lookup instead of a nested loop.
Provide the refactored code with comments explaining the changes.
```

2. **Legacy Code Modernization:**
```
Explain this legacy code in simple terms. Summarise what each function does and
how they connect.
```
Then follow up with:
```
List the code smells in this file.
```
Then:
```
Split this 150-line method into multiple single-responsibility functions and
remove nested conditionals.
```

3. **Design Pattern Application:**
```
Rewrite this code using the [pattern name] design pattern. Explain the benefits
of this pattern in this context: [insert code]
```

4. **Paradigm Shift:**
```
I have a React component written as a class. Please refactor it to a functional
component using Hooks.
```

5. **Refactoring Template:**
```
Refactor the following [component/function] to: (1) [goal 1], (2) [goal 2],
(3) [goal 3]. Provide the refactored code with comments explaining the changes.
```

**What Doesn't Work:**
- "Refactor this code" (no goals specified)
- "Make this function faster" (no metrics defined)

**Key Caveat:** AI often misidentifies business-critical legacy logic as "inconsistencies" and refactors them away. Human oversight is essential for legacy code.

---

### CATEGORY F: Documentation

**Effective Prompts:**

1. **JSDoc Generation:**
```
Generate comprehensive JSDoc for this function, including a one-sentence summary,
detailed description of each parameter with their expected types and constraints,
the return type, and possible exceptions thrown.
```

2. **Developer Documentation:**
```
Document the following function with clear purpose, parameter details, return
types, and usage example in Markdown format: [insert function]
```

3. **Comprehensive Documentation (copy-paste ready):**
```
You are a technical documentation specialist. Generate comprehensive documentation
including:
1. API documentation with endpoint descriptions
2. README file with setup instructions
3. User onboarding guide
```

4. **Concept Explanation:**
```
Explain the concept of [e.g. memoization, currying, event loop] in [language].
Include a short code example and discuss when and why to use it.
```

---

### CATEGORY G: Architecture and System Design

**Effective Prompts:**

1. **Scalable Architecture (copy-paste ready):**
```
You are a senior software architect specializing in scalable system design.
I'm building a [type of app: e.g. real-time chat, e-commerce store].
Suggest a scalable architecture including frontend, backend, database, and any
caching or queuing solutions. Use [cloud provider] as infrastructure.
```

2. **Architecture Evaluation:**
```
Here's the current system design for my application: [Describe the architecture].
Evaluate it for scalability, redundancy, and performance. Suggest improvements.
```

3. **Migration Planning:**
```
I need to migrate our application from a monolithic architecture to microservices.
Let's approach this one step at a time, and for each step, I'd like you to
present multiple approaches with their pros and cons.
```

4. **State Architecture Decision:**
```
I'm building a Next.js 14 e-commerce app and need to design the state management
architecture. Here are my requirements: [components listed]. Technical constraints:
[constraints]. Should I use:
1) Zustand stores for each domain
2) React Query/TanStack Query for server state + Zustand for client state
3) A single Zustand store with slices?
Please provide a recommended architecture with code examples showing how to
structure stores and integrate with Next.js App Router patterns.
```

---

### CATEGORY H: DevOps and CI/CD

**Effective Prompts:**

1. **CI/CD Workflow:**
```
Generate a GitHub Actions workflow that:
- Runs tests on push
- Builds a Docker image
- Deploys to [hosting provider] on success
```

2. **Environment Setup Script:**
```
Write a Bash script that installs [tools], sets up environment variables, and
configures Git for a new developer machine.
```

3. **Dockerfile Generation:**
```
Generate a Dockerfile to containerize a [technology/framework] application with
specifications for base image, dependencies, ports, and optimization.
```

---

## 5. What Works vs What Doesn't

### What Works (Consensus from Reddit + Developer Communities):

1. **Specificity and context** -- Include language, framework, error messages, expected vs actual behavior
2. **Role-based prompting** -- "Act as a senior React developer" primes better responses
3. **Breaking tasks down** -- "One chat, one feature"; break each feature into 3-5 smaller tasks
4. **Iterative refinement** -- Treat first output as a draft; refine through follow-ups
5. **Providing examples** -- "Given the array [3,1,4], this function should return [1,3,4]"
6. **The Q&A strategy** -- Force AI to ask clarifying questions before providing solutions
7. **Test-driven development** -- Write tests first, then generate code to pass them
8. **Context management** -- Use CLAUDE.md / .cursorrules / system prompts to maintain project context
9. **Popular, well-documented frameworks** -- AI performs much better with Next.js, Supabase, Tailwind than niche stacks
10. **Frequent commits** -- "Save points in a game" to recover from AI missteps
11. **Multi-model strategy** -- Use Claude for complex code, ChatGPT for quick fixes, different model for review
12. **Clear constraints** -- "(Do not change anything I did not ask for)"

### What Doesn't Work (Consensus from Reddit + Developer Communities):

1. **Vague prompts** -- "Fix this", "It doesn't work", "Write a function"
2. **Monolithic requests** -- Asking for an entire app or large feature in one prompt
3. **Long chats without context reset** -- AI loses coherence over extended conversations
4. **Rare or outdated tech stacks** -- AI performs poorly with niche libraries
5. **Trusting without verification** -- 45% of AI code fails security tests
6. **Continuing past 3 failed debugging attempts** -- Better to reset and try a different approach
7. **Using AI for business logic you don't understand** -- AI can't know your domain
8. **Vague success criteria** -- "Make this faster" without defining metrics
9. **Dumping code without a question** -- Always include a clear ask
10. **Ignoring AI's clarification questions** -- The AI is trying to help you help it
11. **Expecting autonomy** -- AI is an accelerator, not an autonomous coder
12. **Skipping code review** -- AI output needs the same scrutiny as junior dev code

---

## 6. Tool-Specific Findings

### Claude (r/ClaudeAI)
- **Sentiment:** Highly positive for coding (78% preference)
- **Strengths:** 200K token context window, maintains consistency across 3000+ lines, structured/logical responses, strong for architecture planning
- **Weaknesses:** Rate limits frustrate heavy users, requires subscription
- **Key Quote:** "I switched to Claude yesterday and it helped me make an entire phone app. Incredibly more powerful and truly feels like it listens to what you say."
- **Killer Feature:** CLAUDE.md files for persistent project context across sessions
- **Best For:** Production code, complex logic, multi-step debugging, architectural decisions, sustained context maintenance

### ChatGPT (r/ChatGPT)
- **Sentiment:** Positive for speed and learning, negative for complex coding
- **Strengths:** Fast responses (4x faster than Claude), good for quick debugging, strong explanation capabilities, web search and DALL-E integration
- **Weaknesses:** "Context drift" beyond 500 lines, loses architectural consistency, less accurate for complex code
- **Key Quote:** "Claude smokes GPT4 for Python"
- **Best For:** Quick fixes, documentation generation, code explanation, rapid iteration, learning

### GitHub Copilot (r/CopilotAI)
- **Sentiment:** Positive for autocomplete, mixed for complex tasks
- **Strengths:** Seamless VS Code integration, excellent boilerplate generation, inline suggestions
- **Weaknesses:** "Sometimes goes off-track, suggesting irrelevant code"; when logic gets complex, "it has no clue what you actually want"
- **Key Quote:** "Feels like a coding partner that just gets me" / "Be careful, Copilot can make you lazy"
- **Cost Sentiment:** 75% of professional developers say $10/month is "worth it"
- **Best For:** Boilerplate, autocomplete, inline code completion, repetitive patterns

### Cursor (r/cursor)
- **Sentiment:** Rapidly growing enthusiasm, especially among power users
- **Strengths:** Multi-file editing (Composer mode), codebase-wide context, .cursorrules for project configuration, YOLO mode for automated testing loops
- **Weaknesses:** Learning curve for effective prompting
- **Key Quote:** "Cursor changed my entire workflow" / "Like having a Stack Overflow genie that actually edits my source code"
- **Key Tip:** Use Cmd+K for local scope fixes, Cmd+L for explanations, Cmd+I for global refactoring
- **Best For:** Large codebases, multi-file refactoring, project-wide changes

### Codeium
- **Sentiment:** Positive, especially for cost-conscious developers
- **Strengths:** Free tier, supports 70+ languages, lightweight
- **Weaknesses:** Less contextual power than premium alternatives
- **Key Quote:** "Codeium is best free alternative. Period." -- estimated at "80-85% of Copilot quality"

### DeepSeek
- **Sentiment:** Growing interest, especially in r/LocalLLaMA
- **Strengths:** Strong reasoning capabilities, cost-effective
- **Weaknesses:** Slower inference, smaller community

---

## 7. Developer Sentiment Analysis

### Positive Sentiments:
- AI tools save time on boilerplate and repetitive tasks
- Excellent for learning and understanding new concepts
- Great "rubber duck" for debugging
- Cross-language translation is powerful
- Architecture planning and brainstorming benefit significantly
- Test generation is a major time saver

### Negative Sentiments:
- "Almost right" code creates more work than writing from scratch
- AI "solves the wrong problem, or solves the right problem badly"
- Loss of programming satisfaction and the joy of problem-solving
- Unpredictability -- "same prompt, different response every time"
- AI tuned for task completion rather than correctness (adding TypeScript "any", commenting out failing tests)
- Security vulnerabilities in generated code
- Hallucinated packages creating attack vectors
- "Generate code, debug code, question why the AI chose this approach, rewrite code, repeat"

### The Experience Divide:
Experienced leaders are having radically different experiences with the same tools. The difference is whether developers treat AI as:
- **A pair programmer** (causes frustration -- too autonomous, too unpredictable)
- **A directed development tool requiring expert orchestration** (enables productivity)

### Emerging Consensus:
The developer remains the senior engineer. AI is an accelerator, not an autonomous coder. The strongest results come from experienced developers who understand what they're asking for and can evaluate what they get back.

---

## 8. Sources and URLs

### Reddit Community Aggregation Articles:
1. https://www.aitooldiscovery.com/guides/best-ai-for-coding-reddit -- Best AI for Coding: Reddit's Top Picks for 2026
2. https://www.aitooldiscovery.com/guides/claude-vs-chatgpt-reddit -- Claude vs ChatGPT Reddit 2026: Developer Preferences
3. https://wpreset.com/reddits-best-vibe-coding-ai-recommendations-for-developers/ -- Reddit's Best Vibe Coding AI Recommendations
4. https://reelmind.ai/blog/reddit-s-best-ai-coding-prompts-boost-your-development-workflow -- Reddit's Best AI Coding Prompts
5. https://reelmind.ai/blog/reddit-best-ai-coding-prompt-helpers-engineering-optimize-your-development -- Reddit AI Coding Prompt Engineering

### Prompt Engineering Guides:
6. https://addyo.substack.com/p/the-prompt-engineering-playbook-for -- The Prompt Engineering Playbook for Programmers (Addy Osmani)
7. https://addyosmani.com/blog/ai-coding-workflow/ -- My LLM Coding Workflow Going into 2026 (Addy Osmani)
8. https://prompt.16x.engineer/blog/effective-ai-coding-tips -- Top 10 Battle-Tested Tips for Effective AI Coding
9. https://dev.to/extinctsion/the-art-of-talking-to-ai-prompts-that-actually-work-for-coding-4fpe -- The Art of Talking to AI: Prompts That Actually Work for Coding
10. https://dev.to/therealmrmumba/my-20-favorite-chatgpt-prompts-for-coding-in-2025-5hk3 -- My 20 Favorite ChatGPT Prompts for Coding in 2025
11. https://portkey.ai/blog/basic-ai-prompts-for-developers/ -- Basic AI Prompts for Developers: Practical Examples
12. https://altersquare.io/5-ai-prompts-every-developer-should-master-copy-paste-ready/ -- 5 AI Prompts Every Developer Should Master

### Trust and Sentiment Research:
13. https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/ -- Stack Overflow 2025 Developer Survey: AI Trust & Adoption
14. https://the-decoder.com/developers-rely-on-ai-tools-more-than-ever-but-trust-is-slipping/ -- Developers Rely on AI More, Trust Is Slipping
15. https://byteiota.com/ai-developer-trust-hits-all-time-low-46-distrust/ -- AI Developer Trust Hits All-Time Low
16. https://shiftmag.dev/stack-overflow-survey-2025-ai-5653/ -- 84% of developers use AI, yet most don't trust it

### Tool-Specific Resources:
17. https://www.dzombak.com/blog/2025/10/getting-good-results-from-claude-code-writing-good-prompts/ -- Getting Good Results from Claude Code
18. https://www.humanlayer.dev/blog/writing-a-good-claude-md -- Writing a Good CLAUDE.md
19. https://www.builder.io/blog/claude-md-guide -- The Complete Guide to CLAUDE.md
20. https://github.com/PatrickJS/awesome-cursorrules -- Awesome CursorRules Collection
21. https://cursor.directory/ -- Cursor Rules Directory
22. https://forum.cursor.com/t/good-examples-of-cursorrules-file/4346 -- Cursor Forum: Good .cursorrules Examples

### Code Review Prompts:
23. https://dev.to/yeahiasarker/code-review-ai-prompts-how-to-get-better-pull-request-reviews-from-ai-1mad -- Code Review AI Prompts: Better PR Reviews
24. https://graphite.com/guides/effective-prompt-engineering-ai-code-reviews -- Effective Prompt Engineering for AI Code Reviews
25. https://www.josecasanova.com/blog/claude-code-review-prompt -- Simple Claude Code Review Prompt

### Developer Frustrations and Analysis:
26. https://medium.com/@anoopm75/the-uncomfortable-truth-about-ai-coding-tools-what-reddit-developers-are-really-saying-f04539af1e12 -- The Uncomfortable Truth About AI Coding Tools (Reddit Analysis)
27. https://hyperdev.matsuoka.com/p/when-ai-coding-feels-like-yelling -- When AI Coding Feels Like Yelling at a Black Box
28. https://www.ksred.com/ai-for-coding-why-most-developers-are-getting-it-wrong-and-how-to-get-it-right/ -- AI for Coding: Why Most Developers Get It Wrong
29. https://jellyfish.co/library/ai-in-software-development/risks-of-using-generative-ai/ -- The Risks of Using AI in Software Development
30. https://news.ycombinator.com/item?id=44974183 -- HN: AI Coding Negativity Discussion

### Vibe Coding and Modern Workflows:
31. https://seroter.com/2025/07/07/quality-focused-prompts-for-the-vibe-coding-addict/ -- Quality-Focused Prompts for the Vibe Coding Addict
32. https://blog.logrocket.com/vibe-coding-vs-prompt-engineering/ -- Kill Vibe Coding, Bring Back Prompt Engineering
33. https://dev.to/dumebii/the-ultimate-prompt-strategy-how-to-vibe-code-production-ready-websites-4e9 -- The Ultimate Prompt Strategy for Production-Ready Vibe Coding

### AI Hallucinations and Failures:
34. https://simonwillison.net/2025/Mar/2/hallucinations-in-code/ -- Hallucinations in Code Are the Least Dangerous LLM Mistakes
35. https://whenaifail.com/category/ai-coding/ -- AI Coding Fails and Horror Stories
36. https://cacm.acm.org/news/nonsense-and-malicious-packages-llm-hallucinations-in-code-generation/ -- LLM Hallucinations in Code Generation (ACM)

### Testing with AI:
37. https://dev.to/techiesdiary/chatgpt-prompts-for-test-drive-development-and-unit-testing-834 -- ChatGPT Prompts for TDD and Unit Testing
38. https://www.readysetcloud.io/blog/allen.helton/tdd-with-ai/ -- Test-Driven Development with AI

### Refactoring with AI:
39. https://builtin.com/articles/code-refactoring-prompt -- 35 Code Refactoring Prompts for AI
40. https://understandlegacycode.com/blog/can-ai-refactor-legacy-code/ -- Can AI Help Me Refactor Legacy Code?

---

## Appendix: Meta-Prompting Strategies

### The Four Modes of Prompting (from developer blogs):

1. **Plan Mode:** Strip away code. Ask the AI to analyze requirements, identify risks, and propose architecture before writing anything.

2. **Build Mode:** Be concrete, short, and direct. Let the AI deliver working code for a single well-defined task.

3. **Debug Mode:** Show your work -- share inputs, errors, environment. Let the AI diagnose before asking it to build a fix.

4. **Review Mode:** Ask the AI to critique code for specific quality attributes (performance, security, maintainability) rather than general review.

### The CIFC Framework (for prompt construction):
- **C**ontext -- The role the AI should play
- **I**nstructions -- One clear command
- **C**ontent -- The information to work on
- **F**ormat -- How the response should be structured

### Project Configuration Files:
- **CLAUDE.md** -- Persistent project context for Claude Code (keep under 300 lines, under 1K tokens ideally)
- **.cursorrules** -- Project-specific AI instructions for Cursor IDE
- **System prompts** -- Role-based context setting at session start
- **spec.md / plan.md** -- AI-generated project plans loaded as context

### Anti-Patterns to Avoid:
1. The Vague Prompt -- no context, no specifics
2. The Overloaded Prompt -- multiple complex tasks at once
3. Missing the Question -- dumping code without a clear ask
4. Vague Success Criteria -- "make it better" without defining what "better" means
5. Ignoring AI's Clarification -- dismissing helpful questions
6. Varying Style -- inconsistent formatting and voice in prompts
7. Vague References -- "refactor the above code" in long conversations without re-quoting
