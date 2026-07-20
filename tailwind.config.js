/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FDF6E3",
        ink: "#2B2118",
        cream: "#FBF0D4",
        lang: {
          c: "#5B8DEF",
          cpp: "#E86A92",
          python: "#F2B84B",
          js: "#E8C547",
          ts: "#4FA3D1",
          matlab: "#E07A3F",
          other: "#8FBF6B",
        },
        pyro: "#EF7938", hydro: "#4CC2F1", electro: "#B07CE8", cryo: "#7FC7DB",
        anemo: "#74C2A8", geo: "#D9A93A", dendro: "#8FBF3B",
      },
      fontFamily: {
        display: ['"Fredoka"', "system-ui", "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        sticker: "6px 6px 0 #2B2118",
        stickerSm: "3px 3px 0 #2B2118",
        stickerPress: "2px 2px 0 #2B2118",
      },
      borderRadius: { card: "16px" },
      keyframes: {
        wobble: {
          "0%,100%": { transform: "rotate(-0.6deg)" },
          "50%": { transform: "rotate(0.8deg)" },
        },
        shake: {
          "0%,100%": { transform: "translate(0,0)" },
          "20%": { transform: "translate(-3px,2px)" },
          "40%": { transform: "translate(3px,-2px)" },
          "60%": { transform: "translate(-2px,-2px)" },
          "80%": { transform: "translate(2px,2px)" },
        },
        flicker: {
          "0%,100%": { opacity: "1" },
          "45%": { opacity: "0.35" },
          "55%": { opacity: "0.9" },
          "70%": { opacity: "0.5" },
        },
      },
      animation: {
        wobble: "wobble 3.2s ease-in-out infinite",
        shake: "shake 0.4s linear infinite",
        flicker: "flicker 0.7s linear infinite",
      },
    },
  },
  plugins: [],
};
