/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primaryGreen: "#78CC33",
        secondaryGreen: "#93D65C",
        ink: "#111111",
        bgLight: "#f9fdf5",
      },
    },
  },
  plugins: [],
};
