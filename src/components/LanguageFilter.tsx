import { useMemo } from "react";
import { langColor } from "../lib/projects";
import { useGithubStore } from "../store/useGithubStore";

export type SortMode = "language" | "updated" | "complexity";

interface Props {
  selected: string;
  onSelect: (lang: string) => void;
  sortMode: SortMode;
  onSortMode: (m: SortMode) => void;
}

const SORTS: Array<{ id: SortMode; label: string }> = [
  { id: "language", label: "Language" },
  { id: "updated", label: "Recently Updated" },
  { id: "complexity", label: "Complexity" },
];

export default function LanguageFilter({
  selected,
  onSelect,
  sortMode,
  onSortMode,
}: Props) {
  const repos = useGithubStore((s) => s.repos);

  // Derive the pill list from actual repo language data, not a hardcoded list.
  const langs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of Object.values(repos)) {
      const seen = new Set<string>([
        r.primaryLanguage,
        ...Object.keys(r.languages),
      ]);
      for (const l of seen) counts.set(l, (counts.get(l) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [repos]);

  const total = Object.keys(repos).length;

  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-paper/95 backdrop-blur border-b-2 border-ink/10">
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filter projects by language"
      >
        <Pill
          label="All"
          count={total}
          color="#2B2118"
          active={selected === "All"}
          onClick={() => onSelect("All")}
        />
        {langs.map(([lang, count]) => (
          <Pill
            key={lang}
            label={lang}
            count={count}
            color={langColor(lang)}
            active={selected === lang}
            onClick={() => onSelect(lang)}
          />
        ))}
        <span className="mx-2 hidden md:inline text-ink/30" aria-hidden>
          |
        </span>
        <div
          className="flex items-center gap-1 text-sm"
          role="group"
          aria-label="Sort order"
        >
          <span className="font-display text-ink/60 mr-1">Sort:</span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => onSortMode(s.id)}
              aria-pressed={sortMode === s.id}
              className={`px-2.5 py-1 rounded-lg border-2 border-ink font-display transition-all ${
                sortMode === s.id
                  ? "bg-ink text-paper shadow-none translate-x-[1px] translate-y-[1px]"
                  : "bg-white shadow-stickerPress hover:-rotate-1"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pill({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[3px] border-ink font-display text-sm transition-all ${
        active
          ? "text-paper shadow-none translate-x-[1px] translate-y-[1px]"
          : "bg-white shadow-stickerPress hover:-translate-y-[1px]"
      }`}
      style={active ? { backgroundColor: color === "#2B2118" ? "#2B2118" : color } : undefined}
    >
      {!active && (
        <span
          className="inline-block w-3 h-3 rounded-full border-2 border-ink"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      {label}
      <span
        className={`text-xs rounded-full px-1.5 border-2 ${
          active ? "border-paper/60" : "border-ink/30 bg-cream"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
