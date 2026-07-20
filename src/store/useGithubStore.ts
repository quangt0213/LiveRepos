import { create } from "zustand";
import {
  fallbackRepos,
  fetchGithubData,
  type RepoInfo,
} from "../lib/github";

interface GithubState {
  repos: Record<string, RepoInfo>;
  status: "loading" | "live" | "fallback";
  load: () => Promise<void>;
}

export const useGithubStore = create<GithubState>((set, get) => ({
  // start with fallback data so nothing is ever blank
  repos: fallbackRepos(),
  status: "loading",
  load: async () => {
    if (get().status !== "loading") return;
    const { repos, live } = await fetchGithubData();
    set({ repos, status: live ? "live" : "fallback" });
  },
}));
