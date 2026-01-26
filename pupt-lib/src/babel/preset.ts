import type { ConfigAPI, TransformOptions } from '@babel/core';

export interface PuptBabelPresetOptions {
  typescript?: boolean;
  development?: boolean;
}

export function puptBabelPreset(
  api: ConfigAPI,
  options: PuptBabelPresetOptions = {},
): TransformOptions {
  const { typescript = true, development = false } = options;

  api.cache.using(() => JSON.stringify(options));

  return {
    presets: [
      typescript && ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
    ].filter(Boolean) as TransformOptions['presets'],
    plugins: [
      ['@babel/plugin-transform-react-jsx', {
        runtime: 'automatic',
        importSource: 'pupt-lib',
        development,
      }],
    ],
  };
}

export default puptBabelPreset;
