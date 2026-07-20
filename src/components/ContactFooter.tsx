import { GITHUB_USER } from "../lib/projects";
import { useUnlockStore } from "../store/useUnlockStore";

export default function ContactFooter() {
  const reset = useUnlockStore((s) => s.reset);

  return (
    <footer className="border-t-[3px] border-ink bg-cream mt-8">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center gap-3 md:gap-6 justify-between text-sm">
        <div className="font-display text-base">Quang T. — EE @ SJSU</div>
        <nav
          aria-label="Contact"
          className="flex flex-wrap items-center gap-x-5 gap-y-2 justify-center"
        >
          <a className="underline underline-offset-4 hover:no-underline" href="mailto:quangt0213@gmail.com">
            quangt0213@gmail.com
          </a>
          <a className="underline underline-offset-4 hover:no-underline" href="tel:+14082218460">
            (408) 221-8460
          </a>
          <a
            className="underline underline-offset-4 hover:no-underline"
            href={`https://github.com/${GITHUB_USER}`}
            target="_blank"
            rel="noreferrer"
          >
            github.com/{GITHUB_USER}
          </a>
        </nav>
        <button
          className="text-ink/60 underline underline-offset-4 hover:text-ink"
          onClick={() => {
            if (window.confirm("Reset unlock progress? All cards lock again.")) reset();
          }}
        >
          Reset progress
        </button>
      </div>
    </footer>
  );
}
