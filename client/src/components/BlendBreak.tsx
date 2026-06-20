import { useState } from 'react';

const tells = [
  'Moving faster than Commuter pace (sprinting)',
  'Crouching, jumping, or vaulting',
  'Sharp or erratic turns / off-walkway pathing',
  'Touching or lingering at interactive objects',
  'Reacting late, wrong, or not at all to an ambient cue',
  'Standing dead-still too long (over-turtling is also a tell)',
  'Two "Commuters" performing the same player-ish action',
  'Flash of color or swagger in Break mode',
];

const controls = [
  { action: 'Move', gamepad: 'Left stick', kmb: 'WASD', mode: 'both' },
  { action: 'Camera', gamepad: 'Right stick', kmb: 'Mouse', mode: 'both' },
  { action: 'Blend (default)', gamepad: '— (no hold)', kmb: '— (no hold)', mode: 'blend' },
  { action: 'Break (go hot)', gamepad: 'Hold LT/L2', kmb: 'Hold Shift', mode: 'break' },
  { action: 'Interact', gamepad: 'A / X', kmb: 'E', mode: 'break' },
  { action: 'Emote wheel', gamepad: 'Hold RB/R1', kmb: 'Hold Q', mode: 'both' },
  { action: 'Ping / mark', gamepad: 'RT/R2', kmb: 'Middle-click', mode: 'both' },
  { action: 'Crouch', gamepad: 'B / Circle', kmb: 'Ctrl', mode: 'break' },
];

export default function BlendBreak() {
  const [activeMode, setActiveMode] = useState<'blend' | 'break'>('blend');

  return (
    <section id="systems" className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-12">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">Movement System</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// the single most important system</span>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-px bg-npc-border border border-npc-border mb-8 w-fit">
          <button
            onClick={() => setActiveMode('blend')}
            className={`px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-all ${
              activeMode === 'blend' ? 'bg-npc-blend/20 text-npc-blend border-b-2 border-npc-blend' : 'bg-npc-surface text-npc-subtle hover:text-npc-muted'
            }`}
          >
            Blend Mode
          </button>
          <button
            onClick={() => setActiveMode('break')}
            className={`px-6 py-3 text-xs font-semibold tracking-widest uppercase transition-all ${
              activeMode === 'break' ? 'bg-npc-break/20 text-npc-break border-b-2 border-npc-break' : 'bg-npc-surface text-npc-subtle hover:text-npc-muted'
            }`}
          >
            Break Mode
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          {/* Blend */}
          <div className={`border p-6 transition-all duration-300 ${
            activeMode === 'blend' ? 'border-npc-blend/40 bg-npc-blend/5' : 'border-npc-border bg-npc-surface opacity-40'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-npc-blend" />
              <span className="text-xs font-semibold text-npc-blend tracking-widest uppercase">Blend Mode — Default</span>
            </div>
            <ul className="space-y-2 text-xs text-npc-muted">
              <li className="flex gap-2"><span className="text-npc-subtle">→</span> Fixed Commuter pace with crowd gait</li>
              <li className="flex gap-2"><span className="text-npc-subtle">→</span> Auto-yields to other NPCs</li>
              <li className="flex gap-2"><span className="text-npc-subtle">→</span> Randomized idle from NPC pool when stationary</li>
              <li className="flex gap-2"><span className="text-npc-subtle">→</span> Set a destination; character ambles there</li>
              <li className="flex gap-2 mt-4"><span className="text-npc-alarm">✗</span> Cannot interact with objectives</li>
              <li className="flex gap-2"><span className="text-npc-alarm">✗</span> Cannot move with any urgency</li>
            </ul>
            <p className="mt-5 text-xs text-npc-subtle italic border-t border-npc-border pt-4">
              "Safe, but itchy. You'll want to go hot. Don't."
            </p>
          </div>

          {/* Break */}
          <div className={`border p-6 transition-all duration-300 ${
            activeMode === 'break' ? 'border-npc-break/40 bg-npc-break/5' : 'border-npc-border bg-npc-surface opacity-40'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-npc-break animate-pulse" />
              <span className="text-xs font-semibold text-npc-break tracking-widest uppercase">Break Mode — Hold Trigger</span>
            </div>
            <ul className="space-y-2 text-xs text-npc-muted">
              <li className="flex gap-2"><span className="text-npc-escape">→</span> Full human agility: sprint, crouch, vault</li>
              <li className="flex gap-2"><span className="text-npc-escape">→</span> Sharp turns, urgent movement</li>
              <li className="flex gap-2"><span className="text-npc-escape">→</span> Interact with objectives and sabotage targets</li>
              <li className="flex gap-2"><span className="text-npc-escape">→</span> <span className="text-npc-text font-semibold">The only way to score points</span></li>
              <li className="flex gap-2 mt-4"><span className="text-npc-alarm">✗</span> Looks unmistakably human</li>
              <li className="flex gap-2"><span className="text-npc-alarm">✗</span> Personality leaks — flash of color, swagger</li>
            </ul>
            <p className="mt-5 text-xs text-npc-subtle italic border-t border-npc-border pt-4">
              "The only way to win. Also the only way to get caught."
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Controls table */}
          <div>
            <h3 className="text-xs text-npc-subtle tracking-widest uppercase mb-3">Controls</h3>
            <div className="border border-npc-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-npc-border bg-npc-surface2">
                    <th className="text-left px-3 py-2 text-npc-subtle font-normal">Action</th>
                    <th className="text-left px-3 py-2 text-npc-subtle font-normal">Pad</th>
                    <th className="text-left px-3 py-2 text-npc-subtle font-normal">KBM</th>
                    <th className="text-left px-3 py-2 text-npc-subtle font-normal">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {controls.map((c, i) => (
                    <tr key={i} className="border-b border-npc-border last:border-0 bg-npc-surface">
                      <td className="px-3 py-2 text-npc-text">{c.action}</td>
                      <td className="px-3 py-2 text-npc-muted">{c.gamepad}</td>
                      <td className="px-3 py-2 text-npc-muted">{c.kmb}</td>
                      <td className="px-3 py-2">
                        <span className={`tag text-[9px] ${
                          c.mode === 'break' ? 'mode-break' :
                          c.mode === 'blend' ? 'mode-blend' : ''
                        }`} style={c.mode === 'both' ? { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#888' } : {}}>
                          {c.mode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tells */}
          <div>
            <h3 className="text-xs text-npc-subtle tracking-widest uppercase mb-3">Tells — what exposes a crook</h3>
            <div className="border border-npc-border bg-npc-surface p-4 space-y-2">
              {tells.map((t, i) => (
                <div key={i} className="flex gap-2 text-xs">
                  <span className="text-npc-alarm shrink-0">▲</span>
                  <span className="text-npc-muted">{t}</span>
                </div>
              ))}
              <p className="text-[10px] text-npc-subtle italic pt-2 border-t border-npc-border mt-3">
                Over-stillness is intentional — camping must score poorly enough to lose.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
