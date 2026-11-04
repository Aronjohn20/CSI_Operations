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
        csi: {
          bg: "#0B0B1A",          // Main dark background
          surface: "#12122A",     // Card/panel background
          surfaceLight: "#1A1A3E", // Hover / elevated surface
          border: "#2A2A4A",      // Subtle borders
          sidebar: "#0E0E22",     // Sidebar background
          purple: "#7C3AED",      // Primary purple accent
          purpleLight: "#A78BFA", // Light purple text
          green: "#22C55E",       // Active / Completed
          cyan: "#06B6D4",        // Confirmed / Info
          amber: "#F59E0B",       // Planned / Warning
          pink: "#EC4899",        // Accent / Creative
          text: "#E2E8F0",        // Primary text
          textMuted: "#94A3B8",   // Secondary text
          textDim: "#64748B",     // Dimmed text
        },
      },
    },
  },
  plugins: [],
};
export default config;
