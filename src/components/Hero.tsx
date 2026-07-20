import { motion, useReducedMotion } from "framer-motion";
import { useGithubStore } from "../store/useGithubStore";

const Bolt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 40 56" className={className} aria-hidden="true">
    <path
      d="M24 2 L6 30 h11 l-4 24 L34 22 H21 z"
      fill="#F2B84B"
      stroke="#2B2118"
      strokeWidth="3.5"
      strokeLinejoin="round"
    />
  </svg>
);

const Gear = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 60 60" className={className} aria-hidden="true">
    <g stroke="#2B2118" strokeWidth="3" fill="#8FBF6B">
      {Array.from({ length: 8 }).map((_, i) => (
        <rect
          key={i}
          x="27"
          y="2"
          width="6"
          height="12"
          rx="2"
          transform={`rotate(${i * 45} 30 30)`}
        />
      ))}
      <circle cx="30" cy="30" r="17" />
      <circle cx="30" cy="30" r="6" fill="#FDF6E3" />
    </g>
  </svg>
);

export default function Hero() {
  const status = useGithubStore((s) => s.status);
  const reduce = useReducedMotion();

  return (
    <header className="w-full max-w-6xl mx-auto px-4 pt-10 pb-6 relative">
      <motion.div
        initial={reduce ? false : { y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 14 }}
        className="sticker bg-cream p-6 md:p-8 relative overflow-visible"
      >
        <Bolt className="absolute -top-6 -left-3 w-10 h-14 rotate-[-12deg]" />
        <Gear className="absolute -bottom-5 -right-4 w-14 h-14 rotate-12" />
        <p className="font-display text-lg text-ink/70">Hi, I&apos;m</p>
        <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
          Quang T.
        </h1>
        <p className="mt-2 text-lg md:text-xl">
          Electrical Engineering @{" "}
          <span className="font-display font-semibold">
            San José State University
          </span>
        </p>
        <p className="mt-3 max-w-xl text-ink/80">
          Every project below is locked behind a tiny game tied to what the
          project actually does. Play it — or hit{" "}
          <span className="font-semibold">Skip &amp; Unlock</span>, no judgment.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <a href="mailto:quangt0213@gmail.com" className="btn-cartoon bg-lang-python/40">
            ✉️ quangt0213@gmail.com
          </a>
          <a href="tel:+14082218460" className="btn-cartoon bg-lang-c/30">
            📞 (408) 221-8460
          </a>
          <span
            className="btn-cartoon bg-white/60 cursor-default"
            title="Repo data source"
          >
            {status === "live"
              ? "● live GitHub data"
              : status === "fallback"
                ? "○ cached project data"
                : "… fetching GitHub"}
          </span>
        </div>
      </motion.div>
    </header>
  );
}
