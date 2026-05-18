export function App() {
  return (
    <main className="min-h-screen bg-[#08090b] text-[#eef2f7]">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
        <section className="w-full rounded-xl border border-[#252b35] bg-[#12151a] p-6 shadow-2xl shadow-black/20">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-[#252b35] pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#737c8b]">
                Mock mode
              </p>
              <h1 className="mt-2 text-2xl font-semibold">DesignRail</h1>
            </div>
            <span className="rounded-md border border-[#343c49] bg-[#171b22] px-2.5 py-1 text-xs text-[#a8b0bd]">
              Checkpoint 0
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[#252b35] bg-[#0d0f12] p-4">
              <h2 className="text-sm font-semibold">Review UI</h2>
              <p className="mt-2 text-sm text-[#a8b0bd]">
                Phase 1 shell for human-reviewed design-to-engineering mappings.
              </p>
            </div>
            <div className="rounded-lg border border-[#252b35] bg-[#0d0f12] p-4">
              <h2 className="text-sm font-semibold">GraphQL contract</h2>
              <p className="mt-2 text-sm text-[#a8b0bd]">
                API, persistence, and review decisions land in the next checkpoint.
              </p>
            </div>
            <div className="rounded-lg border border-[#252b35] bg-[#0d0f12] p-4">
              <h2 className="text-sm font-semibold">Deterministic gates</h2>
              <p className="mt-2 text-sm text-[#a8b0bd]">
                Strict checks keep the mock-first workflow honest as the product grows.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
