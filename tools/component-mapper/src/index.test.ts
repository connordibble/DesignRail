import { describe, expect, it } from 'vitest';

import { mapComponent, TOOL_NAME } from './index.js';

describe('@designrail/component-mapper', () => {
  it('returns a skeleton mapping result', () => {
    expect(mapComponent({ intent: { component: 'button' } })).toEqual({
      tool: TOOL_NAME,
      status: 'skeleton',
    });
  });
});
