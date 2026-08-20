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
          DEFAULT: "#0A1A33",
          2: "#0E2547",
          3: "#12326B",
        },
        gold: {
          1: "#F3CE63",
          2: "#D3A238",
        },
        muted2: "#9FB2CC",
        line: "#223960",
      },
      fontFamily: {
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(160deg, #F7D97A, #EBBF52 55%, #C9962F)",
        "navy-gradient":
          "radial-gradient(120% 120% at 50% 0%, #12326B 0%, #0E2547 42%, #0A1A33 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
