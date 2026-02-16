# Requirements Clarification and Elicitation: Research Framework

## 1. Executive Summary

This document synthesizes academic and practitioner research on requirements elicitation and clarification best practices. It establishes a framework for evaluating the quality of requirements clarification processes, drawing from IEEE/ISO standards, INCOSE guidelines, empirical systematic reviews, and practitioner experience. The findings are organized into actionable categories relevant to auditing and improving AI-assisted requirements clarification prompts.

---

## 2. Requirements Engineering Standards and Frameworks

### 2.1 IEEE 830 / ISO/IEC/IEEE 29148

IEEE 830 (now superseded by ISO/IEC/IEEE 29148:2018) established the foundational quality attributes for software requirements specifications:

| Attribute | Definition | Test |
|-----------|-----------|------|
| Correct | Accurately reflects actual need | Traceable to source |
| Unambiguous | Single interpretation only | No vague qualifiers |
| Complete | All relevant requirements included; no TBD items | Coverage matrix |
| Consistent | No contradictions between requirements | Cross-reference check |
| Ranked | Prioritized by importance and stability | Priority assigned to all |
| Verifiable | Can be checked by testing, inspection, or analysis | Test case derivable |
| Modifiable | Structure allows change without cascading edits | Modular organization |
| Traceable | Origin and downstream links documented | Bidirectional trace |

