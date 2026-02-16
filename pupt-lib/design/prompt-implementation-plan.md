# Implementation Plan for Prompt Component Design

## Overview

This plan implements the prompt component design specified in `design/prompt-design.md`. It transforms pupt-lib's currently simple structural components (which are mostly delimiter wrappers) into a rich, environment-aware, extensible component system with smart defaults, provider adaptation, presets, and additive composition.

The implementation is organized into 11 phases (1 through 10, with 5b inserted after Phase 5), each delivering independently testable functionality that builds on previous phases without breaking them. Phase 1 is the MVP — shared utilities and infrastructure. Subsequent phases incrementally enhance existing components, add new ones, and wire in environment-aware rendering.

> **Post-Phase-5 Gap Analysis**: After completing Phase 5, a systematic review against `design/prompt-design.md` identified critical gaps in the implementation plan. Phase 5b was added to address the highest-priority gaps: missing props on Prompt and Context, a public API audit, and validation of Design Requirement 6 (components as `.tsx`/`.prompt` files). Phase 6 was expanded to include the Component Registry (Design Requirement 5), and Phases 7-8 were updated with a `.tsx`/`.prompt` file format rule.

## Dependency Graph

```
Phase 1: Utilities & Infrastructure ........................ COMPLETED
    ↓
Phase 2: Existing Component Fixes .......................... COMPLETED
    ↓
Phase 3: Provider Adaptation Tables ........................ COMPLETED
    ↓
Phase 4: Enhanced <Prompt> (defaults system) ............... COMPLETED
    ↓
Phase 5: Enhanced Existing Components (presets + rich props)  COMPLETED
    ↓
Phase 5b: Prop Gaps, Public API Audit & .prompt Validation ←── gap analysis
    ↓
Phase 6: Container Components, Additive Composition & Component Registry
    ↓
Phase 7: New Components (Batch 1 — structural, .tsx/.prompt)
    ↓
Phase 8: New Components (Batch 2 — behavioral, .tsx/.prompt)
    ↓
Phase 9: Environment-Conditional Rendering for .prompt files
    ↓
Phase 10: Extensibility & DX
```

---

## Phase 1: Utilities & Infrastructure [COMPLETED]

**Status**: Implemented. All utilities, tests, and refactors delivered.

**Objective**: Build the foundational utilities that all subsequent phases depend on. This includes the shared delimiter utility, child inspection utilities, element type checking, `RenderContext.metadata` field, and function component context access.

**Duration**: 2-3 days

**Design Reference**: System Capability Expansions 1-4, 6-7; Existing Component Improvements §2

### Tests to Write First

- `test/unit/utils/delimiter.test.ts`: Shared delimiter utility

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { wrapWithDelimiter } from '../../../src/utils/delimiter';

  describe('wrapWithDelimiter', () => {
    it('should wrap content with XML tags', () => {
      const result = wrapWithDelimiter('Hello', 'role', 'xml');
      expect(result).toEqual(['<role>\n', 'Hello', '\n</role>\n']);
    });

    it('should wrap content with markdown header', () => {
      const result = wrapWithDelimiter('Hello', 'role', 'markdown');
      expect(result).toEqual(['## role\n\n', 'Hello']);
    });

    it('should return content as-is for none', () => {
      const result = wrapWithDelimiter('Hello', 'role', 'none');
      expect(result).toBe('Hello');
    });

    it('should handle array content', () => {
      const result = wrapWithDelimiter(['line1', 'line2'], 'task', 'xml');
      expect(result).toEqual(['<task>\n', ['line1', 'line2'], '\n</task>\n']);
    });
  });
  ```

- `test/unit/utils/children.test.ts`: Child inspection utilities

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { findChildrenOfType, partitionChildren, isElementOfType } from '../../../src/utils/children';
  import { jsx, Fragment } from '../../../src/jsx-runtime';
  import { Step } from '../../../components/reasoning/Step';
  import { Role } from '../../../components/structural/Role';

  describe('findChildrenOfType', () => {
    it('should find direct children by class reference', () => {
      const children = [
        jsx(Step, { children: 'step 1' }),
        jsx(Role, { children: 'role text' }),
        jsx(Step, { children: 'step 2' }),
      ];
      const steps = findChildrenOfType(children, Step);
      expect(steps).toHaveLength(2);
    });

    it('should find children by string name', () => {
      const children = [jsx(Step, { children: 'step 1' })];
      const steps = findChildrenOfType(children, 'Step');
      expect(steps).toHaveLength(1);
    });

    it('should search through Fragments', () => {
      const children = [
        jsx(Fragment, {
          children: [
            jsx(Step, { children: 'step inside fragment' }),
          ],
        }),
      ];
      const steps = findChildrenOfType(children, Step);
      expect(steps).toHaveLength(1);
    });

    it('should return empty array when no matches', () => {
      const children = [jsx(Role, { children: 'text' })];
      const steps = findChildrenOfType(children, Step);
      expect(steps).toHaveLength(0);
    });
  });

  describe('partitionChildren', () => {
    it('should split children into matching and non-matching', () => {
      const children = [
        jsx(Step, { children: 'step 1' }),
        jsx(Role, { children: 'role text' }),
        jsx(Step, { children: 'step 2' }),
      ];
      const [steps, rest] = partitionChildren(children, Step);
      expect(steps).toHaveLength(2);
      expect(rest).toHaveLength(1);
    });
  });

  describe('isElementOfType', () => {
    it('should match by class reference', () => {
      const el = jsx(Step, { children: 'text' });
      expect(isElementOfType(el, Step)).toBe(true);
      expect(isElementOfType(el, Role)).toBe(false);
    });

    it('should match by string name', () => {
      const el = jsx(Step, { children: 'text' });
      expect(isElementOfType(el, 'Step')).toBe(true);
      expect(isElementOfType(el, 'Role')).toBe(false);
    });
  });
  ```

- `test/unit/context-metadata.test.ts`: RenderContext metadata field

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../src/render';
  import { jsx } from '../../src/jsx-runtime';
  import { Component } from '../../src/component';
  import { z } from 'zod';

  describe('RenderContext.metadata', () => {
    it('should provide a metadata Map on context', async () => {
      class MetadataWriter extends Component {
        static schema = z.object({}).passthrough();
        render(props: any, _rv: void, context: any) {
          context.metadata.set('test.key', 'test.value');
          return 'written';
        }
      }
      const result = await render(jsx(MetadataWriter, {}));
      expect(result.ok).toBe(true);
    });

    it('should allow sibling components to read metadata set by earlier siblings', async () => {
      // This tests the shared mutable context pattern
      class Writer extends Component {
        static schema = z.object({}).passthrough();
        render(_p: any, _rv: void, context: any) {
          context.metadata.set('message', 'hello');
          return '';
        }
      }
      class Reader extends Component {
        static schema = z.object({}).passthrough();
        render(_p: any, _rv: void, context: any) {
          return context.metadata.get('message') ?? 'not found';
        }
      }
      // Note: render order in arrays is parallel, so this tests sequential access
      // For reliable ordering, nest Writer as a parent of Reader
    });
  });
  ```

- `test/unit/function-component-context.test.ts`: Function component context access

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { render } from '../../src/render';
  import { jsx } from '../../src/jsx-runtime';
  import type { RenderContext } from '../../src/types';

  describe('function component context access', () => {
    it('should pass RenderContext as second argument to function components', async () => {
      function MyComponent(_props: Record<string, unknown>, context: RenderContext) {
        return `provider: ${context.env.llm.provider}`;
      }
      const result = await render(jsx(MyComponent, {}), {
        env: { llm: { provider: 'anthropic' } },
      });
      expect(result.ok).toBe(true);
      expect(result.text).toContain('provider: anthropic');
    });

    it('should still work with function components that only take props', async () => {
      function LegacyComponent(props: { greeting: string }) {
        return props.greeting;
      }
      const result = await render(jsx(LegacyComponent, { greeting: 'hello' }));
      expect(result.ok).toBe(true);
      expect(result.text).toContain('hello');
    });
  });
  ```

### Implementation

- `src/utils/delimiter.ts`: Shared delimiter utility

  ```typescript
  // Extract the duplicated switch(delimiter) logic from 9 components
  export function wrapWithDelimiter(
    content: PuptNode,
    tag: string,
    delimiter: 'xml' | 'markdown' | 'none',
  ): PuptNode;
  ```

- `src/utils/children.ts`: Child inspection utilities

  ```typescript
  // Fragment-aware child search, partition, and type checking
  export function findChildrenOfType(children: PuptNode, type: ComponentType | string): PuptElement[];
  export function partitionChildren(children: PuptNode, type: ComponentType | string): [PuptElement[], PuptNode[]];
  export function isElementOfType(element: PuptElement, type: ComponentType | string): boolean;
  ```

- `src/types/context.ts`: Add `metadata` field to `RenderContext`

  ```typescript
  export interface RenderContext {
    inputs: Map<string, unknown>;
    env: EnvironmentContext;
    postExecution: PostExecutionAction[];
    errors: RenderError[];
    metadata: Map<string, unknown>;  // NEW
  }
  ```

- `src/render.ts`: Two changes:
  1. Initialize `metadata: new Map()` when creating the RenderContext
  2. Pass `context` as second argument to function components

- Refactor all 9 existing structural components to use `wrapWithDelimiter`:
  - `components/structural/Role.tsx`
  - `components/structural/Task.tsx`
  - `components/structural/Context.tsx`
  - `components/structural/Constraint.tsx`
  - `components/structural/Format.tsx`
  - `components/structural/Audience.tsx`
  - `components/structural/Tone.tsx`
  - `components/structural/SuccessCriteria.tsx`
  - `components/structural/Section.tsx`

