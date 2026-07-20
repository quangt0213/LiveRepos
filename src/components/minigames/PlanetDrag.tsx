import { useEffect, useRef, useState } from "react";

const CX = 180;
const CY = 130;
const RINGS = [46, 82, 118]; // orbital ring radii
const PLANETS = [
  { id: 0, name: "Rocky", color: "#E07A3F", r: 9 },
  { id: 1, name: "Terra", color: "#5B8DEF", r: 12 },
  { id: 2, name: "Giant", color: "#F2B84B", r: 17 },
];

/** Drag each planet onto its matching orbital ring (or tap planet, then ring). */
export default function PlanetDrag({ onWin }: { onWin: () => void }) {
  const [placed, setPlaced] = useState<Record<number, boolean>>({});
  const [drag, setDrag] = useState<{ id: number; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const allDone = PLANETS.every((p) => placed[p.id]);

  useEffect(() => {
    if (allDone) {
      const t = window.setTimeout(onWin, 600);
      return () => window.clearTimeout(t);
    }
  }, [allDone, onWin]);

  const toSvg = (e: { clientX: number; clientY: number }) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 360,
      y: ((e.clientY - rect.top) / rect.height) * 260,
    };
  };

  const tryPlace = (id: number, x: number, y: number) => {
    const dist = Math.hypot(x - CX, y - CY);
    if (Math.abs(dist - RINGS[id]) < 16) {
      setPlaced((p) => ({ ...p, [id]: true }));
      return true;
    }
    return false;
  };

  const homeX = (i: number) => 70 + i * 110;

  return (
    <div className="flex flex-col items-center gap-3 py-2 select-none">
      <svg
        ref={svgRef}
        viewBox="0 0 360 260"
        className="w-full max-w-md touch-none bg-[#1d2340] rounded-2xl border-[3px] border-ink"
        role="img"
        aria-label="Orrery puzzle: three planets below, three orbital rings above. Drag each planet to the ring matching its number, or tap a planet then tap a ring."
        onPointerMove={(e) => {
          if (!drag) return;
          const { x, y } = toSvg(e);
          setDrag({ ...drag, x, y });
        }}
        onPointerUp={(e) => {
          if (!drag) return;
          const { x, y } = toSvg(e);
          tryPlace(drag.id, x, y);
          setDrag(null);
        }}
      >
        {/* sun */}
        <circle cx={CX} cy={CY} r={16} fill="#F2B84B" stroke="#2B2118" strokeWidth={3} />
        {/* rings */}
        {RINGS.map((r, i) => (
          <g key={r}>
            <circle
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke={placed[i] ? PLANETS[i].color : "#8b93c9"}
              strokeWidth={placed[i] ? 3 : 2}
              strokeDasharray={placed[i] ? "none" : "6 6"}
              style={{ cursor: selected !== null ? "pointer" : "default" }}
              onClick={() => {
                if (selected !== null) {
                  if (selected === i) setPlaced((p) => ({ ...p, [i]: true }));
                  setSelected(null);
                }
              }}
            />
            <text x={CX + r - 4} y={CY - 6} fill="#8b93c9" fontSize="11" fontFamily="sans-serif">
              {i + 1}
            </text>
          </g>
        ))}
        {/* placed planets sit on their ring */}
        {PLANETS.filter((p) => placed[p.id]).map((p) => (
          <circle
            key={p.id}
            cx={CX + RINGS[p.id] * Math.cos(-0.9 + p.id)}
            cy={CY + RINGS[p.id] * Math.sin(-0.9 + p.id)}
            r={p.r}
            fill={p.color}
            stroke="#2B2118"
            strokeWidth={3}
          />
        ))}
        {/* tray planets */}
        {PLANETS.filter((p) => !placed[p.id]).map((p, i) => {
          const isDrag = drag?.id === p.id;
          const x = isDrag ? drag.x : homeX(p.id);
          const y = isDrag ? drag.y : 232;
          return (
            <g
              key={p.id}
              style={{ cursor: "grab" }}
              onPointerDown={(e) => {
                e.preventDefault();
                const pt = toSvg(e);
                setDrag({ id: p.id, x: pt.x, y: pt.y });
                setSelected(p.id);
              }}
              role="button"
              aria-label={`${p.name}, goes on ring ${p.id + 1}`}
            >
              <circle cx={x} cy={y} r={p.r} fill={p.color} stroke="#2B2118" strokeWidth={3} />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fill="#2B2118" fontWeight="bold">
                {p.id + 1}
              </text>
              {i === 0 && null}
            </g>
          );
        })}
      </svg>
      <p className="text-sm text-ink/60 text-center max-w-sm">
        {allDone
          ? "Perfect alignment 🔭"
          : "Drag each numbered planet onto its matching ring. (Tap planet → tap ring works too.)"}
      </p>
    </div>
  );
}
