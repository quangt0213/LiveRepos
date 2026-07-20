import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  cardHash, optcgCards, priceHistory,
  type CardColor, type OptcgCard, type Rarity,
} from "../data/optcgCards";

const COLOR_HEX: Record<CardColor, string> = {
  Red: "#d94f3d", Green: "#4f9e4f", Blue: "#3d6fd9", Purple: "#8a4fd9",
  Black: "#3a3a44", Yellow: "#d9b23d",
};
const RARITIES: Rarity[] = ["C", "UC", "R", "SR", "SEC", "L"];
const SELLERS = ["PortTown Cards", "GrandLine Games", "Sunny Side TCG", "Reverie Collectibles", "Dockside Singles", "NewWorld Hobbies"];
const CONDITIONS = ["Near Mint", "Lightly Played", "Moderately Played", "Near Mint Foil"];

/** Original abstract "card art": deterministic geometric composition per id. */
function CardArt({ card, big = false }: { card: OptcgCard; big?: boolean }) {
  const h = cardHash(card.id);
  const hex = COLOR_HEX[card.color];
  const shapes = useMemo(() => {
    let x = h;
    const rnd = () => {
      x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
      return x / 4294967296;
    };
    return Array.from({ length: 5 }, () => ({
      cx: 10 + rnd() * 60, cy: 12 + rnd() * 76, r: 6 + rnd() * 16,
      kind: Math.floor(rnd() * 3), rot: rnd() * 90, op: 0.45 + rnd() * 0.5,
    }));
  }, [h]);
  return (
    <svg viewBox="0 0 80 110" className={big ? "w-full max-w-[220px]" : "w-full"} aria-hidden="true">
      <rect x="1.5" y="1.5" width="77" height="107" rx="7" fill={hex} stroke="#2B2118" strokeWidth="3" />
      <rect x="6" y="6" width="68" height="72" rx="4" fill="#FDF6E3" stroke="#2B2118" strokeWidth="2" />
      <g clipPath="url(#none)">
        {shapes.map((s, i) =>
          s.kind === 0 ? (
            <circle key={i} cx={s.cx} cy={Math.min(s.cy, 70)} r={s.r} fill={hex} opacity={s.op} stroke="#2B2118" strokeWidth="1.5" />
          ) : s.kind === 1 ? (
            <rect key={i} x={s.cx - s.r} y={Math.min(s.cy, 65) - s.r / 2} width={s.r * 2} height={s.r} fill={hex} opacity={s.op}
              stroke="#2B2118" strokeWidth="1.5" transform={`rotate(${s.rot} ${s.cx} ${s.cy})`} />
          ) : (
            <polygon key={i} points={`${s.cx},${Math.min(s.cy, 68) - s.r} ${s.cx - s.r},${Math.min(s.cy, 68) + s.r} ${s.cx + s.r},${Math.min(s.cy, 68) + s.r}`}
              fill={hex} opacity={s.op} stroke="#2B2118" strokeWidth="1.5" />
          )
        )}
      </g>
      <text x="40" y="90" textAnchor="middle" fontSize="6.5" fontFamily="sans-serif" fontWeight="bold" fill="#FDF6E3">
        {card.name.length > 20 ? card.name.slice(0, 19) + "…" : card.name}
      </text>
      <text x="40" y="100" textAnchor="middle" fontSize="5.5" fontFamily="monospace" fill="#FDF6E3">
        {card.id} · {card.rarity}
      </text>
      {card.power > 0 && (
        <text x="10" y="14" fontSize="8" fontWeight="bold" fill="#2B2118">{card.power / 1000}k</text>
      )}
      <circle cx="70" cy="12" r="6" fill="#FDF6E3" stroke="#2B2118" strokeWidth="1.5" />
      <text x="70" y="15" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#2B2118">{card.cost}</text>
    </svg>
  );
}

interface Market {
  market: number; low: number; mid: number; high: number;
  lastSold: string; history: number[];
  listings: Array<{ seller: string; condition: string; price: number; qty: number }>;
}

function buildMarket(card: OptcgCard): Market {
  const history = priceHistory(card);
  const market = history[history.length - 1];
  let x = cardHash(card.id) ^ 0x9e3779b9;
  const rnd = () => {
    x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0;
    return x / 4294967296;
  };
  const n = 4 + Math.floor(rnd() * 3);
  const listings = Array.from({ length: n }, (_, i) => ({
    seller: SELLERS[(cardHash(card.id) + i * 7) % SELLERS.length],
    condition: CONDITIONS[Math.floor(rnd() * CONDITIONS.length)],
    price: Number((market * (0.82 + rnd() * 0.5)).toFixed(2)),
    qty: 1 + Math.floor(rnd() * 4),
  })).sort((a, b) => a.price - b.price);
  const daysAgo = 1 + Math.floor(rnd() * 6);
  return {
    market,
    low: Math.min(...listings.map((l) => l.price)),
    mid: Number((market * 0.98).toFixed(2)),
    high: Math.max(...listings.map((l) => l.price)),
    lastSold: `${daysAgo} day${daysAgo > 1 ? "s" : ""} ago`,
    history,
    listings,
  };
}

