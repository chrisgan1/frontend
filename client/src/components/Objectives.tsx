const jobs = [
  { name: 'Pickpocket', desc: 'Quick crouch-and-grab from a Commuter', duration: '~3s' },
  { name: 'Crack panel', desc: 'Held animation at a fixed spot', duration: '3–5s' },
  { name: 'Lift loot', desc: 'Scoop marked display or case', duration: '~3s' },
  { name: 'Photograph target', desc: 'Aim and hold still — oddly', duration: '~4s' },
];

const sabotages = [
  {
    target: 'CCTV pylon',
    effect: 'Blinds a zone; slows Profiler refresh there',
    counter: 'Cop re-secures via dispatch (cooldown)',
    duration: '40s',
    accent: '#ef4444',
  },
  {
    target: 'Profiler uplink',
    effect: 'Disables cop\'s scan pulse for a window',
    counter: 'Comes back online after a timer',
    duration: '30s',
    accent: '#ef4444',
  },
  {
    target: 'Dispatch radio (spoof)',
    effect: 'Plants a fake "suspect spotted" marker that drags the cop',
    counter: 'Cop can ignore at risk of a real sighting',
    duration: '—',
    accent: '#f59e0b',
  },
  {
    target: 'PA array',
    effect: 'Stops ambient cues → blending much safer crew-wide',
    counter: 'Cop wants it loud; can attempt repair',
    duration: '—',
    accent: '#f59e0b',
  },
  {
    target: 'Call-box alarm',
    effect: 'Triggers Commuter panic-surge elsewhere, flooding that zone with cover',
    counter: 'Cop chooses whether to chase the surge',
    duration: '—',
    accent: '#22c55e',
  },
  {
    target: 'Decoy bait',
    effect: 'Planted object that reads as a crook, baits a false arrest',
    counter: 'Cop must judge whether it\'s real',
    duration: '—',
    accent: '#a78bfa',
  },
];

export default function Objectives() {
  return (
    <section className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Objectives</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// personal take vs. crew benefit — constant tension</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Score jobs */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-npc-crook rounded-full" />
              <h3 className="text-xs font-semibold text-npc-crook tracking-widest uppercase">Score Jobs — Personal Take</h3>
            </div>
            <p className="text-xs text-npc-muted mb-4 leading-relaxed">
              Scattered, repeatable point sources. Each is a few seconds of an exposing animation.
              Break mode required. All feed the central Score meter.
            </p>
            <div className="space-y-px border border-npc-border">
              {jobs.map((j, i) => (
                <div key={i} className="bg-npc-surface p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-npc-text mb-1">{j.name}</div>
                    <div className="text-xs text-npc-muted">{j.desc}</div>
                  </div>
                  <span className="text-[10px] text-npc-subtle shrink-0 border border-npc-border px-2 py-0.5">{j.duration}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 border border-npc-break/30 bg-npc-break/5 p-4">
              <div className="text-xs font-semibold text-npc-break mb-1">Brass Bonus</div>
              <div className="text-xs text-npc-muted">
                +50% job value if pulled while the cop's view cone is directly on you.
                Maximum risk, maximum reward. Named for nerve.
              </div>
            </div>
          </div>

          {/* Sabotage grid */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-npc-alarm rounded-full animate-pulse" />
              <h3 className="text-xs font-semibold text-npc-alarm tracking-widest uppercase">Sabotage Grid — Wreckable</h3>
            </div>
            <p className="text-xs text-npc-muted mb-4 leading-relaxed">
              The cop's surveillance grid is physical, on the map, and wreckable.
              Dispatch can restore systems — a live tug-of-war all round.
            </p>
            <div className="space-y-px border border-npc-border">
              {sabotages.map((s, i) => (
                <div key={i} className="bg-npc-surface p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-semibold" style={{ color: s.accent }}>{s.target}</span>
                    {s.duration !== '—' && (
                      <span className="text-[10px] text-npc-subtle border border-npc-border px-2 py-0.5 shrink-0">{s.duration}</span>
                    )}
                  </div>
                  <div className="text-xs text-npc-muted mb-1">{s.effect}</div>
                  <div className="text-[10px] text-npc-subtle">Counterplay: {s.counter}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
