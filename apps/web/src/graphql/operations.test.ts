import type { TypedDocumentNode } from '@apollo/client';
import { DESIGNRAIL_GRAPHQL_SCHEMA } from '@designrail/shared';
import { buildSchema, validate } from 'graphql';
import { describe, expect, it } from 'vitest';

import {
  EXPORT_MAPPING_MUTATION,
  REVIEW_WORKSPACE_QUERY,
  SAVE_REVIEW_DECISION_MUTATION,
  type ExportMappingMutation,
  type ExportMappingMutationVariables,
  type ReviewWorkspaceQuery,
  type ReviewWorkspaceQueryVariables,
  type SaveReviewDecisionMutation,
  type SaveReviewDecisionMutationVariables,
} from './operations.js';

const apiSchema = buildSchema(DESIGNRAIL_GRAPHQL_SCHEMA);

describe('GraphQL operation documents', () => {
  it('exports explicitly typed review workspace, decision, and export operations', () => {
    const reviewWorkspaceDocument: TypedDocumentNode<
      ReviewWorkspaceQuery,
      ReviewWorkspaceQueryVariables
    > = REVIEW_WORKSPACE_QUERY;
    const saveDecisionDocument: TypedDocumentNode<
      SaveReviewDecisionMutation,
      SaveReviewDecisionMutationVariables
    > = SAVE_REVIEW_DECISION_MUTATION;
    const exportMappingDocument: TypedDocumentNode<
      ExportMappingMutation,
      ExportMappingMutationVariables
    > = EXPORT_MAPPING_MUTATION;

    expect(reviewWorkspaceDocument.kind).toBe('Document');
    expect(saveDecisionDocument.kind).toBe('Document');
    expect(exportMappingDocument.kind).toBe('Document');
  });

  it('validates web operations against the API schema', () => {
    const operationDocuments = [
      REVIEW_WORKSPACE_QUERY,
      SAVE_REVIEW_DECISION_MUTATION,
      EXPORT_MAPPING_MUTATION,
    ];

    for (const document of operationDocuments) {
      expect(validate(apiSchema, document)).toEqual([]);
    }
  });
});
