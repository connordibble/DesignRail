import type { WorkspaceTab } from './ReviewWorkspaceShell.js';

/**
 * Public URL contract for the review workspace:
 * `?view=<dashboard|compliance|review|history|exports|schema>&example=<example-id>`.
 * Unknown views fall back to the review workbench; the example falls back to the
 * default selection logic once the example list is known.
 */
export const WORKSPACE_VIEWS = [
  'dashboard',
  'compliance',
  'review',
  'history',
  'exports',
  'schema',
] as const;

export type WorkspaceView = (typeof WORKSPACE_VIEWS)[number];

export const DEFAULT_WORKSPACE_VIEW: WorkspaceView = 'review';

const VIEW_TO_TAB: Record<WorkspaceView, WorkspaceTab> = {
  dashboard: 'Dashboard',
  compliance: 'Compliance',
  review: 'Review',
  history: 'History',
  exports: 'Exports',
  schema: 'Schema',
};

const TAB_TO_VIEW: Record<WorkspaceTab, WorkspaceView> = {
  Dashboard: 'dashboard',
  Compliance: 'compliance',
  Review: 'review',
  History: 'history',
  Exports: 'exports',
  Schema: 'schema',
};

export interface WorkspaceUrlState {
  view: WorkspaceView;
  exampleId: string | null;
}

export function isWorkspaceView(value: string | null): value is WorkspaceView {
  return value !== null && (WORKSPACE_VIEWS as readonly string[]).includes(value);
}

export function workspaceViewToTab(view: WorkspaceView): WorkspaceTab {
  return VIEW_TO_TAB[view];
}

export function workspaceTabToView(tab: WorkspaceTab): WorkspaceView {
  return TAB_TO_VIEW[tab];
}

/** Parse a location search string into validated workspace state. */
export function parseWorkspaceSearch(search: string): WorkspaceUrlState {
  const params = new URLSearchParams(search);
  const rawView = params.get('view');
  const rawExampleId = params.get('example');

  return {
    view: isWorkspaceView(rawView) ? rawView : DEFAULT_WORKSPACE_VIEW,
    exampleId: rawExampleId === null || rawExampleId.length === 0 ? null : rawExampleId,
  };
}

/** Serialize workspace state into a search string (always `?view=`, `&example=` when set). */
export function serializeWorkspaceSearch(state: WorkspaceUrlState): string {
  const params = new URLSearchParams();
  params.set('view', state.view);

  if (state.exampleId !== null) {
    params.set('example', state.exampleId);
  }

  return `?${params.toString()}`;
}
