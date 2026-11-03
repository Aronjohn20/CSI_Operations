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
          primary: "#1E3A8A",      // CSI Deep Blue
          accent: "#2563EB",       // Vibrant Blue
          secondary: "#38BDF8",    // Sky Accent
          canvas: "#F8FAFC",       // Slate 50
          dark: "#0F172A",         // Slate 900
        },
      },
    },
  },
  plugins: [],
};
export default config;

