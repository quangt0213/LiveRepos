import { useEffect, useRef } from "react";

const COLORS = ["#F2B84B", "#E86A92", "#5B8DEF", "#8FBF6B", "#E07A3F", "#B07CE8"];

interface Props {
  /** particle count; 0 disables (reduced motion) */
  count?: number;
  fullPage?: boolean;
}

/** Original canvas confetti burst. Cleans itself up after ~2.2s. */
export default function Confetti({ count = 120, fullPage = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = ref.current;
    if (!canvas || reduce || count === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = (canvas.width = canvas.offsetWidth * dpr);
    const h = (canvas.height = canvas.offsetHeight * dpr);

    interface P {
      x: number; y: number; vx: number; vy: number;
      rot: number; vr: number; size: number; color: string; shape: number;
    }
    const parts: P[] = Array.from({ length: count }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * (fullPage ? 0.9 : 0.3),
      y: fullPage ? -20 : h * 0.4,
      vx: (Math.random() - 0.5) * 14 * dpr,
      vy: (fullPage ? Math.random() * 4 : -(6 + Math.random() * 9)) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      size: (5 + Math.random() * 6) * dpr,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.floor(Math.random() * 2),
    }));

    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const elapsed = t - t0;
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.35 * dpr;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = "#2B2118";
        ctx.lineWidth = 1.2 * dpr;
        if (p.shape === 0) {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          ctx.strokeRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
      if (elapsed < 2200) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count, fullPage]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={
        fullPage
          ? "fixed inset-0 w-full h-full pointer-events-none z-[70]"
          : "absolute inset-0 w-full h-full pointer-events-none"
      }
    />
  );
}
