// ---------------------------------------------------------------------------
// Static project manifest.
// To add a sixth project: append one object here, create one demo component in
// src/demos/, and register it in the DEMOS map in src/components/ExpandedPanel.tsx.
// Everything else (grid, filters, unlock flow, progress) picks it up automatically.
// ---------------------------------------------------------------------------

export const GITHUB_USER = "quangt0213";

export type GameType = "rhythm" | "wire" | "orbit" | "memory" | "needle";

export interface FallbackMeta {
  description: string;
  stars: number;
  pushedAt: string; // ISO date used when the GitHub API is unreachable
  topics: string[];
  languages: Record<string, number>; // byte counts, mirrors /languages
}

export interface ProjectMeta {
  id: string;
  title: string;
  repo: string; // repo name under GITHUB_USER
  language: string; // primary language (sorting signal)
  blurb: string;
  teaser: string; // one-liner shown on the locked card
  gameType: GameType;
  complexity: number; // 1-5, used by the "Complexity" sort
  tech: string[];
  summary: string; // README-derived summary shown in the expanded panel
  wip?: boolean;
  fallback: FallbackMeta;
}

export const projects: ProjectMeta[] = [
  {
    id: "gs-helper",
    title: "GS Helper",
    repo: "gs-helper",
    language: "Python",
    blurb: "Team-building helper for a certain elemental gacha game.",
    teaser: "Land 3 beats to open the party planner…",
    gameType: "rhythm",
    complexity: 4,
    tech: ["Python", "Pandas", "Elemental math", "CLI"],
    summary:
      "A party-composition assistant: give it a roster and it scores team synergy from an element reaction matrix, role coverage, and boss resistances. The demo below is a full battle sandbox built on the same scoring model.",
    fallback: {
      description: "Team synergy calculator and party optimizer",
      stars: 3,
      pushedAt: "2026-05-02T00:00:00Z",
      topics: ["python", "games", "optimization"],
      languages: { Python: 42130 },
    },
  },
  {
    id: "power-audit",
    title: "Power Audit",
    repo: "power-audit",
    language: "C++",
    blurb: "Household power-consumption auditing toolkit.",
    teaser: "Close the circuit to light the city…",
    gameType: "wire",
    complexity: 3,
    tech: ["C++", "Energy modeling", "I²R losses", "Data viz"],
    summary:
      "Audits household consumption against appliance load profiles and time-of-use rates. The demo is a live cartoon city grid — every kW, dollar, and gram of CO₂ on the dashboard is derived from the actual house states.",
    fallback: {
      description: "Household power consumption auditing tools",
      stars: 2,
      pushedAt: "2026-03-18T00:00:00Z",
      topics: ["cpp", "energy", "power-systems"],
      languages: { "C++": 30500, C: 4200 },
    },
  },
  {
    id: "orrery",
    title: "Orrery",
    repo: "orrery",
    language: "JavaScript",
    blurb: "A mechanical solar-system model, rebuilt in the browser.",
    teaser: "Place the planets on their rings to look up…",
    gameType: "orbit",
    complexity: 4,
    tech: ["Three.js", "Kepler orbits", "WebGL", "react-three-fiber"],
    summary:
      "A brass-and-wood mechanical orrery rendered in WebGL: eight planets on correct relative periods, a gear train at the base, and a date scrubber driven by simplified Keplerian elements (approximation noted in the UI).",
    fallback: {
      description: "Interactive 3D mechanical orrery",
      stars: 5,
      pushedAt: "2026-06-10T00:00:00Z",
      topics: ["threejs", "webgl", "astronomy"],
      languages: { JavaScript: 28800, HTML: 2400 },
    },
  },
  {
    id: "card-scanner",
    title: "Card Scanner",
    repo: "optcg-card-scanner",
    language: "Python",
    blurb: "One Piece TCG card scanner + price lookup. Work in progress.",
    teaser: "Match the pairs to open the binder…",
    gameType: "memory",
    complexity: 3,
    wip: true,
    tech: ["Python", "OpenCV", "TCGPlayer API (planned)", "OCR"],
    summary:
      "Scans a physical card, identifies it, and looks up market pricing. Recognition works on clean scans; the live price integration is pending an API key, so the demo simulates the exact request/response flow.",
    fallback: {
      description: "OPTCG card recognition and price lookup (WIP)",
      stars: 1,
      pushedAt: "2026-06-28T00:00:00Z",
      topics: ["python", "opencv", "tcg"],
      languages: { Python: 15600 },
    },
  },
  {
    id: "rpm-gauge",
    title: "RPM Gauge",
    repo: "rpm-gauge",
    language: "C",
    blurb: "Microcontroller tachometer with hall-effect pulse capture.",
    teaser: "Hold the needle steady to spin it up…",
    gameType: "needle",
    complexity: 3,
    tech: ["C", "STM32", "Timer input capture", "Hall-effect sensor"],
    summary:
      "An ECU-style tachometer: a hall-effect sensor counts gear teeth, a hardware timer captures pulse intervals, and RPM = 60·f/N. The demo runs the identical math chain from vehicle speed all the way down to timer ticks.",
    fallback: {
      description: "MCU-based RPM measurement over timer input capture",
      stars: 2,
      pushedAt: "2026-04-22T00:00:00Z",
      topics: ["c", "embedded", "stm32"],
      languages: { C: 18900, Makefile: 800 },
    },
  },
];

export const LANGUAGE_COLORS: Record<string, string> = {
  C: "#5B8DEF",
  "C++": "#E86A92",
  Python: "#F2B84B",
  JavaScript: "#E8C547",
  TypeScript: "#4FA3D1",
  MATLAB: "#E07A3F",
  HTML: "#E0623F",
  Makefile: "#8FBF6B",
};

export const langColor = (lang: string) => LANGUAGE_COLORS[lang] ?? "#8FBF6B";
