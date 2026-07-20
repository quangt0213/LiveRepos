import { useEffect, useState } from "react";

const SIZE = 5;
const START = 10; // row 2, col 0 (index = r*5+c)
const END = 14; // row 2, col 4
const BLOCKED = new Set([6, 7, 12, 17, 3, 21]);

const idx = (r: number, c: number) => r * SIZE + c;
const rc = (i: number) => [Math.floor(i / SIZE), i % SIZE] as const;
const adjacent = (a: number, b: number) => {
  const [ar, ac] = rc(a);
  const [br, bc] = rc(b);
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
};

/** Route the wire from the substation to the bulb. Click/tap/drag adjacent
 *  cells (or use arrow keys) to extend; step back onto the wire to undo. */
export default function WireMaze({ onWin }: { onWin: () => void }) {
  const [path, setPath] = useState<number[]>([START]);
  const [dragging, setDragging] = useState(false);
  const head = path[path.length - 1];
  const done = head === END;

  const step = (cell: number) => {
    if (done || BLOCKED.has(cell)) return;
    setPath((p) => {
      const h = p[p.length - 1];
      if (cell === p[p.length - 2]) return p.slice(0, -1); // backtrack
      if (p.includes(cell) || !adjacent(h, cell)) return p;
      return [...p, cell];
    });
  };

  useEffect(() => {
    if (done) {
      const t = window.setTimeout(onWin, 500);
      return () => window.clearTimeout(t);
    }
  }, [done, onWin]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const [r, c] = rc(path[path.length - 1]);
      const moves: Record<string, [number, number]> = {
        ArrowUp: [r - 1, c],
        ArrowDown: [r + 1, c],
        ArrowLeft: [r, c - 1],
        ArrowRight: [r, c + 1],
      };
      const m = moves[e.key];
      if (!m) return;
      e.preventDefault();
      const [nr, nc] = m;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) step(idx(nr, nc));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, done]);

  return (
    <div className="flex flex-col items-center gap-4 py-4 select-none">
      <div
        className="grid grid-cols-5 gap-1.5 touch-none"
        role="grid"
        aria-label="Wire maze. Route the wire from the substation on the left to the bulb on the right. Arrow keys also work."
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        {Array.from({ length: SIZE * SIZE }, (_, i) => {
          const inPath = path.includes(i);
          const isHead = i === head && !done;
          const blocked = BLOCKED.has(i);
          return (
            <button
              key={i}
              role="gridcell"
              aria-label={
                i === START ? "substation (start)" :
                i === END ? "bulb (goal)" :
                blocked ? "blocked" : inPath ? "wire" : "empty"
              }
              disabled={blocked}
              onPointerDown={() => { setDragging(true); step(i); }}
              onPointerEnter={() => dragging && step(i)}
              onClick={() => step(i)}
              className={`w-12 h-12 md:w-14 md:h-14 border-[3px] border-ink rounded-xl text-xl flex items-center justify-center transition-colors ${
                blocked
                  ? "bg-ink/70 cursor-not-allowed"
                  : inPath
                    ? "bg-lang-python"
                    : "bg-white hover:bg-cream"
              } ${isHead ? "ring-4 ring-lang-cpp/60" : ""}`}
            >
              {i === START ? "🏭" : i === END ? (done ? "💡" : "🔌") : blocked ? "🪨" : inPath ? "➰" : ""}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-ink/60 text-center max-w-sm">
        {done
          ? "Circuit closed — the lights are on! ⚡"
          : "Drag or tap adjacent cells to route the wire around the rocks. Step backwards to undo."}
      </p>
    </div>
  );
}
