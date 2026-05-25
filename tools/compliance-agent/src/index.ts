import {
  buttonComplianceFindingFixture,
  componentIntentSchema,
  componentMappingSchema,
  complianceFindingSchema,
  type ComponentIntent,
  type ComponentMapping,
  type ComplianceFinding,
} from '@designrail/shared';

export const TOOL_NAME = '@designrail/compliance-agent';
export const TOOL_VERSION = '0.1.0';

export interface ReviewComplianceInput {
  intent: ComponentIntent;
  mapping: ComponentMapping;
}

export function reviewCompliance({ intent, mapping }: ReviewComplianceInput): ComplianceFinding[] {
  componentIntentSchema.parse(intent);
  const parsedMapping = componentMappingSchema.parse(mapping);

  return [
    complianceFindingSchema.parse({
      ...buttonComplianceFindingFixture,
      mappingId: parsedMapping.id,
    }),
  ];
}
