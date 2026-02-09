import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const COMPONENTS_DIR = path.resolve(__dirname, '../../components');
const SRC_COMPONENTS_DIR = path.resolve(__dirname, '../../src/components');

/**
 * Allowed import sources for files in components/.
 *
 * Components are external to `src/` and must only use the public API.
 * This prevents hidden coupling to internal implementation details and
 * guarantees that third-party components using the same API will also work.
 */
const ALLOWED_IMPORT_SOURCES = [
  { pattern: /^'pupt-lib'$/, description: 'pupt-lib (public API)' },
  { pattern: /^'pupt-lib\//, description: 'pupt-lib/* sub-paths (e.g. jsx-runtime)' },
  { pattern: /^'zod'/, description: 'zod (external dependency)' },
  { pattern: /^'\.\//, description: 'sibling file in the same directory' },
  { pattern: /^'\.\.\//, description: 'sibling directory within components/ (e.g. ../presets)' },
];

/**
 * Recursively collect all files in a directory.
 */
function getAllFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Extract all import specifiers from a file's source text.
 * Returns { line, specifier } for each static import.
 */
function extractImports(content: string): Array<{ line: number; specifier: string; statement: string }> {
  const results: Array<{ line: number; specifier: string; statement: string }> = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: import ... from 'specifier'  or  import ... from "specifier"
    const match = line.match(/^\s*import\s.*?from\s+(['"])(.*?)\1/);
    if (match) {
      results.push({
        line: i + 1,
        specifier: match[2],
        statement: line.trim(),
      });
    }
  }

  return results;
}

describe('component file conventions', () => {
  const allFiles = getAllFiles(COMPONENTS_DIR);
  const tsxFiles = allFiles.filter(f => f.endsWith('.tsx'));
  const tsFiles = allFiles.filter(f => f.endsWith('.ts'));
  const sourceFiles = [...tsxFiles, ...tsFiles];

  it('component files use .tsx extension (barrels, utilities, and presets use .ts)', () => {
    const componentFiles = allFiles.filter(f => {
      const basename = path.basename(f);
      const relPath = path.relative(COMPONENTS_DIR, f);
      // Exclude barrel files, utility files, and preset data files
      return basename !== 'index.ts' && basename !== 'utils.ts' && basename !== 'manifest.ts' && !relPath.startsWith('presets/');
    });

    for (const file of componentFiles) {
      expect(file, `Component file should use .tsx extension: ${file}`).toMatch(/\.tsx$/);
    }

    expect(componentFiles.length).toBeGreaterThan(0);
  });

  it('no component files remain in src/components/', () => {
    const srcFiles = getAllFiles(SRC_COMPONENTS_DIR);
    expect(srcFiles, 'src/components/ should not exist or should be empty').toEqual([]);
  });

  it('every source file in components/ only imports from allowed sources', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const relPath = path.relative(COMPONENTS_DIR, file);
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);

      for (const imp of imports) {
        const quoted = `'${imp.specifier}'`;
        const isAllowed = ALLOWED_IMPORT_SOURCES.some(s => s.pattern.test(quoted));

        if (!isAllowed) {
          violations.push(`${relPath}:${imp.line}  imports '${imp.specifier}'`);
        }
      }
    }

    if (violations.length > 0) {
      const allowed = ALLOWED_IMPORT_SOURCES.map(s => `  - ${s.description}`).join('\n');
      const message = [
        `Found ${violations.length} import(s) from disallowed sources:`,
        '',
        ...violations.map(v => `  ${v}`),
        '',
        'Components must only import from:',
        allowed,
        '',
        'If a component needs something from src/, it must be exported',
        'from the pupt-lib public API (src/index.ts) first.',
      ].join('\n');

      expect.fail(message);
    }
  });

  it('no file imports from a path containing "src/"', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const relPath = path.relative(COMPONENTS_DIR, file);
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);

      for (const imp of imports) {
        if (imp.specifier.includes('src/')) {
          violations.push(`${relPath}:${imp.line}  ${imp.statement}`);
        }
      }
    }

    expect(violations, 'No component file should import from a path containing "src/"').toEqual([]);
  });

  it('parent directory imports (../) stay within components/', () => {
    const violations: string[] = [];

    for (const file of sourceFiles) {
      const relPath = path.relative(COMPONENTS_DIR, file);
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);

      for (const imp of imports) {
        if (imp.specifier.startsWith('../')) {
          // Resolve the import relative to the file's directory
          const fileDir = path.dirname(file);
          const resolved = path.resolve(fileDir, imp.specifier);
          // Check that the resolved path is still within COMPONENTS_DIR
          if (!resolved.startsWith(COMPONENTS_DIR)) {
            violations.push(`${relPath}:${imp.line}  imports '${imp.specifier}' (resolves outside components/)`);
          }
        }
      }
    }

    expect(
      violations,
      'Parent directory imports (../) must resolve within components/. ' +
      'Use pupt-lib public API to access src/ code.',
    ).toEqual([]);
  });

  it('sanity: components/ has a reasonable number of source files', () => {
    // Guard against the test silently passing on an empty directory
    expect(tsxFiles.length).toBeGreaterThan(40);
    expect(tsFiles.length).toBeGreaterThan(5);
  });
});
