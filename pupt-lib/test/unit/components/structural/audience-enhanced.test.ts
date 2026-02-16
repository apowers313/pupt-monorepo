import { describe, expect,it } from 'vitest';

import { Audience } from '../../../../components/structural/Audience';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Audience enhanced props', () => {
  it('should render level and type', async () => {
    const element = jsx(Audience, { level: 'beginner', type: 'technical' });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('beginner');
    expect(result.text).toContain('technical');
  });

  it('should render level-specific guidance for beginner', async () => {
    const element = jsx(Audience, { level: 'beginner' });
    const result = await render(element);
    expect(result.text).toContain('simple language');
    expect(result.text).toContain('avoid jargon');
  });

  it('should render level-specific guidance for expert', async () => {
    const element = jsx(Audience, { level: 'expert' });
    const result = await render(element);
    expect(result.text).toContain('peer');
  });

  it('should render description', async () => {
    const element = jsx(Audience, {
      description: 'Junior developers on their first React project',
    });
    const result = await render(element);
    expect(result.text).toContain('Junior developers');
  });

  it('should render knowledgeLevel', async () => {
    const element = jsx(Audience, {
      knowledgeLevel: 'JavaScript basics, HTML/CSS',
    });
    const result = await render(element);
    expect(result.text).toContain('Assume they know: JavaScript basics');
  });

  it('should render goals', async () => {
    const element = jsx(Audience, {
      goals: ['Build a simple app', 'Understand component lifecycle'],
    });
    const result = await render(element);
    expect(result.text).toContain('Build a simple app');
    expect(result.text).toContain('Understand component lifecycle');
  });

  it('should prefer children over props', async () => {
    const element = jsx(Audience, {
      level: 'beginner',
      children: 'Custom audience description',
    });
    const result = await render(element);
    expect(result.text).toContain('Custom audience description');
  });
});
