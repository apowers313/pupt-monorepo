import { describe, expect,it } from 'vitest';

import * as allExports from '../../components';
import {
  ASK_COMPONENTS,
  BUILTIN_COMPONENTS,
  STRUCTURAL_COMPONENTS,
} from '../../components/manifest';
import { isComponentClass } from '../../src/component';
import {
  getAskComponents,
  getBuiltinComponents,
  getStructuralComponents,
} from '../../src/services/component-discovery';

/**
 * Verify that components/manifest.ts stays in sync with actual exports
 * AND that the dynamic discovery in src/ produces correct results.
 */
describe('component manifest sync', () => {
  // Get all exported names that are Component classes
  const componentNames = Object.entries(allExports)
    .filter(([_, value]) => isComponentClass(value))
    .map(([name]) => name);

  // The Ask namespace is an object, not a Component class
  const askNamespace = 'Ask' in allExports ? ['Ask'] : [];

  it('BUILTIN_COMPONENTS should list every non-Ask component class exported from components/', () => {
    const nonAskComponents = componentNames.filter(name => !name.startsWith('Ask'));
    const expectedInManifest = nonAskComponents;

    const missing = expectedInManifest.filter(
      name => !(BUILTIN_COMPONENTS as readonly string[]).includes(name),
    );
    const extra = (BUILTIN_COMPONENTS as readonly string[]).filter(
      name => !(name === 'Component' || expectedInManifest.includes(name)),
    );

    expect(missing, 'Components exported but missing from BUILTIN_COMPONENTS in manifest').toEqual([]);
    expect(extra, 'Names in BUILTIN_COMPONENTS but not exported from components/').toEqual([]);
  });

  it('ASK_COMPONENTS should list every Ask component exported from components/', () => {
    const askComponents = [...componentNames.filter(name => name.startsWith('Ask')), ...askNamespace];

    const missing = askComponents.filter(
      name => !(ASK_COMPONENTS as readonly string[]).includes(name),
    );
    const extra = (ASK_COMPONENTS as readonly string[]).filter(
      name => !askComponents.includes(name),
    );

    expect(missing, 'Ask components exported but missing from ASK_COMPONENTS in manifest').toEqual([]);
    expect(extra, 'Names in ASK_COMPONENTS but not exported from components/').toEqual([]);
  });

  it('STRUCTURAL_COMPONENTS should be a subset of BUILTIN_COMPONENTS (plus Fragment)', () => {
    const allBuiltin = new Set([...BUILTIN_COMPONENTS, 'Fragment']);
    const invalidStructural = (STRUCTURAL_COMPONENTS as readonly string[]).filter(
      name => !allBuiltin.has(name),
    );

    expect(
      invalidStructural,
      'STRUCTURAL_COMPONENTS contains names not in BUILTIN_COMPONENTS',
    ).toEqual([]);
  });

  it('every component class from components/ should appear in either BUILTIN or ASK list', () => {
    const allManifest = new Set([
      ...(BUILTIN_COMPONENTS as readonly string[]),
      ...(ASK_COMPONENTS as readonly string[]),
    ]);

    const unlisted = componentNames.filter(name => !allManifest.has(name));

    expect(
      unlisted,
      'Component classes exported from components/ but not listed in any manifest list',
    ).toEqual([]);
  });

  // Dynamic discovery tests — verify runtime-computed lists match the manifest
  it('dynamic getBuiltinComponents() should match manifest BUILTIN_COMPONENTS', () => {
    const dynamic = getBuiltinComponents();
    const manifest = [...BUILTIN_COMPONENTS];

    const missingFromDynamic = manifest.filter(name => !dynamic.includes(name));
    const extraInDynamic = [...dynamic].filter(
      name => !(BUILTIN_COMPONENTS as readonly string[]).includes(name),
    );

    expect(missingFromDynamic, 'Manifest names missing from dynamic discovery').toEqual([]);
    expect(extraInDynamic, 'Dynamic discovery has names not in manifest').toEqual([]);
  });

  it('dynamic getAskComponents() should match manifest ASK_COMPONENTS', () => {
    const dynamic = getAskComponents();
    const manifest = [...ASK_COMPONENTS];

    const missingFromDynamic = manifest.filter(name => !dynamic.includes(name));
    const extraInDynamic = [...dynamic].filter(
      name => !(ASK_COMPONENTS as readonly string[]).includes(name),
    );

    expect(missingFromDynamic, 'Manifest Ask names missing from dynamic discovery').toEqual([]);
    expect(extraInDynamic, 'Dynamic discovery has Ask names not in manifest').toEqual([]);
  });

  it('dynamic getStructuralComponents() should match manifest STRUCTURAL_COMPONENTS', () => {
    const dynamic = getStructuralComponents();
    const manifest = [...STRUCTURAL_COMPONENTS];

    const missingFromDynamic = manifest.filter(name => !dynamic.includes(name));
    const extraInDynamic = [...dynamic].filter(
      name => !(STRUCTURAL_COMPONENTS as readonly string[]).includes(name),
    );

    expect(missingFromDynamic, 'Manifest structural names missing from dynamic discovery').toEqual([]);
    expect(extraInDynamic, 'Dynamic structural discovery has names not in manifest').toEqual([]);
  });
});
