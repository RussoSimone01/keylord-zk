import { create } from "zustand";

export type ToastTone = "success" | "info" | "warning" | "danger";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  // Read by screen readers in place of message and countdown, which change every second
  announce?: string;
  // Live countdown to until; key is a translation that receives {{seconds}}
  countdown?: { until: number; key: string };
  // Hides the toast after this many milliseconds; without it the toast stays until replaced or dismissed
  duration?: number;
}

interface ToastStore {
  toast: Toast | null;
  // One toast at a time: a new one replaces the current one. Returns its id.
  show(toast: Omit<Toast, "id">): number;
  // With an id, hides the toast only if it is still that one
  dismiss(id?: number): void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>((set, get) => ({
  toast: null,
  show: (toast) => {
    const id = nextId++;
    set({ toast: { ...toast, id } });
    return id;
  },
  dismiss: (id) => {
    if (id === undefined || get().toast?.id === id) {
      set({ toast: null });
    }
  },
}));
