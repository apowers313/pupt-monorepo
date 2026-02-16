import envPaths from 'env-paths';
import path from 'node:path';

const platformPaths = envPaths('pupt', { suffix: '' });

export function getConfigDir(): string {
  return process.env.PUPT_CONFIG_DIR || platformPaths.config;
}

export function getDataDir(): string {
  return process.env.PUPT_DATA_DIR || platformPaths.data;
}

export function getCacheDir(): string {
  return process.env.PUPT_CACHE_DIR || platformPaths.cache;
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}
