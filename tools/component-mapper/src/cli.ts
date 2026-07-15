#!/usr/bin/env -S tsx
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  buttonComponentIntentFixture,
  componentIntentSchema,
  createToolResult,
  type CliResponse,
  type ComponentMapping,
  type ToolResult,
  writeJsonCliResponse,
} from '@designrail/shared';

import { mapComponent, TOOL_NAME, TOOL_VERSION } from './index.js';

export function createComponentMapperCliResponse(
  argv: string[],
): CliResponse<ToolResult<ComponentMapping>> {
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
        : componentIntentSchema.parse(readToolInput(readFileSync(intentPath, 'utf8')));

    return {
      exitCode: 0,
      stdout: createToolResult({
        toolName: TOOL_NAME,
        toolVersion: TOOL_VERSION,
        output: mapComponent({ intent }),
      }),
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

function readToolInput(rawInput: string): unknown {
  const parsed = JSON.parse(rawInput) as unknown;

  if (parsed !== null && typeof parsed === 'object' && 'output' in parsed) {
    return (parsed as { output: unknown }).output;
  }

  return parsed;
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const response = createComponentMapperCliResponse(process.argv.slice(2));
  writeJsonCliResponse(response);
  process.exitCode = response.exitCode;
}
