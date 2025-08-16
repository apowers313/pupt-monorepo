import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateFormats, formatDate } from '../../src/utils/date-formatter.js';

describe('Date Formatter', () => {
  describe('DateFormats', () => {
    describe('YYYYMMDD', () => {
      it('should format date as YYYYMMDD', () => {
        const date = new Date('2024-01-15T12:30:00Z');
        expect(DateFormats.YYYYMMDD(date)).toBe('20240115');
      });

      it('should handle single digit months and days', () => {
        const date = new Date(2024, 2, 5); // March 5, 2024 (month is 0-indexed)
        expect(DateFormats.YYYYMMDD(date)).toBe('20240305');
      });

      it('should handle end of year', () => {
        const date = new Date('2024-12-31T23:59:59Z');
        expect(DateFormats.YYYYMMDD(date)).toBe('20241231');
      });
    });

    describe('UTC_DATETIME', () => {
      it('should format date as ISO string', () => {
        const date = new Date('2024-01-15T12:30:45.123Z');
        expect(DateFormats.UTC_DATETIME(date)).toBe('2024-01-15T12:30:45.123Z');
      });
    });

    describe('LOCAL_DATE', () => {
      it('should format date using locale date string', () => {
        const date = new Date('2024-01-15T12:00:00Z');
        const result = DateFormats.LOCAL_DATE(date);
        // Result varies by locale, just check it's a string
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('LOCAL_TIME', () => {
      it('should format time using locale time string', () => {
        const date = new Date('2024-01-15T14:30:45Z');
        const result = DateFormats.LOCAL_TIME(date);
        // Result varies by locale, just check it's a string
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('LOCAL_DATETIME', () => {
      it('should format both date and time using locale string', () => {
        const date = new Date('2024-01-15T14:30:45Z');
        const result = DateFormats.LOCAL_DATETIME(date);
        // Should contain both date and time parts
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        // Should contain space separator
        expect(result).toContain(' ');
      });
    });

    describe('RELATIVE', () => {
      beforeEach(() => {
        // Mock Date.now to have consistent relative time
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
      });

      it('should format as "just now" for recent times', () => {
        const date = new Date('2024-01-15T11:59:30Z');
        expect(DateFormats.RELATIVE(date)).toBe('just now');
      });

      it('should format as minutes ago', () => {
        const date = new Date('2024-01-15T11:55:00Z');
        expect(DateFormats.RELATIVE(date)).toBe('5 minutes ago');
        
        const date2 = new Date('2024-01-15T11:59:00Z');
        expect(DateFormats.RELATIVE(date2)).toBe('1 minute ago');
      });

      it('should format as hours ago', () => {
        const date = new Date('2024-01-15T10:00:00Z');
        expect(DateFormats.RELATIVE(date)).toBe('2 hours ago');
        
        const date2 = new Date('2024-01-15T11:00:00Z');
        expect(DateFormats.RELATIVE(date2)).toBe('1 hour ago');
      });

      it('should format as days ago', () => {
        const date = new Date('2024-01-13T12:00:00Z');
        expect(DateFormats.RELATIVE(date)).toBe('2 days ago');
        
        const date2 = new Date('2024-01-14T12:00:00Z');
        expect(DateFormats.RELATIVE(date2)).toBe('1 day ago');
      });

      it('should handle future dates as just now', () => {
        const date = new Date('2024-01-15T12:00:30Z');
        expect(DateFormats.RELATIVE(date)).toBe('just now');
      });
    });
  });

  describe('formatDate', () => {
    it('should format date using specified format', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      
      expect(formatDate(date, 'YYYYMMDD')).toBe('20240115');
      expect(formatDate(date, 'UTC_DATETIME')).toBe(date.toISOString());
    });

    it('should throw error for unknown format', () => {
      const date = new Date();
      expect(() => formatDate(date, 'INVALID_FORMAT' as any))
        .toThrow('Unknown date format: INVALID_FORMAT');
    });

    it('should handle all available formats', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const formats: (keyof typeof DateFormats)[] = [
        'YYYYMMDD',
        'UTC_DATETIME',
        'LOCAL_DATE',
        'LOCAL_TIME',
        'LOCAL_DATETIME',
        'RELATIVE'
      ];

      formats.forEach(format => {
        expect(() => formatDate(date, format)).not.toThrow();
        expect(typeof formatDate(date, format)).toBe('string');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle invalid dates', () => {
      const invalidDate = new Date('invalid');
      
      // Most formats should return 'Invalid Date' or similar
      expect(DateFormats.YYYYMMDD(invalidDate)).toBe('NaNNaNNaN');
      expect(() => DateFormats.UTC_DATETIME(invalidDate)).toThrow('Invalid time value');
    });

    it('should handle epoch date', () => {
      const epoch = new Date(0);
      // Epoch in local time might be Dec 31, 1969 depending on timezone
      const year = epoch.getFullYear();
      const month = String(epoch.getMonth() + 1).padStart(2, '0');
      const day = String(epoch.getDate()).padStart(2, '0');
      expect(DateFormats.YYYYMMDD(epoch)).toBe(`${year}${month}${day}`);
      expect(DateFormats.UTC_DATETIME(epoch)).toBe('1970-01-01T00:00:00.000Z');
    });

    it('should handle very old dates', () => {
      const oldDate = new Date(1900, 0, 1); // January 1, 1900 in local time
      expect(DateFormats.YYYYMMDD(oldDate)).toBe('19000101');
    });

    it('should handle very future dates', () => {
      const futureDate = new Date('2100-12-31T23:59:59Z');
      expect(DateFormats.YYYYMMDD(futureDate)).toBe('21001231');
    });
  });
});