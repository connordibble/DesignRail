import { ApolloServer } from '@apollo/server';
import fastifyApollo, { fastifyApolloDrainPlugin } from '@as-integrations/fastify';
import Fastify, { type FastifyInstance } from 'fastify';

import { resolvers, typeDefs } from './schema.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  const apollo = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [fastifyApolloDrainPlugin(app)],
  });

  await apollo.start();
  await app.register(fastifyApollo(apollo));

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
