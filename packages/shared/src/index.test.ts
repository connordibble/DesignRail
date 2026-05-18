import { describe, expect, it } from 'vitest';

import { PACKAGE_NAME } from './index.js';

describe('@designrail/shared', () => {
  it('exports a package marker', () => {
    expect(PACKAGE_NAME).toBe('@designrail/shared');
  });
});