function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 120},${34 - ((v - min) / (max - min || 1)) * 30}`)
    .join(" ");
  const up = data[data.length - 1] >= data[0];
  return (
    <svg viewBox="0 0 120 36" className="w-full h-9" role="img"
      aria-label={`30-day price trend, ${up ? "up" : "down"} from $${data[0]} to $${data[data.length - 1]}`}>
      <polyline points={pts} fill="none" stroke={up ? "#4f9e4f" : "#c0392b"} strokeWidth="2" />
    </svg>
  );
}

export default function CardScannerDemo() {
  const [search, setSearch] = useState("");
  const [setF, setSetF] = useState("All");
  const [colorF, setColorF] = useState<CardColor | "All">("All");
  const [rarityF, setRarityF] = useState<Rarity | "All">("All");
  const [typeF, setTypeF] = useState("All");
  const [selected, setSelected] = useState<OptcgCard | null>(null);
  const [market, setMarket] = useState<Market | null>(null);
  const [scanning, setScanning] = useState(false);
  const reduce = useReducedMotion();
  const fetchTimer = useRef(0);

  const sets = ["All", ...new Set(optcgCards.map((c) => c.set))];
  const types = ["All", ...new Set(optcgCards.map((c) => c.type))];

  const visible = optcgCards.filter(
    (c) =>
      (setF === "All" || c.set === setF) &&
      (colorF === "All" || c.color === colorF) &&
      (rarityF === "All" || c.rarity === rarityF) &&
      (typeF === "All" || c.type === typeF) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()))
  );

  // simulate the TCGPlayer fetch: skeleton shimmer for 600–1200ms, then data
  const select = (card: OptcgCard) => {
    setSelected(card);
    setMarket(null);
    window.clearTimeout(fetchTimer.current);
    fetchTimer.current = window.setTimeout(
      () => setMarket(buildMarket(card)),
      reduce ? 150 : 600 + Math.random() * 600
    );
  };
  useEffect(() => () => window.clearTimeout(fetchTimer.current), []);

  const scan = () => {
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      select(optcgCards[Math.floor(Math.random() * optcgCards.length)]);
    }, reduce ? 300 : 2100);
  };

  return (
    <div className="relative space-y-4">
      {/* WIP ribbon */}
      <div className="absolute -top-2 -right-2 z-10 rotate-6 border-[3px] border-ink bg-lang-python px-3 py-1 rounded-xl font-display text-sm shadow-stickerSm pointer-events-none">
        🚧 Work in Progress
      </div>
      <p className="text-sm text-ink/75 max-w-2xl border-l-4 border-lang-python pl-3">
        Honest status: card recognition works on clean scans; the live TCGPlayer price feed is
        pending an API key. Everything below runs against a local mock so you can feel the intended
        flow. Next up: camera capture on mobile and fuzzy matching for sleeved cards.
      </p>

      <div className="flex flex-wrap gap-2 items-center text-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or ID…"
          aria-label="Search cards" className="border-2 border-ink rounded-lg px-2 py-1 bg-white w-44" />
        {[
          ["Set", setF, sets, setSetF],
          ["Type", typeF, types, setTypeF],
        ].map(([label, val, opts, fn]) => (
          <label key={label as string} className="flex items-center gap-1 font-display">
            {label as string}
            <select value={val as string} onChange={(e) => (fn as (v: string) => void)(e.target.value)}
              className="border-2 border-ink rounded-lg px-1.5 py-1 bg-white">
              {(opts as string[]).map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        ))}
        <label className="flex items-center gap-1 font-display">
          Color
          <select value={colorF} onChange={(e) => setColorF(e.target.value as CardColor | "All")}
            className="border-2 border-ink rounded-lg px-1.5 py-1 bg-white">
            {["All", ...Object.keys(COLOR_HEX)].map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1 font-display">
          Rarity
          <select value={rarityF} onChange={(e) => setRarityF(e.target.value as Rarity | "All")}
            className="border-2 border-ink rounded-lg px-1.5 py-1 bg-white">
            {["All", ...RARITIES].map((o) => <option key={o}>{o}</option>)}
          </select>
        </label>
        <button onClick={scan} className="btn-cartoon !py-1 bg-lang-c/40 ml-auto">📷 Scan a card</button>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        {/* grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[440px] overflow-y-auto pr-1"
          role="list" aria-label={`${visible.length} cards`}>
          {visible.map((c) => (
            <button key={c.id} role="listitem" onClick={() => select(c)}
              className={`rounded-lg transition-transform hover:-rotate-1 hover:scale-[1.03] ${selected?.id === c.id ? "ring-4 ring-ink/50" : ""}`}
              aria-label={`${c.name}, ${c.id}, ${c.rarity}`}>
              <CardArt card={c} />
            </button>
          ))}
          {visible.length === 0 && <p className="col-span-full text-center text-ink/50 py-8">No cards match.</p>}
        </div>

        {/* detail panel */}
        <div className="sticker p-4 min-h-[300px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-ink/50 text-sm text-center">
              Pick a card (or hit Scan)<br />to look up its market price.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-28 shrink-0"><CardArt card={selected} big /></div>
                <div className="min-w-0">
                  <h4 className="font-display text-lg leading-tight">{selected.name}</h4>
                  <p className="text-xs text-ink/60">{selected.id} · {selected.set} · {selected.rarity} · {selected.type}</p>
                  <p className="text-xs mt-1">Cost {selected.cost}{selected.power > 0 ? ` · Power ${selected.power.toLocaleString()}` : ""}</p>
                  <span className="inline-block mt-2 text-[10px] border-2 border-ink rounded-lg px-1.5 py-0.5 bg-cream font-display">
                    ⚠️ Simulated response — live TCGPlayer integration pending API key
                  </span>
                </div>
              </div>

              {!market ? (
                <div className="space-y-2" role="status" aria-label="Fetching price data">
                  <div className="skeleton h-8 w-2/3" />
                  <div className="skeleton h-9 w-full" />
                  <div className="skeleton h-24 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-4">
                    <div>
                      <div className="text-[10px] font-display text-ink/60">MARKET PRICE</div>
                      <div className="text-3xl font-display">${market.market.toFixed(2)}</div>
                    </div>
                    <div className="text-xs text-ink/70 space-y-0.5">
                      <div>Low ${market.low.toFixed(2)} · Mid ${market.mid.toFixed(2)} · High ${market.high.toFixed(2)}</div>
                      <div>Last sold {market.lastSold}</div>
                    </div>
                  </div>
                  <Sparkline data={market.history} />
                  <table className="w-full text-xs border-collapse">
                    <caption className="sr-only">Mock seller listings</caption>
                    <thead>
                      <tr className="font-display text-ink/60 text-left border-b-2 border-ink/20">
                        <th className="py-1">Seller</th><th>Condition</th><th className="text-right">Qty</th><th className="text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {market.listings.map((l, i) => (
                        <tr key={i} className="border-b border-ink/10">
                          <td className="py-1">{l.seller}</td>
                          <td className="text-ink/70">{l.condition}</td>
                          <td className="text-right">{l.qty}</td>
                          <td className="text-right font-display">${l.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <details className="text-xs">
                    <summary className="font-display cursor-pointer">Intended request shape (real integration)</summary>
                    <pre className="mt-1 bg-ink text-paper rounded-xl p-3 overflow-x-auto text-[10px] leading-relaxed">{`GET https://api.tcgplayer.com/pricing/product/{productId}
