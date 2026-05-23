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
        'grass-green': {
          DEFAULT: '#22C55E',
          dark: '#16A34A',
        },
        'sky-blue': '#3B82F6',
        'energy-orange': '#F97316',
        'match-red': '#F87171',
        'background-gray': '#F9FAFB',
      },
    },
  },
  plugins: [],
};
export default config;
