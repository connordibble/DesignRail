import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { buttonExampleFixture, mockFigmaFixtureSchema } from '@designrail/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  closeDatabaseClient,
  createDatabaseClient,
  migrateDatabase,
  type DatabaseClient,
} from '../db/index.js';

import {
  getExampleById,
  getReviewWorkspace,
  ingestFigmaFixtures,
  seedDesignRailData,
} from './index.js';

function createFixture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    figma: { nodeId: '12:34', nodeName: 'Button', fileKey: 'demo-file' },
    exampleId: 'example.button.primary.12-34-3fec0ad9',
    intentId: 'intent.button.primary.12-34-3fec0ad9',
    component: 'button',
    componentType: 'Button',
    name: 'Imported Button',
    summary: 'A Figma-sourced primary button.',
    props: { label: 'Publish', appearance: 'primary' },
    variants: ['primary'],
    states: ['default'],
    tokens: [],
    accessibility: { label: 'Publish', role: 'button', required: false },
    ...overrides,
  };
}

describe('Figma fixture ingestion', () => {
  let client: DatabaseClient;
  let tempDir: string;
  let fixtureDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'designrail-figma-ingestion-'));
    fixtureDir = join(tempDir, 'examples');
    client = createDatabaseClient({ sqlitePath: join(tempDir, 'designrail.sqlite') });
    migrateDatabase(client);
    seedDesignRailData(client);
  });

  afterEach(() => {
    closeDatabaseClient(client);
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeFixture(fileName: string, fixture: Record<string, unknown>): void {
    const parsed = mockFigmaFixtureSchema.parse(fixture);
    writeFileSync(join(fixtureDir, fileName), JSON.stringify(parsed), { flag: 'w' });
  }

  it('persists an imported fixture as a reviewable FIGMA workspace', () => {
    mkdirSync(fixtureDir, { recursive: true });
    writeFixture('figma-input.button.primary.12-34-3fec0ad9.json', createFixture());

    const result = ingestFigmaFixtures(client, {
      directory: fixtureDir,
      fixturePathPrefix: 'examples',
    });

    expect(result).toEqual({
      imported: ['examples/figma-input.button.primary.12-34-3fec0ad9.json'],
      skipped: [],
      failures: [],
    });
    expect(getReviewWorkspace(client, 'example.button.primary.12-34-3fec0ad9')).toMatchObject({
      example: { source: 'FIGMA', name: 'Imported Button' },
      intent: { source: 'FIGMA', componentType: 'Button' },
      mapping: { targetComponent: 'sl-button' },
      latestDecision: null,
    });
  });

  it('isolates unsupported fixtures instead of failing startup', () => {
    mkdirSync(fixtureDir, { recursive: true });
    writeFixture(
      'figma-input.banner.default.8-9-e19ac7e4.json',
      createFixture({
        figma: { nodeId: '8:9', nodeName: 'Banner', fileKey: 'demo-file' },
        exampleId: 'example.banner.default.8-9-e19ac7e4',
        intentId: 'intent.banner.default.8-9-e19ac7e4',
        component: 'banner',
        componentType: 'Banner',
        name: 'Banner',
      }),
    );

    const result = ingestFigmaFixtures(client, {
      directory: fixtureDir,
      fixturePathPrefix: 'examples',
    });

    expect(result.imported).toEqual([]);
    expect(result.failures[0]?.message).toContain('No Shoelace schema registered');
    expect(getExampleById(client, 'example.banner.default.8-9-e19ac7e4')).toBeNull();
  });

  it('does not overwrite a canonical mock example when an old export reuses its id', () => {
    mkdirSync(fixtureDir, { recursive: true });
    writeFixture(
      'figma-input.button.primary.json',
      createFixture({
        exampleId: buttonExampleFixture.id,
        intentId: 'intent.button.primary',
      }),
    );

    const result = ingestFigmaFixtures(client, {
      directory: fixtureDir,
      fixturePathPrefix: 'examples',
    });

    expect(result.failures[0]?.message).toContain('already belongs to the MOCK fixture');
    expect(getExampleById(client, buttonExampleFixture.id)).toEqual(buttonExampleFixture);
  });
});
