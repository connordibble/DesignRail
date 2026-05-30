import React from 'react';
import ReactDOM from 'react-dom/client';

import { DesignRailAppProviders } from './app-providers.js';
import { App } from './App.js';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Missing #root element in index.html');
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <DesignRailAppProviders>
      <App />
    </DesignRailAppProviders>
  </React.StrictMode>,
);
