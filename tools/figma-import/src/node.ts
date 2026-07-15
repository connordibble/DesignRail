import { readFileSync } from 'node:fs';

import type { ComponentIntent } from '@designrail/shared';

import { normalizeComponentIntent } from './index.js';

export interface ImportFigmaFixtureInput {
  inputPath: string;
}

/**
 * Read a fixture from disk and normalize it. Lives in a Node-only entry point so the pure
 * normalizer in `index.ts` stays importable from browser bundles (the in-browser demo engine).
 */
export function importFigmaFixture({ inputPath }: ImportFigmaFixtureInput): ComponentIntent {
  const rawFixture = JSON.parse(readFileSync(inputPath, 'utf8')) as unknown;

  return normalizeComponentIntent(rawFixture, { sourcePath: inputPath });
}
