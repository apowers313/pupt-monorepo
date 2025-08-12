import Handlebars from 'handlebars';
import { TemplateContext } from './template-context.js';
import { registerHelpers } from './helpers/index.js';
import { Prompt } from '../types/prompt.js';

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private context: TemplateContext;

  constructor() {
    this.handlebars = Handlebars.create();
    this.context = new TemplateContext();
  }

  async processTemplate(template: string, prompt: Partial<Prompt>): Promise<string> {
    // Create new context with variable definitions
    this.context = new TemplateContext(prompt.variables);

    // Create a special Handlebars instance that has access to the context
    this.handlebars = Handlebars.create();

    // Register helpers with context
    registerHelpers(this.handlebars, this.context);

    // Phase 1: Replace variable references with temporary placeholders
    // to prevent them from being processed before values are available
    const varPattern = /\{\{([^{}\s]+)\}\}/g;
    const inputHelperPattern =
      /\{\{(input|select|multiselect|confirm|editor|password)\s+[^}]+\}\}/g;

    // Store variable references to restore later
    const variableRefs: Array<{ placeholder: string; variable: string }> = [];
    let tempTemplate = template;
    let varIndex = 0;

    // Replace non-helper variable references with placeholders
    tempTemplate = tempTemplate.replace(varPattern, (match, varName) => {
      // Check if this is a helper call
      if (match.match(inputHelperPattern)) {
        return match; // Keep helper calls as-is
      }
      const placeholder = `__VAR_${varIndex++}__`;
      variableRefs.push({ placeholder, variable: varName });
      return placeholder;
    });

    // Phase 2: Process helpers with the temporary template
    const compiled = this.handlebars.compile(tempTemplate, { noEscape: true });
    let result = compiled({});

    // Process async operations (input helpers)
    result = await this.context.processAsyncOperations(result);

    // Phase 3: Restore variable references
    for (const ref of variableRefs) {
      result = result.replace(ref.placeholder, `{{${ref.variable}}}`);
    }

    // Phase 4: Final compilation with all values available
    const finalCompiled = this.handlebars.compile(result, { noEscape: true });
    const contextData: Record<string, unknown> = {};

    // Add all collected values to context data
    for (const [key, value] of this.context.getAllValues()) {
      contextData[key] = value;
    }

    return finalCompiled(contextData);
  }

  getContext(): TemplateContext {
    return this.context;
  }
}
