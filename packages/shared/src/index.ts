import { z } from 'zod';

export const PACKAGE_NAME = '@designrail/shared';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const metadataSchema = z.record(z.string(), jsonValueSchema);

export const isoDateTimeSchema = z.string().datetime();

export const componentSourceSchema = z.enum(['MOCK', 'FIGMA']);
export const exampleStatusSchema = z.enum(['READY', 'DISABLED']);
export const targetLibrarySchema = z.enum(['SHOELACE']);
export const mappingConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export const complianceCategorySchema = z.enum([
  'ACCESSIBILITY',
  'TOKEN_USAGE',
  'VARIANT_COVERAGE',
  'REACT_READINESS',
  'DOCUMENTATION_READINESS',
  'DESIGN_SYSTEM_ALIGNMENT',
]);
export const complianceSeveritySchema = z.enum(['BLOCKER', 'WARNING', 'INFO']);
export const reviewDecisionStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EDITED']);
export const exportFormatSchema = z.enum(['HTML', 'REACT', 'AGENT_BRIEF']);
export const instrumentationEntityTypeSchema = z.enum([
  'EXAMPLE',
  'COMPONENT_INTENT',
  'COMPONENT_MAPPING',
  'REVIEW_DECISION',
  'EXPORT',
]);

export const sourceReferenceSchema = z.object({
  type: z.enum(['MOCK_FILE', 'FIGMA_NODE']),
  id: z.string().min(1),
  name: z.string().min(1).optional(),
});

export const tokenReferenceSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1).optional(),
  target: z.string().min(1).optional(),
});

export const accessibilityMetadataSchema = z.object({
  label: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  required: z.boolean().default(false),
});

export const exampleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  componentType: z.string().min(1),
  fixturePath: z.string().min(1),
  source: componentSourceSchema,
  status: exampleStatusSchema,
});

export const componentIntentSchema = z.object({
  id: z.string().min(1),
  exampleId: z.string().min(1),
  source: componentSourceSchema,
  sourceRefs: z.array(sourceReferenceSchema).min(1),
  componentName: z.string().min(1),
  componentType: z.string().min(1),
  summary: z.string().min(1),
  props: metadataSchema.default({}),
  variants: z.array(z.string().min(1)).default([]),
  states: z.array(z.string().min(1)).default([]),
  tokenRefs: z.array(tokenReferenceSchema).default([]),
  accessibility: accessibilityMetadataSchema.default({ required: false }),
  createdAt: isoDateTimeSchema,
});

export const componentMappingSchema = z.object({
  id: z.string().min(1),
  intentId: z.string().min(1),
  targetLibrary: targetLibrarySchema,
  targetComponent: z.string().min(1),
  mappedProps: metadataSchema.default({}),
  mappedEvents: metadataSchema.default({}),
  mappedSlots: metadataSchema.default({}),
  mappedTokens: z.array(tokenReferenceSchema).default([]),
  confidence: mappingConfidenceSchema,
  rationale: z.string().min(1),
  fallbackNotes: z.string().min(1).optional(),
  createdAt: isoDateTimeSchema,
});

export const complianceFindingSchema = z.object({
  id: z.string().min(1),
  mappingId: z.string().min(1),
  category: complianceCategorySchema,
  severity: complianceSeveritySchema,
  message: z.string().min(1),
  remediation: z.string().min(1),
  path: z.string().min(1).optional(),
  blocking: z.boolean(),
  createdAt: isoDateTimeSchema,
});

export const reviewDecisionSchema = z.object({
  id: z.string().min(1),
  mappingId: z.string().min(1),
  status: reviewDecisionStatusSchema,
  reviewerLabel: z.string().min(1),
  editedMapping: metadataSchema.optional(),
  notes: z.string().min(1).optional(),
  createdAt: isoDateTimeSchema,
});

export const exportResultSchema = z.object({
  id: z.string().min(1),
  mappingId: z.string().min(1),
  format: exportFormatSchema,
  content: z.string().min(1),
  createdAt: isoDateTimeSchema,
});

export const instrumentationEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  entityType: instrumentationEntityTypeSchema,
  entityId: z.string().min(1),
  timestamp: isoDateTimeSchema,
  metadata: metadataSchema.default({}),
});

