#!/usr/bin/env -S tsx
import { pathToFileURL } from 'node:url';

import {
  createToolResult,
  type CliResponse,
  type ComponentIntent,
  type ToolResult,
  writeJsonCliResponse,
} from '@designrail/shared';

import { importFigmaFixture, TOOL_NAME, TOOL_VERSION } from './index.js';

export function createFigmaImportCliResponse(
  argv: string[],
): CliResponse<ToolResult<ComponentIntent>> {
  const [inputPath] = argv;

  if (!inputPath) {
    return {
      exitCode: 2,
      stderr: {
        error: 'USAGE',
        message: 'Usage: figma-import <path-to-fixture.json>',
      },
    };
  }

  try {
    return {
      exitCode: 0,
      stdout: createToolResult({
        toolName: TOOL_NAME,
        toolVersion: TOOL_VERSION,
        output: importFigmaFixture({ inputPath }),
      }),
    };
  } catch (error) {
    return {
      exitCode: 1,
      stderr: {
        error: 'IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Unknown import failure.',
      },
    };
  }
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const response = createFigmaImportCliResponse(process.argv.slice(2));
  writeJsonCliResponse(response);
  process.exitCode = response.exitCode;
}
