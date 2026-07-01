import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#040b16",
        clinic: "#1550b8",
        retail: "#0f766e",
        gold: "#b8944d",
        paper: "#f6f9fc"
      },
      boxShadow: {
        soft: "0 10px 40px -10px rgba(0,0,0,0.08)",
        strong: "0 20px 40px -10px rgba(0,0,0,0.15)",
        premium: "0 20px 40px -10px rgba(15, 118, 110, 0.15)"
      },
      borderRadius: {
        vv: "16px"
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #1550b855 0deg, #0f766e55 180deg, #1550b855 360deg)',
      }
    }
  },
  plugins: []
};

export default config;
