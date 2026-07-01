import {
  buttonComponentMappingFixture,
  cardComponentMappingFixture,
  inputComponentMappingFixture,
  type ComplianceFinding,
  type ReviewDecision,
} from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { renderExportContent } from './export-renderer.js';

const acceptedDecision: ReviewDecision = {
  id: 'decision.test.accepted',
  mappingId: buttonComponentMappingFixture.id,
  status: 'ACCEPTED',
  reviewerLabel: 'Repository test',
  createdAt: '2026-01-01T00:00:01.000Z',
};

const infoFinding: ComplianceFinding = {
  id: 'finding.test.info',
  mappingId: buttonComponentMappingFixture.id,
  category: 'ACCESSIBILITY',
  severity: 'INFO',
  message: 'Accessible name resolved from design intent.',
  remediation: 'Keep the accessible name in sync.',
  blocking: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const blockerFinding: ComplianceFinding = {
  id: 'finding.test.blocker',
  mappingId: buttonComponentMappingFixture.id,
  category: 'TOKEN_USAGE',
  severity: 'BLOCKER',
  message: 'Design token missing a Shoelace target.',
  remediation: 'Map the token before export.',
  blocking: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('export renderer', () => {
  it('renders deterministic Shoelace HTML and React examples', () => {
    expect(renderExportContent(buttonComponentMappingFixture, 'HTML')).toBe(
      '<sl-button variant="primary" size="medium">Save changes</sl-button>',
    );
    expect(renderExportContent(buttonComponentMappingFixture, 'REACT')).toBe(
      '<SlButton variant="primary" size="medium">Save changes</SlButton>',
    );
  });

  it('renders childless components without a default slot', () => {
    expect(renderExportContent(inputComponentMappingFixture, 'HTML')).toBe(
      '<sl-input type="email" size="medium" label="Email address" placeholder="you@example.com" required></sl-input>',
    );
    expect(renderExportContent(inputComponentMappingFixture, 'REACT')).toBe(
      '<SlInput type="email" size="medium" label="Email address" placeholder="you@example.com" required />',
    );
  });

  it('renders Card content through the default slot', () => {
    expect(renderExportContent(cardComponentMappingFixture, 'HTML')).toBe(
      '<sl-card>Wireless headphones with 30-hour battery life.</sl-card>',
    );
    expect(renderExportContent(cardComponentMappingFixture, 'REACT')).toBe(
      '<SlCard>Wireless headphones with 30-hour battery life.</SlCard>',
    );
  });

  it('rejects mappings with no registered Shoelace schema', () => {
    expect(() =>
      renderExportContent(
        { ...buttonComponentMappingFixture, targetComponent: 'sl-carousel' },
        'HTML',
      ),
    ).toThrow(/cannot be exported/);
  });

  it('escapes mapped props and slot text before export', () => {
    const content = renderExportContent(
      {
        ...buttonComponentMappingFixture,
        mappedProps: {
          variant: 'primary" autofocus onclick="alert(1)',
        },
        mappedSlots: {
          default: '<script>alert(1)</script>',
        },
      },
      'HTML',
    );

    expect(content).toBe(
      '<sl-button variant="primary&quot; autofocus onclick=&quot;alert(1)">&lt;script&gt;alert(1)&lt;/script&gt;</sl-button>',
    );

    expect(
      renderExportContent(
        {
          ...buttonComponentMappingFixture,
          mappedSlots: {
            default: 'Save & continue',
          },
        },
        'REACT',
      ),
    ).toBe('<SlButton variant="primary" size="medium">Save &amp; continue</SlButton>');
  });

  it('omits props outside the C1 Button export allowlist', () => {
    expect(
      renderExportContent(
        {
          ...buttonComponentMappingFixture,
          mappedProps: {
            variant: 'primary',
            onclick: 'alert(1)',
            href: 'https://example.com',
          },
        },
        'HTML',
      ),
    ).toBe('<sl-button variant="primary">Save changes</sl-button>');
  });

  describe('agent brief', () => {
    it('requires an authorizing decision and findings context', () => {
      expect(() => renderExportContent(buttonComponentMappingFixture, 'AGENT_BRIEF')).toThrow(
        /requires the authorizing review decision/,
      );
    });

    it('includes the review decision, compliance summary, props, and slot', () => {
      const content = renderExportContent(buttonComponentMappingFixture, 'AGENT_BRIEF', {
        decision: acceptedDecision,
        findings: [infoFinding],
      });

      expect(content).toBe(
        [
          `Mapping: ${buttonComponentMappingFixture.id}`,
          'Target: SHOELACE sl-button',
          'Confidence: HIGH',
          `Rationale: ${buttonComponentMappingFixture.rationale}`,
          '',
          'Review: ACCEPTED by Repository test on 2026-01-01T00:00:01.000Z',
          'Compliance: 0 blockers, 0 warnings, 1 info',
          '',
          'Props:',
          '  variant: primary',
          '  size: medium',
          '  disabled: false',
          '',
          'Slot (default): Save changes',
          '',
          'This mapping is human-reviewed and export-ready. Do not change props, slots, the target component, or the rationale without a new human review decision.',
        ].join('\n'),
      );
    });

    it('lists blocking findings explicitly', () => {
      const content = renderExportContent(buttonComponentMappingFixture, 'AGENT_BRIEF', {
        decision: acceptedDecision,
        findings: [infoFinding, blockerFinding],
      });

      expect(content).toContain('Compliance: 1 blocker, 0 warnings, 1 info');
      expect(content).toContain('Blocking findings:');
      expect(content).toContain('  - [TOKEN_USAGE] Design token missing a Shoelace target.');
    });

    it('omits the slot line for childless components', () => {
      const content = renderExportContent(inputComponentMappingFixture, 'AGENT_BRIEF', {
        decision: { ...acceptedDecision, mappingId: inputComponentMappingFixture.id },
        findings: [],
      });

      expect(content).not.toContain('Slot (default):');
      expect(content).toContain('Compliance: 0 blockers, 0 warnings, 0 info');
    });
  });
});
