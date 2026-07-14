import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'figma-plugin',
    include: ['src/**/*.test.ts'],
  },
});
