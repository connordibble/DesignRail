export type ExportableNode = ComponentNode | ComponentSetNode | InstanceNode;

export interface ExtractedNodeData {
  canonicalName: string;
  description?: string;
  variantGroups: Record<string, string[]>;
  properties: Record<string, string | boolean>;
}

export function isExportable(node: SceneNode): node is ExportableNode {
  return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE';
}

function isComponentSetParent(parent: BaseNode | null): parent is ComponentSetNode {
  return parent?.type === 'COMPONENT_SET';
}

function readVariantDefinitions(node: ComponentNode | ComponentSetNode): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  try {
    for (const [name, definition] of Object.entries(node.componentPropertyDefinitions)) {
      if (definition.type !== 'VARIANT') {
        continue;
      }

      const values = definition.variantOptions ?? [String(definition.defaultValue)];
      groups[name] = [...values];
    }
  } catch {
    return {};
  }

  return groups;
}

function readInstanceVariantFallback(node: InstanceNode): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  try {
    for (const [name, property] of Object.entries(node.componentProperties)) {
      if (property.type === 'VARIANT') {
        groups[name] = [String(property.value)];
      }
    }
  } catch {
    return {};
  }

  return groups;
}

function readDefinitionProperties(
  node: ComponentNode | ComponentSetNode,
): Record<string, string | boolean> {
  const properties: Record<string, string | boolean> = {};

  try {
    for (const [name, definition] of Object.entries(node.componentPropertyDefinitions)) {
      if (definition.type === 'INSTANCE_SWAP' || definition.type === 'SLOT') {
        continue;
      }

      properties[name] = definition.defaultValue;
    }

    if (node.type === 'COMPONENT') {
      for (const [name, value] of Object.entries(node.variantProperties ?? {})) {
        properties[name] = value;
      }
    }
  } catch {
    return properties;
  }

  return properties;
}

function readInstanceProperties(node: InstanceNode): Record<string, string | boolean> {
  const properties: Record<string, string | boolean> = {};

  try {
    for (const [name, property] of Object.entries(node.componentProperties)) {
      if (property.type === 'INSTANCE_SWAP' || property.type === 'SLOT') {
        continue;
      }

      properties[name] = property.value;
    }
  } catch {
    return properties;
  }

  return properties;
}

function readDescription(node: ComponentNode | ComponentSetNode): string | undefined {
  try {
    const description = node.description.trim();

    return description.length > 0 ? description : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Resolve the canonical component identity and property metadata for a selected node.
 * Instances and variant children derive their identity and axes from the main component set,
 * while their current property values still come from the selected node.
 */
export async function extractNodeData(node: ExportableNode): Promise<ExtractedNodeData> {
  try {
    if (node.type === 'COMPONENT_SET') {
      const description = readDescription(node);

      return {
        canonicalName: node.name,
        ...(description === undefined ? {} : { description }),
        variantGroups: readVariantDefinitions(node),
        properties: readDefinitionProperties(node),
      };
    }

    if (node.type === 'COMPONENT') {
      const canonicalNode = isComponentSetParent(node.parent) ? node.parent : node;
      const description = readDescription(canonicalNode);

      return {
        canonicalName: canonicalNode.name,
        ...(description === undefined ? {} : { description }),
        variantGroups: readVariantDefinitions(canonicalNode),
        properties: readDefinitionProperties(node),
      };
    }

    const mainComponent = await node.getMainComponentAsync();
    const canonicalNode =
      mainComponent !== null && isComponentSetParent(mainComponent.parent)
        ? mainComponent.parent
        : mainComponent;
    const description = canonicalNode === null ? undefined : readDescription(canonicalNode);
    const declaredVariantGroups =
      canonicalNode === null ? {} : readVariantDefinitions(canonicalNode);

    return {
      canonicalName: canonicalNode?.name ?? node.name,
      ...(description === undefined ? {} : { description }),
      variantGroups:
        Object.keys(declaredVariantGroups).length > 0
          ? declaredVariantGroups
          : readInstanceVariantFallback(node),
      properties: readInstanceProperties(node),
    };
  } catch {
    return {
      canonicalName: node.name,
      variantGroups: node.type === 'INSTANCE' ? readInstanceVariantFallback(node) : {},
      properties: node.type === 'INSTANCE' ? readInstanceProperties(node) : {},
    };
  }
}
