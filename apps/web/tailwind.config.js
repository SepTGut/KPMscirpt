/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      colors: {
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
          50: '#f8fafd',
          100: '#f1f3f4',
          200: '#e9eef6',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#747775',
          600: '#5f6368',
          700: '#3c4043',
          800: '#202124',
          900: '#131314',
        }
      },
      boxShadow: {
        'm3-1': '0 1px 3px 1px rgba(60, 64, 67, 0.15), 0 1px 2px 0 rgba(60, 64, 67, 0.3)',
        'm3-2': '0 2px 6px 2px rgba(60, 64, 67, 0.15), 0 1px 2px 0 rgba(60, 64, 67, 0.3)',
        'm3-3': '0 4px 8px 3px rgba(60, 64, 67, 0.15), 0 1px 3px 0 rgba(60, 64, 67, 0.3)',
        'google-glow': '0 0 24px -4px rgba(66, 133, 244, 0.25)',
      },
      fontFamily: {
        sans: ['"Google Sans"', '"Plus Jakarta Sans"', 'Roboto', 'Inter', 'sans-serif'],
      }
    }
  },
  plugins: [],
}
