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
          DEFAULT: '#2A5C8A', // slate blue
          light: '#4A7BA8',
          dark: '#1A3F63',
        },
        ink: {
          50: '#F7F7F5',
          100: '#EDECE8',
          200: '#D5D3CC',
          700: '#42423E',
          900: '#1C1C1A',
        },
        positive: '#2F7A4F', // keep green for income — functional
        negative: '#B5473B', // keep red for expense
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