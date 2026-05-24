import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env['DESIGNRAIL_DB_PATH'] ?? './.data/designrail.sqlite',
  },
  strict: true,
  verbose: true,
});
