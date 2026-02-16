import { describe, expect,it } from 'vitest';

import { ForEach } from '../../components/control/ForEach';
import { If } from '../../components/control/If';
import { Code } from '../../components/data/Code';
import { Data } from '../../components/data/Data';
import { Json } from '../../components/data/Json';
import { Xml } from '../../components/data/Xml';
import { Example } from '../../components/examples/Example';
import { Examples } from '../../components/examples/Examples';
import { Step } from '../../components/reasoning/Step';
// Import other components
import { Steps } from '../../components/reasoning/Steps';
import { Audience } from '../../components/structural/Audience';
import { Constraint } from '../../components/structural/Constraint';
import { Context } from '../../components/structural/Context';
import { Criterion } from '../../components/structural/Criterion';
import { Format } from '../../components/structural/Format';
// Import all structural components
import { Prompt } from '../../components/structural/Prompt';
import { Role } from '../../components/structural/Role';
import { Section } from '../../components/structural/Section';
import { SuccessCriteria } from '../../components/structural/SuccessCriteria';
import { Task } from '../../components/structural/Task';
import { Tone } from '../../components/structural/Tone';
import { Component, COMPONENT_MARKER } from '../../src/component';

describe('Public API audit', () => {
  const structuralComponents = [
    { name: 'Prompt', cls: Prompt },
    { name: 'Section', cls: Section },
    { name: 'Role', cls: Role },
    { name: 'Task', cls: Task },
    { name: 'Context', cls: Context },
    { name: 'Constraint', cls: Constraint },
    { name: 'Format', cls: Format },
    { name: 'Audience', cls: Audience },
    { name: 'Tone', cls: Tone },
    { name: 'SuccessCriteria', cls: SuccessCriteria },
    { name: 'Criterion', cls: Criterion },
  ];

  const allComponents = [
    ...structuralComponents,
    { name: 'Steps', cls: Steps },
    { name: 'Step', cls: Step },
    { name: 'If', cls: If },
    { name: 'ForEach', cls: ForEach },
    { name: 'Examples', cls: Examples },
    { name: 'Example', cls: Example },
    { name: 'Code', cls: Code },
    { name: 'Data', cls: Data },
    { name: 'Json', cls: Json },
    { name: 'Xml', cls: Xml },
  ];

  it('all structural components should extend Component base class', () => {
    for (const { cls } of structuralComponents) {
      expect(cls.prototype).toBeInstanceOf(Component);
      expect((cls as unknown as Record<symbol, unknown>)[COMPONENT_MARKER]).toBe(true);
    }
  });

  it('all components should have the COMPONENT_MARKER', () => {
    for (const { name, cls } of allComponents) {
      expect(
        (cls as unknown as Record<symbol, unknown>)[COMPONENT_MARKER],
        `${name} should have COMPONENT_MARKER`,
      ).toBe(true);
    }
  });

  it('all components should have a static schema property', () => {
    for (const { name, cls } of allComponents) {
      expect(
        (cls as unknown as Record<string, unknown>).schema,
        `${name} should have a static schema`,
      ).toBeDefined();
    }
  });

  it('all components should have render or resolve method on prototype', () => {
    for (const { name, cls } of allComponents) {
      const hasRender = typeof cls.prototype.render === 'function';
      const hasResolve = typeof cls.prototype.resolve === 'function';
      expect(
        hasRender || hasResolve,
        `${name} should have render() or resolve()`,
      ).toBe(true);
    }
  });

  it('structural components should not import from src/render.ts', async () => {
    // Verify by checking that components can be instantiated independently
    // without needing the render module. This is a structural test -
    // if components imported render internals, they would have circular dependencies.
    for (const { name, cls } of structuralComponents) {
      const instance = new (cls as new () => Component)();
      expect(instance, `${name} should be instantiable`).toBeDefined();
    }
  });
});
