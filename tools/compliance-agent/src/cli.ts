#!/usr/bin/env -S tsx
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

import {
  buttonComponentIntentFixture,
  buttonComponentMappingFixture,
  componentIntentSchema,
  componentMappingSchema,
  createToolResult,
  type CliResponse,
  type ComplianceFinding,
  type ToolResult,
  writeJsonCliResponse,
} from '@designrail/shared';

import { reviewCompliance, TOOL_NAME, TOOL_VERSION } from './index.js';

export function createComplianceAgentCliResponse(
  argv: string[],
): CliResponse<ToolResult<ComplianceFinding[]>> {
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
        : componentIntentSchema.parse(readToolInput(readFileSync(intentPath, 'utf8')));
    const mapping =
      mappingPath === undefined
        ? buttonComponentMappingFixture
        : componentMappingSchema.parse(readToolInput(readFileSync(mappingPath, 'utf8')));

    return {
      exitCode: 0,
      stdout: createToolResult({
        toolName: TOOL_NAME,
        toolVersion: TOOL_VERSION,
        output: reviewCompliance({ intent, mapping }),
      }),
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
  const response = createComplianceAgentCliResponse(process.argv.slice(2));
  writeJsonCliResponse(response);
  process.exitCode = response.exitCode;
}
