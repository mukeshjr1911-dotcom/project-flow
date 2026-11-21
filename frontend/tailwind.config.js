/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0B0F19',
          sidebar: '#0E131F',
          card: '#121724',
          cardHover: '#171E2E',
          border: '#1F293D',
          muted: '#94A3B8',
          text: '#F3F4F6',
        },
        primary: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        status: {
          track: '#10B981',
          risk: '#F59E0B',
          overdue: '#EF4444',
          hold: '#64748B',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
        glow: '0 0 20px -2px rgba(124, 58, 237, 0.35)',
      }
    },
  },
  plugins: [],
}
