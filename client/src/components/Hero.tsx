import { useState, useEffect } from 'react';

const TAGLINES = [
  'The only way to disappear is to be boring.',
  'Blend in. Break out. Get away.',
  'Behavior is the disguise.',
  'Every point is a risk.',
];

export default function Hero() {
  const [tagIdx, setTagIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setTagIdx(i => (i + 1) % TAGLINES.length);
        setVisible(true);
      }, 400);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const specs = [
    { label: 'Genre', value: 'Social Stealth / Party' },
    { label: 'Platform', value: 'PC — Steam' },
    { label: 'Players', value: '5–16 per match' },
    { label: 'Perspective', value: 'Third-person' },
    { label: 'Round length', value: '~5–6 minutes' },
    { label: 'Net model', value: 'EOS listen server' },
  ];

  return (
    <section className="relative min-h-screen flex flex-col justify-center scanline grid-bg pt-14">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />

      <div className="relative max-w-6xl mx-auto px-6 py-20 w-full">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px w-8 bg-npc-subtle" />
          <span className="text-xs text-npc-subtle tracking-[0.3em] uppercase">Greyhaven Game Studios</span>
          <div className="h-px flex-1 bg-npc-border" />
        </div>

        {/* Title */}
        <h1 className="text-[clamp(4rem,12vw,9rem)] font-bold leading-none tracking-tight mb-2 select-none">
          <span className="text-npc-text">N</span>
          <span className="text-npc-text">P</span>
          <span className="text-npc-break">C</span>
        </h1>

        {/* Rotating tagline */}
        <p
          className="text-lg md:text-xl text-npc-muted mb-10 h-8 transition-opacity duration-300"
          style={{ opacity: visible ? 1 : 0 }}
        >
          {TAGLINES[tagIdx]}
          <span className="blink ml-0.5 text-npc-break">_</span>
        </p>

        {/* Elevator pitch */}
        <p className="max-w-2xl text-npc-muted text-sm leading-relaxed mb-14 border-l-2 border-npc-break pl-4">
          A social hide-and-seek party game where the only way to disappear is to be boring.
          You're a crook pulling a heist inside a city of identical grey commuters. To survive,
          blend in by acting exactly like an NPC. To win, stop acting like one —
          and every moment you do is a deliberate flash of exposure.
        </p>

        {/* Spec grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-npc-border border border-npc-border">
          {specs.map(s => (
            <div key={s.label} className="bg-npc-surface px-4 py-3">
              <div className="text-[10px] text-npc-subtle uppercase tracking-widest mb-1">{s.label}</div>
              <div className="text-xs text-npc-text font-semibold">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Comparables */}
        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-npc-subtle">
          <span className="tracking-widest uppercase">Think:</span>
          {['Prop Hunt', 'Among Us', 'Meccha Chameleon'].map(c => (
            <span key={c} className="px-2 py-1 border border-npc-border text-npc-muted">{c}</span>
          ))}
          <span className="text-npc-subtle">— but the disguise is your <em className="text-npc-text not-italic font-semibold">behavior</em>.</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-npc-subtle">
        <span className="text-[10px] tracking-widest uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-npc-subtle to-transparent" />
      </div>
    </section>
  );
}
