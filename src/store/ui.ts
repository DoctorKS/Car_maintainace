import { create } from 'zustand';

interface UiState {
  /** Calendar's currently-displayed month (1st of the month, local time). */
  historyMonth: Date;
  setHistoryMonth: (d: Date) => void;

  /** Dashboard pagination page (0-indexed). */
  dashboardPage: number;
  setDashboardPage: (p: number) => void;
  nextDashboardPage: () => void;
  resetDashboardPage: () => void;

  /** Toggles a card's expanded state in the by-part view. */
  expandedParts: Set<string>;
  toggleExpandedPart: (partName: string) => void;
}

const firstOfThisMonth = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
};

export const useUiStore = create<UiState>((set) => ({
  historyMonth: firstOfThisMonth(),
  setHistoryMonth: (d) => set({ historyMonth: new Date(d.getFullYear(), d.getMonth(), 1) }),

  dashboardPage: 0,
  setDashboardPage: (p) => set({ dashboardPage: Math.max(0, p) }),
  nextDashboardPage: () => set((s) => ({ dashboardPage: s.dashboardPage + 1 })),
  resetDashboardPage: () => set({ dashboardPage: 0 }),

  expandedParts: new Set<string>(),
  toggleExpandedPart: (partName) =>
    set((s) => {
      const next = new Set(s.expandedParts);
      if (next.has(partName)) next.delete(partName);
      else next.add(partName);
      return { expandedParts: next };
    }),
}));
