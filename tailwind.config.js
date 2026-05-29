/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand navy (logo border / PWA theme color lives around 800).
        navy: {
          50: '#f0f4f9',
          100: '#dbe4ee',
          200: '#b9cbdf',
          300: '#8ba8c9',
          400: '#5b7fa8',
          500: '#3d6189',
          600: '#2f4d6e',
          700: '#264257',
          800: '#1d3a5f',
          900: '#13273f',
        },
        // Brand gold accent (logo lettering / trim).
        gold: {
          50: '#fbf6e9',
          100: '#f5e9c4',
          200: '#ecd389',
          300: '#e1bb4f',
          400: '#d4a72c',
          500: '#c9a227',
          600: '#a37e1d',
          700: '#7d5f1a',
          800: '#5d471a',
          900: '#4b3a18',
        },
      },
    },
  },
  plugins: [],
};