export const dashboardWarningSchema = z.object({
  message: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export const dashboardMetricsSchema = z.object({
  acceptedMappings: z.number().int().nonnegative(),
  rejectedMappings: z.number().int().nonnegative(),
  editedMappings: z.number().int().nonnegative(),
  pendingMappings: z.number().int().nonnegative(),
  exportsCreated: z.number().int().nonnegative(),
  commonComplianceWarnings: z.array(dashboardWarningSchema),
});

export type Metadata = z.infer<typeof metadataSchema>;
export type ComponentSource = z.infer<typeof componentSourceSchema>;
export type ExampleStatus = z.infer<typeof exampleStatusSchema>;
export type TargetLibrary = z.infer<typeof targetLibrarySchema>;
export type MappingConfidence = z.infer<typeof mappingConfidenceSchema>;
export type ComplianceCategory = z.infer<typeof complianceCategorySchema>;
export type ComplianceSeverity = z.infer<typeof complianceSeveritySchema>;
export type ReviewDecisionStatus = z.infer<typeof reviewDecisionStatusSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type InstrumentationEntityType = z.infer<typeof instrumentationEntityTypeSchema>;
export type SourceReference = z.infer<typeof sourceReferenceSchema>;
export type TokenReference = z.infer<typeof tokenReferenceSchema>;
export type AccessibilityMetadata = z.infer<typeof accessibilityMetadataSchema>;
export type Example = z.infer<typeof exampleSchema>;
export type ComponentIntent = z.infer<typeof componentIntentSchema>;
export type ComponentMapping = z.infer<typeof componentMappingSchema>;
export type ComplianceFinding = z.infer<typeof complianceFindingSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type ExportResult = z.infer<typeof exportResultSchema>;
export type InstrumentationEvent = z.infer<typeof instrumentationEventSchema>;
export type DashboardWarning = z.infer<typeof dashboardWarningSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

export const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const buttonExampleFixture: Example = {
  id: 'example.button.primary',
  name: 'Button',
  componentType: 'Button',
  fixturePath: 'examples/figma-input.button.json',
  source: 'MOCK',
  status: 'READY',
};

export const buttonComponentIntentFixture: ComponentIntent = {
  id: 'intent.button.primary',
  exampleId: buttonExampleFixture.id,
  source: 'MOCK',
  sourceRefs: [
    {
      type: 'MOCK_FILE',
      id: buttonExampleFixture.fixturePath,
      name: 'Primary Button',
    },
  ],
  componentName: 'Button',
  componentType: 'Button',
  summary: 'A primary action button with size and disabled state intent.',
  props: {
    label: 'Save changes',
    size: 'medium',
    appearance: 'primary',
  },
  variants: ['primary', 'secondary'],
  states: ['default', 'hover', 'focus', 'disabled'],
  tokenRefs: [
    {
      name: 'color.action.primary',
      value: '#2563eb',
      target: '--sl-color-primary-600',
    },
  ],
  accessibility: {
    label: 'Save changes',
    role: 'button',
    required: false,
  },
  createdAt: FIXTURE_TIMESTAMP,
};

export const buttonComponentMappingFixture: ComponentMapping = {
  id: 'mapping.button.primary.shoelace',
  intentId: buttonComponentIntentFixture.id,
  targetLibrary: 'SHOELACE',
  targetComponent: 'sl-button',
  mappedProps: {
    variant: 'primary',
    size: 'medium',
    disabled: false,
  },
  mappedEvents: {
    click: 'sl-click',
  },
  mappedSlots: {
    default: 'Save changes',
  },
  mappedTokens: [
    {
      name: 'color.action.primary',
      target: '--sl-color-primary-600',
    },
  ],
  confidence: 'HIGH',
  rationale:
    'The design intent maps directly to Shoelace button variant, size, disabled prop, and default slot.',
  fallbackNotes:
    'If brand color tokens diverge, keep the component mapping and adjust the token alias.',
  createdAt: FIXTURE_TIMESTAMP,
};

export const buttonComplianceFindingFixture: ComplianceFinding = {
  id: 'finding.button.primary.react-readiness',
  mappingId: buttonComponentMappingFixture.id,
  category: 'REACT_READINESS',
  severity: 'INFO',
  message: 'Shoelace button usage is ready for React event binding.',
  remediation: 'Wrap custom events intentionally when exporting React examples.',
  path: 'mappedEvents.click',
  blocking: false,
  createdAt: FIXTURE_TIMESTAMP,
};

export const pendingReviewDecisionFixture: ReviewDecision = {
  id: 'decision.button.primary.pending',
  mappingId: buttonComponentMappingFixture.id,
  status: 'PENDING',
  reviewerLabel: 'Local reviewer',
  notes: 'Awaiting human review.',
  createdAt: FIXTURE_TIMESTAMP,
};

export const htmlExportFixture: ExportResult = {
  id: 'export.button.primary.html',
  mappingId: buttonComponentMappingFixture.id,
  format: 'HTML',
  content: '<sl-button variant="primary">Save changes</sl-button>',
  createdAt: FIXTURE_TIMESTAMP,
};

export const reviewSavedEventFixture: InstrumentationEvent = {
  id: 'event.review-decision.saved',
  name: 'review_decision.saved',
  entityType: 'REVIEW_DECISION',
  entityId: pendingReviewDecisionFixture.id,
  timestamp: FIXTURE_TIMESTAMP,
  metadata: {
    status: pendingReviewDecisionFixture.status,
    mappingId: pendingReviewDecisionFixture.mappingId,
  },
};
