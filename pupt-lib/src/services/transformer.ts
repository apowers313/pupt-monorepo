/**
 * Transformer class for compiling TSX source code at runtime.
 * Uses @babel/standalone to transform JSX syntax into jsx() function calls.
 *
 * Works in both Node.js and browser environments.
 */

// Type for Babel transform interface
interface BabelTransform {
  transform: (source: string, options: Record<string, unknown>) => { code?: string | null };
}

// Babel instance (loaded dynamically)
let BabelInstance: BabelTransform | null = null;

/**
 * Get the babel-standalone instance.
 * Lazily loads to support both Node.js and browser environments.
 */
async function getBabel(): Promise<BabelTransform> {
  if (!BabelInstance) {
    const module = await import('@babel/standalone');
    BabelInstance = module.default || module;
  }
  return BabelInstance;
}

/**
 * Babel transform options for pupt-lib JSX transformation.
 */
function getTransformOptions(filename: string): Record<string, unknown> {
  return {
    presets: ['typescript'],
    filename,
    plugins: [
      ['transform-react-jsx', {
        runtime: 'automatic',
        importSource: 'pupt-lib',
      }],
    ],
  };
}

/**
 * Transform source code using Babel (async).
 */
async function transformWithBabelAsync(source: string, filename: string): Promise<string> {
  const Babel = await getBabel();
  const result = Babel.transform(source, getTransformOptions(filename));

  if (!result?.code) {
    throw new Error(`Failed to transform: ${filename}`);
  }

  return result.code;
}

/**
 * Transform source code synchronously.
 * Note: Requires Babel to be pre-loaded via an async call first.
 */
function transformWithBabelSync(source: string, filename: string): string {
  if (!BabelInstance) {
    throw new Error('Babel not loaded. Call transformSourceAsync first, or use async methods.');
  }

  const result = BabelInstance.transform(source, getTransformOptions(filename));

  if (!result?.code) {
    throw new Error(`Failed to transform: ${filename}`);
  }

  return result.code;
}

export class Transformer {
  /**
   * Transform a source string containing TSX code (sync version).
   * Note: Requires Babel to be pre-loaded via transformSourceAsync first.
   *
   * @param source - The TSX source code to transform
   * @param filename - Filename used for error messages and source maps
   * @returns The transformed JavaScript code
   * @throws Error if transformation fails or if Babel not loaded
   */
  transformSource(source: string, filename: string): string {
    return transformWithBabelSync(source, filename);
  }

  /**
   * Transform a source string containing TSX code (async version).
   * Works in both Node.js and browser environments.
   *
   * @param source - The TSX source code to transform
   * @param filename - Filename used for error messages and source maps
   * @returns The transformed JavaScript code
   * @throws Error if transformation fails
   */
  async transformSourceAsync(source: string, filename: string): Promise<string> {
    return transformWithBabelAsync(source, filename);
  }

  /**
   * Transform a TSX file by reading and transforming its contents.
   * Note: This method only works in Node.js environments.
   *
   * @param filePath - Path to the TSX file
   * @returns The transformed JavaScript code
   * @throws Error if file cannot be read or transformation fails
   */
  async transformFile(filePath: string): Promise<string> {
    const { readFile } = await import('fs/promises');
    const source = await readFile(filePath, 'utf-8');
    return this.transformSourceAsync(source, filePath);
  }
}
