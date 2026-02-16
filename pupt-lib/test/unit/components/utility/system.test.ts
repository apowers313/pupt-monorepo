import { describe, expect,it } from 'vitest';

import { Cwd,Hostname, Username } from '../../../../components/utility';
import { jsx } from '../../../../src/jsx-runtime';
import { render } from '../../../../src/render';

describe('Hostname', () => {
  it('should render system hostname', async () => {
    const element = jsx(Hostname, {});
    const result = await render(element);

    // Should be a non-empty string
    expect(result.text.length).toBeGreaterThan(0);
    // Hostname typically doesn't contain spaces
    expect(result.text).not.toContain(' ');
  });
});

describe('Username', () => {
  it('should render current username', async () => {
    const element = jsx(Username, {});
    const result = await render(element);

    // Should be a non-empty string
    expect(result.text.length).toBeGreaterThan(0);
    // Username typically doesn't contain spaces
    expect(result.text).not.toContain(' ');
  });
});

describe('Cwd', () => {
  it('should render current working directory', async () => {
    const element = jsx(Cwd, {});
    const result = await render(element);

    // Should be an absolute path (starts with / on unix)
    expect(result.text).toMatch(/^(\/|[A-Z]:\\)/);
    // Should contain pupt-lib since we're in that directory
    expect(result.text).toContain('pupt-lib');
  });
});