- `src/index.ts`: Export new utilities

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/refactor-regression.e2e.test.ts`: Capture snapshots of all 9 components BEFORE refactor. Verify identical output AFTER refactor. This is the critical regression gate for this phase.

**Dependencies**:
- External: None
- Internal: `src/types/symbols.ts` (TYPE, PROPS, CHILDREN), `src/jsx-runtime` (Fragment symbol)

**Verification**:
1. Run: `npm run test -- test/unit/utils/delimiter.test.ts test/unit/utils/children.test.ts test/unit/context-metadata.test.ts test/unit/function-component-context.test.ts`
2. Run: `npm run test -- test/e2e/refactor-regression.e2e.test.ts` — snapshots must match pre-refactor output
3. Run: `npm run test` — ALL existing tests must still pass (refactoring must not change behavior)
4. Run: `npm run lint && npm run build` — clean build
5. Manual: Create a simple .tsx test file in `./tmp/` that uses `wrapWithDelimiter` and `findChildrenOfType`, run with `npm run prompt` to verify it works end-to-end

---

## Phase 2: Existing Component Fixes [COMPLETED]

**Status**: Implemented. Role expertise/domain, Constraint may/should-not types, and isElementOfType migration delivered.

**Objective**: Fix the known issues in existing components: Role's unused props, Constraint's missing types, and update child inspection in Steps/Select to use the new utilities.

**Duration**: 1-2 days

**Design Reference**: Existing Component Improvements §1 (Role unused props fix), §3 (Constraint types), §5 (Steps/Select child inspection)

### Tests to Write First

- `test/unit/components/structural/role.test.ts`: Add tests for expertise/domain

  ```typescript
  it('should render expertise when provided', async () => {
    const element = jsx(Role, { expertise: 'TypeScript', children: 'Software Engineer' });
    const result = await render(element);
    expect(result.text).toContain('TypeScript');
    expect(result.text).toContain('Software Engineer');
  });

  it('should render domain when provided', async () => {
    const element = jsx(Role, { domain: 'healthcare', children: 'Analyst' });
    const result = await render(element);
    expect(result.text).toContain('healthcare');
  });

  it('should render both expertise and domain together', async () => {
    const element = jsx(Role, {
      expertise: 'data analysis',
      domain: 'finance',
      children: 'You are an expert analyst',
    });
    const result = await render(element);
    expect(result.text).toContain('data analysis');
    expect(result.text).toContain('finance');
  });
  ```

- `test/unit/components/structural/constraint.test.ts`: Add tests for new types

  ```typescript
  it('should render may constraint', async () => {
    const element = jsx(Constraint, { type: 'may', children: 'Include examples' });
    const result = await render(element);
    expect(result.text).toContain('MAY:');
  });

  it('should render should-not constraint', async () => {
    const element = jsx(Constraint, { type: 'should-not', children: 'Use jargon' });
    const result = await render(element);
    expect(result.text).toContain('SHOULD NOT:');
  });
  ```

- `test/unit/components/reasoning/steps.test.ts`: Verify refactored child inspection

  ```typescript
  it('should find Step children through Fragments', async () => {
    const element = jsx(Steps, {
      children: jsx(Fragment, {
        children: [
          jsx(Step, { children: 'First step' }),
          jsx(Step, { children: 'Second step' }),
        ],
      }),
    });
    const result = await render(element);
    expect(result.text).toMatch(/1\..*First step/s);
    expect(result.text).toMatch(/2\..*Second step/s);
  });
  ```

### Implementation

- `components/structural/Role.tsx`: Use `expertise` and `domain` in render
- `components/structural/Constraint.tsx`: Add `'may'` and `'should-not'` to enum
- `components/reasoning/Steps.tsx`: Replace `type.name === 'Step'` with `isElementOfType(child, Step)`
- `components/ask/Select.tsx`: Replace string-based type check with `isElementOfType`
- `components/ask/MultiSelect.tsx`: Same as Select

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/components/role.e2e.test.ts`: Pipeline test for expertise/domain props; snapshot for each delimiter variant
- `test/e2e/components/constraint.e2e.test.ts`: Pipeline test for all 5 constraint types; snapshot for each
- `test/e2e/components/steps.e2e.test.ts`: Pipeline test for Step children through Fragments

**Dependencies**:
- Internal: Phase 1 (utilities)

**Verification**:
1. Run: `npm run test` — all tests pass including new ones
2. Run: `npm run test -- test/e2e/components/role.e2e.test.ts test/e2e/components/constraint.e2e.test.ts test/e2e/components/steps.e2e.test.ts`
3. Run: `npm run lint && npm run build`
4. Manual: `npm run prompt` with a .prompt file that uses `<Role expertise="React">Frontend Developer</Role>` and verify the output includes "React"

---

## Phase 3: Provider Adaptation Tables [COMPLETED]

**Status**: Implemented. PROVIDER_ADAPTATIONS (all 9 providers), LANGUAGE_CONVENTIONS, getProvider(), getDelimiter(), hasContent(), and PromptConfig delivered.

**Objective**: Implement the `PROVIDER_ADAPTATIONS` lookup table, `LANGUAGE_CONVENTIONS`, helper methods on the Component base class (`getProvider()`, `getDelimiter()`, `hasContent()`), and `PromptConfig` type on `EnvironmentContext`.

**Duration**: 1-2 days

**Design Reference**: Environment Context Adaptation; Component Architecture §Base Component Enhancement

### Tests to Write First

- `test/unit/utils/provider-adaptations.test.ts`:

  ```typescript
  import { describe, it, expect } from 'vitest';
  import { PROVIDER_ADAPTATIONS, LANGUAGE_CONVENTIONS } from '../../../src/utils/provider-adaptations';
  import { LLM_PROVIDERS } from '../../../src/types/context';

  describe('PROVIDER_ADAPTATIONS', () => {
    it('should have an entry for every LLM_PROVIDERS value', () => {
      for (const provider of LLM_PROVIDERS) {
        expect(PROVIDER_ADAPTATIONS[provider]).toBeDefined();
      }
    });

    it('should specify rolePrefix, constraintStyle, formatPreference, instructionStyle', () => {
      const anthropic = PROVIDER_ADAPTATIONS['anthropic'];
      expect(anthropic.rolePrefix).toBe('You are ');
      expect(anthropic.constraintStyle).toBe('positive');
      expect(anthropic.formatPreference).toBe('xml');
      expect(anthropic.instructionStyle).toBe('structured');
    });

    it('should use positive constraint style for anthropic and google', () => {
      expect(PROVIDER_ADAPTATIONS['anthropic'].constraintStyle).toBe('positive');
      expect(PROVIDER_ADAPTATIONS['google'].constraintStyle).toBe('positive');
    });
  });

  describe('LANGUAGE_CONVENTIONS', () => {
    it('should have conventions for typescript, python, rust, go', () => {
      expect(LANGUAGE_CONVENTIONS['typescript']).toBeDefined();
      expect(LANGUAGE_CONVENTIONS['python']).toBeDefined();
      expect(LANGUAGE_CONVENTIONS['rust']).toBeDefined();
      expect(LANGUAGE_CONVENTIONS['go']).toBeDefined();
    });

    it('should have an unspecified fallback', () => {
      expect(LANGUAGE_CONVENTIONS['unspecified']).toBeDefined();
    });
  });
  ```

- `test/unit/component-helpers.test.ts`: Test getProvider/getDelimiter

  ```typescript
  describe('Component helper methods', () => {
    it('getProvider should return provider from context', async () => {
      // Create component that uses getProvider in render
      class TestComponent extends Component {
        static schema = z.object({}).passthrough();
        render(_p: any, _rv: void, context: RenderContext) {
          return `provider: ${this.getProvider(context)}`;
        }
      }
      const result = await render(jsx(TestComponent, {}), {
        env: { llm: { model: 'claude-3-opus', provider: 'anthropic' } },
      });
      expect(result.text).toContain('provider: anthropic');
    });
  });
  ```

- `test/unit/prompt-config.test.ts`: PromptConfig schema validation

  ```typescript
  describe('promptConfigSchema', () => {
    it('should parse with all defaults', () => {
      const config = promptConfigSchema.parse({});
      expect(config.includeRole).toBe(true);
      expect(config.includeFormat).toBe(true);
      expect(config.includeConstraints).toBe(true);
      expect(config.includeSuccessCriteria).toBe(false);
    });

    it('should allow overriding individual flags', () => {
      const config = promptConfigSchema.parse({ includeRole: false });
      expect(config.includeRole).toBe(false);
    });
  });
  ```

### Implementation

- `src/utils/provider-adaptations.ts`: `PROVIDER_ADAPTATIONS` and `LANGUAGE_CONVENTIONS` tables
- `src/component.ts`: Add `getProvider()`, `getDelimiter()`, and `hasContent()` protected helper methods. `hasContent()` checks whether the component has non-empty children content, used by components that need to decide between rendering children vs preset/generated content.
- `src/types/context.ts`: Add `promptConfigSchema` and `prompt` field to `environmentContextSchema`
- `src/index.ts`: Export new types and utilities

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/provider-adaptations.e2e.test.ts`: Render a prompt with Role + Constraint for each of anthropic/openai/google and snapshot the provider-specific output differences

**Dependencies**:
- External: None
- Internal: Phase 1

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run test -- test/e2e/provider-adaptations.e2e.test.ts`
3. Run: `npm run lint && npm run build`
4. Manual: Inspect `PROVIDER_ADAPTATIONS` table covers all 9 providers

---

## Phase 4: Enhanced Prompt Component (Defaults System) [COMPLETED]

**Status**: Implemented. Defaults system with bare mode, defaults object, role/expertise/format shorthands, child detection, and ROLE_PRESETS delivered.

**Objective**: Transform `<Prompt>` from a simple passthrough into a smart defaults system. Implement `bare`, `defaults`, and shorthand props (`role`, `format`, `expertise`). Prompt detects whether children include certain section types and generates defaults for missing ones.

**Duration**: 2-3 days

**Design Reference**: The Prompt Component; Requirements §1 (Prompt as Complete Output), §2 (Reasonable Defaults)

### Tests to Write First

- `test/unit/components/structural/prompt-defaults.test.ts`:

  ```typescript
  describe('Prompt defaults system', () => {
    it('should render default role when no Role child is provided', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      expect(result.text).toContain('assistant');
      expect(result.text).toContain('Do something');
    });

    it('should NOT render default role when Role child IS provided', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        children: [
          jsx(Role, { children: 'Custom role text' }),
          jsx(Task, { children: 'Do something' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toContain('Custom role text');
      // Should NOT contain default assistant text
    });

    it('should render no defaults when bare=true', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        bare: true,
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      expect(result.text).toContain('Do something');
      // No auto-generated role, format, or constraints
    });

    it('should accept role shorthand prop', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        role: 'engineer',
        children: jsx(Task, { children: 'Review code' }),
      });
      const result = await render(element);
      expect(result.text).toContain('Software Engineer');
    });

    it('should render default constraints', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      // Should have some default constraint text
      expect(result.text).toContain('concise');
    });

    it('should respect defaults object for fine-grained control', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        defaults: { role: false, constraints: true },
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      // No auto role, but has constraints
    });

    it('should detect Role through Fragments', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        children: [
          jsx(Fragment, {
            children: jsx(Role, { children: 'Nested role' }),
          }),
          jsx(Task, { children: 'Do something' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toContain('Nested role');
      // Should NOT also include default role
    });
  });
  ```

### Implementation

