import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface CreateDatabaseClientOptions {
  sqlitePath?: string;
}

export interface SqliteConnection {
  close(): unknown;
}

export interface DatabaseClient {
  db: BetterSQLite3Database<typeof schema>;
  sqlite: SqliteConnection;
  sqlitePath: string;
}

export function getDefaultDatabasePath(): string {
  return process.env['DESIGNRAIL_DB_PATH'] ?? resolve(apiRoot, '.data/designrail.sqlite');
}

export function createDatabaseClient(options: CreateDatabaseClientOptions = {}): DatabaseClient {
  const sqlitePath = options.sqlitePath ?? getDefaultDatabasePath();

  if (sqlitePath !== ':memory:') {
    mkdirSync(dirname(sqlitePath), { recursive: true });
  }

  const sqlite = new Database(sqlitePath);
  sqlite.pragma('foreign_keys = ON');

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
    sqlitePath,
  };
}

export function closeDatabaseClient(client: DatabaseClient): void {
  client.sqlite.close();
}
