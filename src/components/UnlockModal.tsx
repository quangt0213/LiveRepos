import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Confetti from "./Confetti";
import RhythmGame from "./minigames/RhythmGame";
import WireMaze from "./minigames/WireMaze";
import PlanetDrag from "./minigames/PlanetDrag";
import MemoryFlip from "./minigames/MemoryFlip";
import NeedleHold from "./minigames/NeedleHold";
import { projects, type GameType } from "../lib/projects";
import { useUnlockStore } from "../store/useUnlockStore";

const GAMES: Record<GameType, React.ComponentType<{ onWin: () => void }>> = {
  rhythm: RhythmGame,
  wire: WireMaze,
  orbit: PlanetDrag,
  memory: MemoryFlip,
  needle: NeedleHold,
};

const GAME_TITLES: Record<GameType, string> = {
  rhythm: "Hit the beat ×3",
  wire: "Close the circuit",
  orbit: "Place the planets",
  memory: "Match the pairs",
  needle: "Hold the needle in the green",
};

interface Props {
  projectId: string;
  onClose: () => void;
  onUnlocked: () => void;
}

export default function UnlockModal({ projectId, onClose, onUnlocked }: Props) {
  const project = projects.find((p) => p.id === projectId);
  const unlock = useUnlockStore((s) => s.unlock);
  const [won, setWon] = useState(false);
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!project) return null;
  const Game = GAMES[project.gameType];

  const finish = () => {
    unlock(project.id);
    setWon(true);
    window.setTimeout(onUnlocked, reduce ? 250 : 1300);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Unlock ${project.title}`}
    >
      <motion.div
        initial={reduce ? false : { scale: 0.85, rotate: -2, y: 30 }}
        animate={{ scale: 1, rotate: 0, y: 0 }}
        exit={reduce ? undefined : { scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="sticker bg-paper w-full max-w-lg relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-[3px] border-ink px-4 py-3 bg-cream">
          <h2 className="text-xl">
            🔒 {project.title} — {GAME_TITLES[project.gameType]}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close unlock game"
            className="btn-cartoon !px-2.5 !py-1 bg-white"
          >
            ✕
          </button>
        </div>

        <div className="p-4 min-h-[300px] relative">
          {won ? (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3 text-center">
              <div className="text-5xl" aria-hidden>🎉</div>
              <p className="text-2xl font-display">Unlocked!</p>
              <p className="text-ink/70">Opening {project.title}…</p>
            </div>
          ) : (
            <Game onWin={finish} />
          )}
          {won && <Confetti />}
        </div>

        {!won && (
          <div className="flex justify-between items-center border-t-2 border-ink/20 px-4 py-2 text-sm">
            <span className="text-ink/60">Lose = free retry. No pressure.</span>
            <button onClick={finish} className="btn-cartoon bg-lang-python/40 !text-sm">
              Skip &amp; Unlock →
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
