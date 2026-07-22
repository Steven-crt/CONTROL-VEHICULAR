/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        park: {
          dark:    '#0b1220',
          darker:  '#060d18',
          sidebar: '#0f1d35',
          card:    '#132040',
          border:  '#1e3a5f',
          primary: '#1e3a5f',
          accent:  '#f59e0b',
          'accent-light': '#fbbf24',
          libre:   '#10b981',
          ocupado: '#ef4444',
          mant:    '#6b7280',
          VIP:     '#8b5cf6',
          text:    '#e2e8f0',
          muted:   '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideIn: { '0%': { transform: 'translateX(-10px)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
      },
    },
  },
  plugins: [],
}
