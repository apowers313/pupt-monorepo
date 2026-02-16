import { describe, expect,it } from 'vitest';

import { Criterion } from '../../../../components/structural/Criterion';
import { SuccessCriteria } from '../../../../components/structural/SuccessCriteria';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('SuccessCriteria enhanced props', () => {
  it('should render accuracy preset', async () => {
    const element = jsx(SuccessCriteria, { presets: ['accuracy'] });
    const result = await render(element);
    expect(result.ok).toBe(true);
    expect(result.text).toContain('factually accurate');
  });

  it('should render multiple presets', async () => {
    const element = jsx(SuccessCriteria, { presets: ['accuracy', 'clarity'] });
    const result = await render(element);
    expect(result.text).toContain('factually accurate');
    expect(result.text).toContain('Easy to follow');
  });

  it('should render metrics', async () => {
    const element = jsx(SuccessCriteria, {
      metrics: [
        { name: 'Accuracy', threshold: '>=90%' },
        { name: 'Errors', threshold: '<5' },
      ],
    });
    const result = await render(element);
    expect(result.text).toContain('Accuracy: >=90%');
    expect(result.text).toContain('Errors: <5');
  });

  it('should render presets with custom criteria children', async () => {
    const element = jsx(SuccessCriteria, {
      presets: ['accuracy'],
      children: jsx(Criterion, { children: 'Custom criterion' }),
    });
    const result = await render(element);
    expect(result.text).toContain('factually accurate');
    expect(result.text).toContain('Custom criterion');
  });
});

describe('Criterion enhanced props', () => {
  it('should render basic criterion', async () => {
    const element = jsx(Criterion, { children: 'Response is helpful' });
    const result = await render(element);
    expect(result.text).toContain('- Response is helpful');
  });

  it('should render category', async () => {
    const element = jsx(Criterion, {
      category: 'accuracy',
      children: 'Factually correct',
    });
    const result = await render(element);
    expect(result.text).toContain('(accuracy)');
  });

  it('should render critical weight', async () => {
    const element = jsx(Criterion, {
      weight: 'critical',
      children: 'Must be accurate',
    });
    const result = await render(element);
    expect(result.text).toContain('[CRITICAL]');
  });

  it('should render metric', async () => {
    const element = jsx(Criterion, {
      metric: '>=95%',
      children: 'Accuracy score',
    });
    const result = await render(element);
    expect(result.text).toContain('[>=95%]');
  });
});
