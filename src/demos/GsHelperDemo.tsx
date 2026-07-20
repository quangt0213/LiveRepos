import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  characters, ELEMENT_COLORS,
  type Character, type Element, type Role,
} from "../data/characters";
import { bosses, type Boss } from "../data/bosses";

// ===========================================================================
// Scoring — real and deterministic. Documented in the "How this is scored"
// drawer below, and reused verbatim by the battle simulator.
// ===========================================================================
interface Reaction { name: string; pair: [Element, Element]; weight: number }

const REACTIONS: Reaction[] = [
  { name: "Vaporize", pair: ["Pyro", "Hydro"], weight: 10 },
  { name: "Melt", pair: ["Pyro", "Cryo"], weight: 10 },
  { name: "Overload", pair: ["Pyro", "Electro"], weight: 7 },
  { name: "Freeze", pair: ["Hydro", "Cryo"], weight: 8 },
  { name: "Electro-Charged", pair: ["Hydro", "Electro"], weight: 7 },
  { name: "Superconduct", pair: ["Cryo", "Electro"], weight: 6 },
  { name: "Bloom", pair: ["Dendro", "Hydro"], weight: 8 },
  { name: "Burning", pair: ["Dendro", "Pyro"], weight: 6 },
  { name: "Quicken", pair: ["Dendro", "Electro"], weight: 8 },
  { name: "Swirl", pair: ["Anemo", "Pyro"], weight: 5 },
  { name: "Swirl", pair: ["Anemo", "Hydro"], weight: 5 },
  { name: "Swirl", pair: ["Anemo", "Electro"], weight: 5 },
  { name: "Swirl", pair: ["Anemo", "Cryo"], weight: 5 },
  { name: "Crystallize", pair: ["Geo", "Pyro"], weight: 4 },
  { name: "Crystallize", pair: ["Geo", "Hydro"], weight: 4 },
  { name: "Crystallize", pair: ["Geo", "Electro"], weight: 4 },
  { name: "Crystallize", pair: ["Geo", "Cryo"], weight: 4 },
];

function detectReactions(party: Character[]): Reaction[] {
  const els = new Set(party.map((c) => c.element));
  const seen = new Set<string>();
  return REACTIONS.filter((r) => {
    const hit = els.has(r.pair[0]) && els.has(r.pair[1]);
    const key = r.name + r.pair.join();
    if (hit && !seen.has(key)) { seen.add(key); return true; }
    return false;
  });
}

const ROLE_DMG: Record<Role, number> = { DPS: 1.0, "Sub-DPS": 0.8, Support: 0.45, Healer: 0.35 };

interface Scores {
  overall: number; damage: number; surv: number; synergy: number; energy: number;
  reactions: Reaction[]; verdict: string;
}

