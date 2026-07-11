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
    <div className="grid gap-dr-md xl:grid-cols-[22rem_minmax(0,1fr)]">
      <Panel title="Dashboard">
        <p className="text-dr-caption text-dr-subtle">
          Decision and export volume across all reviewed components.
        </p>
        <dl className="mt-dr-sm divide-y divide-dr-border">
          {METRIC_ITEMS.map((item) => (
            <div className="flex items-baseline justify-between gap-dr-sm py-dr-xs" key={item.key}>
              <dt className="text-dr-small text-dr-muted">{item.label}</dt>
              <dd className="font-mono text-dr-section-title font-semibold tabular-nums text-dr-text">
                {metrics[item.key]}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <div className="grid min-w-0 content-start gap-dr-md">
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
            <ul className="divide-y divide-dr-border">
              {metrics.commonComplianceWarnings.map((warning) => (
                <li
                  className="flex items-baseline justify-between gap-dr-sm py-dr-xs"
                  key={warning.message}
                >
                  <span className="min-w-0 text-dr-small text-dr-text">{warning.message}</span>
                  <span className="shrink-0 font-mono text-dr-caption tabular-nums text-dr-subtle">
                    {warning.count} matches
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
