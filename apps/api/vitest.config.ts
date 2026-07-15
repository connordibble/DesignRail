import { defineProject } from 'vitest/config';

export default defineProject({
  test: {
    name: 'api',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        // Process @graphql-tools through the same pipeline as test files so the executable demo
        // schema and the graphql entry points in tests share one graphql-js instance; otherwise
        // graphql's instanceOf guard rejects the schema ("another copy of graphql").
        inline: [/@graphql-tools/],
      },
    },
  },
});
