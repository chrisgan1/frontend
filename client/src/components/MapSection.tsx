const cues = [
  { trigger: 'Train arrives', reaction: 'All heads turn to watch', icon: '🚂' },
  { trigger: 'PA announcement', reaction: 'All cover ears / look up', icon: '📢' },
  { trigger: 'Crossing signal changes', reaction: 'All shuffle across', icon: '🚦' },
  { trigger: 'Pigeon flies past', reaction: 'All track it overhead', icon: '🕊️' },
];

const mapRequirements = [
  'Navmesh + Commuter pathing node graph and idle points',
  '30–60 ambient NPC spawn points with density tuning',
  'Ambient cues with map-specific crowd reaction',
  'Job locations and sabotage/grid object placements',
  'Central Score location and getaway exit(s)',
  'Crook spawn region and cop entry point',
  'Crowd-dense cover zones (queues, clusters, choke points)',
];

const firstMapPOIs = [
  { name: 'Ticket Hall', type: 'crowd zone', color: '#6b7280' },
  { name: 'Platforms', type: 'ambient cue source', color: '#f59e0b' },
  { name: 'Food Court', type: 'cover / jobs', color: '#6b7280' },
  { name: 'Payroll Vault', type: 'the Score', color: '#22c55e' },
  { name: 'Dispatch Booth', type: 'sabotage target', color: '#ef4444' },
  { name: 'PA Array', type: 'sabotage target', color: '#ef4444' },
  { name: 'CCTV Pylons', type: 'wreckable grid', color: '#ef4444' },
  { name: 'Far Platforms', type: 'call-box locations', color: '#a78bfa' },
  { name: 'Taxi Rank', type: 'getaway van exit', color: '#22c55e' },
];

export default function MapSection() {
  return (
    <section id="maps" className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Maps & World</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// the content engine</span>
        </div>

        {/* Setting callout */}
        <div className="border border-npc-border bg-npc-surface p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-1 self-stretch bg-npc-subtle shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-npc-text mb-2">The City of Greyhaven</h3>
              <p className="text-xs text-npc-muted leading-relaxed max-w-2xl">
                Obsessed with order. Its citizens — the <em className="text-npc-text not-italic">Commuters</em> — all wear the same grey coat,
                walk the same shuffle, and react to the same daily rhythms on cue.
                The city is so relentlessly on-schedule that its police stopped watching faces entirely.
                In Greyhaven, <em className="text-npc-text not-italic">anyone acting out of pattern is the crime.</em>
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-10">
          {/* Ambient cues */}
          <div className="lg:col-span-1">
            <h3 className="text-xs text-npc-subtle tracking-widest uppercase mb-3">Ambient Cues</h3>
            <p className="text-xs text-npc-muted mb-4 leading-relaxed">
              Every ~30–45s, the map fires a synchronized event. Every Commuter reacts instantly and identically.
              Miss the ~1.5s window and you stick out.
            </p>
            <div className="space-y-px border border-npc-border">
              {cues.map((c, i) => (
                <div key={i} className="bg-npc-surface p-3 flex items-start gap-3">
                  <span className="text-base shrink-0 grayscale">{c.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-npc-text">{c.trigger}</div>
                    <div className="text-xs text-npc-muted">{c.reaction}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 border border-npc-cop/20 bg-npc-cop/5 p-3">
              <div className="text-[10px] text-npc-cop font-semibold mb-1 tracking-wide uppercase">Cop can trigger manually</div>
              <div className="text-xs text-npc-muted">Megaphone forces a crowd reaction to flush fumblers — a skill-based detection tool for the cop.</div>
            </div>
          </div>

          {/* First map */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xs text-npc-subtle tracking-widest uppercase">First Map</h3>
              <span className="tag" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                Phase 1
              </span>
            </div>
            <div className="border border-npc-border bg-npc-surface p-5 mb-4">
              <div className="text-base font-bold text-npc-text mb-1">Greyhaven Central Station</div>
              <p className="text-xs text-npc-muted leading-relaxed">
                A busy commuter rail hub: ticket halls, platforms, food court, restrooms, and a back-office
                payroll vault as the Score. Trains arriving on schedule are the headline ambient cue.
                CCTV pylons line the concourse; the dispatch booth and PA array sit centrally.
                Getaway van waits at the taxi rank out front.
              </p>
            </div>

            {/* POI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-npc-border border border-npc-border">
              {firstMapPOIs.map((p, i) => (
                <div key={i} className="bg-npc-surface px-3 py-2">
                  <div className="text-xs font-semibold text-npc-text mb-0.5">{p.name}</div>
                  <div className="text-[10px]" style={{ color: p.color }}>{p.type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map requirements */}
        <div>
          <h3 className="text-xs text-npc-subtle tracking-widest uppercase mb-3">Map Requirements — Every Map Must Define</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-npc-border border border-npc-border">
            {mapRequirements.map((r, i) => (
              <div key={i} className="bg-npc-surface px-4 py-3 flex gap-2">
                <span className="text-npc-escape shrink-0 text-xs mt-0.5">✓</span>
                <span className="text-xs text-npc-muted">{r}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border border-npc-subtle/20 p-4 flex items-start gap-3">
          <div className="text-npc-subtle shrink-0 text-xs mt-0.5">◈</div>
          <div>
            <span className="text-xs font-semibold text-npc-muted">Steam Workshop modding</span>
            <span className="text-xs text-npc-subtle"> — ship a documented, data-driven map format with Workshop integration. Meccha's growth was heavily Workshop-driven. Plan for this from the architecture stage, even if Workshop ships post-launch.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
