import type { ComponentType, RegistryComponentType } from '../types';

export interface ComponentRegistry {
  register(name: string, component: RegistryComponentType): void;
  get(name: string): ComponentType | undefined;
  has(name: string): boolean;
  list(): string[];
  createChild(): ComponentRegistry;
}

export function createRegistry(parent?: ComponentRegistry): ComponentRegistry {
  const components = new Map<string, RegistryComponentType>();

  return {
    register(name, component) {
      components.set(name, component);
    },
    get(name) {
      return components.get(name) ?? parent?.get(name);
    },
    has(name) {
      return components.has(name) || (parent?.has(name) ?? false);
    },
    list() {
      const parentList = parent?.list() ?? [];
      return [...new Set([...parentList, ...components.keys()])];
    },
    createChild() {
      return createRegistry(this);
    },
  };
}

export const defaultRegistry = createRegistry();
