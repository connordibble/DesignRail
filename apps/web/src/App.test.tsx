import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DesignRailAppProviders } from './app-providers.js';
import { App } from './App.js';
import { createDesignRailApolloClient } from './graphql/client.js';

describe('<App />', () => {
  it('renders the DesignRail product name inside the Apollo provider', () => {
    const client = createDesignRailApolloClient({ uri: '/graphql' });

    render(
      <DesignRailAppProviders client={client}>
        <App />
      </DesignRailAppProviders>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('DesignRail');
  });
});
