# Software Architecture Design & Decision-Making Framework

A research-backed reference framework for software architecture best practices, compiled from academic studies, industry standards, and practitioner experience.

---

## 1. Architecture Decision-Making

### 1.1 Structured Decision Processes

Effective architecture decisions require structured, evidence-based processes rather than ad hoc judgment. Research from the Software Engineering Institute (SEI) at Carnegie Mellon shows that architecture decisions benefit from explicit stakeholder involvement, scenario-based evaluation, and documented rationale.

Key findings:
- Architecture decisions should involve diverse stakeholders: developers, architects, product managers, business users, and operations (DevCom, "Successful Software Architecture Review")
- Decentralized decision-making (anyone can make decisions, but must seek advice from affected parties and domain experts) improves outcomes when combined with accountability through documentation (Thoughtworks, Harmel-Law 2024)
- The most common failure mode is lack of a structured approach: teams that informally discuss options without systematic evaluation tend to make poorer decisions (Arxiv, "Software Architecture Decision-Making Practices", 2016)

### 1.2 Decision Matrices and Weighted Scoring

A weighted decision matrix provides quantitative, reproducible architecture evaluations:

| Step | Action |
|------|--------|
| 1 | List candidate options (patterns, technologies, approaches) |
| 2 | Define 4-8 evaluation criteria derived from quality attribute requirements |
| 3 | Assign weights to criteria based on stakeholder priorities |
| 4 | Score each option against each criterion (1-5 scale) |
| 5 | Multiply scores by weights and sum for total weighted score |
| 6 | Document sensitivity analysis: which criteria weight changes would flip the decision? |

Source: James Sheen, "Master Your Decisions: How to Use Decision Matrices in Software Engineering" (Medium); ZEISS Digital Innovation Blog, "The Perfect Decision Matrix"

### 1.3 Reversibility Classification

Amazon/AWS popularized classifying decisions as:
- **Type 1 (Irreversible)**: High-cost to reverse (database engine, primary programming language, cloud provider). Warrant extensive analysis.
- **Type 2 (Reversible)**: Low-cost to reverse (library choices, internal API designs, CI tool). Warrant quick decisions with monitoring.

This classification calibrates decision-making effort to actual stakes.

---

## 2. Architecture Decision Records (ADRs)

### 2.1 Empirical Evidence

A 2024 action research study (Ahmeti et al., ECSA 2024, published by Springer and ACM) introduced ADRs in a company developing a microservice-based system. After three months of ADR adoption:
- Documentation culture improved significantly
- Knowledge transfer between team members became more effective
- Prioritization of architectural information improved
- Cooperation among teams improved
- However, challenges from distributed systems documentation (where to store ADRs across repos) remained partially unresolved

A broader study of open-source repositories found that ADR adoption remains low overall, with ~50% of repositories containing only 1-5 ADRs, but repositories using them systematically showed team-wide participation over sustained periods.

Sources:
- Ahmeti et al., "Architecture Decision Records in Practice: An Action Research Study" (ECSA 2024): https://link.springer.com/chapter/10.1007/978-3-031-70797-1_22
- ADR community standards: https://adr.github.io/

### 2.2 ADR Templates

**Michael Nygard Template** (the original, from 2011):
1. **Title**: Short description of the decision
2. **Status**: Proposed / Accepted / Deprecated / Superseded
3. **Context**: Forces at play, including technical, political, social, and project-specific
4. **Decision**: The response to those forces
5. **Consequences**: All resulting context (positive, negative, and neutral)

**MADR (Markdown Any Decision Records)** extends this with:
- Decision drivers (explicit list of forces)
- Considered options (structured comparison)
- Pros/cons per option

**Y-Statement Template**: "[In the context of] [facing] [we decided] [and neglected] [to achieve] [accepting]"

### 2.3 ADR Best Practices

Based on AWS Prescriptive Guidance, TechTarget, and Red Hat:
- Keep ADRs short (1-2 pages)
- Store ADRs close to the code (in the repository, not a separate wiki)
- Number ADRs sequentially and never delete them (supersede instead)
- Review ADRs one month after implementation to compare expected vs. actual outcomes
- Include a "Validation" section: how to verify the decision was correct post-implementation
- Record the decision, not the discussion: ADRs are results, not meeting minutes

Source: Nygard, "Documenting Architecture Decisions" (2011): https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions

---

## 3. Architecture Documentation Approaches

### 3.1 C4 Model

Created by Simon Brown, the C4 model provides four levels of abstraction:

