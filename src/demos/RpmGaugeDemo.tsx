import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// ---------------------------------------------------------------------------
// Real computation chain (same math as the MCU firmware):
//   vehicle speed → wheel RPM → driveshaft RPM → engine RPM
//   → pulse frequency (hall sensor over N gear teeth) → timer capture ticks
// ---------------------------------------------------------------------------
const TIRE_DIAMETER_M = 0.66; // ~26" overall tire
const FINAL_DRIVE = 3.42;
const GEARS = [3.83, 2.36, 1.69, 1.31, 1.0, 0.79]; // 6-speed ratios
const TIMER_HZ = 1_000_000; // 1 MHz capture clock
const SHIFT_UP_RPM = 6000;
const SHIFT_DOWN_RPM = 1600;

interface Chain {
  mph: number;
  wheelRpm: number;
  shaftRpm: number;
  gear: number; // 1-based
  engineRpm: number;
  pulseHz: number;
  ticks: number;
}

function computeChain(mph: number, teeth: number, prevGear: number): Chain {
  const mps = mph * 0.44704;
  const wheelRpm = (mps * 60) / (Math.PI * TIRE_DIAMETER_M);
  const shaftRpm = wheelRpm * FINAL_DRIVE;

  // auto transmission: shift to keep engine rpm inside a realistic band
  let gear = prevGear;
  const rpmIn = (g: number) => shaftRpm * GEARS[g - 1];
  while (gear < GEARS.length && rpmIn(gear) > SHIFT_UP_RPM) gear++;
  while (gear > 1 && rpmIn(gear) < SHIFT_DOWN_RPM) gear--;

  const engineRpm = mph < 0.5 ? 800 : Math.max(800, rpmIn(gear)); // idle floor
  const pulseHz = (engineRpm / 60) * teeth; // f = RPM·N/60  ⇔  RPM = 60f/N
  const ticks = pulseHz > 0 ? Math.round(TIMER_HZ / pulseHz) : 0;
  return { mph, wheelRpm, shaftRpm, gear, engineRpm, pulseHz, ticks };
}

