import { readFileSync } from 'node:fs';

import {
  buttonComponentIntentFixture,
  componentIntentSchema,
  type Metadata,
  type ComponentIntent,
} from '@designrail/shared';

export const TOOL_NAME = '@designrail/figma-import';
export const TOOL_VERSION = '0.1.0';

export interface ImportFigmaFixtureInput {
  inputPath: string;
}

export function importFigmaFixture({ inputPath }: ImportFigmaFixtureInput): ComponentIntent {
  const rawFixture = readFileSync(inputPath, 'utf8');
  const parsedFixture = parseMockFixture(rawFixture);
  const fixtureComponent = readString(parsedFixture, 'component');
  const componentName =
    readString(parsedFixture, 'name') ??
    (fixtureComponent === undefined ? undefined : toDisplayName(fixtureComponent)) ??
    buttonComponentIntentFixture.componentName;
  const componentType =
    readString(parsedFixture, 'componentType') ??
    componentName ??
    buttonComponentIntentFixture.componentType;

  return componentIntentSchema.parse({
    ...buttonComponentIntentFixture,
    componentName,
    componentType,
    sourceRefs: [
      {
        type: 'MOCK_FILE',
        id: inputPath,
        name: componentName,
      },
    ],
  });
}

function parseMockFixture(rawFixture: string): Metadata {
  const parsed = JSON.parse(rawFixture) as unknown;

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Mock Figma fixture must be a JSON object.');
  }

  return parsed as Metadata;
}

function readString(value: Metadata, key: string): string | undefined {
  const field = value[key];

  return typeof field === 'string' && field.length > 0 ? field : undefined;
}

function toDisplayName(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
