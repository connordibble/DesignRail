import { ApolloServer } from '@apollo/server';
import fastifyApollo, { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import {
  GraphQLError,
  type ASTVisitor,
  type ValidationContext,
  type ValidationRule,
} from 'graphql';

import {
  closeDatabaseClient,
  createDatabaseClient,
  migrateDatabase,
  type DatabaseClient,
} from './db/index.js';
import { seedDesignRailData } from './repositories/index.js';
import { createResolvers, typeDefs } from './schema.js';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** Whether a browser Origin is a local development host (any port). */
export function isLocalOrigin(origin: string | undefined): boolean {
  return origin !== undefined && LOCAL_ORIGIN_PATTERN.test(origin);
}

export interface QueryGuardOptions {
  maxAliases?: number;
}

export interface BuildServerOptions extends FastifyServerOptions {
  databaseClient?: DatabaseClient;
  queryGuards?: QueryGuardOptions | false;
  runMigrations?: boolean;
  seedData?: boolean;
}

export function resolveServerHost(env: NodeJS.ProcessEnv = process.env): string {
  const host = env['HOST'] ?? '127.0.0.1';

  if (!LOCAL_HOSTS.has(host) && env['DESIGNRAIL_ALLOW_NETWORK'] !== 'true') {
    throw new Error(
      'Refusing to bind DesignRail API to a non-local host without DESIGNRAIL_ALLOW_NETWORK=true.',
    );
  }

  return host;
}

export function createQueryGuardRules(options: QueryGuardOptions = {}): ValidationRule[] {
  const maxAliases = options.maxAliases ?? 25;

  return [
    function designRailQueryGuard(context: ValidationContext): ASTVisitor {
      let aliasCount = 0;
      let aliasLimitReported = false;

      return {
        Field(node) {
          if (node.alias === undefined) {
            return;
          }

          aliasCount += 1;

          if (aliasCount > maxAliases && !aliasLimitReported) {
            aliasLimitReported = true;
            context.reportError(
              new GraphQLError(`GraphQL query exceeds max aliases ${maxAliases}.`, {
                nodes: node,
                extensions: { code: 'TOO_MANY_ALIASES' },
              }),
            );
          }
        },
      };
    },
  ];
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const {
    databaseClient,
    queryGuards,
    runMigrations = true,
    seedData = true,
    ...fastifyOptions
  } = options;
  const app = Fastify({ logger: true, ...fastifyOptions });
  const client = databaseClient ?? createDatabaseClient();
  const shouldOwnDatabaseClient = databaseClient === undefined;

  // Allow the local review UI (served from a different dev port) to call the API in a browser.
  // Scoped to local origins; the host-binding guard still controls who can reach the server.
  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;

    if (typeof origin !== 'string' || !isLocalOrigin(origin)) {
      return;
    }

    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Vary', 'Origin');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'content-type');
    reply.header('Access-Control-Max-Age', '86400');

    if (request.method === 'OPTIONS') {
      return reply.code(204).send();
    }
  });

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
    validationRules: queryGuards === false ? [] : createQueryGuardRules(queryGuards),
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
  const host = resolveServerHost();
  buildServer()
    .then((app) => app.listen({ port, host }))
    .then((address) => {
      console.log(`DesignRail API listening on ${address}/graphql`);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
