import { motion } from "framer-motion";
import { projects } from "../lib/projects";
import { useUnlockStore } from "../store/useUnlockStore";

export default function ProgressBar() {
  const unlocked = useUnlockStore((s) => s.unlocked);
  const total = projects.length;
  const n = Math.min(unlocked.length, total);
  const pct = (n / total) * 100;

  return (
    <div
      className="my-4"
      role="progressbar"
      aria-valuenow={n}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Projects unlocked: ${n} of ${total}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-display text-sm">
          {n === total ? "All projects unlocked! 🎉" : "Projects unlocked"}
        </span>
        <span className="font-display text-sm">
          {n} / {total}
        </span>
      </div>
      <div className="h-5 border-[3px] border-ink rounded-full bg-white overflow-hidden shadow-stickerSm">
        <motion.div
          className="h-full rounded-full bg-lang-python"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 8px, transparent 8px 16px)",
          }}
        />
      </div>
    </div>
  );
}
