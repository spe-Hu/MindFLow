/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7C5CFC',
          light: '#9D86FF',
          dark: '#5B3AC8',
          glow: 'rgba(124, 92, 252, 0.5)',
        },
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
        },
        page: 'var(--bg-page)',
        // Linear-inspired dark palette
        midnight: {
          DEFAULT: '#0B0F19',
          lighter: '#0F172A',
          light: '#111827',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 3s ease-in-out infinite alternate',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'shine': 'shine 2s linear infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(124, 92, 252, 0.2)' },
          '100%': { boxShadow: '0 0 40px rgba(124, 92, 252, 0.5), 0 0 80px rgba(124, 92, 252, 0.2)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shine: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(124, 92, 252, 0.15), transparent)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.text-gradient': {
          'background-image': 'linear-gradient(135deg, #7C5CFC 0%, #9D86FF 50%, #C4B5FD 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.glass': {
          'background': 'rgba(15, 23, 42, 0.6)',
          'backdrop-filter': 'blur(20px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(180%)',
          'border': '1px solid rgba(255, 255, 255, 0.08)',
        },
        '.glass-strong': {
          'background': 'rgba(15, 23, 42, 0.8)',
          'backdrop-filter': 'blur(32px) saturate(180%)',
          '-webkit-backdrop-filter': 'blur(32px) saturate(180%)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.glow-border': {
          'position': 'relative',
        },
        '.glow-border::before': {
          'content': '""',
          'position': 'absolute',
          'inset': '-1px',
          'border-radius': 'inherit',
          'padding': '1px',
          'background': 'linear-gradient(135deg, rgba(124, 92, 252, 0.5), rgba(159, 134, 255, 0.2), rgba(124, 92, 252, 0.5))',
          '-webkit-mask': 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          '-webkit-mask-composite': 'xor',
          'mask-composite': 'exclude',
          'pointer-events': 'none',
          'opacity': '0.6',
          'transition': 'opacity 0.3s ease',
        },
        '.glow-border:hover::before': {
          'opacity': '1',
        },
        '.glow-text': {
          'text-shadow': '0 0 30px rgba(124, 92, 252, 0.5), 0 0 60px rgba(124, 92, 252, 0.2)',
        },
      })
    },
  ],
}
