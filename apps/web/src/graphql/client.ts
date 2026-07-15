import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export const DEFAULT_GRAPHQL_URL = 'http://127.0.0.1:4000/graphql';

interface GraphqlEnv {
  readonly VITE_DESIGNRAIL_GRAPHQL_URL?: string;
}

interface DemoEnv {
  readonly VITE_DESIGNRAIL_DEMO_MODE?: string;
}

/**
 * Demo mode swaps the HTTP transport for an in-browser engine (see `demo/demo-client.ts`); it is
 * a build-time switch used by the hosted, serverless demo.
 */
export function isDemoMode(env: DemoEnv = import.meta.env): boolean {
  return env.VITE_DESIGNRAIL_DEMO_MODE === 'true';
}

export interface CreateDesignRailApolloClientOptions {
  uri?: string;
}

export function resolveGraphqlUrl(env: GraphqlEnv = import.meta.env): string {
  const configuredUrl = env.VITE_DESIGNRAIL_GRAPHQL_URL?.trim();

  return configuredUrl && configuredUrl.length > 0 ? configuredUrl : DEFAULT_GRAPHQL_URL;
}

export function createDesignRailApolloClient(
  options: CreateDesignRailApolloClientOptions = {},
): ApolloClient {
  return new ApolloClient({
    link: new HttpLink({
      uri: options.uri ?? resolveGraphqlUrl(),
    }),
    cache: new InMemoryCache(),
  });
}

export const apolloClient = createDesignRailApolloClient();
