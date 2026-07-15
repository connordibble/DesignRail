import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';

import type { DatabaseClient } from '../db/client.js';

import { ingestFigmaFixtureDocument } from './figma-pipeline.js';

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
 * Discover provenance-carrying fixtures on disk and persist their deterministic pipeline output
 * via {@link ingestFigmaFixtureDocument}. Hand-authored mock fixtures remain owned by the
 * canonical seed registry.
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
      const document = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
      const outcome = ingestFigmaFixtureDocument(client, { document, fixturePath });

      if (outcome === 'IMPORTED') {
        result.imported.push(fixturePath);
      } else {
        result.skipped.push(fixturePath);
      }
    } catch (error) {
      result.failures.push({ fixturePath, message: messageFromError(error) });
    }
  }

  return result;
}
