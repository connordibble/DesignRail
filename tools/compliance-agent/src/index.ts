export const TOOL_NAME = '@designrail/compliance-agent';

export type ComplianceResult = {
  tool: string;
  status: 'skeleton';
  findings: ReadonlyArray<never>;
};

export function reviewCompliance(): ComplianceResult {
  return { tool: TOOL_NAME, status: 'skeleton', findings: [] };
}
