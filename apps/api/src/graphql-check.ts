import { buildASTSchema, validateSchema } from 'graphql';

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

const app = await buildServer({ logger: false });

try {
  const response = await app.inject({
    method: 'POST',
    url: '/graphql',
    headers: { 'content-type': 'application/json' },
    payload: { query: '{ __typename }' },
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
} finally {
  await app.close();
}

console.log('GraphQL schema and server smoke check passed.');
