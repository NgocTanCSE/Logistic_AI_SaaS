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
        background: "#0a0a0a",
        surface: "#1a1a1a",
        primary: "#f97316", // Orange for Industrial Look
        primaryHover: "#ea580c",
        accent: "#eab308", // Yellow
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
        digital: ['"Digital-7"', 'sans-serif']
      }
    },
  },
  plugins: [],
};
export default config;
