import { create } from 'zustand';

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'error' | 'success';
}

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: Toast['type']) => void;
  remove: (id: number) => void;
}

let counter = 0;

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
