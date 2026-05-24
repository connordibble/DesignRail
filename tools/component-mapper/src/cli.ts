#!/usr/bin/env -S tsx
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  buttonComponentIntentFixture,
  componentIntentSchema,
  type ComponentMapping,
} from '@designrail/shared';

import { mapComponent } from './index.js';

export interface CliResponse<TOutput> {
  exitCode: number;
  stdout?: TOutput;
  stderr?: {
    error: string;
    message: string;
  };
}

export function createComponentMapperCliResponse(argv: string[]): CliResponse<ComponentMapping> {
  const [intentPath, extraArg] = argv;

  if (extraArg !== undefined) {
    return {
      exitCode: 2,
      stderr: {
        error: 'USAGE',
        message: 'Usage: component-mapper [path-to-component-intent.json]',
      },
    };
  }

  try {
    const intent =
      intentPath === undefined
        ? buttonComponentIntentFixture
        : componentIntentSchema.parse(JSON.parse(readFileSync(intentPath, 'utf8')) as unknown);

    return {
      exitCode: 0,
      stdout: mapComponent({ intent }),
    };
  } catch (error) {
    return {
      exitCode: 1,
      stderr: {
        error: 'MAPPING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown mapping failure.',
      },
    };
  }
}

function writeCliResponse<TOutput>(response: CliResponse<TOutput>): void {
  if (response.stdout !== undefined) {
    console.log(JSON.stringify(response.stdout, null, 2));
  }

  if (response.stderr !== undefined) {
    console.error(JSON.stringify(response.stderr, null, 2));
  }
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const response = createComponentMapperCliResponse(process.argv.slice(2));
  writeCliResponse(response);
  process.exitCode = response.exitCode;
}
