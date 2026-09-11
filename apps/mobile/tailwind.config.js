/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#090d16',
        'dark-card': '#111827',
        'dark-border': '#1f2937',
        'dark-hover': '#1e293b',
        'dark-muted': '#94a3b8',
        brand: {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#4285f4',
          600: '#1a73e8',
          700: '#1967d2',
          800: '#185abc',
          900: '#174ea6',
        },
        'google-blue': {
          50: '#e8f0fe',
          100: '#d2e3fc',
          200: '#aecbfa',
          300: '#8ab4f8',
          400: '#669df6',
          500: '#4285f4',
          600: '#1a73e8',
          700: '#1967d2',
          800: '#185abc',
          900: '#174ea6',
        },
        'google-red': {
          50: '#fce8e6',
          100: '#fad2cf',
          200: '#f6aea9',
          300: '#f28b82',
          400: '#ee675c',
          500: '#ea4335',
          600: '#d93025',
          700: '#c5221f',
          800: '#b31412',
          900: '#a50e0e',
        },
        'google-yellow': {
          50: '#fef7e0',
          100: '#feefc3',
          200: '#fde293',
          300: '#fdd663',
          400: '#fcc934',
          500: '#fbbc04',
          600: '#f9ab00',
          700: '#ea8600',
          800: '#e37400',
          900: '#d96c00',
        },
        'google-green': {
          50: '#e6f4ea',
          100: '#ceead6',
          200: '#a8dab5',
          300: '#81c995',
          400: '#5bb974',
          500: '#34a853',
          600: '#1e8e3e',
          700: '#188038',
          800: '#137333',
          900: '#0d652d',
        },
        'google-surface': {
          900: '#131314',
          800: '#1e1f20',
          700: '#282a2c',
          600: '#37393b',
          500: '#444746',
          400: '#5f6368',
          300: '#747775',
          200: '#8e918f',
          100: '#c4c7c5',
          50: '#f8fafd',
        }
      },
      boxShadow: {
        '2xs': '0 1px 1px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'm3-1': '0 1px 3px 1px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'm3-2': '0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'm3-3': '0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.3)',
        'm3-4': '0 6px 10px 4px rgba(0, 0, 0, 0.15), 0 2px 3px 0 rgba(0, 0, 0, 0.3)',
        'google-glow': '0 0 20px -3px rgba(66, 133, 244, 0.35)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUpFade: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' }
        },
        springPop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '70%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        barFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' }
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.25s ease-out forwards',
        slideUpFade: 'slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scaleIn: 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        pulseGlow: 'pulseGlow 3s ease-in-out infinite',
        springPop: 'springPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        barFlow: 'barFlow 3s linear infinite'
      },
      fontFamily: {
        sans: ['"Google Sans"', '"Plus Jakarta Sans"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
