export default function Footer() {
  return (
    <footer className="border-t border-npc-border py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-6 h-6 border border-npc-subtle flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-npc-break" />
              </div>
              <span className="text-sm font-semibold tracking-[0.2em] uppercase">NPC</span>
            </div>
            <p className="text-xs text-npc-subtle max-w-xs leading-relaxed">
              A social hide-and-seek party game where the only way to disappear is to be boring.
            </p>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-npc-subtle tracking-widest uppercase mb-1">Document version</div>
            <div className="text-xs text-npc-muted">v1.0 — Concept Handoff</div>
            <div className="text-[10px] text-npc-subtle mt-1">Audience: design, engineering, art, audio, production</div>
          </div>
        </div>

        <div className="border-t border-npc-border pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-[10px] text-npc-subtle">
            All values are first-pass starting points for tuning, not final. Exact values, map layouts,
            and feature details are expected to evolve through prototyping and playtesting.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-1.5 h-1.5 bg-npc-escape rounded-full animate-pulse" />
            <span className="text-[10px] text-npc-escape">Phase 0 — Prototype</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