function scoreParty(party: Character[], boss: Boss): Scores {
  if (party.length === 0) {
    return { overall: 0, damage: 0, surv: 0, synergy: 0, energy: 0, reactions: [], verdict: "Add heroes to the party to get a rating." };
  }
  // Damage: role-weighted ATK vs boss resistance matchup
  const rawAtk = party.reduce((a, c) => a + c.atk * ROLE_DMG[c.role], 0);
  const resMod = party.reduce((a, c) => a + boss.res[c.element], 0) / party.length;
  const damage = clamp((rawAtk / 1200) * 70 * resMod);

  // Survivability: healer, HP pool, defensive supports
  const hasHealer = party.some((c) => c.role === "Healer");
  const avgHp = party.reduce((a, c) => a + c.hp, 0) / party.length;
  const supportCount = party.filter((c) => c.role === "Support").length;
  const surv = clamp((hasHealer ? 45 : 8) + ((avgHp - 9000) / 6000) * 30 + supportCount * 12);

  // Elemental synergy: reaction pair-matrix weights (diminishing returns)
  const reactions = detectReactions(party);
  const synRaw = reactions.reduce((a, r) => a + r.weight, 0);
  const synergy = clamp(Math.sqrt(synRaw) * 24);

  // Energy uptime: same-element batteries + non-DPS particle generation
  const elCounts = new Map<Element, number>();
  party.forEach((c) => elCounts.set(c.element, (elCounts.get(c.element) ?? 0) + 1));
  const batteries = [...elCounts.values()].filter((n) => n >= 2).length;
  const generators = party.filter((c) => c.role !== "DPS").length;
  const energy = clamp(25 + batteries * 25 + generators * 12);

  // weakness coverage nudge: does the party exploit what the boss is weak to?
  const exploits = party.some((c) => boss.res[c.element] > 1.2);
  const overall = clamp(
    damage * 0.35 + synergy * 0.3 + surv * 0.2 + energy * 0.15 + (exploits ? 6 : 0) + (party.length - 4) * 8
  );

  // plain-English verdict
  const best = [...reactions].sort((a, b) => b.weight - a.weight)[0];
  let verdict = best ? `Strong ${best.name} core` : "No elemental reactions";
  if (!hasHealer) verdict += ", but zero healing — expect to dodge.";
  else if (surv > 70) verdict += " with a sturdy backline.";
  else verdict += " with just enough sustain.";
  if (resMod < 0.85) verdict += ` Careful: ${boss.name.split(" ")[0]} resists your damage types.`;
  else if (exploits) verdict += " You're hitting its weakness.";

  return { overall, damage, surv, synergy, energy, reactions, verdict };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// ===========================================================================
// Seeded battle sim: same party + boss + seed replays identically.
// ===========================================================================
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type BattleEvent =
  | { type: "round"; n: number }
  | { type: "attack"; actorId: string; dmg: number; crit: boolean; reaction: string | null; bossHp: number }
  | { type: "boss"; dmg: number; heal: number; partyHp: number }
  | { type: "end"; win: boolean; totalDmg: number; mvpId: string; rounds: number };

function simulateBattle(party: Character[], boss: Boss, seed: number) {
  const rng = mulberry32(seed);
  const events: BattleEvent[] = [];
  let bossHp = boss.hp;
  const partyMax = party.reduce((a, c) => a + c.hp, 0);
  let partyHp = partyMax;
  const dmgBy = new Map<string, number>();
  const hasHealer = party.some((c) => c.role === "Healer");
  const reactions = detectReactions(party);
  let prevEl: Element | null = null;

  const MAX_ROUNDS = 6;
  let round = 0;
  while (round < MAX_ROUNDS && bossHp > 0 && partyHp > 0) {
    round++;
    events.push({ type: "round", n: round });
    for (const c of party) {
      if (bossHp <= 0) break;
      const crit = rng() < 0.22;
      let reaction: string | null = null;
      let mult = 1;
      if (prevEl && prevEl !== c.element) {
        const r = reactions.find(
          (x) => (x.pair[0] === prevEl && x.pair[1] === c.element) || (x.pair[1] === prevEl && x.pair[0] === c.element)
        );
        if (r) { reaction = r.name; mult = 1.5; }
      }
      prevEl = c.element;
      const dmg = Math.round(
        c.atk * ROLE_DMG[c.role] * 8 * boss.res[c.element] * mult * (crit ? 1.8 : 1) * (0.9 + rng() * 0.2)
      );
      bossHp = Math.max(0, bossHp - dmg);
      dmgBy.set(c.id, (dmgBy.get(c.id) ?? 0) + dmg);
      events.push({ type: "attack", actorId: c.id, dmg, crit, reaction, bossHp });
    }
    if (bossHp > 0) {
      const bossDmg = Math.round((2400 + rng() * 1400) * (bossHp < boss.hp * 0.3 ? 1.4 : 1));
      const heal = hasHealer ? Math.round(partyMax * 0.07) : 0;
      partyHp = Math.min(partyMax, Math.max(0, partyHp - bossDmg + heal));
      events.push({ type: "boss", dmg: bossDmg, heal, partyHp });
    }
  }
  const totalDmg = [...dmgBy.values()].reduce((a, b) => a + b, 0);
  const mvpId = [...dmgBy.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? party[0].id;
  events.push({ type: "end", win: bossHp <= 0, totalDmg, mvpId, rounds: round });
  return { events, partyMax, bossMax: boss.hp };
}

// ===========================================================================
// Original chibi silhhouettes — pure SVG, tinted by element.
// ===========================================================================
function Chibi({ c, size = 44 }: { c: Character; size?: number }) {
  const col = ELEMENT_COLORS[c.element];
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="14" r="10" fill={col} stroke="#2B2118" strokeWidth="2.5" />
      <path d="M8 40 q2 -16 14 -16 q12 0 14 16 z" fill={col} stroke="#2B2118" strokeWidth="2.5" />
      <circle cx="18" cy="13" r="1.6" fill="#2B2118" />
      <circle cx="26" cy="13" r="1.6" fill="#2B2118" />
      <path d="M18.5 17.5 q3.5 2.5 7 0" fill="none" stroke="#2B2118" strokeWidth="1.6" strokeLinecap="round" />
      {c.rarity === 5 && <text x="34" y="10" fontSize="9">⭐</text>}
    </svg>
  );
}

const WEAPON_ICON: Record<string, string> = {
  Sword: "🗡️", Claymore: "⚔️", Polearm: "🔱", Bow: "🏹", Catalyst: "📖",
};

// ===========================================================================
// Component
// ===========================================================================
const ELEMENTS = Object.keys(ELEMENT_COLORS) as Element[];
const ROLES: Role[] = ["DPS", "Sub-DPS", "Support", "Healer"];

export default function GsHelperDemo() {
  const [party, setParty] = useState<Character[]>([]);
  const [search, setSearch] = useState("");
  const [elFilter, setElFilter] = useState<Element | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | null>(null);
  const [bossIdx, setBossIdx] = useState(() => Math.floor(Math.random() * bosses.length));
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const boss = bosses[bossIdx];

  const scores = useMemo(() => scoreParty(party, boss), [party, boss]);

  const roster = characters.filter(
    (c) =>
      (!elFilter || c.element === elFilter) &&
      (!roleFilter || c.role === roleFilter) &&
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const addToParty = (c: Character) => {
    setParty((p) => (p.includes(c) || p.length >= 4 ? p : [...p, c]));
  };

  const rollBoss = () => {
    setBossIdx((i) => (i + 1 + Math.floor(Math.random() * (bosses.length - 1))) % bosses.length);
    setSeed(Math.floor(Math.random() * 1e6));
  };

  // battle state
  const [battle, setBattle] = useState<ReturnType<typeof simulateBattle> | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[1.1fr_1fr_1.1fr] gap-4">
        {/* ---- roster ---- */}
        <div className="sticker p-3 flex flex-col max-h-[480px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search heroes…"
            aria-label="Search character roster"
            className="border-2 border-ink rounded-lg px-2 py-1 mb-2 bg-white text-sm"
          />
          <div className="flex flex-wrap gap-1 mb-2">
            {ELEMENTS.map((el) => (
              <button key={el} onClick={() => setElFilter((f) => (f === el ? null : el))}
                aria-pressed={elFilter === el}
                className={`w-6 h-6 rounded-full border-2 border-ink text-[0px] ${elFilter === el ? "ring-2 ring-ink" : "opacity-70"}`}
                style={{ backgroundColor: ELEMENT_COLORS[el] }} title={el}>{el}</button>
            ))}
            {ROLES.map((r) => (
              <button key={r} onClick={() => setRoleFilter((f) => (f === r ? null : r))}
                aria-pressed={roleFilter === r}
                className={`text-[10px] font-display border-2 border-ink rounded-lg px-1.5 ${roleFilter === r ? "bg-ink text-paper" : "bg-white"}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto space-y-1.5 pr-1" role="list" aria-label="Character roster">
            {roster.map((c) => (
              <button key={c.id} role="listitem" onClick={() => addToParty(c)}
                disabled={party.includes(c) || party.length >= 4}
                className="w-full flex items-center gap-2 border-2 border-ink rounded-xl bg-white px-2 py-1 text-left text-sm hover:bg-cream disabled:opacity-40 transition-colors">
                <Chibi c={c} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="font-display truncate">{c.name}</div>
                  <div className="text-[10px] text-ink/60">{c.element} · {c.role} · {WEAPON_ICON[c.weapon]} {c.weapon}</div>
                </div>
                <span className="text-[10px] font-display text-ink/50">ATK {c.atk}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ---- party + boss ---- */}
        <div className="space-y-3">
          <div className="sticker p-3">
            <h4 className="font-display mb-2">Party ({party.length}/4)</h4>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }, (_, i) => {
                const c = party[i];
                return (
                  <button key={i}
                    onClick={() => c && setParty((p) => p.filter((x) => x !== c))}
                    aria-label={c ? `Remove ${c.name} from party` : "Empty party slot"}
                    className={`aspect-square border-[3px] border-ink rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-display transition-colors ${c ? "bg-white hover:bg-red-50" : "bg-cream border-dashed"}`}>
                    {c ? (<><Chibi c={c} size={40} /><span className="truncate w-full text-center px-0.5">{c.name}</span></>) : ("＋")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sticker p-3" style={{ borderColor: ELEMENT_COLORS[boss.element] }}>
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-display">{boss.name}</h4>
              <button onClick={rollBoss} className="btn-cartoon !py-0.5 !px-2 text-sm bg-white" aria-label="Roll a new boss">🎲 New Boss</button>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="px-1.5 rounded border-2 border-ink font-display" style={{ backgroundColor: `${ELEMENT_COLORS[boss.element]}66` }}>{boss.element}</span>
              <span className="font-display">{boss.hp.toLocaleString()} HP</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2" aria-label="Boss resistances">
              {ELEMENTS.map((el) => (
                <span key={el} title={`${el}: ×${boss.res[el]}`}
                  className={`text-[10px] px-1.5 py-0.5 rounded-lg border-2 font-display ${boss.res[el] < 0.9 ? "border-ink bg-ink/80 text-paper" : boss.res[el] > 1.1 ? "border-ink bg-lang-other/70" : "border-ink/30 bg-white"}`}
                  style={{ color: boss.res[el] < 0.9 ? undefined : "#2B2118" }}>
                  {el.slice(0, 2)} ×{boss.res[el]}
                </span>
              ))}
            </div>
            <p className="text-xs text-ink/70 mt-2 italic">⚠ {boss.gimmick}</p>
          </div>

          <button
            disabled={party.length === 0}
            onClick={() => setBattle(simulateBattle(party, boss, seed))}
            className="btn-cartoon w-full text-2xl py-3 bg-lang-cpp/60 disabled:opacity-40"
          >
            ⚔️ FIGHT!
          </button>
          <div className="text-[10px] text-ink/50 text-center">seed #{seed} — same party + boss + seed replays identically</div>
        </div>

        {/* ---- rating ---- */}
        <div className="sticker p-4 space-y-3">
          <div className="flex items-center gap-4">
            <ArcGauge value={scores.overall} />
            <div>
              <div className="text-sm font-display text-ink/60">TEAM RATING</div>
              <div className="text-4xl font-display">{scores.overall}<span className="text-lg text-ink/50">/100</span></div>
            </div>
          </div>
          {([
            ["Damage", scores.damage, "#E86A92"],
            ["Survivability", scores.surv, "#8FBF6B"],
            ["Elemental Synergy", scores.synergy, "#B07CE8"],
            ["Energy Uptime", scores.energy, "#4CC2F1"],
          ] as const).map(([label, v, color]) => (
            <div key={label}>
              <div className="flex justify-between text-xs font-display"><span>{label}</span><span>{v}</span></div>
              <div className="h-3 border-2 border-ink rounded-full bg-white overflow-hidden">
                <motion.div className="h-full" initial={false} animate={{ width: `${v}%` }} style={{ backgroundColor: color }} />
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-1" aria-label="Detected reactions">
            {scores.reactions.map((r, i) => (
              <span key={i} className="text-[11px] font-display border-2 border-ink rounded-full px-2 py-0.5"
                style={{ backgroundColor: `${ELEMENT_COLORS[r.pair[0]]}55` }}>
                {r.name}
              </span>
            ))}
            {scores.reactions.length === 0 && <span className="text-xs text-ink/50">No reactions yet</span>}
          </div>
          <p className="text-sm italic border-l-4 border-ink/30 pl-2 text-ink/80">“{scores.verdict}”</p>
          <details className="text-xs text-ink/70">
            <summary className="font-display cursor-pointer">How this is scored</summary>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li><b>Damage (35%)</b>: Σ(ATK × role weight) ÷ 1200 × 70, times the mean boss-resistance multiplier of your elements. Role weights: DPS 1.0, Sub-DPS 0.8, Support 0.45, Healer 0.35.</li>
              <li><b>Synergy (30%)</b>: √(Σ reaction-pair weights) × 24, from the element pair matrix (Vaporize/Melt 10 … Crystallize 4).</li>
              <li><b>Survivability (20%)</b>: healer +45 (else +8), scaled average HP up to +30, each Support +12.</li>
              <li><b>Energy (15%)</b>: 25 base, +25 per same-element battery pair, +12 per non-DPS.</li>
              <li>+6 if any element hits a boss weakness (×{">"}1.2). Parties under 4 members are penalized. All clamped 0–100.</li>
            </ul>
          </details>
        </div>
      </div>

      <AnimatePresence>
        {battle && party.length > 0 && (
          <BattleStage key="battle" battle={battle} party={party} boss={boss} rating={scores.overall}
            onClose={() => setBattle(null)} onReplay={() => { setSeed((s) => s + 1); setBattle(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ArcGauge({ value }: { value: number }) {
  const a = (value / 100) * 270 - 135;
  const large = value > 66 ? 1 : 0;
  const p = (deg: number) => {
    const r = (deg * Math.PI) / 180;
    return `${50 + 40 * Math.sin(r)} ${50 - 40 * Math.cos(r)}`;
  };
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0" role="img" aria-label={`Overall score ${value} out of 100`}>
      <path d={`M ${p(-135)} A 40 40 0 1 1 ${p(135)}`} fill="none" stroke="#e8dfc8" strokeWidth="10" strokeLinecap="round" />
      <motion.path
        d={`M ${p(-135)} A 40 40 0 ${large} 1 ${p(a)}`}
        fill="none" stroke={value > 70 ? "#4f9e4f" : value > 40 ? "#d9a93a" : "#c0392b"}
        strokeWidth="10" strokeLinecap="round"
        initial={false} animate={{ opacity: 1 }} key={value}
      />
      <text x="50" y="56" textAnchor="middle" fontSize="22" fontFamily="Fredoka" fill="#2B2118">{value}</text>
    </svg>
  );
}

// ===========================================================================
// Battle stage — timed playback of the precomputed event list.
// ===========================================================================
function BattleStage({ battle, party, boss, rating, onClose, onReplay }: {
  battle: ReturnType<typeof simulateBattle>;
  party: Character[]; boss: Boss; rating: number;
  onClose: () => void; onReplay: () => void;
}) {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [speed2x, setSpeed2x] = useState(false);
  const { events, partyMax, bossMax } = battle;
  const ev = events[Math.min(idx, events.length - 1)];
  const done = ev.type === "end";

  // playback timer
  useEffect(() => {
    if (done) return;
    const base = ev.type === "round" ? 700 : ev.type === "attack" ? 950 : 900;
    const t = window.setTimeout(
      () => setIdx((i) => i + 1),
      reduce ? 120 : base / (speed2x ? 2 : 1)
    );
    return () => window.clearTimeout(t);
  }, [idx, done, speed2x, reduce, ev.type]);

  // derived HP up to current event
  let bossHp = bossMax, partyHp = partyMax, round = 0;
  for (let i = 0; i <= Math.min(idx, events.length - 1); i++) {
    const e = events[i];
    if (e.type === "attack") bossHp = e.bossHp;
    if (e.type === "boss") partyHp = e.partyHp;
    if (e.type === "round") round = e.n;
  }
  const attacker = ev.type === "attack" ? party.find((c) => c.id === ev.actorId) : null;
  const crit = ev.type === "attack" && ev.crit;
  const end = events[events.length - 1] as Extract<BattleEvent, { type: "end" }>;
  const mvp = party.find((c) => c.id === end.mvpId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-3"
      role="dialog" aria-modal="true" aria-label="Battle in progress">
      <div className={`sticker bg-paper w-full max-w-3xl overflow-hidden ${crit && !reduce ? "animate-shake" : ""}`}>
        {/* arena */}
        <div className="relative h-64 md:h-72 overflow-hidden border-b-[3px] border-ink"
          style={{ background: "linear-gradient(#9ad1f0 0%, #c8e6c9 70%, #7da35a 70%, #6d9350 100%)" }}>
          {/* parallax hills */}
          <div className="absolute bottom-[30%] left-0 right-0 h-16 opacity-50"
            style={{ background: "radial-gradient(80px 50px at 15% 100%, #5e8747 99%, transparent), radial-gradient(120px 60px at 55% 100%, #5e8747 99%, transparent), radial-gradient(90px 45px at 85% 100%, #5e8747 99%, transparent)" }} />
          {/* party */}
          <div className="absolute left-3 bottom-4 flex flex-col gap-1">
            {party.map((c) => (
              <motion.div key={c.id}
                initial={reduce ? false : { x: -120 }} animate={{ x: attacker?.id === c.id ? 30 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex items-center gap-1">
                <Chibi c={c} size={42} />
                <span className="text-[10px] font-display bg-paper/80 rounded px-1">{c.name}</span>
              </motion.div>
            ))}
          </div>
          {/* boss */}
          <motion.div initial={reduce ? false : { x: 140 }} animate={{ x: ev.type === "boss" ? -26 : 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="absolute right-6 bottom-6 text-center">
            <svg width="110" height="110" viewBox="0 0 110 110" aria-hidden>
              <ellipse cx="55" cy="70" rx="40" ry="34" fill={ELEMENT_COLORS[boss.element]} stroke="#2B2118" strokeWidth="4" />
              <circle cx="42" cy="62" r="5" fill="#2B2118" />
              <circle cx="68" cy="62" r="5" fill="#2B2118" />
              <path d="M40 82 q15 10 30 0" fill="none" stroke="#2B2118" strokeWidth="3.5" strokeLinecap="round" transform={bossHp === 0 ? "scale(1,-1) translate(0,-166)" : undefined} />
              <path d="M30 40 L42 20 L50 38 M80 40 L68 20 L60 38" fill="none" stroke="#2B2118" strokeWidth="4" strokeLinecap="round" />
            </svg>
            <div className="text-[10px] font-display bg-paper/80 rounded px-1">{boss.name.split(" ")[0]}</div>
          </motion.div>

          {/* attack effect: element-colored slash arc + burst ring */}
          <AnimatePresence>
            {ev.type === "attack" && attacker && !reduce && (
              <motion.div key={idx} className="absolute right-[105px] bottom-16 pointer-events-none"
                initial={{ opacity: 0, scale: 0.4, rotate: -40 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.25, 1.5], rotate: 30 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.55 }}>
                <div className="w-20 h-20 rounded-full border-8"
                  style={{ borderColor: `${ELEMENT_COLORS[attacker.element]} transparent transparent transparent`, transform: "rotate(45deg)" }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* floating damage number */}
          <AnimatePresence>
            {ev.type === "attack" && (
              <motion.div key={`dmg-${idx}`}
                initial={{ opacity: 0, y: 10, scale: crit ? 0.6 : 0.8 }}
                animate={{ opacity: [0, 1, 1, 0], y: -46, scale: crit ? 1.5 : 1 }}
                transition={{ duration: reduce ? 0.1 : 0.9 }}
                className="absolute right-16 bottom-40 font-display text-2xl pointer-events-none"
                style={{ color: crit ? "#c0392b" : "#2B2118", textShadow: "1px 1px 0 #FDF6E3" }}>
                {ev.dmg.toLocaleString()}{crit ? "!!" : ""}
              </motion.div>
            )}
            {ev.type === "boss" && (
              <motion.div key={`bdmg-${idx}`}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: [0, 1, 0], y: -30 }}
                transition={{ duration: reduce ? 0.1 : 0.8 }}
                className="absolute left-24 bottom-40 font-display text-xl text-red-700 pointer-events-none">
                -{ev.dmg.toLocaleString()}{ev.heal > 0 ? ` (+${ev.heal.toLocaleString()} heal)` : ""}
              </motion.div>
            )}
          </AnimatePresence>

          {/* reaction combo text */}
          <AnimatePresence>
            {ev.type === "attack" && ev.reaction && (
              <motion.div key={`rx-${idx}`}
                initial={{ scale: 0.3, opacity: 0, rotate: -6 }}
                animate={{ scale: 1.15, opacity: [0, 1, 1, 0] }}
                transition={{ duration: reduce ? 0.15 : 1 }}
                className="absolute inset-x-0 top-8 text-center font-display text-3xl pointer-events-none"
                style={{ color: attacker ? ELEMENT_COLORS[attacker.element] : "#2B2118", textShadow: "2px 2px 0 #2B2118" }}>
                ✦ {ev.reaction}! ✦
              </motion.div>
            )}
          </AnimatePresence>

          {/* round banner */}
          {ev.type === "round" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="font-display text-4xl bg-paper/85 border-[3px] border-ink rounded-2xl px-6 py-2 -rotate-2">
                Round {ev.n}
              </span>
            </div>
          )}
        </div>

        {/* HP bars + controls */}
        <div className="p-4 space-y-2">
          <HpBar label={`${boss.name}`} value={bossHp} max={bossMax} color="#c0392b" />
          <HpBar label="Party" value={partyHp} max={partyMax} color="#4f9e4f" />
          <div className="sr-only" role="status">
            Round {round}. Boss at {Math.round((bossHp / bossMax) * 100)} percent. Party at {Math.round((partyHp / partyMax) * 100)} percent.
          </div>

          {done ? (
            <div className="text-center space-y-2 pt-1">
              <div className="text-3xl font-display">{end.win ? "🏆 VICTORY!" : "💀 Defeat…"}</div>
              <p className="text-sm">
                Total damage: <b>{end.totalDmg.toLocaleString()}</b> over {end.rounds} rounds · MVP: <b>{mvp?.name}</b>
              </p>
              <p className="text-xs text-ink/60 italic">
                Your team rating of {rating}/100 predicted this — {rating >= 60 ? "solid comp, solid result." : end.win ? "you overperformed the sheet!" : "the sheet warned you."}
              </p>
              <div className="flex justify-center gap-2 pt-1">
                <button className="btn-cartoon bg-lang-python/40" onClick={onReplay}>New seed ↻</button>
                <button className="btn-cartoon bg-white" onClick={onClose}>Back to planner</button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-display text-ink/60">Round {round}</span>
              <div className="flex gap-2">
                <button className={`btn-cartoon !py-0.5 text-sm ${speed2x ? "bg-lang-python/50" : "bg-white"}`}
                  aria-pressed={speed2x} onClick={() => setSpeed2x((v) => !v)}>2× speed</button>
                <button className="btn-cartoon !py-0.5 text-sm bg-white" onClick={() => setIdx(events.length - 1)}>Skip to result ≫</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function HpBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-display">
        <span className="truncate">{label}</span>
        <span className="tabular-nums">{value.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div className="h-4 border-[3px] border-ink rounded-full bg-white overflow-hidden">
        <motion.div className="h-full" initial={false}
          animate={{ width: `${(value / max) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          style={{ backgroundColor: color }} />
      </div>
    </div>
  );
}
