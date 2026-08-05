import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
          light: "#EFF6FF",
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
        },
        secondary: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          light: "#334155",
        },
        accent: {
          DEFAULT: "#38BDF8",
          hover: "#0EA5E9",
          light: "#E0F2FE",
        },
        background: "#F8FAFC",
        card: "rgba(255, 255, 255, 0.75)",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "Poppins", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
        premium: "0 20px 40px -15px rgba(37, 99, 235, 0.12), 0 0 15px 0 rgba(15, 23, 42, 0.05)",
        card: "0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 4px 12px -2px rgba(0, 0, 0, 0.02)",
        glow: "0 0 25px -5px rgba(56, 189, 248, 0.4)",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
export default config;