**Source**: [IEEE SA - IEEE 830](https://standards.ieee.org/ieee/830/1222/); [IEEE Standard SRS Template (PDF)](https://www.cse.msu.edu/~cse870/IEEEXplore-SRS-template.pdf)

### 2.2 EARS (Easy Approach to Requirements Syntax)

Developed at Rolls-Royce in 2009, EARS provides structured natural-language patterns that constrain ambiguity:

| Pattern | Template | Use Case |
|---------|----------|----------|
| Ubiquitous | `The [system] shall [response]` | Always-on requirements |
| State-driven | `While [precondition], the [system] shall [response]` | Requirements conditional on system state |
| Event-driven | `When [trigger], the [system] shall [response]` | Requirements triggered by events |
| Optional feature | `Where [feature], the [system] shall [response]` | Feature-dependent requirements |
| Unwanted behavior | `If [undesired situation], then the [system] shall [response]` | Error/failure handling |
| Complex | `While [precondition], when [trigger], the [system] shall [response]` | Multi-condition requirements |

Every EARS requirement must contain: zero or many preconditions, zero or one trigger, one system name, and one or many system responses.

**Source**: [EARS on IEEE Xplore](https://ieeexplore.ieee.org/document/5328509/); [Jama Software EARS Guide](https://www.jamasoftware.com/requirements-management-guide/writing-requirements/adopting-the-ears-notation-to-improve-requirements-engineering/)

### 2.3 INCOSE Guide to Writing Requirements (42 Rules)

INCOSE defines 42 rules across 14 categories for individual requirement quality:

**Most impactful rules for clarification work**:

| Rule | Name | Relevance to Clarification |
|------|------|---------------------------|
| R1 | Structured Statements | Requirements must follow agreed patterns |
| R2 | Active Voice | Identify responsible entity as subject |
| R7 | Vague Terms | Avoid "adequate", "reasonable", "user-friendly" |
| R8 | Escape Clauses | Eliminate "where possible", "as appropriate" |
| R9 | Open-Ended Clauses | Avoid "including but not limited to" |
| R16 | Use of "Not" | Prefer positive over negative statements |
| R18 | Single Thought | One requirement = one sentence = one testable thing |
| R19 | Combinators | Avoid "and/or" joining multiple requirements |
| R24 | Pronouns | Eliminate ambiguous pronouns ("it", "this", "they") |
| R26 | Absolutes | Avoid unachievable "100%", "always", "never" |
| R31 | Solution Free | Focus on "what" not "how" |
| R34 | Measurable Performance | Specific, measurable performance targets |
| R35 | Temporal Dependencies | Define timing constraints explicitly |

For sets of requirements: Complete, Consistent, Feasible, Comprehensible, Validatable, Correct.

**Source**: [INCOSE 42-Rule Guide](https://reqi.io/articles/incose-requirements-quality-42-rule-guide); [INCOSE Summary Sheet V4 (PDF)](https://www.incose.org/docs/default-source/working-groups/requirements-wg/guidetowritingrequirements/incose_rwg_gtwr_v4_summary_sheet.pdf)

---

## 3. Elicitation Techniques: What Works

### 3.1 Systematic Review Findings

Pacheco & Garcia (2018) conducted a systematic literature review of elicitation techniques by maturity:

| Technique | Maturity | Effectiveness | Best For |
|-----------|----------|---------------|----------|
| Interviews | High | High for detailed stakeholder info | Understanding individual needs |
| Workshops | High | High for consensus building | Cross-stakeholder alignment |
| Focus groups | High | Medium-High | Diverse perspective gathering |
| Prototyping | High | High for visual/UX requirements | Validating understanding |
| Document analysis | Medium | Medium | Extracting existing knowledge |
| Observation/ethnography | Medium | High for tacit knowledge | Understanding actual workflows |
| Surveys/questionnaires | Medium | Medium for broad input | Scaling across many stakeholders |
| Brainstorming | Medium | Medium for creative exploration | Generating new ideas |

**Key finding**: Despite variety of available methods, practitioners face persistent challenges capturing tacit knowledge, managing diverse stakeholder needs, and addressing ambiguities, with a lack of a unified framework to guide practitioners.

**Source**: [Pacheco & Garcia 2018 SLR](https://ietresearch.onlinelibrary.wiley.com/doi/10.1049/iet-sen.2017.0144); [WJARR 2024 Advancements](https://wjarr.com/sites/default/files/WJARR-2024-1202.pdf)

### 3.2 The Three Activities of Elicitation

Effective elicitation involves three fundamental activities:

1. **Discovery**: Finding the right people, identifying what questions need answers
2. **Extraction**: Drawing out information through conversations, observations, analysis
3. **Refinement**: Clarifying vague statements and resolving conflicts between perspectives

**Source**: [Requirements Elicitation on Wikipedia](https://en.wikipedia.org/wiki/Requirements_elicitation)

### 3.3 Questioning Techniques

| Technique | Description | When to Use |
|-----------|-------------|-------------|
| 5 Whys | Ask "why" repeatedly to find root cause/need | Uncovering true needs vs. stated wants |
| Open-ended questions | "What happens when...", "Describe the process..." | Initial exploration |
| Probing questions | "Can you elaborate on...", "What do you mean by..." | Clarifying vague statements |
| Closed questions | "Is X or Y the intended behavior?" | Resolving specific ambiguities |
| Context questions | "Who uses this?", "In what environment?" | Understanding operating conditions |
| Boundary questions | "What is the maximum/minimum?", "What if zero?" | Identifying constraints and edge cases |
| Negative questions | "What should NOT happen?" | Uncovering error scenarios |

**Source**: [Bridging the Gap - Elicitation Questions](https://www.bridging-the-gap.com/what-questions-do-i-ask-during-requirements-elicitation/); [Practical Analyst](https://practicalanalyst.com/requirements-elicitation-most-valuable-questions/)

---

## 4. Ambiguity: Types, Detection, and Mitigation

### 4.1 Ambiguity Taxonomy

Research identifies six categories of requirements ambiguity:

| Type | Definition | Example | Detection Method |
|------|-----------|---------|-----------------|
| Lexical | Words with multiple meanings | "fast", "secure", "simple" | Glossary check, vague term list |
| Syntactic | Unclear sentence structure | "process it quickly and store" | Grammar parse, EARS patterns |
| Semantic | Missing conditions/logic | "when user logs in" (what if fail?) | Condition analysis, decision tables |
| Pragmatic | Unstated assumptions | Assuming single-tenant | Assumption elicitation |
| Anaphoric | Ambiguous references | "this should be validated" | Pronoun resolution |
| Coordination | Unclear logical operators | "A and B or C" | Logic formalization |

### 4.2 Common Vague Terms to Flag

From INCOSE R7 and practitioner sources, these terms always require quantification:

- Performance: "fast", "quick", "responsive", "real-time", "efficient"
- Quality: "reliable", "robust", "stable", "high-quality"
- Usability: "user-friendly", "intuitive", "easy to use", "simple"
- Scale: "scalable", "large", "many", "few"
- Security: "secure", "safe", "protected"
- Quantity: "some", "several", "adequate", "sufficient", "reasonable"
- Escape clauses: "where possible", "as appropriate", "if applicable", "etc."

**Source**: [RIT Ambiguity Analysis (PDF)](https://www.se.rit.edu/~swen-440/slides/instructor-specific/Kuehl/Lecture%208%20Ambiguity%20Analysis%20LV.pdf); [ResearchGate Ambiguity Framework](https://www.researchgate.net/publication/336351565_Ambiguity_in_Requirements_Engineering_Towards_a_Unifying_Framework)

### 4.3 Mitigation Strategies

1. **Examples**: Most powerful way to remove ambiguity by providing concrete context
2. **Models and diagrams**: Visual representations supplement and validate textual requirements
3. **EARS patterns**: Constrain natural language to reduce syntactic ambiguity
4. **Glossaries**: Eliminate lexical ambiguity through shared terminology
5. **Decision tables**: Enumerate all condition combinations to find missing branches
6. **Prototypes**: Validate understanding through tangible demonstrations

**Source**: [Springer Ambiguity in RE](https://link.springer.com/chapter/10.1007/978-1-4615-0465-8_2)

---

## 5. Stakeholder Analysis and Communication

### 5.1 Stakeholder Identification

Effective requirements engineering requires identifying ALL affected parties, not just the requester:

| Stakeholder Category | Examples | Why They Matter |
|---------------------|----------|-----------------|
| Primary users | End users performing daily tasks | Their workflow determines functional requirements |
| Secondary users | Administrators, support staff | Their needs determine operational requirements |
| External stakeholders | Regulators, partners, vendors | They impose constraints and compliance requirements |
| Indirect stakeholders | Operations/DevOps, security team | They bear consequences of architectural decisions |
| Business stakeholders | Product owners, executives | They define value and priority |
| Technical stakeholders | Architects, developers, QA | They determine feasibility and identify constraints |

### 5.2 Assumption Identification

Research shows stakeholders have different backgrounds and will come into discussions with different assumptions. Key practices:

- Stakeholders may spontaneously share information on some topics but remain silent on others unless asked explicitly
- Pragmatic ambiguities (unstated assumptions) are the most dangerous type
- Assumptions must be explicitly documented, risk-assessed, and validated

**Source**: [ScienceDirect - Stakeholder Topic Importance](https://www.sciencedirect.com/science/article/abs/pii/S0306437914000908); [Simply Stakeholders](https://simplystakeholders.com/stakeholder-requirements/)

---

## 6. Prioritization Frameworks

### 6.1 MoSCoW Method

| Category | Definition | Guideline |
|----------|-----------|-----------|
| Must Have | No value without these | ~60% of effort |
| Should Have | Important but workaround exists | ~20% of effort |
| Could Have | Nice-to-have, low impact if omitted | ~20% of effort |
| Won't Have | Explicitly out of scope this iteration | Documented for future |

**Limitations**: Does not differentiate within categories; lacks criteria for ranking competing requirements; ambiguity around timing of "Won't Have" items.

**Source**: [ResearchGate MoSCoW Effectiveness Study](https://www.researchgate.net/publication/385309437_Assessing_the_Effectiveness_of_MoSCoW_Prioritization_in_Software_Development_A_Holistic_Analysis_across_Methodologies); [Agile Business Consortium](https://www.agilebusiness.org/dsdm-project-framework/moscow-prioritisation.html)

### 6.2 Kano Model

Classifies features by customer satisfaction impact:

| Category | If Present | If Absent | Identification Method |
|----------|-----------|-----------|---------------------|
| Must-Be (Basic) | Neutral | Very dissatisfied | Often unstated; ask "what would make this fail?" |
| Performance (One-dimensional) | Proportionally satisfied | Proportionally dissatisfied | Direct questioning |
| Attractive (Delighters) | Very satisfied | Neutral | Innovation; rarely requested explicitly |
| Indifferent | Neutral | Neutral | Customer survey |
| Reverse | Dissatisfied | Satisfied | Negative testing |

**Key insight for clarification**: Must-Be requirements are often unstated because stakeholders take them for granted. A good clarification process must actively probe for these.

**Source**: [ProductPlan Kano](https://www.productplan.com/glossary/kano-model/); [Pragmatic Institute Kano Analysis](https://www.pragmaticinstitute.com/resources/articles/product/prioritizing-software-requirements-with-kano-analysis/)

### 6.3 Jobs-to-Be-Done (JTBD) Framework

Focuses on the underlying job the customer is trying to accomplish, not the solution:

- Core principle: People "hire" products to get jobs done
- Job mapping steps: Define, Locate, Prepare, Confirm, Execute, Monitor, Modify, Conclude
- Requirements should be solution-agnostic: focus on outcomes, not features

**Relevance to clarification**: When a stakeholder says "we need feature X", JTBD asks "what job are you trying to accomplish?" This aligns with the 5 Whys technique.

**Source**: [Tony Ulwick JTBD Framework](https://jobs-to-be-done.com/jobs-to-be-done-a-framework-for-customer-needs-c883cbf61c90); [Strategyn JTBD](https://strategyn.com/jobs-to-be-done/)

---

## 7. Requirements Validation and Verification

### 7.1 Validation vs. Verification

| Aspect | Validation | Verification |
|--------|-----------|-------------|
| Question | "Are we building the right thing?" | "Are we building it right?" |
| Focus | Stakeholder intent | Technical correctness |
| Methods | User testing, prototyping, reviews | Inspection, test, analysis, formal methods |
| Timing | Throughout, especially early | After specification |

### 7.2 Quality Checklist for Individual Requirements

Each requirement should be checked against:

- [ ] **Necessary**: Required for a real need (not gold-plating)
- [ ] **Singular**: States one thing only (INCOSE R18)
- [ ] **Feasible**: Can be implemented within constraints
- [ ] **Verifiable**: A test case can be written
- [ ] **Correct**: Accurately reflects the source need
- [ ] **Unambiguous**: Single interpretation (no vague terms)
- [ ] **Complete**: All conditions and branches specified
- [ ] **Consistent**: No conflicts with other requirements
- [ ] **Traceable**: Linked to source and downstream artifacts
- [ ] **Solution-free**: Describes "what" not "how" (INCOSE R31)

### 7.3 Verification Methods

| Method | Description | Best For |
|--------|-------------|----------|
| Inspection | Manual review against checklists | Document quality |
| Demonstration | Show that the system performs a function | Functional requirements |
| Test | Execute system and verify behavior | Measurable requirements |
| Analysis | Mathematical/logical proof | Complex constraints |

**Source**: [AcqNotes Verify & Validate](https://acqnotes.com/acqnote/tasks/step-5-verify-validate-requirements); [GeeksforGeeks Validation Techniques](https://www.geeksforgeeks.org/software-engineering-requirements-validation-techniques/)

---

## 8. Non-Functional Requirements (NFRs)

### 8.1 Common NFR Categories Checklist

Research and practice identify these as the most commonly overlooked NFR categories:

| Category | Key Questions | Common Metrics |
|----------|--------------|----------------|
| Performance | Response time? Throughput? | p50/p95/p99 latency, TPS |
| Scalability | Max users? Growth projection? | Concurrent users, data volume |
| Security | Auth model? Compliance? Data classification? | OWASP score, encryption standard |
| Availability | Uptime target? Maintenance windows? | 99.9% SLA, RPO/RTO |
| Reliability | Error rate tolerance? Graceful degradation? | MTBF, error budget |
| Usability | Target users? Accessibility standard? | WCAG level, task completion time |
| Maintainability | Code standards? Documentation? | Cyclomatic complexity, test coverage |
| Portability | Platforms? Browsers? Devices? | Compatibility matrix |
| Compliance | Regulations? Data residency? Audit? | Specific standard (GDPR, HIPAA, SOC 2) |
| Observability | Logging? Monitoring? Alerting? | Log retention, alert SLA |

**Key insight**: NFRs are the most commonly omitted requirement type. A good clarification process must actively probe for them even when the stakeholder does not mention them.

**Source**: [Perforce NFR Guide](https://www.perforce.com/blog/alm/what-are-non-functional-requirements-examples); [ByteByteGo NFR Series](https://blog.bytebytego.com/p/non-functional-requirements-the-backbone); [SAFe NFRs](https://framework.scaledagile.com/nonfunctional-requirements)

---

## 9. AI/LLM-Specific Requirements Clarification Research

### 9.1 ClarifyGPT (FSE 2024)

ClarifyGPT is a framework for enhancing LLM code generation through requirements clarification:

- **Ambiguity detection**: Uses code consistency checking (generate multiple solutions; if they diverge, the requirement is ambiguous)
- **Question generation**: LLM generates targeted clarifying questions for detected ambiguities
- **Results**: Elevated GPT-4 Pass@1 from 70.96% to 80.80% on MBPP-sanitized
- **Key insight**: Actively asking clarifying questions before proceeding significantly improves outcomes

**Source**: [ClarifyGPT - ACM FSE 2024](https://dl.acm.org/doi/10.1145/3660810)

### 9.2 Prompt Engineering for Requirements Engineering

A 2025 systematic review identified 36 prompt engineering guidelines in 9 themes relevant to requirements work:

- **Disambiguation**: Guidelines that address ambiguity, clarification, or understanding of intent
- **Context**: Providing domain and environmental context
- **Template**: Using structured output templates
- **Keyword**: Using domain-specific terminology

**Source**: [Prompt Engineering for RE - arXiv](https://arxiv.org/abs/2507.03405)

---

## 10. Edge Cases and Boundary Conditions

### 10.1 Systematic Edge Case Identification

Research-backed categories for edge case analysis:

| Category | Examples | Detection Technique |
|----------|---------|-------------------|
| Input boundaries | Min/max values, empty input, null | Boundary Value Analysis |
| Data types | Wrong type, overflow, encoding issues | Type analysis |
| Concurrency | Race conditions, deadlocks, stale data | Concurrency analysis |
| State transitions | Invalid state, unexpected order | State machine modeling |
| Resource limits | Memory, disk, connection pool exhaustion | Resource analysis |
| Network | Timeout, partial failure, disconnection | Failure mode analysis |
| Permissions | Unauthorized access, role escalation | Access control matrix |
| Time | Timezone issues, DST, leap seconds, clock skew | Temporal analysis |

### 10.2 Negative Requirements

Negative testing validates that the system properly rejects invalid inputs and handles error conditions. Requirements should explicitly address:

- What the system must NOT do
- How the system handles invalid input
- Graceful degradation under failure
- Error messaging and recovery

**Source**: [Wikipedia Edge Case](https://en.wikipedia.org/wiki/Edge_case); [TestSigma Edge Case Testing](https://testsigma.com/blog/edge-case-testing/)

---

## 11. Requirements Traceability

### 11.1 Traceability Directions

| Direction | From → To | Purpose |
|-----------|-----------|---------|
| Forward | Need → Requirement → Design → Code → Test | Ensure nothing is missed |
| Backward | Test → Code → Design → Requirement → Need | Ensure nothing is unnecessary |
| Horizontal | Requirement ↔ Requirement | Detect conflicts and dependencies |

### 11.2 Missing Requirements Detection

- Requirements without trace links indicate gaps
- Incomplete trace chains (requirement with code but no tests) indicate missing work
- Backward traceability ensures no requirement has been missed

**Source**: [Wikipedia Requirements Traceability](https://en.wikipedia.org/wiki/Requirements_traceability)

---

## 12. Key Findings Summary

### What Makes Requirements Clarification Effective

1. **Systematic ambiguity detection** using a formal taxonomy (6 types) catches gaps that informal review misses
2. **Active probing** (5 Whys, JTBD) uncovers true needs behind stated wants
3. **Structured syntax** (EARS patterns) reduces ambiguity by constraining natural language
4. **NFR probing** is essential because non-functional requirements are the most commonly omitted
5. **Kano analysis** reveals unstated Must-Be requirements that stakeholders take for granted
6. **Assumption documentation** with risk assessment prevents silent interpretation errors
7. **Boundary/edge case analysis** using systematic categories (not ad hoc) improves coverage
8. **Requirements quality checklists** (INCOSE 42 rules) provide objective quality criteria
9. **Stakeholder mapping** must go beyond the requester to identify all affected parties
10. **Clarifying questions** should be specific and paired with recommended defaults to avoid blocking

### Common Pitfalls

1. Accepting vague qualifiers without quantification
2. Failing to probe for non-functional requirements
3. Not documenting assumptions explicitly
4. Missing stakeholders beyond the direct requester
5. Treating stated wants as actual needs without questioning
6. Ignoring negative/error scenarios
7. Combining multiple requirements into single statements
8. Using pronouns and references without resolving them
9. Not providing traceability between requirements and their sources
10. Failing to check requirements set for consistency and completeness

---

## 13. Sources

### Academic Sources
- [Pacheco & Garcia (2018) - SLR on Elicitation Techniques](https://ietresearch.onlinelibrary.wiley.com/doi/10.1049/iet-sen.2017.0144)
- [EARS - IEEE 2009](https://ieeexplore.ieee.org/document/5328509/)
- [ClarifyGPT - ACM FSE 2024](https://dl.acm.org/doi/10.1145/3660810)
- [Ambiguity in RE Framework - ResearchGate](https://www.researchgate.net/publication/336351565_Ambiguity_in_Requirements_Engineering_Towards_a_Unifying_Framework)
- [Prompt Engineering for RE - arXiv 2025](https://arxiv.org/abs/2507.03405)
- [MoSCoW Effectiveness Study](https://www.researchgate.net/publication/385309437_Assessing_the_Effectiveness_of_MoSCoW_Prioritization_in_Software_Development_A_Holistic_Analysis_across_Methodologies)
- [Stakeholder Topic Importance in RE Interviews](https://www.sciencedirect.com/science/article/abs/pii/S0306437914000908)
- [WJARR 2024 RE Advancements](https://wjarr.com/sites/default/files/WJARR-2024-1202.pdf)
- [MDPI RE Process Metamodel 2025](https://www.mdpi.com/2227-9717/13/1/20)

### Standards and Guidelines
- [IEEE 830](https://standards.ieee.org/ieee/830/1222/)
- [INCOSE Guide to Writing Requirements V4](https://www.incose.org/docs/default-source/working-groups/requirements-wg/guidetowritingrequirements/incose_rwg_gtwr_v4_summary_sheet.pdf)
- [INCOSE 42-Rule Guide](https://reqi.io/articles/incose-requirements-quality-42-rule-guide)

### Practitioner Sources
- [Jama Software - EARS Guide](https://www.jamasoftware.com/requirements-management-guide/writing-requirements/adopting-the-ears-notation-to-improve-requirements-engineering/)
- [Bridging the Gap - Elicitation Questions](https://www.bridging-the-gap.com/what-questions-do-i-ask-during-requirements-elicitation/)
- [AltexSoft - Acceptance Criteria](https://www.altexsoft.com/blog/acceptance-criteria-purposes-formats-and-best-practices/)
- [Perforce - NFR Guide](https://www.perforce.com/blog/alm/what-are-non-functional-requirements-examples)
- [ProductPlan - Kano Model](https://www.productplan.com/glossary/kano-model/)
- [Strategyn - JTBD](https://strategyn.com/jobs-to-be-done/)
- [Simply Stakeholders](https://simplystakeholders.com/stakeholder-requirements/)
- [SAFe - Non-Functional Requirements](https://framework.scaledagile.com/nonfunctional-requirements)
- [AcqNotes - Verify & Validate](https://acqnotes.com/acqnote/tasks/step-5-verify-validate-requirements)
- [ScopeMaster - Quality Attributes](https://www.scopemaster.com/blog/requirements-quality-attributes/)
