import type { ReactElement } from 'react';

import { Button } from '../ui/Button.js';

import { Panel } from './primitives.js';

export function LoadingWorkspace(): ReactElement {
  return (
    <div aria-live="polite" className="grid gap-dr-md" role="status">
      <Panel title="Loading">
        <div className="grid gap-dr-sm">
          <div className="h-4 w-48 rounded-dr-sm bg-dr-panel-raised" />
          <div className="h-20 rounded-dr-sm bg-dr-panel-raised" />
          <div className="h-20 rounded-dr-sm bg-dr-panel-raised" />
        </div>
      </Panel>
    </div>
  );
}

interface ErrorWorkspaceProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorWorkspace({ message, onRetry }: ErrorWorkspaceProps): ReactElement {
  return (
    <div className="rounded-dr-md border border-dr-danger bg-dr-panel p-dr-md" role="alert">
      <p className="text-dr-section-title font-semibold text-dr-danger">Workspace failed</p>
      <p className="mt-dr-xs text-dr-small text-dr-muted">{message}</p>
      <p className="mt-dr-xs text-dr-small text-dr-subtle">
        Check that the local GraphQL API is running (`pnpm dev` starts it on :4000), then retry.
      </p>
      {onRetry === undefined ? null : (
        <Button className="mt-dr-sm" onClick={onRetry} size="sm" variant="secondary">
          Retry request
        </Button>
      )}
    </div>
  );
}

interface EmptyWorkspaceProps {
  exampleId: string;
}

export function EmptyWorkspace({ exampleId }: EmptyWorkspaceProps): ReactElement {
  return (
    <div className="rounded-dr-md border border-dr-border bg-dr-panel p-dr-md">
      <p className="text-dr-section-title font-semibold text-dr-text">No workspace found</p>
      <p className="mt-dr-xs font-mono text-dr-caption text-dr-subtle">{exampleId}</p>
    </div>
  );
}
