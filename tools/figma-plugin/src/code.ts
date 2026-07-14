import { extractNodeData, isExportable, type ExportableNode } from './node-extraction.js';
import { serializeFixture, type FigmaNodeSnapshot, type FigmaTokenSnapshot } from './serializer.js';

// Main thread: reads the current selection, builds a plain-data snapshot, and
// posts the serialized fixture to the panel. No network access, no credentials;
// the exported JSON is the only thing that leaves Figma, and the user carries it.

figma.showUI(__html__, { width: 440, height: 620, themeColors: true });

function readPrimaryText(node: ExportableNode): string | undefined {
  const text = node.findOne((child) => child.type === 'TEXT');

  if (text === null || text.type !== 'TEXT') {
    return undefined;
  }

  const characters = text.characters.trim();

  return characters.length > 0 ? characters : undefined;
}

/** Best-effort: bound variables on the selected node itself, names in token dot-form. */
async function readTokens(node: ExportableNode): Promise<FigmaTokenSnapshot[]> {
  const tokens: FigmaTokenSnapshot[] = [];

  try {
    const bound = (node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables;

    if (bound === undefined) {
      return tokens;
    }

    const aliasIds = new Set<string>();
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const entry of value) {
          collect(entry);
        }
        return;
      }
      if (
        typeof value === 'object' &&
        value !== null &&
        (value as { type?: string }).type === 'VARIABLE_ALIAS' &&
        typeof (value as { id?: string }).id === 'string'
      ) {
        aliasIds.add((value as { id: string }).id);
      }
    };

    for (const value of Object.values(bound)) {
      collect(value);
    }

    for (const id of aliasIds) {
      const variable = await figma.variables.getVariableByIdAsync(id);
      if (variable !== null) {
        tokens.push({ name: variable.name.split('/').join('.') });
      }
    }
  } catch {
    // The variables API is unavailable in some contexts; tokens stay empty.
  }

  return tokens;
}

async function buildSnapshot(node: ExportableNode): Promise<FigmaNodeSnapshot> {
  const extracted = await extractNodeData(node);
  const primaryText = readPrimaryText(node);
  const fileKey = figma.fileKey;

  return {
    id: node.id,
    name: extracted.canonicalName,
    nodeName: node.name,
    type: node.type,
    ...(extracted.description === undefined ? {} : { description: extracted.description }),
    ...(fileKey === undefined ? {} : { fileKey }),
    variantGroups: extracted.variantGroups,
    properties: extracted.properties,
    ...(primaryText === undefined ? {} : { primaryText }),
    tokens: await readTokens(node),
  };
}

let refreshGeneration = 0;

async function refresh(): Promise<void> {
  const generation = ++refreshGeneration;
  const selection = figma.currentPage.selection;

  if (selection.length !== 1) {
    figma.ui.postMessage({
      type: 'empty',
      reason:
        selection.length === 0
          ? 'Select a component, component set, or instance to export.'
          : 'Select exactly one node. Multi-selection export is not supported yet.',
    });
    return;
  }

  const node = selection[0];
  if (node === undefined || !isExportable(node)) {
    figma.ui.postMessage({
      type: 'empty',
      reason: `Selected node is a ${node?.type ?? 'unknown'}. Select a component, component set, or instance.`,
    });
    return;
  }

  const snapshot = await buildSnapshot(node);
  if (
    generation !== refreshGeneration ||
    figma.currentPage.selection.length !== 1 ||
    figma.currentPage.selection[0]?.id !== node.id
  ) {
    return;
  }

  const { canExport, fileName, fixture, warnings } = serializeFixture(snapshot);

  figma.ui.postMessage({
    type: 'fixture',
    canExport,
    fileName,
    json: JSON.stringify(fixture, null, 2),
    warnings,
    meta: {
      name: fixture.name,
      componentType: fixture.componentType,
      exampleId: fixture.exampleId,
      variantCount: fixture.variants.length,
      stateCount: fixture.states.length,
      tokenCount: fixture.tokens.length,
      propCount: Object.keys(fixture.props).length,
    },
  });
}

figma.ui.onmessage = (message: { type?: string; text?: string }) => {
  if (message.type === 'notify' && typeof message.text === 'string') {
    figma.notify(message.text);
  }
};

figma.on('selectionchange', () => {
  void refresh();
});

void refresh();
