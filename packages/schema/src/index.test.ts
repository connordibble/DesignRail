import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index.js';

describe('@designrail/schema', () => {
  it('exports a package marker', () => {
    expect(PACKAGE_NAME).toBe('@designrail/schema');
  });
});
