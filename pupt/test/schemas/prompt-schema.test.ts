import { describe, it, expect } from 'vitest';
import {
  InputTypeSchema,
  InputValidationSchema,
  PromptInputSchema,
  ModelConfigSchema,
  PromptMetadataSchema,
  PromptSchema,
  HistoryEntrySchema,
  AnnotationSchema
} from '../../src/schemas/prompt-schema';

describe('Prompt Schema', () => {
  describe('InputTypeSchema', () => {
    it('should accept valid input types', () => {
      const validTypes = [
        'text', 'select', 'multiselect', 'number', 
        'boolean', 'file', 'password', 'confirm', 'editor'
      ];
      
      validTypes.forEach(type => {
        expect(() => InputTypeSchema.parse(type)).not.toThrow();
      });
    });

    it('should reject invalid input types', () => {
      expect(() => InputTypeSchema.parse('invalid')).toThrow();
      expect(() => InputTypeSchema.parse('')).toThrow();
      expect(() => InputTypeSchema.parse(123)).toThrow();
    });
  });

  describe('InputValidationSchema', () => {
    it('should accept valid validation rules', () => {
      const validation = {
        required: true,
        pattern: '^[a-z]+$',
        min: 1,
        max: 100,
        minLength: 5,
        maxLength: 50,
        enum: ['option1', 'option2']
      };
      
      expect(() => InputValidationSchema.parse(validation)).not.toThrow();
    });

    it('should accept partial validation rules', () => {
      expect(() => InputValidationSchema.parse({ required: true })).not.toThrow();
      expect(() => InputValidationSchema.parse({ pattern: 'test' })).not.toThrow();
      expect(() => InputValidationSchema.parse({})).not.toThrow();
    });

    it('should reject invalid validation rules', () => {
      expect(() => InputValidationSchema.parse({ min: 'not a number' })).toThrow();
      expect(() => InputValidationSchema.parse({ required: 'yes' })).toThrow();
    });
  });

  describe('PromptInputSchema', () => {
    it('should accept valid input definition', () => {
      const input = {
        name: 'username',
        type: 'text',
        description: 'Enter your username',
        required: true,
        default: 'user',
        placeholder: 'Username'
      };
      
      const result = PromptInputSchema.parse(input);
      expect(result.name).toBe('username');
      expect(result.type).toBe('text');
    });

    it('should require options for select/multiselect', () => {
      const selectWithoutOptions = {
        name: 'choice',
        type: 'select'
      };
      
      expect(() => PromptInputSchema.parse(selectWithoutOptions)).toThrow(
        'Select and multiselect inputs must have options'
      );
      
      const selectWithOptions = {
        name: 'choice',
        type: 'select',
        options: ['option1', 'option2']
      };
      
      expect(() => PromptInputSchema.parse(selectWithOptions)).not.toThrow();
    });

    it('should accept string or object validation', () => {
      const stringValidation = {
        name: 'test',
        type: 'text',
        validation: 'required|min:5'
      };
      
      const objectValidation = {
        name: 'test',
        type: 'text',
        validation: { required: true, minLength: 5 }
      };
      
      expect(() => PromptInputSchema.parse(stringValidation)).not.toThrow();
      expect(() => PromptInputSchema.parse(objectValidation)).not.toThrow();
    });

    it('should accept file input with allowMultiple', () => {
      const fileInput = {
        name: 'files',
        type: 'file',
        allowMultiple: true
      };
      
      expect(() => PromptInputSchema.parse(fileInput)).not.toThrow();
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
        type: 'text'
      };
      
      expect(() => PromptInputSchema.parse(input)).toThrow('Input name is required');
    });
  });

  describe('ModelConfigSchema', () => {
    it('should accept valid model configuration', () => {
      const config = {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: -0.5,
        stopSequences: ['\\n\\n', 'END']
      };
      
      expect(() => ModelConfigSchema.parse(config)).not.toThrow();
    });

    it('should validate temperature range', () => {
      expect(() => ModelConfigSchema.parse({ temperature: -1 })).toThrow();
      expect(() => ModelConfigSchema.parse({ temperature: 3 })).toThrow();
      expect(() => ModelConfigSchema.parse({ temperature: 1.5 })).not.toThrow();
    });

    it('should validate penalty ranges', () => {
      expect(() => ModelConfigSchema.parse({ frequencyPenalty: -3 })).toThrow();
      expect(() => ModelConfigSchema.parse({ frequencyPenalty: 3 })).toThrow();
      expect(() => ModelConfigSchema.parse({ presencePenalty: -1 })).not.toThrow();
    });

    it('should accept empty configuration', () => {
      expect(() => ModelConfigSchema.parse({})).not.toThrow();
    });
  });

  describe('PromptMetadataSchema', () => {
    it('should accept valid metadata', () => {
      const metadata = {
        name: 'Test Prompt',
        description: 'A test prompt',
        tags: ['test', 'example'],
        category: 'testing',
        version: '1.0.0',
        author: 'Test User',
        inputs: [{
          name: 'input1',
          type: 'text'
        }],
        modelConfig: {
          model: 'gpt-4',
          temperature: 0.7
        },
        outputFormat: 'json',
        examples: [{
          inputs: { input1: 'test' },
          output: 'test output'
        }],
        dependencies: ['other-prompt']
      };
      
      expect(() => PromptMetadataSchema.parse(metadata)).not.toThrow();
    });

    it('should accept deprecated fields', () => {
      const metadata = {
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 500
      };
      
      expect(() => PromptMetadataSchema.parse(metadata)).not.toThrow();
    });

    it('should validate output format', () => {
      expect(() => PromptMetadataSchema.parse({ outputFormat: 'invalid' })).toThrow();
      expect(() => PromptMetadataSchema.parse({ outputFormat: 'text' })).not.toThrow();
      expect(() => PromptMetadataSchema.parse({ outputFormat: 'json' })).not.toThrow();
    });

    it('should accept empty metadata', () => {
      expect(() => PromptMetadataSchema.parse({})).not.toThrow();
    });
  });

  describe('PromptSchema', () => {
    it('should accept valid prompt', () => {
      const prompt = {
        metadata: {
          name: 'Test Prompt',
          tags: ['test']
        },
        content: 'This is a test prompt with {{variable}}',
        path: '/prompts/test.md',
        name: 'test'
      };
      
      expect(() => PromptSchema.parse(prompt)).not.toThrow();
    });

    it('should require all fields', () => {
      expect(() => PromptSchema.parse({})).toThrow();
      expect(() => PromptSchema.parse({ metadata: {}, content: 'test' })).toThrow();
    });
  });

  describe('HistoryEntrySchema', () => {
    it('should accept valid history entry', () => {
      const entry = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        timestamp: '2024-01-15T10:30:00.000Z',
        promptName: 'Test Prompt',
        promptPath: '/prompts/test.md',
        inputs: { name: 'John' },
        maskedInputs: { password: '***' },
        output: 'Hello John',
        modelConfig: { temperature: 0.7 },
        duration: 1234,
        annotation: 'Test successful'
      };
      
      expect(() => HistoryEntrySchema.parse(entry)).not.toThrow();
    });

    it('should require mandatory fields', () => {
      const minimal = {
        id: '123',
        timestamp: '2024-01-15T10:30:00.000Z',
        promptName: 'Test',
        promptPath: '/test.md',
        inputs: {},
        output: 'Result'
      };
      
      expect(() => HistoryEntrySchema.parse(minimal)).not.toThrow();
    });

    it('should validate timestamp format', () => {
      const entry = {
        id: '123',
        timestamp: 'invalid-date',
        promptName: 'Test',
        promptPath: '/test.md',
        inputs: {},
        output: 'Result'
      };
      
      expect(() => HistoryEntrySchema.parse(entry)).toThrow();
    });
  });

  describe('AnnotationSchema', () => {
    it('should accept valid annotation', () => {
      const annotation = {
        historyId: '123e4567-e89b-12d3-a456-426614174000',
        annotation: 'This worked well',
        timestamp: '2024-01-15T10:30:00.000Z',
        tags: ['success', 'production']
      };
      
      expect(() => AnnotationSchema.parse(annotation)).not.toThrow();
    });

    it('should require mandatory fields', () => {
      const minimal = {
        historyId: '123',
        annotation: 'Note',
        timestamp: '2024-01-15T10:30:00.000Z'
      };
      
      expect(() => AnnotationSchema.parse(minimal)).not.toThrow();
    });

    it('should validate timestamp', () => {
      const annotation = {
        historyId: '123',
        annotation: 'Note',
        timestamp: 'not-a-date'
      };
      
      expect(() => AnnotationSchema.parse(annotation)).toThrow();
    });
  });
});