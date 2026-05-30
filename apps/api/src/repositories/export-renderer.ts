import type { ComponentMapping, ExportFormat, Metadata } from '@designrail/shared';

const SL_BUTTON_PROPS = new Set(['disabled', 'size', 'variant']);

export function renderExportContent(mapping: ComponentMapping, format: ExportFormat): string {
  assertSupportedTarget(mapping);

  if (format === 'HTML') {
    return renderHtml(mapping);
  }

  if (format === 'REACT') {
    return renderReact(mapping);
  }

  return renderAgentBrief(mapping);
}

function assertSupportedTarget(mapping: ComponentMapping): void {
  if (mapping.targetLibrary !== 'SHOELACE' || mapping.targetComponent !== 'sl-button') {
    throw new Error(
      `Mapping ${mapping.id} cannot be exported for ${mapping.targetLibrary}:${mapping.targetComponent}.`,
    );
  }
}

function renderHtml(mapping: ComponentMapping): string {
  const attributes = renderHtmlAttributes(mapping.mappedProps);
  const label = getDefaultSlotText(mapping);

  return `<${mapping.targetComponent}${attributes}>${escapeHtml(label)}</${mapping.targetComponent}>`;
}

function renderReact(mapping: ComponentMapping): string {
  const componentName = toReactComponentName(mapping.targetComponent);
  const props = renderReactProps(mapping.mappedProps);
  const label = getDefaultSlotText(mapping);

  return `<${componentName}${props}>${escapeJsxText(label)}</${componentName}>`;
}

function renderAgentBrief(mapping: ComponentMapping): string {
  return [
    `Mapping: ${mapping.id}`,
    `Target: ${mapping.targetLibrary} ${mapping.targetComponent}`,
    `Confidence: ${mapping.confidence}`,
    `Rationale: ${mapping.rationale}`,
  ].join('\n');
}

function renderHtmlAttributes(props: Metadata): string {
  const attributes = Object.entries(props)
    .filter(
      ([name, value]) =>
        SL_BUTTON_PROPS.has(name) && isSafeHtmlAttributeName(name) && isRenderableProp(value),
    )
    .flatMap(([name, value]) => {
      if (value === false) {
        return [];
      }

      if (value === true) {
        return [name];
      }

      return [`${name}="${escapeHtml(String(value))}"`];
    });

  return attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;
}

function renderReactProps(props: Metadata): string {
  const attributes = Object.entries(props)
    .filter(
      ([name, value]) =>
        SL_BUTTON_PROPS.has(name) && isSafeJsxPropName(name) && isRenderableProp(value),
    )
    .flatMap(([name, value]) => {
      if (value === false) {
        return [];
      }

      if (value === true) {
        return [name];
      }

      if (typeof value === 'number') {
        return [`${name}={${value}}`];
      }

      return [`${name}="${escapeHtml(String(value))}"`];
    });

  return attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;
}

function getDefaultSlotText(mapping: ComponentMapping): string {
  const label = mapping.mappedSlots['default'];

  return typeof label === 'string' && label.length > 0 ? label : mapping.targetComponent;
}

function isRenderableProp(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function isSafeHtmlAttributeName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/i.test(name);
}

function isSafeJsxPropName(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name);
}

function toReactComponentName(tagName: string): string {
  return tagName
    .split('-')
    .map((segment) => `${segment.charAt(0).toUpperCase()}${segment.slice(1)}`)
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeJsxText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
