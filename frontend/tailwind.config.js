/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#122440",
        "navy-soft": "#1b3558",
        canvas: "#f4f7fb",
        "sky-brand": "#4c8df6",
      },
    },
  },
  plugins: [],
};
