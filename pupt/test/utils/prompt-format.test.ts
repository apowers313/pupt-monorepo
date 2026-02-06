import { describe, it, expect } from 'vitest';
import {
  detectPromptFormat,
  isPuptLibFormat,
  PUPT_LIB_EXTENSIONS,
  ALL_PROMPT_EXTENSIONS,
} from '../../src/utils/prompt-format.js';

describe('detectPromptFormat', () => {
  it('should detect .tsx as jsx', () => {
    expect(detectPromptFormat('review.tsx')).toBe('jsx');
  });

  it('should detect .jsx as jsx', () => {
    expect(detectPromptFormat('review.jsx')).toBe('jsx');
  });

  it('should detect .prompt as jsx-runtime', () => {
    expect(detectPromptFormat('review.prompt')).toBe('jsx-runtime');
  });

  it('should default to jsx-runtime for unknown extensions', () => {
    expect(detectPromptFormat('review.txt')).toBe('jsx-runtime');
  });

  it('should handle full paths', () => {
    expect(detectPromptFormat('/home/user/prompts/review.tsx')).toBe('jsx');
    expect(detectPromptFormat('./prompts/review.prompt')).toBe('jsx-runtime');
  });

  it('should handle filenames with multiple dots', () => {
    expect(detectPromptFormat('my.code.review.tsx')).toBe('jsx');
    expect(detectPromptFormat('my.code.review.prompt')).toBe('jsx-runtime');
  });
});

describe('isPuptLibFormat', () => {
  it('should return true for .tsx files', () => {
    expect(isPuptLibFormat('review.tsx')).toBe(true);
  });

  it('should return true for .jsx files', () => {
    expect(isPuptLibFormat('review.jsx')).toBe(true);
  });

  it('should return true for .prompt files', () => {
    expect(isPuptLibFormat('review.prompt')).toBe(true);
  });

  it('should return true for unknown extensions (defaults to jsx-runtime)', () => {
    expect(isPuptLibFormat('review.txt')).toBe(true);
  });
});

describe('Constants', () => {
  it('should export PUPT_LIB_EXTENSIONS', () => {
    expect(PUPT_LIB_EXTENSIONS).toContain('.tsx');
    expect(PUPT_LIB_EXTENSIONS).toContain('.jsx');
    expect(PUPT_LIB_EXTENSIONS).toContain('.prompt');
    expect(PUPT_LIB_EXTENSIONS).not.toContain('.md');
  });

  it('should export ALL_PROMPT_EXTENSIONS', () => {
    expect(ALL_PROMPT_EXTENSIONS).toContain('.tsx');
    expect(ALL_PROMPT_EXTENSIONS).toContain('.jsx');
    expect(ALL_PROMPT_EXTENSIONS).toContain('.prompt');
    expect(ALL_PROMPT_EXTENSIONS).not.toContain('.md');
  });
});
