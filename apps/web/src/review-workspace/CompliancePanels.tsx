import type { ReactElement } from 'react';

import type {
  ComplianceFindingResult,
  ComplianceLedgerEntryResult,
} from '../graphql/operations.js';

import {
  SEVERITY_ORDER,
  getComplianceSummary,
  summarizeFindings,
} from './decision-presentation.js';
import { EmptyLine, Panel, StatusBadge, StatusDot } from './primitives.js';
import { SEVERITY_TONES, cx, getToneTextClass } from './workspace-tones.js';

interface ComplianceTimelinePanelProps {
  entries: ComplianceLedgerEntryResult[];
}

interface ComplianceLedgerGroup {
  example: ComplianceLedgerEntryResult['example'];
  findings: ComplianceFindingResult[];
}

export function ComplianceTimelinePanel({ entries }: ComplianceTimelinePanelProps): ReactElement {
  if (entries.length === 0) {
    return (
      <Panel title="Compliance Timeline">
        <EmptyLine text="No compliance findings recorded across any component." />
      </Panel>
    );
  }

  const groups = groupLedgerByExample(entries);

  return (
    <Panel title="Compliance Timeline">
      <p className="text-dr-caption text-dr-subtle">
        {summarizeFindings(entries.map((entry) => entry.finding))} across {groups.length}{' '}
        {groups.length === 1 ? 'component' : 'components'}
      </p>
      <div className="mt-dr-md grid gap-dr-md">
        {groups.map((group) => {
          const groupSummary = getComplianceSummary(group.findings);

          return (
            <section className="grid gap-dr-xs" key={group.example.id}>
              <div className="flex flex-wrap items-center gap-dr-sm">
                <span className="text-dr-section-title font-semibold text-dr-text">
                  {group.example.name}
                </span>
                <StatusBadge label={groupSummary.label} tone={groupSummary.tone} />
              </div>
              <ul className="divide-y divide-dr-border">
                {group.findings.map((finding) => (
                  <ComplianceFindingRow finding={finding} key={finding.id} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Panel>
  );
}

/** Groups ledger entries by example, preserving the server's severity-first ordering: the first
 * example to appear (via its most severe finding) is the first group. */
function groupLedgerByExample(entries: ComplianceLedgerEntryResult[]): ComplianceLedgerGroup[] {
  const groups = new Map<string, ComplianceLedgerGroup>();

  for (const entry of entries) {
    const existing = groups.get(entry.example.id);

    if (existing === undefined) {
      groups.set(entry.example.id, { example: entry.example, findings: [entry.finding] });
    } else {
      existing.findings.push(entry.finding);
    }
  }

  return [...groups.values()];
}

function ComplianceFindingRow({ finding }: { finding: ComplianceFindingResult }): ReactElement {
  return (
    <li className="flex flex-col gap-dr-xxs py-dr-sm sm:flex-row sm:items-start sm:gap-dr-md">
      <span className="flex flex-col gap-dr-xxs sm:w-48 sm:shrink-0">
        <span className="flex items-center gap-dr-xs">
          <StatusDot tone={SEVERITY_TONES[finding.severity]} />
          <span
            className={cx(
              'text-dr-caption font-semibold',
              getToneTextClass(SEVERITY_TONES[finding.severity]),
            )}
          >
            {finding.severity}
          </span>
        </span>
        <span className="break-words font-mono text-dr-caption text-dr-subtle">
          {finding.category}
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-dr-small text-dr-text">{finding.message}</span>
        <span className="mt-dr-xxs block text-dr-small text-dr-muted">{finding.remediation}</span>
      </span>
      {finding.path ? (
        <span className="font-mono text-dr-caption text-dr-subtle sm:text-right">
          {finding.path}
        </span>
      ) : null}
    </li>
  );
}

interface ComplianceBandProps {
  findings: ComplianceFindingResult[];
}

export function ComplianceBand({ findings }: ComplianceBandProps): ReactElement {
  if (findings.length === 0) {
    return (
      <Panel title="Compliance">
        <EmptyLine text="No compliance findings recorded." />
      </Panel>
    );
  }

  const ordered = [...findings].sort(
    (left, right) =>
      SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity] ||
      left.id.localeCompare(right.id),
  );

  return (
    <Panel title="Compliance">
      <p className="text-dr-caption text-dr-subtle">{summarizeFindings(findings)}</p>
      <ul className="mt-dr-sm divide-y divide-dr-border">
        {ordered.map((finding) => (
          <ComplianceFindingRow finding={finding} key={finding.id} />
        ))}
      </ul>
    </Panel>
  );
}