| Level | Name | Audience | Shows |
|-------|------|----------|-------|
| 1 | System Context | All stakeholders | System and its relationships to users/external systems |
| 2 | Container | Architects, developers | High-level technology choices, major deployable units |
| 3 | Component | Developers | Internal structure of a container |
| 4 | Code | Developers (rarely needed) | Class/module-level detail |

Best practices:
- **Not all levels are needed**: For most systems, Context + Container diagrams are sufficient
- **Every element needs**: Name, type, technology choice, and descriptive text
- **Add a key/legend** with shapes, colors, and acronyms
- **Keep diagrams in version control** alongside code
- **Avoid Code diagrams** unless the codebase is especially complex or critical

Source: https://c4model.com/

### 3.2 arc42 Template

arc42 provides 12 documentation sections for software architecture:

1. Introduction and Goals
2. Constraints
3. Context and Scope
4. Solution Strategy
5. Building Block View
6. Runtime View
7. Deployment View
8. Crosscutting Concepts
9. Architecture Decisions
10. Quality Requirements
11. Risks and Technical Debt
12. Glossary

Key strengths:
- Pragmatic and minimalistic compared to other templates
- Flexible: individual sections can be used or omitted as needed
- Addresses ISO 25010 shortcomings by offering 8 core quality properties with 189 quality attributes and 114 concrete quality requirement examples
- Suitable for any project size

Source: https://arc42.org/overview; https://quality.arc42.org/

### 3.3 "Just Enough" Documentation

Research on agile architecture documentation (Springer, "Producing Just Enough Documentation") finds:
- Documentation should be "just barely good enough" (JBGE): enough to fulfill its purpose, no more
- Defer detailed documentation creation until it is needed
- Lightweight Architecture Knowledge Management (AKM) integrated with development processes avoids maintenance and communication problems
- The most effective documentation is living documentation that evolves with the code

Source: Fairbanks, "Just Enough Software Architecture" (2010); Agile Modeling, "Core Practices for Lean/Agile Documentation"

---

## 4. Domain-Driven Design (DDD)

### 4.1 Systematic Literature Review Findings

A 2024 systematic literature review (Arxiv 2310.01905, published in Journal of Systems and Software) analyzed 36 peer-reviewed studies on DDD effectiveness:

- DDD has effectively improved software systems, particularly for complex domains
- DDD's ability to facilitate system decomposition is most valuable in microservices architectures
- Successful DDD adoption requires involving engineers, architects, managers, and domain experts
- Key challenges: knowledge barriers, onboarding difficulty, need for domain expertise
- Many DDD studies lack rigorous empirical evaluation; evidence is often anecdotal
- Industrial case studies involving microservices provide the strongest evidence
- Action research and industry collaborations yield the best insight into DDD's impact on quality, maintainability, and organizational communication

Source: "Domain-Driven Design in Software Development: A Systematic Literature Review" (Arxiv/ScienceDirect, 2024): https://arxiv.org/abs/2310.01905

### 4.2 Strategic DDD Patterns

| Pattern | Purpose | When to Apply |
|---------|---------|---------------|
| Bounded Context | Define ownership boundaries with distinct ubiquitous language | Always in complex domains; map to team boundaries |
| Context Map | Document relationships between bounded contexts | When multiple contexts exist |
| Shared Kernel | Shared model between two contexts | When tight coupling is acceptable and beneficial |
| Customer-Supplier | Upstream context serves downstream context | When clear producer-consumer relationship exists |
| Anti-Corruption Layer | Translation layer protecting one context from another | When integrating with legacy or external systems |
| Conformist | Downstream adopts upstream's model wholesale | When translation cost exceeds benefit |
| Published Language | Shared interchange format | When multiple consumers need the same data |

### 4.3 Tactical DDD Patterns

| Pattern | Purpose |
|---------|---------|
| Aggregate | Cluster of entities/value objects treated as a single unit for data changes |
| Entity | Object defined by identity, not attributes |
| Value Object | Object defined by attributes, immutable, no identity |
| Domain Event | Record of something significant that happened in the domain |
| Repository | Abstraction for accessing aggregate persistence |
| Domain Service | Operation that doesn't belong to any entity or value object |
| Factory | Encapsulates complex aggregate creation logic |

### 4.4 When to Apply DDD (Evidence-Based Criteria)

**Apply DDD when:**
- Domain complexity is the primary challenge (not technical complexity)
- Multiple teams work on the same system and need clear boundaries
- The business domain has distinct subdomains with different rates of change
- You are decomposing a monolith into services

**Avoid DDD when:**
- The domain is simple CRUD with little business logic
- The team lacks access to domain experts
- The project is a short-lived prototype or spike
- The overhead of DDD modeling exceeds the complexity it manages

