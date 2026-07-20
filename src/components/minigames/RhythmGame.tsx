import { useEffect, useRef, useState } from "react";

/** Land 3 hits: press/tap/Space when the slider is inside the gold zone. */
export default function RhythmGame({ onWin }: { onWin: () => void }) {
  const [hits, setHits] = useState(0);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [zone, setZone] = useState({ start: 40, width: 22 });
  const pos = useRef(0);
  const dir = useRef(1);
  const barRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const hitsRef = useRef(0);
  const zoneRef = useRef(zone);
  zoneRef.current = zone;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = 65; // % per second
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      pos.current += dir.current * speed * dt;
      if (pos.current > 100) { pos.current = 100; dir.current = -1; }
      if (pos.current < 0) { pos.current = 0; dir.current = 1; }
      if (markerRef.current) markerRef.current.style.left = `${pos.current}%`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const attempt = () => {
    const z = zoneRef.current;
    const inside = pos.current >= z.start && pos.current <= z.start + z.width;
    if (inside) {
      const n = hitsRef.current + 1;
      hitsRef.current = n;
      setHits(n);
      setFlash("hit");
      setZone({
        start: 8 + Math.random() * 66,
        width: Math.max(12, 22 - n * 4),
      });
      if (n >= 3) window.setTimeout(onWin, 350);
    } else {
      setFlash("miss");
    }
    window.setTimeout(() => setFlash(null), 250);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        attempt();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 py-6 select-none">
      <div className="flex gap-2" aria-label={`${hits} of 3 hits landed`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`text-3xl transition-transform ${i < hits ? "scale-110" : "opacity-30"}`}
            aria-hidden
          >
            {i < hits ? "🎵" : "♪"}
          </span>
        ))}
      </div>

      <div
        ref={barRef}
        className={`relative w-full max-w-sm h-12 border-[3px] border-ink rounded-full bg-white overflow-hidden shadow-stickerSm ${
          flash === "miss" ? "animate-shake" : ""
        }`}
        role="img"
        aria-label="Timing bar. A marker sweeps back and forth; hit it inside the gold zone."
      >
        <div
          className="absolute top-0 bottom-0 bg-lang-python border-x-[3px] border-ink/60 transition-all"
          style={{ left: `${zone.start}%`, width: `${zone.width}%` }}
        />
        <div
          ref={markerRef}
          className={`absolute top-0 bottom-0 w-2.5 -ml-1 rounded ${
            flash === "hit" ? "bg-lang-other" : "bg-ink"
          }`}
          style={{ left: "0%" }}
        />
      </div>

      <button
        className="btn-cartoon text-xl px-10 py-3 bg-lang-cpp/40"
        onPointerDown={(e) => {
          e.preventDefault();
          attempt();
        }}
      >
        HIT! <span className="text-sm text-ink/60">(or Space)</span>
      </button>
      <p className="text-sm text-ink/60 text-center">
        Tap when the marker is inside the gold zone. It shrinks each hit — like
        a real rhythm-timing check.
      </p>
    </div>
  );
}
