import { describe, it, expect } from 'vitest';
import { Xml } from '../../../../src/components/data/Xml';
import { createRenderContext } from '../../../setup';

describe('Xml', () => {
  it('should render with default root element', () => {
    const xml = new Xml();
    const context = createRenderContext();
    const result = xml.render({ children: 'content here' }, undefined, context);

    expect(result).toEqual([
      '```xml\n',
      '<data>\n',
      'content here',
      '\n</data>\n',
      '```',
    ]);
  });

  it('should render with custom root element', () => {
    const xml = new Xml();
    const context = createRenderContext();
    const result = xml.render({ root: 'config', children: '<item>test</item>' }, undefined, context);

    expect(result).toEqual([
      '```xml\n',
      '<config>\n',
      '<item>test</item>',
      '\n</config>\n',
      '```',
    ]);
  });

  it('should handle array children', () => {
    const xml = new Xml();
    const context = createRenderContext();
    const result = xml.render({
      root: 'list',
      children: ['<item>1</item>', '<item>2</item>'],
    }, undefined, context);

    expect(result).toEqual([
      '```xml\n',
      '<list>\n',
      ['<item>1</item>', '<item>2</item>'],
      '\n</list>\n',
      '```',
    ]);
  });

  it('should handle empty children', () => {
    const xml = new Xml();
    const context = createRenderContext();
    const result = xml.render({ children: '' }, undefined, context);

    expect(result).toEqual([
      '```xml\n',
      '<data>\n',
      '',
      '\n</data>\n',
      '```',
    ]);
  });
});