Source: Fowler, "BoundedContext" (martinfowler.com); Evans, "Domain-Driven Design Reference"

---

## 5. Architecture Evaluation Methods

### 5.1 ATAM (Architecture Tradeoff Analysis Method)

Developed by the SEI at Carnegie Mellon, ATAM is the most widely cited architecture evaluation method.

**9-Step Process:**
1. Present the ATAM method
2. Present business drivers
3. Present the architecture
4. Identify architectural approaches
5. Generate quality attribute utility tree
6. Analyze high-priority approaches
7. Brainstorm and prioritize scenarios
8. Analyze with ranked scenarios
9. Present findings

**Key Outputs:**
- Identified risks (potentially problematic decisions)
- Non-risks (sound decisions)
- Sensitivity points (where small changes have large effects)
- Tradeoff points (where improving one attribute degrades another)
- Risk themes (patterns of risk threatening business goals)

**Practical Considerations:**
- A full ATAM spans 3-4 days with trained evaluators and stakeholders
- For smaller projects, an ATAM-inspired lightweight approach can be used: create a quality attribute utility tree, prioritize scenarios, and evaluate the top scenarios against the architecture

Source: SEI/CMU, "Architecture Tradeoff Analysis Method Collection": https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/

### 5.2 Quality Attributes and ISO 25010

ISO/IEC 25010:2023 defines product quality characteristics, but has notable shortcomings identified by the arc42 quality model:

**Gaps in ISO 25010:**
- Missing: scalability (added in 2023 revision), deployability, energy efficiency, safety, code quality
- Overlapping definitions (flexibility vs. maintainability)
- Strict hierarchy creates artificial placement issues (testability, availability)
- No practical application examples
- Paywall limits accessibility (~140 EUR)

