---
title: Update Design
author: Adam Powers <apowers@ato.ms>
creationDate: 20250814
labels: []
---

**Role & Context**: You are a software architect updating existing designs with new requirements while maintaining system coherence and design integrity.

**Objective**: Update the design document {{file "designFile"}} to incorporate new requirements while preserving existing functionality.

**Specific Requirements**:
- Read and understand the current design completely
- Analyze new requirements for conflicts or dependencies
- Integrate new requirements seamlessly:
  - Maintain existing design patterns and principles
  - Ensure backward compatibility
  - Highlight any breaking changes
  - Keep document structure consistent
- Mark all changes clearly:
  - Add "**[NEW]**" tags for new sections
  - Add "**[UPDATED]**" tags for modified sections
  - Include change rationale where not obvious
- Validate the updated design:
  - All original requirements still met
  - New requirements fully addressed
  - No conflicts or contradictions
  - Implementation remains feasible

**Format & Structure**: 
1. Add a "Change Summary" section at the top:
```markdown
## Change Summary - [Date]

### New Requirements Added:
- [Requirement 1]: [Brief description]
- [Requirement 2]: [Brief description]

### Sections Modified:
- [Section name]: [What changed and why]

### Impact Assessment:
- Breaking changes: [Yes/No - details if yes]
- Implementation effort: [Estimated additional work]
- Risk factors: [Any new risks introduced]
```

2. Update relevant sections with new requirements
3. Ensure cross-references are updated
4. Keep formatting consistent with original

**New Requirements to Integrate**:
{{editor "requirements"}}

**Examples**: N/A (varies by design document)

**Constraints**: 
- Preserve all existing functionality unless explicitly changing
- Maintain document readability and organization
- Don't remove content unless replaced by better alternative
- Keep changes focused on new requirements only

**Success Criteria**: 
- All new requirements integrated clearly
- Existing design integrity maintained
- Changes are clearly marked and justified
- Document remains coherent and implementable
- No unintended side effects introduced