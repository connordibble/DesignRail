import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buttonComponentMappingFixture,
  buttonExampleFixture,
  FIXTURE_TIMESTAMP,
} from '@designrail/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  closeDatabaseClient,
  createDatabaseClient,
  migrateDatabase,
  type DatabaseClient,
} from '../db/index.js';

import {
  createExport,
  getComponentIntentByExampleId,
  getDashboardMetrics,
  getMappingByExampleId,
  listComplianceFindingsByMappingId,
  listExamples,
  listReviewDecisions,
  recordInstrumentationEvent,
  saveReviewDecision,
  seedDesignRailData,
} from './index.js';

describe('DesignRail repositories', () => {
  let client: DatabaseClient;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'designrail-repositories-'));
    client = createDatabaseClient({
      sqlitePath: join(tempDir, 'designrail.sqlite'),
    });
    migrateDatabase(client);
    seedDesignRailData(client);
  });

  afterEach(() => {
    closeDatabaseClient(client);
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('lists the seeded Button example, intent, mapping, and findings', () => {
    expect(listExamples(client)).toEqual([buttonExampleFixture]);
    expect(getComponentIntentByExampleId(client, buttonExampleFixture.id)?.componentType).toBe(
      'Button',
    );
    expect(getMappingByExampleId(client, buttonExampleFixture.id)).toEqual(
      buttonComponentMappingFixture,
    );
    expect(
      listComplianceFindingsByMappingId(client, buttonComponentMappingFixture.id),
    ).toHaveLength(1);
  });

  it('persists review decisions and derives dashboard metrics', () => {
    const decision = saveReviewDecision(client, {
      id: 'decision.test.accepted',
      mappingId: buttonComponentMappingFixture.id,
      status: 'ACCEPTED',
      reviewerLabel: 'Repository test',
      notes: 'Looks good.',
      createdAt: FIXTURE_TIMESTAMP,
    });

    expect(listReviewDecisions(client)).toEqual([decision]);
    expect(getDashboardMetrics(client)).toMatchObject({
      acceptedMappings: 1,
      rejectedMappings: 0,
      editedMappings: 0,
      pendingMappings: 0,
    });
  });

  it('blocks exports until the latest decision is accepted or edited', () => {
    expect(
      createExport(client, {
        id: 'export.test.blocked',
        mappingId: buttonComponentMappingFixture.id,
        format: 'HTML',
        createdAt: FIXTURE_TIMESTAMP,
      }),
    ).toMatchObject({
      ok: false,
      code: 'MAPPING_NOT_EXPORTABLE',
    });

    saveReviewDecision(client, {
      id: 'decision.test.rejected',
      mappingId: buttonComponentMappingFixture.id,
      status: 'REJECTED',
      reviewerLabel: 'Repository test',
      createdAt: '2026-01-01T00:00:01.000Z',
    });

    expect(
      createExport(client, {
        id: 'export.test.rejected',
        mappingId: buttonComponentMappingFixture.id,
        format: 'HTML',
        createdAt: FIXTURE_TIMESTAMP,
      }),
    ).toMatchObject({
      ok: false,
      code: 'MAPPING_NOT_EXPORTABLE',
    });

    saveReviewDecision(client, {
      id: 'decision.test.edited',
      mappingId: buttonComponentMappingFixture.id,
      status: 'EDITED',
      reviewerLabel: 'Repository test',
      editedMapping: {
        mappedProps: {
          variant: 'primary',
        },
      },
      createdAt: '2026-01-01T00:00:02.000Z',
    });

    const outcome = createExport(client, {
      id: 'export.test.allowed',
      mappingId: buttonComponentMappingFixture.id,
      format: 'HTML',
      createdAt: FIXTURE_TIMESTAMP,
    });

    expect(outcome).toMatchObject({
      ok: true,
      exportResult: {
        id: 'export.test.allowed',
        content: '<sl-button>Save changes</sl-button>',
      },
    });
    expect(getDashboardMetrics(client).exportsCreated).toBe(1);
  });

  it('records instrumentation events', () => {
    const event = recordInstrumentationEvent(client, {
      id: 'event.test.review-saved',
      name: 'review_decision.saved',
      entityType: 'REVIEW_DECISION',
      entityId: 'decision.test.accepted',
      metadata: {
        status: 'ACCEPTED',
      },
      timestamp: FIXTURE_TIMESTAMP,
    });

    expect(event).toMatchObject({
      id: 'event.test.review-saved',
      metadata: {
        status: 'ACCEPTED',
      },
    });
  });
});
