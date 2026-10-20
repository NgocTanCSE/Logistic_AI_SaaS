import type { Config } from "tailwindcss";

// Shared design tokens for every SmartLogi portal (colors / fonts / shadows).
const uiPreset = require("../../../packages/ui-tokens/tailwind-preset.cjs");

const config: Config = {
  presets: [uiPreset],
  content: ["./src/**/*.{js,ts,jsx,tsx}", "../../../packages/ui-kit/**/*.{ts,tsx}"],
  plugins: [],
};

export default config;
