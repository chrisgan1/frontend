import { useState } from 'react';

const steps = [
  {
    n: '1',
    label: 'Read',
    mode: 'blend',
    color: '#6b7280',
    desc: "Scan the cop's position and locate the nearest objective. Stay in Blend. You're just another commuter with somewhere to be.",
  },
  {
    n: '2',
    label: 'Drift',
    mode: 'blend',
    color: '#6b7280',
    desc: "Amble toward the objective along a Commuter-plausible path. Fixed pace. Auto-yield. No urgency. You are invisible.",
  },
  {
    n: '3',
    label: 'React',
    mode: 'blend',
    color: '#6b7280',
    desc: 'An ambient cue fires — the train arrives, the PA chimes. Every Commuter reacts at once. You have ~1.5s to match them perfectly or stick out.',
  },
  {
    n: '4',
    label: 'Break',
    mode: 'break',
    color: '#f59e0b',
    desc: "Cop looks away. Hold the trigger. Full agility — sprint, crouch, vault. Complete the job in a few seconds of animation no Commuter would do. Then snap back.",
  },
  {
    n: '5',
    label: 'Cool off',
    mode: 'blend',
    color: '#6b7280',
    desc: "Amble into a cluster of Commuters. Let the heat fade. You never existed. Repeat until the Score cracks — then run.",
  },
];

export default function CoreLoop() {
  const [active, setActive] = useState(0);

  return (
    <section id="loop" className="py-24 border-t border-npc-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[10px] text-npc-subtle tracking-[0.3em] uppercase">The Core Loop</span>
          <div className="h-px flex-1 bg-npc-border" />
          <span className="text-[10px] text-npc-subtle">// repeats every 10–20s</span>
        </div>
        <p className="text-npc-muted text-sm mb-12 max-w-xl">
          This loop is the product. Phase 0 exists to prove it's fun before anything else is built.
        </p>

        {/* Step strip */}
        <div className="flex gap-px bg-npc-border border border-npc-border mb-0.5">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex-1 px-3 py-3 flex flex-col items-center gap-1.5 transition-all text-left ${
                active === i ? 'bg-npc-surface2' : 'bg-npc-surface hover:bg-npc-surface2'
              }`}
            >
              <span className="text-[10px] text-npc-subtle">{s.n}</span>
              <span
                className="text-xs font-semibold tracking-wide"
                style={{ color: active === i ? s.color : undefined }}
              >
                {s.label}
              </span>
              <div
                className="h-0.5 w-full transition-all duration-200"
                style={{ background: active === i ? s.color : 'transparent' }}
              />
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <div className="border border-npc-border border-t-0 bg-npc-surface p-6 flex items-start gap-6">
          <div className="shrink-0">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color: steps[active].color }}
            >
              {steps[active].n}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-semibold text-npc-text">{steps[active].label}</span>
              <span className={`tag ${steps[active].mode === 'break' ? 'mode-break' : 'mode-blend'}`}>
                {steps[active].mode === 'break' ? 'BREAK MODE' : 'BLEND MODE'}
              </span>
            </div>
            <p className="text-sm text-npc-muted leading-relaxed max-w-lg">{steps[active].desc}</p>
          </div>
        </div>

        {/* Cop parallel */}
        <div className="mt-6 border border-npc-cop/20 bg-npc-cop/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-npc-cop rounded-full" />
            <span className="text-xs text-npc-cop font-semibold tracking-widest uppercase">Cop's parallel loop</span>
          </div>
          <p className="text-xs text-npc-muted leading-relaxed">
            Patrol → watch clusters → fire Profiler scan → use megaphone to trigger ambient cues → shadow suspects →
            bait near objectives they want → commit an arrest only when confident (because misses hurt).
          </p>
        </div>
      </div>
    </section>
  );
}
