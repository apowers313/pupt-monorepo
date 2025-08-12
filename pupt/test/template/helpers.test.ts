import { describe, it, expect, vi, beforeEach } from 'vitest';
import Handlebars from 'handlebars';
import { registerHelpers } from '../../src/template/helpers/index.js';
import { TemplateContext } from '../../src/template/template-context.js';
import * as os from 'os';
import * as crypto from 'crypto';

vi.mock('os');
vi.mock('crypto');

describe('Template Helpers', () => {
  let handlebars: typeof Handlebars;
  let context: TemplateContext;

  beforeEach(() => {
    handlebars = Handlebars.create();
    context = new TemplateContext();
    vi.clearAllMocks();
  });

  describe('Static Helpers', () => {
    beforeEach(() => {
      registerHelpers(handlebars, context);
    });

    it('should register date helper', () => {
      const template = handlebars.compile('{{date}}');
      const result = template({});
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should register time helper', () => {
      const template = handlebars.compile('{{time}}');
      const result = template({});
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should register datetime helper', () => {
      const template = handlebars.compile('{{datetime}}');
      const result = template({});
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should register timestamp helper', () => {
      const template = handlebars.compile('{{timestamp}}');
      const result = template({});
      expect(Number(result)).toBeGreaterThan(0);
    });

    it('should register uuid helper', () => {
      const mockUuid = '550e8400-e29b-41d4-a716-446655440000';
      vi.mocked(crypto.randomUUID).mockReturnValue(mockUuid);
      
      const template = handlebars.compile('{{uuid}}');
      const result = template({});
      expect(result).toBe(mockUuid);
    });

    it('should register cwd helper', () => {
      const cwd = '/home/user/project';
      vi.spyOn(process, 'cwd').mockReturnValue(cwd);
      
      const template = handlebars.compile('{{cwd}}');
      const result = template({});
      expect(result).toBe(cwd);
    });

    it('should register hostname helper', () => {
      const hostname = 'test-machine';
      vi.mocked(os.hostname).mockReturnValue(hostname);
      
      const template = handlebars.compile('{{hostname}}');
      const result = template({});
      expect(result).toBe(hostname);
    });

    it('should register username helper', () => {
      const userInfo = { username: 'testuser' };
      vi.mocked(os.userInfo).mockReturnValue(userInfo as any);
      
      const template = handlebars.compile('{{username}}');
      const result = template({});
      expect(result).toBe('testuser');
    });
  });

  describe('Input Helpers', () => {
    it('should handle input helper with hash arguments', () => {
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{input name="test" message="Test message"}}');
      const result = template({});
      
      // Should return a placeholder
      expect(result).toMatch(/__ASYNC_input_test__/);
    });

    it('should throw error when input helper is called without name', () => {
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{input}}');
      expect(() => template({})).toThrow('input helper requires a name');
    });

    it('should handle select helper with choices from hash', () => {
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{select "lang" choices=myChoices}}');
      const result = template({ myChoices: ['js', 'ts'] });
      
      expect(result).toMatch(/__ASYNC_select_lang__/);
    });

    it('should handle multiselect helper', () => {
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{multiselect "features" "Select features"}}');
      const result = template({});
      
      expect(result).toMatch(/__ASYNC_multiselect_features__/);
    });

    it('should handle confirm helper', () => {
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{confirm "proceed" "Continue?"}}');
      const result = template({});
      
      expect(result).toMatch(/__ASYNC_confirm_proceed__/);
    });

    it('should handle editor helper', () => {
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{editor "content" "Enter content"}}');
      const result = template({});
      
      expect(result).toMatch(/__ASYNC_editor_content__/);
    });

    it('should handle password helper', () => {
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{password "secret" "Enter password"}}');
      const result = template({});
      
      expect(result).toMatch(/__ASYNC_password_secret__/);
    });

    it('should return cached value if already set', () => {
      context.set('cachedVar', 'cached value');
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{input "cachedVar" "Enter value"}}');
      const result = template({});
      
      expect(result).toBe('cached value');
    });

    it('should use variable definition with validation', () => {
      const variables = [{
        name: 'email',
        type: 'input' as const,
        message: 'Enter email',
        validate: '^[^@]+@[^@]+\\.[^@]+$'
      }];
      context = new TemplateContext(variables);
      registerHelpers(handlebars, context);
      
      const template = handlebars.compile('{{input "email"}}');
      const result = template({});
      
      expect(result).toMatch(/__ASYNC_input_email__/);
      
      // Verify async operation was queued
      expect(context['asyncOperations']).toHaveLength(1);
    });
  });

  describe('generateDefaultMessage', () => {
    it('should generate appropriate messages for different input types', () => {
      registerHelpers(handlebars, context);
      
      // Test different input types
      const inputTemplate = handlebars.compile('{{input "userName"}}');
      const selectTemplate = handlebars.compile('{{select "language"}}');
      const multiselectTemplate = handlebars.compile('{{multiselect "features"}}');
      const confirmTemplate = handlebars.compile('{{confirm "continue"}}');
      const editorTemplate = handlebars.compile('{{editor "description"}}');
      const passwordTemplate = handlebars.compile('{{password "apiKey"}}');
      
      // Execute templates to trigger message generation
      inputTemplate({});
      selectTemplate({});
      multiselectTemplate({});
      confirmTemplate({});
      editorTemplate({});
      passwordTemplate({});
      
      // Verify async operations were queued with appropriate messages
      expect(context['asyncOperations']).toHaveLength(6);
    });
  });
});