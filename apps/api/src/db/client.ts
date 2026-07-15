import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import * as schema from './schema.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface CreateDatabaseClientOptions {
  sqlitePath?: string;
}

export interface SqliteConnection {
  close(): unknown;
}

/**
 * The synchronous SQLite query surface repositories and resolvers depend on. Both the server's
 * better-sqlite3 driver and the in-browser demo's sql.js driver satisfy it, so everything behind
 * the GraphQL contract runs unchanged in either runtime.
 */
export type DesignRailDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

export interface DatabaseClient {
  db: DesignRailDatabase;
  sqlite: SqliteConnection;
  sqlitePath: string;
}

/** A client backed by better-sqlite3, as created by the server; supports the file-based migrator. */
export interface ServerDatabaseClient extends DatabaseClient {
  db: BetterSQLite3Database<typeof schema>;
}

export function getDefaultDatabasePath(): string {
  return process.env['DESIGNRAIL_DB_PATH'] ?? resolve(apiRoot, '.data/designrail.sqlite');
}

export function createDatabaseClient(
  options: CreateDatabaseClientOptions = {},
): ServerDatabaseClient {
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
