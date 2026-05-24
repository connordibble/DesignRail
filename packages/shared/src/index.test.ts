import { describe, expect, it } from 'vitest';

import {
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  buttonComplianceFindingFixture,
  buttonExampleFixture,
  componentIntentSchema,
  componentMappingSchema,
  complianceFindingSchema,
  exampleSchema,
  exportResultSchema,
  htmlExportFixture,
  instrumentationEventSchema,
  jsonValueSchema,
  PACKAGE_NAME,
  pendingReviewDecisionFixture,
  reviewDecisionSchema,
  reviewSavedEventFixture,
} from './index.js';

describe('@designrail/shared contracts', () => {
  it('exports a package marker', () => {
    expect(PACKAGE_NAME).toBe('@designrail/shared');
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
  });

  it('requires source references for normalized component intent', () => {
    expect(() =>
      componentIntentSchema.parse({
        ...buttonComponentIntentFixture,
        sourceRefs: [],
      }),
    ).toThrow();
  });
});
