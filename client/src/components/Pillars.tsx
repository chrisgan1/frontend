const pillars = [
  {
    n: '01',
    title: 'Behavior is the disguise.',
    body: 'The core skill is acting like an NPC: nerve, timing, and self-control. Appearance never gives you away — what you do does.',
    accent: '#f59e0b',
  },
  {
    n: '02',
    title: 'Every point is a risk.',
    body: 'Blending keeps you alive but earns little; acting earns everything but exposes you. The whole game lives in that trade.',
    accent: '#ef4444',
  },
  {
    n: '03',
    title: 'Playable with strangers.',
    body: 'No text comms needed. Roles, intentions, and bluffs read through behavior and emotes alone. Protects the streamer and random-lobby experience.',
    accent: '#22c55e',
  },
  {
    n: '04',
    title: 'Short, legible, clippable.',
    body: 'Rounds end fast. A spectator should understand what\'s happening in five seconds. The funniest moments are obvious on screen.',
    accent: '#60a5fa',
  },
  {
    n: '05',
    title: 'Fair to read, fair to hide.',
    body: 'NPCs must be human enough to imitate but robotic enough to read. The cop always has a legitimate way to spot; the crook always has a legitimate way to vanish.',
    accent: '#a78bfa',
  },
];

export default function Pillars() {
  return (
    <section className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Design Pillars</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// load-bearing decisions</span>
        </div>

        <div className="grid md:grid-cols-5 gap-px bg-npc-border border border-npc-border">
          {pillars.map(p => (
            <div key={p.n} className="bg-npc-surface p-5 flex flex-col gap-3 group hover:bg-npc-surface2 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-npc-subtle font-mono">{p.n}</span>
                <div className="w-2 h-2 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: p.accent }} />
              </div>
              <p className="text-sm font-semibold text-npc-text leading-snug" style={{ color: p.accent }}>
                {p.title}
              </p>
              <p className="text-xs text-npc-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
