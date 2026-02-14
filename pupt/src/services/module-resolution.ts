import path from 'node:path';

export function configureModuleResolution(dataDir: string): void {
  const packagesNodeModules = path.join(dataDir, 'packages', 'node_modules');
  const existing = process.env.NODE_PATH || '';
  const paths = existing.split(path.delimiter).filter(Boolean);
  if (!paths.includes(packagesNodeModules)) {
    paths.push(packagesNodeModules);
    process.env.NODE_PATH = paths.join(path.delimiter);
  }
}
