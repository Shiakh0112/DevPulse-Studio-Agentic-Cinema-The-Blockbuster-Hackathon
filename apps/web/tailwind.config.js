/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          main: '#0B0E14',
          card: '#121824',
          hover: '#161D2A',
        },
        border: {
          subtle: '#1F293D',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8A94A6',
        },
        accent: {
          DEFAULT: '#6366F1',
          indigo: '#4F46E5',
        }
      }
    },
  },
  plugins: [],
}
