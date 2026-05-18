import { describe, expect, it } from 'vitest';

import { reviewCompliance, TOOL_NAME } from './index.js';

describe('@designrail/compliance-agent', () => {
  it('returns a skeleton compliance result', () => {
    expect(
      reviewCompliance({ intent: { component: 'button' }, mapping: { target: 'sl-button' } }),
    ).toEqual({
      tool: TOOL_NAME,
      status: 'skeleton',
      findings: [],
    });
  });
});
