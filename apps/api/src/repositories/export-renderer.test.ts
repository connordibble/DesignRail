import { buttonComponentMappingFixture } from '@designrail/shared';
import { describe, expect, it } from 'vitest';

import { renderExportContent } from './export-renderer.js';

describe('export renderer', () => {
  it('renders deterministic Shoelace HTML and React examples', () => {
    expect(renderExportContent(buttonComponentMappingFixture, 'HTML')).toBe(
      '<sl-button variant="primary" size="medium">Save changes</sl-button>',
    );
    expect(renderExportContent(buttonComponentMappingFixture, 'REACT')).toBe(
      '<SlButton variant="primary" size="medium">Save changes</SlButton>',
    );
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
});
