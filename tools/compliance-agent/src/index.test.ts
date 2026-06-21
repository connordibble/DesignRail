import {
  buttonComplianceFindingsFixture,
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  complianceFindingSchema,
  inputComplianceFindingsFixture,
  inputComponentIntentFixture,
  inputComponentMappingFixture,
  toolResultSchema,
} from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { createComplianceAgentCliResponse } from './cli.js';

import { reviewCompliance } from './index.js';

describe('@designrail/compliance-agent', () => {
  it('reproduces the canonical Button findings', () => {
    const result = reviewCompliance({
      intent: buttonComponentIntentFixture,
      mapping: buttonComponentMappingFixture,
    });

    expect(result).toEqual(buttonComplianceFindingsFixture);
  });

  it('reproduces the canonical Input findings, including the token warning', () => {
    const result = reviewCompliance({
      intent: inputComponentIntentFixture,
      mapping: inputComponentMappingFixture,
    });

    expect(result).toEqual(inputComplianceFindingsFixture);
    expect(result.some((found) => found.severity === 'WARNING')).toBe(true);
  });

  it('raises a blocking accessibility finding when no accessible name is present', () => {
    const result = reviewCompliance({
      intent: {
        ...buttonComponentIntentFixture,
        accessibility: { required: false },
      },
      mapping: buttonComponentMappingFixture,
    });

    const accessibility = result.find((found) => found.category === 'ACCESSIBILITY');

    expect(accessibility?.severity).toBe('BLOCKER');
    expect(accessibility?.blocking).toBe(true);
  });

  it('returns JSON-safe CLI output with default mock inputs', () => {
    const response = createComplianceAgentCliResponse([]);

    expect(response.exitCode).toBe(0);
    expect(() => JSON.stringify(response.stdout)).not.toThrow();
    const parsed = toolResultSchema(complianceFindingSchema.array()).parse(response.stdout);
    expect(parsed.toolName).toBe('@designrail/compliance-agent');
    expect(parsed.output).toEqual(buttonComplianceFindingsFixture);
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