**arc42 Quality Model Alternative:**
- 8 core quality properties (vs. ISO's 35+ terms)
- 189 quality attributes with practical examples
- Tagging system allowing qualities to belong to multiple categories
- Free and openly accessible

**Common Quality Attribute Tradeoffs:**

| Tradeoff | Tension |
|----------|---------|
| Performance vs. Maintainability | Optimized code is harder to change |
| Consistency vs. Availability | CAP theorem constrains distributed systems |
| Flexibility vs. Simplicity | Extension points add complexity |
| Security vs. Usability | Stronger security reduces convenience |
| Cost vs. Resilience | Higher availability requires more infrastructure |
| Scalability vs. Consistency | Horizontal scaling often requires eventual consistency |
| Development Speed vs. Quality | Shortcuts accumulate as technical debt |

Source: https://quality.arc42.org/articles/iso-25010-shortcomings

### 5.3 Architectural Fitness Functions

From "Building Evolutionary Architectures" (Ford, Parsons, Kua):

Fitness functions are automated, objective integrity assessments of architectural characteristics. They serve as guardrails that enable continuous architecture evolution.

**Types:**
| Type | Description | Example |
|------|-------------|---------|
| Atomic | Tests one architectural aspect | Unit test for cyclomatic complexity |
| Holistic | Tests combination of aspects | Integration test for security + performance |
| Triggered | Run on specific events | Pre-commit hook checking dependency rules |
| Continual | Run continuously | Production latency monitoring against SLA |

**Benefits:**
- Shift governance left: developers get fast feedback during development
- Turn architecture from subjective review into objective, continuous enforcement
- If a fitness function fails, the build fails with a clear, actionable message
- Netflix used fitness functions to guide their evolution from monolith to microservices

Source: Ford et al., "Building Evolutionary Architectures" (O'Reilly); https://www.continuous-architecture.org/practices/fitness-functions/

---

## 6. Architectural Patterns: Decision Criteria

### 6.1 Pattern Selection Framework

| Pattern | Best When | Avoid When | Key Tradeoff |
|---------|-----------|------------|--------------|
| **Modular Monolith** | Small-medium teams, early-stage, clear domain modules, budget-constrained | Need independent scaling per component, multiple language requirements | Simplicity vs. independent deployability |
| **Microservices** | Large teams (>20), independent scaling needed, polyglot requirements, mature DevOps | Small teams, early-stage products, unclear domain boundaries | Autonomy vs. operational complexity |
| **Event-Driven** | Loose coupling between producers/consumers, async workflows, audit trails | Simple CRUD, need for strong consistency, small scale | Decoupling vs. eventual consistency complexity |
| **Serverless (FaaS)** | Sporadic/unpredictable load, event-triggered processing, rapid prototyping | Sustained high throughput, long-running processes, latency-sensitive | Cost efficiency at low scale vs. control and predictability |
| **Layered** | Simple CRUD applications, small teams, well-understood domains | High-performance requirements, complex domain logic | Familiarity vs. rigidity |
| **Hexagonal (Ports & Adapters)** | Complex domain logic, need to isolate business rules from infrastructure | Simple applications, CRUD-heavy systems | Testability/flexibility vs. initial complexity |

Source: Atlassian, "Microservices vs. Monolithic Architecture"; getdx.com, "Monolithic vs Microservices"; AWS Prescriptive Guidance, "Hexagonal Architecture Pattern"

### 6.2 Modular Monolith (Emerging Consensus 2024-2025)

The modular monolith has emerged as a strong alternative to microservices:
- Combines monolith simplicity with microservices modularity practices
- Modules organized around DDD bounded contexts, not technical layers
- Internal communication via function calls (no network overhead)
- Single deployment unit but clear module boundaries
- Provides a migration path to microservices when genuinely needed

Key decision criteria for modular monolith vs. microservices:
- Team size <15: strongly favor modular monolith
- Domain boundaries unclear: start with modular monolith, extract services as boundaries solidify
- DevOps maturity low: modular monolith avoids distributed systems operational overhead
- Independent scaling needed: microservices (but verify the need is real, not hypothetical)

Source: Chris Richardson, "Architectural Patterns for Modular Monoliths" (microservices.io, 2024); Arxiv 2401.11867, "Modular Monolith: Is This the Trend in Software Architecture?"

### 6.3 CQRS and Event Sourcing

Martin Fowler's guidance on CQRS:
- CQRS is suited to complex domains (the kind that benefit from DDD)
- Apply CQRS only to specific bounded contexts, never enterprise-wide
- Do NOT use CQRS when simple CRUD suffices -- it adds unwarranted complexity
- CQRS is "a significant mental leap" and misapplication is "a significant force for getting a system into serious difficulties"
- For demanding queries without full CQRS, consider a Reporting Database pattern instead

Event Sourcing combined with CQRS:
- Provides complete audit trail and temporal queries
- Enables event replay for debugging and analytics
- Introduces eventual consistency challenges between read and write models
- Significant implementation complexity; should not be the default choice

Source: Fowler, "CQRS" (martinfowler.com/bliki/CQRS.html); Microsoft Azure Architecture Center, "CQRS Pattern"

---

## 7. Architecture Anti-Patterns and Technical Debt

### 7.1 Common Anti-Patterns

| Anti-Pattern | Description | Root Cause | Remedy |
|-------------|-------------|------------|--------|
| **Distributed Monolith** | Microservices that share databases, deploy together, or have synchronous chains | Premature decomposition without understanding domain boundaries | Identify true bounded contexts; consolidate or properly decouple |
| **Big Ball of Mud** | No discernible boundaries; everything depends on everything | Incremental growth without architectural governance | Introduce module boundaries incrementally; establish fitness functions |
| **Golden Hammer** | Choosing technology because the team knows it, not because it fits | Comfort bias, insufficient evaluation | Structured decision matrix with requirement-driven criteria |
| **Resume-Driven Development** | Choosing technologies to learn rather than to solve the problem | Individual incentives misaligned with project goals | Require explicit requirement-technology mapping in ADRs |
| **Over-Engineering** | Building for scale or flexibility that will never materialize | Fear of future unknowns; lack of evolutionary architecture thinking | YAGNI; right-size to actual requirements; plan evolution paths |
| **Vendor Lock-In** | Deep dependency on a single vendor's proprietary services | Convenience of managed services without abstraction | Hexagonal architecture; adapter layers for vendor-specific services |
| **Stovepipe/Silo** | Independent systems duplicating data and logic with no integration | Organizational silos reflected in architecture (Conway's Law) | Context mapping; integration patterns; shared events |

### 7.2 Architectural Technical Debt

Research findings from a systematic mapping study (ACM, 2023) examining 70 studies from 2012-2022:

- Architectural Technical Debt (ATD) is one of the most impactful forms of technical debt
- ATD is distinct from code-level technical debt: it affects system-wide quality, especially maintainability and evolvability
- Common ATD types: non-uniformity of patterns, architecture smells, contradictory quality attribute synergy, breaches of best practices
- ATD is "the underlying disease" while code-level technical debt is "the symptom"
- Proactive architecture reviews and fitness functions are the primary prevention mechanisms

Source: "Architectural Technical Debt - A Systematic Mapping Study" (ACM SBSE 2023); Besker et al., "Building and Evaluating a Theory of Architectural Technical Debt" (JSS, 2021)

---

## 8. Stakeholder Communication and Architecture Reviews

### 8.1 Architecture Reviews

Best practices for effective architecture reviews:
- Involve diverse viewpoints: product managers, architects, engineers, testers, business users
- Blend techniques: decision-centric review, scenario-based analysis, and checklist-driven verification
- Conduct periodic architecture checkups, not just initial reviews
- Use the C4 model to communicate at the appropriate level of abstraction for each audience
- Document review outcomes as ADRs

### 8.2 Communication by Audience

| Audience | What They Need | Appropriate Artifact |
|----------|---------------|---------------------|
| Executives | Business impact, risks, costs | C4 Context diagram, risk summary |
| Product Managers | Feature feasibility, timelines | C4 Container diagram, implementation roadmap |
| Developers | Implementation guidance, contracts | C4 Component diagram, API specs, ADRs |
| Operations | Deployment, monitoring, scaling | Deployment diagram, observability strategy |
| Security | Threat model, authentication, data flow | Security architecture, data flow diagram |

### 8.3 Continuous Architecture Governance

Modern architecture governance moves from gate-keeping to enabling:
- Architectural fitness functions automate governance checks in CI/CD
- ADRs provide asynchronous, inclusive decision documentation
- Architecture review boards should advise, not bottleneck
- Regular ADR retrospectives (monthly) compare decisions with actual outcomes

Source: DevCom, "Successful Software Architecture Review"; Bizzdesign, "Communicating Architecture with Stakeholders"; Ford et al., "Building Evolutionary Architectures"

---

## 9. Research Gaps and Limitations

- DDD effectiveness evidence is largely anecdotal; more rigorous empirical studies are needed
- ADR adoption in industry remains low despite demonstrated benefits
- Most architecture evaluation methods (including ATAM) were designed for large organizations; lightweight adaptations for small teams need more research
- The modular monolith pattern lacks the extensive body of pattern literature that microservices has accumulated
- Fitness function practices are still emerging; few standardized tools exist across technology stacks

---

## Sources

### Academic / Research
- Ahmeti et al., "Architecture Decision Records in Practice: An Action Research Study" (ECSA 2024): https://link.springer.com/chapter/10.1007/978-3-031-70797-1_22
- "Domain-Driven Design in Software Development: A Systematic Literature Review" (Arxiv/JSS, 2024): https://arxiv.org/abs/2310.01905
- "Architectural Technical Debt - A Systematic Mapping Study" (ACM, 2023): https://dl.acm.org/doi/10.1145/3613372.3613399
- Besker et al., "Building and Evaluating a Theory of Architectural Technical Debt" (JSS, 2021): https://www.sciencedirect.com/science/article/pii/S0164121221000224
- Kazman et al., "Architecture Tradeoff Analysis Method" (SEI/CMU): https://www.sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/
- "Software Architecture Decision-Making Practices" (Arxiv, 2016): https://arxiv.org/pdf/1610.09240

### Industry Standards and Frameworks
- C4 Model: https://c4model.com/
- arc42 Template: https://arc42.org/overview
- arc42 Quality Model: https://quality.arc42.org/
- ISO/IEC 25010:2023: https://iso25000.com/en/iso-25000-standards/iso-25010
- ADR Community Standards: https://adr.github.io/
- Michael Nygard, "Documenting Architecture Decisions" (2011): https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions

### Practitioner Sources
- Fowler, "CQRS": https://www.martinfowler.com/bliki/CQRS.html
- Harmel-Law, "Software Architecture Decisions: Who Should Be Involved?" (Thoughtworks): https://www.thoughtworks.com/insights/blog/architecture/software-architecture-decisions-andrew-harmel-law
- Richardson, "Architectural Patterns for Modular Monoliths" (2024): https://microservices.io/post/architecture/2024/09/09/modular-monolith-patterns-for-fast-flow.html
- Ford, Parsons, Kua, "Building Evolutionary Architectures" (O'Reilly)
- AWS Prescriptive Guidance, "Hexagonal Architecture Pattern": https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/hexagonal-architecture.html
- Continuous Architecture, "Fitness Functions": https://www.continuous-architecture.org/practices/fitness-functions/
- DevCom, "Successful Software Architecture Review": https://devcom.com/tech-blog/successful-software-architecture-review-step-by-step-process/
- James Sheen, "Master Your Decisions: Decision Matrices" (Medium): https://james-sheen.medium.com/master-your-decisions-how-to-use-decision-matrices-in-software-engineering-322d093845f3
