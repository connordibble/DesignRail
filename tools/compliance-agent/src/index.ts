import {
  coerceEnumValue,
  getComponentSchema,
  hasDefaultSlot,
  type ShoelaceComponentSchema,
} from '@designrail/schema';
import {
  complianceFindingSchema,
  FIXTURE_TIMESTAMP,
  type ComplianceFinding,
  type ComponentIntent,
  type ComponentMapping,
} from '@designrail/shared';

export const TOOL_NAME = '@designrail/compliance-agent';
export const TOOL_VERSION = '0.2.0';

const SLOT_SOURCE_KEYS = ['label', 'text', 'content'];

export interface ReviewComplianceInput {
  intent: ComponentIntent;
  mapping: ComponentMapping;
}

/**
 * Deterministic, schema-aware compliance review. Emits findings in a stable category order so
 * the output is reproducible for seeding and tests.
 */
export function reviewCompliance({ intent, mapping }: ReviewComplianceInput): ComplianceFinding[] {
  const schema = getComponentSchema(intent.componentType);
  const slug = deriveSlug(mapping.id);
  const findings: ComplianceFinding[] = [];

  findings.push(buildAccessibilityFinding(slug, mapping.id, intent, schema));

  const variantGaps = resolveVariantGaps(schema, intent.variants);
  if (variantGaps.length > 0) {
    findings.push(
      finding(slug, mapping.id, 'VARIANT_COVERAGE', 'variant-coverage', {
        severity: 'WARNING',
        message: `Design variants not covered by Shoelace: ${variantGaps.join(', ')}.`,
        remediation: 'Choose a supported Shoelace variant or extend the component schema.',
        path: 'variants',
        blocking: false,
      }),
    );
  }

  const tokenGaps = intent.tokenRefs
    .filter((token) => token.target === undefined)
    .map((t) => t.name);
  if (tokenGaps.length > 0) {
    findings.push(
      finding(slug, mapping.id, 'TOKEN_USAGE', 'token-usage', {
        severity: 'WARNING',
        message: `Design tokens without a Shoelace target: ${tokenGaps.join(', ')}.`,
        remediation:
          'Map each design token to a Shoelace CSS custom property (--sl-*) before relying on it.',
        path: 'tokenRefs',
        blocking: false,
      }),
    );
  }

  const unmappedProps = resolveUnmappedProps(schema, intent);
  if (unmappedProps.length > 0) {
    findings.push(
      finding(slug, mapping.id, 'DESIGN_SYSTEM_ALIGNMENT', 'design-system-alignment', {
        severity: 'WARNING',
        message: `Design props without a Shoelace mapping: ${unmappedProps.join(', ')}.`,
        remediation: 'Map or drop unsupported props before export.',
        path: 'props',
        blocking: false,
      }),
    );
  }

  const hasDescription =
    intent.accessibility.description !== undefined && intent.accessibility.description.length > 0;
  findings.push(
    finding(slug, mapping.id, 'DOCUMENTATION_READINESS', 'documentation-readiness', {
      severity: 'INFO',
      message: hasDescription
        ? 'Documentation context is complete (summary and description present).'
        : 'Documentation will use the component summary; no extended description provided.',
      remediation: 'Add an accessibility description to enrich generated documentation.',
      path: 'summary',
      blocking: false,
    }),
  );

  const hasEvents = Object.keys(mapping.mappedEvents).length > 0;
  findings.push(
    finding(slug, mapping.id, 'REACT_READINESS', 'react-readiness', {
      severity: 'INFO',
      message: hasEvents
        ? `Shoelace ${mapping.targetComponent} events are ready for React binding.`
        : `Shoelace ${mapping.targetComponent} has no custom events to bind.`,
      remediation: 'Bind custom Shoelace events with their React handler names when exporting.',
      path: 'mappedEvents',
      blocking: false,
    }),
  );

  return findings.map((found) => complianceFindingSchema.parse(found));
}

function buildAccessibilityFinding(
  slug: string,
  mappingId: string,
  intent: ComponentIntent,
  schema: ShoelaceComponentSchema | null,
): ComplianceFinding {
  // Containers (e.g. Card) carry no accessible name of their own; only flag interactive controls.
  if (schema?.requiresAccessibleName === false) {
    return finding(slug, mappingId, 'ACCESSIBILITY', 'accessibility', {
      severity: 'INFO',
      message: 'Container component; no accessible name required.',
      remediation:
        'Ensure any interactive children inside the container are individually labelled.',
      path: 'accessibility',
      blocking: false,
    });
  }

  const label = intent.accessibility.label;

  if (label === undefined || label.length === 0) {
    return finding(slug, mappingId, 'ACCESSIBILITY', 'accessibility', {
      severity: 'BLOCKER',
      message: 'No accessible name found in design intent.',
      remediation: 'Add an aria-label, visible label, or default slot text before export.',
      path: 'accessibility.label',
      blocking: true,
    });
  }

  return finding(slug, mappingId, 'ACCESSIBILITY', 'accessibility', {
    severity: 'INFO',
    message: `Accessible name resolved from design intent ("${label}").`,
    remediation: 'Keep the accessible name in sync with the Shoelace label or default slot.',
    path: 'accessibility.label',
    blocking: false,
  });
}

interface FindingBody {
  severity: ComplianceFinding['severity'];
  message: string;
  remediation: string;
  path: string;
  blocking: boolean;
}

function finding(
  slug: string,
  mappingId: string,
  category: ComplianceFinding['category'],
  idSuffix: string,
  body: FindingBody,
): ComplianceFinding {
  return {
    id: `finding.${slug}.${idSuffix}`,
    mappingId,
    category,
    severity: body.severity,
    message: body.message,
    remediation: body.remediation,
    path: body.path,
    blocking: body.blocking,
    createdAt: FIXTURE_TIMESTAMP,
  };
}

function resolveVariantGaps(schema: ShoelaceComponentSchema | null, variants: string[]): string[] {
  const variantProp = schema?.props.find((prop) => prop.name === 'variant');

  if (variantProp === undefined) {
    return [];
  }

  return variants.filter((variant) => coerceEnumValue(variantProp, variant) === null);
}

function resolveUnmappedProps(
  schema: ShoelaceComponentSchema | null,
  intent: ComponentIntent,
): string[] {
  if (schema === null) {
    return [];
  }

  const mappedKeys = new Set<string>();

  for (const prop of schema.props) {
    for (const key of prop.intentKeys) {
      if (intent.props[key] !== undefined) {
        mappedKeys.add(key);
      }
    }
  }

  if (hasDefaultSlot(schema)) {
    for (const key of SLOT_SOURCE_KEYS) {
      if (intent.props[key] !== undefined) {
        mappedKeys.add(key);
      }
    }
  }

  return Object.keys(intent.props).filter((key) => !mappedKeys.has(key));
}

function deriveSlug(mappingId: string): string {
  return mappingId.replace(/^mapping\./, '').replace(/\.shoelace$/, '');
}
