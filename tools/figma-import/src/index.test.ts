import { componentIntentSchema, toolResultSchema } from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { createFigmaImportCliResponse } from './cli.js';

import { importFigmaFixture } from './index.js';

describe('@designrail/figma-import', () => {
  it('returns a valid skeletal component intent', () => {
    const result = importFigmaFixture({ inputPath: 'examples/figma-input.button.json' });

    expect(componentIntentSchema.parse(result)).toMatchObject({
      componentType: 'Button',
      source: 'MOCK',
    });
  });

  it('returns JSON-safe CLI output for a fixture path', () => {
    const response = createFigmaImportCliResponse(['examples/figma-input.button.json']);

    expect(response.exitCode).toBe(0);
    expect(() => JSON.stringify(response.stdout)).not.toThrow();
    expect(toolResultSchema(componentIntentSchema).parse(response.stdout)).toMatchObject({
      toolName: '@designrail/figma-import',
      output: {
        componentType: 'Button',
      },
    });
    expect(componentIntentSchema.parse(response.stdout?.output)).toMatchObject({
      componentType: 'Button',
    });
  });

  it('returns a JSON-safe usage error when input is missing', () => {
    const response = createFigmaImportCliResponse([]);

    expect(response).toEqual({
      exitCode: 2,
      stderr: {
        error: 'USAGE',
        message: 'Usage: figma-import <path-to-fixture.json>',
      },
    });
    expect(() => JSON.stringify(response.stderr)).not.toThrow();
  });
});
