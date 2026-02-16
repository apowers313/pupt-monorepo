import { describe, expect,it } from 'vitest';

import {
  isSensitiveKey,
  maskSensitiveValue,
  sanitizeObject,
  SENSITIVE_PATTERNS
} from '../../src/utils/security.js';

describe('Security Utilities', () => {
  describe('SENSITIVE_PATTERNS', () => {
    it('should contain common sensitive patterns', () => {
      expect(SENSITIVE_PATTERNS).toEqual(expect.arrayContaining([
        expect.objectContaining({ source: expect.stringContaining('api') }),
        expect.objectContaining({ source: expect.stringContaining('password') }),
        expect.objectContaining({ source: expect.stringContaining('secret') }),
        expect.objectContaining({ source: expect.stringContaining('token') }),
        expect.objectContaining({ source: expect.stringContaining('credential') }),
        expect.objectContaining({ source: expect.stringContaining('auth') })
      ]));
    });
  });

  describe('isSensitiveKey', () => {
    it('should identify sensitive keys', () => {
      // Common sensitive keys
      expect(isSensitiveKey('apiKey')).toBe(true);
      expect(isSensitiveKey('api_key')).toBe(true);
      expect(isSensitiveKey('API_KEY')).toBe(true);
      expect(isSensitiveKey('password')).toBe(true);
      expect(isSensitiveKey('PASSWORD')).toBe(true);
      expect(isSensitiveKey('secret')).toBe(true);
      expect(isSensitiveKey('token')).toBe(true);
      expect(isSensitiveKey('authToken')).toBe(true);
      expect(isSensitiveKey('auth_token')).toBe(true);
      expect(isSensitiveKey('private_key')).toBe(true);
      expect(isSensitiveKey('privateKey')).toBe(true);
      expect(isSensitiveKey('credential')).toBe(true);
      expect(isSensitiveKey('bearer')).toBe(true);
    });

    it('should not identify non-sensitive keys', () => {
      expect(isSensitiveKey('name')).toBe(false);
      expect(isSensitiveKey('email')).toBe(false);
      expect(isSensitiveKey('username')).toBe(false);
      expect(isSensitiveKey('id')).toBe(false);
      expect(isSensitiveKey('type')).toBe(false);
      expect(isSensitiveKey('value')).toBe(false);
    });

    it('should handle keys with sensitive words in different positions', () => {
      expect(isSensitiveKey('myApiKey')).toBe(true);
      expect(isSensitiveKey('apiKeyValue')).toBe(true);
      expect(isSensitiveKey('userPassword')).toBe(true);
      expect(isSensitiveKey('passwordHash')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isSensitiveKey('APIKEY')).toBe(true);
      expect(isSensitiveKey('ApiKey')).toBe(true);
      expect(isSensitiveKey('aPiKeY')).toBe(true);
    });
  });

  describe('maskSensitiveValue', () => {
    it('should mask string values for sensitive keys', () => {
      expect(maskSensitiveValue('apiKey', 'my-secret-key')).toBe('***');
      expect(maskSensitiveValue('password', 'p@ssw0rd')).toBe('***');
      expect(maskSensitiveValue('token', 'abc123')).toBe('***');
    });

    it('should not mask string values for non-sensitive keys', () => {
      expect(maskSensitiveValue('name', 'John Doe')).toBe('John Doe');
      expect(maskSensitiveValue('email', 'john@example.com')).toBe('john@example.com');
    });

    it('should mask array values for sensitive keys', () => {
      const result = maskSensitiveValue('apiKeys', ['key1', 'key2', 'key3']);
      expect(result).toEqual(['***', '***', '***']);
    });

    it('should not mask array values for non-sensitive keys', () => {
      const values = ['item1', 'item2', 'item3'];
      expect(maskSensitiveValue('items', values)).toEqual(values);
    });

    it('should mask nested objects for sensitive keys', () => {
      const sensitiveObject = {
        id: '123',
        secret: 'my-secret',
        apiKey: 'key-123'
      };
      
      const result = maskSensitiveValue('credentials', sensitiveObject);
      expect(result).toEqual({
        id: '123',
        secret: '***',
        apiKey: '***'
      });
    });

    it('should handle null and undefined values', () => {
      expect(maskSensitiveValue('apiKey', null)).toBe('***');
      expect(maskSensitiveValue('apiKey', undefined)).toBe('***');
      expect(maskSensitiveValue('name', null)).toBe(null);
      expect(maskSensitiveValue('name', undefined)).toBe(undefined);
    });

    it('should handle boolean values', () => {
      expect(maskSensitiveValue('isSecretEnabled', true)).toBe('***');
      expect(maskSensitiveValue('isEnabled', true)).toBe(true);
      expect(maskSensitiveValue('hasPassword', false)).toBe('***');
      expect(maskSensitiveValue('hasName', false)).toBe(false);
    });

    it('should handle number values', () => {
      expect(maskSensitiveValue('apiKeyLength', 32)).toBe('***');
      expect(maskSensitiveValue('age', 25)).toBe(25);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize top-level sensitive keys', () => {
      const input = {
        name: 'John Doe',
        apiKey: 'secret-key-123',
        password: 'p@ssw0rd',
        email: 'john@example.com'
      };

      const result = sanitizeObject(input);
      
      expect(result).toEqual({
        name: 'John Doe',
        apiKey: '***',
        password: '***',
        email: 'john@example.com'
      });
    });

    it('should sanitize nested sensitive keys', () => {
      const input = {
        user: {
          name: 'John Doe',
          credentials: {
            apiKey: 'key-123',
            password: 'secret'
          }
        },
        settings: {
          theme: 'dark',
          token: 'auth-token'
        }
      };

      const result = sanitizeObject(input);
      
      expect(result).toEqual({
        user: {
          name: 'John Doe',
          credentials: {
            apiKey: '***',
            password: '***'
          }
        },
        settings: {
          theme: 'dark',
          token: '***'
        }
      });
    });

    it('should handle arrays of objects', () => {
      const input = {
        users: [
          { name: 'User1', apiKey: 'key1' },
          { name: 'User2', apiKey: 'key2' }
        ],
        apiKeys: ['key1', 'key2', 'key3']
      };

      const result = sanitizeObject(input);
      
      expect(result).toEqual({
        users: [
          { name: 'User1', apiKey: '***' },
          { name: 'User2', apiKey: '***' }
        ],
        apiKeys: ['***', '***', '***']
      });
    });

    it('should handle empty objects', () => {
      expect(sanitizeObject({})).toEqual({});
    });

    it('should handle objects with null/undefined values', () => {
      const input = {
        name: 'John',
        apiKey: null,
        password: undefined,
        token: ''
      };

      const result = sanitizeObject(input);
      
      expect(result).toEqual({
        name: 'John',
        apiKey: '***',
        password: '***',
        token: '***'
      });
    });

    it('should preserve object structure', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              secret: 'deep-secret',
              public: 'visible'
            }
          }
        }
      };

      const result = sanitizeObject(input);
      
      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              secret: '***',
              public: 'visible'
            }
          }
        }
      });
    });

    it('should handle mixed data types', () => {
      const input = {
        string: 'text',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { key: 'value' },
        nullValue: null,
        apiKey: 'secret',
        credentials: {
          token: 'auth-token',
          expires: 3600
        }
      };

      const result = sanitizeObject(input);
      
      expect(result).toEqual({
        string: 'text',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { key: 'value' },
        nullValue: null,
        apiKey: '***',
        credentials: {
          token: '***',
          expires: 3600
        }
      });
    });
  });
});