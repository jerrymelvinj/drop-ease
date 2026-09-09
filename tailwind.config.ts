import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["var(--font-poppins)", "sans-serif"],
      },
      colors: {
        pageBg: "#F5F6FB",
        appBlue: {
          DEFAULT: "#00529B",
          dark: "#00407A",
          light: "#0066C0",
          card: "#0057B7",
        },
        appGrey: {
          DEFAULT: "#5A606B",
          hover: "#4B515C",
          dark: "#374151",
        },
        appGreen: {
          border: "#16A34A",
          text: "#15803D",
          hover: "#DCFCE7",
        },
        appSky: {
          DEFAULT: "#38BDF8",
          dark: "#0284C7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
