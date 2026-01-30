import { describe, it, expect } from 'vitest';
import {
  generateImportMap,
  resolveCdn,
  serializeImportMap,
  generateImportMapScript,
  generatePuptLibImportMap,
  generatePuptLibImportMapScript,
  type ImportMap,
  type Dependency,
} from '../../../src/services/browser-support';

describe('generateImportMap', () => {
  it('should generate import map for dependencies', () => {
    const deps: Dependency[] = [
      { name: 'pupt-lib', version: '1.0.0' },
      { name: '@acme/prompts', version: '2.0.0' },
    ];

    const importMap = generateImportMap(deps, { cdn: 'esm.sh' });

    expect(importMap.imports['pupt-lib']).toBe('https://esm.sh/pupt-lib@1.0.0');
    expect(importMap.imports['@acme/prompts']).toBe('https://esm.sh/@acme/prompts@2.0.0');
  });

  it('should generate import map for unpkg CDN', () => {
    const deps: Dependency[] = [
      { name: 'lodash', version: '4.17.21' },
    ];

    const importMap = generateImportMap(deps, { cdn: 'unpkg' });

    expect(importMap.imports['lodash']).toBe('https://unpkg.com/lodash@4.17.21');
  });

  it('should generate import map with custom template', () => {
    const deps: Dependency[] = [
      { name: 'my-package', version: '1.0.0' },
    ];

    const importMap = generateImportMap(deps, {
      cdnTemplate: 'https://cdn.example.com/{name}@{version}',
    });

    expect(importMap.imports['my-package']).toBe('https://cdn.example.com/my-package@1.0.0');
  });

  it('should handle empty dependencies', () => {
    const deps: Dependency[] = [];

    const importMap = generateImportMap(deps, { cdn: 'esm.sh' });

    expect(importMap.imports).toEqual({});
  });

  it('should handle multiple scoped packages', () => {
    const deps: Dependency[] = [
      { name: '@org/pkg-a', version: '1.0.0' },
      { name: '@org/pkg-b', version: '2.0.0' },
      { name: '@other/pkg', version: '3.0.0' },
    ];

    const importMap = generateImportMap(deps, { cdn: 'esm.sh' });

    expect(importMap.imports['@org/pkg-a']).toBe('https://esm.sh/@org/pkg-a@1.0.0');
    expect(importMap.imports['@org/pkg-b']).toBe('https://esm.sh/@org/pkg-b@2.0.0');
    expect(importMap.imports['@other/pkg']).toBe('https://esm.sh/@other/pkg@3.0.0');
  });

  it('should include scopes when provided', () => {
    const deps: Dependency[] = [
      { name: 'pupt-lib', version: '1.0.0' },
    ];

    const importMap = generateImportMap(deps, {
      cdn: 'esm.sh',
      scopes: {
        '/app/': {
          'internal-pkg': '/local/internal-pkg.js',
        },
      },
    });

    expect(importMap.imports['pupt-lib']).toBe('https://esm.sh/pupt-lib@1.0.0');
    expect(importMap.scopes?.['/app/']?.['internal-pkg']).toBe('/local/internal-pkg.js');
  });
});

describe('resolveCdn', () => {
  it('should resolve esm.sh URLs', () => {
    const url = resolveCdn('@acme/pkg', '1.0.0', { cdn: 'esm.sh' });
    expect(url).toBe('https://esm.sh/@acme/pkg@1.0.0');
  });

  it('should resolve unpkg URLs', () => {
    const url = resolveCdn('@acme/pkg', '1.0.0', { cdn: 'unpkg' });
    expect(url).toBe('https://unpkg.com/@acme/pkg@1.0.0');
  });

  it('should resolve jsdelivr URLs', () => {
    const url = resolveCdn('@acme/pkg', '1.0.0', { cdn: 'jsdelivr' });
    expect(url).toBe('https://cdn.jsdelivr.net/npm/@acme/pkg@1.0.0');
  });

  it('should resolve skypack URLs', () => {
    const url = resolveCdn('@acme/pkg', '1.0.0', { cdn: 'skypack' });
    expect(url).toBe('https://cdn.skypack.dev/@acme/pkg@1.0.0');
  });

  it('should support custom template', () => {
    const url = resolveCdn('@acme/pkg', '1.0.0', {
      cdnTemplate: 'https://cdn.example.com/{name}@{version}',
    });
    expect(url).toBe('https://cdn.example.com/@acme/pkg@1.0.0');
  });

  it('should support template with path placeholder', () => {
    const url = resolveCdn('@acme/pkg', '1.0.0', {
      cdnTemplate: 'https://cdn.example.com/{name}@{version}/{path}',
      path: 'dist/index.js',
    });
    expect(url).toBe('https://cdn.example.com/@acme/pkg@1.0.0/dist/index.js');
  });

  it('should handle simple package names', () => {
    const url = resolveCdn('lodash', '4.17.21', { cdn: 'esm.sh' });
    expect(url).toBe('https://esm.sh/lodash@4.17.21');
  });

  it('should default to esm.sh when no cdn specified', () => {
    const url = resolveCdn('test-pkg', '1.0.0', {});
    expect(url).toBe('https://esm.sh/test-pkg@1.0.0');
  });
});

describe('ImportMap type', () => {
  it('should match the standard import map structure', () => {
    const importMap: ImportMap = {
      imports: {
        'pkg-a': 'https://cdn.example.com/pkg-a',
        'pkg-b': 'https://cdn.example.com/pkg-b',
      },
      scopes: {
        '/scope/': {
          'scoped-pkg': '/local/scoped-pkg.js',
        },
      },
    };

    expect(importMap.imports).toBeDefined();
    expect(importMap.scopes).toBeDefined();
  });
});

