import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

// ---------------------------------------------------------------------------
// Model. Every dashboard number derives from these house states — no fake ticking.
// ---------------------------------------------------------------------------
type HouseType = "single" | "duplex" | "apartment" | "store";

interface House {
  id: number;
  type: HouseType;
  baseKw: number; // nameplate-ish average load
  x: number; w: number; h: number;
  on: boolean;
}

const TYPE_SPECS: Record<HouseType, { baseKw: number; w: number; h: number; label: string }> = {
  single: { baseKw: 1.2, w: 52, h: 46, label: "single-family" },
  duplex: { baseKw: 2.0, w: 66, h: 52, label: "duplex" },
  apartment: { baseKw: 3.6, w: 74, h: 78, label: "small apartment" },
  store: { baseKw: 2.8, w: 70, h: 44, label: "corner store" },
};

function buildCity(): House[] {
  const seq: HouseType[] = [
    "single", "duplex", "single", "store", "apartment", "single", "duplex",
    "single", "apartment", "store", "single", "duplex", "single", "apartment",
  ];
  let x = 120;
  return seq.map((type, i) => {
    const s = TYPE_SPECS[type];
    const h: House = { id: i, type, baseKw: s.baseKw, x, w: s.w, h: s.h, on: true };
    x += s.w + 34;
    return h;
  });
}

const CITY_W = 120 + buildCity().reduce((a, h) => Math.max(a, h.x + h.w), 0) * 0 + 1600; // virtual width
const FEEDER_V = 7200; // distribution voltage (V)
const SEG_R = 0.45; // ohms per pole-to-pole segment
const GRID_LIMIT_KW = 34; // brownout threshold
const CO2_KG_PER_KWH = 0.35;

/** Realistic diurnal demand multiplier: morning bump, evening peak, night trough. */
function diurnal(hour: number, type: HouseType): number {
  const morning = Math.exp(-((hour - 7.5) ** 2) / 3.5);
  const evening = Math.exp(-((hour - 19) ** 2) / 5);
  const night = 0.35;
  let f = night + 0.55 * morning + 0.9 * evening;
  if (type === "store") {
    // stores run on business hours instead
    f = hour >= 8 && hour <= 21 ? 1.0 : 0.25;
  }
  if (type === "apartment") f *= 1.1;
  return f;
}

/** Rooftop solar generation per house (kW), peaks at noon. */
function solarGen(hour: number): number {
  if (hour < 6 || hour > 18) return 0;
  return 2.4 * Math.sin((Math.PI * (hour - 6)) / 12);
}

function houseLoad(h: House, hour: number, solar: boolean, heatWave: boolean): number {
  if (!h.on) return 0;
  let kw = h.baseKw * diurnal(hour, h.type);
  if (heatWave && hour >= 10 && hour <= 21) kw *= 1.65; // AC spike
  if (solar) kw -= solarGen(hour) * (h.type === "apartment" ? 1.4 : 1);
  return kw; // may be negative → net export
}

