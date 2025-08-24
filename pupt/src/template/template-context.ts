import { VariableDefinition } from '../types/prompt.js';
import { maskSensitiveValue } from '../utils/security.js';

export class TemplateContext {
  private values = new Map<string, unknown>();
  private asyncOperations: Array<() => Promise<{ placeholder: string; value: unknown }>> = [];
  private variableDefinitions: VariableDefinition[] = [];
  private variableTypes = new Map<string, string>();
  private queuedOperations = new Map<string, string>();
  private noInteractive: boolean;

  constructor(variables?: VariableDefinition[], noInteractive = false) {
    this.variableDefinitions = variables || [];
    this.noInteractive = noInteractive;
  }

  get(name: string): unknown {
    return this.values.get(name);
  }

  set(name: string, value: unknown): void {
    this.values.set(name, value);
  }

  setType(name: string, type: string): void {
    this.variableTypes.set(name, type);
  }

  getType(name: string): string | undefined {
    return this.variableTypes.get(name);
  }

  getVariablesByType(type: string): Array<{ name: string; value: unknown }> {
    const result: Array<{ name: string; value: unknown }> = [];
    for (const [name, varType] of this.variableTypes) {
      if (varType === type) {
        result.push({ name, value: this.values.get(name) });
      }
    }
    return result;
  }

  getMasked(name: string): unknown {
    const value = this.get(name);
    return maskSensitiveValue(name, value);
  }

  getVariableDefinition(name: string): VariableDefinition | undefined {
    return this.variableDefinitions.find(v => v.name === name);
  }

  queueAsyncOperation(operation: () => Promise<{ placeholder: string; value: unknown }>): void {
    this.asyncOperations.push(operation);
  }

  hasQueuedOperation(name: string): boolean {
    return this.queuedOperations.has(name);
  }

  getQueuedPlaceholder(name: string): string | undefined {
    return this.queuedOperations.get(name);
  }

  setQueuedOperation(name: string, placeholder: string): void {
    this.queuedOperations.set(name, placeholder);
  }

  async processAsyncOperations(template: string): Promise<string> {
    let result = template;

    // Process async operations sequentially
    for (const operation of this.asyncOperations) {
      const { placeholder, value } = await operation();
      // Escape any Handlebars syntax in user input by replacing {{ with a placeholder
      const escapedValue = String(value).replace(/{{/g, '__ESCAPED_OPEN__').replace(/}}/g, '__ESCAPED_CLOSE__');
      result = result.replace(new RegExp(placeholder, 'g'), escapedValue);
    }

    // Clear operations for next run
    this.asyncOperations = [];
    this.queuedOperations.clear();

    return result;
  }

  getAllValues(): Map<string, unknown> {
    return new Map(this.values);
  }

  getMaskedValues(): Map<string, unknown> {
    const masked = new Map<string, unknown>();

    for (const [key] of this.values) {
      masked.set(key, this.getMasked(key));
    }

    return masked;
  }

  isNoInteractive(): boolean {
    return this.noInteractive;
  }
}
