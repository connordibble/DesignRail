import type { ExportFormat, MappingEdit, ReviewDecisionStatus } from '@designrail/shared';
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
  listComplianceFindingsByMappingId,
  listExamples,
  listReviewDecisions,
  recordInstrumentationEvent,
  saveReviewDecision,
} from './repositories/index.js';

export const typeDefs = gql`
  scalar JSON

  enum ComponentSource {
    MOCK
    FIGMA
  }

  enum ExampleStatus {
    READY
    DISABLED
  }

  enum TargetLibrary {
    SHOELACE
  }

  enum MappingConfidence {
    HIGH
    MEDIUM
    LOW
  }

  enum ComplianceCategory {
    ACCESSIBILITY
    TOKEN_USAGE
    VARIANT_COVERAGE
    REACT_READINESS
    DOCUMENTATION_READINESS
    DESIGN_SYSTEM_ALIGNMENT
  }

  enum ComplianceSeverity {
    BLOCKER
    WARNING
    INFO
  }

  enum ReviewDecisionStatus {
    PENDING
    ACCEPTED
    REJECTED
    EDITED
  }

  enum ExportFormat {
    HTML
    REACT
    AGENT_BRIEF
  }

  type Example {
    id: ID!
    name: String!
    componentType: String!
    fixturePath: String!
    source: ComponentSource!
    status: ExampleStatus!
  }

  type SourceReference {
    type: String!
    id: String!
    name: String
  }

  type TokenReference {
    name: String!
    value: String
    target: String
  }

  type AccessibilityMetadata {
    label: String
    role: String
    description: String
    required: Boolean!
  }

  type ComponentIntent {
    id: ID!
    exampleId: ID!
    source: ComponentSource!
    sourceRefs: [SourceReference!]!
    componentName: String!
    componentType: String!
    summary: String!
    props: JSON!
    variants: [String!]!
    states: [String!]!
    tokenRefs: [TokenReference!]!
    accessibility: AccessibilityMetadata!
    createdAt: String!
  }

  type ComponentMapping {
    id: ID!
    intentId: ID!
    targetLibrary: TargetLibrary!
    targetComponent: String!
    mappedProps: JSON!
    mappedEvents: JSON!
    mappedSlots: JSON!
    mappedTokens: [TokenReference!]!
    confidence: MappingConfidence!
    rationale: String!
    fallbackNotes: String
    createdAt: String!
  }

  type ComplianceFinding {
    id: ID!
    mappingId: ID!
    category: ComplianceCategory!
    severity: ComplianceSeverity!
    message: String!
    remediation: String!
    path: String
    blocking: Boolean!
    createdAt: String!
  }

  type ReviewDecision {
    id: ID!
    mappingId: ID!
    status: ReviewDecisionStatus!
    reviewerLabel: String!
    editedMapping: JSON
    notes: String
    createdAt: String!
  }

  type ExportResult {
    id: ID!
    mappingId: ID!
    format: ExportFormat!
    content: String!
    createdAt: String!
  }

  type DashboardWarning {
    message: String!
    count: Int!
  }

  type DashboardMetrics {
    acceptedMappings: Int!
    rejectedMappings: Int!
    editedMappings: Int!
    pendingMappings: Int!
    exportsCreated: Int!
    commonComplianceWarnings: [DashboardWarning!]!
  }

  input TokenReferenceInput {
    name: String!
    value: String
    target: String
  }

  input MappingEditInput {
    targetComponent: String
    mappedProps: JSON
    mappedEvents: JSON
    mappedSlots: JSON
    mappedTokens: [TokenReferenceInput!]
    confidence: MappingConfidence
    rationale: String
    fallbackNotes: String
  }

  input SaveReviewDecisionInput {
    mappingId: ID!
    status: ReviewDecisionStatus!
    reviewerLabel: String!
    editedMapping: MappingEditInput
    notes: String
  }

  input ExportMappingInput {
    mappingId: ID!
    format: ExportFormat!
  }

  type Query {
    examples(limit: Int = 50): [Example!]!
    componentIntent(exampleId: ID!): ComponentIntent
    mapping(exampleId: ID!): ComponentMapping
    compliance(mappingId: ID!, limit: Int = 50): [ComplianceFinding!]!
    reviewDecisions(limit: Int = 100): [ReviewDecision!]!
    dashboardMetrics: DashboardMetrics!
  }

  type Mutation {
    saveReviewDecision(input: SaveReviewDecisionInput!): ReviewDecision!
    exportMapping(input: ExportMappingInput!): ExportResult!
  }
`;

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
