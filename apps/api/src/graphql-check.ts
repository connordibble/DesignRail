import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buildASTSchema, validateSchema } from 'graphql';

import { closeDatabaseClient, createDatabaseClient } from './db/index.js';
import { typeDefs } from './schema.js';
import { buildServer } from './server.js';

const schema = buildASTSchema(typeDefs);
const schemaErrors = validateSchema(schema);

if (schemaErrors.length > 0) {
  console.error('GraphQL schema validation failed:');
  for (const error of schemaErrors) {
    console.error(`- ${error.message}`);
  }
  process.exit(1);
}

const tempDir = mkdtempSync(join(tmpdir(), 'designrail-graphql-check-'));
const client = createDatabaseClient({ sqlitePath: join(tempDir, 'designrail.sqlite') });
const app = await buildServer({ databaseClient: client, logger: false });

try {
  const smokeQueries = [
    `query ExamplesSmoke {
      examples {
        id
        name
        componentType
        status
      }
    }`,
    `query DashboardMetricsSmoke {
      dashboardMetrics {
        acceptedMappings
        rejectedMappings
        editedMappings
        pendingMappings
        exportsCreated
      }
    }`,
  ];

  for (const query of smokeQueries) {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'content-type': 'application/json' },
      payload: { query },
    });

    if (response.statusCode !== 200) {
      console.error(`GraphQL smoke query failed with HTTP ${response.statusCode}:`);
      console.error(response.body);
      process.exit(1);
    }

    const body = response.json() as { errors?: unknown };
    if (body.errors) {
      console.error('GraphQL smoke query returned errors:');
      console.error(JSON.stringify(body.errors, null, 2));
      process.exit(1);
    }
  }
} finally {
  await app.close();
  closeDatabaseClient(client);
  rmSync(tempDir, { recursive: true, force: true });
}

console.log('GraphQL schema and server smoke check passed.');
