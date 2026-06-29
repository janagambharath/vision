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
        ink: "#07101d",
        clinic: "#1550b8",
        retail: "#0f766e",
        gold: "#b8944d",
        paper: "#f6f9fd"
      },
      boxShadow: {
        soft: "0 18px 46px rgba(20, 32, 51, 0.12)",
        strong: "0 32px 90px rgba(5, 9, 19, 0.28)"
      },
      borderRadius: {
        vv: "8px"
      }
    }
  },
  plugins: []
};

export default config;
