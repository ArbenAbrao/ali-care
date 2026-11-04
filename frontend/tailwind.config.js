/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The app uses "teal-*" classes everywhere; this remaps them to the Arrowgo brand blue.
        teal: {
          50: '#eef3ff', 100: '#dde7ff', 200: '#c0d2ff', 300: '#94b2ff', 400: '#5f87f2',
          500: '#2f5fd9', 600: '#2250c8', 700: '#1b3fa6', 800: '#183590', 900: '#14286e', 950: '#0a1640',
        },
      },
    },
  },
  plugins: [],
};