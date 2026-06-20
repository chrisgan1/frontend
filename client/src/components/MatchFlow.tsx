const phases = [
  {
    name: 'Infiltration',
    duration: '~25s',
    color: '#22c55e',
    desc: 'Crooks spawn into the live crowd. No cop. Learn patterns, scout objectives, settle into Blend.',
    role: 'crook',
  },
  {
    name: 'Hunt',
    duration: '~240s',
    color: '#f59e0b',
    desc: 'The core loop. Crooks pull jobs and sabotage; cop hunts. Score meter fills toward the heist target.',
    role: 'both',
  },
  {
    name: 'Getaway',
    duration: '~35s',
    color: '#ef4444',
    desc: 'Score cracked. Alarms blare. Lockdown. Every crook drops the act and sprints for the getaway van. Exits seal. This is the bit built to be clipped.',
    role: 'crook',
    special: true,
  },
  {
    name: 'Reveal',
    duration: '~20s',
    color: '#60a5fa',
    desc: 'Caught vs. escaped revealed. Leaderboard, MVP highlighted, fast re-queue.',
    role: 'both',
  },
];

const scoring = {
  crook: [
    { source: 'Survive (per 10s undetected)', award: 'Small trickle' },
    { source: 'Score job', award: 'Medium (varies by job)' },
    { source: 'Brass bonus (under cop view cone)', award: '+50% job value' },
    { source: 'Sabotage', award: 'Small + crew benefit' },
    { source: 'Reach getaway van', award: 'Large' },
    { source: 'Caught', award: 'Banked points retained' },
  ],
  cop: [
    { source: 'Correct collar', award: 'Medium (scales with crook\'s take)' },
    { source: 'Speed bonus', award: 'Diminishing over round' },
    { source: 'Case Closed (all collared)', award: 'Large' },
    { source: 'False arrest', award: '− Points + lockout + slow' },
  ],
};

export default function MatchFlow() {
  return (
    <section className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Match Flow</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// total ~5–6 min per round</span>
        </div>

        {/* Timeline */}
        <div className="flex gap-px bg-npc-border border border-npc-border mb-10">
          {phases.map((p, i) => (
            <div
              key={i}
              className="flex-1 p-5 bg-npc-surface hover:bg-npc-surface2 transition-colors relative"
              style={p.special ? { background: 'rgba(239,68,68,0.06)' } : {}}
            >
              {p.special && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-npc-alarm" />
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] text-npc-subtle">{String(i + 1).padStart(2, '0')}</span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 border"
                  style={{ color: p.color, borderColor: p.color + '40', background: p.color + '10' }}
                >
                  {p.duration}
                </span>
              </div>
              <div className="text-sm font-semibold mb-2" style={{ color: p.color }}>{p.name}</div>
              <p className="text-xs text-npc-muted leading-relaxed">{p.desc}</p>
              {p.special && (
                <p className="text-[10px] text-npc-alarm mt-3 italic">← The signature beat. Built to be clipped.</p>
              )}
            </div>
          ))}
        </div>

        {/* Scoring */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-npc-crook rounded-full" />
              <h3 className="text-xs font-semibold text-npc-crook tracking-widest uppercase">Crook Scoring</h3>
            </div>
            <div className="border border-npc-border overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {scoring.crook.map((r, i) => (
                    <tr key={i} className="border-b border-npc-border last:border-0 bg-npc-surface">
                      <td className="px-3 py-2 text-npc-muted">{r.source}</td>
                      <td className="px-3 py-2 text-npc-crook font-semibold text-right whitespace-nowrap">{r.award}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-npc-cop rounded-full" />
              <h3 className="text-xs font-semibold text-npc-cop tracking-widest uppercase">Cop Scoring</h3>
            </div>
            <div className="border border-npc-border overflow-hidden">
              <table className="w-full text-xs">
                <tbody>
                  {scoring.cop.map((r, i) => (
                    <tr key={i} className={`border-b border-npc-border last:border-0 bg-npc-surface ${r.award.startsWith('−') ? 'text-npc-alarm' : ''}`}>
                      <td className="px-3 py-2 text-npc-muted">{r.source}</td>
                      <td className={`px-3 py-2 font-semibold text-right whitespace-nowrap ${r.award.startsWith('−') ? 'text-npc-alarm' : 'text-npc-cop'}`}>{r.award}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
