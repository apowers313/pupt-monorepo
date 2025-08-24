import Handlebars from 'handlebars';
import { TemplateContext } from './template-context.js';
import { registerHelpers } from './helpers/index.js';
import { Prompt } from '../types/prompt.js';
import { loadHandlebarsExtensions } from '../utils/handlebars-extensions.js';
import { Config } from '../types/config.js';

export class TemplateEngine {
  private handlebars: typeof Handlebars;
  private context: TemplateContext;
  private config?: Config;
  private configDir?: string;
  private noInteractive: boolean;

  constructor(config?: Config, configDir?: string, noInteractive = false) {
    this.handlebars = Handlebars.create();
    this.context = new TemplateContext();
    this.config = config;
    this.configDir = configDir;
    this.noInteractive = noInteractive;
  }

  async processTemplate(template: string, prompt: Partial<Prompt>): Promise<string> {
    // Create new context with variable definitions
    this.context = new TemplateContext(prompt.variables, this.noInteractive);

    // Create a special Handlebars instance that has access to the context
    this.handlebars = Handlebars.create();

    // Load Handlebars extensions from config
    if (this.config?.handlebarsExtensions) {
      await loadHandlebarsExtensions(this.handlebars, this.config.handlebarsExtensions, this.configDir);
    }

    // Register helpers with context
    registerHelpers(this.handlebars, this.context);
    
    // Pre-process template to extract and protect raw blocks
    const rawBlocks: Array<{ placeholder: string; content: string }> = [];
    let rawIndex = 0;
    
    // Extract content from {{#raw}}...{{/raw}} blocks before Handlebars processes them
    template = template.replace(/{{#raw}}([\s\S]*?){{\/raw}}/g, (match, content) => {
      const placeholder = `__RAW_BLOCK_${rawIndex++}__`;
      rawBlocks.push({ placeholder, content });
      return placeholder;
    });

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

    let finalResult = finalCompiled(contextData);
    
    // Restore raw blocks
    for (const block of rawBlocks) {
      finalResult = finalResult.replace(block.placeholder, block.content);
    }
    
    // Restore escaped Handlebars syntax from user input
    finalResult = finalResult.replace(/__ESCAPED_OPEN__/g, '{{').replace(/__ESCAPED_CLOSE__/g, '}}');
    
    return finalResult;
  }

  getContext(): TemplateContext {
    return this.context;
  }
}
