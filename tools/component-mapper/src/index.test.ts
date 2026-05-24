import { buttonComponentIntentFixture, componentMappingSchema } from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { createComponentMapperCliResponse } from './cli.js';

import { mapComponent } from './index.js';

describe('@designrail/component-mapper', () => {
  it('maps component intent to a valid skeletal Shoelace mapping', () => {
    const result = mapComponent({ intent: buttonComponentIntentFixture });

    expect(componentMappingSchema.parse(result)).toMatchObject({
      intentId: buttonComponentIntentFixture.id,
      targetLibrary: 'SHOELACE',
      targetComponent: 'sl-button',
    });
  });

  it('returns JSON-safe CLI output with the default mock intent', () => {
    const response = createComponentMapperCliResponse([]);

    expect(response.exitCode).toBe(0);
    expect(() => JSON.stringify(response.stdout)).not.toThrow();
    expect(componentMappingSchema.parse(response.stdout)).toMatchObject({
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