- `components/structural/Prompt.tsx`: Complete rewrite
  - Add `bare`, `defaults`, `role`, `expertise`, `format`, `audience`, `tone` to schema
  - Use `findChildrenOfType` to detect which sections children already provide
  - Generate default sections for missing ones using `ROLE_PRESETS`, `PROVIDER_ADAPTATIONS`
  - Section ordering: Role → Context → Task → Constraints → Format → SuccessCriteria (fixed order; provider-specific ordering is handled within each component's render, not at the Prompt level)

- `src/utils/role-presets.ts`: `ROLE_PRESETS` lookup table (subset for MVP)
  - Start with ~10 most common presets: assistant, engineer, writer, analyst, teacher, consultant, etc.

- `src/utils/default-constraints.ts`: Default constraint text
  - "Keep responses concise and focused"
  - "Be accurate and factual"
  - "Acknowledge uncertainty"

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/components/prompt.e2e.test.ts`: Pipeline + snapshot tests for defaults (auto-generated role/constraints), bare mode, and role shorthand — all through `createPromptFromSource()`

**Dependencies**:
- Internal: Phases 1-3 (utilities, provider tables, getProvider/getDelimiter)

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run test -- test/e2e/components/prompt.e2e.test.ts`
3. Run: `npm run lint && npm run build`
4. Manual: Create these .prompt files in `./tmp/` and verify output with `npm run prompt`:

   ```tsx
   // tmp/minimal.prompt - should have auto-generated role, constraints
   <Prompt name="minimal">
     <Task>Summarize this document</Task>
   </Prompt>

   // tmp/bare.prompt - should ONLY have task output
   <Prompt name="bare" bare>
     <Task>Summarize this document</Task>
   </Prompt>

   // tmp/shorthand.prompt - should use engineer preset
   <Prompt name="code-review" role="engineer">
     <Task>Review this pull request</Task>
   </Prompt>
   ```

---

## Phase 5: Enhanced Existing Components (Presets + Rich Props) [COMPLETED]

**Status**: Implemented. All presets (Role 30+, Task, Constraint, Steps), provider-aware rendering, positive framing, rich props for all 8 structural components delivered.

**Objective**: Add preset systems and rich props to existing structural components: Role, Task, Format, Context, Audience, Tone, SuccessCriteria, Steps. Each component gets preset support, provider-aware rendering, and the new props from the design.

**Duration**: 3 days

**Design Reference**: Core Component Designs (all subsections); Existing Component Improvements §1 (presets, provider-aware rendering, rich props — distinct from Phase 2 which fixed prop wiring)

### Tests to Write First

- `test/unit/components/structural/role-enhanced.test.ts`:

  ```typescript
  describe('Role presets', () => {
    it('should render engineer preset', async () => {
      const element = jsx(Role, { preset: 'engineer' });
      const result = await render(element);
      expect(result.text).toContain('Software Engineer');
    });

    it('should combine preset with additional expertise', async () => {
      const element = jsx(Role, { preset: 'engineer', expertise: 'TypeScript, React' });
      const result = await render(element);
      expect(result.text).toContain('TypeScript');
    });

    it('should adapt role prefix for different providers', async () => {
      const element = jsx(Role, { preset: 'engineer' });
      const claudeResult = await render(element, { env: { llm: { provider: 'anthropic' } } });
      expect(claudeResult.text).toContain('You are');

      const geminiResult = await render(element, { env: { llm: { provider: 'google' } } });
      expect(geminiResult.text).toContain('Your role:');
    });

    it('should prefer children over preset', async () => {
      const element = jsx(Role, { preset: 'engineer', children: 'Custom role text' });
      const result = await render(element);
      expect(result.text).toContain('Custom role text');
    });
  });
  ```

- `test/unit/components/structural/constraint-enhanced.test.ts`:

  ```typescript
  describe('Constraint positive framing', () => {
    it('should use positive framing for anthropic provider', async () => {
      const element = jsx(Constraint, {
        type: 'must-not',
        positive: 'Remain objective and factual',
        children: 'Include personal opinions',
      });
      const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
      expect(result.text).toContain('Remain objective');
      expect(result.text).not.toContain('personal opinions');
    });

    it('should use negative framing for openai provider', async () => {
      const element = jsx(Constraint, {
        type: 'must-not',
        positive: 'Remain objective and factual',
        children: 'Include personal opinions',
      });
      const result = await render(element, { env: { llm: { provider: 'openai' } } });
      expect(result.text).toContain('MUST NOT');
      expect(result.text).toContain('personal opinions');
    });
  });

  describe('Constraint presets', () => {
    it('should render be-concise preset', async () => {
      const element = jsx(Constraint, { preset: 'be-concise' });
      const result = await render(element);
      expect(result.text).toContain('concise');
    });
  });
  ```

- `test/unit/components/structural/format-enhanced.test.ts`:

  ```typescript
  describe('Format provider adaptation', () => {
    it('should prefer XML for anthropic when type not specified', async () => {
      const element = jsx(Format, {});
      const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
      expect(result.text).toContain('xml');
    });

    it('should render schema when provided', async () => {
      const element = jsx(Format, {
        type: 'json',
        schema: { type: 'object', properties: { name: { type: 'string' } } },
      });
      const result = await render(element);
      expect(result.text).toContain('Schema:');
      expect(result.text).toContain('"name"');
    });
  });
  ```

- Similar test files for: Task, Context, Audience, Tone, SuccessCriteria, Steps enhanced features

### Implementation

- `components/structural/Role.tsx`: Full rewrite with preset, experience, traits, provider-aware rendering
- `components/structural/Task.tsx`: Add preset, verb, subject, objective, scope, complexity
- `components/structural/Format.tsx`: Add schema, template, example, strict, validate, provider preference
- `components/structural/Context.tsx`: Add preset, type, label, source, priority, relevance
- `components/structural/Constraint.tsx`: Add preset, category, positive framing logic
- `components/structural/Audience.tsx`: Add level, type, description, knowledgeLevel, goals
- `components/structural/Tone.tsx`: Add type, formality, energy, warmth, brandVoice
- `components/structural/SuccessCriteria.tsx`: Add presets, metrics, Criterion category/weight
- `components/reasoning/Steps.tsx`: Add preset, style, showReasoning, verify, selfCritique

- `src/utils/role-presets.ts`: Complete ROLE_PRESETS table (all categories from design)
- `src/utils/task-presets.ts`: TASK_PRESETS table
- `src/utils/constraint-presets.ts`: CONSTRAINT_PRESETS table
- `src/utils/steps-presets.ts`: STEPS_PRESETS table

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/components/task.e2e.test.ts`: Pipeline + snapshot for preset, verb, subject
- `test/e2e/components/format.e2e.test.ts`: Pipeline + snapshot for schema, strict, provider preference
- `test/e2e/components/context.e2e.test.ts`: Pipeline + snapshot for label, source, type
- `test/e2e/components/audience.e2e.test.ts`: Pipeline + snapshot for level, type
- `test/e2e/components/tone.e2e.test.ts`: Pipeline + snapshot for type, formality
- `test/e2e/components/success-criteria.e2e.test.ts`: Pipeline + snapshot for presets, metrics
- `test/e2e/components/steps.e2e.test.ts`: Add pipeline + snapshot for presets, style, verify

**Dependencies**:
- Internal: Phases 1-3

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run test -- test/e2e/components/`
3. Run: `npm run lint && npm run build`
4. Manual: Create .prompt files that exercise presets:

   ```tsx
   // tmp/presets.prompt
   <Prompt name="preset-demo" bare>
     <Role preset="engineer" expertise="TypeScript" experience="senior" />
     <Task preset="code-review" subject="the PR" />
     <Format type="markdown" strict />
     <Constraint preset="be-concise" />
     <Steps preset="problem-solving" verify />
   </Prompt>
   ```

---

## Phase 5b: Prop Gaps, Public API Audit & .prompt Component Validation

> **Added post-Phase 5** after gap analysis against `design/prompt-design.md`. Addresses Design Requirements 5 and 6, and closes prop gaps identified in the gap review.

**Objective**: Close identified gaps between the design document and the implementation. Add missing props to Prompt and Context. Audit all built-in components for public API compliance. Determine whether declarative components can be implemented as `.prompt` files (Design Requirement 6).

**Duration**: 2 days

**Design Reference**: Requirements §5 (Component Replaceability), §6 (Components as .tsx/.prompt files); The Prompt Component (shorthand props); Context System Design (truncate/maxTokens/preserveFormatting)

### Tests to Write First

- `test/unit/components/structural/prompt-shorthands.test.ts`:

  ```typescript
  describe('Prompt shorthand disable props', () => {
    it('should skip default role when noRole=true', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        noRole: true,
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      expect(result.text).not.toContain('assistant');
      expect(result.text).toContain('Do something');
    });

    it('should skip default format when noFormat=true', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        noFormat: true,
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      // Should have role and constraints but no format section
    });

    it('should skip default constraints when noConstraints=true', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        noConstraints: true,
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      expect(result.text).not.toContain('concise');
    });

    it('should treat defaults="none" as equivalent to bare', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        defaults: 'none',
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      // Same as bare: only children, no auto-generated sections
    });
  });
  ```

- `test/unit/components/structural/context-content-handling.test.ts`:

  ```typescript
  describe('Context content handling props', () => {
    it('should include preserveFormatting hint when true', async () => {
      const element = jsx(Context, {
        preserveFormatting: true,
        children: '  indented\n    content',
      });
      const result = await render(element);
      expect(result.text).toContain('indented');
    });

    it('should include maxTokens hint when provided', async () => {
      const element = jsx(Context, {
        maxTokens: 2000,
        label: 'Long Document',
        children: 'Some long content...',
      });
      const result = await render(element);
      // maxTokens is a hint for context management, not enforcement
    });

    it('should include truncation indicator when truncate=true', async () => {
      const element = jsx(Context, {
        truncate: true,
        children: 'Content that may be truncated',
      });
      const result = await render(element);
      // truncate flag indicates content may be shortened
    });
  });
  ```

- `test/unit/public-api-audit.test.ts`:

  ```typescript
  describe('Public API audit', () => {
    it('all structural components should extend Component base class', () => {
      // Verify each component uses only the public API:
      // Component class, getProvider(), getDelimiter(), hasContent(),
      // wrapWithDelimiter(), findChildrenOfType(), partitionChildren(),
      // isElementOfType(), PROVIDER_ADAPTATIONS, presets
      // NO direct imports from src/render.ts internals
    });
  });
  ```

- `test/unit/prompt-component-definition.test.ts`:

  ```typescript
  describe('.prompt file component definitions', () => {
    it('should be able to render a component defined in a .prompt file', async () => {
      // Test whether the preprocessor/transformer pipeline can handle
      // a .prompt file that defines a reusable component (function component)
      // This validates Design Requirement 6
      const source = `
<Section name="when-uncertain">
  If you are unsure, ask clarifying questions before proceeding.
</Section>
`;
      const element = await createPromptFromSource(source, 'when-uncertain.prompt');
      const result = await render(element);
      expect(result.ok).toBe(true);
      expect(result.text).toContain('clarifying questions');
    });
  });
  ```

### Implementation

**5b.1 — Prompt shorthand disable props**

- `components/structural/Prompt.tsx`: Add `noRole`, `noFormat`, `noConstraints`, `noSuccessCriteria` boolean props to schema. These are shorthands that map to the `defaults` object internally:
  ```typescript
  // noRole is equivalent to defaults: { role: false }
  // noFormat is equivalent to defaults: { format: false }
  // etc.
  ```
  Also accept `defaults: 'none'` as equivalent to `bare: true`.

**5b.2 — Context missing props**

- `components/structural/Context.tsx`: Add to schema and render:
  - `truncate?: boolean` — when true, indicates this context block may be shortened by the caller. Renders a `[may be truncated]` indicator.
  - `maxTokens?: number` — advisory maximum token budget for this context section. Rendered as a comment/hint, not enforced.
  - `preserveFormatting?: boolean` — when true, wraps content in a way that preserves whitespace/indentation (e.g., uses `<pre>` in XML mode or fenced block in markdown mode).

**5b.3 — Public API audit**

Review all built-in components and verify they only import from `pupt-lib` (the public API), `pupt-lib/jsx-runtime`, `zod`, or sibling `./` paths within the same directory. Specifically, components may use:
- The `Component` base class and its helpers (`getProvider`, `getDelimiter`, `hasContent`)
- Props, resolvedValue, context (the 3 render parameters)
- Public utilities exported from `pupt-lib` (`wrapWithDelimiter`, `findChildrenOfType`, `partitionChildren`, `isElementOfType`, `PROVIDER_ADAPTATIONS`, preset tables)
- The JSX runtime (`Fragment` from `pupt-lib/jsx-runtime`)

Components must NOT import from internal `src/` paths (e.g., `../../src/utils/delimiter`). This is enforced by `test/unit/component-file-format.test.ts`.

Document any violations. Create `design/public-api-audit.md` with findings.

**5b.4 — .prompt component feasibility test**

The preprocessor currently wraps `.prompt` content as `export default (\n...\n);` — producing a prompt expression, not a component definition. Test whether:

1. A `.prompt` file can express a simple declarative component (e.g., WhenUncertain) using only built-in components like `<Section>`, `<If>`, `<ForEach>`.
2. If the current preprocessor supports this or if changes are needed.

Create `design/prompt-file-components-decision.md` documenting:
- Which new components (Phases 7-8) will be `.prompt` files vs `.tsx` files
- Whether preprocessor changes are needed (and if so, add them to Phase 6)
- The decision criteria: components using `resolve()`, `context.metadata`, `findChildrenOfType()`, or complex logic → `.tsx`; purely declarative components → `.prompt`

**Preliminary .tsx/.prompt assignment** (to be confirmed by 5b.4):

| Component (Phase 7) | Expected Format | Reason |
|---------------------|----------------|--------|
| Objective | `.prompt` | Purely declarative — renders primary/secondary goals |
| Style | `.prompt` | Purely declarative — renders type/verbosity text |
| WhenUncertain | `.prompt` | Purely declarative — renders action text |
| Specialization | `.prompt` | Purely declarative — renders areas/level |
| ChainOfThought | `.tsx` | May need model detection logic |
| NegativeExample | `.tsx` | Extends Example, needs JSX composition with reason |

| Component (Phase 8) | Expected Format | Reason |
|---------------------|----------------|--------|
| Guardrails | `.tsx` | Presets, extend/exclude, prohibit/require arrays |
| EdgeCases | `.tsx` | Container with When child inspection |
| When | `.prompt` | Simple condition → action rendering |
| Fallback | `.prompt` | Simple when/then rendering |
| Fallbacks | `.tsx` | Container with Fallback child inspection |
| References | `.tsx` | Container with extend, sources array |
| Reference | `.prompt` | Simple title/url/description rendering |

**E2E Tests**:
- `test/e2e/prompt-shorthands.e2e.test.ts`: Pipeline tests for `noRole`, `noFormat`, `noConstraints`, `defaults="none"` through `createPromptFromSource()`
- `test/e2e/components/context.e2e.test.ts`: Add pipeline tests for `truncate`, `maxTokens`, `preserveFormatting`
- `test/e2e/prompt-file-component.e2e.test.ts`: Pipeline test rendering a component defined as a `.prompt` file

**Dependencies**:
- Internal: Phases 1-5

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run lint && npm run build`
3. Review `design/public-api-audit.md` — no violations found (or violations documented and fixed)
4. Review `design/prompt-file-components-decision.md` — clear decision on .tsx vs .prompt for each Phase 7-8 component
5. Manual: Test shorthand props in `./tmp/`:

   ```tsx
   // tmp/no-role.prompt - should have constraints but no role
   <Prompt name="no-role" noRole>
     <Task>Summarize this document</Task>
   </Prompt>

   // tmp/defaults-none.prompt - equivalent to bare
   <Prompt name="defaults-none" defaults="none">
     <Task>Summarize this document</Task>
   </Prompt>
   ```

---

## Phase 6: Container Components, Additive Composition & Component Registry

**Objective**: Implement the extend/exclude/replace composition pattern via container components: `<Constraints>` and `<Contexts>`. Wire them into `<Prompt>`'s defaults system. Implement the Component Registry for component replaceability (Design Requirement 5). If Phase 5b identified preprocessor changes needed for `.prompt` component definitions, implement those here. (Note: additional container components `<EdgeCases>`, `<Fallbacks>`, `<References>` are built in Phase 8 using the same pattern established here.)

**Duration**: 3-4 days

**Design Reference**: Design Principles §5 (Additive Composition); Constraint System Design; Context System Design; Component Extensibility (Registry-Based Replacement)

### Tests to Write First

- `test/unit/components/containers/constraints-container.test.ts`:

  ```typescript
  describe('Constraints container', () => {
    it('should render children constraints', async () => {
      const element = jsx(Constraints, {
        children: [
          jsx(Constraint, { type: 'must', children: 'Be accurate' }),
          jsx(Constraint, { type: 'should', children: 'Be concise' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toContain('MUST:');
      expect(result.text).toContain('SHOULD:');
    });

    it('should render preset constraints', async () => {
      const element = jsx(Constraints, { presets: ['be-concise', 'cite-sources'] });
      const result = await render(element);
      expect(result.text).toContain('concise');
      expect(result.text).toContain('sources');
    });
  });
  ```

- `test/unit/components/structural/prompt-composition.test.ts`:

  ```typescript
  describe('Prompt additive composition', () => {
    it('should extend default constraints when Constraints extend is provided', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        children: [
          jsx(Constraints, {
            extend: true,
            children: jsx(Constraint, { type: 'must', children: 'Custom constraint' }),
          }),
          jsx(Task, { children: 'Do something' }),
        ],
      });
      const result = await render(element);
      // Should have BOTH default constraints AND custom constraint
      expect(result.text).toContain('Custom constraint');
      expect(result.text).toContain('concise'); // default
    });

    it('should replace default constraints when Constraints replace is provided', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        children: [
          jsx(Constraints, {
            children: jsx(Constraint, { type: 'must', children: 'Only my constraint' }),
          }),
          jsx(Task, { children: 'Do something' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toContain('Only my constraint');
      expect(result.text).not.toContain('concise'); // no default
    });
  });
  ```

- `test/unit/services/component-registry.test.ts`:

  ```typescript
  describe('ComponentRegistry', () => {
    it('should register and retrieve components by name', () => {
      const registry = new ComponentRegistry();
      registry.register('Role', Role);
      expect(registry.get('Role')).toBe(Role);
    });

    it('should support createChild() for scoped overrides', () => {
      const parent = new ComponentRegistry();
      parent.register('Role', Role);
      const child = parent.createChild();
      class CustomRole extends Component {
        static schema = z.object({}).passthrough();
        render() { return 'CUSTOM'; }
      }
      child.register('Role', CustomRole);
      expect(child.get('Role')).toBe(CustomRole);
      expect(parent.get('Role')).toBe(Role); // parent unchanged
    });

    it('should fall back to parent registry for unregistered components', () => {
      const parent = new ComponentRegistry();
      parent.register('Role', Role);
      const child = parent.createChild();
      expect(child.get('Role')).toBe(Role); // inherited from parent
    });

    it('defaultRegistry should contain all built-in components', () => {
      expect(defaultRegistry.get('Role')).toBe(Role);
      expect(defaultRegistry.get('Task')).toBe(Task);
      expect(defaultRegistry.get('Prompt')).toBe(Prompt);
      // ... etc
    });
  });

  describe('Registry in render', () => {
    it('should use registry to resolve string-typed elements', async () => {
      class CustomRole extends Component {
        static schema = z.object({}).passthrough();
        render() { return 'CUSTOM ROLE'; }
      }
      const registry = defaultRegistry.createChild();
      registry.register('Role', CustomRole);
      const element = jsx('Role', { children: 'ignored' });
      const result = await render(element, { registry });
      expect(result.text).toContain('CUSTOM ROLE');
    });
  });
  ```

### Implementation

**Container components:**

- `components/structural/Constraints.tsx`: Container component with extend/exclude/presets
- `components/structural/Contexts.tsx`: Container component
- `components/structural/Prompt.tsx`: Update to recognize container components and handle extend/exclude/replace logic using `findChildrenOfType` and `partitionChildren`
- `components/index.ts`: Export new container components
- `src/services/preprocessor.ts`: Add container components to BUILTIN_COMPONENTS list

**Component Registry (Design Requirement 5):**

- `src/services/component-registry.ts`: New file
  ```typescript
  export class ComponentRegistry {
    private components: Map<string, ComponentType>;
    private parent?: ComponentRegistry;

    register(name: string, component: ComponentType): void;
    get(name: string): ComponentType | undefined; // checks parent if not found locally
    has(name: string): boolean;
    createChild(): ComponentRegistry; // scoped override support
    entries(): IterableIterator<[string, ComponentType]>;
  }

  // Pre-populated with all built-in components
  export const defaultRegistry: ComponentRegistry;
  ```
- `src/types/render.ts`: Add optional `registry?: ComponentRegistry` field to `RenderOptions`
- `src/render.ts`: When resolving a string-typed element (e.g., `jsx('Role', ...)`), check `options.registry ?? defaultRegistry` before falling back to the current import-based resolution
- `src/index.ts`: Export `ComponentRegistry`, `defaultRegistry`

**Preprocessor changes (conditional — from Phase 5b.4):**

- If Phase 5b determined that preprocessor changes are needed for `.prompt` component definitions, implement them here. Otherwise, no preprocessor changes beyond adding new components to BUILTIN_COMPONENTS.

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/containers/constraints.e2e.test.ts`: Pipeline + snapshot for extend, replace, exclude through `createPromptFromSource()`
- `test/e2e/containers/contexts.e2e.test.ts`: Pipeline + snapshot for multiple contexts
- `test/e2e/components/prompt.e2e.test.ts`: Add composition pipeline + snapshot tests (extend/replace defaults)
- `test/e2e/component-registry.e2e.test.ts`: Pipeline test overriding a built-in component via registry

**Dependencies**:
- Internal: Phases 1-5b

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run test -- test/e2e/containers/ test/e2e/component-registry.e2e.test.ts`
3. Run: `npm run lint && npm run build`
4. Manual: .prompt file testing composition:

   ```tsx
   // tmp/composition.prompt
   <Prompt name="composition-demo">
     <Constraints extend>
       <Constraint type="must">Include code examples</Constraint>
     </Constraints>
     <Task>Explain TypeScript generics</Task>
   </Prompt>
   ```
5. Manual: Verify `defaultRegistry.get('Role')` returns the Role class in a test script

---

## Phase 7: New Components — Batch 1 (Structural)

**Objective**: Implement the simpler new structural components that don't require complex logic: Objective, Style, WhenUncertain, NegativeExample, ChainOfThought, Specialization. Per Design Requirement 6, purely declarative components SHOULD be implemented as `.prompt` files; components needing complex logic use `.tsx`.

**Duration**: 2-3 days

**Design Reference**: New Components §1, §2, §5, §6, §7, §9; Requirements §6 (Components as .tsx/.prompt files)

### File Format Rule (Design Requirement 6)

> Each new component must document whether it is `.tsx` or `.prompt` and why. Components that are purely declarative (no async, no context mutation, no child inspection) SHOULD be `.prompt` files. Components that need `resolve()`, `context.metadata`, `findChildrenOfType()`, or complex rendering logic MUST be `.tsx`.
>
> The final assignments below are subject to the Phase 5b.4 feasibility findings. If `.prompt` component definitions require preprocessor changes that weren't completed in Phase 6, fall back to `.tsx` for all.

| Component | Format | Reason |
|-----------|--------|--------|
| Objective | `.prompt` | Purely declarative — renders primary/secondary goals in a section |
| Style | `.prompt` | Purely declarative — renders type/verbosity/formality text |
| WhenUncertain | `.prompt` | Purely declarative — renders action text in a section |
| Specialization | `.prompt` | Purely declarative — renders areas/level in a section |
| ChainOfThought | `.tsx` | May need model detection logic for reasoning vs standard models |
| NegativeExample | `.tsx` | Extends Example behavior, needs JSX composition with reason prop |

### Tests to Write First

- `test/unit/components/new/objective.test.ts`:

  ```typescript
  describe('Objective', () => {
    it('should render primary goal', async () => {
      const element = jsx(Objective, { primary: 'Build a REST API' });
      const result = await render(element);
      expect(result.text).toContain('Build a REST API');
    });

    it('should render secondary goals', async () => {
      const element = jsx(Objective, {
        primary: 'Build a REST API',
        secondary: ['Handle authentication', 'Support pagination'],
      });
      const result = await render(element);
      expect(result.text).toContain('Handle authentication');
      expect(result.text).toContain('Support pagination');
    });
  });
  ```

- Similar test files for Style, WhenUncertain, NegativeExample, ChainOfThought, Specialization

### Implementation

**.prompt components** (subject to Phase 5b.4 feasibility — fall back to `.tsx` if needed):
- `components/structural/Objective.prompt`: Declarative component using `<Section>` and `<ForEach>` for primary/secondary goals
- `components/structural/Style.prompt`: Declarative component rendering type/verbosity/formality text
- `components/structural/WhenUncertain.prompt`: Declarative component rendering uncertainty action text
- `components/structural/Specialization.prompt`: Declarative component rendering areas/level

**.tsx components**:
- `components/reasoning/ChainOfThought.tsx`: Uses model detection logic, multiple rendering styles
- `components/examples/NegativeExample.tsx` (or add `negative` prop to Example): Extends Example with reason, type props

**Shared**:
- `components/index.ts`: Export all new components
- `src/services/preprocessor.ts`: Add to BUILTIN_COMPONENTS
- Register all new components in `defaultRegistry` (from Phase 6)

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/new-components/objective.e2e.test.ts`: Pipeline + snapshot for primary/secondary goals
- `test/e2e/new-components/style.e2e.test.ts`: Pipeline + snapshot for type/verbosity
- `test/e2e/new-components/when-uncertain.e2e.test.ts`: Pipeline + snapshot for each action type
- `test/e2e/new-components/chain-of-thought.e2e.test.ts`: Pipeline + snapshot for each style
- `test/e2e/new-components/specialization.e2e.test.ts`: Pipeline + snapshot for areas/level
- `test/e2e/new-components/negative-example.e2e.test.ts`: Pipeline + snapshot for negative example with reason

**Dependencies**:
- Internal: Phase 1 (wrapWithDelimiter), Phase 5b (.prompt feasibility), Phase 6 (registry, preprocessor changes if any)

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run test -- test/e2e/new-components/objective.e2e.test.ts test/e2e/new-components/style.e2e.test.ts test/e2e/new-components/when-uncertain.e2e.test.ts test/e2e/new-components/chain-of-thought.e2e.test.ts test/e2e/new-components/specialization.e2e.test.ts test/e2e/new-components/negative-example.e2e.test.ts`
3. Run: `npm run lint && npm run build`
4. Verify `.prompt`-based components render correctly through the full pipeline (preprocessor → Babel → render)
5. Verify all new components are registered in `defaultRegistry`
6. Manual: .prompt file using new components

---

## Phase 8: New Components — Batch 2 (Behavioral)

**Objective**: Implement the more complex new components that involve child inspection, composition, or behavioral logic: Guardrails, EdgeCases/When, Fallback/Fallbacks, References/Reference. Per Design Requirement 6, simple leaf components use `.prompt` format; container components and components with complex logic use `.tsx`.

**Duration**: 2-3 days

**Design Reference**: New Components §3, §4, §8, §10; Requirements §6 (Components as .tsx/.prompt files)

### File Format Rule (Design Requirement 6)

| Component | Format | Reason |
|-----------|--------|--------|
| Guardrails | `.tsx` | Presets, extend/exclude, prohibit/require arrays, complex rendering |
| EdgeCases | `.tsx` | Container with When child inspection |
| When | `.prompt` | Simple condition → action rendering |
| Fallback | `.prompt` | Simple when/then rendering |
| Fallbacks | `.tsx` | Container with Fallback child inspection |
| References | `.tsx` | Container with extend, sources array |
| Reference | `.prompt` | Simple title/url/description rendering |

### Tests to Write First

- `test/unit/components/new/guardrails.test.ts`:

  ```typescript
  describe('Guardrails', () => {
    it('should render standard preset', async () => {
      const element = jsx(Guardrails, { preset: 'standard' });
      const result = await render(element);
      expect(result.text).toContain('harmful');
      expect(result.text).toContain('system prompts');
    });

    it('should add custom prohibitions', async () => {
      const element = jsx(Guardrails, {
        preset: 'standard',
        prohibit: ['Discuss competitors'],
      });
      const result = await render(element);
      expect(result.text).toContain('Discuss competitors');
    });

    it('should support extend to add to preset', async () => {
      const element = jsx(Guardrails, {
        extend: true,
        require: ['Always cite sources'],
      });
      const result = await render(element);
      expect(result.text).toContain('Always cite sources');
    });
  });
  ```

- `test/unit/components/new/edge-cases.test.ts`:

  ```typescript
  describe('EdgeCases', () => {
    it('should render When children', async () => {
      const element = jsx(EdgeCases, {
        children: [
          jsx(When, { condition: 'input is empty', children: 'Ask for input' }),
          jsx(When, { condition: 'data is ambiguous', children: 'Ask for clarification' }),
        ],
      });
      const result = await render(element);
      expect(result.text).toContain('input is empty');
      expect(result.text).toContain('Ask for input');
    });
  });
  ```

- Similar test files for Fallback/Fallbacks, References/Reference

### Implementation

**.prompt components** (subject to Phase 5b.4 feasibility — fall back to `.tsx` if needed):
- `components/structural/When.prompt`: Simple condition → action rendering
- `components/structural/Fallback.prompt`: Simple when/then rendering
- `components/structural/Reference.prompt`: Simple title/url/description rendering

**.tsx components**:
- `components/structural/Guardrails.tsx`: Presets, extend/exclude, prohibit/require
- `components/structural/EdgeCases.tsx`: Container with When child inspection
- `components/structural/Fallbacks.tsx`: Container with Fallback child inspection
- `components/structural/References.tsx`: Container with extend, sources array

**Shared**:
- Wire containers into Prompt's defaults detection
- `components/index.ts`: Export all
- `src/services/preprocessor.ts`: Add to BUILTIN_COMPONENTS
- Register all new components in `defaultRegistry`

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/new-components/guardrails.e2e.test.ts`: Pipeline + snapshot for standard/strict presets, extend with prohibit/require
- `test/e2e/new-components/edge-cases.e2e.test.ts`: Pipeline + snapshot for When children
- `test/e2e/new-components/fallbacks.e2e.test.ts`: Pipeline + snapshot for Fallback when/then
- `test/e2e/new-components/references.e2e.test.ts`: Pipeline + snapshot for sources and Reference children

**Dependencies**:
- Internal: Phase 1 (child utilities), Phase 5b (.prompt feasibility), Phase 6 (container pattern, registry)

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run test -- test/e2e/new-components/guardrails.e2e.test.ts test/e2e/new-components/edge-cases.e2e.test.ts test/e2e/new-components/fallbacks.e2e.test.ts test/e2e/new-components/references.e2e.test.ts`
3. Run: `npm run lint && npm run build`
4. Verify `.prompt`-based components (When, Fallback, Reference) render correctly through the full pipeline
5. Verify all new components are registered in `defaultRegistry`
6. Manual: .prompt file using Guardrails and EdgeCases

---

## Phase 9: Environment-Conditional Rendering for .prompt Files

**Objective**: Extend the `<If>` component to support environment-conditional rendering, so `.prompt` files can do provider-aware rendering. Add `provider` prop and extend the formula system to access `context.env` values.

**Duration**: 2 days

**Design Reference**: System Capability Expansion 5

### Tests to Write First

- `test/unit/components/control/if-env.test.ts`:

  ```typescript
  describe('If environment conditions', () => {
    it('should render children when provider matches', async () => {
      const element = jsx(If, {
        provider: 'anthropic',
        children: 'Claude-specific content',
      });
      const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
      expect(result.text).toContain('Claude-specific content');
    });

    it('should NOT render children when provider does not match', async () => {
      const element = jsx(If, {
        provider: 'anthropic',
        children: 'Claude-specific content',
      });
      const result = await render(element, { env: { llm: { provider: 'openai' } } });
      expect(result.text).not.toContain('Claude-specific content');
    });

    it('should support array of providers', async () => {
      const element = jsx(If, {
        provider: ['anthropic', 'google'],
        children: 'Positive-framing providers',
      });
      const result = await render(element, { env: { llm: { provider: 'google' } } });
      expect(result.text).toContain('Positive-framing providers');
    });

    it('should support negated provider with not prop', async () => {
      const element = jsx(If, {
        notProvider: 'openai',
        children: 'Content for non-OpenAI providers',
      });
      const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
      expect(result.text).toContain('Content for non-OpenAI');
    });
  });
  ```

### Implementation

- `components/control/If.tsx`: Add `provider`, `notProvider` props alongside existing `when`
- `components/control/If.tsx` schema: Extend Zod schema with new props
- The `when` formula system can remain as-is (only inputs); the `provider` prop is a simpler, cleaner mechanism for the most common env-conditional case

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/components/if.e2e.test.ts`: Pipeline test verifying `<If provider="...">` renders conditionally for different providers in a .prompt file; snapshot for each provider

**Dependencies**:
- Internal: Phase 1 (function component context access), Phase 3 (environment context schema, provider types)

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run test -- test/e2e/components/if.e2e.test.ts`
3. Run: `npm run lint && npm run build`
4. Manual: .prompt file with provider switching:

   ```tsx
   // tmp/provider-switch.prompt
   <Prompt name="provider-demo" bare>
     <If provider="anthropic">
       <Format delimiter="xml" />
     </If>
     <If provider="openai">
       <Format delimiter="markdown" />
     </If>
     <Task>Explain generics</Task>
   </Prompt>
   ```

---

## Phase 10: Extensibility & DX

**Objective**: Polish and documentation. Add type-safe presets with autocomplete, validation for required sections, component slots on Prompt, and any remaining DX improvements. (Note: Component Registry was moved to Phase 6 per gap analysis.)

**Duration**: 2 days

**Design Reference**: Component Extensibility (Slots, Extension Points); Implementation Priorities Phase 6

### Tests to Write First

- `test/unit/components/structural/prompt-validation.test.ts`:

  ```typescript
  describe('Prompt validation', () => {
    it('should warn when no Task child is provided', async () => {
      const element = jsx(Prompt, {
        name: 'test',
        children: jsx(Role, { children: 'A role without a task' }),
      });
      const result = await render(element);
      // Should succeed but include a warning in errors
      expect(result.errors?.some(e => e.message.includes('Task'))).toBe(true);
    });
  });
  ```

- `test/unit/components/structural/prompt-slots.test.ts`:

  ```typescript
  describe('Prompt slots', () => {
    it('should use custom Role component via slots', async () => {
      class CustomRole extends Component {
        static schema = z.object({}).passthrough();
        render() { return 'CUSTOM ROLE'; }
      }
      const element = jsx(Prompt, {
        name: 'test',
        slots: { role: CustomRole },
        children: jsx(Task, { children: 'Do something' }),
      });
      const result = await render(element);
      expect(result.text).toContain('CUSTOM ROLE');
    });
  });
  ```

### Implementation

- `components/structural/Prompt.tsx`: Add `slots` prop, validation warnings
- Type improvements: Ensure preset string unions provide autocomplete in IDEs
- Consider adding a `<Prompt.validate>` static method for pre-render checks

**Slots vs Registry**: Both allow component replacement, but at different scopes:
- **Registry** (Phase 6): Global or scoped component name → class mapping. Affects all renders using that registry. Use for library-wide overrides (e.g., a theme system or custom component library).
- **Slots** (this phase): Per-`<Prompt>`-instance overrides via `slots={{ role: CustomRole }}`. Affects only that one Prompt. Use for one-off customizations within a specific prompt.
- **Precedence**: When both are active, `slots` wins — it is the most specific override. The renderer checks: slots → registry → default import.

**E2E Tests** (see [E2E Testing Strategy](#end-to-end-testing-strategy)):
- `test/e2e/full-featured-prompt.e2e.test.ts`: Comprehensive pipeline + snapshot test of a complete prompt using all features, rendered for anthropic/openai/google providers

**Dependencies**:
- Internal: Phases 1-5b, 6-9 (all previous phases)

**Verification**:
1. Run: `npm run test` — all tests pass
2. Run: `npm run test -- test/e2e/full-featured-prompt.e2e.test.ts`
3. Run: `npm run lint && npm run build`
4. Verify IDE autocomplete works for preset props in a .tsx file

---

## Common Utilities Needed

All utilities below are exported from the `pupt-lib` public API. Components import them via `import { ... } from 'pupt-lib'`, never from internal source paths.

| Utility | Source location | Used By | Phase |
|---------|----------------|---------|-------|
| `wrapWithDelimiter()` | `src/utils/delimiter.ts` | All structural components | 1 |
| `findChildrenOfType()` | `src/utils/children.ts` | Prompt, Steps, containers | 1 |
| `partitionChildren()` | `src/utils/children.ts` | Composition containers | 1 |
| `isElementOfType()` | `src/utils/children.ts` | Steps, Select, Prompt | 1 |
| `PROVIDER_ADAPTATIONS` | `src/utils/provider-adaptations.ts` | Role, Constraint, Format, Prompt | 3 |
| `LANGUAGE_CONVENTIONS` | `src/utils/provider-adaptations.ts` | Role, Format, Code | 3 |
| `ROLE_PRESETS` | `src/utils/role-presets.ts` | Role, Prompt | 4-5 |
| `TASK_PRESETS` | `src/utils/task-presets.ts` | Task | 5 |
| `CONSTRAINT_PRESETS` | `src/utils/constraint-presets.ts` | Constraint, Constraints | 5 |
| `STEPS_PRESETS` | `src/utils/steps-presets.ts` | Steps | 5 |
| `STANDARD_GUARDRAILS` | Guardrails component | Guardrails, Prompt | 8 |
| `ComponentRegistry` | `src/services/component-registry.ts` | render, Prompt (slots fallback) | 6 |
| `defaultRegistry` | `src/services/component-registry.ts` | render, index.ts | 6 |
| `hasContent()` | `src/component.ts` (method) | All structural components | 3 |

## External Libraries Assessment

No new external libraries are needed. The implementation builds entirely on existing dependencies:

- **zod** (already installed): Schema validation for all new and enhanced props
- **hyperformula** (already installed): Formula evaluation in `<If>` (no changes needed for Phase 9 — the `provider` prop bypass is simpler)
- **@babel/standalone** (already installed): Transformation for .prompt files (may need preprocessor updates for new component auto-imports)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking existing tests**: Refactoring 9 components to use `wrapWithDelimiter` could change output whitespace | Run full test suite after each component. Match exact current output in the utility. |
| **Prompt defaults changing behavior**: Existing `<Prompt>` is a passthrough; adding defaults is a behavioral change | Keep `bare` mode as escape hatch. Existing prompts that specify their own sections should detect them and skip defaults. |
| **Render order assumptions**: Components rendered in parallel can't reliably share metadata | Document that metadata sharing works parent→child but not sibling→sibling in parallel. Use only for parent components that render children sequentially. |
| **Preset data volume**: Full preset tables could add significant bundle size | Keep presets as plain objects (tree-shakeable). Consider lazy loading for large preset sets. |
| **Provider adaptation accuracy**: Adaptation rules based on research may become outdated | Make all adaptations data-driven (tables, not hardcoded logic). Easy to update tables without code changes. |
| **Child inspection performance**: Walking trees on every render could be slow for large prompts | `findChildrenOfType` only walks through Fragments (shallow), not all descendants. This matches how `<Prompt>` uses it — looking for top-level section components. |
| **Backward compatibility of `<If>`**: Adding `provider` prop must not break existing `when` usage | New props are additive. `when` continues to work exactly as before. `provider` is a separate code path. |
| **`.prompt` component feasibility**: The preprocessor wraps `.prompt` files as expressions, not component definitions. Declarative components may not be expressible as `.prompt` files. | Phase 5b.4 is a dedicated feasibility gate. If `.prompt` component definitions aren't viable, all Phase 7-8 components fall back to `.tsx`. The plan works either way. |
| **Prompt.ts concentration risk**: `Prompt.ts` is modified in 4 phases (4, 5b, 6, 10), each adding different functionality. | Each phase's changes are additive (new props, new child detection, new slots). Tests from prior phases act as regression guards. Run full Prompt test suite after each phase. |

## End-to-End Testing Strategy

Each phase includes two types of e2e tests beyond the unit tests already specified:

1. **Pipeline tests** (`.prompt` source → preprocessor → Babel → JSX runtime → render → text): Verify each component works through the full `createPromptFromSource()` pipeline, catching issues in auto-imports, preprocessing, and transformation that unit tests miss.

2. **Snapshot tests**: Render each component with canonical prop combinations and assert on the full output text. These catch unintended output regressions across phases.

Both test types live in `test/e2e/` and run as part of `npm run test`.

### Test File Structure

```
test/e2e/
  refactor-regression.e2e.test.ts   # Phase 1
  provider-adaptations.e2e.test.ts  # Phase 3
  prompt-shorthands.e2e.test.ts     # Phase 5b
  prompt-file-component.e2e.test.ts # Phase 5b
  component-registry.e2e.test.ts    # Phase 6
  full-featured-prompt.e2e.test.ts  # Phase 10
  components/
    role.e2e.test.ts           # Phase 2, 5
    task.e2e.test.ts           # Phase 5
    format.e2e.test.ts         # Phase 5
    context.e2e.test.ts        # Phase 5, 5b
    constraint.e2e.test.ts     # Phase 2, 5
    audience.e2e.test.ts       # Phase 5
    tone.e2e.test.ts           # Phase 5
    success-criteria.e2e.test.ts # Phase 5
    steps.e2e.test.ts          # Phase 2, 5
    prompt.e2e.test.ts         # Phase 4, 6
    if.e2e.test.ts             # Phase 9
  containers/
    constraints.e2e.test.ts    # Phase 6
    contexts.e2e.test.ts       # Phase 6
  new-components/
    objective.e2e.test.ts      # Phase 7
    style.e2e.test.ts          # Phase 7
    when-uncertain.e2e.test.ts # Phase 7
    chain-of-thought.e2e.test.ts # Phase 7
    specialization.e2e.test.ts # Phase 7
    negative-example.e2e.test.ts # Phase 7
    guardrails.e2e.test.ts     # Phase 8
    edge-cases.e2e.test.ts     # Phase 8
    fallbacks.e2e.test.ts      # Phase 8
    references.e2e.test.ts     # Phase 8
  snapshots/
    *.snap                     # Vitest inline snapshots or snapshot files
```

### Pipeline Test Pattern

Every component gets a pipeline test that uses `createPromptFromSource()` with raw `.prompt` syntax:

```typescript
import { describe, it, expect } from 'vitest';
import { createPromptFromSource } from '../../src/create-prompt';
import { render } from '../../src/render';

describe('Role e2e', () => {
  it('should render through full .prompt pipeline with defaults', async () => {
    const source = `
<Prompt name="role-test" bare>
  <Role>You are a helpful coding assistant.</Role>
  <Task>Help me write code.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-test.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('helpful coding assistant');
    expect(result.text).toContain('Help me write code');
  });

  it('should render preset through .prompt pipeline', async () => {
    const source = `
<Prompt name="role-preset" bare>
  <Role preset="engineer" expertise="TypeScript" />
  <Task>Review code.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-preset.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
    expect(result.text).toContain('TypeScript');
  });

  it('should adapt to provider through .prompt pipeline', async () => {
    const source = `
<Prompt name="role-provider" bare>
  <Role preset="engineer" />
  <Task>Do something.</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'role-provider.prompt');

    const claudeResult = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(claudeResult.text).toContain('You are');

    const geminiResult = await render(element, { env: { llm: { provider: 'google' } } });
    expect(geminiResult.text).toContain('Your role:');
  });
});
```

### Snapshot Test Pattern

Each component gets a snapshot test that captures the full rendered output for canonical prop combinations:

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '../../src/render';
import { jsx } from '../../src/jsx-runtime';
import { Role } from '../../components/structural/Role';
import { Task } from '../../components/structural/Task';
import { Prompt } from '../../components/structural/Prompt';

describe('Role snapshots', () => {
  it('should match snapshot: default XML delimiter', async () => {
    const element = jsx(Role, { children: 'Software Engineer' });
    const result = await render(element);
    expect(result.text).toMatchSnapshot();
  });

  it('should match snapshot: markdown delimiter', async () => {
    const element = jsx(Role, { delimiter: 'markdown', children: 'Software Engineer' });
    const result = await render(element);
    expect(result.text).toMatchSnapshot();
  });

  it('should match snapshot: preset with expertise', async () => {
    const element = jsx(Role, { preset: 'engineer', expertise: 'TypeScript, React' });
    const result = await render(element);
    expect(result.text).toMatchSnapshot();
  });

  it('should match snapshot: provider-adapted for anthropic', async () => {
    const element = jsx(Role, { preset: 'engineer' });
    const result = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(result.text).toMatchSnapshot();
  });

  it('should match snapshot: provider-adapted for google', async () => {
    const element = jsx(Role, { preset: 'engineer' });
    const result = await render(element, { env: { llm: { provider: 'google' } } });
    expect(result.text).toMatchSnapshot();
  });
});
```

### E2E Tests Per Phase

#### Phase 1: Utilities & Infrastructure

No component e2e tests yet (this phase is infrastructure). However, add a **regression pipeline test** that verifies refactored components produce identical output:

```typescript
// test/e2e/refactor-regression.e2e.test.ts
describe('wrapWithDelimiter refactor regression', () => {
  it('should produce identical output for Role after refactor', async () => {
    const source = `
<Prompt name="regression" bare>
  <Role>You are a helpful assistant.</Role>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'regression.prompt');
    const result = await render(element);
    expect(result.text).toMatchSnapshot();
  });

  // Same pattern for all 9 refactored structural components:
  // Task, Context, Constraint, Format, Audience, Tone, SuccessCriteria, Section
});
```

**Key**: These snapshots are captured BEFORE the refactor and verified AFTER it. This ensures the `wrapWithDelimiter` extraction doesn't change any output.

#### Phase 2: Existing Component Fixes

- `test/e2e/components/role.e2e.test.ts`: Pipeline + snapshot tests for `expertise` and `domain` props
- `test/e2e/components/constraint.e2e.test.ts`: Pipeline + snapshot tests for `may` and `should-not` types
- `test/e2e/components/steps.e2e.test.ts`: Pipeline test verifying Step children found through Fragments

```typescript
// test/e2e/components/constraint.e2e.test.ts
describe('Constraint e2e', () => {
  it('should render all 5 constraint types through pipeline', async () => {
    const source = `
<Prompt name="constraint-types" bare>
  <Constraint type="must">Be accurate</Constraint>
  <Constraint type="should">Be concise</Constraint>
  <Constraint type="may">Include examples</Constraint>
  <Constraint type="must-not">Hallucinate</Constraint>
  <Constraint type="should-not">Use jargon</Constraint>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'constraint-types.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('MUST:');
    expect(result.text).toContain('SHOULD:');
    expect(result.text).toContain('MAY:');
    expect(result.text).toContain('MUST NOT:');
    expect(result.text).toContain('SHOULD NOT:');
    expect(result.text).toMatchSnapshot();
  });
});
```

#### Phase 3: Provider Adaptation Tables

No new components, but add snapshot tests for provider adaptation data integrity:

```typescript
// test/e2e/provider-adaptations.e2e.test.ts
describe('Provider adaptations e2e', () => {
  it('should render same prompt differently for each provider', async () => {
    const source = `
<Prompt name="provider-test" bare>
  <Role preset="engineer" />
  <Task>Review code.</Task>
  <Constraint type="must-not" positive="Stay focused">Go off topic</Constraint>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'provider-test.prompt');

    for (const provider of ['anthropic', 'openai', 'google'] as const) {
      const result = await render(element, { env: { llm: { provider } } });
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    }
  });
});
```

#### Phase 4: Enhanced Prompt (Defaults System)

- `test/e2e/components/prompt.e2e.test.ts`: Full pipeline tests for the defaults system

```typescript
describe('Prompt defaults e2e', () => {
  it('should render with auto-generated defaults through pipeline', async () => {
    const source = `
<Prompt name="defaults-test">
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'defaults.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    // Should contain auto-generated role, constraints
    expect(result.text).toContain('assistant');
    expect(result.text).toContain('Summarize this document');
    expect(result.text).toMatchSnapshot();
  });

  it('should render bare mode through pipeline', async () => {
    const source = `
<Prompt name="bare-test" bare>
  <Task>Summarize this document</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'bare.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toMatchSnapshot();
  });

  it('should render role shorthand through pipeline', async () => {
    const source = `
<Prompt name="shorthand" role="engineer" expertise="TypeScript">
  <Task>Review code</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'shorthand.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Software Engineer');
    expect(result.text).toContain('TypeScript');
    expect(result.text).toMatchSnapshot();
  });
});
```

#### Phase 5: Enhanced Existing Components

Pipeline + snapshot tests for every enhanced component with presets:

- `test/e2e/components/task.e2e.test.ts`: Preset + verb + subject through pipeline
- `test/e2e/components/format.e2e.test.ts`: Schema + strict + provider preference through pipeline
- `test/e2e/components/context.e2e.test.ts`: Label + source + type through pipeline
- `test/e2e/components/audience.e2e.test.ts`: Level + type through pipeline
- `test/e2e/components/tone.e2e.test.ts`: Type + formality through pipeline
- `test/e2e/components/success-criteria.e2e.test.ts`: Presets + metrics through pipeline

```typescript
// test/e2e/components/task.e2e.test.ts
describe('Task e2e', () => {
  it('should render preset through pipeline', async () => {
    const source = `
<Prompt name="task-preset" bare>
  <Task preset="code-review" subject="the PR" objective="find bugs" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'task-preset.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('PR');
    expect(result.text).toContain('bugs');
    expect(result.text).toMatchSnapshot();
  });
});
```

#### Phase 6: Container Components & Composition

- `test/e2e/containers/constraints.e2e.test.ts`: Extend/exclude through pipeline
- `test/e2e/containers/contexts.e2e.test.ts`: Multiple contexts through pipeline
- `test/e2e/components/prompt.e2e.test.ts`: Add composition pipeline tests

```typescript
// test/e2e/containers/constraints.e2e.test.ts
describe('Constraints container e2e', () => {
  it('should extend default constraints through pipeline', async () => {
    const source = `
<Prompt name="extend-test">
  <Constraints extend>
    <Constraint type="must">Include code examples</Constraint>
  </Constraints>
  <Task>Explain generics</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'extend.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('code examples');
    expect(result.text).toContain('concise'); // default constraint still present
    expect(result.text).toMatchSnapshot();
  });

  it('should replace default constraints through pipeline', async () => {
    const source = `
<Prompt name="replace-test">
  <Constraints>
    <Constraint type="must">Only my constraint</Constraint>
  </Constraints>
  <Task>Do something</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'replace.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Only my constraint');
    expect(result.text).not.toContain('concise');
    expect(result.text).toMatchSnapshot();
  });
});
```

#### Phase 7: New Components — Batch 1

Pipeline + snapshot tests for each new component:

```typescript
// test/e2e/new-components/objective.e2e.test.ts
describe('Objective e2e', () => {
  it('should render through pipeline', async () => {
    const source = `
<Prompt name="objective-test" bare>
  <Objective primary="Build a REST API" secondary={['Handle auth', 'Support pagination']} />
  <Task>Implement the API</Task>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'objective.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Build a REST API');
    expect(result.text).toContain('Handle auth');
    expect(result.text).toMatchSnapshot();
  });
});

// test/e2e/new-components/when-uncertain.e2e.test.ts
describe('WhenUncertain e2e', () => {
  it('should render through pipeline', async () => {
    const source = `
<Prompt name="uncertain-test" bare>
  <Task>Answer the question</Task>
  <WhenUncertain action="ask" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'uncertain.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('clarifying questions');
    expect(result.text).toMatchSnapshot();
  });
});
```

Same pattern for Style, ChainOfThought, Specialization, NegativeExample.

#### Phase 8: New Components — Batch 2

Pipeline + snapshot tests for each behavioral component:

```typescript
// test/e2e/new-components/guardrails.e2e.test.ts
describe('Guardrails e2e', () => {
  it('should render standard preset through pipeline', async () => {
    const source = `
<Prompt name="guardrails-test" bare>
  <Task>Help the user</Task>
  <Guardrails preset="standard" />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'guardrails.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('harmful');
    expect(result.text).toMatchSnapshot();
  });

  it('should extend with custom prohibitions through pipeline', async () => {
    const source = `
<Prompt name="guardrails-extend" bare>
  <Task>Help the user</Task>
  <Guardrails extend prohibit={['Discuss competitors']} />
</Prompt>
`;
    const element = await createPromptFromSource(source, 'guardrails-extend.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Discuss competitors');
    expect(result.text).toMatchSnapshot();
  });
});

// test/e2e/new-components/edge-cases.e2e.test.ts
describe('EdgeCases e2e', () => {
  it('should render When children through pipeline', async () => {
    const source = `
<Prompt name="edge-cases-test" bare>
  <Task>Process user input</Task>
  <EdgeCases>
    <When condition="input is empty">Ask for input</When>
    <When condition="data is ambiguous">Ask for clarification</When>
  </EdgeCases>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'edge-cases.prompt');
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('input is empty');
    expect(result.text).toContain('Ask for clarification');
    expect(result.text).toMatchSnapshot();
  });
});
```

Same pattern for Fallbacks, References.

#### Phase 9: Environment-Conditional Rendering

Pipeline tests for `<If provider="...">` in .prompt files:

```typescript
// test/e2e/components/if.e2e.test.ts
describe('If provider e2e', () => {
  it('should conditionally render based on provider in .prompt file', async () => {
    const source = `
<Prompt name="if-provider" bare>
  <Task>Explain something</Task>
  <If provider="anthropic">
    <Format delimiter="xml" />
  </If>
  <If provider="openai">
    <Format delimiter="markdown" />
  </If>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'if-provider.prompt');

    const claudeResult = await render(element, { env: { llm: { provider: 'anthropic' } } });
    expect(claudeResult.text).toContain('xml');
    expect(claudeResult.text).not.toContain('markdown');

    const gptResult = await render(element, { env: { llm: { provider: 'openai' } } });
    expect(gptResult.text).toContain('markdown');
    expect(gptResult.text).not.toContain('xml');
  });
});
```

#### Phase 10: Extensibility & DX

Comprehensive integration snapshot test of a full prompt using all features:

```typescript
// test/e2e/full-featured-prompt.e2e.test.ts
describe('Full-featured prompt e2e', () => {
  it('should render a complete prompt with all features through pipeline', async () => {
    const source = `
<Prompt name="full-featured" role="engineer" expertise="TypeScript">
  <Context label="Project">Building a React app</Context>
  <Task preset="code-review" subject="the PR" />
  <Constraints extend>
    <Constraint type="must">Include code examples</Constraint>
  </Constraints>
  <Format type="markdown" strict />
  <Steps preset="problem-solving" verify />
  <Guardrails preset="standard" />
  <WhenUncertain action="ask" />
  <Examples>
    <Example>
      <Example.Input>Review this function</Example.Input>
      <Example.Output>The function has a potential null reference...</Example.Output>
    </Example>
  </Examples>
</Prompt>
`;
    const element = await createPromptFromSource(source, 'full-featured.prompt');

    // Test with different providers
    for (const provider of ['anthropic', 'openai', 'google'] as const) {
      const result = await render(element, { env: { llm: { provider } } });
      expect(result.ok).toBe(true);
      expect(result.text).toContain('Software Engineer');
      expect(result.text).toContain('TypeScript');
      expect(result.text).toContain('Building a React app');
      expect(result.text).toContain('PR');
      expect(result.text).toContain('code examples');
      expect(result.text).toContain('markdown');
      expect(result.text).toContain('harmful'); // guardrails
      expect(result.text).toContain('clarifying questions'); // when uncertain
      expect(result.text).toMatchSnapshot();
    }
  });
});
```

---

## Files Modified Summary

### New Files

| File | Phase | Purpose |
|------|-------|---------|
| `src/utils/delimiter.ts` | 1 | Shared delimiter wrapping utility |
| `src/utils/children.ts` | 1 | Child inspection utilities |
| `src/utils/provider-adaptations.ts` | 3 | PROVIDER_ADAPTATIONS, LANGUAGE_CONVENTIONS |
| `src/utils/role-presets.ts` | 4-5 | ROLE_PRESETS table |
| `src/utils/task-presets.ts` | 5 | TASK_PRESETS table |
| `src/utils/constraint-presets.ts` | 5 | CONSTRAINT_PRESETS table |
| `src/utils/steps-presets.ts` | 5 | STEPS_PRESETS table |
| `src/utils/default-constraints.ts` | 4 | Default constraint text |
| `design/public-api-audit.md` | 5b | Public API audit of all built-in components |
| `design/prompt-file-components-decision.md` | 5b | Decision document: can .prompt files define components? |
| `src/services/component-registry.ts` | 6 | ComponentRegistry class with parent chaining |
| `components/structural/Objective.prompt` | 7 | New component (.prompt — declarative) |
| `components/structural/Style.prompt` | 7 | New component (.prompt — declarative) |
| `components/structural/WhenUncertain.prompt` | 7 | New component (.prompt — declarative) |
| `components/structural/Specialization.prompt` | 7 | New component (.prompt — declarative) |
| `components/reasoning/ChainOfThought.tsx` | 7 | New component (.tsx — logic required) |
| `components/examples/NegativeExample.tsx` | 7 | New component (.tsx — logic required) |
| `components/structural/Guardrails.tsx` | 8 | New component (.tsx — extend/preset logic) |
| `components/structural/EdgeCases.tsx` | 8 | New component (.tsx — child composition) |
| `components/structural/When.prompt` | 8 | New component (.prompt — declarative) |
| `components/structural/Fallback.prompt` | 8 | New component (.prompt — declarative) |
| `components/structural/Fallbacks.tsx` | 8 | New component (.tsx — child composition) |
| `components/structural/References.tsx` | 8 | New component (.tsx — child composition) |
| `components/structural/Reference.prompt` | 8 | New component (.prompt — declarative) |
| `components/structural/Constraints.tsx` | 6 | Container component |
| `components/structural/Contexts.tsx` | 6 | Container component |

> **Note:** File extensions for Phases 7-8 are preliminary. The Phase 5b.4 feasibility test determines whether `.prompt` files can define components. If not, all `.prompt` entries above will use `.tsx` instead.

### New Test Files

| File | Phase | Purpose |
|------|-------|---------|
| `test/unit/utils/delimiter.test.ts` | 1 | Delimiter utility unit tests |
| `test/unit/utils/children.test.ts` | 1 | Child inspection utility unit tests |
| `test/unit/context-metadata.test.ts` | 1 | RenderContext metadata unit tests |
| `test/unit/function-component-context.test.ts` | 1 | Function component context access unit tests |
| `test/unit/utils/provider-adaptations.test.ts` | 3 | Provider adaptations + language conventions unit tests |
| `test/unit/component-helpers.test.ts` | 3 | getProvider/getDelimiter unit tests |
| `test/unit/prompt-config.test.ts` | 3 | PromptConfig schema unit tests |
| `test/unit/components/structural/prompt-defaults.test.ts` | 4 | Prompt defaults system unit tests |
| `test/unit/components/structural/prompt-shorthands.test.ts` | 5b | noRole/noFormat/noConstraints/noSuccessCriteria/defaults="none" |
| `test/unit/components/structural/context-content-handling.test.ts` | 5b | truncate, maxTokens, preserveFormatting props |
| `test/unit/public-api-audit.test.ts` | 5b | Verify all built-in components use only public API |
| `test/unit/prompt-component-definition.test.ts` | 5b | .prompt file component definition feasibility |
| `test/unit/services/component-registry.test.ts` | 6 | ComponentRegistry unit tests (register, get, parent chaining) |
| `test/unit/components/structural/prompt-composition.test.ts` | 6 | Prompt composition unit tests |
| `test/unit/components/structural/prompt-validation.test.ts` | 10 | Prompt validation unit tests |
| `test/unit/components/structural/prompt-slots.test.ts` | 10 | Prompt slots unit tests |
| `test/e2e/refactor-regression.e2e.test.ts` | 1 | Snapshot regression for 9 refactored components |
| `test/e2e/provider-adaptations.e2e.test.ts` | 3 | Provider-specific rendering e2e |
| `test/e2e/components/role.e2e.test.ts` | 2, 5 | Role pipeline + snapshot |
| `test/e2e/components/task.e2e.test.ts` | 5 | Task pipeline + snapshot |
| `test/e2e/components/format.e2e.test.ts` | 5 | Format pipeline + snapshot |
| `test/e2e/components/context.e2e.test.ts` | 5 | Context pipeline + snapshot |
| `test/e2e/components/constraint.e2e.test.ts` | 2, 5 | Constraint pipeline + snapshot |
| `test/e2e/components/audience.e2e.test.ts` | 5 | Audience pipeline + snapshot |
| `test/e2e/components/tone.e2e.test.ts` | 5 | Tone pipeline + snapshot |
| `test/e2e/components/success-criteria.e2e.test.ts` | 5 | SuccessCriteria pipeline + snapshot |
| `test/e2e/components/steps.e2e.test.ts` | 2, 5 | Steps pipeline + snapshot |
| `test/e2e/prompt-shorthands.e2e.test.ts` | 5b | Shorthand disable props through pipeline |
| `test/e2e/prompt-file-component.e2e.test.ts` | 5b | .prompt file component definition through pipeline |
| `test/e2e/component-registry.e2e.test.ts` | 6 | Registry override through full pipeline |
| `test/e2e/components/prompt.e2e.test.ts` | 4, 6 | Prompt defaults + composition pipeline + snapshot |
| `test/e2e/components/if.e2e.test.ts` | 9 | If provider-conditional pipeline + snapshot |
| `test/e2e/containers/constraints.e2e.test.ts` | 6 | Constraints container extend/replace pipeline + snapshot |
| `test/e2e/containers/contexts.e2e.test.ts` | 6 | Contexts container pipeline + snapshot |
| `test/unit/components/new/objective.test.ts` | 7 | Objective unit tests |
| `test/unit/components/new/style.test.ts` | 7 | Style unit tests |
| `test/unit/components/new/when-uncertain.test.ts` | 7 | WhenUncertain unit tests |
| `test/unit/components/new/chain-of-thought.test.ts` | 7 | ChainOfThought unit tests |
| `test/unit/components/new/specialization.test.ts` | 7 | Specialization unit tests |
| `test/unit/components/new/negative-example.test.ts` | 7 | NegativeExample unit tests |
| `test/unit/components/new/guardrails.test.ts` | 8 | Guardrails unit tests |
| `test/unit/components/new/edge-cases.test.ts` | 8 | EdgeCases + When unit tests |
| `test/unit/components/new/fallbacks.test.ts` | 8 | Fallbacks + Fallback unit tests |
| `test/unit/components/new/references.test.ts` | 8 | References + Reference unit tests |
| `test/e2e/new-components/objective.e2e.test.ts` | 7 | Objective pipeline + snapshot |
| `test/e2e/new-components/style.e2e.test.ts` | 7 | Style pipeline + snapshot |
| `test/e2e/new-components/when-uncertain.e2e.test.ts` | 7 | WhenUncertain pipeline + snapshot |
| `test/e2e/new-components/chain-of-thought.e2e.test.ts` | 7 | ChainOfThought pipeline + snapshot |
| `test/e2e/new-components/specialization.e2e.test.ts` | 7 | Specialization pipeline + snapshot |
| `test/e2e/new-components/negative-example.e2e.test.ts` | 7 | NegativeExample pipeline + snapshot |
| `test/e2e/new-components/guardrails.e2e.test.ts` | 8 | Guardrails pipeline + snapshot |
| `test/e2e/new-components/edge-cases.e2e.test.ts` | 8 | EdgeCases pipeline + snapshot |
| `test/e2e/new-components/fallbacks.e2e.test.ts` | 8 | Fallbacks pipeline + snapshot |
| `test/e2e/new-components/references.e2e.test.ts` | 8 | References pipeline + snapshot |
| `test/e2e/full-featured-prompt.e2e.test.ts` | 10 | Full-featured prompt across providers |

### Modified Files

| File | Phase | Change |
|------|-------|--------|
| `src/types/context.ts` | 1, 3 | Add metadata to RenderContext; add promptConfigSchema |
| `src/types/render.ts` | 6 | Add `registry?: ComponentRegistry` to RenderOptions |
| `src/render.ts` | 1, 6 | Initialize metadata; pass context to function components; registry lookup for string-typed elements |
| `src/component.ts` | 3 | Add getProvider(), getDelimiter() helpers |
| `components/structural/Role.tsx` | 2, 5 | Fix unused props; add presets, provider-aware rendering |
| `components/structural/Task.tsx` | 1, 5 | Use wrapWithDelimiter; add presets |
| `components/structural/Context.tsx` | 1, 5, 5b | Use wrapWithDelimiter; add label, type, source; add truncate, maxTokens, preserveFormatting |
| `components/structural/Constraint.tsx` | 1, 2, 5 | Use wrapWithDelimiter; add types; add presets, positive framing |
| `components/structural/Format.tsx` | 1, 5 | Use wrapWithDelimiter; add schema, provider preference |
| `components/structural/Audience.tsx` | 1, 5 | Use wrapWithDelimiter; add level, type, description |
| `components/structural/Tone.tsx` | 1, 5 | Use wrapWithDelimiter; add type, formality, energy |
| `components/structural/SuccessCriteria.tsx` | 1, 5 | Use wrapWithDelimiter; add presets, metrics |
| `components/structural/Section.tsx` | 1 | Use wrapWithDelimiter |
| `components/structural/Prompt.tsx` | 4, 5b, 6, 10 | Defaults system; noRole/noFormat/noConstraints/noSuccessCriteria/defaults="none" shorthands; composition; slots |
| `components/reasoning/Steps.tsx` | 2, 5 | Use isElementOfType; add presets, style |
| `components/ask/Select.tsx` | 2 | Use isElementOfType |
| `components/ask/MultiSelect.tsx` | 2 | Use isElementOfType |
| `components/control/If.tsx` | 9 | Add provider prop |
| `components/index.ts` | 6-8 | Export new components |
| `src/services/preprocessor.ts` | 6-8 | Add new components to BUILTIN_COMPONENTS |
| `src/index.ts` | 1, 3, 6 | Export new utilities, types, and ComponentRegistry |
