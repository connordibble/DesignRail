import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  ComponentSource,
  ComplianceCategory,
  ComplianceSeverity,
  DashboardMetrics,
  ExampleStatus,
  ExportFormat,
  MappingEdit,
  MappingConfidence,
  Metadata,
  ReviewDecisionStatus,
  TargetLibrary,
} from '@designrail/shared';

export interface ExampleResult {
  id: string;
  name: string;
  componentType: string;
  fixturePath: string;
  source: ComponentSource;
  status: ExampleStatus;
  latestDecisionStatus: ReviewDecisionStatus;
  complianceSummary: ComplianceSeverityCountsResult;
}

export interface ComplianceSeverityCountsResult {
  blockers: number;
  warnings: number;
  info: number;
}

export interface SourceReferenceResult {
  type: string;
  id: string;
  name: string | null;
}

export interface TokenReferenceResult {
  name: string;
  value: string | null;
  target: string | null;
}

export interface AccessibilityMetadataResult {
  label: string | null;
  role: string | null;
  description: string | null;
  required: boolean;
}

export interface ComponentIntentResult {
  id: string;
  exampleId: string;
  source: ComponentSource;
  sourceRefs: SourceReferenceResult[];
  componentName: string;
  componentType: string;
  summary: string;
  props: Metadata;
  variants: string[];
  states: string[];
  tokenRefs: TokenReferenceResult[];
  accessibility: AccessibilityMetadataResult;
  createdAt: string;
}

export interface ComponentMappingResult {
  id: string;
  intentId: string;
  targetLibrary: TargetLibrary;
  targetComponent: string;
  mappedProps: Metadata;
  mappedEvents: Metadata;
  mappedSlots: Metadata;
  mappedTokens: TokenReferenceResult[];
  confidence: MappingConfidence;
  rationale: string;
  fallbackNotes: string | null;
  createdAt: string;
}

export interface ComplianceFindingResult {
  id: string;
  mappingId: string;
  category: ComplianceCategory;
  severity: ComplianceSeverity;
  message: string;
  remediation: string;
  path: string | null;
  blocking: boolean;
  createdAt: string;
}

export interface ReviewDecisionResult {
  id: string;
  mappingId: string;
  status: ReviewDecisionStatus;
  reviewerLabel: string;
  editedMapping: MappingEdit | null;
  notes: string | null;
  createdAt: string;
}

export interface ExportResult {
  id: string;
  mappingId: string;
  format: ExportFormat;
  content: string;
  createdAt: string;
}

export interface ReviewWorkspace {
  example: ExampleResult;
  intent: ComponentIntentResult | null;
  mapping: ComponentMappingResult | null;
  complianceFindings: ComplianceFindingResult[];
  latestDecision: ReviewDecisionResult | null;
  decisionHistory: ReviewDecisionResult[];
  exports: ExportResult[];
}

export interface ExamplesQuery {
  examples: ExampleResult[];
}

export interface ReviewWorkspaceQuery {
  reviewWorkspace: ReviewWorkspace | null;
  dashboardMetrics: DashboardMetrics;
}

export interface ReviewWorkspaceQueryVariables {
  exampleId: string;
}

export interface SaveReviewDecisionInput {
  mappingId: string;
  status: ReviewDecisionStatus;
  reviewerLabel: string;
  editedMapping?: MappingEdit;
  notes?: string;
}

export interface SaveReviewDecisionMutation {
  saveReviewDecision: ReviewDecisionResult;
}

export interface SaveReviewDecisionMutationVariables {
  input: SaveReviewDecisionInput;
}

export interface ExportMappingInput {
  mappingId: string;
  format: ExportFormat;
}

export interface ExportMappingMutation {
  exportMapping: ExportResult;
}

export interface ExportMappingMutationVariables {
  input: ExportMappingInput;
}

export const EXAMPLES_QUERY: TypedDocumentNode<ExamplesQuery, Record<string, never>> = gql`
  query Examples {
    examples {
      id
      name
      componentType
      fixturePath
      source
      status
      latestDecisionStatus
      complianceSummary {
        blockers
        warnings
        info
      }
    }
  }
`;

export const REVIEW_WORKSPACE_QUERY: TypedDocumentNode<
  ReviewWorkspaceQuery,
  ReviewWorkspaceQueryVariables
> = gql`
  query ReviewWorkspace($exampleId: ID!) {
    reviewWorkspace(exampleId: $exampleId) {
      example {
        id
        name
        componentType
        fixturePath
        source
        status
        latestDecisionStatus
        complianceSummary {
          blockers
          warnings
          info
        }
      }
      intent {
        id
        exampleId
        source
        sourceRefs {
          type
          id
          name
        }
        componentName
        componentType
        summary
        props
        variants
        states
        tokenRefs {
          name
          value
          target
        }
        accessibility {
          label
          role
          description
          required
        }
        createdAt
      }
      mapping {
        id
        intentId
        targetLibrary
        targetComponent
        mappedProps
        mappedEvents
        mappedSlots
        mappedTokens {
          name
          value
          target
        }
        confidence
        rationale
        fallbackNotes
        createdAt
      }
      complianceFindings {
        id
        mappingId
        category
        severity
        message
        remediation
        path
        blocking
        createdAt
      }
      latestDecision {
        id
        mappingId
        status
        reviewerLabel
        editedMapping
        notes
        createdAt
      }
      decisionHistory {
        id
        mappingId
        status
        reviewerLabel
        editedMapping
        notes
        createdAt
      }
      exports {
        id
        mappingId
        format
        content
        createdAt
      }
    }
    dashboardMetrics {
      acceptedMappings
      rejectedMappings
      editedMappings
      pendingMappings
      exportsCreated
      commonComplianceWarnings {
        message
        count
      }
    }
  }
`;

export const SAVE_REVIEW_DECISION_MUTATION: TypedDocumentNode<
  SaveReviewDecisionMutation,
  SaveReviewDecisionMutationVariables
> = gql`
  mutation SaveReviewDecision($input: SaveReviewDecisionInput!) {
    saveReviewDecision(input: $input) {
      id
      mappingId
      status
      reviewerLabel
      editedMapping
      notes
      createdAt
    }
  }
`;

export const EXPORT_MAPPING_MUTATION: TypedDocumentNode<
  ExportMappingMutation,
  ExportMappingMutationVariables
> = gql`
  mutation ExportMapping($input: ExportMappingInput!) {
    exportMapping(input: $input) {
      id
      mappingId
      format
      content
      createdAt
    }
  }
`;
