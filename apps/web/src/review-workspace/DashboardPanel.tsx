import type { DashboardMetrics } from '@designrail/shared';
import type { ReactElement } from 'react';

import type { ReviewWorkspace } from '../graphql/operations.js';

import { getDecisionStatus } from './decision-presentation.js';
import { DefinitionList, EmptyLine, Panel } from './primitives.js';

const METRIC_ITEMS = [
  { key: 'acceptedMappings', label: 'Accepted' },
  { key: 'editedMappings', label: 'Edited' },
  { key: 'rejectedMappings', label: 'Rejected' },
  { key: 'pendingMappings', label: 'Pending' },
  { key: 'exportsCreated', label: 'Exports' },
] as const;

interface DashboardPanelProps {
  metrics: DashboardMetrics;
  workspace: ReviewWorkspace;
}

export function DashboardPanel({ metrics, workspace }: DashboardPanelProps): ReactElement {
  return (
    <div className="grid gap-dr-md">
      <Panel title="Dashboard">
        <div className="grid gap-dr-xs sm:grid-cols-2 xl:grid-cols-5">
          {METRIC_ITEMS.map((item) => (
            <div
              className="rounded-dr-sm border border-dr-border bg-dr-panel-raised p-dr-sm"
              key={item.key}
            >
              <p className="text-dr-caption font-medium text-dr-subtle">{item.label}</p>
              <p className="mt-dr-xs text-dr-page-title font-semibold text-dr-text">
                {metrics[item.key]}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-dr-md xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel title="Current Mapping">
          <DefinitionList
            items={[
              ['Example', workspace.example.name],
              ['Intent', workspace.intent?.summary ?? 'No intent recorded'],
              ['Target', workspace.mapping?.targetComponent ?? 'No mapping recorded'],
              ['Decision', getDecisionStatus(workspace.latestDecision)],
            ]}
          />
        </Panel>

        <Panel title="Warnings">
          {metrics.commonComplianceWarnings.length === 0 ? (
            <EmptyLine text="No recurring blocker or warning findings." />
          ) : (
            <div className="grid gap-dr-xs">
              {metrics.commonComplianceWarnings.map((warning) => (
                <div
                  className="rounded-dr-sm border border-dr-border bg-dr-panel-raised p-dr-sm"
                  key={warning.message}
                >
                  <p className="text-dr-small text-dr-text">{warning.message}</p>
                  <p className="mt-dr-xxs text-dr-caption text-dr-subtle">
                    {warning.count} matches
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
