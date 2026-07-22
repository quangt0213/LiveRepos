import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SortMode } from "./LanguageFilter";
import ProjectCard from "./ProjectCard";
import { projects } from "../lib/projects";
import { useGithubStore } from "../store/useGithubStore";

interface Props {
  langFilter: string;
  sortMode: SortMode;
  onOpen: (id: string) => void;
}

export default function ProjectGrid({ langFilter, sortMode, onOpen }: Props) {
  const repos = useGithubStore((s) => s.repos);

  const visible = useMemo(() => {
    let list = projects.filter((p) => {
      if (langFilter === "All") return true;
      const r = repos[p.id];
      if (!r) return p.language === langFilter;
      return (
        r.primaryLanguage === langFilter ||
        Object.keys(r.languages).includes(langFilter)
      );
    });
    list = [...list].sort((a, b) => {
      switch (sortMode) {
        case "language":
          return (repos[a.id]?.primaryLanguage ?? a.language).localeCompare(
            repos[b.id]?.primaryLanguage ?? b.language
          );
        case "complexity":
          return b.complexity - a.complexity;
        case "updated":
        default:
          return (
            new Date(repos[b.id]?.pushedAt ?? 0).getTime() -
            new Date(repos[a.id]?.pushedAt ?? 0).getTime()
          );
      }
    });
    return list;
  }, [langFilter, sortMode, repos]);

  return (
    <section id="projects" aria-label="Projects" className="mt-6">
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} onOpen={onOpen} />
          ))}
        </AnimatePresence>
      </motion.div>
      {visible.length === 0 && (
        <p className="text-center text-ink/60 py-10 font-display">
          No projects in that language (yet!)
        </p>
      )}
    </section>
  );
}
