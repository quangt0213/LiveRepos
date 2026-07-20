import { useEffect, useRef, useState } from "react";

const TARGET_S = 3; // seconds needed inside the band

/** Hold the button (or Space) to raise the needle; keep it inside the moving
 *  green band for 3 cumulative seconds. */
export default function NeedleHold({ onWin }: { onWin: () => void }) {
  const [progress, setProgress] = useState(0); // 0..1
  const [inBand, setInBand] = useState(false);
  const holding = useRef(false);
  const needle = useRef(0); // 0..100
  const vel = useRef(0);
  const wonRef = useRef(false);
  const needleEl = useRef<SVGGElement>(null);
  const bandEl = useRef<SVGPathElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      // physics: hold = push up, release = spring down, light damping
      const drive = holding.current ? 120 : -90;
      vel.current += drive * dt;
      vel.current *= 0.92;
      needle.current = Math.max(0, Math.min(100, needle.current + vel.current * dt));

      // band oscillates
      const bandCenter = 50 + 26 * Math.sin(t / 900) * Math.sin(t / 2300 + 1);
      const bandHalf = 11;
      const inside =
        needle.current > bandCenter - bandHalf &&
        needle.current < bandCenter + bandHalf;

      if (inside && !wonRef.current) {
        acc += dt;
        if (acc >= TARGET_S) {
          wonRef.current = true;
          setProgress(1);
          window.setTimeout(onWin, 300);
        }
      } else {
        acc = Math.max(0, acc - dt * 0.6); // gentle decay, not a full reset
      }
      setInBand(inside);
      setProgress(Math.min(1, acc / TARGET_S));

      // imperative updates for smoothness
      const angle = -120 + (needle.current / 100) * 240;
      needleEl.current?.setAttribute("transform", `rotate(${angle} 130 120)`);
      if (bandEl.current) {
        const a0 = ((-120 + ((bandCenter - bandHalf) / 100) * 240) * Math.PI) / 180;
        const a1 = ((-120 + ((bandCenter + bandHalf) / 100) * 240) * Math.PI) / 180;
        const r = 86;
        const p = (a: number) => `${130 + r * Math.sin(a)} ${120 - r * Math.cos(a)}`;
        bandEl.current.setAttribute("d", `M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`);
      }
      if (!wonRef.current) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const down = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); holding.current = true; }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") holding.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onWin]);

  return (
    <div className="flex flex-col items-center gap-3 py-2 select-none">
      <svg
        viewBox="0 0 260 160"
        className="w-full max-w-sm"
        role="img"
        aria-label="Tachometer. Hold the throttle to raise the needle and keep it inside the moving green band."
      >
        <path
          d="M 130 120 m -95 55 a 110 110 0 1 1 190 0"
          fill="none"
          stroke="#2B2118"
          strokeWidth="0"
        />
        {/* dial */}
        <path
          d="M 55.5 163 A 86 86 0 1 1 204.5 163"
          transform="translate(0,-43)"
          fill="none"
          stroke="#e8dfc8"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* green band (updated imperatively) */}
        <path ref={bandEl} d="" fill="none" stroke={inBand ? "#4f9e4f" : "#8FBF6B"} strokeWidth="18" strokeLinecap="round" />
        {/* ticks */}
        {Array.from({ length: 11 }, (_, i) => {
          const a = ((-120 + i * 24) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={130 + 70 * Math.sin(a)}
              y1={120 - 70 * Math.cos(a)}
              x2={130 + 80 * Math.sin(a)}
              y2={120 - 80 * Math.cos(a)}
              stroke="#2B2118"
              strokeWidth="3"
            />
          );
        })}
        <g ref={needleEl}>
          <polygon points="126,120 134,120 130,42" fill="#E86A92" stroke="#2B2118" strokeWidth="2.5" />
        </g>
        <circle cx="130" cy="120" r="9" fill="#2B2118" />
      </svg>

      {/* progress */}
      <div className="w-full max-w-sm h-4 border-[3px] border-ink rounded-full bg-white overflow-hidden">
        <div
          className="h-full bg-lang-other transition-[width] duration-100"
          style={{ width: `${progress * 100}%` }}
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Hold progress"
        />
      </div>

      <button
        className={`btn-cartoon text-lg px-10 py-3 ${inBand ? "bg-lang-other/60" : "bg-lang-cpp/40"}`}
        onPointerDown={(e) => { e.preventDefault(); holding.current = true; }}
        onPointerUp={() => (holding.current = false)}
        onPointerLeave={() => (holding.current = false)}
      >
        HOLD THROTTLE <span className="text-sm text-ink/60">(or Space)</span>
      </button>
    </div>
  );
}
