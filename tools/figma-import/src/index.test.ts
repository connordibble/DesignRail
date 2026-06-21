import {
  buttonComponentIntentFixture,
  cardComponentIntentFixture,
  componentIntentSchema,
  inputComponentIntentFixture,
  toolResultSchema,
} from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { createFigmaImportCliResponse } from './cli.js';

import { importFigmaFixture, normalizeComponentIntent } from './index.js';

describe('@designrail/figma-import', () => {
  it('normalizes the Button fixture into the canonical component intent', () => {
    const result = importFigmaFixture({ inputPath: 'examples/figma-input.button.json' });

    expect(result).toEqual(buttonComponentIntentFixture);
  });

  it('normalizes the Input fixture into the canonical component intent', () => {
    const result = importFigmaFixture({ inputPath: 'examples/figma-input.input.json' });

    expect(result).toEqual(inputComponentIntentFixture);
  });

  it('normalizes the Card fixture into the canonical component intent', () => {
    const result = importFigmaFixture({ inputPath: 'examples/figma-input.card.json' });

    expect(result).toEqual(cardComponentIntentFixture);
  });

  it('rejects malformed mock fixtures before producing intent', () => {
    expect(() =>
      normalizeComponentIntent({ component: 'button' }, { sourcePath: 'x.json' }),
    ).toThrow();
  });

  it('returns JSON-safe CLI output for a fixture path', () => {
    const response = createFigmaImportCliResponse(['examples/figma-input.input.json']);

    expect(response.exitCode).toBe(0);
    expect(() => JSON.stringify(response.stdout)).not.toThrow();
    expect(toolResultSchema(componentIntentSchema).parse(response.stdout)).toMatchObject({
      toolName: '@designrail/figma-import',
      output: {
        componentType: 'Input',
      },
    });
    expect(componentIntentSchema.parse(response.stdout?.output)).toMatchObject({
      componentType: 'Input',
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
