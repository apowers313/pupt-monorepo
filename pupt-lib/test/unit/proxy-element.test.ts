import { describe, it, expect } from 'vitest';
import { jsx } from 'pupt-lib/jsx-runtime';
import { TYPE, PROPS, isDeferredRef, isPuptElement, DEFERRED_REF } from 'pupt-lib';

describe('Proxy-wrapped elements', () => {
  it('should allow symbol access on proxied elements', () => {
    const element = jsx('div', { id: 'test' });
    expect(element[TYPE]).toBe('div');
    expect(element[PROPS]).toEqual({ id: 'test' });
  });

  it('should create deferred ref on property access', () => {
    const element = jsx('div', { name: 'github' });
    const ref = (element as unknown as Record<string, unknown>).stars;

    expect(isDeferredRef(ref)).toBe(true);
    if (isDeferredRef(ref)) {
      expect(ref.element).toBe(element);
      expect(ref.path).toEqual(['stars']);
    }
  });

  it('should chain property access in deferred refs', () => {
    const element = jsx('div', {});
    const ref = (element as unknown as Record<string, unknown>).user as Record<string, unknown>;
    const deepRef = ref.address as Record<string, unknown>;
    const deepestRef = deepRef.city;

    expect(isDeferredRef(deepestRef)).toBe(true);
    if (isDeferredRef(deepestRef)) {
      expect(deepestRef.path).toEqual(['user', 'address', 'city']);
    }
  });

  it('should handle array index access', () => {
    const element = jsx('div', {});
    const items = (element as unknown as Record<string, unknown>).items as unknown[];
    const item0 = items[0] as Record<string, unknown>;
    const ref = item0.name;

    expect(isDeferredRef(ref)).toBe(true);
    if (isDeferredRef(ref)) {
      expect(ref.path).toEqual(['items', '0', 'name']);
    }
  });

  it('should handle reserved properties correctly', () => {
    const element = jsx('div', {});
    const el = element as unknown as Record<string, unknown>;

    // These should not create deferred refs (they should return undefined)
    expect(isDeferredRef(el.then)).toBe(false);
    expect(isDeferredRef(el.catch)).toBe(false);
    expect(isDeferredRef(el.constructor)).toBe(false);
  });

  it('should still be recognized as PuptElement after proxy wrapping', () => {
    const element = jsx('div', { id: 'test' });
    expect(isPuptElement(element)).toBe(true);
  });

  it('should preserve element in deferred ref across chain', () => {
    const element = jsx('div', {});
    const ref1 = (element as unknown as Record<string, unknown>).a;
    expect(isDeferredRef(ref1)).toBe(true);

    if (isDeferredRef(ref1)) {
      const ref2 = (ref1 as unknown as Record<string, unknown>).b;
      expect(isDeferredRef(ref2)).toBe(true);

      if (isDeferredRef(ref2)) {
        // Both should reference the same original element
        expect(ref2.element).toBe(element);
      }
    }
  });

  it('should allow accessing DEFERRED_REF symbol on deferred refs', () => {
    const element = jsx('div', {});
    const ref = (element as unknown as Record<string, unknown>).foo;

    expect(isDeferredRef(ref)).toBe(true);
    if (isDeferredRef(ref)) {
      expect(ref[DEFERRED_REF]).toBe(true);
    }
  });
});
