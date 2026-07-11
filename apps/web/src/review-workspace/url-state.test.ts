import { describe, expect, it } from 'vitest';

import {
  DEFAULT_WORKSPACE_VIEW,
  WORKSPACE_VIEWS,
  isWorkspaceView,
  parseWorkspaceSearch,
  serializeWorkspaceSearch,
  workspaceTabToView,
  workspaceViewToTab,
} from './url-state.js';

describe('parseWorkspaceSearch', () => {
  it('parses a valid view and example', () => {
    expect(parseWorkspaceSearch('?view=exports&example=example.button.primary')).toEqual({
      view: 'exports',
      exampleId: 'example.button.primary',
    });
  });

  it('falls back to the review view for unknown or missing views', () => {
    expect(parseWorkspaceSearch('?view=nonsense').view).toBe(DEFAULT_WORKSPACE_VIEW);
    expect(parseWorkspaceSearch('').view).toBe(DEFAULT_WORKSPACE_VIEW);
    expect(parseWorkspaceSearch('?other=1').view).toBe(DEFAULT_WORKSPACE_VIEW);
  });

  it('treats a missing or empty example as unset', () => {
    expect(parseWorkspaceSearch('?view=review').exampleId).toBeNull();
    expect(parseWorkspaceSearch('?view=review&example=').exampleId).toBeNull();
  });
});

describe('serializeWorkspaceSearch', () => {
  it('serializes the view and example', () => {
    expect(serializeWorkspaceSearch({ view: 'history', exampleId: 'example.button.primary' })).toBe(
      '?view=history&example=example.button.primary',
    );
  });

  it('omits the example when unset', () => {
    expect(serializeWorkspaceSearch({ view: 'review', exampleId: null })).toBe('?view=review');
  });

  it('round-trips every valid view', () => {
    for (const view of WORKSPACE_VIEWS) {
      expect(parseWorkspaceSearch(serializeWorkspaceSearch({ view, exampleId: null }))).toEqual({
        view,
        exampleId: null,
      });
    }
  });
});

describe('workspace view and tab mapping', () => {
  it('recognizes only declared views', () => {
    expect(isWorkspaceView('exports')).toBe(true);
    expect(isWorkspaceView('EXPORTS')).toBe(false);
    expect(isWorkspaceView(null)).toBe(false);
  });

  it('maps every view to a tab and back', () => {
    for (const view of WORKSPACE_VIEWS) {
      expect(workspaceTabToView(workspaceViewToTab(view))).toBe(view);
    }
  });
});
