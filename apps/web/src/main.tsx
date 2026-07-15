import type { ApolloClient } from '@apollo/client';
import React from 'react';
import ReactDOM from 'react-dom/client';

import { DesignRailAppProviders } from './app-providers.js';
import { App } from './App.js';
import { DemoModeNotice } from './demo/DemoModeNotice.js';
import { apolloClient, isDemoMode } from './graphql/client.js';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element in index.html');
}

const root = ReactDOM.createRoot(rootEl);

async function resolveApolloClient(): Promise<ApolloClient> {
  if (isDemoMode()) {
    // Imported on demand so the server-backed build never ships the sql.js engine, and the demo
    // build initializes WASM SQLite before the first render.
    const { createDemoApolloClient } = await import('./demo/demo-client.js');

    return createDemoApolloClient();
  }

  return apolloClient;
}

resolveApolloClient()
  .then((client) => {
    root.render(
      <React.StrictMode>
        <DesignRailAppProviders client={client}>
          {isDemoMode() ? <DemoModeNotice /> : null}
          <App />
        </DesignRailAppProviders>
      </React.StrictMode>,
    );
  })
  .catch((error: unknown) => {
    root.render(
      <p role="alert" className="px-dr-md py-dr-md text-dr-body text-dr-text">
        DesignRail failed to start{isDemoMode() ? ' the in-browser demo engine' : ''}. Reload the
        page to retry.
      </p>,
    );
    console.error(error);
  });
