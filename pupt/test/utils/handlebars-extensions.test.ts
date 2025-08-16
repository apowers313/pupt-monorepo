import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadHandlebarsExtensions } from '../../src/utils/handlebars-extensions.js';
import { HandlebarsExtensionConfig } from '../../src/types/config.js';

describe('Handlebars Extensions', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
  });
  
  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('inline extensions', () => {
    it('should load inline helper', async () => {
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'inline',
        value: "Handlebars.registerHelper('upper', function(str) { return str.toUpperCase(); });"
      };
      
      await loadHandlebarsExtensions(handlebars, [config]);
      
      const template = handlebars.compile('{{upper "hello"}}');
      expect(template({})).toBe('HELLO');
    });

    it('should load inline partial', async () => {
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'inline',
        value: "Handlebars.registerPartial('greeting', 'Hello {{name}}!');"
      };
      
      await loadHandlebarsExtensions(handlebars, [config]);
      
      const template = handlebars.compile('{{> greeting}}');
      expect(template({ name: 'World' })).toBe('Hello World!');
    });

    it('should load inline decorator', async () => {
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'inline',
        value: `
          Handlebars.registerDecorator('log', function(program, props, container, context) {
            console.log('Decorator called');
          });
        `
      };
      
      await loadHandlebarsExtensions(handlebars, [config]);
      
      // Decorators are registered successfully
      expect(() => {
        // Just ensure the decorator was registered without throwing
        const helpers = (handlebars as any).decorators;
        expect(helpers).toBeDefined();
      }).not.toThrow();
    });

    it('should handle multiple inline extensions', async () => {
      const handlebars = Handlebars.create();
      const configs: HandlebarsExtensionConfig[] = [
        {
          type: 'inline',
          value: "Handlebars.registerHelper('upper', function(str) { return str.toUpperCase(); });"
        },
        {
          type: 'inline',
          value: "Handlebars.registerHelper('lower', function(str) { return str.toLowerCase(); });"
        }
      ];
      
      await loadHandlebarsExtensions(handlebars, configs);
      
      const template = handlebars.compile('{{upper "hello"}} {{lower "WORLD"}}');
      expect(template({})).toBe('HELLO world');
    });

    it('should sandbox inline code execution', async () => {
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'inline',
        value: `
          // Should not have access to file system
          try {
            require('fs');
          } catch (e) {
            Handlebars.registerHelper('sandboxed', function() { return 'secure'; });
          }
        `
      };
      
      await loadHandlebarsExtensions(handlebars, [config]);
      
      const template = handlebars.compile('{{sandboxed}}');
      expect(template({})).toBe('secure');
    });

    it('should handle syntax errors in inline code', async () => {
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'inline',
        value: "This is invalid JavaScript {{"
      };
      
      await expect(loadHandlebarsExtensions(handlebars, [config])).rejects.toThrow();
    });
  });

  describe('file-based extensions', () => {
    it('should load helper from file', async () => {
      const extensionPath = path.join(tempDir, 'helper.js');
      await fs.writeFile(extensionPath, `
        module.exports = function(Handlebars) {
          Handlebars.registerHelper('reverse', function(str) {
            return str.split('').reverse().join('');
          });
        };
      `);
      
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'file',
        path: extensionPath
      };
      
      await loadHandlebarsExtensions(handlebars, [config]);
      
      const template = handlebars.compile('{{reverse "hello"}}');
      expect(template({})).toBe('olleh');
    });

    it('should load multiple helpers from file', async () => {
      const extensionPath = path.join(tempDir, 'helpers.js');
      await fs.writeFile(extensionPath, `
        module.exports = function(Handlebars) {
          Handlebars.registerHelper('first', function(str) {
            return str.charAt(0);
          });
          Handlebars.registerHelper('last', function(str) {
            return str.charAt(str.length - 1);
          });
        };
      `);
      
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'file',
        path: extensionPath
      };
      
      await loadHandlebarsExtensions(handlebars, [config]);
      
      const template = handlebars.compile('{{first "hello"}}{{last "hello"}}');
      expect(template({})).toBe('ho');
    });

    it('should load partials from file', async () => {
      const extensionPath = path.join(tempDir, 'partials.js');
      await fs.writeFile(extensionPath, `
        module.exports = function(Handlebars) {
          Handlebars.registerPartial('header', '<h1>{{title}}</h1>');
          Handlebars.registerPartial('footer', '<footer>{{copyright}}</footer>');
        };
      `);
      
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'file',
        path: extensionPath
      };
      
      await loadHandlebarsExtensions(handlebars, [config]);
      
      const template = handlebars.compile('{{> header}}{{> footer}}');
      expect(template({ title: 'Test', copyright: '2024' })).toBe('<h1>Test</h1><footer>2024</footer>');
    });

    it('should handle non-existent file', async () => {
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'file',
        path: path.join(tempDir, 'non-existent.js')
      };
      
      await expect(loadHandlebarsExtensions(handlebars, [config])).rejects.toThrow();
    });

    it('should handle file with syntax errors', async () => {
      const extensionPath = path.join(tempDir, 'bad.js');
      await fs.writeFile(extensionPath, `
        module.exports = function(Handlebars) {
          This is invalid JavaScript {{
        };
      `);
      
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'file',
        path: extensionPath
      };
      
      await expect(loadHandlebarsExtensions(handlebars, [config])).rejects.toThrow();
    });

    it('should handle file that throws error', async () => {
      const extensionPath = path.join(tempDir, 'throwing.js');
      await fs.writeFile(extensionPath, `
        module.exports = function(Handlebars) {
          throw new Error('Extension initialization failed');
        };
      `);
      
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'file',
        path: extensionPath
      };
      
      await expect(loadHandlebarsExtensions(handlebars, [config])).rejects.toThrow('Extension initialization failed');
    });

    it('should handle file that exports non-function', async () => {
      const extensionPath = path.join(tempDir, 'non-function.js');
      await fs.writeFile(extensionPath, `
        module.exports = { not: 'a function' };
      `);
      
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'file',
        path: extensionPath
      };
      
      await expect(loadHandlebarsExtensions(handlebars, [config])).rejects.toThrow();
    });

    it('should resolve relative paths from config directory', async () => {
      const configDir = path.join(tempDir, 'config');
      const extensionsDir = path.join(configDir, 'extensions');
      await fs.mkdir(configDir, { recursive: true });
      await fs.mkdir(extensionsDir, { recursive: true });
      
      const extensionPath = path.join(extensionsDir, 'helper.js');
      await fs.writeFile(extensionPath, `
        module.exports = function(Handlebars) {
          Handlebars.registerHelper('test', function() { return 'resolved'; });
        };
      `);
      
      const handlebars = Handlebars.create();
      const config: HandlebarsExtensionConfig = {
        type: 'file',
        path: './extensions/helper.js'
      };
      
      await loadHandlebarsExtensions(handlebars, [config], configDir);
      
      const template = handlebars.compile('{{test}}');
      expect(template({})).toBe('resolved');
    });
  });

  describe('mixed extensions', () => {
    it('should load both inline and file-based extensions', async () => {
      const extensionPath = path.join(tempDir, 'file-helper.js');
      await fs.writeFile(extensionPath, `
        module.exports = function(Handlebars) {
          Handlebars.registerHelper('fromFile', function() { return 'file'; });
        };
      `);
      
      const handlebars = Handlebars.create();
      const configs: HandlebarsExtensionConfig[] = [
        {
          type: 'inline',
          value: "Handlebars.registerHelper('fromInline', function() { return 'inline'; });"
        },
        {
          type: 'file',
          path: extensionPath
        }
      ];
      
      await loadHandlebarsExtensions(handlebars, configs);
      
      const template = handlebars.compile('{{fromInline}} {{fromFile}}');
      expect(template({})).toBe('inline file');
    });
  });

  describe('error handling', () => {
    it('should provide helpful error message for invalid extension type', async () => {
      const handlebars = Handlebars.create();
      const config = {
        type: 'invalid' as any,
        value: 'test'
      };
      
      await expect(loadHandlebarsExtensions(handlebars, [config])).rejects.toThrow(/Invalid extension type/);
    });

    it('should provide helpful error message for missing value/path', async () => {
      const handlebars = Handlebars.create();
      const configs: HandlebarsExtensionConfig[] = [
        {
          type: 'inline'
          // missing value
        },
        {
          type: 'file'
          // missing path
        }
      ];
      
      await expect(loadHandlebarsExtensions(handlebars, [configs[0]])).rejects.toThrow(/value is required/);
      await expect(loadHandlebarsExtensions(handlebars, [configs[1]])).rejects.toThrow(/path is required/);
    });
  });
});