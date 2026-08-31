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
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        /* 暖纸底（Cursor 式 paper） */
        paper: {
          DEFAULT: '#F7F4EE',
          deep: '#EFEBE2',
        },
        /* 墨水文字 */
        ink: {
          DEFAULT: '#17130E',
          muted: '#57514A',
          subtle: '#8A8378',
          faint: '#ABA394',
        },
        /* 暗夜面板（深色产品窗 + 深色区块） */
        night: {
          DEFAULT: '#151210',
          800: '#1C1916',
          900: '#0E0C0A',
        },
        /* 纸上线条 */
        line: {
          DEFAULT: 'rgba(23,19,14,0.08)',
          strong: 'rgba(23,19,14,0.14)',
        },
        /* 暗夜上的线条与文字 */
        lineDark: 'rgba(242,238,230,0.10)',
        brand: {
          DEFAULT: '#7C5CFC',
          soft: '#B9A5FF',
        },
        dm: {
          muted: '#948C7E',
          text: '#EDE9E2',
        },
      },
    },
  },
  plugins: [],
}