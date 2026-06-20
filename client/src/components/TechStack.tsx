const params = [
  { label: 'Lobby size', value: '5–16 (default 8–12)' },
  { label: 'Cops', value: '1 (≤11) / 2 (12+)' },
  { label: 'Infiltration phase', value: '25s' },
  { label: 'Hunt phase', value: '240s' },
  { label: 'Getaway / Last Call', value: '35s' },
  { label: 'Ambient NPC count', value: '30–60' },
  { label: 'Blend walk speed', value: 'Commuter baseline' },
  { label: 'Break sprint speed', value: '~1.8× Blend' },
  { label: 'Profiler scan cooldown', value: '25s / highlight 3s' },
  { label: 'Ambient cue frequency', value: 'Every 30–45s' },
  { label: 'Cue reaction window', value: '~1.5s' },
  { label: 'Score job duration', value: '3–5s (Break anim)' },
  { label: 'False-arrest lockout', value: '12s' },
  { label: 'Arrest range', value: '~3m, line of sight' },
  { label: 'Brass bonus', value: '+50% under cop view' },
  { label: 'CCTV blackout', value: '40s' },
];

const stack = [
  { name: 'Unity (LTS) / C#', note: 'ECS/DOTS available if crowd perf demands it' },
  { name: 'Epic Online Services', note: 'Relay, NAT punchthrough, lobbies, browser' },
  { name: 'Steamworks', note: 'Friends, invites, achievements, Workshop' },
  { name: 'Easy Anti-Cheat (plan)', note: 'Never expose crook identity to clients' },
];

export default function TechStack() {
  return (
    <section className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Tech & Tuning</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// starting values — all tunable</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Tuning params */}
          <div className="lg:col-span-2">
            <h3 className="text-xs text-npc-subtle tracking-widest uppercase mb-3">Tuning Parameters</h3>
            <div className="grid grid-cols-2 gap-px bg-npc-border border border-npc-border">
              {params.map((p, i) => (
                <div key={i} className="bg-npc-surface px-4 py-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-npc-muted">{p.label}</span>
                  <span className="text-xs text-npc-text font-semibold font-mono">{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stack */}
          <div>
            <h3 className="text-xs text-npc-subtle tracking-widest uppercase mb-3">Stack</h3>
            <div className="space-y-px border border-npc-border">
              {stack.map((s, i) => (
                <div key={i} className="bg-npc-surface p-4">
                  <div className="text-xs font-semibold text-npc-text mb-1">{s.name}</div>
                  <div className="text-xs text-npc-subtle">{s.note}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 border border-npc-escape/20 bg-npc-escape/5 p-4">
              <div className="text-xs font-semibold text-npc-escape mb-1">Performance target</div>
              <div className="text-xs text-npc-muted">Stable 60fps with ~60 ambient NPCs on mid-range/older laptop hardware.</div>
              <div className="text-xs text-npc-subtle mt-2">Low minimum spec is a commercial requirement, not a nicety. Friendslop reaches wide.</div>
            </div>

            <div className="mt-4 border border-npc-subtle/20 p-4">
              <div className="text-xs font-semibold text-npc-muted mb-1">Net model</div>
              <div className="text-xs text-npc-muted">Host-authoritative listen server. Max player count scales with host connection.</div>
              <div className="text-xs text-npc-subtle mt-2">Streamer-friendly: easy viewer-participation hosting is first-class.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
