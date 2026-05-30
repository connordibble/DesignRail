import {
  DESIGNRAIL_GRAPHQL_SCHEMA,
  type ExportFormat,
  type MappingEdit,
  type ReviewDecisionStatus,
} from '@designrail/shared';
import {
  GraphQLError,
  GraphQLScalarType,
  Kind,
  type ObjectValueNode,
  type ValueNode,
} from 'graphql';
import { gql } from 'graphql-tag';

import type { DatabaseClient } from './db/index.js';
import {
  createExport,
  getComponentIntentByExampleId,
  getDashboardMetrics,
  getMappingByExampleId,
  getReviewWorkspace,
  listComplianceFindingsByMappingId,
  listExamples,
  listReviewDecisions,
  recordInstrumentationEvent,
  saveReviewDecision,
} from './repositories/index.js';

export const typeDefs = gql(DESIGNRAIL_GRAPHQL_SCHEMA);

interface ExampleIdArgs {
  exampleId: string;
}

interface MappingIdArgs {
  mappingId: string;
  limit?: number;
}

interface LimitArgs {
  limit?: number;
}

interface ReviewWorkspaceArgs {
  exampleId: string;
}

interface SaveReviewDecisionArgs {
  input: {
    mappingId: string;
    status: ReviewDecisionStatus;
    reviewerLabel: string;
    editedMapping?: MappingEdit;
    notes?: string;
  };
}

interface ExportMappingArgs {
  input: {
    mappingId: string;
    format: ExportFormat;
  };
}

const jsonScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON values for structured DesignRail metadata.',
  serialize: (value: unknown) => value,
  parseValue: (value: unknown) => value,
  parseLiteral: (ast: ValueNode): unknown => parseJsonLiteral(ast),
});

function parseJsonLiteral(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return ast.values.map(parseJsonLiteral);
    case Kind.OBJECT:
      return parseJsonObjectLiteral(ast);
    case Kind.ENUM:
      return ast.value;
    case Kind.VARIABLE:
      return undefined;
  }
}

function parseJsonObjectLiteral(ast: ObjectValueNode): Record<string, unknown> {
  return Object.fromEntries(
    ast.fields.map((field) => [field.name.value, parseJsonLiteral(field.value)]),
  );
}

export function createResolvers(client: DatabaseClient) {
  return {
    JSON: jsonScalar,
    Query: {
      examples: (_parent: unknown, args: LimitArgs) => listExamples(client, args),
      componentIntent: (_parent: unknown, args: ExampleIdArgs) =>
        getComponentIntentByExampleId(client, args.exampleId),
      mapping: (_parent: unknown, args: ExampleIdArgs) =>
        getMappingByExampleId(client, args.exampleId),
      compliance: (_parent: unknown, args: MappingIdArgs) =>
        listComplianceFindingsByMappingId(client, args.mappingId, args),
      reviewDecisions: (_parent: unknown, args: LimitArgs) => listReviewDecisions(client, args),
      dashboardMetrics: () => getDashboardMetrics(client),
      reviewWorkspace: (_parent: unknown, args: ReviewWorkspaceArgs) =>
        getReviewWorkspace(client, args.exampleId),
    },
    Mutation: {
      saveReviewDecision: (_parent: unknown, args: SaveReviewDecisionArgs) => {
        const decision = saveReviewDecision(client, args.input);

        recordInstrumentationEvent(client, {
          name: 'review_decision.saved',
          entityType: 'REVIEW_DECISION',
          entityId: decision.id,
          metadata: {
            mappingId: decision.mappingId,
            status: decision.status,
          },
        });

        return decision;
      },
      exportMapping: (_parent: unknown, args: ExportMappingArgs) => {
        const outcome = createExport(client, args.input);

        if (!outcome.ok) {
          throw new GraphQLError(outcome.message, {
            extensions: {
              code: outcome.code,
            },
          });
        }

        recordInstrumentationEvent(client, {
          name: 'mapping.exported',
          entityType: 'EXPORT',
          entityId: outcome.exportResult.id,
          metadata: {
            mappingId: outcome.exportResult.mappingId,
            format: outcome.exportResult.format,
          },
        });

        return outcome.exportResult;
      },
    },
  };
}
