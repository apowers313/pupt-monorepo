import { VariableDefinition } from '../types/prompt.js';

export class TemplateContext {
  private values = new Map<string, unknown>();
  private asyncOperations: Array<() => Promise<{ placeholder: string; value: unknown }>> = [];
  private variableDefinitions: VariableDefinition[] = [];

  constructor(variables?: VariableDefinition[]) {
    this.variableDefinitions = variables || [];
  }

  get(name: string): unknown {
    return this.values.get(name);
  }

  set(name: string, value: unknown): void {
    this.values.set(name, value);
  }

  getMasked(name: string): unknown {
    const value = this.get(name);
    if (value && this.isSensitive(name)) {
      return '***';
    }
    return value;
  }

  private isSensitive(name: string): boolean {
    const sensitivePatterns = [/apikey/i, /password/i, /secret/i, /token/i, /credential/i];

    return sensitivePatterns.some(pattern => pattern.test(name));
  }

  getVariableDefinition(name: string): VariableDefinition | undefined {
    return this.variableDefinitions.find(v => v.name === name);
  }

  queueAsyncOperation(operation: () => Promise<{ placeholder: string; value: unknown }>): void {
    this.asyncOperations.push(operation);
  }

  async processAsyncOperations(template: string): Promise<string> {
    let result = template;

    // Process async operations sequentially
    for (const operation of this.asyncOperations) {
      const { placeholder, value } = await operation();
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Clear operations for next run
    this.asyncOperations = [];

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
}
