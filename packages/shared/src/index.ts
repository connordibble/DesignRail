import { z } from 'zod';

export { DESIGNRAIL_GRAPHQL_SCHEMA } from './graphql-schema.js';

export const PACKAGE_NAME = '@designrail/shared';
export const DESIGNRAIL_CONTRACT_VERSION = 'c1';
export const BUTTON_EXAMPLE_ID = 'example.button.primary';
export const INPUT_EXAMPLE_ID = 'example.input.email';
export const CARD_EXAMPLE_ID = 'example.card.basic';

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

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
export const contractVersionSchema = z.literal(DESIGNRAIL_CONTRACT_VERSION);

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
  'UI',
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

/**
 * Shape of a raw mock Figma fixture (`examples/figma-input.*.json`) before normalization.
 * The importer validates against this so malformed mock input fails loudly.
 */
export const mockFigmaFixtureSchema = z.object({
  // Provenance metadata carried in the JSON file; retained but not used during normalization.
  $schema: z.string().optional(),
  version: z.string().optional(),
  exampleId: z.string().min(1),
  intentId: z.string().min(1),
  component: z.string().min(1),
  componentType: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  componentName: z.string().min(1).optional(),
  props: metadataSchema.default({}),
  variants: z.array(z.string().min(1)).default([]),
  states: z.array(z.string().min(1)).default([]),
  tokens: z.array(tokenReferenceSchema).default([]),
  accessibility: accessibilityMetadataSchema.default({ required: false }),
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

export const mappingEditSchema = z.object({
  targetComponent: z.string().min(1).optional(),
  mappedProps: metadataSchema.optional(),
  mappedEvents: metadataSchema.optional(),
  mappedSlots: metadataSchema.optional(),
  mappedTokens: z.array(tokenReferenceSchema).optional(),
  confidence: mappingConfidenceSchema.optional(),
  rationale: z.string().min(1).optional(),
  fallbackNotes: z.string().min(1).optional(),
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

export const reviewDecisionSchema = z
  .object({
    id: z.string().min(1),
    mappingId: z.string().min(1),
    status: reviewDecisionStatusSchema,
    reviewerLabel: z.string().min(1),
    editedMapping: mappingEditSchema.optional(),
    notes: z.string().min(1).optional(),
    createdAt: isoDateTimeSchema,
  })
  .superRefine((decision, context) => {
    if (decision.status === 'EDITED' && decision.editedMapping === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Edited review decisions require editedMapping.',
        path: ['editedMapping'],
      });
    }

    if (decision.status !== 'EDITED' && decision.editedMapping !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Only EDITED review decisions may include editedMapping.',
        path: ['editedMapping'],
      });
    }
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

/** Client UI events use a namespaced `ui.<subject>_<action>` form so the ledger stays scannable. */
export const UI_EVENT_NAME_PATTERN = /^ui\.[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;

export const recordUiEventInputSchema = z.object({
  name: z.string().regex(UI_EVENT_NAME_PATTERN, 'UI event names must match ui.<subject>_<action>'),
  exampleId: z.string().min(1).nullish(),
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

export function createEmptyDashboardMetrics(): DashboardMetrics {
  return {
    acceptedMappings: 0,
    rejectedMappings: 0,
    editedMappings: 0,
    pendingMappings: 0,
    exportsCreated: 0,
    commonComplianceWarnings: [],
  };
}

export const EXPORTABLE_REVIEW_STATUSES = ['ACCEPTED', 'EDITED'] as const;

export function isExportableStatus(status: ReviewDecisionStatus): boolean {
  return (EXPORTABLE_REVIEW_STATUSES as readonly ReviewDecisionStatus[]).includes(status);
}

export const toolModeSchema = z.enum(['MOCK']);

export function toolResultSchema<TOutput extends z.ZodType>(outputSchema: TOutput) {
  return z.object({
    toolName: z.string().min(1),
    toolVersion: z.string().min(1),
    contractVersion: contractVersionSchema.default(DESIGNRAIL_CONTRACT_VERSION),
    mode: toolModeSchema,
    output: outputSchema,
    warnings: z.array(z.string()).default([]),
  });
}

export type Metadata = z.infer<typeof metadataSchema>;
export type ContractVersion = z.infer<typeof contractVersionSchema>;
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
export type MockFigmaFixture = z.infer<typeof mockFigmaFixtureSchema>;
export type ComponentIntent = z.infer<typeof componentIntentSchema>;
export type ComponentMapping = z.infer<typeof componentMappingSchema>;
export type MappingEdit = z.infer<typeof mappingEditSchema>;
export type ComplianceFinding = z.infer<typeof complianceFindingSchema>;
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type ExportResult = z.infer<typeof exportResultSchema>;
export type InstrumentationEvent = z.infer<typeof instrumentationEventSchema>;
export type RecordUiEventInput = z.infer<typeof recordUiEventInputSchema>;
export type DashboardWarning = z.infer<typeof dashboardWarningSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
export type ToolMode = z.infer<typeof toolModeSchema>;
export type ToolResult<TOutput> = {
  toolName: string;
  toolVersion: string;
  contractVersion: ContractVersion;
  mode: ToolMode;
  output: TOutput;
  warnings: string[];
};

export interface CreateToolResultInput<TOutput> {
  toolName: string;
  toolVersion: string;
  output: TOutput;
  warnings?: string[];
}

export interface CliError {
  error: string;
  message: string;
}

export interface CliResponse<TOutput> {
  exitCode: number;
  stdout?: TOutput;
  stderr?: CliError;
}

export interface CliIo {
  stdout: (message: string) => void;
  stderr: (message: string) => void;
}

export function createToolResult<TOutput>({
  toolName,
  toolVersion,
  output,
  warnings = [],
}: CreateToolResultInput<TOutput>): ToolResult<TOutput> {
  return {
    toolName,
    toolVersion,
    contractVersion: DESIGNRAIL_CONTRACT_VERSION,
    mode: 'MOCK',
    output,
    warnings,
  };
}

export function writeJsonCliResponse<TOutput>(
  response: CliResponse<TOutput>,
  io: CliIo = { stdout: console.log, stderr: console.error },
): void {
  if (response.stdout !== undefined) {
    io.stdout(JSON.stringify(response.stdout, null, 2));
  }

  if (response.stderr !== undefined) {
    io.stderr(JSON.stringify(response.stderr, null, 2));
  }
}

export const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const buttonExampleFixture: Example = {
  id: BUTTON_EXAMPLE_ID,
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
  variants: ['primary', 'neutral'],
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
    click: 'click',
    focus: 'sl-focus',
    blur: 'sl-blur',
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
    'Design intent maps to Shoelace sl-button: variant=primary, size=medium, disabled=false. Default slot text "Save changes".',
  fallbackNotes:
    'All design intent resolved cleanly; adjust Shoelace token aliases if brand values diverge.',
  createdAt: FIXTURE_TIMESTAMP,
};

export const buttonComplianceFindingsFixture: ComplianceFinding[] = [
  {
    id: 'finding.button.primary.accessibility',
    mappingId: buttonComponentMappingFixture.id,
    category: 'ACCESSIBILITY',
    severity: 'INFO',
    message: 'Accessible name resolved from design intent ("Save changes").',
    remediation: 'Keep the accessible name in sync with the Shoelace label or default slot.',
    path: 'accessibility.label',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'finding.button.primary.documentation-readiness',
    mappingId: buttonComponentMappingFixture.id,
    category: 'DOCUMENTATION_READINESS',
    severity: 'INFO',
    message: 'Documentation will use the component summary; no extended description provided.',
    remediation: 'Add an accessibility description to enrich generated documentation.',
    path: 'summary',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'finding.button.primary.react-readiness',
    mappingId: buttonComponentMappingFixture.id,
    category: 'REACT_READINESS',
    severity: 'INFO',
    message: 'Shoelace sl-button events are ready for React binding.',
    remediation: 'Bind custom Shoelace events with their React handler names when exporting.',
    path: 'mappedEvents',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
];

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
  content: '<sl-button variant="primary" size="medium">Save changes</sl-button>',
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

export const inputExampleFixture: Example = {
  id: INPUT_EXAMPLE_ID,
  name: 'Input',
  componentType: 'Input',
  fixturePath: 'examples/figma-input.input.json',
  source: 'MOCK',
  status: 'READY',
};

export const inputComponentIntentFixture: ComponentIntent = {
  id: 'intent.input.email',
  exampleId: inputExampleFixture.id,
  source: 'MOCK',
  sourceRefs: [
    {
      type: 'MOCK_FILE',
      id: inputExampleFixture.fixturePath,
      name: 'Email Field',
    },
  ],
  componentName: 'Input',
  componentType: 'Input',
  summary: 'An email text field with label, placeholder, and required validation intent.',
  props: {
    label: 'Email address',
    placeholder: 'you@example.com',
    type: 'email',
    size: 'medium',
    required: true,
  },
  variants: [],
  states: ['default', 'focus', 'disabled', 'invalid'],
  tokenRefs: [
    {
      name: 'color.border.input',
      value: '#cbd5e1',
      target: '--sl-input-border-color',
    },
    {
      name: 'spacing.input.gap',
      value: '8px',
    },
  ],
  accessibility: {
    label: 'Email address',
    role: 'textbox',
    required: true,
  },
  createdAt: FIXTURE_TIMESTAMP,
};

export const inputComponentMappingFixture: ComponentMapping = {
  id: 'mapping.input.email.shoelace',
  intentId: inputComponentIntentFixture.id,
  targetLibrary: 'SHOELACE',
  targetComponent: 'sl-input',
  mappedProps: {
    type: 'email',
    size: 'medium',
    label: 'Email address',
    placeholder: 'you@example.com',
    disabled: false,
    required: true,
  },
  mappedEvents: {
    input: 'sl-input',
    change: 'sl-change',
    focus: 'sl-focus',
    blur: 'sl-blur',
  },
  mappedSlots: {},
  mappedTokens: [
    {
      name: 'color.border.input',
      target: '--sl-input-border-color',
    },
  ],
  confidence: 'MEDIUM',
  rationale:
    'Design intent maps to Shoelace sl-input: type=email, size=medium, label=Email address, placeholder=you@example.com, disabled=false, required=true.',
  fallbackNotes:
    'Unmapped design tokens without a Shoelace target: spacing.input.gap. Alias them before relying on themed values.',
  createdAt: FIXTURE_TIMESTAMP,
};

export const inputComplianceFindingsFixture: ComplianceFinding[] = [
  {
    id: 'finding.input.email.accessibility',
    mappingId: inputComponentMappingFixture.id,
    category: 'ACCESSIBILITY',
    severity: 'INFO',
    message: 'Accessible name resolved from design intent ("Email address").',
    remediation: 'Keep the accessible name in sync with the Shoelace label or default slot.',
    path: 'accessibility.label',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'finding.input.email.token-usage',
    mappingId: inputComponentMappingFixture.id,
    category: 'TOKEN_USAGE',
    severity: 'WARNING',
    message: 'Design tokens without a Shoelace target: spacing.input.gap.',
    remediation:
      'Map each design token to a Shoelace CSS custom property (--sl-*) before relying on it.',
    path: 'tokenRefs',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'finding.input.email.documentation-readiness',
    mappingId: inputComponentMappingFixture.id,
    category: 'DOCUMENTATION_READINESS',
    severity: 'INFO',
    message: 'Documentation will use the component summary; no extended description provided.',
    remediation: 'Add an accessibility description to enrich generated documentation.',
    path: 'summary',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'finding.input.email.react-readiness',
    mappingId: inputComponentMappingFixture.id,
    category: 'REACT_READINESS',
    severity: 'INFO',
    message: 'Shoelace sl-input events are ready for React binding.',
    remediation: 'Bind custom Shoelace events with their React handler names when exporting.',
    path: 'mappedEvents',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
];

export const cardExampleFixture: Example = {
  id: CARD_EXAMPLE_ID,
  name: 'Card',
  componentType: 'Card',
  fixturePath: 'examples/figma-input.card.json',
  source: 'MOCK',
  status: 'READY',
};

export const cardComponentIntentFixture: ComponentIntent = {
  id: 'intent.card.basic',
  exampleId: cardExampleFixture.id,
  source: 'MOCK',
  sourceRefs: [
    {
      type: 'MOCK_FILE',
      id: cardExampleFixture.fixturePath,
      name: 'Product Card',
    },
  ],
  componentName: 'Card',
  componentType: 'Card',
  summary: 'A content card presenting a short product blurb.',
  props: {
    content: 'Wireless headphones with 30-hour battery life.',
  },
  variants: [],
  states: ['default'],
  tokenRefs: [
    {
      name: 'radius.card',
      value: '12px',
      target: '--border-radius',
    },
  ],
  accessibility: {
    role: 'group',
    required: false,
  },
  createdAt: FIXTURE_TIMESTAMP,
};

export const cardComponentMappingFixture: ComponentMapping = {
  id: 'mapping.card.basic.shoelace',
  intentId: cardComponentIntentFixture.id,
  targetLibrary: 'SHOELACE',
  targetComponent: 'sl-card',
  mappedProps: {},
  mappedEvents: {},
  mappedSlots: {
    default: 'Wireless headphones with 30-hour battery life.',
  },
  mappedTokens: [
    {
      name: 'radius.card',
      target: '--border-radius',
    },
  ],
  confidence: 'HIGH',
  rationale:
    'Design intent maps to Shoelace sl-card: no props. Default slot text "Wireless headphones with 30-hour battery life.".',
  fallbackNotes:
    'All design intent resolved cleanly; adjust Shoelace token aliases if brand values diverge.',
  createdAt: FIXTURE_TIMESTAMP,
};

export const cardComplianceFindingsFixture: ComplianceFinding[] = [
  {
    id: 'finding.card.basic.accessibility',
    mappingId: cardComponentMappingFixture.id,
    category: 'ACCESSIBILITY',
    severity: 'INFO',
    message: 'Container component; no accessible name required.',
    remediation: 'Ensure any interactive children inside the container are individually labelled.',
    path: 'accessibility',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'finding.card.basic.documentation-readiness',
    mappingId: cardComponentMappingFixture.id,
    category: 'DOCUMENTATION_READINESS',
    severity: 'INFO',
    message: 'Documentation will use the component summary; no extended description provided.',
    remediation: 'Add an accessibility description to enrich generated documentation.',
    path: 'summary',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'finding.card.basic.react-readiness',
    mappingId: cardComponentMappingFixture.id,
    category: 'REACT_READINESS',
    severity: 'INFO',
    message: 'Shoelace sl-card has no custom events to bind.',
    remediation: 'No custom events to wire; review interactive children separately.',
    path: 'mappedEvents',
    blocking: false,
    createdAt: FIXTURE_TIMESTAMP,
  },
];

/** Bundled, pipeline-verified seed data for one reviewable example. */
export interface SeedExample {
  example: Example;
  intent: ComponentIntent;
  mapping: ComponentMapping;
  findings: ComplianceFinding[];
}

/**
 * Canonical seed set. Each entry is the deterministic pipeline output for its fixture;
 * the import/mapping/compliance tools are tested to reproduce these exact values.
 */
export const EXAMPLE_REGISTRY: SeedExample[] = [
  {
    example: buttonExampleFixture,
    intent: buttonComponentIntentFixture,
    mapping: buttonComponentMappingFixture,
    findings: buttonComplianceFindingsFixture,
  },
  {
    example: inputExampleFixture,
    intent: inputComponentIntentFixture,
    mapping: inputComponentMappingFixture,
    findings: inputComplianceFindingsFixture,
  },
  {
    example: cardExampleFixture,
    intent: cardComponentIntentFixture,
    mapping: cardComponentMappingFixture,
    findings: cardComplianceFindingsFixture,
  },
];
