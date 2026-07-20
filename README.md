# Quang T. — Interactive Cartoon Portfolio

A single-page portfolio where every GitHub project is **unlocked through a themed mini-game**, then opens into a full interactive demo. Cartoon visual identity: paper background, thick ink outlines, hard offset shadows.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build locally
```

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript (Vite) |
| Styling | Tailwind CSS (design tokens in `tailwind.config.js`) |
| Animation | Framer Motion (layout transitions, unlock reveals) |
| State | Zustand, persisted to `localStorage` |
| 2D | Canvas 2D (power-grid city, confetti, battle effects) |
| 3D | Three.js via `@react-three/fiber` + `@react-three/drei` (orrery only) |
| Charts | Recharts (power dashboard) |
| Math | KaTeX (RPM formulas) |
| Routing | React Router **hash routing** (GitHub Pages safe deep links) |
| Data | GitHub REST v3, unauthenticated, 1-hour `localStorage` cache |

No backend, no API keys. If the GitHub API rate-limits (60 req/hr) or fails, the site silently falls back to hardcoded metadata in `src/lib/projects.ts` — never a broken state.

## Architecture

```
src/
  main.tsx / App.tsx          entry + hash routes (/ and /project/:id)
  store/
    useUnlockStore.ts         unlocked ids + celebration flag (persisted)
    useGithubStore.ts         repo cache facade (1h TTL in localStorage)
  lib/
    github.ts                 fetch + normalize + relative-time + fallback
    projects.ts               ★ the project manifest (see below)
  components/
    Hero, LanguageFilter, ProjectGrid, ProjectCard, ProgressBar,
    UnlockModal (hosts mini-games), ExpandedPanel (hosts demos),
    ContactFooter, Celebration, AboutPanel, ErrorBoundary, Confetti
    minigames/                RhythmGame, WireMaze, PlanetDrag, MemoryFlip, NeedleHold
  demos/                      one lazy-loaded demo per project
  data/                       characters.ts, bosses.ts, optcgCards.ts (fully populated)
```

Every demo is loaded with `React.lazy` + `Suspense`; `vite.config.ts` also pins three.js, recharts and katex into their own chunks, so the initial bundle stays small (~150 KB gzip) and heavy libraries download only when their panel opens.

## Adding a sixth project

1. Append one object to the `projects` array in `src/lib/projects.ts` (id, repo, teaser, `gameType` — pick any of the five existing mini-games — plus fallback metadata).
2. Create `src/demos/YourDemo.tsx`.
3. Register it with one line in the `DEMOS` map in `src/components/ExpandedPanel.tsx`.

Grid, filters, unlock flow, progress bar, and celebration all pick it up automatically.

## Changing the GitHub account

`GITHUB_USER` lives at the top of `src/lib/projects.ts`. Repo names per project are in the same file.

## Deploying

**GitHub Pages** (workflow included): push to `main`; `.github/workflows/deploy.yml` builds and publishes `dist/` to Pages. Set the repo's *Settings → Pages → Source* to **GitHub Actions**. If the repo is not named `portfolio`, update `BASE` in `vite.config.ts` to `"/<repo-name>/"`.

**Vercel / Netlify**: set `BASE` to `"/"`, then the default `npm run build` + `dist/` output works as-is.

## Accessibility

Full keyboard navigation (cartoon-styled focus rings), ARIA labels + text state summaries on every canvas region, `prefers-reduced-motion` swaps animations for instant state changes, every mini-game has a **Skip & Unlock** button, and each demo sits in its own error boundary so one crash can't take down the site.