describe('serializeImportMap', () => {
  it('should serialize import map to JSON string', () => {
    const importMap: ImportMap = {
      imports: {
        'lodash': 'https://esm.sh/lodash@4.17.21',
      },
    };

    const json = serializeImportMap(importMap);

    expect(json).toContain('"imports"');
    expect(json).toContain('"lodash"');
    expect(json).toContain('https://esm.sh/lodash@4.17.21');
  });

  it('should format with 2-space indentation', () => {
    const importMap: ImportMap = {
      imports: { 'pkg': 'url' },
    };

    const json = serializeImportMap(importMap);

    // Should have newlines and indentation
    expect(json).toContain('\n');
    expect(json).toContain('  '); // 2-space indent
  });

  it('should serialize import map with scopes', () => {
    const importMap: ImportMap = {
      imports: { 'pkg': 'url' },
      scopes: {
        '/app/': { 'internal': '/local/internal.js' },
      },
    };

    const json = serializeImportMap(importMap);

    expect(json).toContain('"scopes"');
    expect(json).toContain('"/app/"');
  });
});

describe('generateImportMapScript', () => {
  it('should generate HTML script tag with import map', () => {
    const deps: Dependency[] = [
      { name: 'pupt-lib', version: '1.0.0' },
    ];

    const html = generateImportMapScript(deps, { cdn: 'esm.sh' });

    expect(html).toContain('<script type="importmap">');
    expect(html).toContain('</script>');
    expect(html).toContain('"pupt-lib"');
    expect(html).toContain('https://esm.sh/pupt-lib@1.0.0');
  });

  it('should include multiple dependencies', () => {
    const deps: Dependency[] = [
      { name: 'pkg-a', version: '1.0.0' },
      { name: 'pkg-b', version: '2.0.0' },
    ];

    const html = generateImportMapScript(deps, { cdn: 'unpkg' });

    expect(html).toContain('"pkg-a"');
    expect(html).toContain('"pkg-b"');
    expect(html).toContain('unpkg.com');
  });

  it('should generate valid embeddable HTML', () => {
    const deps: Dependency[] = [{ name: 'test', version: '1.0.0' }];
    const html = generateImportMapScript(deps, { cdn: 'esm.sh' });

    // Should start and end correctly for embedding in HTML
    expect(html.startsWith('<script type="importmap">')).toBe(true);
    expect(html.endsWith('</script>')).toBe(true);
  });
});

describe('generatePuptLibImportMap', () => {
  it('should generate import map with pupt-lib and jsx-runtime', () => {
    const importMap = generatePuptLibImportMap({ puptLibVersion: '1.1.0' });

    expect(importMap.imports['pupt-lib']).toBe('https://esm.sh/pupt-lib@1.1.0');
    expect(importMap.imports['pupt-lib/jsx-runtime']).toBe('https://esm.sh/pupt-lib@1.1.0/jsx-runtime');
  });

  it('should include zod dependency', () => {
    const importMap = generatePuptLibImportMap({ puptLibVersion: '1.1.0' });

    expect(importMap.imports['zod']).toBeDefined();
    expect(importMap.imports['zod']).toContain('zod@');
  });

  it('should use custom zod version when provided', () => {
    const importMap = generatePuptLibImportMap({
      puptLibVersion: '1.1.0',
      zodVersion: '3.20.0',
    });

    expect(importMap.imports['zod']).toBe('https://esm.sh/zod@3.20.0');
  });

  it('should support different CDN providers', () => {
    const importMap = generatePuptLibImportMap({
      puptLibVersion: '1.1.0',
      cdn: 'unpkg',
    });

    expect(importMap.imports['pupt-lib']).toBe('https://unpkg.com/pupt-lib@1.1.0');
    expect(importMap.imports['pupt-lib/jsx-runtime']).toBe('https://unpkg.com/pupt-lib@1.1.0/jsx-runtime');
    expect(importMap.imports['zod']).toContain('unpkg.com');
  });

  it('should support custom CDN template', () => {
    const importMap = generatePuptLibImportMap({
      puptLibVersion: '1.1.0',
      cdnTemplate: 'https://mycdn.example.com/{name}@{version}',
    });

    expect(importMap.imports['pupt-lib']).toBe('https://mycdn.example.com/pupt-lib@1.1.0');
  });

  it('should include additional dependencies when provided', () => {
    const importMap = generatePuptLibImportMap({
      puptLibVersion: '1.1.0',
      additionalDependencies: [
        { name: 'my-component-lib', version: '2.0.0' },
        { name: '@org/utils', version: '1.0.0' },
      ],
    });

    expect(importMap.imports['my-component-lib']).toBe('https://esm.sh/my-component-lib@2.0.0');
    expect(importMap.imports['@org/utils']).toBe('https://esm.sh/@org/utils@1.0.0');
  });

  it('should use "latest" as default version', () => {
    const importMap = generatePuptLibImportMap({});

    expect(importMap.imports['pupt-lib']).toBe('https://esm.sh/pupt-lib@latest');
  });
});

describe('generatePuptLibImportMapScript', () => {
  it('should generate HTML script tag with pupt-lib import map', () => {
    const html = generatePuptLibImportMapScript({ puptLibVersion: '1.1.0' });

    expect(html).toContain('<script type="importmap">');
    expect(html).toContain('</script>');
    expect(html).toContain('"pupt-lib"');
    expect(html).toContain('"pupt-lib/jsx-runtime"');
    expect(html).toContain('"zod"');
  });

  it('should generate valid embeddable HTML', () => {
    const html = generatePuptLibImportMapScript({ puptLibVersion: '1.1.0' });

    expect(html.startsWith('<script type="importmap">')).toBe(true);
    expect(html.endsWith('</script>')).toBe(true);
  });
});
