export const TOOL_NAME = '@designrail/compliance-agent';

export type ComplianceResult = {
  tool: string;
  status: 'skeleton';
  findings: ReadonlyArray<never>;
};

export type ReviewComplianceInput = {
  intent?: unknown;
  mapping?: unknown;
};

export function reviewCompliance(_input: ReviewComplianceInput = {}): ComplianceResult {
  return { tool: TOOL_NAME, status: 'skeleton', findings: [] };
}
