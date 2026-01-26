import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { DateTime, Timestamp, UUID } from '../../../../src/components/utility';

describe('DateTime', () => {
  it('should render current date/time', () => {
    const element = jsx(DateTime, {});
    const result = render(element);

    // Should be ISO format
    expect(result.text).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should respect format prop', () => {
    const element = jsx(DateTime, { format: 'YYYY-MM-DD' });
    const result = render(element);

    expect(result.text).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(result.text).not.toContain('T');
  });
});

describe('Timestamp', () => {
  it('should render Unix timestamp', () => {
    const element = jsx(Timestamp, {});
    const result = render(element);

    const num = parseInt(result.text);
    expect(num).toBeGreaterThan(1700000000); // After 2023
  });
});

describe('UUID', () => {
  it('should render valid UUID', () => {
    const element = jsx(UUID, {});
    const result = render(element);

    expect(result.text).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
