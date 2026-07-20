import { useEffect, useMemo, useState } from "react";

const GLYPHS = ["⚡", "🔥", "💧", "⚙️"];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Match all 4 pairs. */
export default function MemoryFlip({ onWin }: { onWin: () => void }) {
  const deck = useMemo(
    () => shuffled(GLYPHS.flatMap((g) => [g, g])),
    []
  );
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [lockout, setLockout] = useState(false);

  const flip = (i: number) => {
    if (lockout || open.includes(i) || matched.has(deck[i])) return;
    const next = [...open, i];
    setOpen(next);
    if (next.length === 2) {
      if (deck[next[0]] === deck[next[1]]) {
        setMatched((m) => new Set(m).add(deck[i]));
        setOpen([]);
      } else {
        setLockout(true);
        window.setTimeout(() => {
          setOpen([]);
          setLockout(false);
        }, 700);
      }
    }
  };

  const done = matched.size === GLYPHS.length;
  useEffect(() => {
    if (done) {
      const t = window.setTimeout(onWin, 500);
      return () => window.clearTimeout(t);
    }
  }, [done, onWin]);

  return (
    <div className="flex flex-col items-center gap-4 py-4 select-none">
      <div className="grid grid-cols-4 gap-2.5" role="group" aria-label="Memory cards, match the pairs">
        {deck.map((g, i) => {
          const face = open.includes(i) || matched.has(g);
          return (
            <button
              key={i}
              onClick={() => flip(i)}
              aria-label={face ? `card showing ${g}` : "face-down card"}
              className={`w-16 h-20 md:w-18 border-[3px] border-ink rounded-xl text-3xl flex items-center justify-center transition-all duration-200 shadow-stickerPress ${
                face
                  ? matched.has(g)
                    ? "bg-lang-other/60"
                    : "bg-white"
                  : "bg-lang-c/50 hover:-rotate-2"
              }`}
              style={{ transform: face ? "rotateY(0)" : undefined }}
            >
              {face ? g : "🂠"}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-ink/60">
        {done ? "Full set collected! 🃏" : `Pairs found: ${matched.size} / ${GLYPHS.length}`}
      </p>
    </div>
  );
}
