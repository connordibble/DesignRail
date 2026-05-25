import {
  buttonComponentMappingFixture,
  componentIntentSchema,
  componentMappingSchema,
  type ComponentIntent,
  type ComponentMapping,
} from '@designrail/shared';

export const TOOL_NAME = '@designrail/component-mapper';
export const TOOL_VERSION = '0.1.0';

export interface MapComponentInput {
  intent: ComponentIntent;
}

export function mapComponent({ intent }: MapComponentInput): ComponentMapping {
  const parsedIntent = componentIntentSchema.parse(intent);

  return componentMappingSchema.parse({
    ...buttonComponentMappingFixture,
    intentId: parsedIntent.id,
  });
}
