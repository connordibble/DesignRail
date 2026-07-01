import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buttonComponentMappingFixture,
  buttonExampleFixture,
  cardExampleFixture,
  FIXTURE_TIMESTAMP,
  inputExampleFixture,
} from '@designrail/shared';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  closeDatabaseClient,
  componentMappings,
  createDatabaseClient,
  migrateDatabase,
  type DatabaseClient,
} from '../db/index.js';

import {
  createExport,
  getComponentIntentByExampleId,
  getDashboardMetrics,
  getLatestReviewDecisionByMappingId,
  getMappingByExampleId,
  getReviewWorkspace,
  listExportsByMappingId,
  listComplianceFindingsByMappingId,
  listComplianceLedger,
  listExamples,
  listReviewDecisions,
  listReviewDecisionsByMappingId,
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

  it('lists the seeded examples ordered by name, with intents, mappings, and findings', () => {
    expect(listExamples(client)).toEqual([
      buttonExampleFixture,
      cardExampleFixture,
      inputExampleFixture,
    ]);
    expect(getComponentIntentByExampleId(client, buttonExampleFixture.id)?.componentType).toBe(
      'Button',
    );
    expect(getComponentIntentByExampleId(client, inputExampleFixture.id)?.componentType).toBe(
      'Input',
    );
    expect(getComponentIntentByExampleId(client, cardExampleFixture.id)?.componentType).toBe(
      'Card',
    );
    expect(getMappingByExampleId(client, buttonExampleFixture.id)).toEqual(
      buttonComponentMappingFixture,
    );
    expect(
      listComplianceFindingsByMappingId(client, buttonComponentMappingFixture.id),
    ).toHaveLength(3);
  });

  it('returns every compliance finding across all examples, most severe first', () => {
    const ledger = listComplianceLedger(client);

    expect(ledger).toHaveLength(10);
    // Input's token-usage warning is the only non-info finding in the seed data, so it sorts first.
    expect(ledger[0]).toMatchObject({
      example: { name: 'Input' },
      finding: { id: 'finding.input.email.token-usage', severity: 'WARNING' },
    });
    expect(ledger.slice(1).every((entry) => entry.finding.severity === 'INFO')).toBe(true);
    // Remaining info findings group by example name alphabetically: Button, Card, Input.
    expect(ledger.slice(1).map((entry) => entry.example.name)).toEqual([
      'Button',
      'Button',
      'Button',
      'Card',
      'Card',
      'Card',
      'Input',
      'Input',
      'Input',
    ]);
  });

  it('returns a review workspace for the seeded Button example', () => {
    const workspace = getReviewWorkspace(client, buttonExampleFixture.id);

    expect(workspace).toMatchObject({
      example: buttonExampleFixture,
      intent: {
        componentType: 'Button',
      },
      mapping: {
        id: buttonComponentMappingFixture.id,
        targetComponent: 'sl-button',
      },
      latestDecision: null,
      exports: [],
    });
    expect(workspace?.complianceFindings).toHaveLength(3);
    expect(
      workspace?.complianceFindings.every((f) => f.mappingId === buttonComponentMappingFixture.id),
    ).toBe(true);
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
    // Button is accepted; the seeded Input and Card mappings have no decision yet, so they pend.
    expect(getDashboardMetrics(client)).toMatchObject({
      acceptedMappings: 1,
      rejectedMappings: 0,
      editedMappings: 0,
      pendingMappings: 2,
    });
  });

  it('returns the latest decision in the review workspace', () => {
    saveReviewDecision(client, {
      id: 'decision.test.accepted',
      mappingId: buttonComponentMappingFixture.id,
      status: 'ACCEPTED',
      reviewerLabel: 'Repository test',
      createdAt: '2026-01-01T00:00:01.000Z',
    });
    saveReviewDecision(client, {
      id: 'decision.test.edited',
      mappingId: buttonComponentMappingFixture.id,
      status: 'EDITED',
      reviewerLabel: 'Repository test',
      editedMapping: {
        mappedSlots: {
          default: 'Publish',
        },
      },
      createdAt: '2026-01-01T00:00:02.000Z',
    });
    saveReviewDecision(client, {
      id: 'decision.test.rejected',
      mappingId: buttonComponentMappingFixture.id,
      status: 'REJECTED',
      reviewerLabel: 'Repository test',
      createdAt: '2026-01-01T00:00:03.000Z',
    });

    expect(
      getLatestReviewDecisionByMappingId(client, buttonComponentMappingFixture.id),
    ).toMatchObject({
      id: 'decision.test.rejected',
      status: 'REJECTED',
    });
    expect(getReviewWorkspace(client, buttonExampleFixture.id)?.latestDecision).toMatchObject({
      id: 'decision.test.rejected',
      status: 'REJECTED',
    });
  });

  it('returns full decision history for a mapping in most-recent-first order', () => {
    saveReviewDecision(client, {
      id: 'decision.test.accepted',
      mappingId: buttonComponentMappingFixture.id,
      status: 'ACCEPTED',
      reviewerLabel: 'Repository test',
      createdAt: '2026-01-01T00:00:01.000Z',
    });
    saveReviewDecision(client, {
      id: 'decision.test.edited',
      mappingId: buttonComponentMappingFixture.id,
      status: 'EDITED',
      reviewerLabel: 'Repository test',
      editedMapping: {
        mappedSlots: {
          default: 'Publish',
        },
      },
      createdAt: '2026-01-01T00:00:02.000Z',
    });
    saveReviewDecision(client, {
      id: 'decision.test.rejected',
      mappingId: buttonComponentMappingFixture.id,
      status: 'REJECTED',
      reviewerLabel: 'Repository test',
      createdAt: '2026-01-01T00:00:03.000Z',
    });

    expect(
      listReviewDecisionsByMappingId(client, buttonComponentMappingFixture.id).map((d) => d.id),
    ).toEqual(['decision.test.rejected', 'decision.test.edited', 'decision.test.accepted']);
    expect(
      getReviewWorkspace(client, buttonExampleFixture.id)?.decisionHistory.map((d) => d.status),
    ).toEqual(['REJECTED', 'EDITED', 'ACCEPTED']);
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
        content: '<sl-button variant="primary">Save changes</sl-button>',
      },
    });
    expect(getDashboardMetrics(client).exportsCreated).toBe(1);
  });

  it('returns export history after a valid export', () => {
    expect(listExportsByMappingId(client, buttonComponentMappingFixture.id)).toEqual([]);

    saveReviewDecision(client, {
      id: 'decision.test.accepted',
      mappingId: buttonComponentMappingFixture.id,
      status: 'ACCEPTED',
      reviewerLabel: 'Repository test',
      createdAt: '2026-01-01T00:00:01.000Z',
    });

    const outcome = createExport(client, {
      id: 'export.test.react',
      mappingId: buttonComponentMappingFixture.id,
      format: 'REACT',
      createdAt: '2026-01-01T00:00:02.000Z',
    });

    expect(outcome).toMatchObject({ ok: true });
    expect(getReviewWorkspace(client, buttonExampleFixture.id)?.exports).toEqual([
      {
        id: 'export.test.react',
        mappingId: buttonComponentMappingFixture.id,
        format: 'REACT',
        content: '<SlButton variant="primary" size="medium">Save changes</SlButton>',
        createdAt: '2026-01-01T00:00:02.000Z',
      },
    ]);
  });

  it('exports the effective edited mapping values', () => {
    saveReviewDecision(client, {
      id: 'decision.test.edited-output',
      mappingId: buttonComponentMappingFixture.id,
      status: 'EDITED',
      reviewerLabel: 'Repository test',
      editedMapping: {
        mappedProps: {
          variant: 'warning',
          size: 'large',
          disabled: true,
        },
        mappedSlots: {
          default: 'Publish changes',
        },
      },
      createdAt: '2026-01-01T00:00:01.000Z',
    });

    const outcome = createExport(client, {
      id: 'export.test.edited-output',
      mappingId: buttonComponentMappingFixture.id,
      format: 'HTML',
      createdAt: '2026-01-01T00:00:02.000Z',
    });

    expect(outcome).toMatchObject({
      ok: true,
      exportResult: {
        content: '<sl-button variant="warning" size="large" disabled>Publish changes</sl-button>',
      },
    });
  });

  it('exports an agent brief carrying the authorizing decision and compliance findings', () => {
    saveReviewDecision(client, {
      id: 'decision.test.accepted-for-brief',
      mappingId: buttonComponentMappingFixture.id,
      status: 'ACCEPTED',
      reviewerLabel: 'Repository test',
      createdAt: '2026-01-01T00:00:01.000Z',
    });

    const outcome = createExport(client, {
      id: 'export.test.agent-brief',
      mappingId: buttonComponentMappingFixture.id,
      format: 'AGENT_BRIEF',
      createdAt: '2026-01-01T00:00:02.000Z',
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    expect(outcome.exportResult.content).toContain(
      'Review: ACCEPTED by Repository test on 2026-01-01T00:00:01.000Z',
    );
    expect(outcome.exportResult.content).toContain('Compliance: 0 blockers, 0 warnings, 3 info');
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

  it('rejects edited mappings with props or values outside the Shoelace schema', () => {
    expect(() =>
      saveReviewDecision(client, {
        mappingId: buttonComponentMappingFixture.id,
        status: 'EDITED',
        reviewerLabel: 'Repository test',
        editedMapping: { mappedProps: { variant: 'bogus' } },
      }),
    ).toThrow(/invalid value/);

    expect(() =>
      saveReviewDecision(client, {
        mappingId: buttonComponentMappingFixture.id,
        status: 'EDITED',
        reviewerLabel: 'Repository test',
        editedMapping: { mappedProps: { href: 'https://example.com' } },
      }),
    ).toThrow(/not supported/);
  });

  it('coerces edited mapping values against the schema before saving', () => {
    const decision = saveReviewDecision(client, {
      mappingId: buttonComponentMappingFixture.id,
      status: 'EDITED',
      reviewerLabel: 'Repository test',
      editedMapping: { mappedProps: { variant: 'Primary', disabled: 'true' } },
    });

    expect(decision.editedMapping?.mappedProps).toEqual({ variant: 'primary', disabled: true });
  });

  it('reopens review when a seed-owned mapping changes', () => {
    saveReviewDecision(client, {
      id: 'decision.reopen.accepted',
      mappingId: buttonComponentMappingFixture.id,
      status: 'ACCEPTED',
      reviewerLabel: 'Repository test',
      createdAt: FIXTURE_TIMESTAMP,
    });
    expect(
      getLatestReviewDecisionByMappingId(client, buttonComponentMappingFixture.id),
    ).not.toBeNull();

    // Simulate a prior-version mapping row whose content differs from the canonical fixture.
    client.db
      .update(componentMappings)
      .set({ rationale: 'Outdated rationale from a previous version.' })
      .where(eq(componentMappings.id, buttonComponentMappingFixture.id))
      .run();

    seedDesignRailData(client);

    expect(getLatestReviewDecisionByMappingId(client, buttonComponentMappingFixture.id)).toBeNull();
    expect(getMappingByExampleId(client, buttonExampleFixture.id)?.rationale).toBe(
      buttonComponentMappingFixture.rationale,
    );
  });
});
