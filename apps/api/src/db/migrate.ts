import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import type { DatabaseClient } from './client.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const defaultMigrationsFolder = resolve(apiRoot, 'drizzle');

export interface MigrateDatabaseOptions {
  migrationsFolder?: string;
}

export function migrateDatabase(
  client: DatabaseClient,
  options: MigrateDatabaseOptions = {},
): void {
  migrate(client.db, {
    migrationsFolder: options.migrationsFolder ?? defaultMigrationsFolder,
  });
}
