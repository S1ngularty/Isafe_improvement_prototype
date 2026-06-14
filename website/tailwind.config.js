/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shield: {
<<<<<<< Updated upstream
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#1d4ed8",
          600: "#1e40af",
          700: "#1e3a8a",
          800: "#172554",
          900: "#0f172a",
        },
        alert: {
          500: "#ef4444",
          600: "#dc2626",
=======
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#f87171",
          400: "#e04444",
          500: "#b91c1c",
          600: "#991b1b",
          700: "#7f1d1d",
          800: "#5c1010",
          900: "#3b0808",
        },
        alert: {
          500: "#dc2626",
          600: "#b91c1c",
>>>>>>> Stashed changes
        },
      },
    },
  },
  plugins: [],
};
