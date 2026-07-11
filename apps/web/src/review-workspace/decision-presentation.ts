import type { ReviewDecisionStatus } from '@designrail/shared';

import type {
  ComplianceFindingResult,
  ExampleResult,
  ReviewDecisionResult,
} from '../graphql/operations.js';

import type { Tone } from './workspace-tones.js';

export const SEVERITY_ORDER: Record<ComplianceFindingResult['severity'], number> = {
  BLOCKER: 0,
  WARNING: 1,
  INFO: 2,
};

export function getDecisionStatus(decision: ReviewDecisionResult | null): ReviewDecisionStatus {
  return decision?.status ?? 'PENDING';
}

export function getDecisionSummary(status: ReviewDecisionStatus): {
  description: string;
  label: string;
  tone: Tone;
} {
  switch (status) {
    case 'ACCEPTED':
      return {
        description: 'The recommended mapping is approved and ready to export.',
        label: 'Accepted by reviewer',
        tone: 'success',
      };
    case 'EDITED':
      return {
        description: 'Human edits are saved and ready to export.',
        label: 'Edited by reviewer',
        tone: 'edited',
      };
    case 'PENDING':
      return {
        description: 'Accept, edit, or reject this mapping before export.',
        label: 'Pending review',
        tone: 'warning',
      };
    case 'REJECTED':
      return {
        description: 'The mapping was rejected and export is unavailable.',
        label: 'Rejected by reviewer',
        tone: 'danger',
      };
  }
}

export function getExportGateSummary(status: ReviewDecisionStatus): { label: string; tone: Tone } {
  switch (status) {
    case 'ACCEPTED':
    case 'EDITED':
      return { label: 'Ready', tone: 'success' };
    case 'REJECTED':
      return { label: 'Locked', tone: 'danger' };
    case 'PENDING':
      return { label: 'Locked', tone: 'warning' };
  }
}

function countFindings(
  findings: ComplianceFindingResult[],
): Record<ComplianceFindingResult['severity'], number> {
  const counts = { BLOCKER: 0, WARNING: 0, INFO: 0 };
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  return counts;
}

export function summarizeFindings(findings: ComplianceFindingResult[]): string {
  const counts = countFindings(findings);

  const parts: string[] = [];
  if (counts.BLOCKER > 0) {
    parts.push(`${counts.BLOCKER} blocking`);
  }
  if (counts.WARNING > 0) {
    parts.push(`${counts.WARNING} ${counts.WARNING === 1 ? 'warning' : 'warnings'}`);
  }
  if (counts.INFO > 0) {
    parts.push(`${counts.INFO} informational`);
  }

  return parts.join(' · ');
}

export function getComplianceSummary(findings: ComplianceFindingResult[]): {
  label: string;
  tone: Tone;
} {
  const counts = countFindings(findings);

  if (counts.BLOCKER > 0) {
    return {
      label: `${counts.BLOCKER} ${counts.BLOCKER === 1 ? 'blocker' : 'blockers'}`,
      tone: 'danger',
    };
  }

  if (counts.WARNING > 0) {
    return {
      label: `${counts.WARNING} ${counts.WARNING === 1 ? 'warning' : 'warnings'}`,
      tone: 'warning',
    };
  }

  if (counts.INFO > 0) {
    return { label: `${counts.INFO} informational`, tone: 'info' };
  }

  return { label: 'Clear', tone: 'success' };
}

export function summarizeExampleCompliance(summary: ExampleResult['complianceSummary']): string {
  if (summary.blockers > 0) {
    return `${summary.blockers} ${summary.blockers === 1 ? 'blocker' : 'blockers'}`;
  }

  if (summary.warnings > 0) {
    return `${summary.warnings} ${summary.warnings === 1 ? 'warning' : 'warnings'}`;
  }

  if (summary.info > 0) {
    return `${summary.info} info`;
  }

  return 'Clear';
}

export function getExampleComplianceTone(summary: ExampleResult['complianceSummary']): Tone {
  if (summary.blockers > 0) {
    return 'danger';
  }

  if (summary.warnings > 0) {
    return 'warning';
  }

  if (summary.info > 0) {
    return 'info';
  }

  return 'success';
}