Authorization: Bearer {access_token}

// resolve productId first:
GET /catalog/products?categoryId=68&productName=${encodeURIComponent(selected.name)}

// response (per condition):
{ "results": [{
  "productId": 452117, "subTypeName": "Normal",
  "lowPrice": ${market.low}, "midPrice": ${market.mid},
  "highPrice": ${market.high}, "marketPrice": ${market.market}
}]}`}</pre>
                  </details>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* fake scanner overlay */}
      <AnimatePresence>
        {scanning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/85 flex items-center justify-center p-6"
            role="dialog" aria-modal="true" aria-label="Scanning card">
            <div className="relative w-64 h-80 border-4 border-paper/80 rounded-2xl">
              {["-top-1 -left-1 border-t-8 border-l-8", "-top-1 -right-1 border-t-8 border-r-8",
                "-bottom-1 -left-1 border-b-8 border-l-8", "-bottom-1 -right-1 border-b-8 border-r-8"].map((c) => (
                <div key={c} className={`absolute w-8 h-8 border-lang-python rounded ${c}`} />
              ))}
              {!reduce && (
                <motion.div className="absolute inset-x-2 h-1 bg-lang-python rounded shadow-[0_0_12px_#F2B84B]"
                  animate={{ top: ["4%", "92%", "4%"] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
              )}
              <p className="absolute -bottom-10 inset-x-0 text-center text-paper font-display">Scanning…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
