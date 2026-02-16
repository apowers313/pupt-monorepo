# Architecture & Design Prompts

**SDLC Phase:** System Design, Technical Architecture
**Category Clarity:** CLEAR (but overlaps with planning)
**Developer Trust:** LOW (~30% find AI adequate for detailed design)

---

## Prompt 1: Multi-Option Architecture Evaluation

**Source:** Reddit communities, developer blogs
**Pattern:** Tree of Thoughts -- evaluate multiple approaches
**Why it works:** Presents options with tradeoffs for human decision-making

```
I need to design the [component/system] for a [type of application].

Requirements:
- [requirement 1]
- [requirement 2]
- [requirement 3]

Propose 3 different architectural approaches. For each:
1. Describe the approach and key technology choices
2. Draw out the component relationships
3. Evaluate: query performance, write complexity, data consistency, scalability
4. List pros and cons
5. Identify when this approach is the WRONG choice

Score each on a scale of 1-5 for each criterion. Recommend one approach
and explain why, but let me make the final decision.
```

---

## Prompt 2: State Architecture Decision

**Source:** Reddit r/cursor, developer blogs
**Pattern:** Constrained architecture prompt
**Why it works:** Provides specific enough context for a useful recommendation

```
I'm building a [framework] [type of app] and need to design the state
management architecture.

Components that need shared state:
- [component 1]: needs [data]
- [component 2]: needs [data]
- [component 3]: needs [data]

Technical constraints:
- [constraint 1, e.g., "Server-side rendering required"]
- [constraint 2, e.g., "Real-time updates from WebSocket"]
- [constraint 3, e.g., "Offline support needed"]

Should I use:
1) [Option A]
2) [Option B]
3) [Option C]

Provide a recommended architecture with code examples showing how to
structure stores/providers and integrate with [framework patterns].
```

---

## Prompt 3: Migration Planning

**Source:** Reddit, architecture discussion forums
**Pattern:** Step-by-step decomposition with options
**Why it works:** Breaks complex migration into manageable phases

```
I need to migrate our application from [current architecture] to
[target architecture].

Current state:
- [describe current tech stack, scale, team size]
- [describe pain points driving migration]

Let's approach this one step at a time. For each migration step:
1. What to migrate and why this ordering
2. Multiple approaches with pros/cons
3. Risk assessment (what could go wrong)
4. Rollback strategy
5. How to maintain both systems during transition
6. Estimated effort level (S/M/L/XL)

Start with Step 1: What should we migrate first and why?
```

---

## Prompt 4: Architecture Review / Critique

**Source:** Hacker News, architect blogs
**Pattern:** Expert review role
**Why it works:** Gets a second opinion on design decisions

```
Here's the current system design for my application:

[Describe or diagram the architecture]

Evaluate this architecture for:
1. **Scalability**: Can it handle 10x current load? What breaks first?
2. **Reliability**: What are the single points of failure?
3. **Security**: What attack surfaces exist?
4. **Operability**: How easy is it to deploy, monitor, and debug?
5. **Cost**: Where are the expensive parts? Any over-provisioning?

For each concern identified, rate it as Critical/Major/Minor and suggest
a specific improvement.
```

---

## Prompt 5: Database Schema Design

**Source:** Dev.to, database-focused prompts
**Pattern:** Constrained design with evaluation criteria
**Why it works:** Produces evaluable design with explicit tradeoffs

```
Design a database schema for [domain/application].

Key entities and their relationships:
- [entity 1] has many [entity 2]
- [entity 2] belongs to [entity 1] and [entity 3]
- [etc.]

Requirements:
- [query pattern 1, e.g., "List all orders for a user, sorted by date"]
- [query pattern 2, e.g., "Aggregate monthly revenue by product category"]
- [write pattern, e.g., "Create order with 1-50 line items atomically"]

Constraints:
- Database: [PostgreSQL/MySQL/etc.]
- Expected scale: [number of rows, queries/second]

Provide:
1. The schema with proper types, constraints, and indexes
2. Explanation of indexing strategy for the query patterns
3. Any denormalization decisions and their tradeoffs
```

---

## Prompt 6: API Design

**Source:** Multiple developer blogs, Graphite guides
**Pattern:** Contract-first design
**Why it works:** Produces a reviewable API contract before implementation

```
Design a REST API for [resource/domain].

Operations needed:
- [operation 1, e.g., "Create a new order with items"]
- [operation 2, e.g., "List orders with filtering and pagination"]
- [operation 3, e.g., "Update order status"]

For each endpoint provide:
- HTTP method and URL pattern
- Request body schema (with types and validation rules)
- Response body schema (with example)
- Error responses (with status codes and error body format)
- Authentication requirements
- Rate limiting considerations

Follow [REST/GraphQL] conventions. Use consistent naming (snake_case/camelCase).
Include pagination, filtering, and sorting patterns where applicable.
```