export default function PowerAuditDemo() {
  const [houses, setHouses] = useState<House[]>(buildCity);
  const [hour, setHour] = useState(18);
  const [solar, setSolar] = useState(false);
  const [heatWave, setHeatWave] = useState(false);
  const [rate, setRate] = useState(0.32);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ houses, hour, solar, heatWave });
  stateRef.current = { houses, hour, solar, heatWave };

  // ---- derived numbers (the whole dashboard) ----
  const loads = houses.map((h) => houseLoad(h, hour, solar, heatWave));
  const totalKw = loads.reduce((a, b) => a + b, 0);

  // Line loss: feeder runs left→right; segment i carries everything downstream.
  const lineLossKw = useMemo(() => {
    let loss = 0;
    for (let i = 0; i < houses.length; i++) {
      const downstream = loads.slice(i).reduce((a, b) => a + b, 0) * 1000; // W
      const I = Math.abs(downstream) / FEEDER_V;
      loss += (I * I * SEG_R) / 1000; // kW
    }
    return loss;
  }, [houses, loads]);

  const dayCurve = useMemo(
    () =>
      Array.from({ length: 24 }, (_, hr) => ({
        hour: hr,
        kW: Number(
          houses
            .reduce((a, h) => a + houseLoad(h, hr, solar, heatWave), 0)
            .toFixed(2)
        ),
      })),
    [houses, solar, heatWave]
  );
  const dailyKwh = dayCurve.reduce((a, p) => a + Math.max(0, p.kW), 0); // 1h steps
  const dailyCost = dailyKwh * rate;
  const dailyCo2 = dailyKwh * CO2_KG_PER_KWH;

  const stress = Math.max(0, totalKw) / GRID_LIMIT_KW;
  const brownout = stress >= 1;
  const stressColor = stress < 0.6 ? "#4f9e4f" : stress < 1 ? "#d9a93a" : "#c0392b";

  // ---- canvas city ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const draw = (t: number) => {
      const { houses, hour, solar, heatWave } = stateRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = canvas.offsetWidth * dpr;
      const H = canvas.offsetHeight * dpr;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;
      const scale = W / 1500;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const vh = H / scale;

      // sky gradient dawn→day→dusk→night
      const day = Math.max(0, Math.sin((Math.PI * (hour - 5.5)) / 13));
      const sky = ctx.createLinearGradient(0, 0, 0, vh);
      const lerp = (a: number, b: number) => Math.round(a + (b - a) * day);
      sky.addColorStop(0, `rgb(${lerp(18, 120)}, ${lerp(22, 185)}, ${lerp(48, 235)})`);
      sky.addColorStop(1, `rgb(${lerp(40, 250)}, ${lerp(36, 230)}, ${lerp(70, 180)})`);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 1500, vh);

      // stars at night
      if (day < 0.25) {
        ctx.fillStyle = `rgba(255,255,240,${(0.25 - day) * 3})`;
        for (let i = 0; i < 40; i++) {
          const sx = ((i * 379) % 1500);
          const sy = ((i * 211) % (vh * 0.5));
          ctx.fillRect(sx, sy, 2.5, 2.5);
        }
      }
      // sun / moon
      const orbX = 100 + ((hour + 24 - 6) % 24) / 24 * 1300;
      ctx.beginPath();
      ctx.arc(orbX, vh * 0.18, 26, 0, Math.PI * 2);
      ctx.fillStyle = day > 0.05 ? "#F2B84B" : "#e8e4d0";
      ctx.fill();
      ctx.strokeStyle = "#2B2118"; ctx.lineWidth = 3; ctx.stroke();

      const groundY = vh - 40;
      ctx.fillStyle = "#7da35a";
      ctx.fillRect(0, groundY, 1500, 60);
      ctx.strokeStyle = "#2B2118"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(1500, groundY); ctx.stroke();

      // substation
      ctx.fillStyle = "#b9b2a6";
      ctx.strokeStyle = "#2B2118"; ctx.lineWidth = 3.5;
      ctx.fillRect(16, groundY - 84, 80, 84);
      ctx.strokeRect(16, groundY - 84, 80, 84);
      ctx.fillStyle = "#2B2118";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText("SUBSTN", 24, groundY - 62);
      ctx.strokeRect(30, groundY - 50, 22, 30);
      ctx.strokeRect(62, groundY - 50, 22, 30);

      // wire route: pole tops
      const wireY = groundY - 120;
      const poleXs = [110, ...houses.map((h) => h.x + h.w / 2)];

      // poles
      for (const px of poleXs) {
        ctx.strokeStyle = "#5b4a3a"; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(px, wireY); ctx.lineTo(px, groundY); ctx.stroke();
        ctx.strokeStyle = "#5b4a3a"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(px - 14, wireY + 8); ctx.lineTo(px + 14, wireY + 8); ctx.stroke();
      }

      // wires + pulses
      for (let i = 0; i < poleXs.length - 1; i++) {
        const x0 = poleXs[i], x1 = poleXs[i + 1];
        const midX = (x0 + x1) / 2, sagY = wireY + 16;
        ctx.strokeStyle = "#2B2118"; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x0, wireY + 8);
        ctx.quadraticCurveTo(midX, sagY, x1, wireY + 8);
        ctx.stroke();

        // segment power = everything downstream of this pole
        const segKw = houses.slice(i).reduce((a, h) => a + houseLoad(h, hour, solar, heatWave), 0);
        if (Math.abs(segKw) > 0.05 && !reduce) {
          const speed = Math.min(Math.abs(segKw) / 6, 3) + 0.4;
          const dir = segKw >= 0 ? 1 : -1; // solar export reverses pulse direction
          const nDots = 3;
          for (let d = 0; d < nDots; d++) {
            let u = ((t / 1000) * speed * 0.5 + d / nDots) % 1;
            if (dir < 0) u = 1 - u;
            const qx = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * midX + u * u * x1;
            const qy = (1 - u) * (1 - u) * (wireY + 8) + 2 * (1 - u) * u * sagY + u * u * (wireY + 8);
            ctx.beginPath();
            ctx.arc(qx, qy, 4, 0, Math.PI * 2);
            ctx.fillStyle = segKw >= 0 ? "#F2B84B" : "#8FBF6B";
            ctx.fill();
            ctx.strokeStyle = "#2B2118"; ctx.lineWidth = 1.5; ctx.stroke();
          }
        }
      }

      // houses
      const flick = brownoutFlicker(t, reduce);
      for (const h of houses) {
        const hy = groundY - h.h;
        // drop line from wire to roof
        ctx.strokeStyle = h.on ? "#2B2118" : "rgba(43,33,24,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(h.x + h.w / 2, wireY + 8);
        ctx.lineTo(h.x + h.w / 2, hy - 8);
        ctx.stroke();

        // body
        ctx.fillStyle = h.on ? (h.type === "store" ? "#e8b9a0" : "#e8d9b0") : "#b8b2a6";
        ctx.strokeStyle = "#2B2118"; ctx.lineWidth = 3;
        ctx.fillRect(h.x, hy, h.w, h.h);
        ctx.strokeRect(h.x, hy, h.w, h.h);
        // roof
        ctx.beginPath();
        ctx.moveTo(h.x - 6, hy);
        ctx.lineTo(h.x + h.w / 2, hy - 18);
        ctx.lineTo(h.x + h.w + 6, hy);
        ctx.closePath();
        ctx.fillStyle = h.on ? "#c96f4a" : "#9a938a";
        ctx.fill(); ctx.stroke();
        // solar panel
        if (solar) {
          ctx.fillStyle = "#3d5a80";
          ctx.fillRect(h.x + h.w * 0.15, hy - 12, h.w * 0.3, 8);
          ctx.strokeRect(h.x + h.w * 0.15, hy - 12, h.w * 0.3, 8);
        }
        // windows
        const cols = Math.max(2, Math.floor(h.w / 24));
        const rows = Math.max(1, Math.floor(h.h / 30));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const wx = h.x + 8 + c * ((h.w - 16) / cols);
            const wy = hy + 10 + r * ((h.h - 18) / rows);
            const lit = h.on && (day < 0.5 || h.type === "store") && flick;
            ctx.fillStyle = lit ? "#ffd76e" : "#6d675d";
            ctx.fillRect(wx, wy, 12, 12);
            ctx.strokeStyle = "#2B2118"; ctx.lineWidth = 2;
            ctx.strokeRect(wx, wy, 12, 12);
          }
        }
        if (!h.on) {
          ctx.fillStyle = "#2B2118";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText("zzz", h.x + h.w - 26, hy + 4);
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const brownoutFlicker = (t: number, reduce: boolean) => {
      const { houses, hour, solar, heatWave } = stateRef.current;
      const tot = houses.reduce((a, h) => a + houseLoad(h, hour, solar, heatWave), 0);
      if (tot < GRID_LIMIT_KW || reduce) return true;
      return Math.sin(t / 60) + Math.sin(t / 137) > -0.7; // citywide flicker
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleHouse = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 1500;
    const yv = clientY - rect.top;
    const groundY = rect.height - 40;
    setHouses((hs) =>
      hs.map((h) => {
        const hy = groundY - h.h;
        return x >= h.x && x <= h.x + h.w && yv >= hy - 20 && yv <= groundY
          ? { ...h, on: !h.on }
          : h;
      })
    );
  };

  const onCount = houses.filter((h) => h.on).length;

  return (
    <div className="space-y-4">
      <div className="grid xl:grid-cols-[1.6fr_1fr] gap-4">
        <div>
          <div className={`sticker overflow-hidden ${brownout ? "ring-4 ring-red-500/60" : ""}`}>
            <canvas
              ref={canvasRef}
              className="w-full h-[300px] md:h-[340px] cursor-pointer touch-manipulation"
              onClick={(e) => toggleHouse(e.clientX, e.clientY)}
              role="img"
              aria-label={`Cartoon city with ${houses.length} buildings, ${onCount} powered. Total load ${totalKw.toFixed(1)} kilowatts at hour ${hour}. Click a building to toggle its power.`}
            />
          </div>
          <p className="sr-only" role="status">
            {onCount} of {houses.length} buildings powered. Total load {totalKw.toFixed(1)} kW.
            {brownout ? " Grid overloaded — brownout in progress." : ""}
          </p>

          {/* controls */}
          <div className="mt-3 sticker p-3 space-y-2">
            <label className="flex items-center gap-3 text-sm font-display">
              <span className="w-24 shrink-0">🕐 {String(hour).padStart(2, "0")}:00</span>
              <input
                type="range" min={0} max={23} value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="flex-1 accent-ink" aria-label="Time of day"
              />
            </label>
            <div className="flex flex-wrap gap-2 text-sm">
              <button className={`btn-cartoon !py-1 ${solar ? "bg-lang-other/60" : "bg-white"}`}
                aria-pressed={solar} onClick={() => setSolar((v) => !v)}>
                ☀️ Rooftop solar {solar ? "ON" : "OFF"}
              </button>
              <button className={`btn-cartoon !py-1 ${heatWave ? "bg-lang-cpp/50" : "bg-white"}`}
                aria-pressed={heatWave} onClick={() => setHeatWave((v) => !v)}>
                🥵 Heat wave {heatWave ? "ON" : "OFF"}
              </button>
              <button className="btn-cartoon !py-1 bg-white"
                onClick={() => setHouses((hs) => hs.map((h) => ({ ...h, on: true })))}>
                Power all
              </button>
              <button className="btn-cartoon !py-1 bg-white"
                onClick={() => setHouses((hs) => hs.map((h) => ({ ...h, on: false })))}>
                Blackout drill
              </button>
            </div>
          </div>
        </div>

        {/* dashboard */}
        <div className="space-y-3">
          <div className="sticker p-4">
            <div className="text-sm font-display text-ink/60">TOTAL LOAD</div>
            <div className="text-5xl font-display tabular-nums" style={{ color: stressColor }}>
              {totalKw.toFixed(1)} <span className="text-xl">kW</span>
            </div>
            <div className="text-xs text-ink/60 mt-1">
              {totalKw < 0 ? "net export — solar is feeding the grid ↩" : `${onCount}/${houses.length} buildings on`}
            </div>
            {/* stress gauge */}
            <div className="mt-3 h-4 border-[3px] border-ink rounded-full bg-white overflow-hidden"
              role="meter" aria-label="Grid stress" aria-valuenow={Math.round(stress * 100)}
              aria-valuemin={0} aria-valuemax={150}>
              <div className={`h-full transition-all ${brownout ? "animate-flicker" : ""}`}
                style={{ width: `${Math.min(stress, 1.5) / 1.5 * 100}%`, backgroundColor: stressColor }} />
            </div>
            <div className="flex justify-between text-[10px] font-display text-ink/50">
              <span>0</span><span>limit {GRID_LIMIT_KW} kW</span>
            </div>
            {brownout && (
              <div className="mt-2 flex items-center gap-2 text-red-700 font-display animate-shake" role="alert">
                <span className="text-xl">🚨</span> BROWNOUT — shed some load!
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ["Line loss", `${(lineLossKw * 1000).toFixed(0)} W`, "I²R across segments"],
              ["Cost / day", `$${dailyCost.toFixed(2)}`, `${dailyKwh.toFixed(0)} kWh · $${rate.toFixed(2)}/kWh`],
              ["CO₂ / day", `${dailyCo2.toFixed(1)} kg`, `${CO2_KG_PER_KWH} kg/kWh grid mix`],
            ].map(([k, v, sub]) => (
              <div key={k} className="sticker !shadow-stickerSm p-2">
                <div className="text-[11px] font-display text-ink/60">{k}</div>
                <div className="text-lg font-display tabular-nums">{v}</div>
                <div className="text-[10px] text-ink/50">{sub}</div>
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm px-1">
            <span className="font-display">Rate $/kWh</span>
            <input type="number" min={0.05} max={1} step={0.01} value={rate}
              onChange={(e) => setRate(Number(e.target.value) || 0.32)}
              className="w-20 border-2 border-ink rounded-lg px-2 py-0.5 bg-white" />
          </label>

          <div className="sticker p-3">
            <div className="text-sm font-display mb-1">24-hour consumption (current toggles)</div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dayCurve} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B211822" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#2B2118" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#2B2118" />
                  <Tooltip formatter={(v) => [`${v} kW`, "load"]} labelFormatter={(h) => `${h}:00`} />
                  <ReferenceLine x={hour} stroke="#E86A92" strokeWidth={2} />
                  <ReferenceLine y={GRID_LIMIT_KW} stroke="#c0392b" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="kW" stroke="#2B2118" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-ink/50">
        Model notes: feeder at {FEEDER_V / 1000} kV, {SEG_R} Ω per span, loads follow a diurnal curve per building type.
        Solar reverses pulse direction on exporting spans. Every number is computed from the visible house states.
      </p>
    </div>
  );
}
