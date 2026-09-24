/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './global.css'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0B0D10',
        surface: '#12161B',
        elevated: '#191F26',
        lime: '#C7F36B',
        mint: '#8BE0B1',
        coral: '#FF8B72',
        muted: '#8A949E',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
