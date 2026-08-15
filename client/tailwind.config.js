/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#3F6B4F', // deep forest green
          light: '#5C8A6E',
          dark: '#2C4D38',
        },
        ink: {
          50: '#F7F7F5',
          100: '#EDECE8',
          200: '#D5D3CC',
          700: '#42423E',
          900: '#1C1C1A',
        },
        positive: '#2F7A4F',
        negative: '#B5473B',
      },
      borderRadius: {
        sharp: '2px',
        card: '10px',
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};