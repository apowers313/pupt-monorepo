import type { ComponentType } from '../types';

export class Scope {
  private components = new Map<string, ComponentType>();

  constructor(
    readonly name: string,
    readonly parent?: Scope,
  ) {}

  register(name: string, component: ComponentType): void {
    this.components.set(name, component);
  }

  get(name: string): ComponentType | undefined {
    return this.components.get(name) ?? this.parent?.get(name);
  }

  has(name: string): boolean {
    return this.components.has(name) || (this.parent?.has(name) ?? false);
  }

  listOwn(): string[] {
    return [...this.components.keys()];
  }

  listAll(): string[] {
    const parentList = this.parent?.listAll() ?? [];
    return [...new Set([...parentList, ...this.components.keys()])];
  }
}

export function createScope(name: string, parent?: Scope): Scope {
  return new Scope(name, parent);
}
