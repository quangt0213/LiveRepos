import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

// ---------------------------------------------------------------------------
// Simplified Keplerian model: circular orbits, correct relative periods,
// mean longitudes at J2000. Good enough for an orrery; noted in the UI.
// ---------------------------------------------------------------------------
interface PlanetDef {
  name: string;
  color: string;
  au: number; // semi-major axis
  periodDays: number;
  l0: number; // mean longitude at J2000 (deg)
  tiltDeg: number;
  diameterKm: number;
  size: number; // compressed visual radius
  ring?: boolean;
  fact: string;
}

const PLANETS: PlanetDef[] = [
  { name: "Mercury", color: "#b5a48c", au: 0.39, periodDays: 88, l0: 252, tiltDeg: 0, diameterKm: 4879, size: 0.28, fact: "A Mercury year is shorter than a Mercury day-night cycle." },
  { name: "Venus", color: "#e8c98a", au: 0.72, periodDays: 224.7, l0: 182, tiltDeg: 177, diameterKm: 12104, size: 0.42, fact: "Spins backwards — the sun rises in the west." },
  { name: "Earth", color: "#5B8DEF", au: 1.0, periodDays: 365.25, l0: 100, tiltDeg: 23.4, diameterKm: 12756, size: 0.44, fact: "The only planet not named after a deity." },
  { name: "Mars", color: "#d1603d", au: 1.52, periodDays: 687, l0: 355, tiltDeg: 25.2, diameterKm: 6792, size: 0.34, fact: "Home to Olympus Mons, 2.5× the height of Everest." },
  { name: "Jupiter", color: "#d9a066", au: 5.2, periodDays: 4331, l0: 34, tiltDeg: 3.1, diameterKm: 142984, size: 1.05, fact: "Its Great Red Spot has raged for at least 190 years." },
  { name: "Saturn", color: "#e3c589", au: 9.58, periodDays: 10747, l0: 50, tiltDeg: 26.7, diameterKm: 120536, size: 0.92, ring: true, fact: "Less dense than water — it would float (given a big enough tub)." },
  { name: "Uranus", color: "#9fd6e3", au: 19.2, periodDays: 30589, l0: 314, tiltDeg: 97.8, diameterKm: 51118, size: 0.62, fact: "Rolls around the sun on its side." },
  { name: "Neptune", color: "#4f6fd8", au: 30.1, periodDays: 59800, l0: 304, tiltDeg: 28.3, diameterKm: 49528, size: 0.6, fact: "Winds hit 2,000 km/h — the fastest in the solar system." },
];

const J2000 = Date.UTC(2000, 0, 1, 12);
const DAY_MS = 86400000;

// compressed orbit radius: log scale so Neptune stays on screen
const orbitR = (au: number, realistic: boolean) =>
  realistic ? au * 1.6 : 2.6 + Math.log2(au + 1) * 2.6;

function planetAngle(def: PlanetDef, simMs: number): number {
  const days = (simMs - J2000) / DAY_MS;
  return ((def.l0 + (360 * days) / def.periodDays) * Math.PI) / 180;
}

interface Shared {
  simMs: React.MutableRefObject<number>;
  realistic: boolean;
  trails: boolean;
  labels: boolean;
  follow: string | null;
  setFollow: (n: string | null) => void;
}

