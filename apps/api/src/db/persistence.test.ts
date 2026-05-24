import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buttonExampleFixture } from '@designrail/shared';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  closeDatabaseClient,
  createDatabaseClient,
  examples,
  migrateDatabase,
  type DatabaseClient,
} from './index.js';

describe('DesignRail SQLite persistence', () => {
  let client: DatabaseClient | undefined;
  let tempDir: string | undefined;

  afterEach(() => {
    if (client) {
      closeDatabaseClient(client);
      client = undefined;
    }

    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it('migrates an isolated database and round-trips an example', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'designrail-api-'));
    client = createDatabaseClient({
      sqlitePath: join(tempDir, 'designrail.sqlite'),
    });

    migrateDatabase(client);

    const example = {
      ...buttonExampleFixture,
      id: 'example.button.persistence-test',
    };

    client.db.insert(examples).values(example).run();

    const row = client.db.select().from(examples).where(eq(examples.id, example.id)).get();

    expect(row).toEqual(example);
  });
});
