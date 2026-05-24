import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buttonComponentMappingFixture,
  buttonExampleFixture,
  FIXTURE_TIMESTAMP,
} from '@designrail/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeDatabaseClient, createDatabaseClient, type DatabaseClient } from './db/index.js';
import { buildServer } from './server.js';

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
    app = await buildServer({ logger: false, databaseClient: client });
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

  it('resolves examples', async () => {
    const body = await graphql<{ examples: Array<{ id: string; name: string }> }>(`
      query Examples {
        examples {
          id
          name
        }
      }
    `);

    expect(body.errors).toBeUndefined();
    expect(body.data?.examples).toEqual([
      {
        id: buttonExampleFixture.id,
        name: buttonExampleFixture.name,
      },
    ]);
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
      variants: ['primary', 'secondary'],
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
            reviewedAt: FIXTURE_TIMESTAMP,
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
    expect(body.data?.dashboardMetrics).toEqual({
      acceptedMappings: 0,
      rejectedMappings: 0,
      editedMappings: 1,
      pendingMappings: 0,
    });
  });
});
