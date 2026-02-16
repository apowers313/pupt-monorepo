import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { relative,resolve } from 'path';
import { describe, expect,it } from 'vitest';

describe('Import boundary: src/ must not import from components/', () => {
  const srcDir = resolve(__dirname, '../../src');
  const srcFiles = globSync('**/*.ts', { cwd: srcDir })
    .map(f => resolve(srcDir, f));

  // src/index.ts is the public barrel file — it re-exports components.
  // All other src/ files must not import from components/.
  const internalSrcFiles = srcFiles.filter(
    f => relative(srcDir, f) !== 'index.ts',
  );

  it('should have src/ files to check', () => {
    expect(internalSrcFiles.length).toBeGreaterThan(0);
  });

  for (const filePath of internalSrcFiles) {
    const relPath = relative(srcDir, filePath);

    it(`src/${relPath} should not import from components/`, () => {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      const violations: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Match import/export statements that reference ../components or ../../components
        if (/(?:import|export)\s.*from\s+['"](?:\.\.\/)+components/.test(line)) {
          violations.push(`  line ${i + 1}: ${line.trim()}`);
        }
        // Also match dynamic imports
        if (/import\(['"](?:\.\.\/)+components/.test(line)) {
          violations.push(`  line ${i + 1}: ${line.trim()}`);
        }
      }

      expect(
        violations,
        `src/${relPath} imports from components/ directory:\n${violations.join('\n')}\n\n` +
        'src/ must not depend on components/. Components use the same public API as third-party components. ' +
        'Only src/index.ts (the barrel file) may re-export from components/.',
      ).toHaveLength(0);
    });
  }
});
