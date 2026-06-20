import { useState } from 'react';

const phases = [
  {
    id: 0,
    name: 'Prototype',
    subtitle: 'Vertical slice',
    status: 'current',
    color: '#22c55e',
    goal: 'Prove the core loop is fun',
    scope: [
      'One greybox map',
      'Blend/Break movement',
      'Basic NPC pathing + 1–2 ambient cues',
      '1 cop + crooks',
      'Basic arrest + false-arrest penalty',
      'Win = survive timer',
      'Local/LAN or minimal EOS',
    ],
    outOfScope: ['Sabotage', 'Score jobs'],
    exitCriteria: 'Playtesters feel the blend tension and want another round with just survival',
  },
  {
    id: 1,
    name: 'Core Loop',
    subtitle: 'Complete',
    status: 'upcoming',
    color: '#f59e0b',
    goal: 'A full, playable round online',
    scope: [
      'Score jobs',
      'Score meter + getaway climax',
      'Full scoring',
      'Profiler scan',
      'HUD for both roles',
      'EOS public/private lobbies',
      'Friends + invites',
    ],
    outOfScope: [],
    exitCriteria: 'A stranger can join, learn it in one round, and have fun without voice chat',
  },
  {
    id: 2,
    name: 'Sabotage',
    subtitle: 'Strategic layer',
    status: 'future',
    color: '#ef4444',
    goal: 'The strategic layer',
    scope: [
      'Wreckable grid (CCTV, Profiler jam, dispatch spoof, PA cut, call-box)',
      'Cop dispatch repair',
      'Decoy bait',
      'Personal vs. team tension live',
    ],
    outOfScope: [],
    exitCriteria: 'Sabotage meaningfully changes round outcomes; cop/crew tug-of-war feels alive',
  },
  {
    id: 3,
    name: 'Polish',
    subtitle: 'Ship-ready',
    status: 'future',
    color: '#60a5fa',
    goal: 'Ship-ready',
    scope: [
      'Greyhaven Central Station finished',
      '2–3 more maps',
      'Undercover mode',
      'Cosmetics + light meta',
      'Workshop modding',
      'Art/audio polish',
      'Tutorial + accessibility',
      'Performance pass + anti-cheat',
    ],
    outOfScope: [],
    exitCriteria: 'Hits 60fps on min spec; full onboarding; passes a public playtest',
  },
  {
    id: 4,
    name: 'Launch',
    subtitle: 'Live',
    status: 'future',
    color: '#a78bfa',
    goal: 'Release and sustain',
    scope: [
      'Steam launch',
      'Post-launch maps/modes/cosmetics cadence',
      'Workshop community support',
    ],
    outOfScope: [],
    exitCriteria: 'Live, stable, with a content roadmap',
  },
];

const risks = [
  { title: 'NPC AI tightrope', severity: 'high', desc: 'Too random → nothing is copyable. Too rigid → crooks trivially spotted. This balance IS the game. Needs heavy Phase 0 prototyping.' },
  { title: 'Anti-cheat is existential', severity: 'high', desc: 'A single ESP cheat reveals every crook and kills the game. Treat as a launch requirement, not a patch. Never expose crook identity to clients.' },
  { title: 'Camping / turtle meta', severity: 'medium', desc: 'Pure hiding must score poorly enough that it loses — addressed via objective scoring, Brass bonus, and over-stillness as a tell. Needs validation.' },
  { title: 'False-arrest tuning', severity: 'medium', desc: 'Too punishing → cop never commits; too lenient → crowd bluff dies. A core balance dial.' },
  { title: 'Onboarding Blend/Break', severity: 'medium', desc: 'Novel scheme. If players can\'t grasp it fast, the funnel leaks. Invest in the tutorial.' },
  { title: 'Crowd performance at scale', severity: 'medium', desc: '30–60 NPCs with synchronized reactions on low-end hardware. Consider ECS/DOTS if profiling demands it.' },
];

export default function Roadmap() {
  const [activePhase, setActivePhase] = useState(0);
  const phase = phases[activePhase];

  return (
    <section id="roadmap" className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Build Plan</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// MVP-first. Prove fun before depth.</span>
        </div>

        {/* Phase nav */}
        <div className="flex gap-px bg-npc-border border border-npc-border mb-0.5">
          {phases.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActivePhase(i)}
              className={`flex-1 px-3 py-3 text-center transition-all ${
                activePhase === i ? 'bg-npc-surface2' : 'bg-npc-surface hover:bg-npc-surface2'
              }`}
            >
              <div className="text-[10px] text-npc-subtle mb-1">Phase {p.id}</div>
              <div
                className="text-xs font-semibold"
                style={{ color: activePhase === i ? p.color : undefined }}
              >
                {p.name}
              </div>
              {p.status === 'current' && (
                <div className="mt-1.5 w-1.5 h-1.5 bg-npc-escape rounded-full mx-auto animate-pulse" />
              )}
            </button>
          ))}
        </div>

        <div className="border border-npc-border border-t-0 bg-npc-surface p-6 mb-10">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-[10px] text-npc-subtle mb-1 tracking-widest">PHASE {phase.id}</div>
              <h3 className="text-xl font-bold" style={{ color: phase.color }}>{phase.name}</h3>
              <div className="text-xs text-npc-muted">{phase.goal}</div>
            </div>
            <span
              className="tag shrink-0"
              style={{
                background: phase.color + '15',
                border: `1px solid ${phase.color}40`,
                color: phase.color
              }}
            >
              {phase.status === 'current' ? 'Now Building' : phase.status === 'upcoming' ? 'Upcoming' : 'Future'}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] text-npc-subtle tracking-widest uppercase mb-2">In scope</div>
              <ul className="space-y-1.5">
                {phase.scope.map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs text-npc-muted">
                    <span style={{ color: phase.color }} className="shrink-0">→</span>
                    {s}
                  </li>
                ))}
              </ul>
              {phase.outOfScope.length > 0 && (
                <div className="mt-4">
                  <div className="text-[10px] text-npc-subtle tracking-widest uppercase mb-2">Explicitly out</div>
                  {phase.outOfScope.map((s, i) => (
                    <div key={i} className="flex gap-2 text-xs text-npc-subtle">
                      <span>✗</span>{s}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border border-npc-border p-4">
              <div className="text-[10px] text-npc-subtle tracking-widest uppercase mb-2">Exit criteria</div>
              <p className="text-xs text-npc-muted leading-relaxed italic">{phase.exitCriteria}</p>
            </div>
          </div>
        </div>

        {/* Risks */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Risks & Open Questions</span>
            <div className="h-px flex-1 bg-npc-border" />
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-npc-border border border-npc-border">
            {risks.map((r, i) => (
              <div key={i} className="bg-npc-surface p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="tag text-[9px]"
                    style={r.severity === 'high'
                      ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }
                      : { background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }
                    }
                  >
                    {r.severity}
                  </span>
                </div>
                <div className="text-xs font-semibold text-npc-text mb-1.5">{r.title}</div>
                <p className="text-xs text-npc-muted leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
