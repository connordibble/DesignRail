export const TOOL_NAME = '@designrail/figma-import';

export type ImportResult = {
  tool: string;
  inputPath: string;
  status: 'skeleton';
};

export function importFigmaFixture(inputPath: string): ImportResult {
  return { tool: TOOL_NAME, inputPath, status: 'skeleton' };
}
