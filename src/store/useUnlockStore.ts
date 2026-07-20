import { create } from "zustand";
import { persist } from "zustand/middleware";
import { projects } from "../lib/projects";

interface UnlockState {
  unlocked: string[];
  celebrated: boolean; // full-page celebration fired once
  unlock: (id: string) => void;
  markCelebrated: () => void;
  reset: () => void;
}

export const useUnlockStore = create<UnlockState>()(
  persist(
    (set) => ({
      unlocked: [],
      celebrated: false,
      unlock: (id) =>
        set((s) =>
          s.unlocked.includes(id) ? s : { unlocked: [...s.unlocked, id] }
        ),
      markCelebrated: () => set({ celebrated: true }),
      reset: () => set({ unlocked: [], celebrated: false }),
    }),
    { name: "qt-portfolio.unlocks.v1" }
  )
);

export const useAllUnlocked = () =>
  useUnlockStore((s) => s.unlocked.length >= projects.length);
