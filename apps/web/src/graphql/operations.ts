import { gql, type TypedDocumentNode } from '@apollo/client';
import type {
  ComponentIntent,
  ComponentMapping,
  ComplianceFinding,
  DashboardMetrics,
  Example,
  ExportFormat,
  ExportResult,
  MappingEdit,
  ReviewDecision,
  ReviewDecisionStatus,
} from '@designrail/shared';

export interface ReviewWorkspace {
  example: Example;
  intent: ComponentIntent | null;
  mapping: ComponentMapping | null;
  complianceFindings: ComplianceFinding[];
  latestDecision: ReviewDecision | null;
  exports: ExportResult[];
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
  saveReviewDecision: ReviewDecision;
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
