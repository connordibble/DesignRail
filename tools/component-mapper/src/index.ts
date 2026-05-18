export const TOOL_NAME = '@designrail/component-mapper';

export type MappingResult = {
  tool: string;
  status: 'skeleton';
};

export type MapComponentInput = {
  intent?: unknown;
};

export function mapComponent(_input: MapComponentInput = {}): MappingResult {
  return { tool: TOOL_NAME, status: 'skeleton' };
}
