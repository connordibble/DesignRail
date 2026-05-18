import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'figma-import',
    include: ['src/**/*.test.ts'],
  },
});
