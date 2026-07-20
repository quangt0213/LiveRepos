import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Confetti from "./Confetti";
import { useAllUnlocked, useUnlockStore } from "../store/useUnlockStore";

/** Fires once when the fifth project is unlocked. Reveals the About panel. */
export default function Celebration() {
  const allUnlocked = useAllUnlocked();
  const celebrated = useUnlockStore((s) => s.celebrated);
  const markCelebrated = useUnlockStore((s) => s.markCelebrated);
  const [show, setShow] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (allUnlocked && !celebrated) {
      setShow(true);
      markCelebrated();
      const t = window.setTimeout(() => setShow(false), reduce ? 1500 : 4200);
      return () => window.clearTimeout(t);
    }
  }, [allUnlocked, celebrated, markCelebrated, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-center justify-center bg-ink/60 p-6"
          onClick={() => setShow(false)}
          role="alertdialog"
          aria-label="All projects unlocked"
        >
          <Confetti fullPage count={reduce ? 0 : 220} />
          <motion.div
            initial={reduce ? false : { scale: 0.6, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 160, damping: 12 }}
            className="sticker bg-paper p-8 md:p-12 text-center max-w-md"
          >
            <div className="text-6xl mb-3" aria-hidden>🏆</div>
            <h2 className="text-3xl mb-2">Full clear!</h2>
            <p className="text-ink/80">
              You unlocked all five projects. A hidden{" "}
              <span className="font-semibold">About Me</span> panel just
              appeared at the bottom of the page.
            </p>
            <button className="btn-cartoon mt-5 bg-lang-python/50" onClick={() => setShow(false)}>
              Nice ✨
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
