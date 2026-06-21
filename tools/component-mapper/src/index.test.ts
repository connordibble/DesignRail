import {
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  cardComponentIntentFixture,
  cardComponentMappingFixture,
  componentMappingSchema,
  inputComponentIntentFixture,
  inputComponentMappingFixture,
  toolResultSchema,
} from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { createComponentMapperCliResponse } from './cli.js';

import { mapComponent } from './index.js';

describe('@designrail/component-mapper', () => {
  it('derives the canonical Shoelace mapping for the Button intent', () => {
    expect(mapComponent({ intent: buttonComponentIntentFixture })).toEqual(
      buttonComponentMappingFixture,
    );
  });

  it('derives the canonical Shoelace mapping for the Input intent', () => {
    expect(mapComponent({ intent: inputComponentIntentFixture })).toEqual(
      inputComponentMappingFixture,
    );
  });

  it('derives the canonical Shoelace mapping for the Card intent (no props, container slot)', () => {
    expect(mapComponent({ intent: cardComponentIntentFixture })).toEqual(
      cardComponentMappingFixture,
    );
  });

  it('lowers confidence and notes gaps when design tokens lack a Shoelace target', () => {
    const mapping = mapComponent({ intent: inputComponentIntentFixture });

    expect(mapping.confidence).toBe('MEDIUM');
    expect(mapping.fallbackNotes).toContain('spacing.input.gap');
  });

  it('throws for component types without a registered schema', () => {
    expect(() =>
      mapComponent({ intent: { ...buttonComponentIntentFixture, componentType: 'Carousel' } }),
    ).toThrow(/No Shoelace schema/);
  });

  it('returns JSON-safe CLI output with the default mock intent', () => {
    const response = createComponentMapperCliResponse([]);

    expect(response.exitCode).toBe(0);
    expect(() => JSON.stringify(response.stdout)).not.toThrow();
    expect(toolResultSchema(componentMappingSchema).parse(response.stdout)).toMatchObject({
      toolName: '@designrail/component-mapper',
      output: {
        targetComponent: 'sl-button',
      },
    });
    expect(componentMappingSchema.parse(response.stdout?.output)).toMatchObject({
      targetComponent: 'sl-button',
    });
  });

  it('returns a JSON-safe usage error for too many arguments', () => {
    const response = createComponentMapperCliResponse(['one.json', 'two.json']);

    expect(response).toEqual({
      exitCode: 2,
      stderr: {
        error: 'USAGE',
        message: 'Usage: component-mapper [path-to-component-intent.json]',
      },
    });
    expect(() => JSON.stringify(response.stderr)).not.toThrow();
  });
});
