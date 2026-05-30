import type { ApolloClient } from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import type { ReactElement, ReactNode } from 'react';

import { apolloClient } from './graphql/client.js';

export interface DesignRailAppProvidersProps {
  children: ReactNode;
  client?: ApolloClient;
}

export function DesignRailAppProviders({
  children,
  client = apolloClient,
}: DesignRailAppProvidersProps): ReactElement {
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
