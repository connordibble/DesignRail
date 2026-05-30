import { describe, expect, it } from 'vitest';

import { DEFAULT_GRAPHQL_URL, createDesignRailApolloClient, resolveGraphqlUrl } from './client.js';

describe('DesignRail Apollo client', () => {
  it('uses the local GraphQL endpoint by default', () => {
    expect(resolveGraphqlUrl({})).toBe(DEFAULT_GRAPHQL_URL);
  });

  it('uses an explicit Vite GraphQL endpoint when configured', () => {
    expect(
      resolveGraphqlUrl({
        VITE_DESIGNRAIL_GRAPHQL_URL: ' http://localhost:4100/graphql ',
      }),
    ).toBe('http://localhost:4100/graphql');
  });

  it('creates an Apollo Client instance for the review UI', () => {
    const client = createDesignRailApolloClient({ uri: '/graphql' });

    expect(client.version).toMatch(/\d+\.\d+\.\d+/);
  });
});
