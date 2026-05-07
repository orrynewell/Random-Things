/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ok: "#16a34a",
        warn: "#d97706",
        crit: "#dc2626",
      },
    },
  },
  plugins: [],
};
