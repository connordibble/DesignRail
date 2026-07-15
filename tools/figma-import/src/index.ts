import {
  componentIntentSchema,
  FIXTURE_TIMESTAMP,
  mockFigmaFixtureSchema,
  type ComponentIntent,
  type MockFigmaFixture,
} from '@designrail/shared';

export const TOOL_NAME = '@designrail/figma-import';
export const TOOL_VERSION = '0.2.0';

export interface NormalizeComponentIntentContext {
  /** Path recorded on the intent's source reference (the fixture origin). */
  sourcePath: string;
}

/**
 * Pure normalization: validate a raw mock fixture and project it into a {@link ComponentIntent}.
 * Used by both the CLI (after reading a file) and tests (with an in-memory object).
 */
export function normalizeComponentIntent(
  rawFixture: unknown,
  context: NormalizeComponentIntentContext,
): ComponentIntent {
  const fixture: MockFigmaFixture = mockFigmaFixtureSchema.parse(rawFixture);
  // A figma provenance block marks a fixture exported by the DesignRail Figma plugin.
  // The rest of the pipeline treats both sources identically; only the intent's source
  // and its source reference change.
  const provenance = fixture.figma;

  return componentIntentSchema.parse({
    id: fixture.intentId,
    exampleId: fixture.exampleId,
    source: provenance === undefined ? 'MOCK' : 'FIGMA',
    sourceRefs: [
      provenance === undefined
        ? {
            type: 'MOCK_FILE',
            id: context.sourcePath,
            name: fixture.name,
          }
        : {
            type: 'FIGMA_NODE',
            id: provenance.nodeId,
            name: provenance.nodeName ?? fixture.name,
          },
    ],
    componentName: fixture.componentName ?? fixture.componentType,
    componentType: fixture.componentType,
    summary: fixture.summary,
    props: fixture.props,
    variants: fixture.variants,
    states: fixture.states,
    tokenRefs: fixture.tokens,
    accessibility: fixture.accessibility,
    createdAt: FIXTURE_TIMESTAMP,
  });
}
