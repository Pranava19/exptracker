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
          DEFAULT: '#2563EB', // royal blue shade
          light: '#3B82F6',
          dark: '#1D4ED8',
        },
        ink: {
          50: '#F8FAFC',
          100: '#E2E8F0',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#64748B',
          600: '#475569',
          700: '#475569',
          800: '#1E293B',
          900: '#0F172A',
          950: '#020617',
        },
        positive: '#2563EB', // blue shade for income/positive
        negative: '#DC2626', // red for expense
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