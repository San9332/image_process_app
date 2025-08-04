/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',          // if you use Tailwind classes in your root html
    './src/**/*.{js,jsx,ts,tsx}',  // all JS/TS/JSX/TSX files in src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
