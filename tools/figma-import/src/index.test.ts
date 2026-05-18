import { describe, expect, it } from 'vitest';

import { importFigmaFixture, TOOL_NAME } from './index.js';

describe('@designrail/figma-import', () => {
  it('returns a skeleton import result', () => {
    const result = importFigmaFixture({ inputPath: 'examples/figma-input.button.json' });
    expect(result).toEqual({
      tool: TOOL_NAME,
      inputPath: 'examples/figma-input.button.json',
      status: 'skeleton',
    });
  });
});
