import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';

export const DEFAULT_GRAPHQL_URL = 'http://127.0.0.1:4000/graphql';

interface GraphqlEnv {
  readonly VITE_DESIGNRAIL_GRAPHQL_URL?: string;
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
