import { makeExecutableSchema } from '@graphql-tools/schema';
import { drizzle } from 'drizzle-orm/sql-js';
import type { GraphQLSchema } from 'graphql';
import type { Database as SqlJsDatabase } from 'sql.js';

import type { DatabaseClient } from './db/client.js';
import * as dbSchema from './db/schema.js';
import { seedDesignRailData } from './repositories/designrail.js';
import { ingestFigmaFixtureDocument } from './repositories/figma-pipeline.js';
import { createResolvers, typeDefs } from './schema.js';

/**
 * The embedded DesignRail engine: the same GraphQL contract, resolvers, repositories, migrations,
 * seed registry, and fixture pipeline the Fastify server runs, executed against a sql.js (WASM
 * SQLite) database instead of better-sqlite3. The hosted demo uses it to run the full review
 * workflow inside a browser tab with no server, so every visitor gets an isolated workspace.
 *
 * This module must stay free of Node built-ins and native modules.
 */

/** Marker used by drizzle-kit between statements inside one generated migration file. */
const STATEMENT_BREAKPOINT = '--> statement-breakpoint';

export interface EngineFixtureDocument {
  /** Parsed JSON content of a `figma-input.*.json` fixture. */
  document: unknown;
  /** Path recorded as the fixture origin, e.g. `examples/figma-input.button.json`. */
  fixturePath: string;
}

export interface EngineIngestionFailure {
  fixturePath: string;
  message: string;
}

export interface CreateSqlJsEngineOptions {
  /** An opened sql.js database; the caller owns loading the WASM runtime. */
  database: SqlJsDatabase;
  /** Raw drizzle migration SQL, in journal order. */
  migrations: readonly string[];
  /** Optional fixture documents to run through the deterministic pipeline after seeding. */
  fixtures?: readonly EngineFixtureDocument[];
}

export interface SqlJsEngine {
  /** Executable schema for a local GraphQL link; behaves like the served API. */
  schema: GraphQLSchema;
  client: DatabaseClient;
  /** Fixture documents that failed ingestion; mirrors the server's startup warning. */
  ingestionFailures: EngineIngestionFailure[];
}

/** Wrap an opened sql.js database in the client shape repositories expect. */
export function createSqlJsDatabaseClient(database: SqlJsDatabase): DatabaseClient {
  database.run('PRAGMA foreign_keys = ON;');

  return {
    db: drizzle(database, { schema: dbSchema }),
    sqlite: database,
    sqlitePath: ':memory:',
  };
}

/** Apply drizzle-generated migration SQL to a fresh sql.js database. */
export function runSqlMigrations(database: SqlJsDatabase, migrations: readonly string[]): void {
  if (migrations.length === 0) {
    throw new Error('No migration SQL was provided; the demo database would have no tables.');
  }

  for (const migration of migrations) {
    for (const statement of migration.split(STATEMENT_BREAKPOINT)) {
      const sql = statement.trim();

      if (sql.length > 0) {
        database.run(sql);
      }
    }
  }
}

/**
 * Migrate, seed, and ingest exactly like `buildServer`, then expose the result as an executable
 * GraphQL schema.
 */
export function createSqlJsEngine(options: CreateSqlJsEngineOptions): SqlJsEngine {
  runSqlMigrations(options.database, options.migrations);

  const client = createSqlJsDatabaseClient(options.database);

  seedDesignRailData(client);

  const ingestionFailures: EngineIngestionFailure[] = [];

  for (const fixture of options.fixtures ?? []) {
    try {
      ingestFigmaFixtureDocument(client, fixture);
    } catch (error) {
      ingestionFailures.push({
        fixturePath: fixture.fixturePath,
        message:
          error instanceof Error ? error.message : 'Unknown Figma fixture ingestion failure.',
      });
    }
  }

  return {
    schema: makeExecutableSchema({ typeDefs, resolvers: createResolvers(client) }),
    client,
    ingestionFailures,
  };
}
