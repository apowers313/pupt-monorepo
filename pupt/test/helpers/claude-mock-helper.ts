/**
 * Helper to setup Claude mock for tests
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mockDir = join(__dirname, '../mocks');

/**
 * Sets up the Claude mock by adding the mock directory to PATH
 * Returns a cleanup function to restore the original PATH
 */
export function setupClaudeMock(): () => void {
  const originalPath = process.env.PATH;
  const pathSeparator = process.platform === 'win32' ? ';' : ':';
  process.env.PATH = `${mockDir}${pathSeparator}${process.env.PATH}`;
  
  return () => {
    process.env.PATH = originalPath;
  };
}

/**
 * Check if the Claude mock is available
 */
export function isClaudeMockAvailable(): boolean {
  try {
    const pathSeparator = process.platform === 'win32' ? ';' : ':';
    const path = process.env.PATH?.split(pathSeparator) || [];
    return path.includes(mockDir);
  } catch {
    return false;
  }
}