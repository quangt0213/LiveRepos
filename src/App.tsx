import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Hero from "./components/Hero";
import ProgressBar from "./components/ProgressBar";
import LanguageFilter, { type SortMode } from "./components/LanguageFilter";
import ProjectGrid from "./components/ProjectGrid";
import UnlockModal from "./components/UnlockModal";
import ExpandedPanel from "./components/ExpandedPanel";
import ContactFooter from "./components/ContactFooter";
import Celebration from "./components/Celebration";
import AboutPanel from "./components/AboutPanel";
import { useGithubStore } from "./store/useGithubStore";
import { useAllUnlocked, useUnlockStore } from "./store/useUnlockStore";
import { projects } from "./lib/projects";

function Home() {
  const { id: openId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const load = useGithubStore((s) => s.load);
  const unlocked = useUnlockStore((s) => s.unlocked);
  const allUnlocked = useAllUnlocked();

  const [langFilter, setLangFilter] = useState<string>("All");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [pendingUnlock, setPendingUnlock] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link to a still-locked project → offer its mini-game instead
  useEffect(() => {
    if (openId && !unlocked.includes(openId)) {
      if (projects.some((p) => p.id === openId)) setPendingUnlock(openId);
      navigate("/", { replace: true });
    }
  }, [openId, unlocked, navigate]);

  const openProject = (pid: string) => {
    if (unlocked.includes(pid)) navigate(`/project/${pid}`);
    else setPendingUnlock(pid);
  };

  const expandedProject =
    openId && unlocked.includes(openId)
      ? projects.find((p) => p.id === openId) ?? null
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#projects"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 btn-cartoon"
      >
        Skip to projects
      </a>
      <Hero />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 pb-16">
        <ProgressBar />
        <LanguageFilter
          selected={langFilter}
          onSelect={setLangFilter}
          sortMode={sortMode}
          onSortMode={setSortMode}
        />
        <ProjectGrid
          langFilter={langFilter}
          sortMode={sortMode}
          onOpen={openProject}
        />
        {allUnlocked && <AboutPanel />}
      </main>
      <ContactFooter />

      <AnimatePresence>
        {pendingUnlock && (
          <UnlockModal
            key="unlock"
            projectId={pendingUnlock}
            onClose={() => setPendingUnlock(null)}
            onUnlocked={() => {
              const pid = pendingUnlock;
              setPendingUnlock(null);
              navigate(`/project/${pid}`);
            }}
          />
        )}
        {expandedProject && (
          <ExpandedPanel
            key={`panel-${expandedProject.id}`}
            project={expandedProject}
            onClose={() => navigate("/")}
          />
        )}
      </AnimatePresence>
      <Celebration />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/project/:id" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
