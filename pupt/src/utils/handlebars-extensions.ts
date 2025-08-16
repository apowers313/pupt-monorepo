import * as vm from 'vm';
import * as path from 'path';
import { promises as fs } from 'fs';
import type { HandlebarsExtensionConfig } from '../types/config.js';
import type Handlebars from 'handlebars';

export async function loadHandlebarsExtensions(
  handlebars: typeof Handlebars,
  extensions: HandlebarsExtensionConfig[],
  configDir?: string
): Promise<void> {
  for (const extension of extensions) {
    await loadSingleExtension(handlebars, extension, configDir);
  }
}

async function loadSingleExtension(
  handlebars: typeof Handlebars,
  config: HandlebarsExtensionConfig,
  configDir?: string
): Promise<void> {
  if (config.type === 'inline') {
    await loadInlineExtension(handlebars, config);
  } else if (config.type === 'file') {
    await loadFileExtension(handlebars, config, configDir);
  } else {
    throw new Error(`Invalid extension type: ${(config as { type?: string }).type || 'unknown'}`);
  }
}

async function loadInlineExtension(
  handlebars: typeof Handlebars,
  config: HandlebarsExtensionConfig
): Promise<void> {
  if (!config.value) {
    throw new Error('Inline extension value is required');
  }

  // Create a sandboxed context for executing the inline code
  const sandbox = {
    Handlebars: handlebars,
    console: console, // Allow console for debugging
    require: createSafeRequire()
  };

  try {
    // Create a new context for the sandbox
    const context = vm.createContext(sandbox);
    
    // Run the code with a timeout
    vm.runInContext(config.value, context, {
      timeout: 5000, // 5 second timeout
      displayErrors: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load inline Handlebars extension: ${message}`);
  }
}

// Create a safe require function that blocks dangerous modules
function createSafeRequire(): (id: string) => never {
  return (id: string) => {
    const blockedModules = ['fs', 'child_process', 'net', 'http', 'https', 'os', 'path', 'crypto'];
    if (blockedModules.includes(id)) {
      throw new Error(`Module '${id}' is not allowed in inline extensions`);
    }
    throw new Error(`require() is not available in inline extensions`);
  };
}

async function loadFileExtension(
  handlebars: typeof Handlebars,
  config: HandlebarsExtensionConfig,
  configDir?: string
): Promise<void> {
  if (!config.path) {
    throw new Error('File extension path is required');
  }

  // Resolve path relative to config directory if provided
  const extensionPath = configDir 
    ? path.resolve(configDir, config.path)
    : path.resolve(config.path);

  try {
    // Check if file exists
    await fs.access(extensionPath);
  } catch {
    throw new Error(`Extension file not found: ${extensionPath}`);
  }

  try {
    // Use dynamic import for ESM compatibility
    const extensionModule = await import(extensionPath);
    const extension = extensionModule.default || extensionModule;

    if (typeof extension !== 'function') {
      throw new Error(`Extension file must export a function, got ${typeof extension}`);
    }

    // Call the extension function with Handlebars instance
    await extension(handlebars);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Extension file must export')) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load file Handlebars extension: ${message}`);
  }
}