import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';

import { reviewCompliance } from '@designrail/compliance-agent';
import { mapComponent } from '@designrail/component-mapper';
import { normalizeComponentIntent } from '@designrail/figma-import';
import {
  exampleSchema,
  mockFigmaFixtureSchema,
  type Example,
  type SeedExample,
} from '@designrail/shared';

import type { DatabaseClient } from '../db/index.js';

import { getExampleById, persistPipelineExample } from './designrail.js';

export interface FigmaFixtureIngestionFailure {
  fixturePath: string;
  message: string;
}

export interface FigmaFixtureIngestionResult {
  imported: string[];
  skipped: string[];
  failures: FigmaFixtureIngestionFailure[];
}

export interface IngestFigmaFixturesOptions {
  directory: string;
  fixturePathPrefix?: string;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown Figma fixture ingestion failure.';
}

/**
 * Discover provenance-carrying fixtures and persist their deterministic pipeline output.
 * Hand-authored mock fixtures remain owned by the canonical seed registry.
 */
export function ingestFigmaFixtures(
  client: DatabaseClient,
  options: IngestFigmaFixturesOptions,
): FigmaFixtureIngestionResult {
  const result: FigmaFixtureIngestionResult = { imported: [], skipped: [], failures: [] };

  if (!existsSync(options.directory)) {
    return result;
  }

  const fileNames = readdirSync(options.directory)
    .filter((fileName) => /^figma-input\..+\.json$/.test(fileName))
    .sort((left, right) => left.localeCompare(right));

  for (const fileName of fileNames) {
    const fixturePath = options.fixturePathPrefix
      ? posix.join(options.fixturePathPrefix, fileName)
      : resolve(options.directory, fileName);

    try {
      const absolutePath = resolve(options.directory, fileName);
      const fixture = mockFigmaFixtureSchema.parse(
        JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown,
      );

      if (fixture.figma === undefined) {
        result.skipped.push(fixturePath);
        continue;
      }

      const intent = normalizeComponentIntent(fixture, { sourcePath: fixturePath });
      const existing = getExampleById(client, intent.exampleId);
      if (existing !== null && existing.source !== 'FIGMA') {
        throw new Error(
          `Example id ${intent.exampleId} already belongs to the ${existing.source} fixture ${existing.fixturePath}.`,
        );
      }

      const mapping = mapComponent({ intent });
      const findings = reviewCompliance({ intent, mapping });
      const example: Example = exampleSchema.parse({
        id: intent.exampleId,
        name: fixture.name,
        componentType: intent.componentType,
        fixturePath,
        source: 'FIGMA',
        status: 'READY',
      });
      const entry: SeedExample = { example, intent, mapping, findings };

      persistPipelineExample(client, entry);
      result.imported.push(fixturePath);
    } catch (error) {
      result.failures.push({ fixturePath, message: messageFromError(error) });
    }
  }

  return result;
}
