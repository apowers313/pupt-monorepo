import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Component } from '../../../../src/component';
import { Prompt } from '../../../../components/structural/Prompt';
import { Task } from '../../../../components/structural/Task';
import { Role } from '../../../../components/structural/Role';
import type { PuptNode, RenderContext } from '../../../../src/types';
import { createEnvironment } from '../../../../src/types/context';

describe('Prompt slots', () => {
  it('should use custom Role component via slots', async () => {
    class CustomRole extends Component {
      static schema = z.object({}).passthrough();
      render(): PuptNode {
        return 'CUSTOM ROLE';
      }
    }
    const element = jsx(Prompt, {
      name: 'test',
      slots: { role: CustomRole },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('CUSTOM ROLE');
  });

  it('should use custom Format component via slots', async () => {
    class CustomFormat extends Component {
      static schema = z.object({}).passthrough();
      render(): PuptNode {
        return 'CUSTOM FORMAT';
      }
    }
    const element = jsx(Prompt, {
      name: 'test',
      slots: { format: CustomFormat },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('CUSTOM FORMAT');
    // Default format should not be present
    expect(result.text).not.toContain('Output format');
  });

  it('should use custom Constraints component via slots', async () => {
    class CustomConstraints extends Component {
      static schema = z.object({}).passthrough();
      render(): PuptNode {
        return 'CUSTOM CONSTRAINTS';
      }
    }
    const element = jsx(Prompt, {
      name: 'test',
      slots: { constraints: CustomConstraints },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('CUSTOM CONSTRAINTS');
    // Default constraints should not be present
    expect(result.text).not.toContain('concise');
  });

  it('should not use slot when explicit child of that type is provided', async () => {
    class CustomRole extends Component {
      static schema = z.object({}).passthrough();
      render(): PuptNode {
        return 'CUSTOM ROLE FROM SLOT';
      }
    }
    const element = jsx(Prompt, {
      name: 'test',
      slots: { role: CustomRole },
      children: [
        jsx(Role, { children: 'Explicit role from child' }),
        jsx(Task, { children: 'Do something' }),
      ],
    });
    const result = await render(element);
    // Explicit child wins over slot
    expect(result.text).toContain('Explicit role from child');
    expect(result.text).not.toContain('CUSTOM ROLE FROM SLOT');
  });

  it('should support multiple slots at once', async () => {
    class CustomRole extends Component {
      static schema = z.object({}).passthrough();
      render(): PuptNode {
        return 'SLOT ROLE';
      }
    }
    class CustomFormat extends Component {
      static schema = z.object({}).passthrough();
      render(): PuptNode {
        return 'SLOT FORMAT';
      }
    }
    const element = jsx(Prompt, {
      name: 'test',
      slots: { role: CustomRole, format: CustomFormat },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    expect(result.text).toContain('SLOT ROLE');
    expect(result.text).toContain('SLOT FORMAT');
  });

  it('should not use slots when bare mode is enabled', async () => {
    class CustomRole extends Component {
      static schema = z.object({}).passthrough();
      render(): PuptNode {
        return 'SLOT ROLE';
      }
    }
    const element = jsx(Prompt, {
      name: 'test',
      bare: true,
      slots: { role: CustomRole },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element);
    // Bare mode skips all defaults including slots
    expect(result.text).not.toContain('SLOT ROLE');
    expect(result.text).toContain('Do something');
  });

  it('slot component should receive context', async () => {
    class ContextAwareRole extends Component {
      static schema = z.object({}).passthrough();
      render(_props: Record<string, unknown>, _resolvedValue: void, context: RenderContext): PuptNode {
        const provider = this.getProvider(context);
        return `Role for provider: ${provider}`;
      }
    }
    const element = jsx(Prompt, {
      name: 'test',
      slots: { role: ContextAwareRole },
      children: jsx(Task, { children: 'Do something' }),
    });
    const result = await render(element, {
      env: createEnvironment({ llm: { provider: 'openai' } }),
    });
    expect(result.text).toContain('Role for provider: openai');
  });
});
