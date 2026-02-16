import { describe, expect,it } from 'vitest';

import { Prompt } from '../../components/structural/Prompt';
import { Role } from '../../components/structural/Role';
import { jsx } from '../../src/jsx-runtime';
import { render } from '../../src/render';
import { isWarningCode } from '../../src/types/render';

// Prompt without a Task child produces a warn_missing_task warning
function promptWithoutTask() {
  return jsx(Prompt, {
    name: 'test',
    children: jsx(Role, { children: 'A role' }),
  });
}

describe('isWarningCode', () => {
  it('should return true for warn_ prefixed codes', () => {
    expect(isWarningCode('warn_missing_task')).toBe(true);
    expect(isWarningCode('warn_conflicting_instructions')).toBe(true);
    expect(isWarningCode('warn_anything')).toBe(true);
  });

  it('should return true for legacy validation_warning code', () => {
    expect(isWarningCode('validation_warning')).toBe(true);
  });

  it('should return false for non-warning codes', () => {
    expect(isWarningCode('runtime_error')).toBe(false);
    expect(isWarningCode('unknown_component')).toBe(false);
    expect(isWarningCode('invalid_type')).toBe(false);
    expect(isWarningCode('warning')).toBe(false);
  });
});

describe('render warning options', () => {
  it('should return warnings in result.errors with ok: true by default', async () => {
    const result = await render(promptWithoutTask());
    expect(result.ok).toBe(true);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.code === 'warn_missing_task')).toBe(true);
  });

  it('should promote warnings to errors when throwOnWarnings is true', async () => {
    const result = await render(promptWithoutTask(), { throwOnWarnings: true });
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.code === 'warn_missing_task')).toBe(true);
  });

  it('should suppress ignored warnings', async () => {
    const result = await render(promptWithoutTask(), {
      ignoreWarnings: ['warn_missing_task'],
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  it('should not suppress non-matching warning codes', async () => {
    const result = await render(promptWithoutTask(), {
      ignoreWarnings: ['warn_other'],
    });
    expect(result.ok).toBe(true);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.code === 'warn_missing_task')).toBe(true);
  });
});
