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
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(160deg, var(--color-gold-gradient-a), var(--color-gold-gradient-b) 55%, var(--color-gold-gradient-c))",
        "navy-gradient":
          "radial-gradient(120% 120% at 50% 0%, var(--color-navy-gradient-a) 0%, var(--color-navy-gradient-b) 42%, var(--color-navy-gradient-c) 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
