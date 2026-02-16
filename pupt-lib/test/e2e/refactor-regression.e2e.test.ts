import { describe, it, expect } from 'vitest';
import { render } from '../../src/render';
import { jsx } from '../../src/jsx-runtime';
import { Role } from '../../components/structural/Role';
import { Task } from '../../components/structural/Task';
import { Context } from '../../components/structural/Context';
import { Constraint } from '../../components/structural/Constraint';
import { Format } from '../../components/structural/Format';
import { Audience } from '../../components/structural/Audience';
import { Tone } from '../../components/structural/Tone';
import { SuccessCriteria } from '../../components/structural/SuccessCriteria';
import { Section } from '../../components/structural/Section';

describe('wrapWithDelimiter refactor regression', () => {
  // Role
  describe('Role', () => {
    it('should produce identical output with xml delimiter', async () => {
      const result = await render(jsx(Role, { children: 'You are a helpful assistant.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(Role, { delimiter: 'markdown', children: 'You are a helpful assistant.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(Role, { delimiter: 'none', children: 'You are a helpful assistant.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });

  // Task
  describe('Task', () => {
    it('should produce identical output with xml delimiter', async () => {
      const result = await render(jsx(Task, { children: 'Do the thing.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(Task, { delimiter: 'markdown', children: 'Do the thing.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(Task, { delimiter: 'none', children: 'Do the thing.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });

  // Context
  describe('Context', () => {
    it('should produce identical output with xml delimiter', async () => {
      const result = await render(jsx(Context, { children: 'Background info.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(Context, { delimiter: 'markdown', children: 'Background info.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(Context, { delimiter: 'none', children: 'Background info.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });

  // Constraint
  describe('Constraint', () => {
    it('should produce identical output with xml delimiter', async () => {
      const result = await render(jsx(Constraint, { children: 'Be concise.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with type prefix', async () => {
      const result = await render(jsx(Constraint, { type: 'must', children: 'Be accurate.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with must-not type', async () => {
      const result = await render(jsx(Constraint, { type: 'must-not', children: 'Lie.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(Constraint, { delimiter: 'markdown', type: 'should', children: 'Be helpful.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(Constraint, { delimiter: 'none', type: 'must', children: 'Be safe.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });

  // Format
  describe('Format', () => {
    it('should produce identical output with xml delimiter', async () => {
      const result = await render(jsx(Format, { children: 'Use JSON format.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with type prop', async () => {
      const result = await render(jsx(Format, { type: 'json', children: 'Output as JSON.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with type and language', async () => {
      const result = await render(jsx(Format, { type: 'code', language: 'typescript' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(Format, { delimiter: 'markdown', type: 'json' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(Format, { delimiter: 'none', type: 'xml' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });

  // Audience
  describe('Audience', () => {
    it('should produce identical output with xml delimiter', async () => {
      const result = await render(jsx(Audience, { children: 'Developers.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(Audience, { delimiter: 'markdown', children: 'Developers.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(Audience, { delimiter: 'none', children: 'Developers.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });

  // Tone
  describe('Tone', () => {
    it('should produce identical output with xml delimiter', async () => {
      const result = await render(jsx(Tone, { children: 'Professional.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(Tone, { delimiter: 'markdown', children: 'Professional.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(Tone, { delimiter: 'none', children: 'Professional.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });

  // SuccessCriteria
  describe('SuccessCriteria', () => {
    it('should produce identical output with xml delimiter', async () => {
      const result = await render(jsx(SuccessCriteria, { children: 'Criteria met.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(SuccessCriteria, { delimiter: 'markdown', children: 'Criteria met.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(SuccessCriteria, { delimiter: 'none', children: 'Criteria met.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });

  // Section
  describe('Section', () => {
    it('should produce identical output with default (no name)', async () => {
      const result = await render(jsx(Section, { children: 'Generic section.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with name', async () => {
      const result = await render(jsx(Section, { name: 'custom', children: 'Named section.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with markdown delimiter', async () => {
      const result = await render(jsx(Section, { name: 'custom', delimiter: 'markdown', children: 'Markdown section.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });

    it('should produce identical output with none delimiter', async () => {
      const result = await render(jsx(Section, { delimiter: 'none', children: 'No delimiter.' }));
      expect(result.ok).toBe(true);
      expect(result.text).toMatchSnapshot();
    });
  });
});
