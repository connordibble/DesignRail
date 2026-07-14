import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buttonComponentMappingFixture,
  buttonExampleFixture,
  cardExampleFixture,
  inputExampleFixture,
} from '@designrail/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  closeDatabaseClient,
  complianceFindings,
  createDatabaseClient,
  type DatabaseClient,
} from './db/index.js';
import { buildServer, isLocalOrigin, resolveServerHost } from './server.js';

interface GraphQlResponse<TData> {
  data?: TData;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

describe('DesignRail GraphQL API', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;
  let client: DatabaseClient;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'designrail-graphql-'));
    client = createDatabaseClient({
      sqlitePath: join(tempDir, 'designrail.sqlite'),
    });
    app = await buildServer({
      logger: false,
      databaseClient: client,
      queryGuards: { maxAliases: 1 },
    });
  });

  afterEach(async () => {
    await app.close();
    closeDatabaseClient(client);
    rmSync(tempDir, { recursive: true, force: true });
  });

  async function graphql<TData>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GraphQlResponse<TData>> {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'content-type': 'application/json' },
      payload: { query, variables },
    });

    expect(response.statusCode).toBe(200);
    return response.json() as GraphQlResponse<TData>;
  }

  it('resolves examples with review summaries', async () => {
    const body = await graphql<{
      examples: Array<{
        complianceSummary: { blockers: number; info: number; warnings: number };
        id: string;
        latestDecisionStatus: string;
        name: string;
      }>;
    }>(`
      query Examples {
        examples {
          id
          name
          latestDecisionStatus
          complianceSummary {
            blockers
            warnings
            info
          }
        }
      }
    `);

    expect(body.errors).toBeUndefined();
    expect(body.data?.examples).toEqual([
      {
        complianceSummary: {
          blockers: 0,
          info: 3,
          warnings: 0,
        },
        id: buttonExampleFixture.id,
        latestDecisionStatus: 'PENDING',
        name: buttonExampleFixture.name,
      },
      {
        complianceSummary: {
          blockers: 0,
          info: 3,
          warnings: 0,
        },
        id: cardExampleFixture.id,
        latestDecisionStatus: 'PENDING',
        name: cardExampleFixture.name,
      },
      {
        complianceSummary: {
          blockers: 0,
          info: 3,
          warnings: 1,
        },
        id: inputExampleFixture.id,
        latestDecisionStatus: 'PENDING',
        name: inputExampleFixture.name,
      },
    ]);
  });

  it('counts every compliance finding in example summaries', async () => {
    const warningCount = 205;

    for (let index = 0; index < warningCount; index += 1) {
      client.db
        .insert(complianceFindings)
        .values({
          id: `finding.button.pagination-warning.${index}`,
          mappingId: buttonComponentMappingFixture.id,
          category: 'TOKEN_USAGE',
          severity: 'WARNING',
          message: 'Synthetic pagination warning',
          remediation: 'Count all findings when summarizing an example.',
          path: `synthetic.${index}`,
          blocking: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        })
        .run();
    }

    const body = await graphql<{
      examples: Array<{
        complianceSummary: { blockers: number; info: number; warnings: number };
        id: string;
      }>;
    }>(`
      query Examples {
        examples {
          id
          complianceSummary {
            blockers
            warnings
            info
          }
        }
      }
    `);

    const buttonExample = body.data?.examples.find(
      (example) => example.id === buttonExampleFixture.id,
    );

    expect(body.errors).toBeUndefined();
    expect(buttonExample?.complianceSummary).toEqual({
      blockers: 0,
      info: 3,
      warnings: warningCount,
    });
  });

  it('resolves the compliance ledger across every example', async () => {
    const body = await graphql<{
      complianceLedger: Array<{
        example: { id: string; name: string };
        finding: { id: string; severity: string };
      }>;
    }>(`
      query ComplianceLedger {
        complianceLedger {
          example {
            id
            name
          }
          finding {
            id
            severity
          }
        }
      }
    `);

    expect(body.errors).toBeUndefined();
    expect(body.data?.complianceLedger).toHaveLength(10);
    expect(body.data?.complianceLedger[0]).toMatchObject({
      example: { name: 'Input' },
      finding: { id: 'finding.input.email.token-usage', severity: 'WARNING' },
    });
  });

  it('resolves component intent by example id', async () => {
    const body = await graphql<{
      componentIntent: { id: string; componentType: string; variants: string[] } | null;
    }>(
      `
        query ComponentIntent($exampleId: ID!) {
          componentIntent(exampleId: $exampleId) {
            id
            componentType
            variants
          }
        }
      `,
      { exampleId: buttonExampleFixture.id },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.componentIntent).toMatchObject({
      componentType: 'Button',
      variants: ['primary', 'neutral'],
    });
  });

  it('resolves mapping by example id', async () => {
    const body = await graphql<{
      mapping: { id: string; targetComponent: string; mappedSlots: Record<string, unknown> } | null;
    }>(
      `
        query Mapping($exampleId: ID!) {
          mapping(exampleId: $exampleId) {
            id
            targetComponent
            mappedSlots
          }
        }
      `,
      { exampleId: buttonExampleFixture.id },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.mapping).toEqual({
      id: buttonComponentMappingFixture.id,
      targetComponent: 'sl-button',
      mappedSlots: {
        default: 'Save changes',
      },
    });
  });

  it('resolves the review workspace for the selected example', async () => {
    const body = await graphql<{
      reviewWorkspace: {
        example: { id: string; name: string };
        intent: { componentType: string } | null;
        mapping: { id: string; targetComponent: string } | null;
        complianceFindings: Array<{ mappingId: string; severity: string }>;
        latestDecision: { status: string } | null;
        decisionHistory: Array<{ status: string }>;
        exports: Array<{ id: string }>;
      } | null;
    }>(
      `
        query ReviewWorkspace($exampleId: ID!) {
          reviewWorkspace(exampleId: $exampleId) {
            example {
              id
              name
            }
            intent {
              componentType
            }
            mapping {
              id
              targetComponent
            }
            complianceFindings {
              mappingId
              severity
            }
            latestDecision {
              status
            }
            decisionHistory {
              status
            }
            exports {
              id
            }
          }
        }
      `,
      { exampleId: buttonExampleFixture.id },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.reviewWorkspace).toMatchObject({
      example: {
        id: buttonExampleFixture.id,
        name: 'Button',
      },
      intent: {
        componentType: 'Button',
      },
      mapping: {
        id: buttonComponentMappingFixture.id,
        targetComponent: 'sl-button',
      },
      complianceFindings: [
        {
          mappingId: buttonComponentMappingFixture.id,
          severity: 'INFO',
        },
        {
          mappingId: buttonComponentMappingFixture.id,
          severity: 'INFO',
        },
        {
          mappingId: buttonComponentMappingFixture.id,
          severity: 'INFO',
        },
      ],
      latestDecision: null,
      decisionHistory: [],
      exports: [],
    });
  });

  it('loads provenance fixtures into the GraphQL review workspace at startup', async () => {
    await app.close();
    const fixtureDir = join(tempDir, 'examples');
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(
      join(fixtureDir, 'figma-input.button.primary.12-34-3fec0ad9.json'),
      JSON.stringify({
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
      }),
    );
    app = await buildServer({
      logger: false,
      databaseClient: client,
      queryGuards: { maxAliases: 1 },
      runMigrations: false,
      figmaFixtureDirectory: fixtureDir,
    });

    const body = await graphql<{
      reviewWorkspace: {
        example: { name: string; source: string };
        intent: { source: string } | null;
        mapping: { targetComponent: string } | null;
      } | null;
    }>(
      `
        query ReviewWorkspace($exampleId: ID!) {
          reviewWorkspace(exampleId: $exampleId) {
            example {
              name
              source
            }
            intent {
              source
            }
            mapping {
              targetComponent
            }
          }
        }
      `,
      { exampleId: 'example.button.primary.12-34-3fec0ad9' },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.reviewWorkspace).toEqual({
      example: { name: 'Imported Button', source: 'FIGMA' },
      intent: { source: 'FIGMA' },
      mapping: { targetComponent: 'sl-button' },
    });
  });

  it('returns decision history alongside the latest decision', async () => {
    await graphql(
      `
        mutation SaveReviewDecision($input: SaveReviewDecisionInput!) {
          saveReviewDecision(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          mappingId: buttonComponentMappingFixture.id,
          status: 'ACCEPTED',
          reviewerLabel: 'GraphQL test',
        },
      },
    );
    await graphql(
      `
        mutation SaveReviewDecision($input: SaveReviewDecisionInput!) {
          saveReviewDecision(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          mappingId: buttonComponentMappingFixture.id,
          status: 'EDITED',
          reviewerLabel: 'GraphQL test',
          editedMapping: { mappedProps: { variant: 'neutral' } },
        },
      },
    );

    const body = await graphql<{
      reviewWorkspace: {
        decisionHistory: Array<{ status: string }>;
        latestDecision: { status: string } | null;
      } | null;
    }>(
      `
        query ReviewWorkspace($exampleId: ID!) {
          reviewWorkspace(exampleId: $exampleId) {
            decisionHistory {
              status
            }
            latestDecision {
              status
            }
          }
        }
      `,
      { exampleId: buttonExampleFixture.id },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.reviewWorkspace).toMatchObject({
      decisionHistory: [{ status: 'EDITED' }, { status: 'ACCEPTED' }],
      latestDecision: { status: 'EDITED' },
    });
  });

  it('persists a review decision mutation', async () => {
    const body = await graphql<{
      saveReviewDecision: { id: string; status: string; reviewerLabel: string };
    }>(
      `
        mutation SaveReviewDecision($input: SaveReviewDecisionInput!) {
          saveReviewDecision(input: $input) {
            id
            status
            reviewerLabel
          }
        }
      `,
      {
        input: {
          mappingId: buttonComponentMappingFixture.id,
          status: 'ACCEPTED',
          reviewerLabel: 'GraphQL test',
          notes: 'Ready to export.',
        },
      },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.saveReviewDecision).toMatchObject({
      status: 'ACCEPTED',
      reviewerLabel: 'GraphQL test',
    });
  });

  it('records client UI instrumentation events with a UI entity type', async () => {
    const body = await graphql<{
      recordUiEvent: { id: string; name: string; entityType: string; entityId: string };
    }>(
      `
        mutation RecordUiEvent($input: RecordUiEventInput!) {
          recordUiEvent(input: $input) {
            id
            name
            entityType
            entityId
          }
        }
      `,
      {
        input: {
          name: 'ui.view_changed',
          exampleId: buttonExampleFixture.id,
          metadata: { view: 'exports' },
        },
      },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.recordUiEvent).toMatchObject({
      name: 'ui.view_changed',
      entityType: 'UI',
      entityId: buttonExampleFixture.id,
    });
  });

  it('rejects UI instrumentation events outside the ui.* namespace', async () => {
    const body = await graphql<{ recordUiEvent: { id: string } }>(
      `
        mutation RecordUiEvent($input: RecordUiEventInput!) {
          recordUiEvent(input: $input) {
            id
          }
        }
      `,
      { input: { name: 'review_decision.saved' } },
    );

    expect(body.data ?? undefined).toBeUndefined();
    expect(body.errors?.[0]?.extensions?.['code']).toBe('BAD_USER_INPUT');
  });

  it('blocks export when no accepted or edited decision exists', async () => {
    const body = await graphql<{ exportMapping?: { id: string } }>(
      `
        mutation ExportMapping($input: ExportMappingInput!) {
          exportMapping(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          mappingId: buttonComponentMappingFixture.id,
          format: 'HTML',
        },
      },
    );

    expect(body.data?.exportMapping).toBeUndefined();
    expect(body.errors?.[0]?.extensions?.['code']).toBe('MAPPING_NOT_EXPORTABLE');
  });

  it('updates dashboard metrics after a decision', async () => {
    await graphql(
      `
        mutation SaveReviewDecision($input: SaveReviewDecisionInput!) {
          saveReviewDecision(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          mappingId: buttonComponentMappingFixture.id,
          status: 'EDITED',
          reviewerLabel: 'GraphQL test',
          editedMapping: {
            mappedProps: {
              variant: 'neutral',
            },
          },
        },
      },
    );

    const body = await graphql<{
      dashboardMetrics: {
        acceptedMappings: number;
        rejectedMappings: number;
        editedMappings: number;
        pendingMappings: number;
      };
    }>(`
      query DashboardMetrics {
        dashboardMetrics {
          acceptedMappings
          rejectedMappings
          editedMappings
          pendingMappings
        }
      }
    `);

    expect(body.errors).toBeUndefined();
    // Button is edited; the seeded Input and Card mappings have no decision yet, so they pend.
    expect(body.data?.dashboardMetrics).toEqual({
      acceptedMappings: 0,
      rejectedMappings: 0,
      editedMappings: 1,
      pendingMappings: 2,
    });
  });

  it('updates review workspace after decisions and exports', async () => {
    await graphql(
      `
        mutation SaveReviewDecision($input: SaveReviewDecisionInput!) {
          saveReviewDecision(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          mappingId: buttonComponentMappingFixture.id,
          status: 'ACCEPTED',
          reviewerLabel: 'GraphQL test',
        },
      },
    );

    await graphql(
      `
        mutation ExportMapping($input: ExportMappingInput!) {
          exportMapping(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          mappingId: buttonComponentMappingFixture.id,
          format: 'HTML',
        },
      },
    );

    const body = await graphql<{
      reviewWorkspace: {
        latestDecision: { status: string } | null;
        exports: Array<{ format: string; content: string }>;
      } | null;
      dashboardMetrics: { acceptedMappings: number; exportsCreated: number };
    }>(
      `
        query ReviewWorkspace($exampleId: ID!) {
          reviewWorkspace(exampleId: $exampleId) {
            latestDecision {
              status
            }
            exports {
              format
              content
            }
          }
          dashboardMetrics {
            acceptedMappings
            exportsCreated
          }
        }
      `,
      { exampleId: buttonExampleFixture.id },
    );

    expect(body.errors).toBeUndefined();
    expect(body.data?.reviewWorkspace).toMatchObject({
      latestDecision: {
        status: 'ACCEPTED',
      },
      exports: [
        {
          format: 'HTML',
          content: '<sl-button variant="primary" size="medium">Save changes</sl-button>',
        },
      ],
    });
    expect(body.data?.dashboardMetrics).toEqual({
      acceptedMappings: 1,
      exportsCreated: 1,
    });
  });

  it('allows local origins via CORS and ignores foreign ones', async () => {
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/graphql',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
      },
    });

    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const foreign = await app.inject({
      method: 'OPTIONS',
      url: '/graphql',
      headers: {
        origin: 'https://evil.example.com',
        'access-control-request-method': 'POST',
      },
    });

    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('blocks overly broad GraphQL queries before resolver execution', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/graphql',
      headers: { 'content-type': 'application/json' },
      payload: {
        query: `
          query TooManyAliases {
            a: dashboardMetrics { acceptedMappings }
            b: dashboardMetrics { acceptedMappings }
          }
        `,
      },
    });

    const body = response.json() as GraphQlResponse<unknown>;

    expect(body.errors?.[0]?.message).toContain('max aliases');
  });
});

describe('DesignRail API host binding', () => {
  it('binds to localhost by default', () => {
    expect(resolveServerHost({})).toBe('127.0.0.1');
  });

  it('requires explicit opt-in for non-local hosts', () => {
    expect(() => resolveServerHost({ HOST: '0.0.0.0' })).toThrow('DESIGNRAIL_ALLOW_NETWORK=true');
    expect(resolveServerHost({ HOST: '0.0.0.0', DESIGNRAIL_ALLOW_NETWORK: 'true' })).toBe(
      '0.0.0.0',
    );
  });

  it('recognizes local development origins on any port', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true);
    expect(isLocalOrigin('http://127.0.0.1:4000')).toBe(true);
    expect(isLocalOrigin('https://example.com')).toBe(false);
    expect(isLocalOrigin(undefined)).toBe(false);
  });
});
