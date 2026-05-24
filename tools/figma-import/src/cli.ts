#!/usr/bin/env -S tsx
import { pathToFileURL } from 'node:url';

import type { ComponentIntent } from '@designrail/shared';

import { importFigmaFixture } from './index.js';

export interface CliResponse<TOutput> {
  exitCode: number;
  stdout?: TOutput;
  stderr?: {
    error: string;
    message: string;
  };
}

export function createFigmaImportCliResponse(argv: string[]): CliResponse<ComponentIntent> {
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
      stdout: importFigmaFixture({ inputPath }),
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
  const response = createFigmaImportCliResponse(process.argv.slice(2));
  writeCliResponse(response);
  process.exitCode = response.exitCode;
}
