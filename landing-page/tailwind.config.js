/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#7C5CFC',
          light: '#9B7FFD',
          dark: '#6A4EEB',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F5F5F4',
          subtle: '#FAFAFA',
        },
        ink: {
          DEFAULT: '#0A0A0A',
          muted: '#333333',
          subtle: '#6B6B6B',
          faint: '#9A9A9A',
        },
        border: {
          DEFAULT: 'rgba(0,0,0,0.06)',
          strong: 'rgba(0,0,0,0.12)',
        },
      },
    },
  },
  plugins: [],
}
