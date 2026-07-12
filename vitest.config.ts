import { defineConfig } from 'vitest/config';

// Vitest 4 replaced the standalone workspace file (defineWorkspace) with the
// `projects` field on a root config. Each workspace package supplies its own
// vitest.config.ts / defineProject.
export default defineConfig({
  test: {
    projects: ['apps/*', 'packages/*', 'tools/*'],
  },
});
