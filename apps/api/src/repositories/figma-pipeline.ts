import { reviewCompliance } from '@designrail/compliance-agent';
import { mapComponent } from '@designrail/component-mapper';
import { normalizeComponentIntent } from '@designrail/figma-import';
import {
  exampleSchema,
  mockFigmaFixtureSchema,
  type Example,
  type SeedExample,
} from '@designrail/shared';

import type { DatabaseClient } from '../db/client.js';

import { getExampleById, persistPipelineExample } from './designrail.js';

export interface IngestFigmaFixtureDocumentOptions {
  /** Parsed JSON content of a `figma-input.*.json` fixture. */
  document: unknown;
  /** Path recorded as the fixture origin, e.g. `examples/figma-input.button.json`. */
  fixturePath: string;
}

export type FigmaFixtureIngestionOutcome = 'IMPORTED' | 'SKIPPED';

/**
 * Validate one fixture document and persist its deterministic pipeline output (normalize, map,
 * review). Returns `SKIPPED` for hand-authored mock fixtures without a `figma` provenance block;
 * those stay owned by the canonical seed registry. Throws when the document is invalid or its
 * example id collides with a non-Figma fixture.
 *
 * Free of Node APIs so the in-browser demo engine can ingest bundled fixture documents exactly the
 * way the server ingests `examples/` at startup.
 */
export function ingestFigmaFixtureDocument(
  client: DatabaseClient,
  options: IngestFigmaFixtureDocumentOptions,
): FigmaFixtureIngestionOutcome {
  const fixture = mockFigmaFixtureSchema.parse(options.document);

  if (fixture.figma === undefined) {
    return 'SKIPPED';
  }

  const intent = normalizeComponentIntent(fixture, { sourcePath: options.fixturePath });
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
    fixturePath: options.fixturePath,
    source: 'FIGMA',
    status: 'READY',
  });
  const entry: SeedExample = { example, intent, mapping, findings };

  persistPipelineExample(client, entry);

  return 'IMPORTED';
}
