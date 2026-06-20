export default function Nav() {
  const links = [
    { label: 'Loop', href: '#loop' },
    { label: 'Systems', href: '#systems' },
    { label: 'Roles', href: '#roles' },
    { label: 'Maps', href: '#maps' },
    { label: 'Roadmap', href: '#roadmap' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-npc-border bg-npc-bg/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 border border-npc-subtle flex items-center justify-center">
            <div className="w-3 h-3 bg-npc-break" />
          </div>
          <span className="text-sm font-semibold tracking-[0.2em] text-npc-text uppercase">NPC</span>
          <span className="text-xs text-npc-subtle tracking-widest hidden sm:inline">// GAME DESIGN BRIEF v1.0</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs text-npc-muted hover:text-npc-text transition-colors tracking-widest uppercase"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="tag" style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
            Phase 0
          </span>
          <span className="text-xs text-npc-subtle">Prototype</span>
        </div>
      </div>
    </nav>
  );
}
