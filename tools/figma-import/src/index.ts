import { readFileSync } from 'node:fs';

import {
  buttonComponentIntentFixture,
  componentIntentSchema,
  type ComponentIntent,
} from '@designrail/shared';

export const TOOL_NAME = '@designrail/figma-import';

export interface ImportFigmaFixtureInput {
  inputPath: string;
}

export function importFigmaFixture({ inputPath }: ImportFigmaFixtureInput): ComponentIntent {
  const rawFixture = readFileSync(inputPath, 'utf8');
  const _parsedFixture: unknown = JSON.parse(rawFixture);

  return componentIntentSchema.parse({
    ...buttonComponentIntentFixture,
    sourceRefs: [
      {
        type: 'MOCK_FILE',
        id: inputPath,
        name: 'Primary Button',
      },
    ],
  });
}
