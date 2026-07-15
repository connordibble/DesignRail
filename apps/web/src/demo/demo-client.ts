import { ApolloClient, InMemoryCache } from '@apollo/client';
import { SchemaLink } from '@apollo/client/link/schema';
import { createSqlJsEngine } from '@designrail/api/engine';
import initSqlJs from 'sql.js';
import sqlJsWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

// Bundle the API's drizzle migrations and the same public fixtures the server ingests at startup,
// so the in-browser engine boots exactly the workspace `pnpm dev` produces. The globs are
// resolved at build time; a new migration or fixture lands in the demo automatically.
const migrationModules = import.meta.glob<string>('../../../api/drizzle/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const fixtureModules = import.meta.glob<unknown>('../../../../examples/figma-input.*.json', {
  import: 'default',
  eager: true,
});

function sortedEntries<Value>(modules: Record<string, Value>): [string, Value][] {
  return Object.entries(modules).sort(([left], [right]) => left.localeCompare(right));
}

/**
 * Build an Apollo client whose "transport" is the DesignRail engine running in this tab: the real
 * GraphQL schema and resolvers over a WASM SQLite database. Every visitor gets an isolated,
 * disposable workspace; nothing leaves the browser.
 */
export async function createDemoApolloClient(): Promise<ApolloClient> {
  const SQL = await initSqlJs({ locateFile: () => sqlJsWasmUrl });

  const engine = createSqlJsEngine({
    database: new SQL.Database(),
    migrations: sortedEntries(migrationModules).map(([, sql]) => sql),
    fixtures: sortedEntries(fixtureModules).map(([path, document]) => ({
      document,
      fixturePath: `examples/${path.split('/').pop() ?? path}`,
    })),
  });

  if (engine.ingestionFailures.length > 0) {
    // Mirrors the server's startup warning; the seeded registry examples still work.
    console.warn('Some Figma fixtures could not be loaded into the demo workspace.', {
      failures: engine.ingestionFailures,
    });
  }

  return new ApolloClient({
    link: new SchemaLink({ schema: engine.schema }),
    cache: new InMemoryCache(),
  });
}
