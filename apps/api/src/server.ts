import { ApolloServer } from '@apollo/server';
import fastifyApollo, { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import {
  closeDatabaseClient,
  createDatabaseClient,
  migrateDatabase,
  type DatabaseClient,
} from './db/index.js';
import { seedDesignRailData } from './repositories/index.js';
import { createResolvers, typeDefs } from './schema.js';

export interface BuildServerOptions extends FastifyServerOptions {
  databaseClient?: DatabaseClient;
  runMigrations?: boolean;
  seedData?: boolean;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const { databaseClient, runMigrations = true, seedData = true, ...fastifyOptions } = options;
  const app = Fastify({ logger: true, ...fastifyOptions });
  const client = databaseClient ?? createDatabaseClient();
  const shouldOwnDatabaseClient = databaseClient === undefined;

  if (runMigrations) {
    migrateDatabase(client);
  }

  if (seedData) {
    seedDesignRailData(client);
  }

  const apollo = new ApolloServer({
    typeDefs,
    resolvers: createResolvers(client),
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await apollo.start();
  await app.register(fastifyApollo(apollo));

  if (shouldOwnDatabaseClient) {
    app.addHook('onClose', () => {
      closeDatabaseClient(client);
    });
  }

  return app;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = Number(process.env['PORT'] ?? 4000);
  buildServer()
    .then((app) => app.listen({ port, host: '0.0.0.0' }))
    .then((address) => {
      console.log(`DesignRail API listening on ${address}/graphql`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