function Planet({ def, shared }: { def: PlanetDef; shared: Shared }) {
  const group = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Mesh>(null);

  useFrame(() => {
    const a = planetAngle(def, shared.simMs.current);
    const r = orbitR(def.au, shared.realistic);
    group.current?.position.set(r * Math.cos(a), 0, -r * Math.sin(a));
    if (arm.current) {
      // centered box → place its midpoint halfway along the radius
      arm.current.position.set((r / 2) * Math.cos(a), -0.35, -(r / 2) * Math.sin(a));
      arm.current.rotation.y = a;
      arm.current.scale.x = r;
    }
  });

  const r = orbitR(def.au, shared.realistic);
  return (
    <>
      {/* brass support arm from hub to planet */}
      <mesh ref={arm}>
        <boxGeometry args={[1, 0.05, 0.05]} />
        <meshStandardMaterial color="#a8823c" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* orbit ring (brass track + glow trail) */}
      {shared.trails && (
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[r - 0.015, r + 0.015, 96]} />
          <meshBasicMaterial color={def.color} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      <group ref={group}>
        <mesh
          rotation-z={(def.tiltDeg * Math.PI) / 180}
          onClick={(e) => {
            e.stopPropagation();
            shared.setFollow(shared.follow === def.name ? null : def.name);
          }}
        >
          <sphereGeometry args={[def.size, 24, 16]} />
          <meshStandardMaterial color={def.color} roughness={0.7} />
        </mesh>
        {def.ring && (
          <mesh rotation-x={-Math.PI / 2 + (def.tiltDeg * Math.PI) / 180}>
            <ringGeometry args={[def.size * 1.4, def.size * 2.1, 48]} />
            <meshStandardMaterial color="#d8c290" side={THREE.DoubleSide} transparent opacity={0.85} />
          </mesh>
        )}
        {def.name === "Earth" && <Moon parentSize={def.size} simMs={shared.simMs} />}
        {shared.labels && (
          <Html center distanceFactor={18} style={{ pointerEvents: "none" }}>
            <div style={{
              fontFamily: "Fredoka, sans-serif", color: "#e8e4d0", fontSize: 11,
              textShadow: "0 0 4px #000", transform: "translateY(-16px)", whiteSpace: "nowrap",
            }}>
              {def.name}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}

function Moon({ parentSize, simMs }: { parentSize: number; simMs: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const days = (simMs.current - J2000) / DAY_MS;
    const a = ((360 * days) / 27.3) * (Math.PI / 180);
    const r = parentSize * 2.1;
    ref.current?.position.set(r * Math.cos(a), 0, -r * Math.sin(a));
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[parentSize * 0.27, 12, 8]} />
      <meshStandardMaterial color="#c9c4b8" roughness={0.9} />
    </mesh>
  );
}

/** Brass-and-wood base with a slowly turning gear train. */
function OrreryBase() {
  const gearBig = useRef<THREE.Mesh>(null);
  const gearSmall = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (gearBig.current) gearBig.current.rotation.y += dt * 0.15;
    if (gearSmall.current) gearSmall.current.rotation.y -= dt * 0.45;
  });
  const teethBig = useMemo(() => Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2), []);
  const teethSmall = useMemo(() => Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2), []);
  return (
    <group position={[0, -0.75, 0]}>
      {/* wooden base */}
      <mesh>
        <cylinderGeometry args={[3.4, 3.8, 0.35, 48]} />
        <meshStandardMaterial color="#6d4a2f" roughness={0.8} />
      </mesh>
      {/* big brass gear ring */}
      <mesh ref={gearBig} position={[0, 0.25, 0]}>
        <torusGeometry args={[2.6, 0.09, 10, 60]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} />
      </mesh>
      <group position={[0, 0.25, 0]}>
        {teethBig.map((a) => (
          <mesh key={a} position={[2.6 * Math.cos(a), 0, 2.6 * Math.sin(a)]} rotation-y={-a}>
            <boxGeometry args={[0.16, 0.08, 0.12]} />
            <meshStandardMaterial color="#c9a24a" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* small counter gear */}
      <mesh ref={gearSmall} position={[1.4, 0.42, 0]}>
        <torusGeometry args={[0.5, 0.07, 8, 30]} />
        <meshStandardMaterial color="#a8823c" metalness={0.8} roughness={0.3} />
      </mesh>
      <group position={[1.4, 0.42, 0]}>
        {teethSmall.map((a) => (
          <mesh key={a} position={[0.5 * Math.cos(a), 0, 0.5 * Math.sin(a)]}>
            <boxGeometry args={[0.09, 0.06, 0.08]} />
            <meshStandardMaterial color="#a8823c" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
      {/* central brass column */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.1, 16]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.85} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Sun() {
  const glowTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    grad.addColorStop(0, "rgba(255,220,120,0.9)");
    grad.addColorStop(0.4, "rgba(255,180,60,0.35)");
    grad.addColorStop(1, "rgba(255,160,40,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  }, []);
  useEffect(() => () => glowTex.dispose(), [glowTex]);
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.9, 32, 24]} />
        <meshStandardMaterial color="#ffcf5e" emissive="#ff9a1f" emissiveIntensity={1.6} />
      </mesh>
      <sprite scale={[5.5, 5.5, 1]}>
        <spriteMaterial map={glowTex} transparent depthWrite={false} />
      </sprite>
      <pointLight intensity={90} distance={80} color="#ffe0a0" />
    </group>
  );
}

function CameraRig({ shared, controlsRef }: {
  shared: Shared;
  controlsRef: React.RefObject<OrbitControlsImpl>;
}) {
  const target = new THREE.Vector3();
  useFrame(() => {
    const ctl = controlsRef.current;
    if (!ctl) return;
    if (shared.follow) {
      const def = PLANETS.find((p) => p.name === shared.follow);
      if (def) {
        const a = planetAngle(def, shared.simMs.current);
        const r = orbitR(def.au, shared.realistic);
        target.set(r * Math.cos(a), 0, -r * Math.sin(a));
        ctl.target.lerp(target, 0.06); // smooth tween to follow
      }
    } else {
      ctl.target.lerp(target.set(0, 0, 0), 0.04);
    }
    ctl.update();
  });
  return null;
}

function SimClock({ simMs, speed, dir, paused, onDate }: {
  simMs: React.MutableRefObject<number>;
  speed: number; dir: number; paused: boolean;
  onDate: (ms: number) => void;
}) {
  const acc = useRef(0);
  useFrame((_, dt) => {
    if (!paused) simMs.current += dt * speed * dir * 1000;
    acc.current += dt;
    if (acc.current > 0.25) {
      acc.current = 0;
      onDate(simMs.current);
    }
  });
  return null;
}

export default function OrreryDemo() {
  const simMs = useRef(Date.now());
  const [dateLabel, setDateLabel] = useState(Date.now());
  const [speedT, setSpeedT] = useState(0.45); // 0..1 log slider
  const [paused, setPaused] = useState(false);
  const [dir, setDir] = useState(1);
  const [trails, setTrails] = useState(true);
  const [labels, setLabels] = useState(true);
  const [realistic, setRealistic] = useState(false);
  const [stars, setStarsOn] = useState(true);
  const [follow, setFollow] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // 1 hour/sec (3600×) → 1 year/sec (31.5M×), log scale
  const speed = Math.round(3600 * Math.pow(31_557_600 / 3600, speedT));
  const speedLabel =
    speed < 86400 * 2 ? `${(speed / 3600).toFixed(1)} hr/s`
    : speed < 86400 * 60 ? `${(speed / 86400).toFixed(1)} days/s`
    : speed < 31_557_600 * 0.9 ? `${(speed / (86400 * 30.44)).toFixed(1)} months/s`
    : `${(speed / 31_557_600).toFixed(1)} yr/s`;

  // the "look up" pan-in transition (cross-fade under reduced motion via CSS)
  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), 30);
    return () => window.clearTimeout(t);
  }, []);

  const followDef = PLANETS.find((p) => p.name === follow);

  return (
    <div
      className="rounded-card border-[3px] border-ink overflow-hidden relative"
      style={{
        background: entered
          ? "linear-gradient(to bottom, #06070f 0%, #10142e 60%, #2b2a4a 100%)"
          : "linear-gradient(to bottom, #FDF6E3 0%, #c9d4ee 60%, #2b2a4a 100%)",
        transition: "background 1.5s ease",
      }}
    >
      <div
        className="h-[420px] md:h-[480px]"
        style={{
          transform: entered ? "translateY(0)" : "translateY(-38%)",
          opacity: entered ? 1 : 0.2,
          transition: "transform 1.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 1.2s ease",
        }}
        aria-label="Interactive 3D orrery of the solar system. Drag to rotate, scroll or pinch to zoom, click a planet to follow it."
        role="application"
      >
        <Canvas
          camera={{ position: [0, 9, 15], fov: 45 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
        >
          <ambientLight intensity={0.25} />
          {stars && <Stars radius={90} depth={40} count={2400} factor={3} saturation={0} fade speed={0.4} />}
          <Sun />
          <OrreryBase />
          {PLANETS.map((def) => (
            <Planet
              key={def.name}
              def={def}
              shared={{ simMs, realistic, trails, labels, follow, setFollow }}
            />
          ))}
          <SimClock simMs={simMs} speed={speed} dir={dir} paused={paused} onDate={setDateLabel} />
          <CameraRig shared={{ simMs, realistic, trails, labels, follow, setFollow }} controlsRef={controlsRef} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.08}
            minDistance={3}
            maxDistance={realistic ? 90 : 40}
          />
        </Canvas>

        {/* planet info card */}
        {followDef && (
          <div className="absolute top-3 left-3 max-w-[240px] sticker !shadow-stickerSm bg-paper/95 p-3 text-sm">
            <div className="flex justify-between items-center">
              <h4 className="font-display text-lg">{followDef.name}</h4>
              <button className="btn-cartoon !px-2 !py-0 text-xs" onClick={() => setFollow(null)} aria-label="Stop following planet">✕</button>
            </div>
            <ul className="mt-1 space-y-0.5 text-ink/80">
              <li>Orbit: {followDef.periodDays < 1000 ? `${followDef.periodDays} days` : `${(followDef.periodDays / 365.25).toFixed(1)} years`}</li>
              <li>Distance: {followDef.au} AU</li>
              <li>Diameter: {followDef.diameterKm.toLocaleString()} km</li>
            </ul>
            <p className="mt-1 text-xs italic text-ink/70">{followDef.fact}</p>
          </div>
        )}
      </div>

      {/* control deck */}
      <div className="bg-[#171a2e] text-[#e8e4d0] px-4 py-3 border-t-[3px] border-ink space-y-2">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button className="btn-cartoon !py-1 !text-ink bg-white" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? "▶ Play" : "⏸ Pause"}
          </button>
          <button className="btn-cartoon !py-1 !text-ink bg-white" onClick={() => setDir((d) => -d)} aria-pressed={dir < 0}>
            {dir > 0 ? "⏪ Reverse" : "⏩ Forward"}
          </button>
          <label className="flex items-center gap-2 flex-1 min-w-[180px]">
            <span className="font-display whitespace-nowrap">⏱ {speedLabel}</span>
            <input type="range" min={0} max={1} step={0.01} value={speedT}
              onChange={(e) => setSpeedT(Number(e.target.value))}
              className="flex-1 accent-amber-300" aria-label="Simulation speed, 1 hour per second to 1 year per second" />
          </label>
          <span className="font-display tabular-nums" aria-live="off">
            📅 {new Date(dateLabel).toISOString().slice(0, 10)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-display whitespace-nowrap">Date scrub</span>
          <input
            type="range" min={-18262} max={18262} step={1}
            value={Math.round((dateLabel - Date.now()) / DAY_MS)}
            onChange={(e) => {
              simMs.current = Date.now() + Number(e.target.value) * DAY_MS;
              setDateLabel(simMs.current);
            }}
            className="flex-1 accent-amber-300"
            aria-label="Scrub simulated date, plus or minus 50 years"
          />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {[
            ["Orbit trails", trails, () => setTrails((v) => !v)],
            ["Labels", labels, () => setLabels((v) => !v)],
            ["Realistic scale", realistic, () => setRealistic((v) => !v)],
            ["Star backdrop", stars, () => setStarsOn((v) => !v)],
          ].map(([label, val, fn]) => (
            <label key={label as string} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={val as boolean} onChange={fn as () => void} className="accent-amber-300" />
              {label as string}
            </label>
          ))}
          <button
            className="ml-auto underline underline-offset-2 hover:text-white"
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))}
          >
            🌍 Return to Earth
          </button>
        </div>
        <p className="text-[10px] text-[#8b93c9]">
          Positions use simplified circular Keplerian elements (mean longitudes at J2000) — an approximation, like any
          good brass orrery. Radii are log-compressed unless “Realistic scale” is on.
        </p>
      </div>
    </div>
  );
}
