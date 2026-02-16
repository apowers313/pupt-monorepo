import { Component,render } from '@pupt/lib';
import { jsx } from '@pupt/lib/jsx-runtime';
import { describe, expect,it } from 'vitest';
import { z } from 'zod';

describe('Rendering deferred references', () => {
  it('should resolve deferred ref to nested property', async () => {
    class DataSource extends Component<Record<string, never>, { user: { name: string } }> {
      static schema = z.object({});

      resolve() {
        return { user: { name: 'Alice' } };
      }
    }

    interface DisplayProps {
      value: string;
    }

    class Display extends Component<DisplayProps> {
      static schema = z.object({ value: z.unknown() });

      render({ value }: DisplayProps) {
        return `Name: ${value}`;
      }
    }

    const source = jsx(DataSource, {});
    const sourceWithProps = source as unknown as Record<string, unknown>;
    const userRef = sourceWithProps.user as Record<string, unknown>;
    const nameRef = userRef.name;

    const result = await render(jsx(Display, { value: nameRef }));
    expect(result.text).toBe('Name: Alice');
  });

  it('should resolve array index access', async () => {
    class ListSource extends Component<Record<string, never>, string[]> {
      static schema = z.object({});

      resolve() {
        return ['first', 'second', 'third'];
      }
    }

    interface DisplayProps {
      item: string;
    }

    class Display extends Component<DisplayProps> {
      static schema = z.object({ item: z.unknown() });

      render({ item }: DisplayProps) {
        return `Item: ${item}`;
      }
    }

    const list = jsx(ListSource, {});
    const listWithIndex = list as unknown as unknown[];
    const itemRef = listWithIndex[1];

    const result = await render(jsx(Display, { item: itemRef }));
    expect(result.text).toBe('Item: second');
  });

  it('should resolve direct element reference to resolved value', async () => {
    class Counter extends Component<Record<string, never>, number> {
      static schema = z.object({});

      resolve() {
        return 42;
      }
    }

    interface ShowProps {
      count: number;
    }

    class Show extends Component<ShowProps> {
      static schema = z.object({ count: z.unknown() });

      render({ count }: ShowProps) {
        return `Count: ${count}`;
      }
    }

    const counter = jsx(Counter, {});
    const result = await render(jsx(Show, { count: counter }));
    expect(result.text).toBe('Count: 42');
  });

  it('should handle multiple deferred refs from same element', async () => {
    interface UserData {
      name: string;
      age: number;
    }

    class UserSource extends Component<Record<string, never>, UserData> {
      static schema = z.object({});

      resolve() {
        return { name: 'Bob', age: 25 };
      }
    }

    interface ProfileProps {
      userName: string;
      userAge: number;
    }

    class Profile extends Component<ProfileProps> {
      static schema = z.object({
        userName: z.unknown(),
        userAge: z.unknown(),
      });

      render({ userName, userAge }: ProfileProps) {
        return `${userName} is ${userAge} years old`;
      }
    }

    const user = jsx(UserSource, {});
    const userWithProps = user as unknown as Record<string, unknown>;
    const nameRef = userWithProps.name;
    const ageRef = userWithProps.age;

    const result = await render(jsx(Profile, { userName: nameRef, userAge: ageRef }));
    expect(result.text).toBe('Bob is 25 years old');
  });

  it('should handle deeply nested object access', async () => {
    interface DeepData {
      level1: {
        level2: {
          level3: {
            value: string;
          };
        };
      };
    }

    class DeepSource extends Component<Record<string, never>, DeepData> {
      static schema = z.object({});

      resolve() {
        return {
          level1: {
            level2: {
              level3: {
                value: 'deep-value',
              },
            },
          },
        };
      }
    }

    interface ShowValueProps {
      data: string;
    }

    class ShowValue extends Component<ShowValueProps> {
      static schema = z.object({ data: z.unknown() });

      render({ data }: ShowValueProps) {
        return data;
      }
    }

    const source = jsx(DeepSource, {});
    const s = source as unknown as Record<string, unknown>;
    const l1 = s.level1 as Record<string, unknown>;
    const l2 = l1.level2 as Record<string, unknown>;
    const l3 = l2.level3 as Record<string, unknown>;
    const valueRef = l3.value;

    const result = await render(jsx(ShowValue, { data: valueRef }));
    expect(result.text).toBe('deep-value');
  });

  it('should resolve undefined for missing properties gracefully', async () => {
    interface SparseData {
      exists: string;
    }

    class SparseSource extends Component<Record<string, never>, SparseData> {
      static schema = z.object({});

      resolve() {
        return { exists: 'yes' };
      }
    }

    interface ShowProps {
      value: unknown;
    }

    class ShowOptional extends Component<ShowProps> {
      static schema = z.object({ value: z.unknown() });

      render({ value }: ShowProps) {
        return `Value: ${value === undefined ? 'undefined' : value}`;
      }
    }

    const source = jsx(SparseSource, {});
    const s = source as unknown as Record<string, unknown>;
    const missingRef = s.missing;

    const result = await render(jsx(ShowOptional, { value: missingRef }));
    expect(result.text).toBe('Value: undefined');
  });

  it('should work with async resolve methods', async () => {
    class AsyncData extends Component<Record<string, never>, { result: string }> {
      static schema = z.object({});

      async resolve() {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return { result: 'async-result' };
      }
    }

    interface ShowProps {
      data: string;
    }

    class Show extends Component<ShowProps> {
      static schema = z.object({ data: z.unknown() });

      render({ data }: ShowProps) {
        return data;
      }
    }

    const source = jsx(AsyncData, {});
    const s = source as unknown as Record<string, unknown>;
    const resultRef = s.result;

    const result = await render(jsx(Show, { data: resultRef }));
    expect(result.text).toBe('async-result');
  });
});
