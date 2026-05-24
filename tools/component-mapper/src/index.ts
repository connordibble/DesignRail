import {
  buttonComponentMappingFixture,
  componentIntentSchema,
  componentMappingSchema,
  type ComponentIntent,
  type ComponentMapping,
} from '@designrail/shared';

export const TOOL_NAME = '@designrail/component-mapper';

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
