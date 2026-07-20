import { GITHUB_USER, projects, type ProjectMeta } from "./projects";

export interface RepoInfo {
  id: string; // project id from the manifest
  description: string;
  stars: number;
  pushedAt: string;
  primaryLanguage: string;
  topics: string[];
  languages: Record<string, number>;
  url: string;
  live: boolean; // false when built from fallback metadata
}

const CACHE_KEY = "qt-portfolio.gh-cache.v1";
const TTL_MS = 60 * 60 * 1000; // 1 hour — unauthenticated limit is 60 req/hr

interface CachePayload {
  ts: number;
  repos: Record<string, RepoInfo>;
}

function fromFallback(p: ProjectMeta): RepoInfo {
  return {
    id: p.id,
    description: p.fallback.description,
    stars: p.fallback.stars,
    pushedAt: p.fallback.pushedAt,
    primaryLanguage: p.language,
    topics: p.fallback.topics,
    languages: p.fallback.languages,
    url: `https://github.com/${GITHUB_USER}/${p.repo}`,
    live: false,
  };
}

export function fallbackRepos(): Record<string, RepoInfo> {
  return Object.fromEntries(projects.map((p) => [p.id, fromFallback(p)]));
}

function readCache(): Record<string, RepoInfo> | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return parsed.repos;
  } catch {
    return null;
  }
}

function writeCache(repos: Record<string, RepoInfo>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), repos }));
  } catch {
    /* storage full or blocked — fine, we just refetch next time */
  }
}

/**
 * Fetch repo metadata + per-repo language byte breakdown.
 * Cached in localStorage for 1h. Any failure (403 rate limit, network, repo
 * missing) silently falls back to the hardcoded manifest metadata — the site
 * must never show a broken state.
 */
export async function fetchGithubData(): Promise<{
  repos: Record<string, RepoInfo>;
  live: boolean;
}> {
  const cached = readCache();
  if (cached) return { repos: cached, live: true };

  const result = fallbackRepos();
  try {
    const res = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) throw new Error(`repos ${res.status}`);
    const list = (await res.json()) as Array<{
      name: string;
      description: string | null;
      stargazers_count: number;
      pushed_at: string;
      language: string | null;
      topics?: string[];
      html_url: string;
      languages_url: string;
    }>;

    let anyLive = false;
    await Promise.all(
      projects.map(async (p) => {
        const repo = list.find(
          (r) => r.name.toLowerCase() === p.repo.toLowerCase()
        );
        if (!repo) return;
        let languages = p.fallback.languages;
        try {
          const lr = await fetch(repo.languages_url);
          if (lr.ok) languages = (await lr.json()) as Record<string, number>;
        } catch {
          /* keep fallback languages */
        }
        result[p.id] = {
          id: p.id,
          description: repo.description ?? p.fallback.description,
          stars: repo.stargazers_count,
          pushedAt: repo.pushed_at,
          primaryLanguage: repo.language ?? p.language,
          topics: repo.topics?.length ? repo.topics : p.fallback.topics,
          languages,
          url: repo.html_url,
          live: true,
        };
        anyLive = true;
      })
    );

    if (anyLive) writeCache(result);
    return { repos: result, live: anyLive };
  } catch {
    return { repos: result, live: false };
  }
}

/** "updated 3 weeks ago" style chip text */
export function relativeTime(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  const units: Array<[number, string]> = [
    [60, "minute"],
    [60, "hour"],
    [24, "day"],
    [7, "week"],
    [4.35, "month"],
    [12, "year"],
  ];
  let value = s / 60;
  let name = "minute";
  for (let i = 1; i < units.length; i++) {
    if (value < units[i][0]) break;
    value /= units[i][0];
    name = units[i][1];
  }
  const n = Math.floor(value);
  return `updated ${n} ${name}${n === 1 ? "" : "s"} ago`;
}
