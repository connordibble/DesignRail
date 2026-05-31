import { describe, expect, it } from 'vitest';

import {
  BUTTON_EXAMPLE_ID,
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  buttonComplianceFindingFixture,
  buttonExampleFixture,
  componentIntentSchema,
  componentMappingSchema,
  createEmptyDashboardMetrics,
  createToolResult,
  complianceFindingSchema,
  exampleSchema,
  exportResultSchema,
  htmlExportFixture,
  instrumentationEventSchema,
  isExportableStatus,
  jsonValueSchema,
  mappingEditSchema,
  PACKAGE_NAME,
  pendingReviewDecisionFixture,
  reviewDecisionSchema,
  reviewSavedEventFixture,
  toolResultSchema,
} from './index.js';

describe('@designrail/shared contracts', () => {
  it('exports a package marker', () => {
    expect(PACKAGE_NAME).toBe('@designrail/shared');
  });

  it('exports shared review defaults', () => {
    expect(buttonExampleFixture.id).toBe(BUTTON_EXAMPLE_ID);
    expect(createEmptyDashboardMetrics()).toEqual({
      acceptedMappings: 0,
      rejectedMappings: 0,
      editedMappings: 0,
      pendingMappings: 0,
      exportsCreated: 0,
      commonComplianceWarnings: [],
    });
  });

  it('gates exports to accepted and edited decisions', () => {
    expect(isExportableStatus('ACCEPTED')).toBe(true);
    expect(isExportableStatus('EDITED')).toBe(true);
    expect(isExportableStatus('PENDING')).toBe(false);
    expect(isExportableStatus('REJECTED')).toBe(false);
  });

  it('parses the fixture-safe C1 domain examples', () => {
    expect(exampleSchema.parse(buttonExampleFixture)).toEqual(buttonExampleFixture);
    expect(componentIntentSchema.parse(buttonComponentIntentFixture)).toEqual(
      buttonComponentIntentFixture,
    );
    expect(componentMappingSchema.parse(buttonComponentMappingFixture)).toEqual(
      buttonComponentMappingFixture,
    );
    expect(complianceFindingSchema.parse(buttonComplianceFindingFixture)).toEqual(
      buttonComplianceFindingFixture,
    );
    expect(reviewDecisionSchema.parse(pendingReviewDecisionFixture)).toEqual(
      pendingReviewDecisionFixture,
    );
    expect(exportResultSchema.parse(htmlExportFixture)).toEqual(htmlExportFixture);
    expect(instrumentationEventSchema.parse(reviewSavedEventFixture)).toEqual(
      reviewSavedEventFixture,
    );
  });

  it('accepts nested JSON metadata values', () => {
    expect(
      jsonValueSchema.parse({
        text: 'Button',
        count: 1,
        enabled: true,
        nested: ['primary', null, { token: '--sl-color-primary-600' }],
      }),
    ).toEqual({
      text: 'Button',
      count: 1,
      enabled: true,
      nested: ['primary', null, { token: '--sl-color-primary-600' }],
    });
  });

  it('rejects invalid domain values', () => {
    expect(() =>
      exampleSchema.parse({ ...buttonExampleFixture, source: 'PRIVATE_FIGMA' }),
    ).toThrow();
    expect(() =>
      reviewDecisionSchema.parse({
        ...pendingReviewDecisionFixture,
        status: 'AUTO_ACCEPTED',
      }),
    ).toThrow();
    expect(() => exportResultSchema.parse({ ...htmlExportFixture, format: 'MARKDOWN' })).toThrow();
    expect(() =>
      reviewDecisionSchema.parse({
        ...pendingReviewDecisionFixture,
        editedMapping: {
          mappedSlots: {
            default: undefined,
          },
        },
      }),
    ).toThrow();
    expect(() =>
      reviewDecisionSchema.parse({
        ...pendingReviewDecisionFixture,
        status: 'EDITED',
      }),
    ).toThrow();
    expect(() =>
      reviewDecisionSchema.parse({
        ...pendingReviewDecisionFixture,
        editedMapping: {
          mappedSlots: {
            default: 'Confirm',
          },
        },
      }),
    ).toThrow();
  });

  it('requires source references for normalized component intent', () => {
    expect(() =>
      componentIntentSchema.parse({
        ...buttonComponentIntentFixture,
        sourceRefs: [],
      }),
    ).toThrow();
  });

  it('parses typed mapping edits and tool result envelopes', () => {
    expect(
      mappingEditSchema.parse({
        mappedSlots: {
          default: 'Confirm',
        },
      }),
    ).toEqual({
      mappedSlots: {
        default: 'Confirm',
      },
    });

    expect(
      toolResultSchema(componentIntentSchema).parse({
        toolName: '@designrail/figma-import',
        toolVersion: '0.1.0',
        mode: 'MOCK',
        output: buttonComponentIntentFixture,
      }),
    ).toMatchObject({
      contractVersion: 'c1',
      warnings: [],
      output: {
        componentType: 'Button',
      },
    });

    expect(
      createToolResult({
        toolName: '@designrail/figma-import',
        toolVersion: '0.1.0',
        output: buttonComponentIntentFixture,
      }),
    ).toMatchObject({
      contractVersion: 'c1',
      mode: 'MOCK',
      warnings: [],
    });
  });
});
