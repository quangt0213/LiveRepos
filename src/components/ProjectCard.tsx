import { motion, useReducedMotion } from "framer-motion";
import { langColor, type ProjectMeta } from "../lib/projects";
import { relativeTime } from "../lib/github";
import { useGithubStore } from "../store/useGithubStore";
import { useUnlockStore } from "../store/useUnlockStore";

const Padlock = () => (
  <svg viewBox="0 0 48 56" className="w-10 h-12 drop-shadow" aria-hidden="true">
    <rect x="6" y="22" width="36" height="28" rx="8" fill="#F2B84B" stroke="#2B2118" strokeWidth="4" />
    <path d="M14 22 v-6 a10 10 0 0 1 20 0 v6" fill="none" stroke="#2B2118" strokeWidth="4" strokeLinecap="round" />
    <circle cx="24" cy="34" r="4" fill="#2B2118" />
    <rect x="22" y="36" width="4" height="7" rx="2" fill="#2B2118" />
  </svg>
);

interface Props {
  project: ProjectMeta;
  onOpen: (id: string) => void;
}

export default function ProjectCard({ project, onOpen }: Props) {
  const repo = useGithubStore((s) => s.repos[project.id]);
  const isUnlocked = useUnlockStore((s) => s.unlocked.includes(project.id));
  const reduce = useReducedMotion();
  const accent = langColor(repo?.primaryLanguage ?? project.language);

  return (
    <motion.div
      layout
      layoutId={`card-${project.id}`}
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className={!isUnlocked && !reduce ? "animate-wobble" : ""}
    >
      <motion.button
        onClick={() => onOpen(project.id)}
        whileHover={reduce ? undefined : { rotate: -1.5, y: -3 }}
        whileTap={reduce ? undefined : { x: 3, y: 3 }}
        className="w-full text-left sticker overflow-hidden focus-visible:outline-dashed"
        aria-label={
          isUnlocked
            ? `Open project ${project.title}`
            : `${project.title} is locked. Play a mini-game to unlock. ${project.teaser}`
        }
      >
        <div className="h-2.5 border-b-[3px] border-ink" style={{ backgroundColor: accent }} />
        <div className="p-5 relative">
          <div className={isUnlocked ? "" : "grayscale blur-[3px] opacity-60 select-none"} aria-hidden={!isUnlocked}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-2xl font-semibold">{project.title}</h3>
              {project.wip && (
                <span className="shrink-0 text-xs font-display border-2 border-ink rounded-lg px-1.5 py-0.5 bg-lang-python/50 -rotate-3">
                  🚧 WIP
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink/80 min-h-[2.5rem]">
              {repo?.description ?? project.blurb}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-display">
              <span className="flex items-center gap-1 border-2 border-ink rounded-lg px-2 py-0.5 bg-white">
                <span className="w-2.5 h-2.5 rounded-full border border-ink" style={{ backgroundColor: accent }} />
                {repo?.primaryLanguage ?? project.language}
              </span>
              <span className="border-2 border-ink rounded-lg px-2 py-0.5 bg-white">
                ★ {repo?.stars ?? 0}
              </span>
              {repo && (
                <span className="border-2 border-ink rounded-lg px-2 py-0.5 bg-cream">
                  {relativeTime(repo.pushedAt)}
                </span>
              )}
            </div>
          </div>

          {!isUnlocked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <Padlock />
              <p className="font-display text-sm bg-paper/90 border-2 border-ink rounded-xl px-3 py-1 shadow-stickerPress">
                {project.teaser}
              </p>
            </div>
          )}
        </div>
      </motion.button>
    </motion.div>
  );
}
