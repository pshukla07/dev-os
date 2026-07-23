import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system primitive palette — exact hex values from docs/design.md
        ds: {
          // Blue (brand primary)
          'blue-900': '#082A5E',
          'blue-800': '#0A367B',
          'blue-700': '#0D469E',
          'blue-600': '#0044AE',
          'blue-500': '#115ACB',
          'blue-400': '#89B7FF',
          'blue-300': '#6196EA',
          'blue-200': '#92B7F0',
          'blue-100': '#B6CFF5',
          'blue-50':  '#E7EFFC',
          // Grey (neutral)
          'grey-900': '#070A0E',
          'grey-800': '#151719',
          'grey-700': '#25272B',
          'grey-600': '#2C2F32',
          'grey-500': '#4A4C4F',
          'grey-400': '#5E6062',
          'grey-300': '#8F9193',
          'grey-200': '#C1C2C3',
          'grey-100': '#DADADB',
          'grey-50':  '#F0F0F1',
          'grey-25':  '#FAFAFA',
          // Green (success)
          'green-500': '#13A10E',
          'green-100': '#B6E2B4',
          'green-50':  '#E7F6E7',
          // Red (error)
          'red-700':  '#942528',
          'red-500':  '#D13438',
          'red-100':  '#F1C0C1',
          'red-50':   '#FAEBEB',
          // Yellow (warning)
          'yellow-800': '#B36800',
          'yellow-700': '#DB8000',
          'yellow-500': '#FFAA33',
          'yellow-50':  '#FFF9F0',
          // Violet (accent)
          'violet-700': '#6600CC',
          'violet-500': '#7F00FF',
          'violet-100': '#F2E5FF',
          'violet-50':  '#F7F0FF',
        },
        // Semantic tokens — always use these in component code
        brand: {
          primary:        '#115ACB', // Blue 500
          'primary-dark': '#0044AE', // Blue 600 (hover)
          success:        '#13A10E', // Green 500
          error:          '#D13438', // Red 500
          warning:        '#FFAA33', // Yellow 500
          surface:        '#FAFAFA', // Grey 25
          border:         '#DADADB', // Grey 100
          'border-subtle':'#F0F0F1', // Grey 50
        },
        // Confidence badge semantic tokens
        confidence: {
          high:      '#13A10E', // Green 500
          'high-bg': '#E7F6E7', // Green 50
          medium:    '#DB8000', // Yellow 700
          'medium-bg':'#FFF9F0', // Yellow 50
          low:       '#D13438', // Red 500
          'low-bg':  '#FAEBEB', // Red 50
        },
      },
      fontFamily: {
        sans: ['Inter Display', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      transitionDuration: {
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },
    },
  },
  plugins: [],
}

export default config
