import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '../store/useToast';

export default function Toaster() {
  const { toasts, remove } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl text-sm font-medium pointer-events-auto max-w-xs
            ${t.type === 'error' ? 'bg-red-900/90 text-red-100' : ''}
            ${t.type === 'success' ? 'bg-groove-green/90 text-black' : ''}
            ${t.type === 'info' ? 'bg-groove-surface3 text-white' : ''}
          `}
        >
          {t.type === 'error' && <AlertCircle size={16} className="shrink-0" />}
          {t.type === 'success' && <CheckCircle size={16} className="shrink-0" />}
          {t.type === 'info' && <Info size={16} className="shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
