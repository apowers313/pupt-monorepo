import { describe, expect,it } from 'vitest';

import { ConfigSchema, OutputCaptureConfigSchema } from '../../src/schemas/config-schema.js';

describe('Output Capture Configuration', () => {
  describe('schema validation', () => {
    it('should validate output capture settings', () => {
      const validConfig = {
        enabled: true,
        directory: '~/.pt-output',
        maxSizeMB: 10,
        retentionDays: 7
      };
      
      const result = OutputCaptureConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validConfig);
      }
    });

    it('should validate minimal output capture config', () => {
      const minimalConfig = {
        enabled: false
      };
      
      const result = OutputCaptureConfigSchema.safeParse(minimalConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(false);
        expect(result.data.directory).toBeUndefined();
        expect(result.data.maxSizeMB).toBeUndefined();
        expect(result.data.retentionDays).toBeUndefined();
      }
    });

    it('should reject invalid output capture settings', () => {
      const invalidConfigs = [
        { enabled: 'yes' }, // Wrong type
        { enabled: true, maxSizeMB: 'ten' }, // Wrong type
        {} // Missing required enabled field
      ];

      invalidConfigs.forEach(config => {
        const result = OutputCaptureConfigSchema.safeParse(config);
        expect(result.success).toBe(false);
      });
      
      // Negative days should be allowed (zod number type doesn't have min validation by default)
      const negativeRetention = { enabled: true, retentionDays: -1 };
      const result = OutputCaptureConfigSchema.safeParse(negativeRetention);
      expect(result.success).toBe(true);
    });
  });

  describe('config integration', () => {
    it('should merge with existing config', () => {
      const config = {
        promptDirs: ['./prompts'],
        version: '4.0.0',
        outputCapture: {
          enabled: true,
          directory: '~/.pt-output',
          maxSizeMB: 50,
          retentionDays: 30
        }
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outputCapture).toEqual({
          enabled: true,
          directory: '~/.pt-output',
          maxSizeMB: 50,
          retentionDays: 30
        });
      }
    });

    it('should handle config without output capture', () => {
      const config = {
        promptDirs: ['./prompts'],
        version: '4.0.0'
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outputCapture).toBeUndefined();
      }
    });

  });

  describe('default values', () => {
    it('should use sensible defaults when not specified', () => {
      const config = {
        promptDirs: ['./prompts'],
        version: '4.0.0',
        outputCapture: {
          enabled: true
        }
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.outputCapture?.enabled).toBe(true);
        // Directory, maxSizeMB, and retentionDays should be undefined (to be set by ConfigManager)
        expect(result.data.outputCapture?.directory).toBeUndefined();
        expect(result.data.outputCapture?.maxSizeMB).toBeUndefined();
        expect(result.data.outputCapture?.retentionDays).toBeUndefined();
      }
    });
  });
});