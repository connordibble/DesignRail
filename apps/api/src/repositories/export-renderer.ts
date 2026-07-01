import {
  getComponentSchemaByTag,
  hasDefaultSlot,
  type ShoelaceComponentSchema,
  type ShoelaceProp,
} from '@designrail/schema';
import type {
  ComplianceFinding,
  ComponentMapping,
  ExportFormat,
  JsonValue,
  Metadata,
  ReviewDecision,
} from '@designrail/shared';

export interface AgentBriefContext {
  decision: ReviewDecision;
  findings: ComplianceFinding[];
}

export function renderExportContent(
  mapping: ComponentMapping,
  format: ExportFormat,
  agentBriefContext?: AgentBriefContext,
): string {
  const schema = resolveSchema(mapping);

  if (format === 'HTML') {
    return renderHtml(mapping, schema);
  }

  if (format === 'REACT') {
    return renderReact(mapping, schema);
  }

  if (agentBriefContext === undefined) {
    throw new Error('Agent Brief export requires the authorizing review decision and findings.');
  }

  return renderAgentBrief(mapping, agentBriefContext);
}

function resolveSchema(mapping: ComponentMapping): ShoelaceComponentSchema {
  const schema =
    mapping.targetLibrary === 'SHOELACE' ? getComponentSchemaByTag(mapping.targetComponent) : null;

  if (schema === null) {
    throw new Error(
      `Mapping ${mapping.id} cannot be exported for ${mapping.targetLibrary}:${mapping.targetComponent}.`,
    );
  }

  return schema;
}

function renderHtml(mapping: ComponentMapping, schema: ShoelaceComponentSchema): string {
  const attributes = renderAttributes(mapping.mappedProps, schema, 'html');

  if (!hasDefaultSlot(schema)) {
    // Custom elements cannot self-close in HTML; render an explicit empty tag.
    return `<${schema.tag}${attributes}></${schema.tag}>`;
  }

  return `<${schema.tag}${attributes}>${escapeHtml(getDefaultSlotText(mapping, schema))}</${schema.tag}>`;
}

function renderReact(mapping: ComponentMapping, schema: ShoelaceComponentSchema): string {
  const componentName = toReactComponentName(schema.tag);
  const props = renderAttributes(mapping.mappedProps, schema, 'react');

  if (!hasDefaultSlot(schema)) {
    return `<${componentName}${props} />`;
  }

  return `<${componentName}${props}>${escapeJsxText(getDefaultSlotText(mapping, schema))}</${componentName}>`;
}

function renderAgentBrief(mapping: ComponentMapping, context: AgentBriefContext): string {
  const { decision, findings } = context;
  const blockingFindings = findings.filter((finding) => finding.blocking);

  const lines = [
    `Mapping: ${mapping.id}`,
    `Target: ${mapping.targetLibrary} ${mapping.targetComponent}`,
    `Confidence: ${mapping.confidence}`,
    `Rationale: ${mapping.rationale}`,
    '',
    `Review: ${decision.status} by ${decision.reviewerLabel} on ${decision.createdAt}`,
    `Compliance: ${summarizeFindingCounts(findings)}`,
  ];

  if (blockingFindings.length > 0) {
    lines.push('Blocking findings:');
    for (const finding of blockingFindings) {
      lines.push(`  - [${finding.category}] ${finding.message}`);
    }
  }

  lines.push('', 'Props:');
  for (const [name, value] of Object.entries(mapping.mappedProps)) {
    lines.push(`  ${name}: ${formatBriefValue(value)}`);
  }

  const defaultSlot = mapping.mappedSlots['default'];
  if (typeof defaultSlot === 'string') {
    lines.push('', `Slot (default): ${defaultSlot}`);
  }

  lines.push(
    '',
    'This mapping is human-reviewed and export-ready. Do not change props, slots, the target component, or the rationale without a new human review decision.',
  );

  return lines.join('\n');
}

function summarizeFindingCounts(findings: ComplianceFinding[]): string {
  const blockers = findings.filter((finding) => finding.severity === 'BLOCKER').length;
  const warnings = findings.filter((finding) => finding.severity === 'WARNING').length;
  const info = findings.filter((finding) => finding.severity === 'INFO').length;

  return `${blockers} blocker${blockers === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}, ${info} info`;
}

function formatBriefValue(value: JsonValue): string {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

type ExportTarget = 'html' | 'react';

/** Render attributes from mapped props, allowlisted and named by the component schema. */
function renderAttributes(
  props: Metadata,
  schema: ShoelaceComponentSchema,
  target: ExportTarget,
): string {
  const attributes = Object.entries(props).flatMap(([name, value]) => {
    const prop = schema.props.find((candidate) => candidate.name === name);

    if (prop === undefined || !isRenderableProp(value)) {
      return [];
    }

    return renderAttribute(prop, value, target);
  });

  return attributes.length === 0 ? '' : ` ${attributes.join(' ')}`;
}

function renderAttribute(
  prop: ShoelaceProp,
  value: string | number | boolean,
  target: ExportTarget,
): string[] {
  const attributeName = target === 'html' ? prop.htmlAttribute : prop.reactProp;
  const isSafeName = target === 'html' ? isSafeHtmlAttributeName : isSafeJsxPropName;

  if (!isSafeName(attributeName)) {
    return [];
  }

  if (value === false) {
    return [];
  }

  if (value === true) {
    return [attributeName];
  }

  if (target === 'react' && typeof value === 'number') {
    return [`${attributeName}={${value}}`];
  }

  return [`${attributeName}="${escapeHtml(String(value))}"`];
}

function getDefaultSlotText(mapping: ComponentMapping, schema: ShoelaceComponentSchema): string {
  const label = mapping.mappedSlots['default'];

  return typeof label === 'string' && label.length > 0 ? label : schema.tag;
}

function isRenderableProp(value: JsonValue): value is string | number | boolean {
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
