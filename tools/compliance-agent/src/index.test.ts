import {
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  complianceFindingSchema,
} from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { createComplianceAgentCliResponse } from './cli.js';

import { reviewCompliance } from './index.js';

describe('@designrail/compliance-agent', () => {
  it('returns valid structured compliance findings', () => {
    const result = reviewCompliance({
      intent: buttonComponentIntentFixture,
      mapping: buttonComponentMappingFixture,
    });

    expect(result.map((finding) => complianceFindingSchema.parse(finding))).toHaveLength(1);
  });

  it('returns JSON-safe CLI output with default mock inputs', () => {
    const response = createComplianceAgentCliResponse([]);

    expect(response.exitCode).toBe(0);
    expect(() => JSON.stringify(response.stdout)).not.toThrow();
    expect(response.stdout?.map((finding) => complianceFindingSchema.parse(finding))).toHaveLength(
      1,
    );
  });

  it('returns a JSON-safe usage error for partial input', () => {
    const response = createComplianceAgentCliResponse(['intent.json']);

    expect(response).toEqual({
      exitCode: 2,
      stderr: {
        error: 'USAGE',
        message: 'Usage: compliance-agent [path-to-intent.json path-to-mapping.json]',
      },
    });
    expect(() => JSON.stringify(response.stderr)).not.toThrow();
  });
});
