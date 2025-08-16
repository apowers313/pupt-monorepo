export const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /password/i,
  /secret/i,
  /token/i,
  /credential/i,
  /private[_-]?key/i,
  /auth/i,
  /bearer/i
] as const;

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

export function maskSensitiveValue(key: string, value: unknown): unknown {
  if (!isSensitiveKey(key)) {
    return value;
  }
  
  if (typeof value === 'string') {
    return '***';
  }
  
  if (Array.isArray(value)) {
    return value.map(() => '***');
  }
  
  if (typeof value === 'object' && value !== null) {
    return Object.keys(value).reduce((masked, k) => ({
      ...masked,
      [k]: maskSensitiveValue(k, (value as Record<string, unknown>)[k])
    }), {});
  }
  
  return '***';
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T
): T {
  return Object.entries(obj).reduce((sanitized, [key, value]) => {
    // Always check if the key itself is sensitive first
    if (isSensitiveKey(key)) {
      sanitized[key as keyof T] = maskSensitiveValue(key, value) as T[keyof T];
    } else if (Array.isArray(value)) {
      // Handle arrays - check if it's an array of objects
      sanitized[key as keyof T] = value.map(item => {
        if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item as Record<string, unknown>);
        }
        return item;
      }) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key as keyof T] = sanitizeObject(value as Record<string, unknown>) as T[keyof T];
    } else {
      sanitized[key as keyof T] = value as T[keyof T];
    }
    return sanitized;
  }, {} as T);
}