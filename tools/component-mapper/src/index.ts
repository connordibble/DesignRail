export const TOOL_NAME = '@designrail/component-mapper';

export type MappingResult = {
  tool: string;
  status: 'skeleton';
};

export function mapComponent(): MappingResult {
  return { tool: TOOL_NAME, status: 'skeleton' };
}
