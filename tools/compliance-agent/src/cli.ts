#!/usr/bin/env -S tsx
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  componentIntentSchema,
  componentMappingSchema,
  type ComplianceFinding,
} from '@designrail/shared';

import { reviewCompliance } from './index.js';

export interface CliResponse<TOutput> {
  exitCode: number;
  stdout?: TOutput;
  stderr?: {
    error: string;
    message: string;
  };
}

export function createComplianceAgentCliResponse(argv: string[]): CliResponse<ComplianceFinding[]> {
  const [intentPath, mappingPath, extraArg] = argv;

  if (extraArg !== undefined || (intentPath === undefined) !== (mappingPath === undefined)) {
    return {
      exitCode: 2,
      stderr: {
        error: 'USAGE',
        message: 'Usage: compliance-agent [path-to-intent.json path-to-mapping.json]',
      },
    };
  }

  try {
    const intent =
      intentPath === undefined
        ? buttonComponentIntentFixture
        : componentIntentSchema.parse(JSON.parse(readFileSync(intentPath, 'utf8')) as unknown);
    const mapping =
      mappingPath === undefined
        ? buttonComponentMappingFixture
        : componentMappingSchema.parse(JSON.parse(readFileSync(mappingPath, 'utf8')) as unknown);

    return {
      exitCode: 0,
      stdout: reviewCompliance({ intent, mapping }),
    };
  } catch (error) {
    return {
      exitCode: 1,
      stderr: {
        error: 'COMPLIANCE_REVIEW_FAILED',
        message: error instanceof Error ? error.message : 'Unknown compliance review failure.',
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
  const response = createComplianceAgentCliResponse(process.argv.slice(2));
  writeCliResponse(response);
  process.exitCode = response.exitCode;
}
