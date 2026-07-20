import { motion, useReducedMotion } from "framer-motion";

/** Hidden until all five projects are unlocked. */
export default function AboutPanel() {
  const reduce = useReducedMotion();
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 16 }}
      aria-label="About me (secret panel)"
      className="mt-10"
    >
      <div className="sticker bg-cream p-6 md:p-8 relative">
        <span className="absolute -top-3 left-6 text-xs font-display bg-lang-cpp text-white border-2 border-ink rounded-lg px-2 py-0.5 -rotate-2">
          ★ secret unlocked
        </span>
        <h2 className="text-3xl mb-3">About Me</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3 text-ink/85">
            <p>
              I&apos;m Quang, an electrical engineering student at San José
              State who likes projects where software has to answer to physics
              — timers counting real gear teeth, power flows that have to add
              up, orbits that have to obey Kepler.
            </p>
            <p>
              This site is that idea applied to a portfolio: every demo runs
              the actual math the project is about, and every number on screen
              is derived, not faked.
            </p>
            <p>
              Off the clock: trading card games, rhythm games, and slowly
              accepting that my gacha teams need a healer.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl">Currently into</h3>
            <ul className="space-y-1.5">
              {[
                ["⚡", "Embedded C on STM32 — input capture, PWM, CAN"],
                ["🔌", "Power systems & home energy modeling"],
                ["🧮", "Signal processing coursework (and MATLAB survival)"],
                ["🃏", "Computer vision for card recognition"],
              ].map(([icon, text]) => (
                <li key={text} className="flex gap-2 items-start">
                  <span aria-hidden>{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <a href="mailto:quangt0213@gmail.com" className="btn-cartoon inline-block mt-3 bg-lang-python/40">
              Say hi → quangt0213@gmail.com
            </a>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
