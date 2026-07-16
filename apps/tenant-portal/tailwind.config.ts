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
        background: "#f8fafc", // Lighter, cleaner background
        surface: "#ffffff",
        surfaceMuted: "#f1f5f9",
        border: "#e2e8f0",
        ink: "#0f172a",
        inkSoft: "#475569",
        primary: {
          DEFAULT: "#0f766e",
          50: "#f0fdfa",
          100: "#ccfbf1",
          500: "#0f766e",
          600: "#0d9488",
          700: "#0f766e",
        },
        accent: "#2563eb",
        moss: "#16a34a",
        ember: "#dc2626",
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.08)',
        'glass-sm': '0 4px 16px 0 rgba(15, 23, 42, 0.04)',
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(circle at 20% 10%, rgba(15, 118, 110, 0.08), transparent 50%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4))',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
};
export default config;
