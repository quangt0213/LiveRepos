import { lazy, Suspense, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ErrorBoundary from "./ErrorBoundary";
import { langColor, type ProjectMeta } from "../lib/projects";
import { relativeTime } from "../lib/github";
import { useGithubStore } from "../store/useGithubStore";

// ---------------------------------------------------------------------------
// Register demos here (one line per project). Each demo is lazy-loaded so
// three.js / recharts / katex never touch the main bundle.
// ---------------------------------------------------------------------------
const DEMOS: Record<string, React.LazyExoticComponent<React.ComponentType>> = {
  "gs-helper": lazy(() => import("../demos/GsHelperDemo")),
  "power-audit": lazy(() => import("../demos/PowerAuditDemo")),
  orrery: lazy(() => import("../demos/OrreryDemo")),
  "card-scanner": lazy(() => import("../demos/CardScannerDemo")),
  "rpm-gauge": lazy(() => import("../demos/RpmGaugeDemo")),
};

function DemoSkeleton() {
  return (
    <div className="space-y-3 p-1" aria-label="Loading demo" role="status">
      <div className="skeleton h-10 w-1/2" />
      <div className="skeleton h-52 w-full" />
      <div className="flex gap-3">
        <div className="skeleton h-24 flex-1" />
        <div className="skeleton h-24 flex-1" />
      </div>
      <span className="sr-only">Loading interactive demo…</span>
    </div>
  );
}

interface Props {
  project: ProjectMeta;
  onClose: () => void;
}

export default function ExpandedPanel({ project, onClose }: Props) {
  const repo = useGithubStore((s) => s.repos[project.id]);
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const Demo = DEMOS[project.id];
  const accent = langColor(repo?.primaryLanguage ?? project.language);

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-ink/40 flex items-stretch justify-center p-2 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${project.title} project details`}
    >
      <motion.div
        layoutId={reduce ? undefined : `card-${project.id}`}
        transition={{ type: "spring", stiffness: 180, damping: 24 }}
        className="sticker bg-paper w-full max-w-5xl flex flex-col overflow-hidden"
      >
        <div
          className="flex items-center justify-between gap-3 border-b-[3px] border-ink px-4 md:px-6 py-3"
          style={{ backgroundColor: `${accent}33` }}
        >
          <div className="flex items-baseline gap-3 flex-wrap">
            <h2 className="text-2xl md:text-3xl font-semibold">{project.title}</h2>
            {project.wip && (
              <span className="text-xs font-display border-2 border-ink rounded-lg px-2 py-0.5 bg-lang-python/60 -rotate-2">
                🚧 Work in Progress
              </span>
            )}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close project panel (Esc)"
            className="btn-cartoon bg-white !px-3 shrink-0"
          >
            ✕ Close
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 md:px-6 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm font-display mb-3">
            <span className="border-2 border-ink rounded-lg px-2 py-0.5 bg-white flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-ink" style={{ backgroundColor: accent }} />
              {repo?.primaryLanguage ?? project.language}
            </span>
            <span className="border-2 border-ink rounded-lg px-2 py-0.5 bg-white">★ {repo?.stars ?? 0} stars</span>
            {repo && (
              <span className="border-2 border-ink rounded-lg px-2 py-0.5 bg-cream">{relativeTime(repo.pushedAt)}</span>
            )}
            {repo?.topics.map((t) => (
              <span key={t} className="border-2 border-ink/40 rounded-lg px-2 py-0.5 bg-white text-ink/70">
                #{t}
              </span>
            ))}
            <a
              href={repo?.url ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="btn-cartoon !py-0.5 !px-3 bg-ink !text-paper ml-auto"
            >
              View on GitHub ↗
            </a>
          </div>

          <p className="max-w-3xl text-ink/85 mb-2">{project.summary}</p>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {project.tech.map((t) => (
              <span key={t} className="text-xs font-display border-2 border-ink rounded-full px-2.5 py-0.5 bg-cream">
                {t}
              </span>
            ))}
          </div>

          <ErrorBoundary label={project.title}>
            <Suspense fallback={<DemoSkeleton />}>{Demo ? <Demo /> : null}</Suspense>
          </ErrorBoundary>
        </div>
      </motion.div>
    </motion.div>
  );
}
