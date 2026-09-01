import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pln: {
          blue: "#0076A8",
          "blue-dark": "#005a82",
          "blue-light": "#0099db",
          yellow: "#FFD100",
          "yellow-dark": "#e6bc00",
          red: "#E42313",
        },
      },
    },
  },
  plugins: [],
};
export default config;
