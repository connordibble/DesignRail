import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { graphql } from 'graphql';
import initSqlJs from 'sql.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  closeDatabaseClient,
  createDatabaseClient,
  migrateDatabase,
  type ServerDatabaseClient,
} from './db/index.js';
import { createSqlJsEngine, runSqlMigrations, type SqlJsEngine } from './engine.js';
import {
  getReviewWorkspace,
  ingestFigmaFixtures,
  listExamples,
  seedDesignRailData,
} from './repositories/index.js';

const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(apiRoot, '..', '..');
const examplesDirectory = resolve(workspaceRoot, 'examples');

function readMigrations(): string[] {
  const migrationsFolder = resolve(apiRoot, 'drizzle');

  return readdirSync(migrationsFolder)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => readFileSync(join(migrationsFolder, fileName), 'utf8'));
}

function readFixtureDocuments(): { document: unknown; fixturePath: string }[] {
  return readdirSync(examplesDirectory)
    .filter((fileName) => /^figma-input\..+\.json$/.test(fileName))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => ({
      document: JSON.parse(readFileSync(join(examplesDirectory, fileName), 'utf8')) as unknown,
      fixturePath: `examples/${fileName}`,
    }));
}

describe('createSqlJsEngine', () => {
  let engine: SqlJsEngine;
  let reference: ServerDatabaseClient;

  beforeAll(async () => {
    const SQL = await initSqlJs();

    engine = createSqlJsEngine({
      database: new SQL.Database(),
      migrations: readMigrations(),
      fixtures: readFixtureDocuments(),
    });

    // The better-sqlite3 client prepared exactly the way buildServer prepares it.
    reference = createDatabaseClient({ sqlitePath: ':memory:' });
    migrateDatabase(reference);
    seedDesignRailData(reference);
    ingestFigmaFixtures(reference, {
      directory: examplesDirectory,
      fixturePathPrefix: 'examples',
    });
  });

  afterAll(() => {
    closeDatabaseClient(engine.client);
    closeDatabaseClient(reference);
  });

  it('ingests every bundled fixture without failures', () => {
    expect(engine.ingestionFailures).toEqual([]);
  });

  it('produces review workspaces identical to the better-sqlite3 server pipeline', () => {
    const referenceExamples = listExamples(reference, { limit: 200 });
    const engineExamples = listExamples(engine.client, { limit: 200 });

    expect(engineExamples).toEqual(referenceExamples);
    expect(engineExamples.length).toBeGreaterThan(0);

    for (const example of referenceExamples) {
      expect(getReviewWorkspace(engine.client, example.id)).toEqual(
        getReviewWorkspace(reference, example.id),
      );
    }
  });

  it('runs the accept-then-export review flow through the executable schema', async () => {
    const workspaceResult = await graphql({
      schema: engine.schema,
      source: `
        query Workspace($exampleId: ID!) {
          reviewWorkspace(exampleId: $exampleId) {
            mapping { id }
          }
        }
      `,
      variableValues: { exampleId: listExamples(engine.client)[0]?.id },
    });

    expect(workspaceResult.errors).toBeUndefined();
    const workspace = workspaceResult.data?.['reviewWorkspace'] as { mapping: { id: string } };
    const mappingId = workspace.mapping.id;

    const decisionResult = await graphql({
      schema: engine.schema,
      source: `
        mutation Accept($input: SaveReviewDecisionInput!) {
          saveReviewDecision(input: $input) { id status }
        }
      `,
      variableValues: {
        input: { mappingId, status: 'ACCEPTED', reviewerLabel: 'Demo Reviewer' },
      },
    });

    expect(decisionResult.errors).toBeUndefined();

    const exportResult = await graphql({
      schema: engine.schema,
      source: `
        mutation Export($input: ExportMappingInput!) {
          exportMapping(input: $input) { id format content }
        }
      `,
      variableValues: { input: { mappingId, format: 'HTML' } },
    });

    expect(exportResult.errors).toBeUndefined();
    const exported = exportResult.data?.['exportMapping'] as { format: string; content: string };
    expect(exported.format).toBe('HTML');
    expect(exported.content.length).toBeGreaterThan(0);
  });

  it('locks new exports behind a rejection exactly like the served API', async () => {
    const examples = listExamples(engine.client, { limit: 200 });
    const rejectedExample = examples[1] ?? examples[0];
    const workspace = getReviewWorkspace(engine.client, rejectedExample?.id ?? '');
    const mappingId = workspace?.mapping?.id;

    expect(mappingId).toBeDefined();

    const rejection = await graphql({
      schema: engine.schema,
      source: `
        mutation Reject($input: SaveReviewDecisionInput!) {
          saveReviewDecision(input: $input) { id status }
        }
      `,
      variableValues: {
        input: {
          mappingId,
          status: 'REJECTED',
          reviewerLabel: 'Demo Reviewer',
          notes: 'Rejected in the engine parity test.',
        },
      },
    });

    expect(rejection.errors).toBeUndefined();

    const blockedExport = await graphql({
      schema: engine.schema,
      source: `
        mutation Export($input: ExportMappingInput!) {
          exportMapping(input: $input) { id }
        }
      `,
      variableValues: { input: { mappingId, format: 'REACT' } },
    });

    expect(blockedExport.errors?.[0]?.extensions?.['code']).toBe('MAPPING_NOT_EXPORTABLE');
  });
});

describe('runSqlMigrations', () => {
  it('rejects an empty migration list so a demo cannot boot without tables', async () => {
    const SQL = await initSqlJs();

    expect(() => runSqlMigrations(new SQL.Database(), [])).toThrow(/No migration SQL/);
  });
});
