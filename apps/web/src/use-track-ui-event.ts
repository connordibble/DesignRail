import { useMutation } from '@apollo/client/react';
import type { Metadata } from '@designrail/shared';
import { useCallback } from 'react';

import {
  RECORD_UI_EVENT_MUTATION,
  type RecordUiEventMutation,
  type RecordUiEventMutationVariables,
} from './graphql/operations.js';

export interface TrackUiEventOptions {
  exampleId?: string;
  metadata?: Metadata;
}

export type TrackUiEvent = (name: string, options?: TrackUiEventOptions) => void;

/**
 * Fire-and-forget client instrumentation over the same GraphQL contract the review
 * mutations use. Events land in the API-owned instrumentation ledger next to the
 * server-recorded decision and export events; failures are swallowed so telemetry
 * can never interrupt the review flow.
 */
export function useTrackUiEvent(): TrackUiEvent {
  const [recordUiEvent] = useMutation<RecordUiEventMutation, RecordUiEventMutationVariables>(
    RECORD_UI_EVENT_MUTATION,
  );

  return useCallback(
    (name, options) => {
      recordUiEvent({
        variables: {
          input: {
            name,
            ...(options?.exampleId === undefined ? {} : { exampleId: options.exampleId }),
            metadata: options?.metadata ?? {},
          },
        },
      }).catch(() => {
        // Instrumentation must never break the review flow.
      });
    },
    [recordUiEvent],
  );
}
