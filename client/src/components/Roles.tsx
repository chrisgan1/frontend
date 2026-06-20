import { useState } from 'react';

const crewTools = [
  { name: 'Blend/Break movement', desc: 'The core mechanic — switch between safe and scoring states' },
  { name: 'Emote wheel', desc: 'Match ambient cues and taunt the cop' },
  { name: 'Interact', desc: 'Pull jobs and hit sabotage targets (Break only)' },
  { name: 'Ping', desc: 'Mark objectives or the cop\'s last known position for teammates' },
];

const copTools = [
  { name: 'Arrest', desc: '~3m range, line of sight. Wrong = paperwork lockout + point loss + slow', accent: '#ef4444' },
  { name: 'Profiler scan', desc: 'Pulse that highlights clean NPC loops, leaving out-of-sync bodies dim. 25s cooldown', accent: '#60a5fa' },
  { name: 'Megaphone', desc: 'Manually trigger an ambient cue — force a crowd reaction, catch the fumblers', accent: '#60a5fa' },
  { name: 'Dispatch', desc: 'Call wrecked surveillance systems back online over time', accent: '#60a5fa' },
];

export default function Roles() {
  const [tab, setTab] = useState<'crew' | 'cop'>('crew');

  return (
    <section id="roles" className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Roles</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// rotate each round, like Among Us</span>
        </div>

        <div className="flex gap-px bg-npc-border border border-npc-border mb-8 w-fit">
          <button
            onClick={() => setTab('crew')}
            className={`px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-all ${
              tab === 'crew' ? 'bg-npc-crook/20 text-npc-crook border-b-2 border-npc-crook' : 'bg-npc-surface text-npc-subtle hover:text-npc-muted'
            }`}
          >
            The Crew (Hiders)
          </button>
          <button
            onClick={() => setTab('cop')}
            className={`px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-all ${
              tab === 'cop' ? 'bg-npc-cop/20 text-npc-cop border-b-2 border-npc-cop' : 'bg-npc-surface text-npc-subtle hover:text-npc-muted'
            }`}
          >
            The Patrolman (Seeker)
          </button>
        </div>

        {tab === 'crew' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-npc-crook/30 bg-npc-crook/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-npc-crook rounded-full" />
                <span className="text-sm font-semibold text-npc-crook">Flamboyant Crooks</span>
              </div>
              <p className="text-xs text-npc-muted leading-relaxed mb-6">
                Colorful, cocky, expressive — and the game constantly tempts them to express it, then punishes
                them for it. No combat. Crooks cannot fight the cop — only evade, sabotage, and outwit.
              </p>
              <div className="space-y-1 text-xs text-npc-muted">
                <div className="flex gap-2"><span className="text-npc-crook">→</span> Spawn into bustling crowd during Infiltration (no cop present)</div>
                <div className="flex gap-2"><span className="text-npc-crook">→</span> Pull jobs to build personal take</div>
                <div className="flex gap-2"><span className="text-npc-crook">→</span> Sabotage the surveillance grid for the crew</div>
                <div className="flex gap-2"><span className="text-npc-crook">→</span> Crack the Score, then sprint for the getaway van</div>
              </div>
            </div>
            <div>
              <h3 className="text-xs text-npc-subtle tracking-widest uppercase mb-3">Toolkit</h3>
              <div className="space-y-px border border-npc-border">
                {crewTools.map((t, i) => (
                  <div key={i} className="bg-npc-surface p-4">
                    <div className="text-xs font-semibold text-npc-crook mb-1">{t.name}</div>
                    <div className="text-xs text-npc-muted">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'cop' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-npc-cop/30 bg-npc-cop/5 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-npc-cop rounded-full" />
                <span className="text-sm font-semibold text-npc-cop">The Pattern Police</span>
              </div>
              <p className="text-xs text-npc-muted leading-relaxed mb-6">
                Visibly distinct — enters after Infiltration so crooks can see them coming.
                Hunts by reading behavior, not aura. Detection is skill, not magic.
                Bumbling-but-dangerous, with heavy miss cost.
              </p>
              <div className="space-y-1 text-xs text-npc-muted">
                <div className="flex gap-2"><span className="text-npc-cop">→</span> 1 cop ≤11 players / 2 cops at 12+</div>
                <div className="flex gap-2"><span className="text-npc-cop">→</span> Watch clusters; bait near objectives</div>
                <div className="flex gap-2"><span className="text-npc-cop">→</span> Rich crooks pay more when collared</div>
                <div className="flex gap-2 items-start"><span className="text-npc-alarm shrink-0">!</span> False arrest: 12s lockout + point loss + slowed</div>
              </div>
            </div>
            <div>
              <h3 className="text-xs text-npc-subtle tracking-widest uppercase mb-3">Toolkit</h3>
              <div className="space-y-px border border-npc-border">
                {copTools.map((t, i) => (
                  <div key={i} className="bg-npc-surface p-4">
                    <div className="text-xs font-semibold mb-1" style={{ color: t.accent }}>{t.name}</div>
                    <div className="text-xs text-npc-muted">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
