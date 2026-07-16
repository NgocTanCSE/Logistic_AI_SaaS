import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Mode Base
        background: "#0a0a0a",
        surface: "rgba(255, 255, 255, 0.03)",
        surfaceMuted: "rgba(255, 255, 255, 0.01)",
        border: "rgba(255, 255, 255, 0.08)",
        
        // Text Colors
        ink: "#f8fafc", // White/Slate
        inkSoft: "#94a3b8", // Muted slate
        
        // Brand/Accent Colors (Neon/Vibrant)
        primary: "#3b82f6", // Neon Blue
        primaryHover: "#2563eb",
        accent: "#10b981", // Emerald
        moss: "#10b981", // Emerald Green (Success)
        ember: "#ef4444", // Red (Danger)
        cobalt: "#0ea5e9", // Sky Blue
        
        // Glassmorphism specific
        glass: "rgba(10, 10, 10, 0.7)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15), transparent 60%)',
        'mesh-pattern': 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20zM20 0h20v20H20V0z\' fill=\'%23ffffff\' fill-opacity=\'0.02\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
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
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' },
          '50%': { opacity: '.7', filter: 'drop-shadow(0 0 15px rgba(59, 130, 246, 0.8))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
