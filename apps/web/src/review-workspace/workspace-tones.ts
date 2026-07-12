import type { ReviewDecisionStatus } from '@designrail/shared';

import type { ComplianceFindingResult } from '../graphql/operations.js';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'edited' | 'neutral';

export const STATUS_TONES: Record<ReviewDecisionStatus, Tone> = {
  ACCEPTED: 'success',
  EDITED: 'edited',
  PENDING: 'warning',
  REJECTED: 'danger',
};

export const SEVERITY_TONES: Record<ComplianceFindingResult['severity'], Tone> = {
  BLOCKER: 'danger',
  WARNING: 'warning',
  INFO: 'info',
};

const TONE_CLASSES: Record<Tone, { text: string; bg: string }> = {
  success: { text: 'text-dr-success', bg: 'bg-dr-success' },
  warning: { text: 'text-dr-warning', bg: 'bg-dr-warning' },
  danger: { text: 'text-dr-danger', bg: 'bg-dr-danger' },
  info: { text: 'text-dr-info', bg: 'bg-dr-info' },
  edited: { text: 'text-dr-edited', bg: 'bg-dr-edited' },
  neutral: { text: 'text-dr-muted', bg: 'bg-dr-muted' },
};

export function getToneTextClass(tone: Tone): string {
  return TONE_CLASSES[tone].text;
}

export function getToneBackgroundClass(tone: Tone): string {
  return TONE_CLASSES[tone].bg;
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
