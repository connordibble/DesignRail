import { describe, expect, it } from 'vitest';

import { reviewCompliance, TOOL_NAME } from './index.js';

describe('@designrail/compliance-agent', () => {
  it('returns a skeleton compliance result', () => {
    expect(reviewCompliance()).toEqual({
      tool: TOOL_NAME,
      status: 'skeleton',
      findings: [],
    });
  });
});
