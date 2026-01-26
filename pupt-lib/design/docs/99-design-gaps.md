# Design Documentation Gaps

This document tracks gaps between the original design (`pupt-lib-design.md.orig`) and current documentation in `design/docs/`.

**Last Updated:** All high and medium priority gaps have been resolved.

---

## Resolved Gaps

### High Priority (Fixed)

1. **Ask.Choice Component** - Added to 05-components.md
   - Binary choice with custom labels (distinct from Confirm)
   - Props documentation with comparison to Ask.Confirm

2. **Ask.Rating Component** - Added to 05-components.md
   - Numeric scale with optional `<Label>` children
   - Both child element and JS attribute syntax documented

3. **Proxy-based Condition Input Access** - Added to 06-user-input.md
   - Documented `inputs.userType` syntax (not `inputs.get()`)
   - Implementation details with Proxy wrapper explanation
   - Rationale for why Proxy is used over raw Map

### Medium Priority (Fixed)

4. **onMissingDefault Option** - Added to 06-user-input.md
   - `"error"` (default) and `"skip"` strategies documented
   - Usage in non-interactive mode

5. **LLM-Specific Optimization Guidelines** - Added to 04-jsx-runtime.md
   - Comparison table for Claude, GPT, Gemini, Llama
   - Recommended format for each LLM

6. **Date/Time Utility Components** - Added to 05-components.md
   - Clarified `<Date>` and `<Time>` as shorthand components
   - Relationship to `<DateTime>` with format parameter

7. **InputRequirement path/section** - Added to 06-user-input.md
   - Explained tree position fields (`path`, `depth`, `section`)
   - Example tree traversal showing how fields are populated
   - UI usage recommendations

---

## Remaining Low Priority Gaps

These are minor gaps that may be addressed in future updates:

1. **Section Component** - Generic `<Section>` component for named sections with XML delimiters
2. **Advanced Component Patterns** - Composite patterns and component combinations
3. **Performance Considerations** - Caching, lazy loading, optimization patterns
4. **Browser-specific Module Deduplication** - Detailed import map generation

---

## Well-Documented Areas

The following are adequately covered in current docs:
- Control Flow (`<If>`, `<ForEach>`, Excel formula syntax)
- Post-Execution components (`<ReviewFile>`, `<OpenUrl>`, `<RunCommand>`)
- Structural components (`<Role>`, `<Task>`, `<Context>`, etc.)
- Option child elements for Ask.Select
- Input validation (declarative and custom)
- Module loading and scoping
- Simple prompt format (.prompt files)
- Input Iterator state machine and API
