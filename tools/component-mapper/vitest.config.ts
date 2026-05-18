import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'component-mapper',
    include: ['src/**/*.test.ts'],
  },
});
