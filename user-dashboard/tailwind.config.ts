import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#00E5BC', // Teal/Cyan Green
        'primary-hover': '#00c4a1',
        'accent-blue': '#00A3FF',
        'accent-purple': '#8B5CF6',
        'accent-teal': '#00E5BC',
        'accent-yellow': '#EAB308',
        'background-light': '#f6f8fd',
        'background-dark': '#0B1121',
        'surface-dark': '#161E32',
        'surface-hover': '#1F2943',
        'border-dark': '#2A3550',
        'text-secondary': '#94A3B8',
        success: '#10B981',
        'trend-up': '#00E5BC',
        'trend-down': '#EF4444',
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
} satisfies Config;
