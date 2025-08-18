import Handlebars from 'handlebars';
import { input, select, confirm, editor, checkbox, password } from '@inquirer/prompts';
import { TemplateContext } from '../template-context.js';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileSearchPrompt } from '../../prompts/input-types/file-search-prompt.js';
import { reviewFilePrompt } from '../../prompts/input-types/review-file-prompt.js';
import { DateFormats } from '../../utils/date-formatter.js';

export function registerHelpers(handlebars: typeof Handlebars, context: TemplateContext) {
  // Static helpers
  handlebars.registerHelper('date', () => {
    return DateFormats.LOCAL_DATE(new Date());
  });

  handlebars.registerHelper('time', () => {
    return DateFormats.LOCAL_TIME(new Date());
  });

  handlebars.registerHelper('datetime', () => {
    return DateFormats.LOCAL_DATETIME(new Date());
  });

  handlebars.registerHelper('timestamp', () => {
    return Date.now();
  });

  handlebars.registerHelper('uuid', () => {
    return crypto.randomUUID();
  });

  handlebars.registerHelper('cwd', () => {
    return process.cwd();
  });

  handlebars.registerHelper('hostname', () => {
    return os.hostname();
  });

  handlebars.registerHelper('username', () => {
    return os.userInfo().username;
  });

  // Input helpers
  const createInputHelper = (type: string, promptFn: unknown) => {
    handlebars.registerHelper(type, function (this: unknown, ...args: unknown[]) {
      const options = args[args.length - 1] as { hash?: { name?: string; message?: string; choices?: unknown } };

      // Parse arguments
      let name: string;
      let message: string | undefined;


      if (typeof args[0] === 'string') {
        name = args[0];
        message = typeof args[1] === 'string' ? args[1] : undefined;
      } else if (options.hash && options.hash.name) {
        name = options.hash.name;
        message = options.hash.message;
      } else {
        throw new Error(`${type} helper requires a name`);
      }

      // Get cached value
      const cached = context.get(name);
      if (cached !== undefined) {
        return cached;
      }

      // Find variable definition
      const varDef = context.getVariableDefinition(name);

      // Build prompt config
      const promptConfig: Record<string, unknown> = {
        message: message || varDef?.message || generateDefaultMessage(name, type),
      };

      if (varDef) {
        if (varDef.default !== undefined) promptConfig.default = varDef.default;
        if (varDef.choices) promptConfig.choices = varDef.choices;
        if (varDef.validate) {
          // Convert string regex to function
          if (typeof varDef.validate === 'string') {
            const regex = new RegExp(varDef.validate);
            promptConfig.validate = (input: string) => {
              return regex.test(input) || 'Invalid format';
            };
          }
        }
        // Add file-specific properties
        if (type === 'file' || type === 'reviewFile') {
          if (varDef.basePath) promptConfig.basePath = varDef.basePath;
          if (varDef.filter) promptConfig.filter = varDef.filter;
          if (varDef.autoReview !== undefined) promptConfig.autoReview = varDef.autoReview;
        }
      }

      // Handle choices from helper arguments
      if (options.hash && options.hash.choices) {
        promptConfig.choices = options.hash.choices;
      }

      // Create async placeholder
      const placeholder = `__ASYNC_${type}_${name}__`;

      // Queue the async operation
      context.queueAsyncOperation(async () => {
        const value = await (promptFn as (config: unknown) => Promise<unknown>)(promptConfig);
        context.set(name, value);
        context.setType(name, type);
        return { placeholder, value: String(value) };
      });

      return placeholder;
    });
  };

  // Register all input helpers
  createInputHelper('input', input);
  createInputHelper('select', select);
  createInputHelper('multiselect', checkbox);
  createInputHelper('confirm', confirm);
  createInputHelper('editor', editor);
  createInputHelper('password', password);
  createInputHelper('file', fileSearchPrompt);
  createInputHelper('reviewFile', reviewFilePrompt);
}

function generateDefaultMessage(name: string, type: string): string {
  // Convert camelCase/snake_case to human readable
  const humanized = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();

  const capitalized = humanized.charAt(0).toUpperCase() + humanized.slice(1);

  const suffix =
    {
      input: ':',
      select: ':',
      multiselect: ' (select multiple):',
      confirm: '?',
      editor: ' (press enter to open editor):',
      password: ':',
      file: ':',
      reviewFile: ':',
    }[type] || ':';

  return `${capitalized}${suffix}`;
}
