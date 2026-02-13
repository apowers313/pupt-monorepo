import { input, select, confirm, editor, checkbox, password } from '@inquirer/prompts';
import { fileSearchPrompt } from '../prompts/input-types/file-search-prompt.js';
import type { InputIterator, InputRequirement } from 'pupt-lib';

/**
 * Collect inputs from a pupt-lib InputIterator by prompting the user
 * with Inquirer prompts mapped from each InputRequirement type.
 *
 * Returns the collected values as a Map<string, unknown>.
 */
export async function collectInputs(
  iterator: InputIterator,
  noInteractive?: boolean,
): Promise<Map<string, unknown>> {
  await iterator.start();

  while (!iterator.isDone()) {
    const req = iterator.current();
    if (!req) break;

    let value: unknown;
    if (noInteractive) {
      if (req.default !== undefined) {
        value = req.default;
      } else if (!req.required) {
        value = '';
      } else {
        throw new Error(
          `No default value for '${req.name}' - cannot run in non-interactive mode`,
        );
      }
    } else {
      value = await promptForInput(req);
    }

    const result = await iterator.submit(value);
    if (result.valid) {
      await iterator.advance();
    } else if (noInteractive) {
      // In non-interactive mode, retrying with the same default will always
      // produce the same validation failure, so throw instead of looping forever.
      const errorMessages = result.errors.map(e => e.message).join('; ');
      throw new Error(
        `Validation failed for '${req.name}' in non-interactive mode: ${errorMessages}`,
      );
    }
    // If invalid in interactive mode, the loop re-prompts the current requirement
  }

  return iterator.getValues();
}

/**
 * Map a pupt-lib InputRequirement to the appropriate Inquirer prompt
 * and collect the user's response.
 */
async function promptForInput(req: InputRequirement): Promise<unknown> {
  const message = req.label || formatLabel(req.name);

  switch (req.type) {
    case 'string':
      // Ask.Editor always includes the language key; Ask.Text does not
      if ('language' in req) {
        return editor({
          message,
          default: req.default as string | undefined,
        });
      }
      return input({
        message,
        default: req.default as string | undefined,
      });

    case 'number': {
      const raw = await input({
        message,
        default: req.default !== undefined ? String(req.default) : undefined,
        validate: (val: string) => {
          if (val === '' && !req.required) return true;
          return !isNaN(Number(val)) || 'Please enter a valid number';
        },
      });
      return Number(raw);
    }

    case 'boolean':
      return confirm({
        message,
        default: req.default as boolean | undefined,
      });

    case 'select':
      return select({
        message,
        choices: (req.options ?? []).map(o => ({
          value: o.value,
          name: o.label,
        })),
        default: req.default as string | undefined,
      });

    case 'multiselect':
      return checkbox({
        message,
        choices: (req.options ?? []).map(o => ({
          value: o.value,
          name: o.label,
        })),
      });

    case 'secret':
      return password({ message });

    case 'file':
      return fileSearchPrompt({
        message,
        basePath: undefined,
        filter: req.extensions?.length
          ? `*.{${req.extensions.join(',')}}`
          : undefined,
        default: req.default as string | undefined,
      });

    case 'path':
      return fileSearchPrompt({
        message,
        basePath: undefined,
        default: req.default as string | undefined,
      });

    case 'date':
      return input({
        message,
        default: req.default as string | undefined,
      });

    case 'rating': {
      const min = req.min ?? 1;
      const max = req.max ?? 5;
      const choices = [];
      for (let i = min; i <= max; i++) {
        choices.push({
          value: String(i),
          name: req.labels?.[i] ?? String(i),
        });
      }
      const val = await select({ message, choices });
      return Number(val);
    }

    case 'object':
    case 'array':
      // Fall back to editor for complex types
      return editor({
        message: `${message} (JSON)`,
        default: req.default !== undefined
          ? JSON.stringify(req.default, null, 2)
          : undefined,
      });

    default:
      // Unknown types fall back to text input
      return input({
        message,
        default: req.default as string | undefined,
      });
  }
}

/**
 * Convert a camelCase or snake_case name to a human-readable label.
 */
function formatLabel(name: string): string {
  const humanized = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase();
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}
