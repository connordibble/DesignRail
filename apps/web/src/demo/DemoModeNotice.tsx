import type { ReactElement } from 'react';

/** Banner for the hosted demo: everything runs in the visitor's tab and resets on reload. */
export function DemoModeNotice(): ReactElement {
  return (
    <aside
      aria-label="Demo mode notice"
      className="border-b border-dr-border bg-dr-shell px-dr-md py-dr-xs text-center text-dr-caption text-dr-muted"
    >
      Hosted demo — the GraphQL API, SQLite database, and review pipeline run entirely in this
      browser tab. Decisions reset on reload.{' '}
      <a
        className="font-medium text-dr-text underline"
        href="https://github.com/connordibble/DesignRail"
      >
        View the source
      </a>
    </aside>
  );
}
