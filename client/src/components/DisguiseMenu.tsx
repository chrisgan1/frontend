import { useGameStore } from '../store/useGameStore';
import { setPropDisguise } from '../socket';
import { PROP_TYPES } from '../constants';

export default function DisguiseMenu() {
  const show = useGameStore(s => s.showDisguiseMenu);
  const myRole = useGameStore(s => s.myRole);
  const phase = useGameStore(s => s.phase);
  const setShow = useGameStore(s => s.setShowDisguiseMenu);

  if (!show || myRole !== 'prop' || (phase !== 'hiding' && phase !== 'hunting')) return null;

  const handlePick = (typeId: string) => {
    setPropDisguise(typeId);
    setShow(false);
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-dream-surface border border-dream-teal/40 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-dream-teal font-bold text-lg">Choose Disguise</h2>
          <button
            onClick={() => setShow(false)}
            className="text-dream-muted hover:text-dream-text text-sm transition-colors"
          >
            Close (Tab)
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PROP_TYPES.map(pt => (
            <button
              key={pt.id}
              onClick={() => handlePick(pt.id)}
              className="bg-dream-bg hover:bg-dream-teal/10 border border-dream-accent/20 hover:border-dream-teal/50 rounded-xl p-3 text-center transition-all group"
            >
              <div
                className="w-10 h-10 mx-auto mb-2 rounded"
                style={{
                  backgroundColor: `#${pt.color.toString(16).padStart(6, '0')}`,
                  aspectRatio: pt.shape === 'box' && 'w' in pt && 'h' in pt
                    ? `${(pt as { w: number }).w} / ${pt.h}`
                    : '1 / 1',
                }}
              />
              <div className="text-dream-text text-xs font-medium group-hover:text-dream-teal transition-colors">
                {pt.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