function Formula({ tex }: { tex: string }) {
  const html = useMemo(
    () => katex.renderToString(tex, { displayMode: true, throwOnError: false }),
    [tex]
  );
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function RpmGaugeDemo() {
  const [mph, setMph] = useState(35);
  const [teeth, setTeeth] = useState(60);
  const [chain, setChain] = useState<Chain>(() => computeChain(35, 60, 1));
  const [serial, setSerial] = useState<string[]>([]);
  const [fault, setFault] = useState(false);

  const displayRpm = useRef(800);
  const gearAngle = useRef(0);
  const gearRef = useRef<SVGGElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const hallRef = useRef<SVGCircleElement>(null);
  const rpmTextRef = useRef<HTMLSpanElement>(null);
  const lastMph = useRef(35);
  const mphRef = useRef(mph);
  const teethRef = useRef(teeth);
  const chainGear = useRef(1);
  mphRef.current = mph;
  teethRef.current = teeth;

  // Sensor fault: slamming the wheel unrealistically fast
  useEffect(() => {
    const dv = Math.abs(mph - lastMph.current);
    lastMph.current = mph;
    if (dv > 40) {
      setFault(true);
      const t = window.setTimeout(() => setFault(false), 1800);
      return () => window.clearTimeout(t);
    }
  }, [mph]);

  // recompute chain when inputs change
  useEffect(() => {
    const c = computeChain(mph, teeth, chainGear.current);
    chainGear.current = c.gear;
    setChain(c);
  }, [mph, teeth]);

  // animation loop: smooth rpm, gear spin, needle, hall flash
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      const target = computeChain(mphRef.current, teethRef.current, chainGear.current).engineRpm;
      // exponential approach — digits interpolate, never jump
      displayRpm.current += (target - displayRpm.current) * Math.min(1, dt * 4);

      const rpm = displayRpm.current;
      gearAngle.current += ((rpm / 60) * 360 * dt) / 8; // visually slowed 8×
      if (gearRef.current)
        gearRef.current.setAttribute("transform", `rotate(${gearAngle.current % 360} 90 90)`);
      if (needleRef.current) {
        const frac = Math.min(rpm, 8000) / 8000;
        needleRef.current.setAttribute("transform", `rotate(${-120 + frac * 240} 110 110)`);
      }
      if (hallRef.current) {
        // flash on each simulated tooth pass (visually slowed to stay visible)
        const phase = (gearAngle.current / (360 / teethRef.current)) % 1;
        hallRef.current.setAttribute("fill", phase < 0.35 ? "#F2B84B" : "#5b4a3a");
      }
      if (rpmTextRef.current)
        rpmTextRef.current.textContent = String(Math.round(rpm)).padStart(4, "0");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // serial monitor stream
  useEffect(() => {
    const iv = window.setInterval(() => {
      const c = computeChain(mphRef.current, teethRef.current, chainGear.current);
      const addr = (0x20 + Math.floor(Math.random() * 16)).toString(16).toUpperCase();
      const line = `[0x${addr}] RPM=${Math.round(c.engineRpm)} F=${Math.round(
        c.pulseHz
      )}Hz DT=${c.ticks} G=${c.gear}`;
      setSerial((s) => [...s.slice(-7), line]);
    }, 400);
    return () => window.clearInterval(iv);
  }, []);

  // scroll-wheel speed input
  const wheelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setMph((v) => Math.max(0, Math.min(160, v + (e.deltaY > 0 ? -2 : 2))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  const dragY = useRef<number | null>(null);

  const redline = chain.engineRpm > 6500;

  return (
    <div className="space-y-4">
      {/* 1. formula card — torn notebook style */}
      <div
        className="border-[3px] border-ink rounded-card bg-white shadow-sticker p-4 relative overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 26px, #cfe3f5 26px 27px)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-2 bg-cream border-b-2 border-dashed border-ink/30" />
        <h3 className="text-lg mb-1 mt-1">The whole project in one line:</h3>
        <Formula tex="\text{RPM} = \frac{60 \cdot f_{\text{pulse}}}{N_{\text{teeth}}}" />
        <Formula tex="f_{\text{pulse}} = \frac{f_{\text{timer}}}{\Delta t_{\text{capture}}}" />
        <p className="text-sm text-ink/70">
          <b>f<sub>pulse</sub></b>: hall-sensor pulses per second (one per tooth) ·{" "}
          <b>N<sub>teeth</sub></b>: teeth on the trigger gear ({teeth}) ·{" "}
          <b>f<sub>timer</sub></b>: capture clock ({(TIMER_HZ / 1e6).toFixed(0)} MHz) ·{" "}
          <b>Δt<sub>capture</sub></b>: timer ticks between pulses
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_auto_1.2fr] gap-4 items-start">
        {/* 2. gear + hall sensor */}
        <div className="sticker p-4 flex flex-col items-center">
          <svg viewBox="0 0 200 180" className="w-full max-w-[260px]" role="img"
            aria-label={`Trigger gear with ${teeth} teeth spinning at ${Math.round(chain.engineRpm)} RPM. A hall-effect sensor flashes on each tooth pass.`}>
            <g ref={gearRef} style={redline ? { filter: "blur(0.6px)" } : undefined}>
              {Array.from({ length: Math.min(teeth, 48) }, (_, i) => (
                <rect key={i} x="86" y="18" width="8" height="12" rx="2"
                  fill="#8FBF6B" stroke="#2B2118" strokeWidth="2"
                  transform={`rotate(${(i * 360) / Math.min(teeth, 48)} 90 90)`} />
              ))}
              <circle cx="90" cy="90" r="62" fill="#8FBF6B" stroke="#2B2118" strokeWidth="4" />
              <circle cx="90" cy="90" r="18" fill="#FDF6E3" stroke="#2B2118" strokeWidth="4" />
              {[0, 120, 240].map((a) => (
                <circle key={a} cx={90 + 38 * Math.cos((a * Math.PI) / 180)}
                  cy={90 + 38 * Math.sin((a * Math.PI) / 180)} r="8"
                  fill="#FDF6E3" stroke="#2B2118" strokeWidth="3" />
              ))}
            </g>
            {/* hall sensor */}
            <rect x="168" y="76" width="22" height="28" rx="4" fill="#5b4a3a" stroke="#2B2118" strokeWidth="3" />
            <circle ref={hallRef} cx="179" cy="90" r="5" fill="#5b4a3a" stroke="#2B2118" strokeWidth="2" />
            <text x="179" y="120" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fill="#2B2118">hall</text>
          </svg>
          <label className="mt-2 text-sm font-display flex items-center gap-2">
            N<sub>teeth</sub>
            <input type="range" min={12} max={120} step={4} value={teeth}
              onChange={(e) => setTeeth(Number(e.target.value))}
              className="accent-ink" aria-label="Number of gear teeth" />
            <span className="border-2 border-ink rounded px-1.5 bg-white">{teeth}</span>
          </label>
        </div>

        {/* 3. speed scroll wheel */}
        <div className="sticker p-3 flex flex-col items-center gap-2 mx-auto">
          <span className="font-display text-sm">SPEED</span>
          <div
            ref={wheelRef}
            role="slider"
            tabIndex={0}
            aria-label="Vehicle speed"
            aria-valuenow={mph}
            aria-valuemin={0}
            aria-valuemax={160}
            aria-valuetext={`${mph} miles per hour`}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowRight") {
                e.preventDefault(); setMph((v) => Math.min(160, v + 2));
              }
              if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
                e.preventDefault(); setMph((v) => Math.max(0, v - 2));
              }
            }}
            onPointerDown={(e) => { dragY.current = e.clientY; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => {
              if (dragY.current === null) return;
              const dy = dragY.current - e.clientY;
              if (Math.abs(dy) >= 4) {
                setMph((v) => Math.max(0, Math.min(160, v + Math.sign(dy) * 2)));
                dragY.current = e.clientY;
              }
            }}
            onPointerUp={() => (dragY.current = null)}
            className="relative w-24 h-56 border-[3px] border-ink rounded-2xl bg-white overflow-hidden cursor-ns-resize touch-none select-none shadow-stickerSm"
          >
            {/* tick strip that scrolls with speed */}
            <div className="absolute inset-x-0" style={{ top: `${50 - (160 - mph) * 2.5}%` }} aria-hidden>
              {Array.from({ length: 17 }, (_, i) => {
                const v = 160 - i * 10;
                return (
                  <div key={v} className="h-10 flex items-center justify-center gap-1 text-sm font-display"
                    style={{ height: "40px" }}>
                    <span className="w-4 border-t-2 border-ink" />
                    {v}
                    <span className="w-4 border-t-2 border-ink" />
                  </div>
                );
              })}
            </div>
            <div className="absolute top-1/2 inset-x-0 h-10 -mt-5 border-y-[3px] border-lang-cpp bg-lang-cpp/10 pointer-events-none" aria-hidden />
          </div>
          <span className="font-display text-2xl">{mph} <span className="text-sm">mph</span></span>
          <span className="text-[11px] text-ink/50 text-center">scroll · drag · arrows</span>
        </div>

        {/* 4. ECU readout */}
        <div className="lcd border-[3px] border-ink rounded-card shadow-sticker p-4 space-y-3"
          aria-label={`ECU readout: ${Math.round(chain.engineRpm)} RPM, gear ${chain.gear}, pulse frequency ${Math.round(chain.pulseHz)} hertz, timer capture ${chain.ticks} ticks`}>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs opacity-70">ENGINE RPM</div>
              <div className="text-5xl tracking-widest tabular-nums">
                <span ref={rpmTextRef}>0800</span>
              </div>
            </div>
            {/* warning LEDs */}
            <div className="flex flex-col gap-1 text-[10px] text-right">
              <span className={`px-2 py-0.5 rounded border ${redline ? "bg-red-500 text-white animate-flicker" : "border-current opacity-40"}`}>
                REDLINE
              </span>
              <span className={`px-2 py-0.5 rounded border ${fault ? "bg-yellow-400 text-ink animate-flicker" : "border-current opacity-40"}`}>
                SENSOR FAULT
              </span>
            </div>
          </div>

          {/* tach arc */}
          <svg viewBox="0 0 220 130" className="w-full max-w-[300px]" aria-hidden>
            <path d="M 30.7 165.8 A 92 92 0 1 1 189.2 165.8" transform="translate(0,-46)"
              fill="none" stroke="#39543c" strokeWidth="12" strokeLinecap="round" />
            {/* redline zone: 6500-8000 of 0-8000 over 240° starting at -120° */}
            <path d={describeArc(110, 110, 92, -120 + (6500 / 8000) * 240, 120)}
              fill="none" stroke="#c0392b" strokeWidth="12" strokeLinecap="round" />
            {Array.from({ length: 9 }, (_, i) => {
              const a = ((-120 + i * 30) * Math.PI) / 180;
              return (
                <text key={i} x={110 + 70 * Math.sin(a)} y={114 - 70 * Math.cos(a)}
                  textAnchor="middle" fontSize="11" fill="#9df29d">{i}</text>
              );
            })}
            <g ref={needleRef}>
              <polygon points="106,110 114,110 110,30" fill="#9df29d" />
            </g>
            <circle cx="110" cy="110" r="7" fill="#9df29d" />
            <text x="110" y="128" textAnchor="middle" fontSize="10" fill="#9df29d">×1000 RPM</text>
          </svg>

          <div className="grid grid-cols-3 gap-2 text-sm tabular-nums">
            <div><div className="text-[10px] opacity-70">GEAR</div><div className="text-2xl">{mph < 1 ? "N" : chain.gear}</div></div>
            <div><div className="text-[10px] opacity-70">PULSE FREQ</div><div className="text-2xl">{Math.round(chain.pulseHz)} <span className="text-xs">Hz</span></div></div>
            <div><div className="text-[10px] opacity-70">CAPTURE Δt</div><div className="text-2xl">{chain.ticks} <span className="text-xs">tk</span></div></div>
          </div>

          <div className="border-t border-current/30 pt-2">
            <div className="text-[10px] opacity-70 mb-1">SERIAL MONITOR — 115200 baud</div>
            <div className="text-xs leading-5 h-24 overflow-hidden" role="log" aria-live="off">
              {serial.map((l, i) => (<div key={i}>{l}</div>))}
            </div>
          </div>
        </div>
      </div>

      {/* show-your-work chain */}
      <details className="sticker p-4">
        <summary className="font-display cursor-pointer">Show the full computation chain</summary>
        <ol className="mt-2 space-y-1 text-sm text-ink/85 list-decimal list-inside">
          <li>{mph} mph = {(mph * 0.44704).toFixed(1)} m/s</li>
          <li>Wheel: v / (π · {TIRE_DIAMETER_M} m) · 60 = <b>{chain.wheelRpm.toFixed(0)} RPM</b></li>
          <li>Driveshaft: wheel × final drive {FINAL_DRIVE} = <b>{chain.shaftRpm.toFixed(0)} RPM</b></li>
          <li>Engine: shaft × gear {chain.gear} ratio ({GEARS[chain.gear - 1]}) = <b>{chain.engineRpm.toFixed(0)} RPM</b></li>
          <li>Pulses: RPM / 60 × {teeth} teeth = <b>{chain.pulseHz.toFixed(0)} Hz</b></li>
          <li>Timer: {(TIMER_HZ / 1e6).toFixed(0)} MHz / f = <b>{chain.ticks} ticks</b> between captures → firmware inverts this back to RPM = 60f/N</li>
        </ol>
      </details>
    </div>
  );
}

function describeArc(cx: number, cy: number, r: number, a0deg: number, a1deg: number) {
  const a0 = (a0deg * Math.PI) / 180;
  const a1 = (a1deg * Math.PI) / 180;
  const p = (a: number) => `${cx + r * Math.sin(a)} ${cy - r * Math.cos(a)}`;
  const large = a1deg - a0deg > 180 ? 1 : 0;
  return `M ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)}`;
}
