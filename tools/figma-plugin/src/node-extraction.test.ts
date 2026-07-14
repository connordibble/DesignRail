import { describe, expect, it } from 'vitest';

import { extractNodeData } from './node-extraction.js';

function asComponentSet(value: object): ComponentSetNode {
  return value as unknown as ComponentSetNode;
}

function asComponent(value: object): ComponentNode {
  return value as unknown as ComponentNode;
}

function asInstance(value: object): InstanceNode {
  return value as unknown as InstanceNode;
}

describe('Figma node extraction', () => {
  it('resolves instance axes and canonical identity from its component set', async () => {
    const set = asComponentSet({
      type: 'COMPONENT_SET',
      name: 'Button',
      description: 'Action control.',
      componentPropertyDefinitions: {
        Variant: {
          type: 'VARIANT',
          defaultValue: 'Primary',
          variantOptions: ['Primary', 'Neutral'],
        },
        State: {
          type: 'VARIANT',
          defaultValue: 'Default',
          variantOptions: ['Default', 'Disabled'],
        },
      },
    });
    const main = asComponent({ type: 'COMPONENT', name: 'Variant=Primary', parent: set });
    const instance = asInstance({
      type: 'INSTANCE',
      name: 'Renamed action',
      componentProperties: {
        Variant: { type: 'VARIANT', value: 'Neutral' },
        State: { type: 'VARIANT', value: 'Disabled' },
        'Label#1:2': { type: 'TEXT', value: 'Archive' },
        'Disabled#1:3': { type: 'BOOLEAN', value: true },
      },
      getMainComponentAsync: async () => main,
    });

    await expect(extractNodeData(instance)).resolves.toEqual({
      canonicalName: 'Button',
      description: 'Action control.',
      variantGroups: {
        Variant: ['Primary', 'Neutral'],
        State: ['Default', 'Disabled'],
      },
      properties: {
        Variant: 'Neutral',
        State: 'Disabled',
        'Label#1:2': 'Archive',
        'Disabled#1:3': true,
      },
    });
  });

  it('preserves declared defaults for a standalone component', async () => {
    const component = asComponent({
      type: 'COMPONENT',
      name: 'Input',
      parent: null,
      description: '',
      variantProperties: null,
      componentPropertyDefinitions: {
        'Label#2:1': { type: 'TEXT', defaultValue: 'Email address' },
        'Required#2:2': { type: 'BOOLEAN', defaultValue: true },
        'Icon#2:3': { type: 'INSTANCE_SWAP', defaultValue: '3:4' },
      },
    });

    await expect(extractNodeData(component)).resolves.toEqual({
      canonicalName: 'Input',
      variantGroups: {},
      properties: {
        'Label#2:1': 'Email address',
        'Required#2:2': true,
      },
    });
  });

  it('uses the parent set name for a selected variant component', async () => {
    const set = asComponentSet({
      type: 'COMPONENT_SET',
      name: 'Button',
      description: '',
      componentPropertyDefinitions: {
        State: {
          type: 'VARIANT',
          defaultValue: 'Default',
          variantOptions: ['Default', 'Hover'],
        },
      },
    });
    const component = asComponent({
      type: 'COMPONENT',
      name: 'State=Hover',
      parent: set,
      description: '',
      componentPropertyDefinitions: {
        'Label#4:1': { type: 'TEXT', defaultValue: 'Save' },
      },
      variantProperties: { State: 'Hover' },
    });

    await expect(extractNodeData(component)).resolves.toEqual({
      canonicalName: 'Button',
      variantGroups: { State: ['Default', 'Hover'] },
      properties: { 'Label#4:1': 'Save', State: 'Hover' },
    });
  });

  it('keeps instance variant values classified when the main component is unavailable', async () => {
    const instance = asInstance({
      type: 'INSTANCE',
      name: 'Remote button',
      componentProperties: {
        Variant: { type: 'VARIANT', value: 'Primary' },
      },
      getMainComponentAsync: async () => null,
    });

    await expect(extractNodeData(instance)).resolves.toMatchObject({
      canonicalName: 'Remote button',
      variantGroups: { Variant: ['Primary'] },
      properties: { Variant: 'Primary' },
    });
  });
});
