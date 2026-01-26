import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { File } from '../../../../src/components/data/File';
import { createRenderContext } from '../../../setup';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

// Create temp directory for file tests
const tmpDir = join(__dirname, '../../../../tmp/file-test');

function setupTmpDir() {
  mkdirSync(tmpDir, { recursive: true });
}

function cleanupTmpDir() {
  rmSync(tmpDir, { recursive: true, force: true });
}

describe('File', () => {
  beforeAll(() => {
    setupTmpDir();
  });

  afterAll(() => {
    cleanupTmpDir();
  });

  it('should render a TypeScript file with correct language detection', () => {
    const filePath = join(tmpDir, 'test.ts');
    writeFileSync(filePath, 'const x = 1;');

    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: filePath }, context);

    expect(result).toEqual([
      '<!-- test.ts -->\n',
      '```typescript\n',
      'const x = 1;',
      '\n```',
    ]);
  });

  it('should render a JavaScript file with correct language detection', () => {
    const filePath = join(tmpDir, 'test.js');
    writeFileSync(filePath, 'var y = 2;');

    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: filePath }, context);

    expect(result).toEqual([
      '<!-- test.js -->\n',
      '```javascript\n',
      'var y = 2;',
      '\n```',
    ]);
  });

  it('should render a Python file with correct language detection', () => {
    const filePath = join(tmpDir, 'script.py');
    writeFileSync(filePath, 'print("hello")');

    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: filePath }, context);

    expect(result).toEqual([
      '<!-- script.py -->\n',
      '```python\n',
      'print("hello")',
      '\n```',
    ]);
  });

  it('should render a JSON file with correct language detection', () => {
    const filePath = join(tmpDir, 'config.json');
    writeFileSync(filePath, '{"key": "value"}');

    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: filePath }, context);

    expect(result).toEqual([
      '<!-- config.json -->\n',
      '```json\n',
      '{"key": "value"}',
      '\n```',
    ]);
  });

  it('should render a YAML file with correct language detection', () => {
    const filePath = join(tmpDir, 'config.yaml');
    writeFileSync(filePath, 'key: value');

    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: filePath }, context);

    expect(result).toEqual([
      '<!-- config.yaml -->\n',
      '```yaml\n',
      'key: value',
      '\n```',
    ]);
  });

  it('should render a YML file with correct language detection', () => {
    const filePath = join(tmpDir, 'config.yml');
    writeFileSync(filePath, 'key: value2');

    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: filePath }, context);

    expect(result).toEqual([
      '<!-- config.yml -->\n',
      '```yaml\n',
      'key: value2',
      '\n```',
    ]);
  });

  it('should use provided language override', () => {
    const filePath = join(tmpDir, 'test.txt');
    writeFileSync(filePath, 'some code');

    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: filePath, language: 'rust' }, context);

    expect(result).toEqual([
      '<!-- test.txt -->\n',
      '```rust\n',
      'some code',
      '\n```',
    ]);
  });

  it('should handle files with unknown extensions', () => {
    const filePath = join(tmpDir, 'test.xyz');
    writeFileSync(filePath, 'unknown format');

    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: filePath }, context);

    expect(result).toEqual([
      '<!-- test.xyz -->\n',
      '```\n',
      'unknown format',
      '\n```',
    ]);
  });

  it('should handle file read errors gracefully', () => {
    const file = new File();
    const context = createRenderContext();
    const result = file.render({ path: '/nonexistent/path/file.ts' }, context);

    expect(result).toMatch(/\[Error reading file:/);
  });

  it('should render C/C++ files with correct language detection', () => {
    const cPath = join(tmpDir, 'main.c');
    writeFileSync(cPath, '#include <stdio.h>');

    const cppPath = join(tmpDir, 'main.cpp');
    writeFileSync(cppPath, '#include <iostream>');

    const hPath = join(tmpDir, 'header.h');
    writeFileSync(hPath, '#define FOO 1');

    const hppPath = join(tmpDir, 'header.hpp');
    writeFileSync(hppPath, 'template<class T>');

    const file = new File();
    const context = createRenderContext();

    const cResult = file.render({ path: cPath }, context);
    expect(cResult[1]).toBe('```c\n');

    const cppResult = file.render({ path: cppPath }, context);
    expect(cppResult[1]).toBe('```cpp\n');

    const hResult = file.render({ path: hPath }, context);
    expect(hResult[1]).toBe('```c\n');

    const hppResult = file.render({ path: hppPath }, context);
    expect(hppResult[1]).toBe('```cpp\n');
  });

  it('should render Go, Rust, Java files correctly', () => {
    const goPath = join(tmpDir, 'main.go');
    writeFileSync(goPath, 'package main');

    const rsPath = join(tmpDir, 'lib.rs');
    writeFileSync(rsPath, 'fn main() {}');

    const javaPath = join(tmpDir, 'Main.java');
    writeFileSync(javaPath, 'public class Main {}');

    const file = new File();
    const context = createRenderContext();

    const goResult = file.render({ path: goPath }, context);
    expect(goResult[1]).toBe('```go\n');

    const rsResult = file.render({ path: rsPath }, context);
    expect(rsResult[1]).toBe('```rust\n');

    const javaResult = file.render({ path: javaPath }, context);
    expect(javaResult[1]).toBe('```java\n');
  });

  it('should render Ruby files correctly', () => {
    const rbPath = join(tmpDir, 'script.rb');
    writeFileSync(rbPath, 'puts "hello"');

    const file = new File();
    const context = createRenderContext();

    const rbResult = file.render({ path: rbPath }, context);
    expect(rbResult[1]).toBe('```ruby\n');
  });

  it('should render CSS/SCSS files correctly', () => {
    const cssPath = join(tmpDir, 'style.css');
    writeFileSync(cssPath, '.class { color: red; }');

    const scssPath = join(tmpDir, 'style.scss');
    writeFileSync(scssPath, '$color: red;');

    const file = new File();
    const context = createRenderContext();

    const cssResult = file.render({ path: cssPath }, context);
    expect(cssResult[1]).toBe('```css\n');

    const scssResult = file.render({ path: scssPath }, context);
    expect(scssResult[1]).toBe('```scss\n');
  });

  it('should render HTML/XML files correctly', () => {
    const htmlPath = join(tmpDir, 'page.html');
    writeFileSync(htmlPath, '<html></html>');

    const xmlPath = join(tmpDir, 'data.xml');
    writeFileSync(xmlPath, '<data/>');

    const file = new File();
    const context = createRenderContext();

    const htmlResult = file.render({ path: htmlPath }, context);
    expect(htmlResult[1]).toBe('```html\n');

    const xmlResult = file.render({ path: xmlPath }, context);
    expect(xmlResult[1]).toBe('```xml\n');
  });

  it('should render Bash/SQL files correctly', () => {
    const shPath = join(tmpDir, 'script.sh');
    writeFileSync(shPath, '#!/bin/bash');

    const sqlPath = join(tmpDir, 'query.sql');
    writeFileSync(sqlPath, 'SELECT * FROM users;');

    const file = new File();
    const context = createRenderContext();

    const shResult = file.render({ path: shPath }, context);
    expect(shResult[1]).toBe('```bash\n');

    const sqlResult = file.render({ path: sqlPath }, context);
    expect(sqlResult[1]).toBe('```sql\n');
  });

  it('should render Markdown files correctly', () => {
    const mdPath = join(tmpDir, 'readme.md');
    writeFileSync(mdPath, '# Title');

    const file = new File();
    const context = createRenderContext();

    const mdResult = file.render({ path: mdPath }, context);
    expect(mdResult[1]).toBe('```markdown\n');
  });

  it('should render TSX/JSX files correctly', () => {
    const tsxPath = join(tmpDir, 'component.tsx');
    writeFileSync(tsxPath, 'export function App() {}');

    const jsxPath = join(tmpDir, 'component.jsx');
    writeFileSync(jsxPath, 'function App() {}');

    const file = new File();
    const context = createRenderContext();

    const tsxResult = file.render({ path: tsxPath }, context);
    expect(tsxResult[1]).toBe('```typescript\n');

    const jsxResult = file.render({ path: jsxPath }, context);
    expect(jsxResult[1]).toBe('```javascript\n');
  });
});
