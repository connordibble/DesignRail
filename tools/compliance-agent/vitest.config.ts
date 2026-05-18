import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'compliance-agent',
    include: ['src/**/*.test.ts'],
  },
});
