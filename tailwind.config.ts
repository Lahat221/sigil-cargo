import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          DEFAULT: "var(--color-navy)",
          2: "var(--color-navy-2)",
          3: "var(--color-navy-3)",
        },
        gold: {
          1: "var(--color-gold-1)",
          2: "var(--color-gold-2)",
        },
        muted2: "var(--color-muted2)",
        line: "var(--color-line)",
        // Couleur de texte "principal" sur le fond de page (--color-ink) :
        // blanc pour SIGIL CARGO (fond bleu nuit), foncé pour les tenants au
        // fond de page clair (ex. M.N Logistics Cargo). Remplace text-white
        // dans les pages du tableau de bord pour rester lisible quel que
        // soit le thème du tenant.
        ink: {
          DEFAULT: "var(--color-ink)",
          muted: "var(--color-ink-muted)",
          // Halo/bordure translucide sur le fond de page (remplace les
          // border-white/20, bg-white/10 qui supposaient un fond sombre).
          overlay: "var(--color-ink-overlay)",
        },
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(160deg, var(--color-gold-gradient-a), var(--color-gold-gradient-b) 55%, var(--color-gold-gradient-c))",
        "navy-gradient":
          "radial-gradient(120% 120% at 50% 0%, var(--color-navy-gradient-a) 0%, var(--color-navy-gradient-b) 42%, var(--color-navy-gradient-c) 100%)",
        // Fond de la zone de contenu du tableau de bord (distinct du fond de
        // la sidebar, qui reste navy-gradient pour tous les tenants).
        "page-gradient":
          "radial-gradient(120% 120% at 50% 0%, var(--color-page-gradient-a) 0%, var(--color-page-gradient-b) 42%, var(--color-page-gradient-c) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
